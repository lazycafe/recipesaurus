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
  DbProfileBadge,
  ProfileBadgeInfo,
} from './types';
import {
  MEAL_PLAN_HISTORY_LIMIT,
  MEAL_PLAN_MAX_RECIPES,
  MEAL_PLAN_MAX_PUBLIC_RECIPES,
  MEAL_PLAN_FREE_WEEKLY_LIMIT,
  MEAL_PLAN_PAID_PLAN_NAME,
  MEAL_PLAN_PAID_PRICE_CENTS,
  MEAL_PLAN_PAID_WEEKLY_LIMIT,
  MEAL_PLAN_WEEK_MS,
  MEAL_PLAN_INVALID_REQUEST_CODE,
  MEAL_PLAN_LIMIT_CODE,
  MEAL_PLAN_STARTER_RECIPE_OWNER_EMAIL,
  MEAL_PLAN_STARTER_RECIPE_OWNER_NAME,
  MEAL_PLAN_UNAUTHORIZED_CODE,
  type MealPlanRecipeContext,
  type MealPlanGeneratedRecipeDraft,
  type MealPlanHistoryItem,
  type MealPlanUsageInfo,
  buildMealPlanGeneratedRecipeDrafts,
  buildMealPlanHistoryItem,
  buildMealPlanSuggestionDetails,
  buildFallbackMealPlan,
  mergeMealPlanRecipeContexts,
  normalizeMealPlanRecipeTitle,
  normalizeMealPlanRequest,
} from './mealPlanner';
import {
  COOKBOOK_SHARE_LINK_RATE_LIMIT,
  SHARE_LINK_DURATION_MS,
  getShareLinkExpiresAt,
  getSqlLikePattern,
  isShareLinkExpired,
  normalizeDiscoverySearchQuery,
} from './shared';

// Constants
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_LOGIN_IP_ATTEMPTS = 50;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const PUBLIC_RECIPE_SHARE_LIMIT = 30;
const AUTHENTICATED_RECIPE_SHARE_LIMIT = 120;

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

interface RecipeShareNotificationData {
  shareToken?: string;
  recipeTitle?: string;
  sharedBy?: string;
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

const PROFILE_BADGE_LABELS: Record<string, string> = {
  early_adopter: 'Early Adopter',
  top_contributor: 'Top Contributor',
};

function formatProfileBadge(badge: Pick<DbProfileBadge, 'badge' | 'granted_at'>): ProfileBadgeInfo {
  const fallbackLabel = badge.badge
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

  return {
    id: badge.badge,
    label: PROFILE_BADGE_LABELS[badge.badge] || fallbackLabel,
    grantedAt: badge.granted_at,
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
function formatRecipe(
  r: DbRecipe & { owner_name?: string | null },
  currentUserId?: string,
  addedByUserName?: string | null,
  options?: { savedCopyId?: string | null }
): RecipeInfo {
  const recipe: RecipeInfo = {
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
    isOwner: currentUserId ? r.user_id === currentUserId : undefined,
    createdAt: r.created_at,
    addedByUserName,
  };

  if (options) {
    recipe.savedCopyId = options.savedCopyId || null;
    recipe.isSaved = Boolean(options.savedCopyId);
  }

  return recipe;
}

function recipesHaveSameSavedContent(candidate: DbRecipe, source: DbRecipe): boolean {
  return candidate.owner_id === source.owner_id &&
    candidate.title === source.title &&
    (candidate.description || '') === (source.description || '') &&
    candidate.ingredients === source.ingredients &&
    candidate.instructions === source.instructions &&
    (candidate.tags || '') === (source.tags || '') &&
    (candidate.image_url || '') === (source.image_url || '') &&
    (candidate.source_url || '') === (source.source_url || '') &&
    (candidate.prep_time || '') === (source.prep_time || '') &&
    (candidate.cook_time || '') === (source.cook_time || '') &&
    (candidate.servings || '') === (source.servings || '');
}

function isUneditedRecipeCopy(candidate: DbRecipe, source: DbRecipe): boolean {
  return candidate.source_recipe_id === source.id &&
    candidate.is_public === 0 &&
    recipesHaveSameSavedContent(candidate, source);
}

function isSavedRecipeMatch(candidate: DbRecipe, source: DbRecipe, includeOriginal: boolean): boolean {
  return (includeOriginal && candidate.id === source.id) || isUneditedRecipeCopy(candidate, source);
}

const MAX_SQL_BIND_PARAMS = 90;

interface RecipeCopyInsert {
  id: string;
  source: DbRecipe;
}

interface CookbookRecipeLinkInsert {
  cookbookId: string;
  recipeId: string;
  userId: string;
  addedAt: number;
}

function chunkBySqlParams<T>(items: T[], paramsPerItem: number, baseParams = 0): T[][] {
  const maxItemsPerChunk = Math.max(1, Math.floor((MAX_SQL_BIND_PARAMS - baseParams) / paramsPerItem));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += maxItemsPerChunk) {
    chunks.push(items.slice(index, index + maxItemsPerChunk));
  }
  return chunks;
}

function sqlPlaceholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function sqlRows(rowCount: number, paramsPerRow: number): string {
  const row = `(${sqlPlaceholders(paramsPerRow)})`;
  return Array.from({ length: rowCount }, () => row).join(', ');
}

function savedRecipeCandidateRank(candidate: DbRecipe, sourceId: string): number {
  if (candidate.id === sourceId) return 0;
  if (candidate.source_recipe_id === sourceId) return 1;
  return 2;
}

function cookbooksHaveSameSavedContent(candidate: DbCookbook, source: DbCookbook): boolean {
  return candidate.user_id !== source.user_id &&
    candidate.name === source.name &&
    (candidate.description || '') === (source.description || '') &&
    (candidate.cover_image || '') === (source.cover_image || '') &&
    candidate.is_system === 0 &&
    candidate.is_public === 0;
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

const MAX_RECIPE_SHARE_BYTES = 512 * 1024;
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
  private async checkRateLimit(email: string, ip: string | null): Promise<{ allowed: boolean; remainingAttempts: number }> {
    const windowStart = Date.now() - ATTEMPT_WINDOW;
    const normalizedEmail = email.toLowerCase();
    const normalizedIp = ip || 'unknown';
    const emailIpResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM login_attempts WHERE email = ? AND ip_address = ? AND attempted_at > ? AND success = 0',
      normalizedEmail,
      normalizedIp,
      windowStart
    );
    const ipResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND attempted_at > ? AND success = 0',
      normalizedIp,
      windowStart
    );

    const emailIpFailures = emailIpResult?.count || 0;
    const ipFailures = ipResult?.count || 0;
    const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - emailIpFailures);

