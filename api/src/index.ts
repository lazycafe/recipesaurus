import {
  MEAL_PLAN_MAX_RECIPES,
  MEAL_PLAN_FREE_WEEKLY_LIMIT,
  MEAL_PLAN_PAID_PLAN_NAME,
  MEAL_PLAN_PAID_PRICE_CENTS,
  MEAL_PLAN_PAID_WEEKLY_LIMIT,
  MEAL_PLAN_WEEK_MS,
  type MealPlanRecipeContext,
  type MealPlanUsageInfo,
  buildFallbackMealPlan,
  buildMealPlanHistoryItem,
  buildMealPlannerContinuationInput,
  buildMealPlanSuggestionDetails,
  buildMealPlannerInput,
  buildMealPlannerInstructions,
  extractOpenAIResponseText,
  getOpenAIResponseId,
  MEAL_PLAN_BILLING_CANCEL_FAILED_CODE,
  MEAL_PLAN_BILLING_CHECKOUT_FAILED_CODE,
  MEAL_PLAN_BILLING_CUSTOMER_NOT_FOUND_CODE,
  MEAL_PLAN_BILLING_NOT_CONFIGURED_CODE,
  MEAL_PLAN_BILLING_PORTAL_FAILED_CODE,
  MEAL_PLAN_BILLING_RESTORE_FAILED_CODE,
  MEAL_PLAN_BILLING_STRIPE_URL_MISSING_CODE,
  MEAL_PLAN_BILLING_SUBSCRIPTION_NOT_FOUND_CODE,
  MEAL_PLAN_GENERATION_FAILED_CODE,
  MEAL_PLAN_HISTORY_LIMIT,
  MEAL_PLAN_INVALID_REQUEST_CODE,
  MEAL_PLAN_LIMIT_CODE,
  MEAL_PLAN_OPENAI_CONTINUATION_MAX_OUTPUT_TOKENS,
  MEAL_PLAN_OPENAI_EMPTY_RESPONSE_CODE,
  MEAL_PLAN_OPENAI_MAX_CONTINUATIONS,
  MEAL_PLAN_OPENAI_MAX_OUTPUT_TOKENS,
  MEAL_PLAN_OPENAI_NETWORK_ERROR_CODE,
  MEAL_PLAN_OPENAI_NOT_CONFIGURED_CODE,
  MEAL_PLAN_UNAUTHORIZED_CODE,
  getMealPlanOpenAIErrorResponseCode,
  normalizeMealPlanRequest,
  shouldContinueOpenAIResponse,
} from './core/mealPlanner';
import { getDefaultRecipesaurusErrorCode } from './core/apiErrors';

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  APP_URL: string;
  RESEND_API_KEY: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  DISCORD_SIGNUP_WEBHOOK_URL?: string;
  DISCORD_FEEDBACK_WEBHOOK_URL?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  password_hash: string;
  password_salt: string;
  email_verified: number;
  created_at: number;
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

interface Session {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}

interface Recipe {
  id: string;
  user_id: string;
  owner_id: string;
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  tags: string;
  image_url: string | null;
  source_url: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: string | null;
  source_recipe_id?: string | null;
  is_public: number;
  created_at: number;
}

interface Cookbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_system: number;
  system_type: string | null;
  source_cookbook_id?: string | null;
  is_public: number;
  created_at: number;
  updated_at: number;
}

interface CookbookShare {
  id: string;
  cookbook_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  created_at: number;
}

interface CookbookShareLink {
  id: string;
  cookbook_id: string;
  token: string;
  is_active: number;
  created_at: number;
}

interface RecipeSharePayload {
  title: string;
  description?: string | null;
  ingredients: string[];
  instructions: string[];
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
}

interface RecipeShareLink {
  id: string;
  token: string;
  recipe_data: string;
  created_at: number;
}

interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  used: number;
  created_at: number;
}

interface UserSubscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: number;
  created_at: number;
  updated_at: number;
}

interface ProfileBadge {
  user_id: string;
  badge: string;
  granted_at: number;
}

interface AiMealPlanRequest {
  id: string;
  user_id: string;
  prompt: string;
  response: string;
  created_at: number;
}

interface StripeCheckoutSession {
  id: string;
  url?: string | null;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  client_reference_id?: string | null;
  customer_email?: string | null;
  metadata?: Record<string, string> | null;
}

interface StripeSubscription {
  id: string;
  customer?: string | { id?: string } | null;
  status?: string;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string> | null;
}

interface StripeEvent {
  id: string;
  type: string;
  data?: {
    object?: unknown;
  };
}

class MealPlanGenerationError extends Error {
  constructor(message: string, readonly responseCode?: string) {
    super(message);
    this.name = 'MealPlanGenerationError';
  }
}

// Password reset config
const RESET_TOKEN_DURATION = 60 * 60 * 1000; // 1 hour

// Crypto utilities
const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Rate limiting
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_RECIPE_SHARE_BYTES = 512 * 1024;
const MAX_RECIPE_SHARE_ITEMS = 250;

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

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

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

const RECIPE_DEDUPE_SEPARATOR = '\u001f';

function normalizeRecipeField(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function recipeRowDedupeKey(recipe: Recipe): string {
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

function shouldPreferRecipeRow(current: Recipe, candidate: Recipe, currentUserId: string): boolean {
  const currentIsOwner = current.owner_id === currentUserId;
  const candidateIsOwner = candidate.owner_id === currentUserId;

  if (candidateIsOwner !== currentIsOwner) {
    return candidateIsOwner;
  }

  return candidate.created_at > current.created_at;
}

function dedupeRecipeRows<T extends Recipe>(recipes: T[], currentUserId: string): T[] {
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

function isPaidMealPlanSubscription(subscription: UserSubscription | null): boolean {
  return subscription?.status === 'active' || subscription?.status === 'trialing';
}

function getMealPlanLimitForSubscription(subscription: UserSubscription | null): number {
  return isPaidMealPlanSubscription(subscription)
    ? MEAL_PLAN_PAID_WEEKLY_LIMIT
    : MEAL_PLAN_FREE_WEEKLY_LIMIT;
}

function getAppBaseUrl(env: Env): string {
  return (env.APP_URL || 'https://recipesaurus.ai').replace(/\/+$/, '');
}

function getStripeId(value: string | { id?: string } | null | undefined): string | null {
  if (typeof value === 'string') return value;
  return typeof value?.id === 'string' ? value.id : null;
}

async function stripePost<T>(env: Env, path: string, params: URLSearchParams): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured');
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe request failed with status ${response.status}`);
  }

  return data;
}

async function stripeGet<T>(env: Env, path: string): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured');
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
    },
  });

  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe request failed with status ${response.status}`);
  }

  return data;
}

function parseStripeSignatureHeader(header: string | null): { timestamp: number; signatures: string[] } | null {
  if (!header) return null;

  const parts = header.split(',').map(part => part.trim());
  const timestampPart = parts.find(part => part.startsWith('t='));
  const timestamp = Number(timestampPart?.slice(2));
  const signatures = parts
    .filter(part => part.startsWith('v1='))
    .map(part => part.slice(3))
    .filter(Boolean);

  return Number.isFinite(timestamp) && signatures.length > 0
    ? { timestamp, signatures }
    : null;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  webhookSecret: string,
  toleranceSeconds = 300
): Promise<boolean> {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = arrayBufferToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload)));

  return parsed.signatures.some(signature => constantTimeEqual(expected, signature));
}

async function getUserSubscription(db: D1Database, userId: string): Promise<UserSubscription | null> {
  return db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ?')
    .bind(userId)
    .first<UserSubscription>();
}

async function upsertUserSubscription(
  db: D1Database,
  userId: string,
  data: {
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    status: string;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
  }
): Promise<void> {
  const now = Date.now();
  await db.prepare(`
    INSERT INTO user_subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      status,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      stripe_customer_id = COALESCE(excluded.stripe_customer_id, user_subscriptions.stripe_customer_id),
      stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, user_subscriptions.stripe_subscription_id),
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      updated_at = excluded.updated_at
  `).bind(
    userId,
    data.stripeCustomerId,
    data.stripeSubscriptionId,
    data.status,
    data.currentPeriodEnd,
    data.cancelAtPeriodEnd ? 1 : 0,
    now,
    now
  ).run();
}

async function findSubscriptionUserId(db: D1Database, subscription: StripeSubscription): Promise<string | null> {
  if (subscription.metadata?.userId) {
    return subscription.metadata.userId;
  }

  const bySubscription = await db.prepare(
    'SELECT user_id FROM user_subscriptions WHERE stripe_subscription_id = ?'
  ).bind(subscription.id).first<{ user_id: string }>();
  if (bySubscription?.user_id) {
    return bySubscription.user_id;
  }

  const customerId = getStripeId(subscription.customer);
  if (!customerId) return null;

  const byCustomer = await db.prepare(
    'SELECT user_id FROM user_subscriptions WHERE stripe_customer_id = ?'
  ).bind(customerId).first<{ user_id: string }>();

  return byCustomer?.user_id || null;
}

async function recordStripeSubscription(
  db: D1Database,
  userId: string,
  subscription: StripeSubscription
): Promise<void> {
  await upsertUserSubscription(db, userId, {
    stripeCustomerId: getStripeId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    status: subscription.status || 'unknown',
    currentPeriodEnd: subscription.current_period_end ? subscription.current_period_end * 1000 : null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  });
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH
  );
}

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = generateSalt();
  const derivedKey = await deriveKey(password, salt);
  return {
    hash: arrayBufferToBase64(derivedKey),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
  };
}

async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const salt = new Uint8Array(base64ToArrayBuffer(storedSalt));
  const derivedKey = await deriveKey(password, salt);
  return arrayBufferToBase64(derivedKey) === storedHash;
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

// Rate limiting
async function checkRateLimit(db: D1Database, email: string, ip: string | null): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const windowStart = Date.now() - ATTEMPT_WINDOW;

  // Count recent failed attempts for this email
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM login_attempts
    WHERE email = ? AND attempted_at > ? AND success = 0
  `).bind(email.toLowerCase(), windowStart).first<{ count: number }>();

  const failedAttempts = result?.count || 0;
  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts);

  return {
    allowed: failedAttempts < MAX_LOGIN_ATTEMPTS,
    remainingAttempts,
  };
}

async function recordLoginAttempt(db: D1Database, email: string, ip: string | null, success: boolean): Promise<void> {
  const id = generateId();
  await db.prepare(`
    INSERT INTO login_attempts (id, email, ip_address, attempted_at, success)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, email.toLowerCase(), ip, Date.now(), success ? 1 : 0).run();

  // Clean up old attempts (older than 24 hours)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  await db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').bind(oneDayAgo).run();
}

// Response helpers
function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function errorResponse(message: string, status = 400, origin?: string | null, code?: string): Response {
  return jsonResponse(
    { error: message, code: code || getDefaultRecipesaurusErrorCode(status) },
    status,
    corsHeaders(origin ?? null)
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Unknown error';
}

function setCookie(name: string, value: string, maxAge: number, isSecure: boolean): string {
  const secureFlags = isSecure ? 'Secure; SameSite=None' : 'SameSite=Lax';
  return `${name}=${value}; Path=/; HttpOnly; ${secureFlags}; Max-Age=${maxAge}`;
}

function clearCookie(name: string, isSecure: boolean): string {
  const secureFlags = isSecure ? 'Secure; SameSite=None' : 'SameSite=Lax';
  return `${name}=; Path=/; HttpOnly; ${secureFlags}; Max-Age=0`;
}

function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('Cookie');
  if (!cookies) return null;
  const match = cookies.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

// CORS headers
function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    'https://recipesaurus.pages.dev',
    'https://recipesaurus-git-main.pages.dev',
    'https://recipesaurus.ai',
    'https://www.recipesaurus.ai',
  ];

  // Allow any localhost port for development, or *.pages.dev for Cloudflare Pages previews
  const isAllowed = origin && (
    origin.startsWith('http://localhost:') ||
    allowedOrigins.includes(origin) ||
    origin.endsWith('.pages.dev')
  );

  const allowOrigin = isAllowed ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin!,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Auth middleware
async function getSessionUser(request: Request, db: D1Database): Promise<User | null> {
  // Check Authorization header first (for cross-origin requests where cookies are blocked)
  const authHeader = request.headers.get('Authorization');
  let sessionId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Fall back to cookie
  if (!sessionId) {
    sessionId = getCookie(request, 'session');
  }

  if (!sessionId) return null;

  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > ?'
  ).bind(sessionId, Date.now()).first<Session>();

  if (!session) return null;

  return db.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first<User>();
}

function formatUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url || null,
  };
}

function formatProfileUser(user: { id: string; name: string; avatar_url?: string | null }) {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatar_url || null,
  };
}

const PROFILE_BADGE_LABELS: Record<string, string> = {
  early_adopter: 'Early Adopter',
  top_contributor: 'Top Contributor',
};

function formatProfileBadge(badge: Pick<ProfileBadge, 'badge' | 'granted_at'>) {
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

async function getFriendCount(db: D1Database, userId: string): Promise<number> {
  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM friendships WHERE user_a_id = ? OR user_b_id = ?'
  ).bind(userId, userId).first<{ count: number }>();
  return result?.count || 0;
}

async function areFriends(db: D1Database, userId: string, friendId: string): Promise<boolean> {
  if (userId === friendId) return false;
  const { userAId, userBId } = orderedFriendPair(userId, friendId);
  const friendship = await db.prepare(
    'SELECT created_at FROM friendships WHERE user_a_id = ? AND user_b_id = ?'
  ).bind(userAId, userBId).first<{ created_at: number }>();
  return !!friendship;
}

