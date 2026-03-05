import type {
  IDatabaseAdapter,
  RequestContext,
  ApiResult,
  DbUser,
  DbSession,
  DbRecipe,
  DbCookbook,
  UserInfo,
  RecipeInfo,
  CookbookInfo,
  CookbookShareInfo,
  CookbookShareLinkInfo,
} from './types';

// Constants
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_LOGIN_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Crypto utilities - these need to be provided by the environment
export interface CryptoProvider {
  generateId(): string;
  hashPassword(password: string): Promise<{ hash: string; salt: string }>;
  verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean>;
}

// Default crypto provider using Web Crypto API
export const webCryptoProvider: CryptoProvider = {
  generateId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const ITERATIONS = 100000;
    const KEY_LENGTH = 256;
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_LENGTH
    );

    return {
      hash: arrayBufferToBase64(derivedKey),
      salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    };
  },

  async verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
    const ITERATIONS = 100000;
    const KEY_LENGTH = 256;
    const salt = new Uint8Array(base64ToArrayBuffer(storedSalt));

    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_LENGTH
    );

    return arrayBufferToBase64(derivedKey) === storedHash;
  },
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Password validation
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// Helper to format recipe
function formatRecipe(r: DbRecipe, addedByUserName?: string | null): RecipeInfo {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: JSON.parse(r.ingredients),
    instructions: JSON.parse(r.instructions),
    tags: r.tags ? JSON.parse(r.tags) : [],
    imageUrl: r.image_url,
    sourceUrl: r.source_url,
    prepTime: r.prep_time,
    cookTime: r.cook_time,
    servings: r.servings,
    createdAt: r.created_at,
    addedByUserName,
  };
}

// Core handler class
export class CoreHandlers {
  constructor(
    private db: IDatabaseAdapter,
    private crypto: CryptoProvider = webCryptoProvider
  ) {}

  // Get session user
  async getSessionUser(ctx: RequestContext): Promise<DbUser | null> {
    if (!ctx.sessionId) return null;

    const session = await this.db.get<DbSession>(
      'SELECT * FROM sessions WHERE id = ? AND expires_at > ?',
      ctx.sessionId,
      Date.now()
    );

    if (!session) return null;

    return this.db.get<DbUser>('SELECT * FROM users WHERE id = ?', session.user_id);
  }

  // Rate limiting
  private async checkRateLimit(email: string, _ip: string | null): Promise<{ allowed: boolean; remainingAttempts: number }> {
    const windowStart = Date.now() - ATTEMPT_WINDOW;
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM login_attempts WHERE email = ? AND attempted_at > ? AND success = 0',
      email.toLowerCase(),
      windowStart
    );

