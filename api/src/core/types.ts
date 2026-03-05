// Core types for backend abstraction

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  created_at: number;
}

export interface DbSession {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}

export interface DbRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string;
  ingredients: string; // JSON string
  instructions: string; // JSON string
  tags: string; // JSON string
  image_url: string | null;
  source_url: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: string | null;
  created_at: number;
}

export interface DbCookbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  created_at: number;
  updated_at: number;
}

export interface DbCookbookRecipe {
  cookbook_id: string;
  recipe_id: string;
  added_by_user_id: string | null;
  added_at: number;
}

export interface DbCookbookShare {
  id: string;
  cookbook_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  created_at: number;
}

export interface DbCookbookShareLink {
  id: string;
  cookbook_id: string;
  token: string;
  is_active: number;
  created_at: number;
}

export interface DbLoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  attempted_at: number;
  success: number;
}

// Query result types
export interface QueryResult<T> {
  results: T[];
}

// Database adapter interface
export interface IDatabaseAdapter {
  // Generic query methods
  get<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  all<T>(sql: string, ...params: unknown[]): Promise<QueryResult<T>>;
  run(sql: string, ...params: unknown[]): Promise<void>;

  // Transaction support (optional for some implementations)
  transaction?<T>(fn: () => Promise<T>): Promise<T>;
}

// Request context for handlers
export interface RequestContext {
  sessionId?: string;
  ip?: string | null;
}

// API response wrapper
export interface ApiResult<T> {
  data?: T;
  error?: string;
  status: number;
  headers?: Record<string, string>;
}

// User public info (without password)
export interface UserInfo {
  id: string;
  email: string;
  name: string;
}

// Public recipe format
export interface RecipeInfo {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  imageUrl?: string | null;
  sourceUrl?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: string | null;
  createdAt: number;
  addedByUserId?: string | null;
  addedByUserName?: string | null;
}

// Public cookbook format
export interface CookbookInfo {
  id: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  recipeCount: number;
  createdAt: number;
  updatedAt: number;
  isOwner: boolean;
  ownerName?: string;
}

// Cookbook share info
export interface CookbookShareInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sharedAt: number;
}

// Cookbook share link info
export interface CookbookShareLinkInfo {
  id: string;
  token: string;
  isActive: boolean;
  createdAt: number;
}