function parseFriendRequestNotificationData(data: string | null): FriendRequestNotificationData | null {
  if (!data) return null;

  try {
    const parsed = JSON.parse(data) as FriendRequestNotificationData;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getFriendRequestNotificationData(
  db: D1Database,
  userId: string,
  friendRequestId: string
): Promise<FriendRequestNotificationData | null> {
  const notifications = await db.prepare(
    "SELECT data FROM notifications WHERE user_id = ? AND type = 'friend_request' ORDER BY created_at DESC"
  ).bind(userId).all<{ data: string | null }>();

  for (const notification of notifications.results) {
    const notificationData = parseFriendRequestNotificationData(notification.data);
    if (notificationData?.friendRequestId === friendRequestId) {
      return notificationData;
    }
  }

  return null;
}

async function findFriendRequestForUser(
  db: D1Database,
  user: User,
  friendRequestId: string
): Promise<{ request: FriendRequestRecord | null; notificationData: FriendRequestNotificationData | null }> {
  const request = await db.prepare(`
    SELECT fr.*, u.name as requester_name, u.avatar_url as requester_avatar_url
    FROM friend_requests fr
    JOIN users u ON u.id = fr.requester_id
    WHERE fr.id = ? AND fr.requested_user_id = ?
  `).bind(friendRequestId, user.id).first<FriendRequestRecord>();

  if (request) {
    return { request, notificationData: null };
  }

  const notificationData = await getFriendRequestNotificationData(db, user.id, friendRequestId);
  if (!notificationData?.requesterId) {
    return { request: null, notificationData };
  }

  const fallbackRequest = await db.prepare(`
    SELECT fr.*, u.name as requester_name, u.avatar_url as requester_avatar_url
    FROM friend_requests fr
    JOIN users u ON u.id = fr.requester_id
    WHERE fr.requester_id = ? AND fr.requested_user_id = ?
    ORDER BY CASE fr.status WHEN 'pending' THEN 0 ELSE 1 END, fr.created_at DESC
    LIMIT 1
  `).bind(notificationData.requesterId, user.id).first<FriendRequestRecord>();

  return { request: fallbackRequest ?? null, notificationData };
}

async function deleteFriendRequestNotifications(
  db: D1Database,
  userId: string,
  friendRequestIds: Array<string | undefined | null>
): Promise<void> {
  const uniqueIds = Array.from(new Set(friendRequestIds.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) {
    return;
  }

  const requestIdSet = new Set(uniqueIds);
  const notifications = await db.prepare(
    "SELECT id, data FROM notifications WHERE user_id = ? AND type = 'friend_request'"
  ).bind(userId).all<{ id: string; data: string | null }>();

  const notificationIds = notifications.results
    .filter(notification => {
      const notificationData = parseFriendRequestNotificationData(notification.data);
      return notificationData?.friendRequestId ? requestIdSet.has(notificationData.friendRequestId) : false;
    })
    .map(notification => notification.id);

  for (const id of notificationIds) {
    await db.prepare(
      "DELETE FROM notifications WHERE id = ? AND user_id = ? AND type = 'friend_request'"
    ).bind(id, userId).run();
  }
}

function parseRecipeShareNotificationData(data: string | null): RecipeShareNotificationData | null {
  if (!data) return null;

  try {
    const parsed = JSON.parse(data) as RecipeShareNotificationData;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getRecipeShareNotification(
  db: D1Database,
  userId: string,
  shareToken: string
): Promise<{ id: string; data: RecipeShareNotificationData } | null> {
  const notifications = await db.prepare(
    "SELECT id, data FROM notifications WHERE user_id = ? AND type = 'recipe_share' ORDER BY created_at DESC"
  ).bind(userId).all<{ id: string; data: string | null }>();

  for (const notification of notifications.results) {
    const notificationData = parseRecipeShareNotificationData(notification.data);
    if (notificationData?.shareToken === shareToken) {
      return { id: notification.id, data: notificationData };
    }
  }

  return null;
}

async function deleteRecipeShareNotifications(
  db: D1Database,
  userId: string,
  shareToken: string
): Promise<void> {
  const notifications = await db.prepare(
    "SELECT id, data FROM notifications WHERE user_id = ? AND type = 'recipe_share'"
  ).bind(userId).all<{ id: string; data: string | null }>();

  const notificationIds = notifications.results
    .filter(notification => parseRecipeShareNotificationData(notification.data)?.shareToken === shareToken)
    .map(notification => notification.id);

  for (const id of notificationIds) {
    await db.prepare(
      "DELETE FROM notifications WHERE id = ? AND user_id = ? AND type = 'recipe_share'"
    ).bind(id, userId).run();
  }
}

async function createFriendRequestAcceptedNotification(
  db: D1Database,
  acceptedBy: User,
  requesterId: string,
  now: number
): Promise<void> {
  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    generateId(),
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
  ).run();
}

async function postDiscordWebhook(webhookUrl: string | undefined, payload: unknown): Promise<boolean> {
  if (!webhookUrl) {
    console.warn('Discord webhook URL is not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

async function notifyDiscordNewUser(webhookUrl: string | undefined, name: string, email: string): Promise<void> {
  await postDiscordWebhook(webhookUrl, {
    content: `New user signed up: **${name}** (${email})`,
  });
}

async function handleFeedback(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as {
    type?: 'bug' | 'feature' | 'general';
    message?: string;
    email?: string;
  };

  const message = body.message?.trim();
  const email = body.email?.trim();
  const feedbackType = body.type === 'bug' || body.type === 'feature' ? body.type : 'general';

  if (!message) {
    return errorResponse('Feedback message is required', 400, origin);
  }

  if (message.length > 4000) {
    return errorResponse('Feedback message is too long', 400, origin);
  }

  if (email && email.length > 254) {
    return errorResponse('Email is too long', 400, origin);
  }

  const typeName = feedbackType === 'bug' ? 'Bug' : feedbackType === 'feature' ? 'Feature' : 'Feedback';
  const typeLabel = feedbackType === 'bug' ? 'Bug Report' : feedbackType === 'feature' ? 'Feature Request' : 'General Feedback';
  const delivered = await postDiscordWebhook(env.DISCORD_FEEDBACK_WEBHOOK_URL, {
    embeds: [{
      title: `${typeName}: ${typeLabel}`,
      description: message,
      color: feedbackType === 'bug' ? 0xc45a5a : feedbackType === 'feature' ? 0x7a9e7e : 0xc9a962,
      fields: email ? [{ name: 'Contact Email', value: email.slice(0, 254) }] : [],
      timestamp: new Date().toISOString(),
    }],
  });

  return jsonResponse({ success: true, delivered }, 200, corsHeaders(origin));
}

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

async function createVerificationToken(db: D1Database, userId: string): Promise<string> {
  // Delete any existing tokens for this user
  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(userId).run();

  const token = generateId() + generateId(); // Longer token for security
  const now = Date.now();
  const result = await db.prepare(
    'INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(generateId(), userId, token, now + VERIFICATION_TOKEN_EXPIRY, now).run();

  console.log('Created verification token for user:', userId, 'Token:', token.substring(0, 10) + '...', 'Insert success:', result.success);

  return token;
}

async function sendVerificationEmail(
  apiKey: string,
  email: string,
  name: string,
  token: string,
  appUrl: string
): Promise<boolean> {
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  console.log('Sending verification email to:', email, 'verifyUrl:', verifyUrl);
  console.log('API key present:', !!apiKey, 'API key length:', apiKey?.length || 0);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Recipesaurus <noreply@recipesaurus.ai>',
        to: [email],
        subject: 'Verify your email for Recipesaurus',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; text-align: center;">
            <h1 style="color: #7a9e7e; margin-bottom: 8px; font-size: 28px;">Welcome, ${name}!</h1>
            <p style="font-size: 16px; color: #666; margin-bottom: 32px;">Verify your email to start saving recipes.</p>
            <div style="margin: 32px 0;">
              <a href="${verifyUrl}" style="background-color: #7a9e7e; color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Verify Email</a>
            </div>
            <p style="font-size: 13px; color: #999; margin-top: 32px;">Link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #bbb;">Didn't sign up? Ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', response.status, errorText);
    } else {
      console.log('Verification email sent successfully to:', email);
    }

    return response.ok;
  } catch (err) {
    console.error('Failed to send verification email:', err);
    return false;
  }
}

// Route handlers
async function handleRegister(request: Request, db: D1Database, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as { email: string; name: string; password: string };
  const { email, name, password } = body;

  if (!email || !name || !password) {
    return errorResponse('Email, name, and password are required', 400, origin);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return errorResponse(passwordValidation.error!, 400, origin);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user exists
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
  if (existing) {
    return errorResponse('An account with this email already exists', 400, origin);
  }

  // Hash password
  const { hash, salt } = await hashPassword(password);

  // In dev mode, auto-verify users
  const isDev = env.ENVIRONMENT === 'development';
  const emailVerified = isDev ? 1 : 0;

  // Create user
  const userId = generateId();
  await db.prepare(
    'INSERT INTO users (id, email, name, password_hash, password_salt, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, normalizedEmail, name.trim(), hash, salt, emailVerified, Date.now()).run();

  // Create default "My Recipes" cookbook for new user
  await getOrCreateRecipeCollection(db, userId);

  // Add sample recipes for new user (adds to default cookbook)
  await addSampleRecipes(db, userId);

  // In dev mode, create session and return token directly
  if (isDev) {
    const sessionId = generateId();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await db.prepare(
      'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(sessionId, userId, Date.now(), expiresAt).run();

    return jsonResponse(
      {
        user: { id: userId, email: normalizedEmail, name: name.trim(), avatarUrl: null },
        token: sessionId,
      },
      200,
      corsHeaders(origin)
    );
  }

  // Production: Create verification token and send email
  const verificationToken = await createVerificationToken(db, userId);
  await sendVerificationEmail(env.RESEND_API_KEY, normalizedEmail, name.trim(), verificationToken, env.APP_URL);

  // Notify Discord of new signup (runs in background after response)
  ctx.waitUntil(notifyDiscordNewUser(env.DISCORD_SIGNUP_WEBHOOK_URL, name.trim(), normalizedEmail));

  return jsonResponse(
    {
      requiresVerification: true,
      email: normalizedEmail,
      message: 'Please check your email to verify your account'
    },
    200,
    corsHeaders(origin)
  );
}

async function handleLogin(request: Request, db: D1Database, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as { email: string; password: string };
  const { email, password } = body;

  if (!email || !password) {
    return errorResponse('Email and password are required', 400, origin);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const ip = request.headers.get('CF-Connecting-IP');

  // Check rate limit
  const rateLimit = await checkRateLimit(db, normalizedEmail, ip);
  if (!rateLimit.allowed) {
    return errorResponse('Too many failed login attempts. Please try again in 15 minutes.', 429, origin);
  }

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(normalizedEmail).first<User>();
  if (!user) {
    // Record failed attempt (even for non-existent users to prevent enumeration)
    await recordLoginAttempt(db, normalizedEmail, ip, false);
    return errorResponse('Invalid email or password', 401, origin);
  }

  const isValid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!isValid) {
    await recordLoginAttempt(db, normalizedEmail, ip, false);
    const remaining = rateLimit.remainingAttempts - 1;
    if (remaining <= 2 && remaining > 0) {
      return errorResponse(`Invalid email or password. ${remaining} attempts remaining.`, 401, origin);
    }
    return errorResponse('Invalid email or password', 401, origin);
  }

  // Check if email is verified (skip in dev mode)
  const isDev = env.ENVIRONMENT === 'development';
  if (!isDev && !user.email_verified) {
    return jsonResponse(
      {
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email before logging in'
      },
      200,
      corsHeaders(origin)
    );
  }

  // Record successful attempt
  await recordLoginAttempt(db, normalizedEmail, ip, true);

  // Create session
  const sessionId = generateId();
  const expiresAt = Date.now() + SESSION_DURATION;
  await db.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, user.id, Date.now(), expiresAt).run();

  const isSecure = !origin?.includes('localhost');
  return jsonResponse(
    { user: formatUser(user), token: sessionId },
    200,
    {
      ...corsHeaders(origin),
      'Set-Cookie': setCookie('session', sessionId, SESSION_DURATION / 1000, isSecure),
    }
  );
}

async function handleLogout(request: Request, db: D1Database): Promise<Response> {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  let sessionId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!sessionId) {
    sessionId = getCookie(request, 'session');
  }
  if (sessionId) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }

  const origin = request.headers.get('Origin');
  const isSecure = !origin?.includes('localhost');
  return jsonResponse(
    { success: true },
    200,
    {
      ...corsHeaders(origin),
      'Set-Cookie': clearCookie('session', isSecure),
    }
  );
}

async function handleVerifyEmail(request: Request, db: D1Database): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as { token: string };
  const { token } = body;

  if (!token) {
    return errorResponse('Verification token is required', 400, origin);
  }

  // Find the token
  const verificationRecord = await db.prepare(
    'SELECT * FROM email_verification_tokens WHERE token = ?'
  ).bind(token).first<{ id: string; user_id: string; token: string; expires_at: number }>();

  if (!verificationRecord) {
    // Debug: check if any tokens exist
    const tokenCount = await db.prepare('SELECT COUNT(*) as count FROM email_verification_tokens').first<{ count: number }>();
    console.log('Token lookup failed. Token received:', token.substring(0, 10) + '...', 'Total tokens in DB:', tokenCount?.count);
    return errorResponse('Invalid or expired verification link', 400, origin);
  }

  // Check if token has expired
  if (Date.now() > verificationRecord.expires_at) {
    await db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').bind(verificationRecord.id).run();
    return errorResponse('Verification link has expired. Please request a new one.', 400, origin);
  }

  // Mark user as verified
  await db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(verificationRecord.user_id).run();

  // Delete the token
  await db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').bind(verificationRecord.id).run();

  // Get user and create session
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(verificationRecord.user_id).first<User>();
  if (!user) {
    return errorResponse('User not found', 404, origin);
  }

  const sessionId = generateId();
  const expiresAt = Date.now() + SESSION_DURATION;
  await db.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, user.id, Date.now(), expiresAt).run();

  const isSecure = !origin?.includes('localhost');
  return jsonResponse(
    { user: formatUser(user), token: sessionId, verified: true },
    200,
    {
      ...corsHeaders(origin),
      'Set-Cookie': setCookie('session', sessionId, SESSION_DURATION / 1000, isSecure),
    }
  );
}

async function handleResendVerification(request: Request, db: D1Database, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as { email: string };
  const { email } = body;

  if (!email) {
    return errorResponse('Email is required', 400, origin);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(normalizedEmail).first<User>();

  // Always return success to prevent email enumeration
  if (!user || user.email_verified) {
    return jsonResponse({ success: true, message: 'If your email is registered and unverified, you will receive a verification email.' }, 200, corsHeaders(origin));
  }

  // Create new verification token and send email
  const verificationToken = await createVerificationToken(db, user.id);
  await sendVerificationEmail(env.RESEND_API_KEY, user.email, user.name, verificationToken, env.APP_URL);

  return jsonResponse({ success: true, message: 'Verification email sent' }, 200, corsHeaders(origin));
}

async function handleGetSession(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return jsonResponse({ user: null }, 200, corsHeaders(origin));
  }

  return jsonResponse(
    { user: formatUser(user) },
    200,
    corsHeaders(origin)
  );
}

async function handleUpdateProfile(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const body = await request.json() as { name?: string; avatarUrl?: string | null };
  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasAvatar = Object.prototype.hasOwnProperty.call(body, 'avatarUrl');

  const nextName = hasName ? normalizeDisplayName(body.name) : user.name;
  if (hasName && !nextName) {
    return errorResponse('Display name must be between 1 and 80 characters', 400, origin);
  }

  let nextAvatarUrl = user.avatar_url;
  if (hasAvatar) {
    nextAvatarUrl = normalizeAvatarUrl(body.avatarUrl);
    if (typeof body.avatarUrl === 'string' && body.avatarUrl.trim() && !nextAvatarUrl) {
      return errorResponse('Profile picture must be a PNG, JPG, WebP, or GIF under 1MB, or a valid http(s) URL', 400, origin);
    }
  }

  await db.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?')
    .bind(nextName, nextAvatarUrl, user.id)
    .run();

  return jsonResponse(
    {
      user: {
        id: user.id,
        email: user.email,
        name: nextName,
        avatarUrl: nextAvatarUrl,
      },
    },
    200,
    corsHeaders(origin)
  );
}

async function handleGetProfile(request: Request, db: D1Database, userId: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const currentUser = await getSessionUser(request, db);
  const profileUser = await db.prepare('SELECT id, name, avatar_url FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; name: string; avatar_url: string | null }>();

  if (!profileUser) {
    return errorResponse('Profile not found', 404, origin);
  }

  const isCurrentUser = currentUser?.id === profileUser.id;
  const isFriend = currentUser ? await areFriends(db, currentUser.id, profileUser.id) : false;
  const outgoingFriendRequest = currentUser && !isCurrentUser && !isFriend
    ? await db.prepare(
        "SELECT id FROM friend_requests WHERE requester_id = ? AND requested_user_id = ? AND status = 'pending'"
      ).bind(currentUser.id, profileUser.id).first<{ id: string }>()
    : null;
  const incomingFriendRequest = currentUser && !isCurrentUser && !isFriend
    ? await db.prepare(
        "SELECT id FROM friend_requests WHERE requester_id = ? AND requested_user_id = ? AND status = 'pending'"
      ).bind(profileUser.id, currentUser.id).first<{ id: string }>()
    : null;
  const publicRecipeVisibility = 'AND r.is_public = 1';
  const publicCookbookVisibility = 'AND c.is_public = 1';

  const recipeCount = await db.prepare(
    'SELECT COUNT(*) as count FROM recipes r WHERE r.user_id = ?'
  ).bind(profileUser.id).first<{ count: number }>();

  const cookbookCount = await db.prepare(
    'SELECT COUNT(*) as count FROM cookbooks c WHERE c.user_id = ? AND c.is_system = 0'
  ).bind(profileUser.id).first<{ count: number }>();

  const badges = await db.prepare(
    'SELECT badge, granted_at FROM profile_badges WHERE user_id = ? ORDER BY granted_at ASC, badge ASC'
  ).bind(profileUser.id).all<Pick<ProfileBadge, 'badge' | 'granted_at'>>();

  const recipes = await db.prepare(
    `SELECT r.*, owner.name as owner_name
     FROM recipes r
     LEFT JOIN users owner ON r.owner_id = owner.id
     WHERE r.user_id = ? ${publicRecipeVisibility}
     ORDER BY r.created_at DESC
     LIMIT 24`
  ).bind(profileUser.id).all<Recipe & { owner_name: string | null }>();

  const cookbooks = await db.prepare(
    `SELECT c.*, COUNT(cr.recipe_id) as recipe_count, owner.name as owner_name
     FROM cookbooks c
     LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
     JOIN users owner ON c.user_id = owner.id
     WHERE c.user_id = ? AND c.is_system = 0 ${publicCookbookVisibility}
     GROUP BY c.id
     ORDER BY c.updated_at DESC
     LIMIT 24`
  ).bind(profileUser.id).all<Cookbook & { recipe_count: number; owner_name: string }>();

  return jsonResponse(
    {
      profile: {
        user: {
          ...formatProfileUser(profileUser),
          badges: badges.results.map(formatProfileBadge),
        },
        isCurrentUser,
        isFriend,
        hasPendingFriendRequest: !!outgoingFriendRequest,
        incomingFriendRequestId: incomingFriendRequest?.id ?? null,
        friendCount: await getFriendCount(db, profileUser.id),
        recipeCount: recipeCount?.count || 0,
        cookbookCount: cookbookCount?.count || 0,
        recipes: recipes.results.map(recipe => formatPublicRecipe(recipe, currentUser?.id)),
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
    200,
    corsHeaders(origin)
  );
}

async function handleGetProfileFriends(request: Request, db: D1Database, userId: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const profileUser = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first<{ id: string }>();

  if (!profileUser) {
    return errorResponse('Profile not found', 404, origin);
  }

  const friends = await db.prepare(
    `SELECT u.id, u.name, u.avatar_url
     FROM friendships f
     JOIN users u ON u.id = CASE
       WHEN f.user_a_id = ? THEN f.user_b_id
       ELSE f.user_a_id
     END
     WHERE f.user_a_id = ? OR f.user_b_id = ?
     ORDER BY u.name COLLATE NOCASE ASC`
  ).bind(userId, userId, userId).all<{ id: string; name: string; avatar_url: string | null }>();

  return jsonResponse(
    { friends: friends.results.map(formatProfileUser) },
    200,
    corsHeaders(origin)
  );
}

async function handleAddFriend(request: Request, db: D1Database): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const body = await request.json() as { userId?: string; email?: string };
  const normalizedEmail = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  const friend = body.userId
    ? await db.prepare('SELECT id, name, avatar_url FROM users WHERE id = ?')
        .bind(body.userId)
        .first<{ id: string; name: string; avatar_url: string | null }>()
    : normalizedEmail
      ? await db.prepare('SELECT id, name, avatar_url FROM users WHERE email = ?')
          .bind(normalizedEmail)
          .first<{ id: string; name: string; avatar_url: string | null }>()
      : null;

  if (!friend) {
    return errorResponse('User not found', 404, origin);
  }

  if (friend.id === user.id) {
    return errorResponse('You cannot add yourself as a friend', 400, origin);
  }

  if (await areFriends(db, user.id, friend.id)) {
    return jsonResponse(
      { friend: formatProfileUser(friend) },
      200,
      corsHeaders(origin)
    );
  }

  const incomingRequest = await db.prepare(
    "SELECT id FROM friend_requests WHERE requester_id = ? AND requested_user_id = ? AND status = 'pending'"
  ).bind(friend.id, user.id).first<{ id: string }>();

  if (incomingRequest) {
    const accepted = await acceptFriendRequestForUser(db, user, incomingRequest.id);
    if (!accepted) {
      return errorResponse('Friend request not found or already responded', 404, origin);
    }
    return jsonResponse(
      { friend: formatProfileUser(friend) },
      200,
      corsHeaders(origin)
    );
  }

  const now = Date.now();
  const existingRequest = await db.prepare(
    'SELECT id, status FROM friend_requests WHERE requester_id = ? AND requested_user_id = ?'
  ).bind(user.id, friend.id).first<{ id: string; status: string }>();

  const friendRequestId = existingRequest?.id ?? generateId();
  if (existingRequest?.status === 'pending') {
    return jsonResponse(
      { friend: formatProfileUser(friend) },
      200,
      corsHeaders(origin)
    );
  }

  if (existingRequest) {
    await db.prepare(
      "UPDATE friend_requests SET status = 'pending', created_at = ?, responded_at = NULL WHERE id = ?"
    ).bind(now, friendRequestId).run();
  } else {
    await db.prepare(
      'INSERT INTO friend_requests (id, requester_id, requested_user_id, status, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(friendRequestId, user.id, friend.id, 'pending', now).run();
  }

  await deleteFriendRequestNotifications(db, friend.id, [friendRequestId]);

  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    generateId(),
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
  ).run();

  return jsonResponse(
    { friend: formatProfileUser(friend) },
    200,
    corsHeaders(origin)
  );
}

async function acceptFriendRequestForUser(
  db: D1Database,
  user: User,
  friendRequestId: string
): Promise<{ friend: { id: string; name: string; avatar_url: string | null } } | null> {
  const { request, notificationData } = await findFriendRequestForUser(db, user, friendRequestId);
  const notificationIds = [friendRequestId, notificationData?.friendRequestId, request?.id];

  if (!request) {
    if (notificationData?.requesterId) {
      const friend = await db.prepare(
        'SELECT id, name, avatar_url FROM users WHERE id = ?'
      ).bind(notificationData.requesterId).first<{ id: string; name: string; avatar_url: string | null }>();

      if (friend && await areFriends(db, user.id, friend.id)) {
        await deleteFriendRequestNotifications(db, user.id, notificationIds);
        return { friend };
      }
    }

    await deleteFriendRequestNotifications(db, user.id, notificationIds);
    return null;
  }

  const { userAId, userBId } = orderedFriendPair(user.id, request.requester_id);
  const now = Date.now();
  const friend = {
    id: request.requester_id,
    name: request.requester_name,
    avatar_url: request.requester_avatar_url,
  };

  if (request.status !== 'pending' && request.status !== 'accepted' && request.status !== 'declined') {
    if (await areFriends(db, user.id, request.requester_id)) {
      await deleteFriendRequestNotifications(db, user.id, notificationIds);
      return { friend };
    }

    await deleteFriendRequestNotifications(db, user.id, notificationIds);
    return null;
  }

  if (!(await areFriends(db, user.id, request.requester_id))) {
    await db.prepare(
      'INSERT OR IGNORE INTO friendships (user_a_id, user_b_id, created_at) VALUES (?, ?, ?)'
    ).bind(userAId, userBId, now).run();
  }

  if (request.status === 'pending' || request.status === 'declined') {
    await db.prepare(
      "UPDATE friend_requests SET status = 'accepted', responded_at = ? WHERE id = ?"
    ).bind(now, request.id).run();
    await createFriendRequestAcceptedNotification(db, user, request.requester_id, now);
  }

  await deleteFriendRequestNotifications(db, user.id, notificationIds);

  return { friend };
}

async function handleAcceptFriendRequest(request: Request, db: D1Database, friendRequestId: string): Promise<Response> {
  const origin = request.headers.get('Origin');

  try {
    const user = await getSessionUser(request, db);

    if (!user) {
      return errorResponse('Unauthorized', 401, origin);
    }

    const accepted = await acceptFriendRequestForUser(db, user, friendRequestId);
    if (!accepted) {
      return errorResponse('Friend request not found or already responded', 404, origin);
    }

    return jsonResponse(
      { success: true, friend: formatProfileUser(accepted.friend) },
      200,
      corsHeaders(origin)
    );
  } catch (error) {
    console.error('Failed to accept friend request:', error);
    return errorResponse(
      `Failed to accept friend request: ${getErrorMessage(error)}`,
      500,
      origin,
      'RECIPESAURUS_FRIEND_REQUEST_ACCEPT_FAILED'
    );
  }
}

async function handleDeclineFriendRequest(request: Request, db: D1Database, friendRequestId: string): Promise<Response> {
  const origin = request.headers.get('Origin');

  try {
    const user = await getSessionUser(request, db);

    if (!user) {
      return errorResponse('Unauthorized', 401, origin);
    }

    const { request: friendRequest, notificationData } = await findFriendRequestForUser(db, user, friendRequestId);

    if (!friendRequest) {
      await deleteFriendRequestNotifications(db, user.id, [friendRequestId, notificationData?.friendRequestId]);
      return errorResponse('Friend request not found or already responded', 404, origin);
    }

    if (friendRequest.status === 'pending') {
      await db.prepare(
        "UPDATE friend_requests SET status = 'declined', responded_at = ? WHERE id = ?"
      ).bind(Date.now(), friendRequest.id).run();
    }

    await deleteFriendRequestNotifications(db, user.id, [
      friendRequestId,
      notificationData?.friendRequestId,
      friendRequest.id,
    ]);

    return jsonResponse({ success: true }, 200, corsHeaders(origin));
  } catch (error) {
    console.error('Failed to decline friend request:', error);
    return errorResponse(
      `Failed to decline friend request: ${getErrorMessage(error)}`,
      500,
      origin,
      'RECIPESAURUS_FRIEND_REQUEST_DECLINE_FAILED'
    );
  }
}

async function getFriendRequestIdFromBody(request: Request): Promise<string | null> {
  try {
    const body = await request.json() as { friendRequestId?: unknown };
    return typeof body.friendRequestId === 'string' && body.friendRequestId.trim()
      ? body.friendRequestId
      : null;
  } catch {
    return null;
  }
}

async function handleRemoveFriend(request: Request, db: D1Database, friendId: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const { userAId, userBId } = orderedFriendPair(user.id, friendId);
  await db.prepare('DELETE FROM friendships WHERE user_a_id = ? AND user_b_id = ?')
    .bind(userAId, userBId)
    .run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleForgotPassword(request: Request, db: D1Database, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as { email: string };
  const { email } = body;

  if (!email) {
    return errorResponse('Email is required', 400, origin);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Always return success to prevent email enumeration
  const successResponse = () => jsonResponse(
    { message: 'If an account exists with this email, you will receive a password reset link.' },
    200,
    corsHeaders(origin)
  );

  // Check if user exists
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(normalizedEmail).first<User>();
  if (!user) {
    return successResponse();
  }

  // Invalidate any existing reset tokens for this user
  await db.prepare(
    'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0'
  ).bind(user.id).run();

  // Generate secure reset token
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Create reset token record
  const tokenId = generateId();
  const expiresAt = Date.now() + RESET_TOKEN_DURATION;
  await db.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
  ).bind(tokenId, user.id, token, expiresAt, Date.now()).run();

  // Send email via Resend
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Recipesaurus <noreply@recipesaurus.ai>',
        to: [normalizedEmail],
        subject: 'Reset Your Password - Recipesaurus',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981; margin-bottom: 24px;">Reset Your Password</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi ${user.name},
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Recipesaurus - Your Recipe Collection
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
      // Still return success to not leak information
    }
  } catch (err) {
    console.error('Email sending error:', err);
    // Still return success to not leak information
  }

  return successResponse();
}

async function handleResetPassword(request: Request, db: D1Database): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as { token: string; password: string };
  const { token, password } = body;

  if (!token || !password) {
    return errorResponse('Token and password are required', 400, origin);
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return errorResponse(passwordValidation.error!, 400, origin);
  }

  // Find valid reset token
  const resetToken = await db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?'
  ).bind(token, Date.now()).first<PasswordResetToken>();

  if (!resetToken) {
    return errorResponse('Invalid or expired reset link. Please request a new one.', 400, origin);
  }

  // Get user
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(resetToken.user_id).first<User>();
  if (!user) {
    return errorResponse('User not found', 400, origin);
  }

  // Hash new password
  const { hash, salt } = await hashPassword(password);

  // Update user password
  await db.prepare(
    'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?'
  ).bind(hash, salt, user.id).run();

  // Mark token as used
  await db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').bind(resetToken.id).run();

  // Invalidate all existing sessions for security
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();

  return jsonResponse(
    { message: 'Password reset successfully. Please log in with your new password.' },
    200,
    corsHeaders(origin)
  );
}

// Recipe handlers
async function handleGetRecipes(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const recipes = await db.prepare(
    `SELECT r.*, u.name as owner_name
     FROM recipes r
     LEFT JOIN users u ON r.owner_id = u.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`
  ).bind(user.id).all<Recipe & { owner_name: string | null }>();

  const formattedRecipes = dedupeRecipeRows(recipes.results, user.id).map(r => ({
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
    isOwner: r.user_id === user.id,
    createdAt: r.created_at,
  }));

  return jsonResponse({ recipes: formattedRecipes }, 200, corsHeaders(origin));
}

async function getMealPlanUsage(db: D1Database, userId: string, now = Date.now()): Promise<MealPlanUsageInfo> {
  const windowStartsAt = now - MEAL_PLAN_WEEK_MS;
  const subscription = await getUserSubscription(db, userId);
  const isPaid = isPaidMealPlanSubscription(subscription);
  const weeklyLimit = getMealPlanLimitForSubscription(subscription);
  const usage = await db.prepare(`
    SELECT COUNT(*) as count, MIN(created_at) as oldest_created_at
    FROM ai_meal_plan_requests
    WHERE user_id = ? AND created_at > ?
  `).bind(userId, windowStartsAt).first<{ count: number; oldest_created_at: number | null }>();

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

async function handleGetMealPlanUsage(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin, MEAL_PLAN_UNAUTHORIZED_CODE);
  }

  return jsonResponse({ usage: await getMealPlanUsage(env.DB, user.id) }, 200, corsHeaders(origin));
}

async function handleGetMealPlanHistory(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin, MEAL_PLAN_UNAUTHORIZED_CODE);
  }

  const [recipes, historyRows] = await Promise.all([
    getMealPlanRecipes(env.DB, user.id),
    env.DB.prepare(`
      SELECT id, user_id, prompt, response, created_at
      FROM ai_meal_plan_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(user.id, MEAL_PLAN_HISTORY_LIMIT).all<AiMealPlanRequest>(),
  ]);

  return jsonResponse(
    {
      history: historyRows.results.map(row => buildMealPlanHistoryItem(
        row.id,
        row.prompt,
        row.response,
        row.created_at,
        recipes
      )),
    },
    200,
    corsHeaders(origin)
  );
}

async function getMealPlanRecipes(db: D1Database, userId: string): Promise<MealPlanRecipeContext[]> {
  const recipes = await db.prepare(`
    SELECT id, title, description, ingredients, tags, prep_time, cook_time, servings
    FROM recipes
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(userId, MEAL_PLAN_MAX_RECIPES).all<Pick<Recipe, 'id' | 'title' | 'description' | 'ingredients' | 'tags' | 'prep_time' | 'cook_time' | 'servings'>>();

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

async function createOpenAIMealPlanResponse(
  env: Env,
  body: Record<string, unknown>
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('OpenAI meal plan request could not be sent:', error);
    throw new MealPlanGenerationError(
      'OpenAI network request failed',
      MEAL_PLAN_OPENAI_NETWORK_ERROR_CODE
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI meal plan request failed:', response.status, errorBody);
    throw new MealPlanGenerationError(
      'OpenAI request failed',
      getMealPlanOpenAIErrorResponseCode(response.status, errorBody) || undefined
    );
  }

  return response.json();
}

async function generateMealPlan(env: Env, request: string, recipes: MealPlanRecipeContext[]): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    if (env.ENVIRONMENT === 'development') {
      return buildFallbackMealPlan(request, recipes);
    }

    throw new MealPlanGenerationError(
      'OpenAI API key is not configured',
      MEAL_PLAN_OPENAI_NOT_CONFIGURED_CODE
    );
  }

  const model = env.OPENAI_MODEL || 'gpt-5-mini';
  const instructions = buildMealPlannerInstructions();
  let data = await createOpenAIMealPlanResponse(env, {
    model,
    instructions,
    input: buildMealPlannerInput(request, recipes),
    max_output_tokens: MEAL_PLAN_OPENAI_MAX_OUTPUT_TOKENS,
  });
  const suggestionParts = [extractOpenAIResponseText(data)].filter(Boolean);

  for (
    let continuationCount = 0;
    continuationCount < MEAL_PLAN_OPENAI_MAX_CONTINUATIONS && shouldContinueOpenAIResponse(data);
    continuationCount += 1
  ) {
    const previousResponseId = getOpenAIResponseId(data);
    if (!previousResponseId) {
      break;
    }

    data = await createOpenAIMealPlanResponse(env, {
      model,
      instructions,
      previous_response_id: previousResponseId,
      input: buildMealPlannerContinuationInput(request),
      max_output_tokens: MEAL_PLAN_OPENAI_CONTINUATION_MAX_OUTPUT_TOKENS,
    });

    const continuationText = extractOpenAIResponseText(data);
    if (continuationText) {
      suggestionParts.push(continuationText);
    }
  }

  const suggestion = suggestionParts.join('\n').trim();
  if (!suggestion) {
    throw new MealPlanGenerationError(
      'OpenAI response did not include text',
      MEAL_PLAN_OPENAI_EMPTY_RESPONSE_CODE
    );
  }

  return suggestion;
}

async function handleCreateMealPlan(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin, MEAL_PLAN_UNAUTHORIZED_CODE);
  }

  const body = await request.json() as { request?: unknown };
  const mealPlanRequest = normalizeMealPlanRequest(body.request);
  if (!mealPlanRequest) {
    return errorResponse(
      'Meal planning request is required and must be 1000 characters or fewer',
      400,
      origin,
      MEAL_PLAN_INVALID_REQUEST_CODE
    );
  }

  const usage = await getMealPlanUsage(env.DB, user.id);
  if (usage.remainingRequests <= 0) {
    return jsonResponse(
      {
        error: 'Weekly AI meal planning limit reached',
        code: MEAL_PLAN_LIMIT_CODE,
        usage,
      },
      402,
      corsHeaders(origin)
    );
  }

  const recipes = await getMealPlanRecipes(env.DB, user.id);
  let suggestion: string;

  try {
    suggestion = await generateMealPlan(env, mealPlanRequest, recipes);
  } catch (error) {
    console.error('Meal planning generation failed:', error);
    const errorCode = error instanceof MealPlanGenerationError
      ? error.responseCode
      : MEAL_PLAN_GENERATION_FAILED_CODE;
    return errorResponse(
      'AI meal planning is unavailable right now. Please try again shortly.',
      503,
      origin,
      errorCode || MEAL_PLAN_GENERATION_FAILED_CODE
    );
  }

  const now = Date.now();
  const details = buildMealPlanSuggestionDetails(mealPlanRequest, suggestion, recipes);
  const id = generateId();

  await env.DB.prepare(`
    INSERT INTO ai_meal_plan_requests (id, user_id, prompt, response, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, user.id, mealPlanRequest, details.suggestion, now).run();

  return jsonResponse(
    {
      id,
      prompt: mealPlanRequest,
      createdAt: now,
      ...details,
      usage: await getMealPlanUsage(env.DB, user.id, now),
      recipeCount: recipes.length,
    },
    200,
    corsHeaders(origin)
  );
}

function formatBillingStatus(subscription: UserSubscription | null) {
  const isPaid = isPaidMealPlanSubscription(subscription);

  return {
    isPaid,
    planName: isPaid ? MEAL_PLAN_PAID_PLAN_NAME : 'Free',
    priceCents: MEAL_PLAN_PAID_PRICE_CENTS,
    currency: 'usd',
    interval: 'month',
    freeWeeklyLimit: MEAL_PLAN_FREE_WEEKLY_LIMIT,
    paidWeeklyLimit: MEAL_PLAN_PAID_WEEKLY_LIMIT,
    weeklyLimit: getMealPlanLimitForSubscription(subscription),
    subscription: subscription
      ? {
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end === 1,
        }
      : null,
  };
}

async function handleGetBillingStatus(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const subscription = await getUserSubscription(env.DB, user.id);
  return jsonResponse({ billing: formatBillingStatus(subscription) }, 200, corsHeaders(origin));
}

async function handleCreateCheckoutSession(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }
  if (!env.STRIPE_SECRET_KEY) {
    return errorResponse('Payments are not configured yet.', 503, origin, MEAL_PLAN_BILLING_NOT_CONFIGURED_CODE);
  }

  const existingSubscription = await getUserSubscription(env.DB, user.id);
  if (isPaidMealPlanSubscription(existingSubscription) && existingSubscription?.stripe_customer_id) {
    return handleCreatePortalSession(request, env);
  }

  const appUrl = getAppBaseUrl(env);
  const params = new URLSearchParams({
    mode: 'subscription',
    success_url: `${appUrl}/meal-planner?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/meal-planner?billing=cancel`,
    client_reference_id: user.id,
    customer_email: user.email,
    allow_promotion_codes: 'true',
    'metadata[userId]': user.id,
    'subscription_data[metadata][userId]': user.id,
  });

  if (existingSubscription?.stripe_customer_id) {
    params.delete('customer_email');
    params.set('customer', existingSubscription.stripe_customer_id);
  }

  if (env.STRIPE_PRICE_ID) {
    params.set('line_items[0][price]', env.STRIPE_PRICE_ID);
  } else {
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(MEAL_PLAN_PAID_PRICE_CENTS));
    params.set('line_items[0][price_data][recurring][interval]', 'month');
    params.set('line_items[0][price_data][product_data][name]', `Recipesaurus ${MEAL_PLAN_PAID_PLAN_NAME}`);
  }
  params.set('line_items[0][quantity]', '1');

  try {
    const session = await stripePost<StripeCheckoutSession>(env, '/checkout/sessions', params);
    const customerId = getStripeId(session.customer);
    if (customerId) {
      await upsertUserSubscription(env.DB, user.id, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: getStripeId(session.subscription),
        status: existingSubscription?.status || 'checkout_started',
        currentPeriodEnd: existingSubscription?.current_period_end || null,
        cancelAtPeriodEnd: existingSubscription?.cancel_at_period_end === 1,
      });
    }

    if (!session.url) {
      return errorResponse('Stripe did not return a checkout URL.', 502, origin, MEAL_PLAN_BILLING_STRIPE_URL_MISSING_CODE);
    }

    return jsonResponse({ url: session.url }, 200, corsHeaders(origin));
  } catch (error) {
    console.error('Stripe checkout session failed:', error);
    return errorResponse('Unable to start checkout right now.', 502, origin, MEAL_PLAN_BILLING_CHECKOUT_FAILED_CODE);
  }
}

async function handleCreatePortalSession(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }
  if (!env.STRIPE_SECRET_KEY) {
    return errorResponse('Payments are not configured yet.', 503, origin, MEAL_PLAN_BILLING_NOT_CONFIGURED_CODE);
  }

  const subscription = await getUserSubscription(env.DB, user.id);
  if (!subscription?.stripe_customer_id) {
    return errorResponse('No Stripe customer found for this account.', 404, origin, MEAL_PLAN_BILLING_CUSTOMER_NOT_FOUND_CODE);
  }

  const params = new URLSearchParams({
    customer: subscription.stripe_customer_id,
    return_url: `${getAppBaseUrl(env)}/meal-planner`,
  });

  try {
    const session = await stripePost<{ url?: string | null }>(env, '/billing_portal/sessions', params);
    if (!session.url) {
      return errorResponse('Stripe did not return a billing portal URL.', 502, origin, MEAL_PLAN_BILLING_STRIPE_URL_MISSING_CODE);
    }

    return jsonResponse({ url: session.url }, 200, corsHeaders(origin));
  } catch (error) {
    console.error('Stripe portal session failed:', error);
    return errorResponse('Unable to open billing management right now.', 502, origin, MEAL_PLAN_BILLING_PORTAL_FAILED_CODE);
  }
}

async function handleCancelSubscription(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }
  if (!env.STRIPE_SECRET_KEY) {
    return errorResponse('Payments are not configured yet.', 503, origin, MEAL_PLAN_BILLING_NOT_CONFIGURED_CODE);
  }

  const subscription = await getUserSubscription(env.DB, user.id);
  if (!subscription?.stripe_subscription_id || !isPaidMealPlanSubscription(subscription)) {
    return errorResponse('No active paid subscription found for this account.', 404, origin, MEAL_PLAN_BILLING_SUBSCRIPTION_NOT_FOUND_CODE);
  }

  if (subscription.cancel_at_period_end === 1) {
    return jsonResponse({ billing: formatBillingStatus(subscription) }, 200, corsHeaders(origin));
  }

  const params = new URLSearchParams({
    cancel_at_period_end: 'true',
  });

  try {
    const updatedSubscription = await stripePost<StripeSubscription>(
      env,
      `/subscriptions/${encodeURIComponent(subscription.stripe_subscription_id)}`,
      params
    );
    await recordStripeSubscription(env.DB, user.id, updatedSubscription);

    const refreshedSubscription = await getUserSubscription(env.DB, user.id);
    return jsonResponse({ billing: formatBillingStatus(refreshedSubscription) }, 200, corsHeaders(origin));
  } catch (error) {
    console.error('Stripe subscription cancellation failed:', error);
    return errorResponse('Unable to end subscription right now.', 502, origin, MEAL_PLAN_BILLING_CANCEL_FAILED_CODE);
  }
}

async function handleReinstateSubscription(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, env.DB);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }
  if (!env.STRIPE_SECRET_KEY) {
    return errorResponse('Payments are not configured yet.', 503, origin, MEAL_PLAN_BILLING_NOT_CONFIGURED_CODE);
  }

  const subscription = await getUserSubscription(env.DB, user.id);
  if (!subscription?.stripe_subscription_id || !isPaidMealPlanSubscription(subscription)) {
    return errorResponse('No active paid subscription found for this account.', 404, origin, MEAL_PLAN_BILLING_SUBSCRIPTION_NOT_FOUND_CODE);
  }

  if (subscription.cancel_at_period_end !== 1) {
    return jsonResponse({ billing: formatBillingStatus(subscription) }, 200, corsHeaders(origin));
  }

  const params = new URLSearchParams({
    cancel_at_period_end: 'false',
  });

  try {
    const updatedSubscription = await stripePost<StripeSubscription>(
      env,
      `/subscriptions/${encodeURIComponent(subscription.stripe_subscription_id)}`,
      params
    );
    await recordStripeSubscription(env.DB, user.id, updatedSubscription);

    const refreshedSubscription = await getUserSubscription(env.DB, user.id);
    return jsonResponse({ billing: formatBillingStatus(refreshedSubscription) }, 200, corsHeaders(origin));
  } catch (error) {
    console.error('Stripe subscription restore failed:', error);
    return errorResponse('Unable to restore subscription right now.', 502, origin, MEAL_PLAN_BILLING_RESTORE_FAILED_CODE);
  }
}

async function handleCheckoutCompleted(env: Env, session: StripeCheckoutSession): Promise<void> {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (!userId) {
    console.warn('Stripe checkout completed without a user id', session.id);
    return;
  }

  const customerId = getStripeId(session.customer);
  const subscriptionId = getStripeId(session.subscription);
  if (subscriptionId && env.STRIPE_SECRET_KEY) {
    const subscription = await stripeGet<StripeSubscription>(env, `/subscriptions/${encodeURIComponent(subscriptionId)}`);
    await recordStripeSubscription(env.DB, userId, subscription);
    return;
  }

  await upsertUserSubscription(env.DB, userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    status: 'active',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
}

async function handleStripeSubscriptionEvent(db: D1Database, subscription: StripeSubscription): Promise<void> {
  const userId = await findSubscriptionUserId(db, subscription);
  if (!userId) {
    console.warn('Stripe subscription event without a known user id', subscription.id);
    return;
  }

  await recordStripeSubscription(db, userId, subscription);
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ error: 'Stripe webhook secret is not configured' }, 503);
  }

  const rawBody = await request.text();
  const isValid = await verifyStripeWebhookSignature(
    rawBody,
    request.headers.get('Stripe-Signature'),
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!isValid) {
    return jsonResponse({ error: 'Invalid Stripe signature' }, 400);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return jsonResponse({ error: 'Invalid Stripe event payload' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(env, event.data?.object as StripeCheckoutSession);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleStripeSubscriptionEvent(env.DB, event.data?.object as StripeSubscription);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Stripe webhook handling failed:', event.id, event.type, error);
    return jsonResponse({ error: 'Webhook handling failed' }, 500);
  }

  return jsonResponse({ received: true }, 200);
}

async function handleCreateRecipe(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const body = await request.json() as {
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    tags: string[];
    imageUrl?: string;
    sourceUrl?: string;
    prepTime?: string;
    cookTime?: string;
    servings?: string;
    isPublic?: boolean;
  };

  const recipeId = generateId();
  const now = Date.now();
  await db.prepare(`
    INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    recipeId,
    user.id,
    user.id,
    body.title,
    body.description || '',
    JSON.stringify(body.ingredients),
    JSON.stringify(body.instructions),
    JSON.stringify(body.tags || []),
    body.imageUrl || null,
    body.sourceUrl || null,
    body.prepTime || null,
    body.cookTime || null,
    body.servings || null,
    body.isPublic ? 1 : 0,
    now
  ).run();

  // Add to user's default "My Recipes" cookbook
  const collectionId = await getOrCreateRecipeCollection(db, user.id);
  await db.prepare(`
    INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at)
    VALUES (?, ?, ?, ?)
  `).bind(collectionId, recipeId, user.id, now).run();

  return jsonResponse({ id: recipeId }, 201, corsHeaders(origin));
}