    const failedAttempts = result?.count || 0;
    const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts);

    return {
      allowed: failedAttempts < MAX_LOGIN_ATTEMPTS,
      remainingAttempts,
    };
  }

  private async recordLoginAttempt(email: string, ip: string | null, success: boolean): Promise<void> {
    const id = this.crypto.generateId();
    await this.db.run(
      'INSERT INTO login_attempts (id, email, ip_address, attempted_at, success) VALUES (?, ?, ?, ?, ?)',
      id,
      email.toLowerCase(),
      ip,
      Date.now(),
      success ? 1 : 0
    );

    // Clean up old attempts
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    await this.db.run('DELETE FROM login_attempts WHERE attempted_at < ?', oneDayAgo);
  }

  // Auth handlers
  async register(
    email: string,
    name: string,
    password: string
  ): Promise<ApiResult<{ user: UserInfo; token: string }>> {
    if (!email || !name || !password) {
      return { error: 'Email, name, and password are required', status: 400 };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return { error: passwordValidation.error!, status: 400 };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.db.get<{ id: string }>('SELECT id FROM users WHERE email = ?', normalizedEmail);
    if (existing) {
      return { error: 'An account with this email already exists', status: 400 };
    }

    const { hash, salt } = await this.crypto.hashPassword(password);
    const userId = this.crypto.generateId();
    await this.db.run(
      'INSERT INTO users (id, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      userId,
      normalizedEmail,
      name.trim(),
      hash,
      salt,
      Date.now()
    );

    const sessionId = this.crypto.generateId();
    const expiresAt = Date.now() + SESSION_DURATION;
    await this.db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      sessionId,
      userId,
      Date.now(),
      expiresAt
    );

    // Add sample recipes
    await this.addSampleRecipes(userId);

    return {
      data: {
        user: { id: userId, email: normalizedEmail, name: name.trim() },
        token: sessionId,
      },
      status: 200,
    };
  }

  async login(
    email: string,
    password: string,
    ctx: RequestContext
  ): Promise<ApiResult<{ user: UserInfo; token: string }>> {
    if (!email || !password) {
      return { error: 'Email and password are required', status: 400 };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = ctx.ip || null;

    const rateLimit = await this.checkRateLimit(normalizedEmail, ip);
    if (!rateLimit.allowed) {
      return { error: 'Too many failed login attempts. Please try again in 15 minutes.', status: 429 };
    }

    const user = await this.db.get<DbUser>('SELECT * FROM users WHERE email = ?', normalizedEmail);
    if (!user) {
      await this.recordLoginAttempt(normalizedEmail, ip, false);
      return { error: 'Invalid email or password', status: 401 };
    }

    const isValid = await this.crypto.verifyPassword(password, user.password_hash, user.password_salt);
    if (!isValid) {
      await this.recordLoginAttempt(normalizedEmail, ip, false);
      const remaining = rateLimit.remainingAttempts - 1;
      if (remaining <= 2 && remaining > 0) {
        return { error: `Invalid email or password. ${remaining} attempts remaining.`, status: 401 };
      }
      return { error: 'Invalid email or password', status: 401 };
    }

    await this.recordLoginAttempt(normalizedEmail, ip, true);

    const sessionId = this.crypto.generateId();
    const expiresAt = Date.now() + SESSION_DURATION;
    await this.db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      sessionId,
      user.id,
      Date.now(),
      expiresAt
    );

    return {
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token: sessionId,
      },
      status: 200,
    };
  }

  async logout(ctx: RequestContext): Promise<ApiResult<{ success: boolean }>> {
    if (ctx.sessionId) {
      await this.db.run('DELETE FROM sessions WHERE id = ?', ctx.sessionId);
    }
    return { data: { success: true }, status: 200 };
  }

  async getSession(ctx: RequestContext): Promise<ApiResult<{ user: UserInfo | null }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { data: { user: null }, status: 200 };
    }
    return {
      data: { user: { id: user.id, email: user.email, name: user.name } },
      status: 200,
    };
  }

  // Recipe handlers
  async getRecipes(ctx: RequestContext): Promise<ApiResult<{ recipes: RecipeInfo[] }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const result = await this.db.all<DbRecipe>(
      'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
      user.id
    );

    return {
      data: { recipes: result.results.map(r => formatRecipe(r)) },
      status: 200,
    };
  }

  async createRecipe(
    ctx: RequestContext,
    data: {
      title: string;
      description?: string;
      ingredients: string[];
      instructions: string[];
      tags?: string[];
      imageUrl?: string;
      sourceUrl?: string;
      prepTime?: string;
      cookTime?: string;
      servings?: string;
    }
  ): Promise<ApiResult<{ id: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const recipeId = this.crypto.generateId();
    await this.db.run(
      `INSERT INTO recipes (id, user_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recipeId,
      user.id,
      data.title,
      data.description || '',
      JSON.stringify(data.ingredients),
      JSON.stringify(data.instructions),
      JSON.stringify(data.tags || []),
      data.imageUrl || null,
      data.sourceUrl || null,
      data.prepTime || null,
      data.cookTime || null,
      data.servings || null,
      Date.now()
    );

    return { data: { id: recipeId }, status: 201 };
  }

  async updateRecipe(
    ctx: RequestContext,
    recipeId: string,
    data: {
      title?: string;
      description?: string;
      ingredients?: string[];
      instructions?: string[];
      tags?: string[];
      imageUrl?: string;
      sourceUrl?: string;
      prepTime?: string;
      cookTime?: string;
      servings?: string;
    }
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const existing = await this.db.get<{ id: string }>(
      'SELECT id FROM recipes WHERE id = ? AND user_id = ?',
      recipeId,
      user.id
    );
    if (!existing) {
      return { error: 'Recipe not found', status: 404 };
    }

    await this.db.run(
      `UPDATE recipes SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        ingredients = COALESCE(?, ingredients),
        instructions = COALESCE(?, instructions),
        tags = COALESCE(?, tags),
        image_url = ?,
        source_url = ?,
        prep_time = ?,
        cook_time = ?,
        servings = ?
      WHERE id = ? AND user_id = ?`,
      data.title || null,
      data.description || null,
      data.ingredients ? JSON.stringify(data.ingredients) : null,
      data.instructions ? JSON.stringify(data.instructions) : null,
      data.tags ? JSON.stringify(data.tags) : null,
      data.imageUrl ?? null,
      data.sourceUrl ?? null,
      data.prepTime ?? null,
      data.cookTime ?? null,
      data.servings ?? null,
      recipeId,
      user.id
    );

    return { data: { success: true }, status: 200 };
  }

  async deleteRecipe(ctx: RequestContext, recipeId: string): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    await this.db.run('DELETE FROM recipes WHERE id = ? AND user_id = ?', recipeId, user.id);
    return { data: { success: true }, status: 200 };
  }

  // Cookbook handlers
  async getCookbooks(ctx: RequestContext): Promise<ApiResult<{ owned: CookbookInfo[]; shared: CookbookInfo[] }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const owned = await this.db.all<DbCookbook & { recipe_count: number }>(
      `SELECT c.*, COUNT(cr.recipe_id) as recipe_count
       FROM cookbooks c
       LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      user.id
    );

    const shared = await this.db.all<DbCookbook & { recipe_count: number; owner_name: string }>(
      `SELECT c.*, COUNT(cr.recipe_id) as recipe_count, u.name as owner_name
       FROM cookbooks c
       JOIN cookbook_shares cs ON c.id = cs.cookbook_id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
       WHERE cs.shared_with_user_id = ?
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      user.id
    );

    const formatCookbook = (c: DbCookbook & { recipe_count: number; owner_name?: string }, isOwner: boolean): CookbookInfo => ({
      id: c.id,
      name: c.name,
      description: c.description,
      coverImage: c.cover_image || null,
      recipeCount: c.recipe_count || 0,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      isOwner,
      ownerName: isOwner ? undefined : c.owner_name,
    });

    return {
      data: {
        owned: owned.results.map(c => formatCookbook(c, true)),
        shared: shared.results.map(c => formatCookbook(c, false)),
      },
      status: 200,
    };
  }

  async getCookbook(
    ctx: RequestContext,
    cookbookId: string
  ): Promise<ApiResult<{ cookbook: CookbookInfo; recipes: RecipeInfo[] }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Check ownership or share access
    const cookbook = await this.db.get<DbCookbook>(
      'SELECT * FROM cookbooks WHERE id = ?',
      cookbookId
    );

    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const isOwner = cookbook.user_id === user.id;
    const share = !isOwner
      ? await this.db.get<{ id: string }>(
          'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?',
          cookbookId,
          user.id
        )
      : null;

    if (!isOwner && !share) {
      return { error: 'Cookbook not found', status: 404 };
    }

    // Get recipes with added_by info
    const recipes = await this.db.all<DbRecipe & { added_by_user_id: string | null; added_by_user_name: string | null }>(
      `SELECT r.*, cr.added_by_user_id, u.name as added_by_user_name
       FROM recipes r
       JOIN cookbook_recipes cr ON r.id = cr.recipe_id
       LEFT JOIN users u ON cr.added_by_user_id = u.id
       WHERE cr.cookbook_id = ?
       ORDER BY cr.added_at DESC`,
      cookbookId
    );

    const recipeCount = recipes.results.length;
    let ownerName: string | undefined;
    if (!isOwner) {
      const owner = await this.db.get<{ name: string }>('SELECT name FROM users WHERE id = ?', cookbook.user_id);
      ownerName = owner?.name;
    }

    return {
      data: {
        cookbook: {
          id: cookbook.id,
          name: cookbook.name,
          description: cookbook.description,
          coverImage: cookbook.cover_image || null,
          recipeCount,
          createdAt: cookbook.created_at,
          updatedAt: cookbook.updated_at,
          isOwner,
          ownerName,
        },
        recipes: recipes.results.map(r => ({
          ...formatRecipe(r),
          addedByUserId: r.added_by_user_id,
          addedByUserName: r.added_by_user_name,
        })),
      },
      status: 200,
    };
  }

  async createCookbook(
    ctx: RequestContext,
    data: { name: string; description?: string; coverImage?: string }
  ): Promise<ApiResult<{ id: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbookId = this.crypto.generateId();
    const now = Date.now();
    await this.db.run(
      'INSERT INTO cookbooks (id, user_id, name, description, cover_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      cookbookId,
      user.id,
      data.name,
      data.description || null,
      data.coverImage || null,
      now,
      now
    );

    return { data: { id: cookbookId }, status: 201 };
  }

  async updateCookbook(
    ctx: RequestContext,
    cookbookId: string,
    data: { name?: string; description?: string; coverImage?: string }
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const existing = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!existing) {
      return { error: 'Cookbook not found', status: 404 };
    }

    await this.db.run(
      `UPDATE cookbooks SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        cover_image = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?`,
      data.name || null,
      data.description || null,
      data.coverImage ?? null,
      Date.now(),
      cookbookId,
      user.id
    );

    return { data: { success: true }, status: 200 };
  }

  async deleteCookbook(ctx: RequestContext, cookbookId: string): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    await this.db.run('DELETE FROM cookbook_recipes WHERE cookbook_id = ?', cookbookId);
    await this.db.run('DELETE FROM cookbook_shares WHERE cookbook_id = ?', cookbookId);
    await this.db.run('DELETE FROM cookbook_share_links WHERE cookbook_id = ?', cookbookId);
    await this.db.run('DELETE FROM cookbooks WHERE id = ? AND user_id = ?', cookbookId, user.id);

    return { data: { success: true }, status: 200 };
  }

  async addRecipeToCookbook(
    ctx: RequestContext,
    cookbookId: string,
    recipeId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Check if user owns cookbook or has share access
    const cookbook = await this.db.get<DbCookbook>('SELECT * FROM cookbooks WHERE id = ?', cookbookId);
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const isOwner = cookbook.user_id === user.id;
    const share = !isOwner
      ? await this.db.get<{ id: string }>(
          'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?',
          cookbookId,
          user.id
        )
      : null;

    if (!isOwner && !share) {
      return { error: 'Cookbook not found', status: 404 };
    }

    // Verify recipe exists
    const recipe = await this.db.get<{ id: string }>('SELECT id FROM recipes WHERE id = ?', recipeId);
    if (!recipe) {
      return { error: 'Recipe not found', status: 404 };
    }

    // Check if already added
    const existing = await this.db.get<{ recipe_id: string }>(
      'SELECT recipe_id FROM cookbook_recipes WHERE cookbook_id = ? AND recipe_id = ?',
      cookbookId,
      recipeId
    );
    if (existing) {
      return { data: { success: true }, status: 200 };
    }

    await this.db.run(
      'INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)',
      cookbookId,
      recipeId,
      user.id,
      Date.now()
    );

    await this.db.run('UPDATE cookbooks SET updated_at = ? WHERE id = ?', Date.now(), cookbookId);

    return { data: { success: true }, status: 200 };
  }

  async removeRecipeFromCookbook(
    ctx: RequestContext,
    cookbookId: string,
    recipeId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<DbCookbook>('SELECT * FROM cookbooks WHERE id = ?', cookbookId);
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const isOwner = cookbook.user_id === user.id;

    if (isOwner) {
      // Owner can remove any recipe
      await this.db.run(
        'DELETE FROM cookbook_recipes WHERE cookbook_id = ? AND recipe_id = ?',
        cookbookId,
        recipeId
      );
    } else {
      // Shared user can only remove recipes they added
      const share = await this.db.get<{ id: string }>(
        'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?',
        cookbookId,
        user.id
      );
      if (!share) {
        return { error: 'Cookbook not found', status: 404 };
      }

      await this.db.run(
        'DELETE FROM cookbook_recipes WHERE cookbook_id = ? AND recipe_id = ? AND added_by_user_id = ?',
        cookbookId,
        recipeId,
        user.id
      );
    }

    await this.db.run('UPDATE cookbooks SET updated_at = ? WHERE id = ?', Date.now(), cookbookId);

    return { data: { success: true }, status: 200 };
  }

  // Sharing handlers
  async shareByEmail(
    ctx: RequestContext,
    cookbookId: string,
    email: string
  ): Promise<ApiResult<{ success: boolean; sharedWith?: { id: string; name: string } }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === user.email.toLowerCase()) {
      return { error: 'You cannot share a cookbook with yourself', status: 400 };
    }

    const targetUser = await this.db.get<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE email = ?',
      normalizedEmail
    );
    if (!targetUser) {
      return { error: 'User not found. They need to create an account first.', status: 404 };
    }

    const existingShare = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?',
      cookbookId,
      targetUser.id
    );
    if (existingShare) {
      return { error: 'Cookbook is already shared with this user', status: 400 };
    }

    const shareId = this.crypto.generateId();
    await this.db.run(
      'INSERT INTO cookbook_shares (id, cookbook_id, shared_with_user_id, shared_by_user_id, created_at) VALUES (?, ?, ?, ?, ?)',
      shareId,
      cookbookId,
      targetUser.id,
      user.id,
      Date.now()
    );

    return { data: { success: true, sharedWith: { id: targetUser.id, name: targetUser.name } }, status: 200 };
  }

  async removeShare(
    ctx: RequestContext,
    cookbookId: string,
    userId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    await this.db.run(
      'DELETE FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?',
      cookbookId,
      userId
    );

    return { data: { success: true }, status: 200 };
  }

  async getShares(
    ctx: RequestContext,
    cookbookId: string
  ): Promise<ApiResult<{ shares: CookbookShareInfo[]; links: CookbookShareLinkInfo[] }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const shares = await this.db.all<{ id: string; shared_with_user_id: string; created_at: number; name: string; email: string }>(
      `SELECT cs.id, cs.shared_with_user_id, cs.created_at, u.name, u.email
       FROM cookbook_shares cs
       JOIN users u ON cs.shared_with_user_id = u.id
       WHERE cs.cookbook_id = ?`,
      cookbookId
    );

    const links = await this.db.all<{ id: string; token: string; is_active: number; created_at: number }>(
      'SELECT id, token, is_active, created_at FROM cookbook_share_links WHERE cookbook_id = ?',
      cookbookId
    );

    return {
      data: {
        shares: shares.results.map(s => ({
          id: s.id,
          userId: s.shared_with_user_id,
          userName: s.name,
          userEmail: s.email,
          sharedAt: s.created_at,
        })),
        links: links.results.map(l => ({
          id: l.id,
          token: l.token,
          isActive: l.is_active === 1,
          createdAt: l.created_at,
        })),
      },
      status: 200,
    };
  }

  async createShareLink(ctx: RequestContext, cookbookId: string): Promise<ApiResult<CookbookShareLinkInfo>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const linkId = this.crypto.generateId();
    const token = this.crypto.generateId();
    await this.db.run(
      'INSERT INTO cookbook_share_links (id, cookbook_id, token, is_active, created_at) VALUES (?, ?, ?, 1, ?)',
      linkId,
      cookbookId,
      token,
      Date.now()
    );

    return {
      data: {
        id: linkId,
        token,
        isActive: true,
        createdAt: Date.now(),
      },
      status: 201,
    };
  }

  async revokeShareLink(
    ctx: RequestContext,
    cookbookId: string,
    linkId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    await this.db.run(
      'DELETE FROM cookbook_share_links WHERE id = ? AND cookbook_id = ?',
      linkId,
      cookbookId
    );

    return { data: { success: true }, status: 200 };
  }

  async getSharedCookbook(token: string): Promise<ApiResult<{ cookbook: CookbookInfo; recipes: RecipeInfo[] }>> {
    const link = await this.db.get<{ cookbook_id: string; is_active: number }>(
      'SELECT cookbook_id, is_active FROM cookbook_share_links WHERE token = ?',
      token
    );

    if (!link || link.is_active !== 1) {
      return { error: 'Share link not found or expired', status: 404 };
    }

    const cookbook = await this.db.get<DbCookbook>('SELECT * FROM cookbooks WHERE id = ?', link.cookbook_id);
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const owner = await this.db.get<{ name: string }>('SELECT name FROM users WHERE id = ?', cookbook.user_id);

    const recipes = await this.db.all<DbRecipe>(
      `SELECT r.* FROM recipes r
       JOIN cookbook_recipes cr ON r.id = cr.recipe_id
       WHERE cr.cookbook_id = ?
       ORDER BY cr.added_at DESC`,
      cookbook.id
    );

    return {
      data: {
        cookbook: {
          id: cookbook.id,
          name: cookbook.name,
          description: cookbook.description,
          coverImage: cookbook.cover_image || null,
          recipeCount: recipes.results.length,
          createdAt: cookbook.created_at,
          updatedAt: cookbook.updated_at,
          isOwner: false,
          ownerName: owner?.name,
        },
        recipes: recipes.results.map(r => formatRecipe(r)),
      },
      status: 200,
    };
  }

  // Sample recipes helper
  private async addSampleRecipes(userId: string): Promise<void> {
    const sampleRecipes = [
      {
        title: 'Classic Pancakes',
        description: 'Fluffy, golden pancakes perfect for a weekend breakfast.',
        ingredients: ['2 cups all-purpose flour', '2 tablespoons sugar', '2 teaspoons baking powder', '1 teaspoon salt', '2 eggs', '1 3/4 cups milk', '1/4 cup melted butter', '1 teaspoon vanilla extract'],
        instructions: ['Mix dry ingredients in a large bowl.', 'Whisk eggs, milk, butter, and vanilla in another bowl.', 'Pour wet ingredients into dry and stir until just combined.', 'Heat a griddle over medium heat and grease lightly.', 'Pour 1/4 cup batter per pancake and cook until bubbles form.', 'Flip and cook until golden brown.'],
        tags: ['breakfast', 'quick', 'vegetarian'],
        prepTime: '10 mins',
        cookTime: '20 mins',
        servings: '4',
      },
    ];

    for (const recipe of sampleRecipes) {
      const recipeId = this.crypto.generateId();
      await this.db.run(
        `INSERT INTO recipes (id, user_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        recipeId,
        userId,
        recipe.title,
        recipe.description,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.instructions),
        JSON.stringify(recipe.tags),
        null,
        null,
        recipe.prepTime,
        recipe.cookTime,
        recipe.servings,
        Date.now()
      );
    }
  }
}
