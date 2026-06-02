import type {
  IDatabaseAdapter,
  RequestContext,
  ApiResult,
  DbUser,
  DbSession,
  DbRecipe,
  DbCookbook,
  UserInfo,
  ProfileUserInfo,
  UserProfileInfo,
  RecipeInfo,
  CookbookInfo,
  CookbookShareInfo,
  CookbookShareLinkInfo,
  NotificationInfo,
  DbRecipeShareLink,
  RecipeSharePayload,
  RecipeShareLinkInfo,
  DbUserSubscription,
  DbAiMealPlanRequest,
} from './types';
import {
  MEAL_PLAN_HISTORY_LIMIT,
  MEAL_PLAN_MAX_RECIPES,
  MEAL_PLAN_FREE_WEEKLY_LIMIT,
  MEAL_PLAN_PAID_PLAN_NAME,
  MEAL_PLAN_PAID_PRICE_CENTS,
  MEAL_PLAN_PAID_WEEKLY_LIMIT,
  MEAL_PLAN_WEEK_MS,
  MEAL_PLAN_INVALID_REQUEST_CODE,
  MEAL_PLAN_LIMIT_CODE,
  MEAL_PLAN_UNAUTHORIZED_CODE,
  type MealPlanRecipeContext,
  type MealPlanHistoryItem,
  type MealPlanUsageInfo,
  buildMealPlanHistoryItem,
  buildMealPlanSuggestionDetails,
  buildFallbackMealPlan,
  normalizeMealPlanRequest,
} from './mealPlanner';

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

interface FriendRequestRecord {
  id: string;
  requester_id: string;
  requested_user_id: string;
  status: string;
  requester_name: string;
  requester_avatar_url: string | null;
}

interface FriendRequestNotificationData {
  friendRequestId?: string;
  requesterId?: string;
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

function formatUser(user: DbUser): UserInfo {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
  };
}

function formatProfileUser(user: { id: string; name: string; avatar_url?: string | null }): ProfileUserInfo {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatar_url ?? null,
  };
}

function orderedFriendPair(userId: string, friendId: string): { userAId: string; userBId: string } {
  return userId < friendId
    ? { userAId: userId, userBId: friendId }
    : { userAId: friendId, userBId: userId };
}

function normalizeDisplayName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length > 80) return null;
  return trimmed;
}

const PROFILE_AVATAR_MAX_BYTES = 1024 * 1024;
const PROFILE_AVATAR_MAX_BASE64_LENGTH = Math.ceil(PROFILE_AVATAR_MAX_BYTES / 3) * 4;
const PROFILE_AVATAR_DATA_URL_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i;

function normalizeAvatarUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dataUrlMatch = trimmed.match(PROFILE_AVATAR_DATA_URL_PATTERN);
  if (dataUrlMatch) {
    const base64Data = dataUrlMatch[1];
    if (base64Data.length > PROFILE_AVATAR_MAX_BASE64_LENGTH || base64Data.length % 4 !== 0) {
      return null;
    }
    return trimmed;
  }

  if (trimmed.length > 1000) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

// Helper to format recipe
function formatRecipe(r: DbRecipe & { owner_name?: string | null }, currentUserId?: string, addedByUserName?: string | null): RecipeInfo {
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
    isPublic: r.is_public === 1,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    isOwner: currentUserId ? r.owner_id === currentUserId : undefined,
    createdAt: r.created_at,
    addedByUserName,
  };
}

const RECIPE_DEDUPE_SEPARATOR = '\u001f';

function normalizeRecipeField(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function recipeRowDedupeKey(recipe: DbRecipe): string {
  return [
    recipe.owner_id,
    normalizeRecipeField(recipe.title),
    normalizeRecipeField(recipe.description),
    normalizeRecipeField(recipe.ingredients),
    normalizeRecipeField(recipe.instructions),
    normalizeRecipeField(recipe.tags),
    normalizeRecipeField(recipe.image_url),
    normalizeRecipeField(recipe.source_url),
    normalizeRecipeField(recipe.prep_time),
    normalizeRecipeField(recipe.cook_time),
    normalizeRecipeField(recipe.servings),
  ].join(RECIPE_DEDUPE_SEPARATOR);
}

function shouldPreferRecipeRow(current: DbRecipe, candidate: DbRecipe, currentUserId: string): boolean {
  const currentIsOwner = current.owner_id === currentUserId;
  const candidateIsOwner = candidate.owner_id === currentUserId;

  if (candidateIsOwner !== currentIsOwner) {
    return candidateIsOwner;
  }

  return candidate.created_at > current.created_at;
}

function dedupeRecipeRows<T extends DbRecipe>(recipes: T[], currentUserId: string): T[] {
  const selectedByKey = new Map<string, T>();

  for (const recipe of recipes) {
    const key = recipeRowDedupeKey(recipe);
    const selected = selectedByKey.get(key);

    if (!selected || shouldPreferRecipeRow(selected, recipe, currentUserId)) {
      selectedByKey.set(key, recipe);
    }
  }

  return recipes.filter(recipe => selectedByKey.get(recipeRowDedupeKey(recipe)) === recipe);
}

const MAX_RECIPE_SHARE_BYTES = 64 * 1024;
const MAX_RECIPE_SHARE_ITEMS = 250;

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, MAX_RECIPE_SHARE_ITEMS);
}

function normalizeRecipeSharePayload(data: RecipeSharePayload): RecipeSharePayload | null {
  const recipe: RecipeSharePayload = {
    title: normalizeOptionalString(data.title) || '',
    description: normalizeOptionalString(data.description),
    ingredients: normalizeStringList(data.ingredients),
    instructions: normalizeStringList(data.instructions),
    prepTime: normalizeOptionalString(data.prepTime),
    cookTime: normalizeOptionalString(data.cookTime),
    servings: normalizeOptionalString(data.servings),
    imageUrl: normalizeOptionalString(data.imageUrl),
    sourceUrl: normalizeOptionalString(data.sourceUrl),
  };

  if (!recipe.title || recipe.ingredients.length === 0 || recipe.instructions.length === 0) {
    return null;
  }

  return recipe;
}