// Helper to get or create user's recipe collection
async function getOrCreateRecipeCollection(db: D1Database, userId: string): Promise<string> {
  const existing = await db.prepare('SELECT id FROM cookbooks WHERE user_id = ? AND system_type = ?')
    .bind(userId, 'collection')
    .first<{ id: string }>();

  if (existing) {
    return existing.id;
  }

  // Create the collection for existing users who don't have one yet
  const collectionId = generateId();
  const now = Date.now();
  await db.prepare(`
    INSERT INTO cookbooks (id, user_id, name, description, cover_image, is_system, system_type, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    collectionId,
    userId,
    'My Recipes',
    'Your personal recipe collection',
    null,
    0, // not a system cookbook
    'collection',
    0, // private
    now,
    now
  ).run();

  return collectionId;
}

async function saveRecipeSharePayloadForUser(
  db: D1Database,
  userId: string,
  recipe: RecipeSharePayload
): Promise<{ recipeId: string; collectionId: string }> {
  const recipeId = generateId();
  const now = Date.now();

  await db.prepare(`
    INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
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
  ).run();

  const collectionId = await getOrCreateRecipeCollection(db, userId);
  await db.prepare('INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)')
    .bind(collectionId, recipeId, userId, now)
    .run();
  await db.prepare('UPDATE cookbooks SET updated_at = ? WHERE id = ?')
    .bind(now, collectionId)
    .run();

  return { recipeId, collectionId };
}

