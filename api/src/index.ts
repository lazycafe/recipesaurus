export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  created_at: number;
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
  created_at: number;
}

interface Cookbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
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

// Crypto utilities
const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Rate limiting
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

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

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
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

function errorResponse(message: string, status = 400, origin?: string | null): Response {
  return jsonResponse({ error: message }, status, corsHeaders(origin ?? null));
}

function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;
}

function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
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
    'http://localhost:5173',
    'http://localhost:4173',
    'https://recipesaurus.pages.dev',
    'https://recipesaurus-git-main.pages.dev',
    'https://recipesaurus.ai',
    'https://www.recipesaurus.ai',
  ];

  // Allow any *.pages.dev subdomain for Cloudflare Pages previews
  const isAllowed = origin && (
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

// Route handlers
async function handleRegister(request: Request, db: D1Database): Promise<Response> {
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

  // Create user
  const userId = generateId();
  await db.prepare(
    'INSERT INTO users (id, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, normalizedEmail, name.trim(), hash, salt, Date.now()).run();

  // Create session
  const sessionId = generateId();
  const expiresAt = Date.now() + SESSION_DURATION;
  await db.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, userId, Date.now(), expiresAt).run();

  // Add sample recipes for new user
  await addSampleRecipes(db, userId);

  return jsonResponse(
    { user: { id: userId, email: normalizedEmail, name: name.trim() }, token: sessionId },
    200,
    {
      ...corsHeaders(origin),
      'Set-Cookie': setCookie('session', sessionId, SESSION_DURATION / 1000),
    }
  );
}

async function handleLogin(request: Request, db: D1Database): Promise<Response> {
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

  // Record successful attempt
  await recordLoginAttempt(db, normalizedEmail, ip, true);

  // Create session
  const sessionId = generateId();
  const expiresAt = Date.now() + SESSION_DURATION;
  await db.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, user.id, Date.now(), expiresAt).run();

  return jsonResponse(
    { user: { id: user.id, email: user.email, name: user.name }, token: sessionId },
    200,
    {
      ...corsHeaders(origin),
      'Set-Cookie': setCookie('session', sessionId, SESSION_DURATION / 1000),
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
  return jsonResponse(
    { success: true },
    200,
    {
      ...corsHeaders(origin),
      'Set-Cookie': clearCookie('session'),
    }
  );
}

async function handleGetSession(request: Request, db: D1Database): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return jsonResponse({ user: null }, 200, corsHeaders(origin));
  }

  return jsonResponse(
    { user: { id: user.id, email: user.email, name: user.name } },
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
    'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all<Recipe>();

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

  return jsonResponse({ recipes: formattedRecipes }, 200, corsHeaders(origin));
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
  };

  const recipeId = generateId();
  await db.prepare(`
    INSERT INTO recipes (id, user_id, title, description, ingredients, instructions, tags, image_url, source_url, prep_time, cook_time, servings, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    recipeId,
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
    Date.now()
  ).run();

  return jsonResponse({ id: recipeId }, 201, corsHeaders(origin));
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
      servings = ?
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
    name: c.name,
    description: c.description,
    coverImage: c.cover_image || null,
    recipeCount: c.recipe_count || 0,
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

  const body = await request.json() as { name: string; description?: string; coverImage?: string };

  if (!body.name?.trim()) {
    return errorResponse('Cookbook name is required', 400, origin);
  }

  const cookbookId = generateId();
  const now = Date.now();

  await db.prepare(`
    INSERT INTO cookbooks (id, user_id, name, description, cover_image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(cookbookId, user.id, body.name.trim(), body.description?.trim() || null, body.coverImage?.trim() || null, now, now).run();

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
    createdAt: r.created_at,
    addedByUserId: r.added_by_user_id,
    addedByUserName: r.added_by_user_name,
  }));

  return jsonResponse({
    cookbook: {
      id: cookbook.id,
      name: cookbook.name,
      description: cookbook.description,
      coverImage: cookbook.cover_image,
      recipeCount: formattedRecipes.length,
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

  const body = await request.json() as { name?: string; description?: string; coverImage?: string | null };

  const newName = body.name?.trim() || cookbook.name;
  const newDescription = body.description !== undefined ? (body.description?.trim() || null) : cookbook.description;
  const newCoverImage = body.coverImage !== undefined ? (body.coverImage?.trim() || null) : cookbook.cover_image;

  await db.prepare(`
    UPDATE cookbooks SET name = ?, description = ?, cover_image = ?, updated_at = ? WHERE id = ?
  `).bind(newName, newDescription, newCoverImage, Date.now(), cookbookId).run();

  return jsonResponse({ success: true }, 200, corsHeaders(origin));
}

async function handleDeleteCookbook(request: Request, db: D1Database, cookbookId: string): Promise<Response> {
  const user = await getSessionUser(request, db);
  const origin = request.headers.get('Origin');

  if (!user) {
    return errorResponse('Unauthorized', 401, origin);
  }

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

  // Add to cookbook (ignore if already exists)
  await db.prepare(`
    INSERT OR IGNORE INTO cookbook_recipes (cookbook_id, recipe_id, added_by_user_id, added_at)
    VALUES (?, ?, ?, ?)
  `).bind(cookbookId, body.recipeId, user.id, Date.now()).run();

  // Update cookbook timestamp
  await db.prepare('UPDATE cookbooks SET updated_at = ? WHERE id = ?').bind(Date.now(), cookbookId).run();

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
  await db.prepare('UPDATE cookbooks SET updated_at = ? WHERE id = ?').bind(Date.now(), cookbookId).run();

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

  const body = await request.json() as { email: string };

  if (!body.email?.trim()) {
    return errorResponse('Email is required', 400, origin);
  }

  const targetUser = await db.prepare(
    'SELECT id, name FROM users WHERE email = ?'
  ).bind(body.email.toLowerCase().trim()).first<{ id: string; name: string }>();

  if (!targetUser) {
    return errorResponse('No user found with that email', 404, origin);
  }

  if (targetUser.id === user.id) {
    return errorResponse('Cannot share with yourself', 400, origin);
  }

  // Check if already shared
  const existing = await db.prepare(
    'SELECT id FROM cookbook_shares WHERE cookbook_id = ? AND shared_with_user_id = ?'
  ).bind(cookbookId, targetUser.id).first();

  if (existing) {
    return errorResponse('Cookbook is already shared with this user', 400, origin);
  }

  const shareId = generateId();
  await db.prepare(`
    INSERT INTO cookbook_shares (id, cookbook_id, shared_with_user_id, shared_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(shareId, cookbookId, targetUser.id, user.id, Date.now()).run();

  return jsonResponse({ success: true, sharedWith: { id: targetUser.id, name: targetUser.name } }, 200, corsHeaders(origin));
}

async function handleRemoveShare(request: Request, db: D1Database, cookbookId: string, userId: string): Promise<Response> {
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
    SELECT csl.cookbook_id, c.name, c.description, u.name as owner_name
    FROM cookbook_share_links csl
    JOIN cookbooks c ON csl.cookbook_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE csl.token = ? AND csl.is_active = 1
  `).bind(token).first<{ cookbook_id: string; name: string; description: string | null; owner_name: string }>();

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
      name: link.name,
      description: link.description,
      ownerName: link.owner_name,
      recipeCount: formattedRecipes.length,
    },
    recipes: formattedRecipes,
  }, 200, corsHeaders(origin));
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
    },
  ];

  for (const recipe of samples) {
    await db.prepare(`
      INSERT INTO recipes (id, user_id, title, description, ingredients, instructions, tags, prep_time, cook_time, servings, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateId(),
      userId,
      recipe.title,
      recipe.description,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.instructions),
      JSON.stringify(recipe.tags),
      recipe.prepTime,
      recipe.cookTime,
      recipe.servings,
      Date.now() - Math.random() * 86400000 * 3
    ).run();
  }
}

// Main request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
      // Auth routes
      if (path === '/api/auth/register' && method === 'POST') {
        return handleRegister(request, env.DB);
      }
      if (path === '/api/auth/login' && method === 'POST') {
        return handleLogin(request, env.DB);
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        return handleLogout(request, env.DB);
      }
      if (path === '/api/auth/session' && method === 'GET') {
        return handleGetSession(request, env.DB);
      }

      // Recipe routes
      if (path === '/api/recipes' && method === 'GET') {
        return handleGetRecipes(request, env.DB);
      }
      if (path === '/api/recipes' && method === 'POST') {
        return handleCreateRecipe(request, env.DB);
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

      // Cookbook sharing - by email
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

      return errorResponse('Not found', 404, origin);
    } catch (error) {
      console.error('Error:', error);
      return errorResponse('Internal server error', 500, origin);
    }
  },
};
