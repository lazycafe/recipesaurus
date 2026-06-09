// Core types for backend abstraction

export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
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
  owner_id: string; // Original creator of the recipe
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
  source_recipe_id?: string | null;
  is_public: number; // 0 = private, 1 = public
  created_at: number;
}

export interface DbCookbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_system: number; // 0 = normal, 1 = system cookbook (e.g., Liked Recipes)
  system_type: string | null; // 'liked' for Liked Recipes
  source_cookbook_id?: string | null;
  is_public: number; // 0 = private, 1 = public
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
  expires_at: number;
}

export interface DbRecipeShareLink {
  id: string;
  token: string;
  recipe_data: string;
  created_at: number;
}

export interface DbLoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  attempted_at: number;
  success: number;
}

export interface DbFriendship {
  user_a_id: string;
  user_b_id: string;
  created_at: number;
}

export interface DbFriendRequest {
  id: string;
  requester_id: string;
  requested_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
  responded_at: number | null;
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
  code?: string;
  headers?: Record<string, string>;
}

// User public info (without password)
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ProfileUserInfo {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface UserProfileInfo {
  user: ProfileUserInfo;
  isCurrentUser: boolean;
  isFriend: boolean;
  hasPendingFriendRequest: boolean;
  incomingFriendRequestId?: string | null;
  friendCount: number;
  recipeCount: number;
  cookbookCount: number;
  recipes: RecipeInfo[];
  cookbooks: CookbookInfo[];
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
  isPublic: boolean;
  ownerId: string;
  ownerName?: string | null;
  isOwner?: boolean; // true if current user is the owner
  isSaved?: boolean;
  savedCopyId?: string | null;
  createdAt: number;
  addedByUserId?: string | null;
  addedByUserName?: string | null;
}

// Public cookbook format
export interface CookbookInfo {
  id: string;
  ownerId?: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  recipeCount: number;
  isSystem: boolean;
  systemType?: string | null;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  isOwner: boolean;
  ownerName?: string;
  isSaved?: boolean;
  savedCopyId?: string | null;
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
  expiresAt: number;
}

export interface RecipeSharePayload {
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

export interface RecipeShareLinkInfo {
  token: string;
  createdAt: number;
}

// AI meal planning
export interface DbAiMealPlanRequest {
  id: string;
  user_id: string;
  prompt: string;
  response: string;
  created_at: number;
}

export interface DbUserSubscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: number;
  created_at: number;
  updated_at: number;
}

// Notification info
export interface NotificationInfo {
  id: string;
  type: 'cookbook_invite' | 'recipe_added' | 'friend_request' | 'friend_request_accepted' | 'recipe_share';
  title: string;
  message: string;
  data: {
    inviteId?: string;
    friendRequestId?: string;
    requesterId?: string;
    requesterName?: string;
    friendId?: string;
    friendName?: string;
    accepterId?: string;
    accepterName?: string;
    cookbookId?: string;
    cookbookName?: string;
    recipeId?: string;
    recipeTitle?: string;
    shareToken?: string;
    invitedBy?: string;
    addedBy?: string;
    sharedBy?: string;
  } | null;
  isRead: boolean;
  createdAt: number;
}