async function handleSavePreviewRecipe(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const body = await request.json() as {
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    prepTime?: string;
    cookTime?: string;
    servings?: string;
    imageUrl?: string;
    sourceUrl: string;
  };

  if (!body.title || !body.ingredients?.length || !body.instructions?.length) {
    return errorResponse('Recipe must have a title, ingredients, and instructions', 400, origin);
  }

  // Create the recipe
  const recipeId = generateId();
  const now = Date.now();

  await db.prepare(`
    INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, is_public, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    recipeId,
    user.id,
    user.id,
    body.title,
    body.description || '',
    JSON.stringify(body.ingredients),
    JSON.stringify(body.instructions),
    JSON.stringify([]),
    body.imageUrl || null,
    body.sourceUrl,
    body.prepTime || null,
    body.cookTime || null,
    body.servings || null,
    0, // private
    now
  ).run();

  // Add to My Recipe Collection
  const collectionId = await getOrCreateRecipeCollection(db, user.id);
  await db.prepare('INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)')
    .bind(collectionId, recipeId, user.id, now)
    .run();
  await db.prepare('UPDATE cookbooks SET updated_at = ? WHERE id = ?')
    .bind(now, collectionId)
    .run();

  return jsonResponse({ id: recipeId, collectionId }, 201, corsHeaders(origin));
}

async function handleDeleteRecipe(request: Request, db: D1Database, recipeId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  await db.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?').bind(recipeId, user.id).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleGetCookbooksForRecipe(request: Request, db: D1Database, recipeId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Get all cookbook IDs that contain this recipe and user has access to (owned or shared)
  const result = await db.prepare(`
    SELECT DISTINCT cr.cookbook_id
    FROM cookbook_recipes cr
    JOIN cookbooks c ON cr.cookbook_id = c.id
    LEFT JOIN cookbook_shares cs ON c.id = cs.cookbook_id AND cs.shared_with_user_id = ?
    WHERE cr.recipe_id = ? AND (c.user_id = ? OR cs.shared_with_user_id IS NOT NULL)
  `).bind(user.id, recipeId, user.id).all<{ cookbook_id: string }>();

  return jsonResponse({ cookbookIds: result.results.map(r => r.cookbook_id) }, 200, corsHeaders(origin));
}

async function handleCreateRecipeShareLink(request: Request, db: D1Database): Promise<Response> {
  const origin = request.headers.get('Origin');
  const body = await request.json() as RecipeSharePayload;
  const recipe = normalizeRecipeSharePayload(body);

  if (!recipe) {
    return errorResponse('Recipe must have a title, ingredients, and instructions', 400, origin);
  }

  const recipeData = JSON.stringify(recipe);
  if (recipeData.length > MAX_RECIPE_SHARE_BYTES) {
    return errorResponse('Recipe is too large to share', 413, origin);
  }

  const id = generateId();
  const token = generateId();
  const createdAt = Date.now();

  await db.prepare(`
    INSERT INTO recipe_share_links (id, token, recipe_data, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(id, token, recipeData, createdAt).run();

  return jsonResponse({ token, createdAt }, 201, corsHeaders(origin));
}

async function handleShareRecipeWithUser(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const body = await request.json() as { recipe?: RecipeSharePayload; userId?: string };
  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!targetUserId) {
    return errorResponse('User is required', 400, origin);
  }

  const targetUser = await db.prepare(
    'SELECT id, name, avatar_url FROM users WHERE id = ?'
  ).bind(targetUserId).first<{ id: string; name: string; avatar_url: string | null }>();

  if (!targetUser) {
    return errorResponse('User not found', 404, origin);
  }

  if (targetUser.id === user.id) {
    return errorResponse('Cannot share with yourself', 400, origin);
  }

  if (!(await areFriends(db, user.id, targetUser.id))) {
    return errorResponse('You can only share recipes with friends', 400, origin);
  }

  const rawRecipe = body.recipe;
  const recipe = rawRecipe ? normalizeRecipeSharePayload(rawRecipe) : null;
  if (!recipe) {
    return errorResponse('Recipe must have a title, ingredients, and instructions', 400, origin);
  }

  const recipeData = JSON.stringify(recipe);
  if (recipeData.length > MAX_RECIPE_SHARE_BYTES) {
    return errorResponse('Recipe is too large to share', 413, origin);
  }

  const id = generateId();
  const token = generateId();
  const notificationId = generateId();
  const createdAt = Date.now();

  await db.prepare(`
    INSERT INTO recipe_share_links (id, token, recipe_data, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(id, token, recipeData, createdAt).run();

  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
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
  ).run();

  return jsonResponse(
    {
      success: true,
      sharedWith: formatProfileUser(targetUser),
      shareLink: { token, createdAt },
    },
    201,
    corsHeaders(origin)
  );
}

async function handleGetSharedRecipe(request: Request, db: D1Database, token: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const link = await db.prepare('SELECT * FROM recipe_share_links WHERE token = ?')
    .bind(token)
    .first<RecipeShareLink>();

  if (!link) {
    return errorResponse('Share link not found', 404, origin);
  }

  return jsonResponse({ recipe: JSON.parse(link.recipe_data) }, 200, corsHeaders(origin));
}

async function handleAcceptRecipeShare(request: Request, db: D1Database, token: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const shareToken = token.trim();
  if (!shareToken) {
    return errorResponse('Share token is required', 400, origin);
  }

  if (!(await getRecipeShareNotification(db, user.id, shareToken))) {
    return errorResponse('Recipe share not found or already responded', 404, origin);
  }

  const link = await db.prepare('SELECT * FROM recipe_share_links WHERE token = ?')
    .bind(shareToken)
    .first<RecipeShareLink>();

  if (!link) {
    return errorResponse('Shared recipe not found', 404, origin);
  }

  const recipe = normalizeRecipeSharePayload(JSON.parse(link.recipe_data) as RecipeSharePayload);
  if (!recipe) {
    return errorResponse('Shared recipe is invalid', 400, origin);
  }

  const saved = await saveRecipeSharePayloadForUser(db, user.id, recipe);
  await deleteRecipeShareNotifications(db, user.id, shareToken);

  return jsonResponse(
    { success: true, recipeId: saved.recipeId, recipeTitle: recipe.title },
    200,
    corsHeaders(origin)
  );
}

async function handleDeclineRecipeShare(request: Request, db: D1Database, token: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const shareToken = token.trim();
  if (!shareToken) {
    return errorResponse('Share token is required', 400, origin);
  }

  if (!(await getRecipeShareNotification(db, user.id, shareToken))) {
    return errorResponse('Recipe share not found or already responded', 404, origin);
  }

  await deleteRecipeShareNotifications(db, user.id, shareToken);

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleUpdateRecipe(request: Request, db: D1Database, recipeId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Verify ownership
  const existing = await db.prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?').bind(recipeId, user.id).first();
  if (!existing) {
    return errorResponse('Recipe not found', 404, origin);
  }

  const body = await request.json() as {
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
  };

  await db.prepare(`
    UPDATE recipes SET
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
    WHERE id = ? AND user_id = ?
  `).bind(
    body.title || null,
    body.description || null,
    body.ingredients ? JSON.stringify(body.ingredients) : null,
    body.instructions ? JSON.stringify(body.instructions) : null,
    body.tags ? JSON.stringify(body.tags) : null,
    body.imageUrl ?? null,
    body.sourceUrl ?? null,
    body.prepTime ?? null,
    body.cookTime ?? null,
    body.servings ?? null,
    body.isPublic !== undefined ? (body.isPublic ? 1 : 0) : null,
    recipeId,
    user.id
  ).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

// Cookbook handlers
async function handleGetCookbooks(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Get owned cookbooks with recipe count
  const owned = await db.prepare(`
    SELECT c.*, COUNT(cr.recipe_id) as recipe_count
    FROM cookbooks c
    LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `).bind(user.id).all();

  // Get shared cookbooks with recipe count and owner info
  const shared = await db.prepare(`
    SELECT c.*, COUNT(cr.recipe_id) as recipe_count, u.name as owner_name
    FROM cookbooks c
    JOIN cookbook_shares cs ON c.id = cs.cookbook_id
    JOIN users u ON c.user_id = u.id
    LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
    WHERE cs.shared_with_user_id = ?
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `).bind(user.id).all();

  const formatCookbook = (c: Record<string, unknown>, isOwner: boolean) => ({
    id: c.id,
    ownerId: c.user_id,
    name: c.name,
    description: c.description,
    coverImage: c.cover_image || null,
    recipeCount: c.recipe_count || 0,
    isSystem: c.is_system === 1,
    systemType: c.system_type || null,
    isPublic: c.is_public === 1,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    isOwner,
    ownerName: isOwner ? undefined : c.owner_name,
  });

  return jsonResponse({
    owned: owned.results.map(c => formatCookbook(c, true)),
    shared: shared.results.map(c => formatCookbook(c, false)),
  }, 200, corsHeaders(origin));
}

async function handleCreateCookbook(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const body = await request.json() as { name: string; description?: string; coverImage?: string; isPublic?: boolean };

  if (!body.name?.trim()) {
    return errorResponse('Cookbook name is required', 400, origin);
  }

  const cookbookId = generateId();
  const now = Date.now();

  await db.prepare(`
    INSERT INTO cookbooks (id, user_id, name, description, cover_image, is_system, system_type, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    cookbookId,
    user.id,
    body.name.trim(),
    body.description?.trim() || null,
    body.coverImage?.trim() || null,
    0, // not a system cookbook
    null,
    body.isPublic ? 1 : 0,
    now,
    now
  ).run();

  return jsonResponse({ id: cookbookId }, 201, corsHeaders(origin));
}

async function handleGetCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Check if user owns or has access to cookbook
  const cookbook = await db.prepare('SELECT * FROM cookbooks WHERE id = ?').bind(cookbookId).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found', 404, origin);
  }

  const isOwner = cookbook.user_id === user.id;
  let hasAccess = isOwner;

  if (!isOwner) {
    const share = await db.prepare(
      'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?'
    ).bind(cookbookId, user.id).first();
    hasAccess = !!share;
  }

  if (!hasAccess) {
    return errorResponse('Access denied', 403, origin);
  }

  // Get owner info if shared
  let ownerName: string | undefined;
  if (!isOwner) {
    const owner = await db.prepare('SELECT name FROM users WHERE id = ?').bind(cookbook.user_id).first<{ name: string }>();
    ownerName = owner?.name;
  }

  // Get recipes in cookbook with who added them
  const recipes = await db.prepare(`
    SELECT r.*, cr.added_by_user_id, u.name as added_by_user_name FROM recipes r
    JOIN cookbook_recipes cr ON r.id = cr.recipe_id
    LEFT JOIN users u ON cr.added_by_user_id = u.id
    WHERE cr.cookbook_id = ?
    ORDER BY cr.added_at DESC
  `).bind(cookbookId).all<Recipe & { added_by_user_id: string; added_by_user_name: string | null }>();

  const formattedRecipes = recipes.results.map(r => ({
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
    isOwner: r.user_id === user.id,
    createdAt: r.created_at,
    addedByUserId: r.added_by_user_id,
    addedByUserName: r.added_by_user_name,
  }));

  return jsonResponse({
    cookbook: {
      id: cookbook.id,
      ownerId: cookbook.user_id,
      name: cookbook.name,
      description: cookbook.description,
      coverImage: cookbook.cover_image,
      recipeCount: formattedRecipes.length,
      isSystem: cookbook.is_system === 1,
      systemType: cookbook.system_type,
      isPublic: cookbook.is_public === 1,
      createdAt: cookbook.created_at,
      updatedAt: cookbook.updated_at,
      isOwner,
      ownerName,
    },
    recipes: formattedRecipes,
  }, 200, corsHeaders(origin));
}