    return {
      allowed: emailIpFailures < MAX_LOGIN_ATTEMPTS && ipFailures < MAX_LOGIN_IP_ATTEMPTS,
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

  private async checkFixedWindowRateLimit(
    bucket: string,
    key: string,
    maxRequests: number,
    windowMs = RATE_LIMIT_WINDOW
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const existing = await this.db.get<{ count: number }>(
      'SELECT count FROM rate_limits WHERE bucket = ? AND key = ? AND window_start = ?',
      bucket,
      key,
      windowStart
    );

    if (existing && existing.count >= maxRequests) {
      return false;
    }

    if (existing) {
      await this.db.run(
        'UPDATE rate_limits SET count = count + 1 WHERE bucket = ? AND key = ? AND window_start = ?',
        bucket,
        key,
        windowStart
      );
    } else {
      await this.db.run(
        'INSERT INTO rate_limits (id, bucket, key, window_start, count) VALUES (?, ?, ?, ?, 1)',
        this.crypto.generateId(),
        bucket,
        key,
        windowStart
      );
    }

    await this.db.run('DELETE FROM rate_limits WHERE window_start < ?', now - windowMs * 2);
    return true;
  }

  private getClientRateLimitKey(ctx: RequestContext, user: DbUser | null): string {
    if (user) {
      return `user:${user.id}`;
    }

    return `ip:${ctx.ip || 'unknown'}`;
  }

  private async deleteExpiredRecipeShareLinks(now = Date.now()): Promise<void> {
    await this.db.run('DELETE FROM recipe_share_links WHERE created_at < ?', now - SHARE_LINK_DURATION_MS);
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

  private parseRecipeShareNotificationData(data: string | null): RecipeShareNotificationData | null {
    if (!data) return null;

    try {
      const parsed = JSON.parse(data) as RecipeShareNotificationData;
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async getRecipeShareNotification(
    userId: string,
    shareToken: string
  ): Promise<{ id: string; data: RecipeShareNotificationData } | null> {
    const notifications = await this.db.all<{ id: string; data: string | null }>(
      "SELECT id, data FROM notifications WHERE user_id = ? AND type = 'recipe_share' ORDER BY created_at DESC",
      userId
    );

    for (const notification of notifications.results) {
      const notificationData = this.parseRecipeShareNotificationData(notification.data);
      if (notificationData?.shareToken === shareToken) {
        return { id: notification.id, data: notificationData };
      }
    }

    return null;
  }

  private async deleteRecipeShareNotifications(userId: string, shareToken: string): Promise<void> {
    const notifications = await this.db.all<{ id: string; data: string | null }>(
      "SELECT id, data FROM notifications WHERE user_id = ? AND type = 'recipe_share'",
      userId
    );

    const notificationIds = notifications.results
      .filter(notification => this.parseRecipeShareNotificationData(notification.data)?.shareToken === shareToken)
      .map(notification => notification.id);

    for (const id of notificationIds) {
      await this.db.run(
        "DELETE FROM notifications WHERE id = ? AND user_id = ? AND type = 'recipe_share'",
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

    // Expected behavior: public profiles leak private content counts as aggregate stats,
    // while the recipe and cookbook item lists below stay limited to public content.
    const recipeCount = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM recipes r WHERE r.user_id = ?',
      profileUser.id
    );

    const cookbookCount = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM cookbooks c WHERE c.user_id = ? AND c.is_system = 0',
      profileUser.id
    );

    const badges = await this.db.all<Pick<DbProfileBadge, 'badge' | 'granted_at'>>(
      'SELECT badge, granted_at FROM profile_badges WHERE user_id = ? ORDER BY granted_at ASC, badge ASC',
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
          user: {
            ...formatProfileUser(profileUser),
            badges: badges.results.map(formatProfileBadge),
          },
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

  async getFriends(ctx: RequestContext, userId: string): Promise<ApiResult<{ friends: ProfileUserInfo[] }>> {
    const currentUser = await this.getSessionUser(ctx);
    if (!currentUser) {
      return { error: 'Unauthorized', status: 401 };
    }

    const profileUser = await this.db.get<{ id: string }>('SELECT id FROM users WHERE id = ?', userId);
    if (!profileUser) {
      return { error: 'Profile not found', status: 404 };
    }

    if (currentUser.id !== profileUser.id && !(await this.areFriends(currentUser.id, profileUser.id))) {
      return { error: 'Friends are only visible to the profile owner and friends', status: 403 };
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

    const [recipes, publicRecipes, requests] = await Promise.all([
      this.getMealPlanRecipes(user.id),
      this.getMealPlanPublicRecipes(user.id),
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

    const recipeContext = mergeMealPlanRecipeContexts(recipes, publicRecipes);

    return {
      data: {
        history: requests.results.map(row => buildMealPlanHistoryItem(
          row.id,
          row.prompt,
          row.response,
          row.created_at,
          recipeContext
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
      source: 'user',
    }));
  }

  private async getMealPlanPublicRecipes(userId: string): Promise<MealPlanRecipeContext[]> {
    const recipes = await this.db.all<Pick<DbRecipe, 'id' | 'title' | 'description' | 'ingredients' | 'tags' | 'prep_time' | 'cook_time' | 'servings'>>(
      `SELECT id, title, description, ingredients, tags, prep_time, cook_time, servings
       FROM recipes
       WHERE is_public = 1 AND user_id <> ?
       ORDER BY created_at DESC
       LIMIT ?`,
      userId,
      MEAL_PLAN_MAX_PUBLIC_RECIPES
    );

    return recipes.results.map(recipe => this.toMealPlanRecipeContext(recipe, 'public'));
  }

  private async getMealPlanStarterRecipeOwner(): Promise<{ id: string } | null> {
    return this.db.get<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      MEAL_PLAN_STARTER_RECIPE_OWNER_EMAIL
    );
  }

  private async getOrCreateMealPlanStarterRecipeOwner(now: number): Promise<{ id: string }> {
    const existing = await this.getMealPlanStarterRecipeOwner();
    if (existing) {
      await this.db.run(
        'UPDATE users SET name = ? WHERE id = ?',
        MEAL_PLAN_STARTER_RECIPE_OWNER_NAME,
        existing.id
      );
      return existing;
    }

    const userId = this.crypto.generateId();
    await this.db.run(
      'INSERT INTO users (id, email, name, avatar_url, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      userId,
      MEAL_PLAN_STARTER_RECIPE_OWNER_EMAIL,
      MEAL_PLAN_STARTER_RECIPE_OWNER_NAME,
      null,
      'recipesaurus-system-user',
      'recipesaurus-system-user',
      now
    );

    return { id: userId };
  }

  private toMealPlanRecipeContext(
    recipe: Pick<DbRecipe, 'id' | 'title' | 'description' | 'ingredients' | 'tags' | 'prep_time' | 'cook_time' | 'servings'>,
    source: 'user' | 'public' = 'user'
  ): MealPlanRecipeContext {
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      ingredients: parseJsonList(recipe.ingredients),
      tags: parseJsonList(recipe.tags),
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      servings: recipe.servings,
      source,
    };
  }

  private async createMealPlanGeneratedRecipes(
    userId: string,
    request: string,
    suggestion: string,
    recipes: MealPlanRecipeContext[],
    now: number
  ): Promise<MealPlanRecipeContext[]> {
    const drafts = buildMealPlanGeneratedRecipeDrafts(request, suggestion, recipes);
    if (drafts.length === 0) {
      return [];
    }

    const existingRows = await this.db.all<Pick<DbRecipe, 'id' | 'user_id' | 'title' | 'description' | 'ingredients' | 'tags' | 'prep_time' | 'cook_time' | 'servings'>>(
      `SELECT id, user_id, title, description, ingredients, tags, prep_time, cook_time, servings
       FROM recipes
       WHERE user_id = ? OR is_public = 1
       ORDER BY
         CASE WHEN user_id = ? THEN 0 ELSE 1 END,
         created_at DESC`,
      userId,
      userId
    );
    const existingRecipesByTitle = new Map<string, MealPlanRecipeContext>();
    const rememberExistingRecipe = (recipe: MealPlanRecipeContext) => {
      const normalizedTitle = normalizeMealPlanRecipeTitle(recipe.title);
      if (!existingRecipesByTitle.has(normalizedTitle)) {
        existingRecipesByTitle.set(normalizedTitle, recipe);
      }
    };

    recipes.forEach(recipe => rememberExistingRecipe(recipe));
    existingRows.results.forEach(recipe => {
      rememberExistingRecipe(this.toMealPlanRecipeContext(recipe, recipe.user_id === userId ? 'user' : 'public'));
    });

    const generatedRecipes: MealPlanRecipeContext[] = [];
    let starterOwner: { id: string } | null = null;

    for (const draft of drafts) {
      const normalizedTitle = normalizeMealPlanRecipeTitle(draft.title);
      const existingRecipe = existingRecipesByTitle.get(normalizedTitle);
      if (existingRecipe) {
        generatedRecipes.push(existingRecipe);
        continue;
      }

      if (!starterOwner) {
        starterOwner = await this.getOrCreateMealPlanStarterRecipeOwner(now);
      }

      const recipeId = this.crypto.generateId();
      await this.insertMealPlanGeneratedRecipe(starterOwner.id, recipeId, draft, now);
      const recipeContext: MealPlanRecipeContext = {
        id: recipeId,
        title: draft.title,
        description: draft.description,
        ingredients: draft.ingredients,
        tags: draft.tags,
        prepTime: draft.prepTime,
        cookTime: draft.cookTime,
        servings: draft.servings,
        source: 'public',
      };

      existingRecipesByTitle.set(normalizedTitle, recipeContext);
      generatedRecipes.push(recipeContext);
    }

    return generatedRecipes;
  }

  private async insertMealPlanGeneratedRecipe(
    starterOwnerId: string,
    recipeId: string,
    draft: MealPlanGeneratedRecipeDraft,
    now: number
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recipeId,
      starterOwnerId,
      starterOwnerId,
      draft.title,
      draft.description,
      JSON.stringify(draft.ingredients),
      JSON.stringify(draft.instructions),
      JSON.stringify(draft.tags),
      draft.imageUrl,
      null,
      draft.prepTime,
      draft.cookTime,
      draft.servings,
      1,
      now
    );
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

    const [recipes, publicRecipes] = await Promise.all([
      this.getMealPlanRecipes(user.id),
      this.getMealPlanPublicRecipes(user.id),
    ]);
    const recipeContext = mergeMealPlanRecipeContexts(recipes, publicRecipes);
    const suggestion = buildFallbackMealPlan(request, recipeContext);
    const now = Date.now();
    const generatedRecipes = await this.createMealPlanGeneratedRecipes(user.id, request, suggestion, recipeContext, now);
    const recipesForLinks = mergeMealPlanRecipeContexts(recipeContext, generatedRecipes);
    const details = buildMealPlanSuggestionDetails(request, suggestion, recipesForLinks);
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
        recipeCount: recipesForLinks.length,
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
        source_recipe_id = NULL,
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
    ctx: RequestContext,
    data: RecipeSharePayload
  ): Promise<ApiResult<RecipeShareLinkInfo>> {
    const user = await this.getSessionUser(ctx);
    const rateLimitKey = this.getClientRateLimitKey(ctx, user);
    const maxRequests = user ? AUTHENTICATED_RECIPE_SHARE_LIMIT : PUBLIC_RECIPE_SHARE_LIMIT;
    const isAllowed = await this.checkFixedWindowRateLimit('recipe-share-link', rateLimitKey, maxRequests);
    if (!isAllowed) {
      return { error: 'Too many share links created. Please try again later.', status: 429 };
    }

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

    await this.deleteExpiredRecipeShareLinks(createdAt);

    await this.db.run(
      'INSERT INTO recipe_share_links (id, token, recipe_data, created_at) VALUES (?, ?, ?, ?)',
      id,
      token,
      recipeData,
      createdAt
    );

    return { data: { token, createdAt }, status: 201 };
  }

  async shareRecipeWithUser(
    ctx: RequestContext,
    data: RecipeSharePayload,
    userId: string
  ): Promise<ApiResult<{ success: boolean; sharedWith?: ProfileUserInfo; shareLink?: RecipeShareLinkInfo }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return { error: 'User is required', status: 400 };
    }

    const targetUser = await this.db.get<{ id: string; name: string; avatar_url: string | null }>(
      'SELECT id, name, avatar_url FROM users WHERE id = ?',
      normalizedUserId
    );
    if (!targetUser) {
      return { error: 'User not found', status: 404 };
    }

    if (targetUser.id === user.id) {
      return { error: 'You cannot share a recipe with yourself', status: 400 };
    }

    if (!(await this.areFriends(user.id, targetUser.id))) {
      return { error: 'You can only share recipes with friends', status: 400 };
    }

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
    const notificationId = this.crypto.generateId();
    const createdAt = Date.now();

    const isAllowed = await this.checkFixedWindowRateLimit(
      'recipe-share-link',
      `user:${user.id}`,
      AUTHENTICATED_RECIPE_SHARE_LIMIT
    );
    if (!isAllowed) {
      return { error: 'Too many share links created. Please try again later.', status: 429 };
    }

    await this.deleteExpiredRecipeShareLinks(createdAt);

    await this.db.run(
      'INSERT INTO recipe_share_links (id, token, recipe_data, created_at) VALUES (?, ?, ?, ?)',
      id,
      token,
      recipeData,
      createdAt
    );

    await this.db.run(
      'INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      notificationId,
      targetUser.id,
      'recipe_share',
      'Recipe shared with you',
      `${user.name} shared "${recipe.title}" with you`,
      JSON.stringify({
        shareToken: token,
        recipeTitle: recipe.title,
        sharedBy: user.name,
      }),
      0,
      createdAt
    );

    return {
      data: {
        success: true,
        sharedWith: formatProfileUser(targetUser),
        shareLink: { token, createdAt },
      },
      status: 201,
    };
  }

  async getSharedRecipe(token: string): Promise<ApiResult<{ recipe: RecipeSharePayload }>> {
    const link = await this.db.get<DbRecipeShareLink>(
      'SELECT * FROM recipe_share_links WHERE token = ?',
      token
    );

    if (!link || isShareLinkExpired(link.created_at)) {
      return { error: 'Share link not found or expired', status: 404 };
    }

    return { data: { recipe: JSON.parse(link.recipe_data) }, status: 200 };
  }

  private async saveRecipeSharePayloadForUser(
    userId: string,
    recipe: RecipeSharePayload
  ): Promise<{ recipeId: string; collectionId: string }> {
    const recipeId = this.crypto.generateId();
    const now = Date.now();

    await this.db.run(
      `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recipeId,
      userId,
      userId,
      recipe.title,
      recipe.description || '',
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.instructions),
      JSON.stringify([]),
      recipe.imageUrl || null,
      recipe.sourceUrl || null,
      recipe.prepTime || null,
      recipe.cookTime || null,
      recipe.servings || null,
      0,
      now
    );

    const collectionId = await this.getOrCreateRecipeCollection(userId);
    await this.db.run(
      'INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)',
      collectionId,
      recipeId,
      userId,
      now
    );
    await this.db.run('UPDATE cookbooks SET updated_at = ? WHERE id = ?', now, collectionId);

    return { recipeId, collectionId };
  }

  async acceptRecipeShare(
    ctx: RequestContext,
    token: string
  ): Promise<ApiResult<{ success: boolean; recipeId: string; recipeTitle: string }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const shareToken = token.trim();
    if (!shareToken) {
      return { error: 'Share token is required', status: 400 };
    }

    if (!(await this.getRecipeShareNotification(user.id, shareToken))) {
      return { error: 'Recipe share not found or already responded', status: 404 };
    }

    const link = await this.db.get<DbRecipeShareLink>(
      'SELECT * FROM recipe_share_links WHERE token = ?',
      shareToken
    );
    if (!link || isShareLinkExpired(link.created_at)) {
      return { error: 'Shared recipe not found or expired', status: 404 };
    }

    const recipe = normalizeRecipeSharePayload(JSON.parse(link.recipe_data) as RecipeSharePayload);
    if (!recipe) {
      return { error: 'Shared recipe is invalid', status: 400 };
    }

    const saved = await this.saveRecipeSharePayloadForUser(user.id, recipe);
    await this.deleteRecipeShareNotifications(user.id, shareToken);

    return {
      data: {
        success: true,
        recipeId: saved.recipeId,
        recipeTitle: recipe.title,
      },
      status: 200,
    };
  }

  async declineRecipeShare(
    ctx: RequestContext,
    token: string
  ): Promise<ApiResult<{ success: boolean }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const shareToken = token.trim();
    if (!shareToken) {
      return { error: 'Share token is required', status: 400 };
    }

    if (!(await this.getRecipeShareNotification(user.id, shareToken))) {
      return { error: 'Recipe share not found or already responded', status: 404 };
    }

    await this.deleteRecipeShareNotifications(user.id, shareToken);

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
    data: { name?: string; description?: string; coverImage?: string | null; isPublic?: boolean }
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
        source_cookbook_id = NULL,
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
    const recipe = await this.db.get<{ id: string; title: string }>('SELECT id, title FROM recipes WHERE id = ?', recipeId);
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

    const now = Date.now();

    await this.db.run(
      'INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)',
      cookbookId,
      recipeId,
      user.id,
      now
    );

    await this.db.run('UPDATE cookbooks SET source_cookbook_id = NULL, updated_at = ? WHERE id = ?', now, cookbookId);

    const usersToNotify = new Set<string>();
    if (cookbook.user_id !== user.id) {
      usersToNotify.add(cookbook.user_id);
    }

    const sharedUsers = await this.db.all<{ shared_with_user_id: string }>(
      'SELECT shared_with_user_id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id != ?',
      cookbookId,
      user.id
    );

    sharedUsers.results.forEach(share => usersToNotify.add(share.shared_with_user_id));

    for (const userId of usersToNotify) {
      await this.db.run(
        'INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        this.crypto.generateId(),
        userId,
        'recipe_added',
        'New Recipe Added',
        `${user.name} added "${recipe.title || 'a recipe'}" to "${cookbook.name}"`,
        JSON.stringify({
          cookbookId,
          cookbookName: cookbook.name,
          recipeId,
          addedBy: user.name,
        }),
        0,
        now
      );
    }

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

    await this.db.run('UPDATE cookbooks SET source_cookbook_id = NULL, updated_at = ? WHERE id = ?', Date.now(), cookbookId);

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

    const now = Date.now();
    await this.db.run('DELETE FROM cookbook_share_links WHERE expires_at <= ?', now);

    const links = await this.db.all<{ id: string; token: string; is_active: number; created_at: number; expires_at: number }>(
      'SELECT id, token, is_active, created_at, expires_at FROM cookbook_share_links WHERE cookbook_id = ?',
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
          expiresAt: l.expires_at,
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

    const isAllowed = await this.checkFixedWindowRateLimit(
      'cookbook-share-link',
      `user:${user.id}`,
      COOKBOOK_SHARE_LINK_RATE_LIMIT
    );
    if (!isAllowed) {
      return { error: 'Too many cookbook share links created. Please try again later.', status: 429 };
    }

    const linkId = this.crypto.generateId();
    const token = this.crypto.generateId();
    const createdAt = Date.now();
    const expiresAt = getShareLinkExpiresAt(createdAt);

    await this.db.run('DELETE FROM cookbook_share_links WHERE expires_at <= ?', createdAt);

    await this.db.run(
      'INSERT INTO cookbook_share_links (id, cookbook_id, token, is_active, created_at, expires_at) VALUES (?, ?, ?, 1, ?, ?)',
      linkId,
      cookbookId,
      token,
      createdAt,
      expiresAt
    );

    return {
      data: {
        id: linkId,
        token,
        isActive: true,
        createdAt,
        expiresAt,
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
    const link = await this.db.get<{ cookbook_id: string; is_active: number; created_at: number; expires_at: number }>(
      'SELECT cookbook_id, is_active, created_at, expires_at FROM cookbook_share_links WHERE token = ?',
      token
    );

    if (!link || link.is_active !== 1 || isShareLinkExpired(link.created_at) || link.expires_at <= Date.now()) {
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

    await this.copyCookbookRecipesToUserCollection(user.id, invite.cookbook_id);

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
    options?: { limit?: number; offset?: number; tags?: string[]; query?: string }
  ): Promise<ApiResult<{ recipes: RecipeInfo[]; total: number }>> {
    const user = await this.getSessionUser(ctx);
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const searchQuery = normalizeDiscoverySearchQuery(options?.query);

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

    if (searchQuery) {
      query += ` AND (r.title LIKE ? ESCAPE '\\' OR r.description LIKE ? ESCAPE '\\' OR r.tags LIKE ? ESCAPE '\\')`;
      const pattern = getSqlLikePattern(searchQuery);
      params.push(pattern, pattern, pattern);
    }

    let countQuery = `SELECT COUNT(*) as count FROM recipes r WHERE r.is_public = 1`;
    const countParams: unknown[] = [];
    if (options?.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        countQuery += ` AND r.tags LIKE ?`;
        countParams.push(`%"${tag}"%`);
      }
    }
    if (searchQuery) {
      countQuery += ` AND (r.title LIKE ? ESCAPE '\\' OR r.description LIKE ? ESCAPE '\\' OR r.tags LIKE ? ESCAPE '\\')`;
      const pattern = getSqlLikePattern(searchQuery);
      countParams.push(pattern, pattern, pattern);
    }

    // Get total count
    const countResult = await this.db.get<{ count: number }>(
      countQuery,
      ...countParams
    );

    query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await this.db.all<DbRecipe & { owner_name: string }>(query, ...params);

    const recipes = await Promise.all(result.results.map(async r => {
      const savedCopyId = user
        ? await this.findExistingSavedRecipeId(user.id, r, false)
        : null;
      return formatRecipe(r, user?.id, null, { savedCopyId });
    }));

    return {
      data: {
        recipes,
        total: countResult?.count || 0,
      },
      status: 200,
    };
  }

  async getDiscoverCookbooks(
    ctx: RequestContext,
    options?: { limit?: number; offset?: number; query?: string }
  ): Promise<ApiResult<{ cookbooks: CookbookInfo[]; total: number }>> {
    const user = await this.getSessionUser(ctx);
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const searchQuery = normalizeDiscoverySearchQuery(options?.query);
    const searchPattern = searchQuery ? getSqlLikePattern(searchQuery) : null;

    let whereClause = 'WHERE c.is_public = 1 AND c.is_system = 0';
    const whereParams: unknown[] = [];
    if (searchPattern) {
      whereClause += ` AND (c.name LIKE ? ESCAPE '\\' OR c.description LIKE ? ESCAPE '\\')`;
      whereParams.push(searchPattern, searchPattern);
    }

    const countResult = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM cookbooks c ${whereClause}`,
      ...whereParams
    );

    const result = await this.db.all<DbCookbook & { recipe_count: number; owner_name: string }>(
      `SELECT c.*, COUNT(CASE WHEN r.is_public = 1 THEN cr.recipe_id END) as recipe_count, u.name as owner_name
       FROM cookbooks c
       LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
       LEFT JOIN recipes r ON r.id = cr.recipe_id
       JOIN users u ON c.user_id = u.id
       ${whereClause}
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT ? OFFSET ?`,
      ...whereParams,
      limit,
      offset
    );

    const cookbooks = await Promise.all(result.results.map(async c => {
      const savedCopyId = user
        ? await this.findExistingSavedCookbookId(user.id, c, false, true)
        : null;

      return {
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
        isSaved: Boolean(savedCopyId),
        savedCopyId,
      };
    }));

    return {
      data: {
        cookbooks,
        total: countResult?.count || 0,
      },
      status: 200,
    };
  }

  private async findExistingSavedRecipeId(
    userId: string,
    recipe: DbRecipe,
    includeOriginal = true
  ): Promise<string | null> {
    const candidates = await this.db.all<DbRecipe>(
      `SELECT * FROM recipes
       WHERE user_id = ?
         AND (id = ? OR source_recipe_id = ?)
       ORDER BY
         CASE
           WHEN id = ? THEN 0
           WHEN source_recipe_id = ? THEN 1
           ELSE 2
         END,
         created_at ASC`,
      userId,
      recipe.id,
      recipe.id,
      recipe.id,
      recipe.id
    );

    const existing = candidates.results.find(candidate =>
      isSavedRecipeMatch(candidate, recipe, includeOriginal)
    );

    return existing?.id || null;
  }

  private async findExistingSavedRecipeIds(
    userId: string,
    recipes: DbRecipe[],
    includeOriginal = true
  ): Promise<Map<string, string>> {
    const uniqueRecipes = Array.from(new Map(recipes.map(recipe => [recipe.id, recipe])).values());
    const matches = new Map<string, string>();
    if (uniqueRecipes.length === 0) {
      return matches;
    }

    const sourceIds = uniqueRecipes.map(recipe => recipe.id);
    const candidates: DbRecipe[] = [];
    for (const chunk of chunkBySqlParams(sourceIds, 2, 1)) {
      const placeholders = sqlPlaceholders(chunk.length);
      const result = await this.db.all<DbRecipe>(
        `SELECT * FROM recipes
         WHERE user_id = ?
           AND (id IN (${placeholders}) OR source_recipe_id IN (${placeholders}))
         ORDER BY created_at ASC`,
        userId,
        ...chunk,
        ...chunk
      );
      candidates.push(...result.results);
    }

    for (const source of uniqueRecipes) {
      const sourceCandidates = new Map<string, DbRecipe>();
      for (const candidate of candidates) {
        if (candidate.id === source.id || candidate.source_recipe_id === source.id) {
          sourceCandidates.set(candidate.id, candidate);
        }
      }

      const existing = [...sourceCandidates.values()]
        .sort((a, b) => {
          const rankDiff = savedRecipeCandidateRank(a, source.id) - savedRecipeCandidateRank(b, source.id);
          return rankDiff || a.created_at - b.created_at;
        })
        .find(candidate => isSavedRecipeMatch(candidate, source, includeOriginal));

      if (existing) {
        matches.set(source.id, existing.id);
      }
    }

    return matches;
  }

  private async insertRecipeCopies(
    userId: string,
    recipeCopies: RecipeCopyInsert[],
    now: number
  ): Promise<void> {
    for (const chunk of chunkBySqlParams(recipeCopies, 16)) {
      const params = chunk.flatMap(({ id, source }) => [
        id,
        userId,
        source.owner_id,
        source.title,
        source.description,
        source.ingredients,
        source.instructions,
        source.tags,
        source.image_url,
        source.source_url,
        source.prep_time,
        source.cook_time,
        source.servings,
        source.id,
        0,
        now,
      ]);

      await this.db.run(
        `INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, source_recipe_id, is_public, created_at)
         VALUES ${sqlRows(chunk.length, 16)}`,
        ...params
      );
    }
  }

  private async insertCookbookRecipeLinks(
    links: CookbookRecipeLinkInsert[],
    ignoreDuplicates = false
  ): Promise<void> {
    const insertVerb = ignoreDuplicates ? 'INSERT OR IGNORE' : 'INSERT';
    for (const chunk of chunkBySqlParams(links, 4)) {
      const params = chunk.flatMap(link => [
        link.cookbookId,
        link.recipeId,
        link.userId,
        link.addedAt,
      ]);

      await this.db.run(
        `${insertVerb} INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at)
         VALUES ${sqlRows(chunk.length, 4)}`,
        ...params
      );
    }
  }

  private async copyCookbookRecipesToUserCollection(userId: string, cookbookId: string): Promise<void> {
    const cookbookRecipes = await this.db.all<DbRecipe>(
      `SELECT r.* FROM recipes r
       JOIN cookbook_recipes cr ON r.id = cr.recipe_id
       WHERE cr.cookbook_id = ?`,
      cookbookId
    );

    const now = Date.now();
    const collectionId = await this.getOrCreateRecipeCollection(userId);
    const savedRecipeIdsBySourceId = await this.findExistingSavedRecipeIds(userId, cookbookRecipes.results);
    const recipeCopies: RecipeCopyInsert[] = [];
    const collectionLinks: CookbookRecipeLinkInsert[] = [];

    for (const recipe of cookbookRecipes.results) {
      let savedRecipeId = savedRecipeIdsBySourceId.get(recipe.id);
      if (!savedRecipeId) {
        savedRecipeId = this.crypto.generateId();
        savedRecipeIdsBySourceId.set(recipe.id, savedRecipeId);
        recipeCopies.push({ id: savedRecipeId, source: recipe });
      }

      collectionLinks.push({
        cookbookId: collectionId,
        recipeId: savedRecipeId,
        userId,
        addedAt: now,
      });
    }

    await this.insertRecipeCopies(userId, recipeCopies, now);
    await this.insertCookbookRecipeLinks(collectionLinks, true);
    await this.db.run('UPDATE cookbooks SET updated_at = ? WHERE id = ?', now, collectionId);
  }

  private async getCookbookRecipeRows(cookbookId: string, publicOnly = false): Promise<DbRecipe[]> {
    const recipes = await this.db.all<DbRecipe>(
      `SELECT r.* FROM recipes r
       JOIN cookbook_recipes cr ON r.id = cr.recipe_id
       WHERE cr.cookbook_id = ?${publicOnly ? ' AND r.is_public = 1' : ''}
       ORDER BY cr.added_at ASC, r.id ASC`,
      cookbookId
    );

    return recipes.results;
  }

  private async isUneditedCookbookCopy(
    candidate: DbCookbook,
    source: DbCookbook,
    sourcePublicOnly = false
  ): Promise<boolean> {
    if (candidate.source_cookbook_id !== source.id || !cookbooksHaveSameSavedContent(candidate, source)) {
      return false;
    }

    const sourceRecipes = await this.getCookbookRecipeRows(source.id, sourcePublicOnly);
    const candidateRecipes = await this.getCookbookRecipeRows(candidate.id);
    if (sourceRecipes.length !== candidateRecipes.length) {
      return false;
    }

    const unmatched = [...candidateRecipes];
    for (const sourceRecipe of sourceRecipes) {
      const matchIndex = unmatched.findIndex(candidateRecipe =>
        isSavedRecipeMatch(candidateRecipe, sourceRecipe, true)
      );

      if (matchIndex === -1) {
        return false;
      }

      unmatched.splice(matchIndex, 1);
    }

    return unmatched.length === 0;
  }

  private async findExistingSavedCookbookId(
    userId: string,
    cookbook: DbCookbook,
    includeOriginal = true,
    sourcePublicOnly = false
  ): Promise<string | null> {
    const candidates = await this.db.all<DbCookbook>(
      `SELECT * FROM cookbooks
       WHERE user_id = ?
         AND is_system = 0
         AND (id = ? OR source_cookbook_id = ?)
       ORDER BY
         CASE
           WHEN id = ? THEN 0
           WHEN source_cookbook_id = ? THEN 1
           ELSE 2
         END,
         created_at ASC`,
      userId,
      cookbook.id,
      cookbook.id,
      cookbook.id,
      cookbook.id
    );

    for (const candidate of candidates.results) {
      if (includeOriginal && candidate.id === cookbook.id) {
        return candidate.id;
      }

      if (await this.isUneditedCookbookCopy(candidate, cookbook, sourcePublicOnly)) {
        return candidate.id;
      }
    }

    return null;
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

    const existingCookbookId = await this.findExistingSavedCookbookId(user.id, cookbook, true, true);
    if (existingCookbookId) {
      return { data: { id: existingCookbookId }, status: 200 };
    }

    // Get public recipes in the cookbook
    const cookbookRecipes = await this.db.all<DbRecipe>(
      `SELECT r.* FROM recipes r
       JOIN cookbook_recipes cr ON r.id = cr.recipe_id
       WHERE cr.cookbook_id = ? AND r.is_public = 1`,
      cookbookId
    );

    const now = Date.now();
    const newCookbookId = this.crypto.generateId();

    // Create a copy of the cookbook
    await this.db.run(
      `INSERT INTO cookbooks (id, user_id, name, description, cover_image, source_cookbook_id, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newCookbookId,
      user.id,
      cookbook.name,
      cookbook.description,
      cookbook.cover_image,
      cookbook.id,
      0, // private
      now,
      now
    );

    // Get user's recipe collection for adding recipes there too
    const collectionId = await this.getOrCreateRecipeCollection(user.id);
    const savedRecipeIdsBySourceId = await this.findExistingSavedRecipeIds(user.id, cookbookRecipes.results);
    const recipeCopies: RecipeCopyInsert[] = [];
    const cookbookLinks: CookbookRecipeLinkInsert[] = [];
    const collectionLinks: CookbookRecipeLinkInsert[] = [];

    // Copy each recipe and add to both the new cookbook and user's collection
    for (const recipe of cookbookRecipes.results) {
      let savedRecipeId = savedRecipeIdsBySourceId.get(recipe.id);
      if (!savedRecipeId) {
        savedRecipeId = this.crypto.generateId();
        savedRecipeIdsBySourceId.set(recipe.id, savedRecipeId);
        recipeCopies.push({ id: savedRecipeId, source: recipe });
      }

      cookbookLinks.push({
        cookbookId: newCookbookId,
        recipeId: savedRecipeId,
        userId: user.id,
        addedAt: now,
      });
      collectionLinks.push({
        cookbookId: collectionId,
        recipeId: savedRecipeId,
        userId: user.id,
        addedAt: now,
      });
    }

    await this.insertRecipeCopies(user.id, recipeCopies, now);
    await this.insertCookbookRecipeLinks(cookbookLinks);
    await this.insertCookbookRecipeLinks(collectionLinks, true);

    return { data: { id: newCookbookId }, status: 201 };
  }

  async unsaveRecipe(
    ctx: RequestContext,
    recipeId: string
  ): Promise<ApiResult<{ success: boolean; id?: string | null }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const recipe = await this.db.get<DbRecipe>(
      'SELECT * FROM recipes WHERE id = ? AND is_public = 1',
      recipeId
    );

    if (!recipe) {
      return { error: 'Recipe not found or not public', status: 404 };
    }

    const savedCopyId = await this.findExistingSavedRecipeId(user.id, recipe, false);
    if (!savedCopyId) {
      return { data: { success: true, id: null }, status: 200 };
    }

    await this.db.run('DELETE FROM cookbook_recipes WHERE recipe_id = ?', savedCopyId);
    await this.db.run('DELETE FROM recipes WHERE id = ? AND user_id = ?', savedCopyId, user.id);

    return { data: { success: true, id: savedCopyId }, status: 200 };
  }

  async unsaveCookbook(
    ctx: RequestContext,
    cookbookId: string
  ): Promise<ApiResult<{ success: boolean; id?: string | null }>> {
    const user = await this.getSessionUser(ctx);
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const cookbook = await this.db.get<DbCookbook>(
      'SELECT * FROM cookbooks WHERE id = ? AND is_public = 1 AND is_system = 0',
      cookbookId
    );

    if (!cookbook) {
      return { error: 'Cookbook not found or not public', status: 404 };
    }

    const savedCopyId = await this.findExistingSavedCookbookId(user.id, cookbook, false, true);
    if (!savedCopyId) {
      return { data: { success: true, id: null }, status: 200 };
    }

    await this.db.run('DELETE FROM cookbook_recipes WHERE cookbook_id = ?', savedCopyId);
    await this.db.run('DELETE FROM cookbook_shares WHERE cookbook_id = ?', savedCopyId);
    await this.db.run('DELETE FROM cookbook_share_links WHERE cookbook_id = ?', savedCopyId);
    await this.db.run('DELETE FROM cookbooks WHERE id = ? AND user_id = ?', savedCopyId, user.id);

    return { data: { success: true, id: savedCopyId }, status: 200 };
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
       WHERE cr.cookbook_id = ? AND r.is_public = 1
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