function parseJsonList(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
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
        user: { id: userId, email: normalizedEmail, name: name.trim(), avatarUrl: null },
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
        user: formatUser(user),
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
      data: { user: formatUser(user) },
      status: 200,
    };
  }

  private async getFriendCount(userId: string): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM friendships WHERE user_a_id = ? OR user_b_id = ?',
      userId,
      userId
    );
    return result?.count || 0;
  }

  private async areFriends(userId: string, friendId: string): Promise<boolean> {
    if (userId === friendId) return false;
    const { userAId, userBId } = orderedFriendPair(userId, friendId);
    const friendship = await this.db.get<{ created_at: number }>(
      'SELECT created_at FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
      userAId,
      userBId
    );
    return !!friendship;
  }

  private parseFriendRequestNotificationData(data: string | null): FriendRequestNotificationData | null {
    if (!data) return null;

    try {
      const parsed = JSON.parse(data) as FriendRequestNotificationData;
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async getFriendRequestNotificationData(
    userId: string,
    friendRequestId: string
  ): Promise<FriendRequestNotificationData | null> {
    const notifications = await this.db.all<{ data: string | null }>(
      "SELECT data FROM notifications WHERE user_id = ? AND type = 'friend_request' ORDER BY created_at DESC",
      userId
    );

    for (const notification of notifications.results) {
      const notificationData = this.parseFriendRequestNotificationData(notification.data);
      if (notificationData?.friendRequestId === friendRequestId) {
        return notificationData;
      }
    }

    return null;
  }

  private async findFriendRequestForUser(
    user: DbUser,
    friendRequestId: string
  ): Promise<{ request: FriendRequestRecord | null; notificationData: FriendRequestNotificationData | null }> {
    const request = await this.db.get<FriendRequestRecord>(
      `SELECT fr.*, u.name as requester_name, u.avatar_url as requester_avatar_url
       FROM friend_requests fr
       JOIN users u ON u.id = fr.requester_id
       WHERE fr.id = ? AND fr.requested_user_id = ?`,
      friendRequestId,
      user.id
    );

    if (request) {
      return { request, notificationData: null };
    }

    const notificationData = await this.getFriendRequestNotificationData(user.id, friendRequestId);
    if (!notificationData?.requesterId) {
      return { request: null, notificationData };
    }

    const fallbackRequest = await this.db.get<FriendRequestRecord>(
      `SELECT fr.*, u.name as requester_name, u.avatar_url as requester_avatar_url
       FROM friend_requests fr
       JOIN users u ON u.id = fr.requester_id
       WHERE fr.requester_id = ? AND fr.requested_user_id = ?
       ORDER BY CASE fr.status WHEN 'pending' THEN 0 ELSE 1 END, fr.created_at DESC
       LIMIT 1`,
      notificationData.requesterId,
      user.id
    );

    return { request: fallbackRequest ?? null, notificationData };
  }

  private async deleteFriendRequestNotifications(
    userId: string,
    friendRequestIds: Array<string | undefined | null>
  ): Promise<void> {
    const uniqueIds = Array.from(new Set(friendRequestIds.filter((id): id is string => Boolean(id))));
    if (uniqueIds.length === 0) {
      return;
    }

    const requestIdSet = new Set(uniqueIds);
    const notifications = await this.db.all<{ id: string; data: string | null }>(
      "SELECT id, data FROM notifications WHERE user_id = ? AND type = 'friend_request'",
      userId
    );

    const notificationIds = notifications.results
      .filter(notification => {
        const notificationData = this.parseFriendRequestNotificationData(notification.data);
        return notificationData?.friendRequestId ? requestIdSet.has(notificationData.friendRequestId) : false;
      })
      .map(notification => notification.id);

    for (const id of notificationIds) {
      await this.db.run(
        "DELETE FROM notifications WHERE id = ? AND user_id = ? AND type = 'friend_request'",
        id,
        userId
      );
    }
  }

  private async createFriendRequestAcceptedNotification(
    acceptedBy: DbUser,
    requesterId: string,
    now: number
  ): Promise<void> {
    await this.db.run(
      'INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      this.crypto.generateId(),
      requesterId,
      'friend_request_accepted',
      'Friend request accepted',
      `${acceptedBy.name} accepted your friend request`,
      JSON.stringify({
        friendId: acceptedBy.id,
        friendName: acceptedBy.name,
        accepterId: acceptedBy.id,
        accepterName: acceptedBy.name,
      }),
      0,
      now
    );
  }

  async updateProfile(
    ctx: RequestContext,
    data: { name?: string; avatarUrl?: string | null }
  ): Promise<ApiResult<{ user: UserInfo }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
    const hasAvatar = Object.prototype.hasOwnProperty.call(data, 'avatarUrl');

    const nextName = hasName ? normalizeDisplayName(data.name) : user.name;
    if (hasName && !nextName) {
      return { error: 'Display name must be between 1 and 80 characters', status: 400 };
    }

    let nextAvatarUrl = user.avatar_url;
    if (hasAvatar) {
      nextAvatarUrl = normalizeAvatarUrl(data.avatarUrl);
      if (typeof data.avatarUrl === 'string' && data.avatarUrl.trim() && !nextAvatarUrl) {
        return { error: 'Profile picture must be a PNG, JPG, WebP, or GIF under 1MB, or a valid http(s) URL', status: 400 };
      }
    }

    await this.db.run(
      'UPDATE users SET name = ?, avatar_url = ? WHERE id = ?',
      nextName,
      nextAvatarUrl,
      user.id
    );

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: nextName!,
          avatarUrl: nextAvatarUrl,
        },
      },
      status: 200,
    };
  }

  async getProfile(ctx: RequestContext, userId: string): Promise<ApiResult<{ profile: UserProfileInfo }>> {
    const currentUser = await this.getSessionUser(ctx);
    const profileUser = await this.db.get<Pick<DbUser, 'id' | 'name' | 'avatar_url'>>(
      'SELECT id, name, avatar_url FROM users WHERE id = ?',
      userId
    );

    if (!profileUser) {
      return { error: 'Profile not found', status: 404 };
    }

    const isCurrentUser = currentUser?.id === profileUser.id;
    const isFriend = currentUser ? await this.areFriends(currentUser.id, profileUser.id) : false;
    const outgoingFriendRequest = currentUser && !isCurrentUser && !isFriend
      ? await this.db.get<{ id: string }>(
          "SELECT id FROM friend_requests WHERE requester_id = ? AND requested_user_id = ? AND status = 'pending'",
          currentUser.id,
          profileUser.id
        )
      : null;
    const incomingFriendRequest = currentUser && !isCurrentUser && !isFriend
      ? await this.db.get<{ id: string }>(
          "SELECT id FROM friend_requests WHERE requester_id = ? AND requested_user_id = ? AND status = 'pending'",
          profileUser.id,
          currentUser.id
        )
      : null;
    const publicRecipeVisibility = 'AND r.is_public = 1';
    const publicCookbookVisibility = 'AND c.is_public = 1';

    const recipeCount = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM recipes r WHERE r.user_id = ?',
      profileUser.id
    );

    const cookbookCount = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM cookbooks c WHERE c.user_id = ? AND c.is_system = 0',
      profileUser.id
    );

    const recipes = await this.db.all<DbRecipe & { owner_name: string | null }>(
      `SELECT r.*, owner.name as owner_name
       FROM recipes r
       LEFT JOIN users owner ON r.owner_id = owner.id
       WHERE r.user_id = ? ${publicRecipeVisibility}
       ORDER BY r.created_at DESC
       LIMIT 24`,
      profileUser.id
    );

    const cookbooks = await this.db.all<DbCookbook & { recipe_count: number; owner_name: string }>(
      `SELECT c.*, COUNT(cr.recipe_id) as recipe_count, owner.name as owner_name
       FROM cookbooks c
       LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
       JOIN users owner ON c.user_id = owner.id
       WHERE c.user_id = ? AND c.is_system = 0 ${publicCookbookVisibility}
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT 24`,
      profileUser.id
    );

    return {
      data: {
        profile: {
          user: formatProfileUser(profileUser),
          isCurrentUser,
          isFriend,
          hasPendingFriendRequest: !!outgoingFriendRequest,
          incomingFriendRequestId: incomingFriendRequest?.id ?? null,
          friendCount: await this.getFriendCount(profileUser.id),
          recipeCount: recipeCount?.count || 0,
          cookbookCount: cookbookCount?.count || 0,
          recipes: recipes.results.map(recipe => formatRecipe(recipe, currentUser?.id)),
          cookbooks: cookbooks.results.map(cookbook => ({
            id: cookbook.id,
            ownerId: cookbook.user_id,
            name: cookbook.name,
            description: cookbook.description,
            coverImage: cookbook.cover_image || null,
            recipeCount: cookbook.recipe_count || 0,
            isSystem: cookbook.is_system === 1,
            systemType: cookbook.system_type,
            isPublic: cookbook.is_public === 1,
            createdAt: cookbook.created_at,
            updatedAt: cookbook.updated_at,
            isOwner: currentUser ? cookbook.user_id === currentUser.id : false,
            ownerName: cookbook.owner_name,
          })),
        },
      },
      status: 200,
    };
  }

  async getFriends(_ctx: RequestContext, userId: string): Promise<ApiResult<{ friends: ProfileUserInfo[] }>> {
    const profileUser = await this.db.get<{ id: string }>('SELECT id FROM users WHERE id = ?', userId);
    if (!profileUser) {
      return { error: 'Profile not found', status: 404 };
    }

    const friends = await this.db.all<{ id: string; name: string; avatar_url: string | null }>(
      `SELECT u.id, u.name, u.avatar_url
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.user_a_id = ? THEN f.user_b_id
         ELSE f.user_a_id
       END
       WHERE f.user_a_id = ? OR f.user_b_id = ?
       ORDER BY u.name COLLATE NOCASE ASC`,
      userId,
      userId,
      userId
    );

    return {
      data: { friends: friends.results.map(formatProfileUser) },
      status: 200,
    };
  }

  async addFriend(
    ctx: RequestContext,
    data: { userId?: string; email?: string }
  ): Promise<ApiResult<{ friend: ProfileUserInfo }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const normalizedEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
    const friend = data.userId
      ? await this.db.get<{ id: string; name: string; avatar_url: string | null }>(
          'SELECT id, name, avatar_url FROM users WHERE id = ?',
          data.userId
        )
      : normalizedEmail
        ? await this.db.get<{ id: string; name: string; avatar_url: string | null }>(
            'SELECT id, name, avatar_url FROM users WHERE email = ?',
            normalizedEmail
          )
        : null;

    if (!friend) {
      return { error: 'User not found', status: 404 };
    }

    if (friend.id === user.id) {
      return { error: 'You cannot add yourself as a friend', status: 400 };
    }

    if (await this.areFriends(user.id, friend.id)) {
      return { data: { friend: formatProfileUser(friend) }, status: 200 };
    }

    const incomingRequest = await this.db.get<{ id: string }>(
      "SELECT id FROM friend_requests WHERE requester_id = ? AND requested_user_id = ? AND status = 'pending'",
      friend.id,
      user.id
    );

    if (incomingRequest) {
      const accepted = await this.acceptFriendRequest(ctx, incomingRequest.id);
      if (accepted.error) {
        return { error: accepted.error, status: accepted.status };
      }
      return { data: { friend: formatProfileUser(friend) }, status: 200 };
    }

    const now = Date.now();
    const existingRequest = await this.db.get<{ id: string; status: string }>(
      'SELECT id, status FROM friend_requests WHERE requester_id = ? AND requested_user_id = ?',
      user.id,
      friend.id
    );

    const friendRequestId = existingRequest?.id ?? this.crypto.generateId();
    if (existingRequest?.status === 'pending') {
      return { data: { friend: formatProfileUser(friend) }, status: 200 };
    }

    if (existingRequest) {
      await this.db.run(
        "UPDATE friend_requests SET status = 'pending', created_at = ?, responded_at = NULL WHERE id = ?",
        now,
        friendRequestId
      );
    } else {
      await this.db.run(
        'INSERT INTO friend_requests (id, requester_id, requested_user_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
        friendRequestId,
        user.id,
        friend.id,
        'pending',
        now
      );
    }

    await this.deleteFriendRequestNotifications(friend.id, [friendRequestId]);

    await this.db.run(
      'INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      this.crypto.generateId(),
      friend.id,
      'friend_request',
      'Friend request',
      `${user.name} sent you a friend request`,
      JSON.stringify({
        friendRequestId,
        requesterId: user.id,
        requesterName: user.name,
      }),
      0,
      now
    );

    return { data: { friend: formatProfileUser(friend) }, status: 200 };
  }

  async acceptFriendRequest(
    ctx: RequestContext,
    friendRequestId: string
  ): Promise<ApiResult<{ success: boolean; friend: ProfileUserInfo }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const { request, notificationData } = await this.findFriendRequestForUser(user, friendRequestId);
    const notificationIds = [friendRequestId, notificationData?.friendRequestId, request?.id];

    if (!request) {
      if (notificationData?.requesterId) {
        const friend = await this.db.get<{ id: string; name: string; avatar_url: string | null }>(
          'SELECT id, name, avatar_url FROM users WHERE id = ?',
          notificationData.requesterId
        );

        if (friend && await this.areFriends(user.id, friend.id)) {
          await this.deleteFriendRequestNotifications(user.id, notificationIds);
          return {
            data: {
              success: true,
              friend: formatProfileUser(friend),
            },
            status: 200,
          };
        }
      }

      await this.deleteFriendRequestNotifications(user.id, notificationIds);
      return { error: 'Friend request not found', status: 404 };
    }

    const friend = {
      id: request.requester_id,
      name: request.requester_name,
      avatar_url: request.requester_avatar_url,
    };

    if (request.status !== 'pending' && request.status !== 'accepted' && request.status !== 'declined') {
      if (await this.areFriends(user.id, request.requester_id)) {
        await this.deleteFriendRequestNotifications(user.id, notificationIds);
        return {
          data: {
            success: true,
            friend: formatProfileUser(friend),
          },
          status: 200,
        };
      }

      await this.deleteFriendRequestNotifications(user.id, notificationIds);
      return { error: 'Friend request has already been processed', status: 400 };
    }

    const now = Date.now();
    const { userAId, userBId } = orderedFriendPair(user.id, request.requester_id);
    if (!(await this.areFriends(user.id, request.requester_id))) {
      await this.db.run(
        'INSERT OR IGNORE INTO friendships (user_a_id, user_b_id, created_at) VALUES (?, ?, ?)',
        userAId,
        userBId,
        now
      );
    }

    if (request.status === 'pending' || request.status === 'declined') {
      await this.db.run(
        "UPDATE friend_requests SET status = 'accepted', responded_at = ? WHERE id = ?",
        now,
        request.id
      );
      await this.createFriendRequestAcceptedNotification(user, request.requester_id, now);
    }

    await this.deleteFriendRequestNotifications(
      user.id,
      notificationIds
    );

    return {
      data: {
        success: true,
        friend: formatProfileUser(friend),
      },
      status: 200,
    };
  }

  async declineFriendRequest(
    ctx: RequestContext,
    friendRequestId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const { request, notificationData } = await this.findFriendRequestForUser(user, friendRequestId);

    if (!request) {
      await this.deleteFriendRequestNotifications(user.id, [friendRequestId, notificationData?.friendRequestId]);
      return { error: 'Friend request not found', status: 404 };
    }

    if (request.status === 'pending') {
      await this.db.run(
        "UPDATE friend_requests SET status = 'declined', responded_at = ? WHERE id = ?",
        Date.now(),
        request.id
      );
    }

    await this.deleteFriendRequestNotifications(
      user.id,
      [friendRequestId, notificationData?.friendRequestId, request.id]
    );

    return { data: { success: true }, status: 200 };
  }

  async removeFriend(ctx: RequestContext, friendId: string): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const { userAId, userBId } = orderedFriendPair(user.id, friendId);
    await this.db.run(
      'DELETE FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
      userAId,
      userBId
    );

    return { data: { success: true }, status: 200 };
  }

  // Recipe handlers
  async getRecipes(ctx: RequestContext): Promise<ApiResult<{ recipes: RecipeInfo[] }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const result = await this.db.all<DbRecipe & { owner_name: string | null }>(
      `SELECT r.*, u.name as owner_name
       FROM recipes r
       LEFT JOIN users u ON r.owner_id = u.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      user.id
    );

    return {
      data: { recipes: dedupeRecipeRows(result.results, user.id).map(r => formatRecipe(r, user.id)) },
      status: 200,
    };
  }

  private async getUserSubscription(userId: string): Promise<DbUserSubscription | null> {
    return this.db.get<DbUserSubscription>(
      'SELECT * FROM user_subscriptions WHERE user_id = ?',
      userId
    );
  }

  private isPaidMealPlanSubscription(subscription: DbUserSubscription | null): boolean {
    return subscription?.status === 'active' || subscription?.status === 'trialing';
  }

  private async getMealPlanUsageForUser(userId: string, now = Date.now()): Promise<MealPlanUsageInfo> {
    const windowStartsAt = now - MEAL_PLAN_WEEK_MS;
    const subscription = await this.getUserSubscription(userId);
    const isPaid = this.isPaidMealPlanSubscription(subscription);
    const weeklyLimit = isPaid ? MEAL_PLAN_PAID_WEEKLY_LIMIT : MEAL_PLAN_FREE_WEEKLY_LIMIT;
    const usage = await this.db.get<{ count: number; oldest_created_at: number | null }>(
      `SELECT COUNT(*) as count, MIN(created_at) as oldest_created_at
       FROM ai_meal_plan_requests
       WHERE user_id = ? AND created_at > ?`,
      userId,
      windowStartsAt
    );

    const usedThisWeek = Number(usage?.count || 0);
    const remainingRequests = Math.max(0, weeklyLimit - usedThisWeek);
    const oldestCreatedAt = usage?.oldest_created_at ? Number(usage.oldest_created_at) : null;

    return {
      weeklyLimit,
      usedThisWeek,
      remainingRequests,
      windowStartsAt,
      nextResetAt: remainingRequests > 0 ? null : (oldestCreatedAt ? oldestCreatedAt + MEAL_PLAN_WEEK_MS : now + MEAL_PLAN_WEEK_MS),
      isPaid,
      planName: isPaid ? MEAL_PLAN_PAID_PLAN_NAME : 'Free',
      priceCents: MEAL_PLAN_PAID_PRICE_CENTS,
    };
  }

  async getMealPlanUsage(ctx: RequestContext): Promise<ApiResult<{ usage: MealPlanUsageInfo }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401, code: MEAL_PLAN_UNAUTHORIZED_CODE };
    }

    return {
      data: { usage: await this.getMealPlanUsageForUser(user.id) },
      status: 200,
    };
  }

  async getMealPlanHistory(ctx: RequestContext): Promise<ApiResult<{ history: MealPlanHistoryItem[] }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401, code: MEAL_PLAN_UNAUTHORIZED_CODE };
    }

    const [recipes, requests] = await Promise.all([
      this.getMealPlanRecipes(user.id),
      this.db.all<DbAiMealPlanRequest>(
        `SELECT id, user_id, prompt, response, created_at
         FROM ai_meal_plan_requests
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        user.id,
        MEAL_PLAN_HISTORY_LIMIT
      ),
    ]);

    return {
      data: {
        history: requests.results.map(row => buildMealPlanHistoryItem(
          row.id,
          row.prompt,
          row.response,
          row.created_at,
          recipes
        )),
      },
      status: 200,
    };
  }

  private async getMealPlanRecipes(userId: string): Promise<MealPlanRecipeContext[]> {
    const recipes = await this.db.all<Pick<DbRecipe, 'id' | 'title' | 'description' | 'ingredients' | 'tags' | 'prep_time' | 'cook_time' | 'servings'>>(
      `SELECT id, title, description, ingredients, tags, prep_time, cook_time, servings
       FROM recipes
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      userId,
      MEAL_PLAN_MAX_RECIPES
    );

    return recipes.results.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      ingredients: parseJsonList(recipe.ingredients),
      tags: parseJsonList(recipe.tags),
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      servings: recipe.servings,
    }));
  }

  async createMealPlan(
    ctx: RequestContext,
    requestText: string
  ): Promise<ApiResult<MealPlanHistoryItem & { usage: MealPlanUsageInfo }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401, code: MEAL_PLAN_UNAUTHORIZED_CODE };
    }

    const request = normalizeMealPlanRequest(requestText);
    if (!request) {
      return {
        error: 'Meal planning request is required and must be 1000 characters or fewer',
        status: 400,
        code: MEAL_PLAN_INVALID_REQUEST_CODE,
      };
    }

    const usage = await this.getMealPlanUsageForUser(user.id);
    if (usage.remainingRequests <= 0) {
      return { error: 'Weekly AI meal planning limit reached', status: 402, code: MEAL_PLAN_LIMIT_CODE };
    }

    const recipes = await this.getMealPlanRecipes(user.id);
    const suggestion = buildFallbackMealPlan(request, recipes);
    const details = buildMealPlanSuggestionDetails(request, suggestion, recipes);
    const now = Date.now();
    const id = this.crypto.generateId();

    await this.db.run(
      `INSERT INTO ai_meal_plan_requests (id, user_id, prompt, response, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      user.id,
      request,
      details.suggestion,
      now
    );

    return {
      data: {
        id,
        prompt: request,
        createdAt: now,
        ...details,
        usage: await this.getMealPlanUsageForUser(user.id, now),
        recipeCount: recipes.length,
      },
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
      isPublic?: boolean;
    }
  ): Promise<ApiResult<{ id: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const recipeId = this.crypto.generateId();
    await this.db.run(
      `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recipeId,
      user.id,
      user.id, // owner_id is the same as user_id when creating
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
      data.isPublic ? 1 : 0,
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
      isPublic?: boolean;
    }
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Only the owner can update a recipe
    const existing = await this.db.get<{ id: string; owner_id: string }>(
      'SELECT id, owner_id FROM recipes WHERE id = ? AND user_id = ?',
      recipeId,
      user.id
    );
    if (!existing) {
      return { error: 'Recipe not found', status: 404 };
    }

    if (existing.owner_id !== user.id) {
      return { error: 'Only the recipe owner can edit this recipe', status: 403 };
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
        servings = ?,
        is_public = COALESCE(?, is_public)
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
      data.isPublic !== undefined ? (data.isPublic ? 1 : 0) : null,
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

  async getCookbooksForRecipe(ctx: RequestContext, recipeId: string): Promise<ApiResult<{ cookbookIds: string[] }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Get all cookbook IDs that contain this recipe and user has access to (owned or shared)
    const result = await this.db.all<{ cookbook_id: string }>(
      `SELECT DISTINCT cr.cookbook_id
       FROM cookbook_recipes cr
       JOIN cookbooks c ON cr.cookbook_id = c.id
       LEFT JOIN cookbook_shares cs ON c.id = cs.cookbook_id AND cs.shared_with_user_id = ?
       WHERE cr.recipe_id = ? AND (c.user_id = ? OR cs.shared_with_user_id IS NOT NULL)`,
      user.id,
      recipeId,
      user.id
    );

    return { data: { cookbookIds: result.results.map(r => r.cookbook_id) }, status: 200 };
  }

  async createRecipeShareLink(
    _ctx: RequestContext,
    data: RecipeSharePayload
  ): Promise<ApiResult<RecipeShareLinkInfo>> {
    const recipe = normalizeRecipeSharePayload(data);
    if (!recipe) {
      return { error: 'Recipe must have a title, ingredients, and instructions', status: 400 };
    }

    const recipeData = JSON.stringify(recipe);
    if (recipeData.length > MAX_RECIPE_SHARE_BYTES) {
      return { error: 'Recipe is too large to share', status: 413 };
    }

    const id = this.crypto.generateId();
    const token = this.crypto.generateId();
    const createdAt = Date.now();

    await this.db.run(
      'INSERT INTO recipe_share_links (id, token, recipe_data, created_at) VALUES (?, ?, ?, ?)',
      id,
      token,
      recipeData,
      createdAt
    );

    return { data: { token, createdAt }, status: 201 };
  }

  async getSharedRecipe(token: string): Promise<ApiResult<{ recipe: RecipeSharePayload }>> {
    const link = await this.db.get<DbRecipeShareLink>(
      'SELECT * FROM recipe_share_links WHERE token = ?',
      token
    );

    if (!link) {
      return { error: 'Share link not found', status: 404 };
    }

    return { data: { recipe: JSON.parse(link.recipe_data) }, status: 200 };
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
      ownerId: c.user_id,
      name: c.name,
      description: c.description,
      coverImage: c.cover_image || null,
      recipeCount: c.recipe_count || 0,
      isSystem: c.is_system === 1,
      systemType: c.system_type,
      isPublic: c.is_public === 1,
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
          ownerId: cookbook.user_id,
          name: cookbook.name,
          description: cookbook.description,
          coverImage: cookbook.cover_image || null,
          recipeCount,
          isSystem: cookbook.is_system === 1,
          systemType: cookbook.system_type,
          isPublic: cookbook.is_public === 1,
          createdAt: cookbook.created_at,
          updatedAt: cookbook.updated_at,
          isOwner,
          ownerName,
        },
        recipes: recipes.results.map(r => ({
          ...formatRecipe(r as DbRecipe & { owner_name?: string | null }, user.id),
          addedByUserId: r.added_by_user_id,
          addedByUserName: r.added_by_user_name,
        })),
      },
      status: 200,
    };
  }

  async createCookbook(
    ctx: RequestContext,
    data: { name: string; description?: string; coverImage?: string; isPublic?: boolean }
  ): Promise<ApiResult<{ id: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbookId = this.crypto.generateId();
    const now = Date.now();
    await this.db.run(
      'INSERT INTO cookbooks (id, user_id, name, description, cover_image, is_system, system_type, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      cookbookId,
      user.id,
      data.name,
      data.description || null,
      data.coverImage || null,
      0, // not a system cookbook
      null,
      data.isPublic ? 1 : 0,
      now,
      now
    );

    return { data: { id: cookbookId }, status: 201 };
  }

  async updateCookbook(
    ctx: RequestContext,
    cookbookId: string,
    data: { name?: string; description?: string; coverImage?: string; isPublic?: boolean }
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const existing = await this.db.get<{ id: string; cover_image: string | null }>(
      'SELECT id, cover_image FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!existing) {
      return { error: 'Cookbook not found', status: 404 };
    }

    // Only update cover_image if explicitly provided, otherwise preserve existing
    const newCoverImage = data.coverImage !== undefined ? (data.coverImage || null) : existing.cover_image;

    await this.db.run(
      `UPDATE cookbooks SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        cover_image = ?,
        is_public = COALESCE(?, is_public),
        updated_at = ?
      WHERE id = ? AND user_id = ?`,
      data.name || null,
      data.description || null,
      newCoverImage,
      data.isPublic !== undefined ? (data.isPublic ? 1 : 0) : null,
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

    // Check if this is a system cookbook
    const cookbook = await this.db.get<{ is_system: number }>(
      'SELECT is_system FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );

    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    if (cookbook.is_system === 1) {
      return { error: 'Cannot delete system cookbooks', status: 403 };
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
  private async inviteUserToCookbook(
    ctx: RequestContext,
    cookbookId: string,
    targetUser: { id: string; name: string },
    options: { requireFriend: boolean }
  ): Promise<ApiResult<{ success: boolean; sharedWith?: { id: string; name: string } }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<{ id: string; user_id: string; name: string }>(
      'SELECT id, user_id, name FROM cookbooks WHERE id = ? AND user_id = ?',
      cookbookId,
      user.id
    );
    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    if (targetUser.id === user.id) {
      return { error: 'You cannot share a cookbook with yourself', status: 400 };
    }

    if (options.requireFriend && !(await this.areFriends(user.id, targetUser.id))) {
      return { error: 'You can only share cookbooks with friends', status: 400 };
    }

    // Check if already shared
    const existingShare = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?',
      cookbookId,
      targetUser.id
    );
    if (existingShare) {
      return { error: 'Cookbook is already shared with this user', status: 400 };
    }

    // Check for existing pending invite
    const existingInvite = await this.db.get<{ id: string }>(
      "SELECT id FROM cookbook_invites WHERE cookbook_id = ? AND invited_user_id = ? AND status = 'pending'",
      cookbookId,
      targetUser.id
    );
    if (existingInvite) {
      return { error: 'An invite has already been sent to this user', status: 400 };
    }

    const now = Date.now();
    const inviteId = this.crypto.generateId();
    const notificationId = this.crypto.generateId();

    // Create the invite
    await this.db.run(
      'INSERT INTO cookbook_invites (id, cookbook_id, invited_user_id, invited_by_user_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      inviteId,
      cookbookId,
      targetUser.id,
      user.id,
      'pending',
      now
    );

    // Create a notification for the target user
    const notificationData = JSON.stringify({
      inviteId,
      cookbookId,
      cookbookName: cookbook.name,
      invitedBy: user.name,
    });

    await this.db.run(
      'INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      notificationId,
      targetUser.id,
      'cookbook_invite',
      'Cookbook Invitation',
      `${user.name} invited you to collaborate on "${cookbook.name}"`,
      notificationData,
      0,
      now
    );

    return { data: { success: true, sharedWith: { id: targetUser.id, name: targetUser.name } }, status: 200 };
  }

  async shareWithUser(
    ctx: RequestContext,
    cookbookId: string,
    userId: string
  ): Promise<ApiResult<{ success: boolean; sharedWith?: { id: string; name: string } }>> {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return { error: 'User is required', status: 400 };
    }

    const targetUser = await this.db.get<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE id = ?',
      normalizedUserId
    );
    if (!targetUser) {
      return { error: 'User not found', status: 404 };
    }

    return this.inviteUserToCookbook(ctx, cookbookId, targetUser, { requireFriend: true });
  }

  async shareByEmail(
    ctx: RequestContext,
    cookbookId: string,
    email: string
  ): Promise<ApiResult<{ success: boolean; sharedWith?: { id: string; name: string } }>> {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      return { error: 'Email is required', status: 400 };
    }

    const targetUser = await this.db.get<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE email = ?',
      normalizedEmail
    );
    if (!targetUser) {
      return { error: 'User not found. They need to create an account first.', status: 404 };
    }

    return this.inviteUserToCookbook(ctx, cookbookId, targetUser, { requireFriend: false });
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
          ownerId: cookbook.user_id,
          name: cookbook.name,
          description: cookbook.description,
          coverImage: cookbook.cover_image || null,
          recipeCount: recipes.results.length,
          isSystem: cookbook.is_system === 1,
          systemType: cookbook.system_type,
          isPublic: cookbook.is_public === 1,
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

  // Notification handlers
  async getNotifications(
    ctx: RequestContext
  ): Promise<ApiResult<{ notifications: NotificationInfo[]; unreadCount: number }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const notifications = await this.db.all<{
      id: string;
      type: string;
      title: string;
      message: string;
      data: string | null;
      is_read: number;
      created_at: number;
    }>(
      'SELECT id, type, title, message, data, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      user.id
    );

    const unreadCount = notifications.results.filter(n => n.is_read === 0).length;

    return {
      data: {
        notifications: notifications.results.map(n => ({
          id: n.id,
          type: n.type as NotificationInfo['type'],
          title: n.title,
          message: n.message,
          data: n.data ? JSON.parse(n.data) : null,
          isRead: n.is_read === 1,
          createdAt: n.created_at,
        })),
        unreadCount,
      },
      status: 200,
    };
  }

  async markNotificationRead(
    ctx: RequestContext,
    notificationId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    await this.db.run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      notificationId,
      user.id
    );

    return { data: { success: true }, status: 200 };
  }

  async markAllNotificationsRead(
    ctx: RequestContext
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    await this.db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', user.id);

    return { data: { success: true }, status: 200 };
  }

  async clearAllNotifications(
    ctx: RequestContext
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    await this.db.run('DELETE FROM notifications WHERE user_id = ?', user.id);

    return { data: { success: true }, status: 200 };
  }

  // Invite handlers
  async acceptInvite(
    ctx: RequestContext,
    inviteId: string
  ): Promise<ApiResult<{ success: boolean; cookbookId: string; cookbookName: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const invite = await this.db.get<{
      id: string;
      cookbook_id: string;
      invited_by_user_id: string;
      status: string;
    }>(
      "SELECT id, cookbook_id, invited_by_user_id, status FROM cookbook_invites WHERE id = ? AND invited_user_id = ?",
      inviteId,
      user.id
    );

    if (!invite) {
      return { error: 'Invite not found', status: 404 };
    }

    if (invite.status !== 'pending') {
      return { error: 'Invite has already been processed', status: 400 };
    }

    const cookbook = await this.db.get<{ id: string; name: string }>(
      'SELECT id, name FROM cookbooks WHERE id = ?',
      invite.cookbook_id
    );

    if (!cookbook) {
      return { error: 'Cookbook no longer exists', status: 404 };
    }

    // Create the share
    const shareId = this.crypto.generateId();
    await this.db.run(
      'INSERT INTO cookbook_shares (id, cookbook_id, shared_with_user_id, shared_by_user_id, created_at) VALUES (?, ?, ?, ?, ?)',
      shareId,
      invite.cookbook_id,
      user.id,
      invite.invited_by_user_id,
      Date.now()
    );

    // Update invite status
    await this.db.run(
      "UPDATE cookbook_invites SET status = 'accepted' WHERE id = ?",
      inviteId
    );

    // Mark related notification as read
    await this.db.run(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'cookbook_invite' AND data LIKE ?",
      user.id,
      `%"inviteId":"${inviteId}"%`
    );

    return {
      data: { success: true, cookbookId: cookbook.id, cookbookName: cookbook.name },
      status: 200,
    };
  }

  async declineInvite(
    ctx: RequestContext,
    inviteId: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const invite = await this.db.get<{ id: string; status: string }>(
      "SELECT id, status FROM cookbook_invites WHERE id = ? AND invited_user_id = ?",
      inviteId,
      user.id
    );

    if (!invite) {
      return { error: 'Invite not found', status: 404 };
    }

    if (invite.status !== 'pending') {
      return { error: 'Invite has already been processed', status: 400 };
    }

    // Update invite status
    await this.db.run(
      "UPDATE cookbook_invites SET status = 'declined' WHERE id = ?",
      inviteId
    );

    // Delete related notification
    await this.db.run(
      "DELETE FROM notifications WHERE user_id = ? AND type = 'cookbook_invite' AND data LIKE ?",
      user.id,
      `%"inviteId":"${inviteId}"%`
    );

    return { data: { success: true }, status: 200 };
  }

  // Sample recipes helper
  private async addSampleRecipes(userId: string): Promise<void> {
    const sampleRecipes = [
      {
        title: 'Herb-Crusted Chicken',
        description: 'Tender chicken breast with a golden herb crust, served with seasonal vegetables.',
        ingredients: ['4 chicken breasts', '1 cup fresh breadcrumbs', '2 tbsp fresh thyme, chopped', '2 tbsp fresh rosemary, chopped', '3 cloves garlic, minced', '3 tbsp olive oil', 'Salt and pepper to taste'],
        instructions: ['Preheat oven to 400°F', 'Combine breadcrumbs, herbs, garlic, and olive oil', 'Season chicken with salt and pepper', 'Press herb mixture onto chicken breasts', 'Bake for 25-30 minutes until golden', 'Rest for 5 minutes before serving'],
        tags: ['dinner', 'chicken', 'healthy'],
        prepTime: '15 mins',
        cookTime: '30 mins',
        servings: '4',
        imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80',
      },
      {
        title: 'Classic Buttermilk Pancakes',
        description: 'Light and fluffy pancakes with a subtle tang from buttermilk.',
        ingredients: ['2 cups all-purpose flour', '2 tbsp sugar', '2 tsp baking powder', '1 tsp baking soda', '2 cups buttermilk', '2 eggs', '3 tbsp melted butter'],
        instructions: ['Whisk together dry ingredients', 'In a separate bowl, combine buttermilk, eggs, and butter', 'Fold wet ingredients into dry until just combined', 'Heat griddle to medium', 'Pour 1/4 cup batter per pancake', 'Flip when bubbles form on surface', 'Serve warm with maple syrup'],
        tags: ['breakfast', 'vegetarian', 'quick'],
        prepTime: '10 mins',
        cookTime: '15 mins',
        servings: '6',
        imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
      },
      {
        title: 'Chocolate Fondant',
        description: 'Individual chocolate cakes with a molten center, dusted with cocoa.',
        ingredients: ['200g dark chocolate (70%)', '150g unsalted butter', '3 whole eggs', '3 egg yolks', '75g caster sugar', '50g plain flour', 'Cocoa powder for dusting'],
        instructions: ['Melt chocolate and butter over a bain-marie', 'Whisk eggs, yolks, and sugar until pale', 'Fold in chocolate mixture', 'Sift in flour and fold gently', 'Pour into buttered ramekins', 'Bake at 220°C for 10-12 minutes', 'Rest for 1 minute, then invert onto plates', 'Dust with cocoa and serve immediately'],
        tags: ['dessert', 'chocolate', 'dinner-party'],
        prepTime: '15 mins',
        cookTime: '12 mins',
        servings: '4',
        imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
      },
    ];

    const recipeIds: string[] = [];
    const now = Date.now();
    for (const recipe of sampleRecipes) {
      const recipeId = this.crypto.generateId();
      recipeIds.push(recipeId);
      await this.db.run(
        `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        recipeId,
        userId,
        userId, // owner_id is the same as user_id
        recipe.title,
        recipe.description,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.instructions),
        JSON.stringify(recipe.tags),
        recipe.imageUrl,
        null,
        recipe.prepTime,
        recipe.cookTime,
        recipe.servings,
        0, // private by default
        now
      );
    }

    // Create "My Recipe Collection" system cookbook
    const collectionId = this.crypto.generateId();
    await this.db.run(
      `INSERT INTO cookbooks (id, user_id, name, description, cover_image, is_system, system_type, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      collectionId,
      userId,
      'My Recipe Collection',
      'All recipes you have saved',
      null,
      1, // system cookbook
      'collection',
      0, // private
      now,
      now
    );

    // Create default cookbook with sample recipes
    const cookbookId = this.crypto.generateId();
    await this.db.run(
      `INSERT INTO cookbooks (id, user_id, name, description, cover_image, is_system, system_type, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cookbookId,
      userId,
      'My Favorite Recipes',
      'A collection of recipes I love',
      null,
      0, // not a system cookbook
      null,
      0, // private
      now,
      now
    );

    // Add all sample recipes to the cookbook
    for (const recipeId of recipeIds) {
      await this.db.run(
        `INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at)
         VALUES (?, ?, ?, ?)`,
        cookbookId,
        recipeId,
        userId,
        now
      );
    }
  }

  // Get or create the user's "My Recipe Collection" system cookbook
  private async getOrCreateRecipeCollection(userId: string): Promise<string> {
    const existing = await this.db.get<{ id: string }>(
      'SELECT id FROM cookbooks WHERE user_id = ? AND system_type = ?',
      userId,
      'collection'
    );

    if (existing) {
      return existing.id;
    }

    // Create the collection for existing users who don't have one yet
    const collectionId = this.crypto.generateId();
    const now = Date.now();
    await this.db.run(
      `INSERT INTO cookbooks (id, user_id, name, description, cover_image, is_system, system_type, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      collectionId,
      userId,
      'My Recipe Collection',
      'All recipes you have saved',
      null,
      1, // system cookbook
      'collection',
      0, // private
      now,
      now
    );

    return collectionId;
  }

  // Discovery endpoints for public content
  async getDiscoverRecipes(
    ctx: RequestContext,
    options?: { limit?: number; offset?: number; tags?: string[] }
  ): Promise<ApiResult<{ recipes: RecipeInfo[]; total: number }>> {
    const user = await this.getSessionUser(ctx);
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = `
      SELECT r.*, u.name as owner_name
      FROM recipes r
      JOIN users u ON r.owner_id = u.id
      WHERE r.is_public = 1
    `;
    const params: unknown[] = [];

    if (options?.tags && options.tags.length > 0) {
      // Filter by tags (recipe must contain ALL specified tags)
      for (const tag of options.tags) {
        query += ` AND r.tags LIKE ?`;
        params.push(`%"${tag}"%`);
      }
    }

    let countQuery = `SELECT COUNT(*) as count FROM recipes r WHERE r.is_public = 1`;
    const countParams: unknown[] = [];
    if (options?.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        countQuery += ` AND r.tags LIKE ?`;
        countParams.push(`%"${tag}"%`);
      }
    }

    // Get total count
    const countResult = await this.db.get<{ count: number }>(
      countQuery,
      ...countParams
    );

    query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await this.db.all<DbRecipe & { owner_name: string }>(query, ...params);

    return {
      data: {
        recipes: result.results.map(r => formatRecipe(r, user?.id)),
        total: countResult?.count || 0,
      },
      status: 200,
    };
  }

  async getDiscoverCookbooks(
    ctx: RequestContext,
    options?: { limit?: number; offset?: number }
  ): Promise<ApiResult<{ cookbooks: CookbookInfo[]; total: number }>> {
    const user = await this.getSessionUser(ctx);
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const countResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM cookbooks WHERE is_public = 1 AND is_system = 0'
    );

    const result = await this.db.all<DbCookbook & { recipe_count: number; owner_name: string }>(
      `SELECT c.*, COUNT(cr.recipe_id) as recipe_count, u.name as owner_name
       FROM cookbooks c
       LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
       JOIN users u ON c.user_id = u.id
       WHERE c.is_public = 1 AND c.is_system = 0
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT ? OFFSET ?`,
      limit,
      offset
    );

    return {
      data: {
        cookbooks: result.results.map(c => ({
          id: c.id,
          ownerId: c.user_id,
          name: c.name,
          description: c.description,
          coverImage: c.cover_image || null,
          recipeCount: c.recipe_count || 0,
          isSystem: c.is_system === 1,
          systemType: c.system_type,
          isPublic: c.is_public === 1,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          isOwner: user ? c.user_id === user.id : false,
          ownerName: c.owner_name,
        })),
        total: countResult?.count || 0,
      },
      status: 200,
    };
  }

  private async findExistingSavedRecipeId(userId: string, recipe: DbRecipe): Promise<string | null> {
    const existing = await this.db.get<{ id: string }>(
      `SELECT id FROM recipes
       WHERE user_id = ?
         AND (
           id = ?
           OR source_recipe_id = ?
           OR (
             owner_id = ?
             AND title = ?
             AND COALESCE(description, '') = COALESCE(?, '')
             AND ingredients = ?
             AND instructions = ?
             AND COALESCE(tags, '') = COALESCE(?, '')
             AND COALESCE(image_url, '') = COALESCE(?, '')
             AND COALESCE(source_url, '') = COALESCE(?, '')
             AND COALESCE(prep_time, '') = COALESCE(?, '')
             AND COALESCE(cook_time, '') = COALESCE(?, '')
             AND COALESCE(servings, '') = COALESCE(?, '')
           )
         )
       ORDER BY
         CASE
           WHEN id = ? THEN 0
           WHEN source_recipe_id = ? THEN 1
           ELSE 2
         END,
         created_at ASC
       LIMIT 1`,
      userId,
      recipe.id,
      recipe.id,
      recipe.owner_id,
      recipe.title,
      recipe.description,
      recipe.ingredients,
      recipe.instructions,
      recipe.tags,
      recipe.image_url,
      recipe.source_url,
      recipe.prep_time,
      recipe.cook_time,
      recipe.servings,
      recipe.id,
      recipe.id
    );

    return existing?.id || null;
  }

  // Save a public recipe to user's collection (creates a copy)
  async saveRecipe(
    ctx: RequestContext,
    recipeId: string
  ): Promise<ApiResult<{ id: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Get the public recipe
    const recipe = await this.db.get<DbRecipe>(
      'SELECT * FROM recipes WHERE id = ? AND is_public = 1',
      recipeId
    );

    if (!recipe) {
      return { error: 'Recipe not found or not public', status: 404 };
    }

    const existingRecipeId = await this.findExistingSavedRecipeId(user.id, recipe);
    if (existingRecipeId) {
      return { data: { id: existingRecipeId }, status: 200 };
    }

    // Create a copy of the recipe for the user
    const newRecipeId = this.crypto.generateId();
    await this.db.run(
      `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, source_recipe_id, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newRecipeId,
      user.id,
      recipe.owner_id, // Keep original owner reference
      recipe.title,
      recipe.description,
      recipe.ingredients,
      recipe.instructions,
      recipe.tags,
      recipe.image_url,
      recipe.source_url,
      recipe.prep_time,
      recipe.cook_time,
      recipe.servings,
      recipe.id,
      0, // saved copies are private by default
      Date.now()
    );

    // Add to user's "My Recipe Collection" cookbook
    const collectionId = await this.getOrCreateRecipeCollection(user.id);
    await this.db.run(
      'INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)',
      collectionId,
      newRecipeId,
      user.id,
      Date.now()
    );
    await this.db.run('UPDATE cookbooks SET updated_at = ? WHERE id = ?', Date.now(), collectionId);

    return { data: { id: newRecipeId }, status: 201 };
  }

  // Save a public cookbook to user's collection (creates a copy with all recipes)
  async saveCookbook(
    ctx: RequestContext,
    cookbookId: string
  ): Promise<ApiResult<{ id: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Get the public cookbook
    const cookbook = await this.db.get<DbCookbook>(
      'SELECT * FROM cookbooks WHERE id = ? AND is_public = 1',
      cookbookId
    );

    if (!cookbook) {
      return { error: 'Cookbook not found or not public', status: 404 };
    }

    // Get all recipes in the cookbook
    const cookbookRecipes = await this.db.all<DbRecipe>(
      `SELECT r.* FROM recipes r
       JOIN cookbook_recipes cr ON r.id = cr.recipe_id
       WHERE cr.cookbook_id = ?`,
      cookbookId
    );

    const now = Date.now();
    const newCookbookId = this.crypto.generateId();

    // Create a copy of the cookbook
    await this.db.run(
      `INSERT INTO cookbooks (id, user_id, name, description, cover_image, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      newCookbookId,
      user.id,
      cookbook.name,
      cookbook.description,
      cookbook.cover_image,
      0, // private
      now,
      now
    );

    // Get user's recipe collection for adding recipes there too
    const collectionId = await this.getOrCreateRecipeCollection(user.id);

    // Copy each recipe and add to both the new cookbook and user's collection
    for (const recipe of cookbookRecipes.results) {
      let savedRecipeId = await this.findExistingSavedRecipeId(user.id, recipe);

      if (!savedRecipeId) {
        savedRecipeId = this.crypto.generateId();

        await this.db.run(
          `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, source_recipe_id, is_public, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          savedRecipeId,
          user.id,
          recipe.owner_id,
          recipe.title,
          recipe.description,
          recipe.ingredients,
          recipe.instructions,
          recipe.tags,
          recipe.image_url,
          recipe.source_url,
          recipe.prep_time,
          recipe.cook_time,
          recipe.servings,
          recipe.id,
          0, // private
          now
        );
      }

      // Add to new cookbook
      await this.db.run(
        'INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)',
        newCookbookId,
        savedRecipeId,
        user.id,
        now
      );

      // Add to user's recipe collection
      await this.db.run(
        'INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)',
        collectionId,
        savedRecipeId,
        user.id,
        now
      );
    }

    return { data: { id: newCookbookId }, status: 201 };
  }

  // Save a recipe from preview data (for shared recipe links)
  async savePreviewRecipe(
    ctx: RequestContext,
    recipeData: {
      title: string;
      description: string;
      ingredients: string[];
      instructions: string[];
      prepTime?: string;
      cookTime?: string;
      servings?: string;
      imageUrl?: string;
      sourceUrl: string;
    }
  ): Promise<ApiResult<{ id: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    if (!recipeData.title || !recipeData.ingredients?.length || !recipeData.instructions?.length) {
      return { error: 'Recipe must have a title, ingredients, and instructions', status: 400 };
    }

    // Create the recipe
    const recipeId = this.crypto.generateId();
    const now = Date.now();

    await this.db.run(
      `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recipeId,
      user.id,
      user.id,
      recipeData.title,
      recipeData.description || '',
      JSON.stringify(recipeData.ingredients),
      JSON.stringify(recipeData.instructions),
      JSON.stringify([]), // no tags from preview
      recipeData.imageUrl || null,
      recipeData.sourceUrl,
      recipeData.prepTime || null,
      recipeData.cookTime || null,
      recipeData.servings || null,
      0, // private
      now
    );

    // Add to My Recipe Collection
    const collectionId = await this.getOrCreateRecipeCollection(user.id);
    await this.db.run(
      'INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)',
      collectionId,
      recipeId,
      user.id,
      now
    );
    await this.db.run('UPDATE cookbooks SET updated_at = ? WHERE id = ?', now, collectionId);

    return { data: { id: recipeId }, status: 201 };
  }

  // Get a single public recipe by ID
  async getPublicRecipe(recipeId: string): Promise<ApiResult<{ recipe: RecipeInfo }>> {
    const recipe = await this.db.get<DbRecipe & { owner_name: string }>(
      `SELECT r.*, u.name as owner_name
       FROM recipes r
       JOIN users u ON r.owner_id = u.id
       WHERE r.id = ? AND r.is_public = 1`,
      recipeId
    );

    if (!recipe) {
      return { error: 'Recipe not found', status: 404 };
    }

    return {
      data: { recipe: formatRecipe(recipe) },
      status: 200,
    };
  }

  // Get a public cookbook by ID
  async getPublicCookbook(
    cookbookId: string
  ): Promise<ApiResult<{ cookbook: CookbookInfo; recipes: RecipeInfo[] }>> {
    const cookbook = await this.db.get<DbCookbook & { owner_name: string }>(
      `SELECT c.*, u.name as owner_name
       FROM cookbooks c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ? AND c.is_public = 1 AND c.is_system = 0`,
      cookbookId
    );

    if (!cookbook) {
      return { error: 'Cookbook not found', status: 404 };
    }

    const recipes = await this.db.all<DbRecipe & { owner_name: string }>(
      `SELECT r.*, u.name as owner_name
       FROM recipes r
       JOIN cookbook_recipes cr ON r.id = cr.recipe_id
       JOIN users u ON r.owner_id = u.id
       WHERE cr.cookbook_id = ?
       ORDER BY cr.added_at DESC`,
      cookbookId
    );

    return {
      data: {
        cookbook: {
          id: cookbook.id,
          ownerId: cookbook.user_id,
          name: cookbook.name,
          description: cookbook.description,
          coverImage: cookbook.cover_image || null,
          recipeCount: recipes.results.length,
          isSystem: cookbook.is_system === 1,
          systemType: cookbook.system_type,
          isPublic: cookbook.is_public === 1,
          createdAt: cookbook.created_at,
          updatedAt: cookbook.updated_at,
          isOwner: false,
          ownerName: cookbook.owner_name,
        },
        recipes: recipes.results.map(r => formatRecipe(r)),
      },
      status: 200,
    };
  }
}