async function handleUpdateCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ? AND user_id = ?'
  ).bind(cookbookId, user.id).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found or access denied', 404, origin);
  }

  const body = await request.json() as { name?: string; description?: string; coverImage?: string | null; isPublic?: boolean };

  const newName = body.name?.trim() || cookbook.name;
  const newDescription = body.description !== undefined ? (body.description?.trim() || null) : cookbook.description;
  const newCoverImage = body.coverImage !== undefined ? (body.coverImage?.trim() || null) : cookbook.cover_image;
  const newIsPublic = body.isPublic !== undefined ? (body.isPublic ? 1 : 0) : cookbook.is_public;

  await db.prepare(`
    UPDATE cookbooks SET name = ?, description = ?, cover_image = ?, source_cookbook_id = NULL, is_public = ?, updated_at = ? WHERE id = ?
  `).bind(newName, newDescription, newCoverImage, newIsPublic, Date.now(), cookbookId).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleDeleteCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Check if this is a system cookbook
  const cookbook = await db.prepare('SELECT is_system FROM cookbooks WHERE id = ? AND user_id = ?')
    .bind(cookbookId, user.id)
    .first<{ is_system: number }>();

  if (!cookbook) {
    return errorResponse('Cookbook not found', 404, origin);
  }

  if (cookbook.is_system === 1) {
    return errorResponse('Cannot delete system cookbooks', 403, origin);
  }

  await db.prepare('DELETE FROM cookbook_recipes WHERE cookbook_id = ?').bind(cookbookId).run();
  await db.prepare('DELETE FROM cookbook_shares WHERE cookbook_id = ?').bind(cookbookId).run();
  await db.prepare('DELETE FROM cookbook_share_links WHERE cookbook_id = ?').bind(cookbookId).run();
  await db.prepare('DELETE FROM cookbooks WHERE id = ? AND user_id = ?').bind(cookbookId, user.id).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleAddRecipeToCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Check if user owns the cookbook
  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ?'
  ).bind(cookbookId).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found', 404, origin);
  }

  // Check if user owns or has shared access to the cookbook
  const isOwner = cookbook.user_id === user.id;
  let hasAccess = isOwner;

  if (!isOwner) {
    const share = await db.prepare(
      'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?'
    ).bind(cookbookId, user.id).first();
    hasAccess = !!share;
  }

  if (!hasAccess) {
    return errorResponse('Access denied', 403, origin);
  }

  const body = await request.json() as { recipeId: string };

  if (!body.recipeId) {
    return errorResponse('Recipe ID is required', 400, origin);
  }

  // Verify recipe exists and belongs to user
  const recipe = await db.prepare(
    'SELECT id FROM recipes WHERE id = ? AND user_id = ?'
  ).bind(body.recipeId, user.id).first();

  if (!recipe) {
    return errorResponse('Recipe not found', 404, origin);
  }

  // Check if recipe is already in cookbook
  const existingEntry = await db.prepare(`
    SELECT cookbook_id FROM cookbook_recipes WHERE cookbook_id = ? AND recipe_id = ?
  `).bind(cookbookId, body.recipeId).first();

  if (existingEntry) {
    return jsonResponse({ success: true }, 200, corsHeaders(origin));
  }

  const now = Date.now();

  // Add to cookbook
  await db.prepare(`
    INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at)
    VALUES (?, ?, ?, ?)
  `).bind(cookbookId, body.recipeId, user.id, now).run();

  // Update cookbook timestamp
  await db.prepare('UPDATE cookbooks SET source_cookbook_id = NULL, updated_at = ? WHERE id = ?').bind(now, cookbookId).run();

  // Get recipe title for notification
  const recipeInfo = await db.prepare('SELECT title FROM recipes WHERE id = ?').bind(body.recipeId).first<{ title: string }>();

  // Notify all other users who have access to this cookbook (owner + shared users, excluding the adder)
  const usersToNotify: string[] = [];

  // Add owner if not the adder
  if (cookbook.user_id !== user.id) {
    usersToNotify.push(cookbook.user_id);
  }

  // Get shared users (excluding the adder)
  const sharedUsers = await db.prepare(`
    SELECT shared_with_user_id FROM cookbook_shares
    WHERE cookbook_id = ? AND shared_with_user_id != ?
  `).bind(cookbookId, user.id).all<{ shared_with_user_id: string }>();

  for (const share of sharedUsers.results) {
    if (!usersToNotify.includes(share.shared_with_user_id)) {
      usersToNotify.push(share.shared_with_user_id);
    }
  }

  // Create notifications
  for (const userId of usersToNotify) {
    const notificationId = generateId();
    await db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      notificationId,
      userId,
      'recipe_added',
      'New Recipe Added',
      `${user.name} added "${recipeInfo?.title || 'a recipe'}" to "${cookbook.name}"`,
      JSON.stringify({ cookbookId, cookbookName: cookbook.name, recipeId: body.recipeId, addedBy: user.name }),
      0,
      now
    ).run();
  }

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleRemoveRecipeFromCookbook(request: Request, db: D1Database, cookbookId: string, recipeId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Check if cookbook exists
  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ?'
  ).bind(cookbookId).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found', 404, origin);
  }

  const isOwner = cookbook.user_id === user.id;

  // Check if user has shared access
  let hasSharedAccess = false;
  if (!isOwner) {
    const share = await db.prepare(
      'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?'
    ).bind(cookbookId, user.id).first();
    hasSharedAccess = !!share;
  }

  if (!isOwner && !hasSharedAccess) {
    return errorResponse('Access denied', 403, origin);
  }

  // If owner, can remove any recipe. If shared user, can only remove recipes they added.
  if (isOwner) {
    await db.prepare('DELETE FROM cookbook_recipes WHERE cookbook_id = ? AND recipe_id = ?').bind(cookbookId, recipeId).run();
  } else {
    // Shared user can only remove recipes they added
    const result = await db.prepare(
      'DELETE FROM cookbook_recipes WHERE cookbook_id = ? AND recipe_id = ? AND added_by_user_id = ?'
    ).bind(cookbookId, recipeId, user.id).run();

    if (result.meta.changes === 0) {
      return errorResponse('You can only remove recipes you added', 403, origin);
    }
  }

  // Update cookbook timestamp
  await db.prepare('UPDATE cookbooks SET source_cookbook_id = NULL, updated_at = ? WHERE id = ?').bind(Date.now(), cookbookId).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleShareCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ? AND user_id = ?'
  ).bind(cookbookId, user.id).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found or access denied', 404, origin);
  }

  const body = await request.json() as { userId?: string; email?: string };
  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const targetEmail = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  const isFriendShare = Boolean(targetUserId);

  if (!targetUserId && !targetEmail) {
    return errorResponse('User is required', 400, origin);
  }

  const targetUser = targetUserId
    ? await db.prepare(
        'SELECT id, name FROM users WHERE id = ?'
      ).bind(targetUserId).first<{ id: string; name: string }>()
    : await db.prepare(
        'SELECT id, name FROM users WHERE email = ?'
      ).bind(targetEmail).first<{ id: string; name: string }>();

  if (!targetUser) {
    return errorResponse('User not found', 404, origin);
  }

  if (targetUser.id === user.id) {
    return errorResponse('Cannot share with yourself', 400, origin);
  }

  if (isFriendShare && !(await areFriends(db, user.id, targetUser.id))) {
    return errorResponse('You can only share cookbooks with friends', 400, origin);
  }

  // Check if already shared
  const existingShare = await db.prepare(
    'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?'
  ).bind(cookbookId, targetUser.id).first();

  if (existingShare) {
    return errorResponse('Cookbook is already shared with this user', 400, origin);
  }

  // Check if invite already exists (any status due to unique constraint)
  const existingInvite = await db.prepare(
    'SELECT id, status FROM cookbook_invites WHERE cookbook_id = ? AND invited_user_id = ?'
  ).bind(cookbookId, targetUser.id).first<{ id: string; status: string }>();

  const now = Date.now();
  let inviteId: string;

  if (existingInvite) {
    if (existingInvite.status === 'pending') {
      return errorResponse('An invite has already been sent to this user', 400, origin);
    }
    // Reactivate declined invite
    inviteId = existingInvite.id;
    await db.prepare(
      'UPDATE cookbook_invites SET status = ?, invited_by_user_id = ?, created_at = ? WHERE id = ?'
    ).bind('pending', user.id, now, inviteId).run();
  } else {
    // Create new invite
    inviteId = generateId();
    await db.prepare(`
      INSERT INTO cookbook_invites (id, cookbook_id, invited_user_id, invited_by_user_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(inviteId, cookbookId, targetUser.id, user.id, 'pending', now).run();
  }

  // Create notification for the invited user
  const notificationId = generateId();
  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    notificationId,
    targetUser.id,
    'cookbook_invite',
    'Cookbook Invitation',
    `${user.name} invited you to join "${cookbook.name}"`,
    JSON.stringify({ inviteId, cookbookId, cookbookName: cookbook.name, invitedBy: user.name }),
    0,
    now
  ).run();

  return jsonResponse({ success: true, sharedWith: { id: targetUser.id, name: targetUser.name } }, 200, corsHeaders(origin));
}

async function handleRemoveShare(request: Request, db: D1Database, cookbookId: string, userId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Check if user is the owner of the cookbook
  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ?'
  ).bind(cookbookId).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found', 404, origin);
  }

  const isOwner = cookbook.user_id === user.id;
  const isRemovingSelf = userId === user.id;

  // Allow if: owner removing anyone, or user removing themselves
  if (!isOwner && !isRemovingSelf) {
    return errorResponse('Access denied', 403, origin);
  }

  await db.prepare('DELETE FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?').bind(cookbookId, userId).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleGetShares(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ? AND user_id = ?'
  ).bind(cookbookId, user.id).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found or access denied', 404, origin);
  }

  const shares = await db.prepare(`
    SELECT cs.id, cs.created_at, u.id as user_id, u.name, u.email
    FROM cookbook_shares cs
    JOIN users u ON cs.shared_with_user_id = u.id
    WHERE cs.cookbook_id = ?
    ORDER BY cs.created_at DESC
  `).bind(cookbookId).all();

  const links = await db.prepare(`
    SELECT id, token, is_active, created_at
    FROM cookbook_share_links
    WHERE cookbook_id = ?
    ORDER BY created_at DESC
  `).bind(cookbookId).all();

  return jsonResponse({
    shares: shares.results.map(s => ({
      id: s.id,
      userId: s.user_id,
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
  }, 200, corsHeaders(origin));
}

async function handleCreateShareLink(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ? AND user_id = ?'
  ).bind(cookbookId, user.id).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found or access denied', 404, origin);
  }

  const linkId = generateId();
  const token = generateId();

  await db.prepare(`
    INSERT INTO cookbook_share_links (id, cookbook_id, token, is_active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).bind(linkId, cookbookId, token, Date.now()).run();

  return jsonResponse({
    id: linkId,
    token,
    isActive: true,
  }, 201, corsHeaders(origin));
}

async function handleRevokeShareLink(request: Request, db: D1Database, cookbookId: string, linkId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const cookbook = await db.prepare(
    'SELECT * FROM cookbooks WHERE id = ? AND user_id = ?'
  ).bind(cookbookId, user.id).first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found or access denied', 404, origin);
  }

  await db.prepare('UPDATE cookbook_share_links SET is_active = 0 WHERE id = ? AND cookbook_id = ?').bind(linkId, cookbookId).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleGetSharedCookbook(request: Request, db: D1Database, token: string): Promise<Response> {
  const origin = request.headers.get('Origin');

  const link = await db.prepare(`
    SELECT csl.cookbook_id, c.user_id, c.name, c.description, u.name as owner_name
    FROM cookbook_share_links csl
    JOIN cookbooks c ON csl.cookbook_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE csl.token = ? AND csl.is_active = 1
  `).bind(token).first<{ cookbook_id: string; user_id: string; name: string; description: string | null; owner_name: string }>();

  if (!link) {
    return errorResponse('Share link not found or has been revoked', 404, origin);
  }

  const recipes = await db.prepare(`
    SELECT r.* FROM recipes r
    JOIN cookbook_recipes cr ON r.id = cr.recipe_id
    WHERE cr.cookbook_id = ?
    ORDER BY cr.added_at DESC
  `).bind(link.cookbook_id).all<Recipe>();

  const formattedRecipes = recipes.results.map(r => ({
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
  }));

  return jsonResponse({
    cookbook: {
      id: link.cookbook_id,
      ownerId: link.user_id,
      name: link.name,
      description: link.description,
      ownerName: link.owner_name,
      recipeCount: formattedRecipes.length,
    },
    recipes: formattedRecipes,
  }, 200, corsHeaders(origin));
}

// Notification handlers
async function handleGetNotifications(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const notifications = await db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(user.id).all<{
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: string | null;
    is_read: number;
    created_at: number;
  }>();

  const formatted = notifications.results.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data ? JSON.parse(n.data) : null,
    isRead: n.is_read === 1,
    createdAt: n.created_at,
  }));

  const unreadCount = formatted.filter(n => !n.isRead).length;

  return jsonResponse({ notifications: formatted, unreadCount }, 200, corsHeaders(origin));
}

async function handleMarkNotificationRead(request: Request, db: D1Database, notificationId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  await db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
  `).bind(notificationId, user.id).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleMarkAllNotificationsRead(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  await db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE user_id = ?
  `).bind(user.id).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleClearAllNotifications(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  await db.prepare(`
    DELETE FROM notifications WHERE user_id = ?
  `).bind(user.id).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleAcceptInvite(request: Request, db: D1Database, inviteId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const invite = await db.prepare(`
    SELECT ci.*, c.name as cookbook_name, u.name as inviter_name
    FROM cookbook_invites ci
    JOIN cookbooks c ON ci.cookbook_id = c.id
    JOIN users u ON ci.invited_by_user_id = u.id
    WHERE ci.id = ? AND ci.invited_user_id = ? AND ci.status = ?
  `).bind(inviteId, user.id, 'pending').first<{
    id: string;
    cookbook_id: string;
    invited_by_user_id: string;
    cookbook_name: string;
    inviter_name: string;
  }>();

  if (!invite) {
    return errorResponse('Invite not found or already responded', 404, origin);
  }

  const now = Date.now();

  // Create the actual share
  const shareId = generateId();
  await db.prepare(`
    INSERT INTO cookbook_shares (id, cookbook_id, shared_with_user_id, shared_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(shareId, invite.cookbook_id, user.id, invite.invited_by_user_id, now).run();

  await copyCookbookRecipesToUserCollection(db, user.id, invite.cookbook_id, now);

  // Update invite status
  await db.prepare(`
    UPDATE cookbook_invites SET status = ? WHERE id = ?
  `).bind('accepted', inviteId).run();

  // Delete the notification
  await db.prepare(`
    DELETE FROM notifications WHERE user_id = ? AND type = ? AND data LIKE ?
  `).bind(user.id, 'cookbook_invite', `%"inviteId":"${inviteId}"%`).run();

  return jsonResponse({ success: true, cookbookId: invite.cookbook_id, cookbookName: invite.cookbook_name }, 200, corsHeaders(origin));
}

async function handleDeclineInvite(request: Request, db: D1Database, inviteId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const invite = await db.prepare(`
    SELECT * FROM cookbook_invites WHERE id = ? AND invited_user_id = ? AND status = ?
  `).bind(inviteId, user.id, 'pending').first();

  if (!invite) {
    return errorResponse('Invite not found or already responded', 404, origin);
  }

  // Update invite status
  await db.prepare(`
    UPDATE cookbook_invites SET status = ? WHERE id = ?
  `).bind('declined', inviteId).run();

  // Delete the notification
  await db.prepare(`
    DELETE FROM notifications WHERE user_id = ? AND type = ? AND data LIKE ?
  `).bind(user.id, 'cookbook_invite', `%"inviteId":"${inviteId}"%`).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

function parseLimitOffset(url: URL): { limit: number; offset: number } {
  const rawLimit = Number(url.searchParams.get('limit') || '20');
  const rawOffset = Number(url.searchParams.get('offset') || '0');

  return {
    limit: Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 50),
    offset: Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0),
  };
}

function formatPublicRecipe(
  recipe: Recipe & { owner_name: string | null },
  currentUserId?: string,
  options?: { savedCopyId?: string | null }
) {
  const formatted = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    ingredients: JSON.parse(recipe.ingredients),
    instructions: JSON.parse(recipe.instructions),
    tags: recipe.tags ? JSON.parse(recipe.tags) : [],
    imageUrl: recipe.image_url,
    sourceUrl: recipe.source_url,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    isPublic: recipe.is_public === 1,
    ownerId: recipe.owner_id,
    ownerName: recipe.owner_name,
    isOwner: currentUserId ? recipe.user_id === currentUserId : false,
    createdAt: recipe.created_at,
  };

  if (options) {
    return {
      ...formatted,
      isSaved: Boolean(options.savedCopyId),
      savedCopyId: options.savedCopyId || null,
    };
  }

  return formatted;
}

function recipesHaveSameSavedContent(candidate: Recipe, source: Recipe): boolean {
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

function isUneditedRecipeCopy(candidate: Recipe, source: Recipe): boolean {
  return candidate.source_recipe_id === source.id &&
    candidate.is_public === 0 &&
    recipesHaveSameSavedContent(candidate, source);
}

function isSavedRecipeMatch(candidate: Recipe, source: Recipe, includeOriginal: boolean): boolean {
  return (includeOriginal && candidate.id === source.id) || isUneditedRecipeCopy(candidate, source);
}

function cookbooksHaveSameSavedContent(candidate: Cookbook, source: Cookbook): boolean {
  return candidate.user_id !== source.user_id &&
    candidate.name === source.name &&
    (candidate.description || '') === (source.description || '') &&
    (candidate.cover_image || '') === (source.cover_image || '') &&
    candidate.is_system === 0 &&
    candidate.is_public === 0;
}

async function handleDiscoverRecipes(request: Request, db: D1Database): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);
  const url = new URL(request.url);
  const { limit, offset } = parseLimitOffset(url);
  const tags = (url.searchParams.get('tags') || '')
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);

  let whereClause = 'WHERE r.is_public = 1';
  const params: string[] = [];
  for (const tag of tags) {
    whereClause += ' AND r.tags LIKE ?';
    params.push(`%"${tag}"%`);
  }

  const count = await db.prepare(
    `SELECT COUNT(*) as count FROM recipes r ${whereClause}`
  ).bind(...params).first<{ count: number }>();

  const recipes = await db.prepare(
    `SELECT r.*, u.name as owner_name
     FROM recipes r
     JOIN users u ON r.owner_id = u.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all<Recipe & { owner_name: string | null }>();

  const formattedRecipes = await Promise.all(recipes.results.map(async recipe => {
    const savedCopyId = user
      ? await findExistingSavedRecipeId(db, user.id, recipe, false)
      : null;
    return formatPublicRecipe(recipe, user?.id, { savedCopyId });
  }));

  return jsonResponse(
    {
      recipes: formattedRecipes,
      total: count?.count || 0,
    },
    200,
    corsHeaders(origin)
  );
}

async function handleDiscoverCookbooks(request: Request, db: D1Database): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);
  const url = new URL(request.url);
  const { limit, offset } = parseLimitOffset(url);

  const count = await db.prepare(
    'SELECT COUNT(*) as count FROM cookbooks WHERE is_public = 1 AND is_system = 0'
  ).first<{ count: number }>();

  const cookbooks = await db.prepare(
    `SELECT c.*, COUNT(DISTINCT cr.recipe_id) as recipe_count, u.name as owner_name
     FROM cookbooks c
     LEFT JOIN cookbook_recipes cr ON c.id = cr.cookbook_id
     JOIN users u ON c.user_id = u.id
     WHERE c.is_public = 1 AND c.is_system = 0
     GROUP BY c.id
     ORDER BY c.updated_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<Cookbook & { recipe_count: number; owner_name: string }>();

  const formattedCookbooks = await Promise.all(cookbooks.results.map(async cookbook => {
    const savedCopyId = user
      ? await findExistingSavedCookbookId(db, user.id, cookbook, false)
      : null;

    return {
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
      isOwner: user ? cookbook.user_id === user.id : false,
      ownerName: cookbook.owner_name,
      isSaved: Boolean(savedCopyId),
      savedCopyId,
    };
  }));

  return jsonResponse(
    {
      cookbooks: formattedCookbooks,
      total: count?.count || 0,
    },
    200,
    corsHeaders(origin)
  );
}

async function handleDiscoverRecipe(request: Request, db: D1Database, recipeId: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);
  const recipe = await db.prepare(
    `SELECT r.*, u.name as owner_name
     FROM recipes r
     JOIN users u ON r.owner_id = u.id
     WHERE r.id = ? AND r.is_public = 1`
  ).bind(recipeId).first<Recipe & { owner_name: string | null }>();

  if (!recipe) {
    return errorResponse('Recipe not found', 404, origin);
  }

  const savedCopyId = user
    ? await findExistingSavedRecipeId(db, user.id, recipe, false)
    : null;

  return jsonResponse(
    { recipe: formatPublicRecipe(recipe, user?.id, { savedCopyId }) },
    200,
    corsHeaders(origin)
  );
}

async function handleDiscoverCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const origin = request.headers.get('Origin');
  const user = await getSessionUser(request, db);
  const cookbook = await db.prepare(
    `SELECT c.*, u.name as owner_name
     FROM cookbooks c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ? AND c.is_public = 1 AND c.is_system = 0`
  ).bind(cookbookId).first<Cookbook & { owner_name: string }>();

  if (!cookbook) {
    return errorResponse('Cookbook not found', 404, origin);
  }

  const recipes = await db.prepare(
    `SELECT r.*, u.name as owner_name
     FROM recipes r
     JOIN cookbook_recipes cr ON r.id = cr.recipe_id
     JOIN users u ON r.owner_id = u.id
     WHERE cr.cookbook_id = ?
     ORDER BY cr.added_at DESC`
  ).bind(cookbookId).all<Recipe & { owner_name: string | null }>();

  const savedCopyId = user
    ? await findExistingSavedCookbookId(db, user.id, cookbook, false)
    : null;
  const formattedRecipes = await Promise.all(recipes.results.map(async recipe => {
    const recipeSavedCopyId = user
      ? await findExistingSavedRecipeId(db, user.id, recipe, false)
      : null;
    return formatPublicRecipe(recipe, user?.id, { savedCopyId: recipeSavedCopyId });
  }));

  return jsonResponse(
    {
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
        isOwner: user ? cookbook.user_id === user.id : false,
        ownerName: cookbook.owner_name,
        isSaved: Boolean(savedCopyId),
        savedCopyId,
      },
      recipes: formattedRecipes,
    },
    200,
    corsHeaders(origin)
  );
}

// Discover - save a public cookbook to user's collection
async function handleDiscoverSaveCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Get the public cookbook
  const cookbook = await db.prepare('SELECT * FROM cookbooks WHERE id = ? AND is_public = 1')
    .bind(cookbookId)
    .first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found or not public', 404, origin);
  }

  const existingCookbookId = await findExistingSavedCookbookId(db, user.id, cookbook);
  if (existingCookbookId) {
    return jsonResponse({ id: existingCookbookId }, 200, corsHeaders(origin));
  }

  // Get all recipes in the cookbook
  const { results: cookbookRecipes } = await db.prepare(`
    SELECT r.* FROM recipes r
    JOIN cookbook_recipes cr ON r.id = cr.recipe_id
    WHERE cr.cookbook_id = ?
  `).bind(cookbookId).all<Recipe & { owner_id: string }>();

  const now = Date.now();
  const newCookbookId = generateId();

  // Create a copy of the cookbook
  await db.prepare(`
    INSERT INTO cookbooks (id, user_id, name, description, cover_image, source_cookbook_id, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newCookbookId,
    user.id,
    cookbook.name,
    cookbook.description,
    cookbook.cover_image,
    cookbook.id,
    0, // private
    now,
    now
  ).run();

  const collectionId = await getOrCreateRecipeCollection(db, user.id);

  // Copy each recipe and add to the new cookbook
  for (const recipe of cookbookRecipes || []) {
    let savedRecipeId = await findExistingSavedRecipeId(db, user.id, recipe);

    if (!savedRecipeId) {
      savedRecipeId = generateId();

      await db.prepare(`
        INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, source_recipe_id, is_public, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
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
      ).run();
    }

    // Add to new cookbook
    await db.prepare('INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)')
      .bind(newCookbookId, savedRecipeId, user.id, now)
      .run();

    // Also add to My Recipe Collection
    await db.prepare('INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)')
      .bind(collectionId, savedRecipeId, user.id, now)
      .run();
  }

  return jsonResponse({ id: newCookbookId }, 201, corsHeaders(origin));
}

async function findExistingSavedRecipeId(
  db: D1Database,
  userId: string,
  recipe: Recipe,
  includeOriginal = true
): Promise<string | null> {
  const { results } = await db.prepare(`
    SELECT * FROM recipes
    WHERE user_id = ?
      AND (id = ? OR source_recipe_id = ?)
    ORDER BY
      CASE
        WHEN id = ? THEN 0
        WHEN source_recipe_id = ? THEN 1
        ELSE 2
      END,
      created_at ASC
  `).bind(
    userId,
    recipe.id,
    recipe.id,
    recipe.id,
    recipe.id
  ).all<Recipe>();

  const existing = results.find(candidate =>
    isSavedRecipeMatch(candidate, recipe, includeOriginal)
  );

  return existing?.id || null;
}

async function copyCookbookRecipesToUserCollection(
  db: D1Database,
  userId: string,
  cookbookId: string,
  now: number = Date.now()
): Promise<void> {
  const collectionId = await getOrCreateRecipeCollection(db, userId);
  const { results: cookbookRecipes } = await db.prepare(`
    SELECT r.* FROM recipes r
    JOIN cookbook_recipes cr ON r.id = cr.recipe_id
    WHERE cr.cookbook_id = ?
  `).bind(cookbookId).all<Recipe>();

  for (const recipe of cookbookRecipes || []) {
    let savedRecipeId = await findExistingSavedRecipeId(db, userId, recipe);

    if (!savedRecipeId) {
      savedRecipeId = generateId();

      await db.prepare(`
        INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, source_recipe_id, is_public, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        savedRecipeId,
        userId,
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
        0,
        now
      ).run();
    }

    await db.prepare('INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)')
      .bind(collectionId, savedRecipeId, userId, now)
      .run();
  }

  await db.prepare('UPDATE cookbooks SET updated_at = ? WHERE id = ?')
    .bind(now, collectionId)
    .run();
}

async function getCookbookRecipeRows(db: D1Database, cookbookId: string): Promise<Recipe[]> {
  const { results } = await db.prepare(`
    SELECT r.* FROM recipes r
    JOIN cookbook_recipes cr ON r.id = cr.recipe_id
    WHERE cr.cookbook_id = ?
    ORDER BY cr.added_at ASC, r.id ASC
  `).bind(cookbookId).all<Recipe>();

  return results;
}

async function isUneditedCookbookCopy(db: D1Database, candidate: Cookbook, source: Cookbook): Promise<boolean> {
  if (candidate.source_cookbook_id !== source.id || !cookbooksHaveSameSavedContent(candidate, source)) {
    return false;
  }

  const sourceRecipes = await getCookbookRecipeRows(db, source.id);
  const candidateRecipes = await getCookbookRecipeRows(db, candidate.id);
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

async function findExistingSavedCookbookId(
  db: D1Database,
  userId: string,
  cookbook: Cookbook,
  includeOriginal = true
): Promise<string | null> {
  const { results } = await db.prepare(`
    SELECT * FROM cookbooks
    WHERE user_id = ?
      AND is_system = 0
      AND (id = ? OR source_cookbook_id = ?)
    ORDER BY
      CASE
        WHEN id = ? THEN 0
        WHEN source_cookbook_id = ? THEN 1
        ELSE 2
      END,
      created_at ASC
  `).bind(
    userId,
    cookbook.id,
    cookbook.id,
    cookbook.id,
    cookbook.id
  ).all<Cookbook>();

  for (const candidate of results) {
    if (includeOriginal && candidate.id === cookbook.id) {
      return candidate.id;
    }

    if (await isUneditedCookbookCopy(db, candidate, cookbook)) {
      return candidate.id;
    }
  }

  return null;
}

// Discover - save a public recipe to user's collection
async function handleDiscoverSaveRecipe(request: Request, db: D1Database, recipeId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  // Get the public recipe
  const recipe = await db.prepare('SELECT * FROM recipes WHERE id = ? AND is_public = 1')
    .bind(recipeId)
    .first<Recipe & { owner_id: string }>();

  if (!recipe) {
    return errorResponse('Recipe not found or not public', 404, origin);
  }

  const existingRecipeId = await findExistingSavedRecipeId(db, user.id, recipe);
  if (existingRecipeId) {
    return jsonResponse({ id: existingRecipeId }, 200, corsHeaders(origin));
  }

  // Create a copy of the recipe for the user
  const newRecipeId = generateId();
  const now = Date.now();

  await db.prepare(`
    INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, source_recipe_id, is_public, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newRecipeId,
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
  ).run();

  // Add to My Recipe Collection
  const collectionId = await getOrCreateRecipeCollection(db, user.id);
  await db.prepare('INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at) VALUES (?, ?, ?, ?)')
    .bind(collectionId, newRecipeId, user.id, now)
    .run();
  await db.prepare('UPDATE cookbooks SET updated_at = ? WHERE id = ?')
    .bind(now, collectionId)
    .run();

  return jsonResponse({ id: newRecipeId }, 201, corsHeaders(origin));
}

async function handleDiscoverUnsaveRecipe(request: Request, db: D1Database, recipeId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const recipe = await db.prepare('SELECT * FROM recipes WHERE id = ? AND is_public = 1')
    .bind(recipeId)
    .first<Recipe>();

  if (!recipe) {
    return errorResponse('Recipe not found or not public', 404, origin);
  }

  const savedCopyId = await findExistingSavedRecipeId(db, user.id, recipe, false);
  if (!savedCopyId) {
    return jsonResponse({ success: true, id: null }, 200, corsHeaders(origin));
  }

  await db.prepare('DELETE FROM cookbook_recipes WHERE recipe_id = ?')
    .bind(savedCopyId)
    .run();
  await db.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?')
    .bind(savedCopyId, user.id)
    .run();

  return jsonResponse({ success: true, id: savedCopyId }, 200, corsHeaders(origin));
}

async function handleDiscoverUnsaveCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

  const cookbook = await db.prepare('SELECT * FROM cookbooks WHERE id = ? AND is_public = 1 AND is_system = 0')
    .bind(cookbookId)
    .first<Cookbook>();

  if (!cookbook) {
    return errorResponse('Cookbook not found or not public', 404, origin);
  }

  const savedCopyId = await findExistingSavedCookbookId(db, user.id, cookbook, false);
  if (!savedCopyId) {
    return jsonResponse({ success: true, id: null }, 200, corsHeaders(origin));
  }

  await db.prepare('DELETE FROM cookbook_recipes WHERE cookbook_id = ?')
    .bind(savedCopyId)
    .run();
  await db.prepare('DELETE FROM cookbook_shares WHERE cookbook_id = ?')
    .bind(savedCopyId)
    .run();
  await db.prepare('DELETE FROM cookbook_share_links WHERE cookbook_id = ?')
    .bind(savedCopyId)
    .run();
  await db.prepare('DELETE FROM cookbooks WHERE id = ? AND user_id = ?')
    .bind(savedCopyId, user.id)
    .run();

  return jsonResponse({ success: true, id: savedCopyId }, 200, corsHeaders(origin));
}

async function addSampleRecipes(db: D1Database, userId: string): Promise<void> {
  const samples = [
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
  for (const recipe of samples) {
    const recipeId = generateId();
    recipeIds.push(recipeId);
    await db.prepare(`
      INSERT INTO recipes (id, user_id, owner_id, title, description, ingredients, instructions, tags, prep_time, cook_time, servings, image_url, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      recipeId,
      userId,
      userId,
      recipe.title,
      recipe.description,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.instructions),
      JSON.stringify(recipe.tags),
      recipe.prepTime,
      recipe.cookTime,
      recipe.servings,
      recipe.imageUrl,
      0,
      Date.now() - Math.random() * 86400000 * 3
    ).run();
  }

  // Add all sample recipes to the default "My Recipes" cookbook
  const collectionId = await getOrCreateRecipeCollection(db, userId);
  const now = Date.now();
  for (const recipeId of recipeIds) {
    await db.prepare(`
      INSERT INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at)
      VALUES (?, ?, ?, ?)
    `).bind(collectionId, recipeId, userId, now).run();
  }
}

// Main request handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    try {
      if (path === '/api/stripe/webhook' && method === 'POST') {
        return handleStripeWebhook(request, env);
      }

      // Auth routes
      if (path === '/api/auth/register' && method === 'POST') {
        return handleRegister(request, env.DB, env, ctx);
      }
      if (path === '/api/auth/login' && method === 'POST') {
        return handleLogin(request, env.DB, env);
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        return handleLogout(request, env.DB);
      }
      if (path === '/api/auth/session' && method === 'GET') {
        return handleGetSession(request, env.DB);
      }
      if (path === '/api/auth/profile' && method === 'PUT') {
        return handleUpdateProfile(request, env.DB);
      }
      if (path === '/api/auth/verify-email' && method === 'POST') {
        return handleVerifyEmail(request, env.DB);
      }
      if (path === '/api/auth/resend-verification' && method === 'POST') {
        return handleResendVerification(request, env.DB, env);
      }
      if (path === '/api/auth/forgot-password' && method === 'POST') {
        return handleForgotPassword(request, env.DB, env);
      }
      if (path === '/api/auth/reset-password' && method === 'POST') {
        return handleResetPassword(request, env.DB);
      }
      if (path === '/api/feedback' && method === 'POST') {
        return handleFeedback(request, env);
      }

      const profileFriendsMatch = path.match(/^\/api\/profiles\/([^/]+)\/friends$/);
      if (profileFriendsMatch && method === 'GET') {
        return handleGetProfileFriends(request, env.DB, profileFriendsMatch[1]);
      }

      const profileMatch = path.match(/^\/api\/profiles\/([^/]+)$/);
      if (profileMatch && method === 'GET') {
        return handleGetProfile(request, env.DB, profileMatch[1]);
      }

      if (path === '/api/friends' && method === 'POST') {
        return handleAddFriend(request, env.DB);
      }

      const removeFriendMatch = path.match(/^\/api\/friends\/([^/]+)$/);
      if (removeFriendMatch && method === 'DELETE') {
        return handleRemoveFriend(request, env.DB, removeFriendMatch[1]);
      }

      if (path === '/api/friend-requests/accept' && method === 'POST') {
        const friendRequestId = await getFriendRequestIdFromBody(request);
        if (!friendRequestId) {
          return errorResponse('Friend request id is required', 400, origin);
        }
        return handleAcceptFriendRequest(request, env.DB, friendRequestId);
      }

      if (path === '/api/friend-requests/decline' && method === 'POST') {
        const friendRequestId = await getFriendRequestIdFromBody(request);
        if (!friendRequestId) {
          return errorResponse('Friend request id is required', 400, origin);
        }
        return handleDeclineFriendRequest(request, env.DB, friendRequestId);
      }

      const acceptFriendRequestMatch = path.match(/^\/api\/friend-requests\/([^/]+)\/accept$/);
      if (acceptFriendRequestMatch && method === 'POST') {
        return handleAcceptFriendRequest(request, env.DB, decodeURIComponent(acceptFriendRequestMatch[1]));
      }

      const declineFriendRequestMatch = path.match(/^\/api\/friend-requests\/([^/]+)\/decline$/);
      if (declineFriendRequestMatch && method === 'POST') {
        return handleDeclineFriendRequest(request, env.DB, decodeURIComponent(declineFriendRequestMatch[1]));
      }

      // Proxy fetch for recipe import
      if (path === '/api/proxy-fetch' && method === 'POST') {
        try {
          const body = await request.json() as { url?: string };
          const targetUrl = body.url;

          if (!targetUrl || typeof targetUrl !== 'string') {
            return errorResponse('URL is required', 400, origin);
          }

          // Validate URL format
          let parsedUrl: URL;
          try {
            parsedUrl = new URL(targetUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
              return errorResponse('Invalid URL protocol', 400, origin);
            }
          } catch {
            return errorResponse('Invalid URL format', 400, origin);
          }

          // Fetch the page content
          const fetchResponse = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Recipesaurus/1.0; +https://recipesaurus.app)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          });

          if (!fetchResponse.ok) {
            return errorResponse(`Failed to fetch URL: ${fetchResponse.status}`, 400, origin);
          }

          const html = await fetchResponse.text();

          // Limit response size to prevent abuse
          const maxSize = 1024 * 1024; // 1MB
          const truncatedHtml = html.length > maxSize ? html.slice(0, maxSize) : html;

          return jsonResponse({ html: truncatedHtml }, 200, corsHeaders(origin));
        } catch (err) {
          console.error('Proxy fetch error:', err);
          return errorResponse('Failed to fetch URL', 500, origin);
        }
      }

      // Recipe routes
      if (path === '/api/recipes' && method === 'GET') {
        return handleGetRecipes(request, env.DB);
      }
      if (path === '/api/recipes' && method === 'POST') {
        return handleCreateRecipe(request, env.DB);
      }
      if (path === '/api/recipes/from-preview' && method === 'POST') {
        return handleSavePreviewRecipe(request, env.DB);
      }
      if (path === '/api/ai/meal-planner/usage' && method === 'GET') {
        return handleGetMealPlanUsage(request, env);
      }
      if (path === '/api/ai/meal-planner/history' && method === 'GET') {
        return handleGetMealPlanHistory(request, env);
      }
      if (path === '/api/ai/meal-planner' && method === 'POST') {
        return handleCreateMealPlan(request, env);
      }
      if (path === '/api/billing/status' && method === 'GET') {
        return handleGetBillingStatus(request, env);
      }
      if (path === '/api/billing/create-checkout-session' && method === 'POST') {
        return handleCreateCheckoutSession(request, env);
      }
      if (path === '/api/billing/create-portal-session' && method === 'POST') {
        return handleCreatePortalSession(request, env);
      }
      if (path === '/api/billing/cancel-subscription' && method === 'POST') {
        return handleCancelSubscription(request, env);
      }
      if (path === '/api/billing/reinstate-subscription' && method === 'POST') {
        return handleReinstateSubscription(request, env);
      }
      if (path === '/api/recipe-shares' && method === 'POST') {
        return handleCreateRecipeShareLink(request, env.DB);
      }
      if (path === '/api/recipe-shares/share' && method === 'POST') {
        return handleShareRecipeWithUser(request, env.DB);
      }
      const acceptRecipeShareMatch = path.match(/^\/api\/recipe-shares\/([^/]+)\/accept$/);
      if (acceptRecipeShareMatch && method === 'POST') {
        return handleAcceptRecipeShare(request, env.DB, decodeURIComponent(acceptRecipeShareMatch[1]));
      }
      const declineRecipeShareMatch = path.match(/^\/api\/recipe-shares\/([^/]+)\/decline$/);
      if (declineRecipeShareMatch && method === 'POST') {
        return handleDeclineRecipeShare(request, env.DB, decodeURIComponent(declineRecipeShareMatch[1]));
      }
      const recipeShareMatch = path.match(/^\/api\/recipe-shares\/([^/]+)$/);
      if (recipeShareMatch && method === 'GET') {
        return handleGetSharedRecipe(request, env.DB, recipeShareMatch[1]);
      }
      // Get cookbooks containing a recipe
      const recipeCookbooksMatch = path.match(/^\/api\/recipes\/([^/]+)\/cookbooks$/);
      if (recipeCookbooksMatch && method === 'GET') {
        return handleGetCookbooksForRecipe(request, env.DB, recipeCookbooksMatch[1]);
      }
      if (path.startsWith('/api/recipes/') && method === 'DELETE') {
        const recipeId = path.split('/').pop()!;
        return handleDeleteRecipe(request, env.DB, recipeId);
      }
      if (path.startsWith('/api/recipes/') && method === 'PUT') {
        const recipeId = path.split('/').pop()!;
        return handleUpdateRecipe(request, env.DB, recipeId);
      }

      // Cookbook routes
      if (path === '/api/cookbooks' && method === 'GET') {
        return handleGetCookbooks(request, env.DB);
      }
      if (path === '/api/cookbooks' && method === 'POST') {
        return handleCreateCookbook(request, env.DB);
      }

      // Cookbook detail routes
      const cookbookMatch = path.match(/^\/api\/cookbooks\/([^/]+)$/);
      if (cookbookMatch) {
        const cookbookId = cookbookMatch[1];
        if (method === 'GET') return handleGetCookbook(request, env.DB, cookbookId);
        if (method === 'PUT') return handleUpdateCookbook(request, env.DB, cookbookId);
        if (method === 'DELETE') return handleDeleteCookbook(request, env.DB, cookbookId);
      }

      // Cookbook recipe management
      const cookbookRecipesMatch = path.match(/^\/api\/cookbooks\/([^/]+)\/recipes$/);
      if (cookbookRecipesMatch && method === 'POST') {
        return handleAddRecipeToCookbook(request, env.DB, cookbookRecipesMatch[1]);
      }

      const cookbookRecipeMatch = path.match(/^\/api\/cookbooks\/([^/]+)\/recipes\/([^/]+)$/);
      if (cookbookRecipeMatch && method === 'DELETE') {
        return handleRemoveRecipeFromCookbook(request, env.DB, cookbookRecipeMatch[1], cookbookRecipeMatch[2]);
      }

      // Cookbook sharing - by platform user
      const shareMatch = path.match(/^\/api\/cookbooks\/([^/]+)\/share$/);
      if (shareMatch && method === 'POST') {
        return handleShareCookbook(request, env.DB, shareMatch[1]);
      }

      // Cookbook sharing - remove user
      const removeShareMatch = path.match(/^\/api\/cookbooks\/([^/]+)\/share\/([^/]+)$/);
      if (removeShareMatch && method === 'DELETE') {
        return handleRemoveShare(request, env.DB, removeShareMatch[1], removeShareMatch[2]);
      }

      // Cookbook sharing - list shares
      const sharesMatch = path.match(/^\/api\/cookbooks\/([^/]+)\/shares$/);
      if (sharesMatch && method === 'GET') {
        return handleGetShares(request, env.DB, sharesMatch[1]);
      }

      // Cookbook share links
      const shareLinkMatch = path.match(/^\/api\/cookbooks\/([^/]+)\/share-link$/);
      if (shareLinkMatch && method === 'POST') {
        return handleCreateShareLink(request, env.DB, shareLinkMatch[1]);
      }

      const revokeShareLinkMatch = path.match(/^\/api\/cookbooks\/([^/]+)\/share-link\/([^/]+)$/);
      if (revokeShareLinkMatch && method === 'DELETE') {
        return handleRevokeShareLink(request, env.DB, revokeShareLinkMatch[1], revokeShareLinkMatch[2]);
      }

      // Public shared cookbook view
      const sharedMatch = path.match(/^\/api\/shared\/([^/]+)$/);
      if (sharedMatch && method === 'GET') {
        return handleGetSharedCookbook(request, env.DB, sharedMatch[1]);
      }

      // Discover - list public recipes and cookbooks
      if (path === '/api/discover/recipes' && method === 'GET') {
        return handleDiscoverRecipes(request, env.DB);
      }
      if (path === '/api/discover/cookbooks' && method === 'GET') {
        return handleDiscoverCookbooks(request, env.DB);
      }

      // Discover - public detail routes
      const discoverRecipeMatch = path.match(/^\/api\/discover\/recipes\/([^/]+)$/);
      if (discoverRecipeMatch && method === 'GET') {
        return handleDiscoverRecipe(request, env.DB, discoverRecipeMatch[1]);
      }
      const discoverCookbookMatch = path.match(/^\/api\/discover\/cookbooks\/([^/]+)$/);
      if (discoverCookbookMatch && method === 'GET') {
        return handleDiscoverCookbook(request, env.DB, discoverCookbookMatch[1]);
      }

      // Discover - save recipe route
      const discoverSaveRecipeMatch = path.match(/^\/api\/discover\/recipes\/([^/]+)\/save$/);
      if (discoverSaveRecipeMatch && method === 'POST') {
        return handleDiscoverSaveRecipe(request, env.DB, discoverSaveRecipeMatch[1]);
      }
      if (discoverSaveRecipeMatch && method === 'DELETE') {
        return handleDiscoverUnsaveRecipe(request, env.DB, discoverSaveRecipeMatch[1]);
      }

      // Discover - save cookbook route
      const discoverSaveCookbookMatch = path.match(/^\/api\/discover\/cookbooks\/([^/]+)\/save$/);
      if (discoverSaveCookbookMatch && method === 'POST') {
        return handleDiscoverSaveCookbook(request, env.DB, discoverSaveCookbookMatch[1]);
      }
      if (discoverSaveCookbookMatch && method === 'DELETE') {
        return handleDiscoverUnsaveCookbook(request, env.DB, discoverSaveCookbookMatch[1]);
      }

      // Notification routes
      if (path === '/api/notifications' && method === 'GET') {
        return handleGetNotifications(request, env.DB);
      }
      if (path === '/api/notifications/read-all' && method === 'POST') {
        return handleMarkAllNotificationsRead(request, env.DB);
      }
      if (path === '/api/notifications/clear-all' && method === 'DELETE') {
        return handleClearAllNotifications(request, env.DB);
      }
      const notificationReadMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
      if (notificationReadMatch && method === 'POST') {
        return handleMarkNotificationRead(request, env.DB, notificationReadMatch[1]);
      }

      // Invite routes
      const acceptInviteMatch = path.match(/^\/api\/invites\/([^/]+)\/accept$/);
      if (acceptInviteMatch && method === 'POST') {
        return handleAcceptInvite(request, env.DB, acceptInviteMatch[1]);
      }
      const declineInviteMatch = path.match(/^\/api\/invites\/([^/]+)\/decline$/);
      if (declineInviteMatch && method === 'POST') {
        return handleDeclineInvite(request, env.DB, declineInviteMatch[1]);
      }

      return errorResponse('Not found', 404, origin);
    } catch (error) {
      console.error('Error:', error);
      return errorResponse('Internal server error', 500, origin);
    }
  },
};
