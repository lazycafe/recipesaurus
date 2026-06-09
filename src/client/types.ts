// Core types for the client abstraction layer

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Recipe {
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
  isPublic?: boolean;
  ownerId?: string;
  ownerName?: string | null;
  isOwner?: boolean;
  isSaved?: boolean;
  savedCopyId?: string | null;
  createdAt: number;
  addedByUserId?: string | null;
  addedByUserName?: string | null;
}

export interface Cookbook {
  id: string;
  ownerId?: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  recipeCount: number;
  isSystem?: boolean;
  systemType?: string | null;
  isPublic?: boolean;
  createdAt: number;
  updatedAt: number;
  isOwner: boolean;
  ownerName?: string;
  isSaved?: boolean;
  savedCopyId?: string | null;
}

export interface CookbookShare {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sharedAt: number;
}

export interface CookbookShareLink {
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

export interface RecipeShareLink {
  token: string;
  createdAt: number;
}

export interface ProfileUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  badges?: ProfileBadge[];
}

export interface ProfileBadge {
  id: string;
  label: string;
  grantedAt: number;
}

export interface UserProfile {
  user: ProfileUser;
  isCurrentUser: boolean;
  isFriend: boolean;
  hasPendingFriendRequest: boolean;
  incomingFriendRequestId?: string | null;
  friendCount: number;
  recipeCount: number;
  cookbookCount: number;
  recipes: Recipe[];
  cookbooks: Cookbook[];
}

export interface CreateRecipeData {
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
}

export interface UpdateRecipeData extends Partial<CreateRecipeData> {}

export interface CreateCookbookData {
  name: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
}

export interface UpdateCookbookData {
  name?: string;
  description?: string;
  coverImage?: string | null;
  isPublic?: boolean;
}

export interface MealPlanUsage {
  weeklyLimit: number;
  usedThisWeek: number;
  remainingRequests: number;
  windowStartsAt: number;
  nextResetAt: number | null;
  isPaid: boolean;
  planName: string;
  priceCents: number | null;
}

export interface MealPlanMentionedRecipe {
  id: string;
  title: string;
}

export interface MealPlanHistoryItem {
  id: string;
  prompt: string;
  suggestion: string;
  mentionedRecipes: MealPlanMentionedRecipe[];
  cookbookName: string;
  createdAt: number;
  recipeCount: number;
}

export interface MealPlanResult extends MealPlanHistoryItem {
  usage: MealPlanUsage;
}

export interface BillingStatus {
  isPaid: boolean;
  planName: string;
  priceCents: number;
  currency: string;
  interval: 'month' | string;
  freeWeeklyLimit: number;
  paidWeeklyLimit: number;
  weeklyLimit: number;
  subscription: {
    status: string;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface BillingSession {
  url: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
  code?: string;
}

// Transport layer interface - abstracts HTTP vs in-memory communication
export interface ITransport {
  request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>>;
}

// Client interface - the main abstraction used by React components
export interface IClient {
  auth: {
    getSession(): Promise<ApiResponse<{ user: User | null }>>;
    login(email: string, password: string): Promise<ApiResponse<{ user: User; token?: string; requiresVerification?: boolean; email?: string }>>;
    register(email: string, name: string, password: string): Promise<ApiResponse<{ user?: User; token?: string; requiresVerification?: boolean; email?: string }>>;
    logout(): Promise<ApiResponse<{ success: boolean }>>;
    updateProfile(data: { name?: string; avatarUrl?: string | null }): Promise<ApiResponse<{ user: User }>>;
    verifyEmail(token: string): Promise<ApiResponse<{ user: User; token?: string; verified?: boolean }>>;
    resendVerification(email: string): Promise<ApiResponse<{ success: boolean; message?: string }>>;
    forgotPassword(email: string): Promise<ApiResponse<{ message: string }>>;
    resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>>;
  };

  recipes: {
    list(): Promise<ApiResponse<{ recipes: Recipe[] }>>;
    create(data: CreateRecipeData): Promise<ApiResponse<{ id: string }>>;
    update(id: string, data: UpdateRecipeData): Promise<ApiResponse<{ success: boolean }>>;
    delete(id: string): Promise<ApiResponse<{ success: boolean }>>;
    getCookbooksForRecipe(recipeId: string): Promise<ApiResponse<{ cookbookIds: string[] }>>;
    createShareLink(data: RecipeSharePayload): Promise<ApiResponse<RecipeShareLink>>;
    shareWithUser(data: RecipeSharePayload, userId: string): Promise<ApiResponse<{ success: boolean; sharedWith?: ProfileUser; shareLink?: RecipeShareLink }>>;
    getShared(token: string): Promise<ApiResponse<{ recipe: RecipeSharePayload }>>;
    acceptShare(token: string): Promise<ApiResponse<{ success: boolean; recipeId: string; recipeTitle: string }>>;
    declineShare(token: string): Promise<ApiResponse<{ success: boolean }>>;
    saveFromPreview(data: {
      title: string;
      description: string;
      ingredients: string[];
      instructions: string[];
      prepTime?: string;
      cookTime?: string;
      servings?: string;
      imageUrl?: string;
      sourceUrl: string;
    }): Promise<ApiResponse<{ id: string; collectionId?: string }>>;
  };

  cookbooks: {
    list(): Promise<ApiResponse<{ owned: Cookbook[]; shared: Cookbook[] }>>;
    get(id: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>>;
    create(data: CreateCookbookData): Promise<ApiResponse<{ id: string }>>;
    update(id: string, data: UpdateCookbookData): Promise<ApiResponse<{ success: boolean }>>;
    delete(id: string): Promise<ApiResponse<{ success: boolean }>>;
    addRecipe(cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>>;
    removeRecipe(cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>>;
    shareWithUser(cookbookId: string, userId: string): Promise<ApiResponse<{ success: boolean; sharedWith?: { id: string; name: string } }>>;
    shareByEmail(cookbookId: string, email: string): Promise<ApiResponse<{ success: boolean; message?: string; sharedWith?: { id: string; name: string } }>>;
    removeShare(cookbookId: string, userId: string): Promise<ApiResponse<{ success: boolean }>>;
    getShares(cookbookId: string): Promise<ApiResponse<{ shares: CookbookShare[]; links: CookbookShareLink[] }>>;
    createShareLink(cookbookId: string): Promise<ApiResponse<CookbookShareLink>>;
    revokeShareLink(cookbookId: string, linkId: string): Promise<ApiResponse<{ success: boolean }>>;
    getShared(token: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>>;
  };

  notifications: {
    list(): Promise<ApiResponse<{ notifications: Notification[]; unreadCount: number }>>;
    markRead(notificationId: string): Promise<ApiResponse<{ success: boolean }>>;
    markAllRead(): Promise<ApiResponse<{ success: boolean }>>;
    clearAll(): Promise<ApiResponse<{ success: boolean }>>;
  };

  invites: {
    accept(inviteId: string): Promise<ApiResponse<{ success: boolean; cookbookId: string; cookbookName: string }>>;
    decline(inviteId: string): Promise<ApiResponse<{ success: boolean }>>;
  };

  ai: {
    getMealPlanUsage(): Promise<ApiResponse<{ usage: MealPlanUsage }>>;
    getMealPlanHistory(): Promise<ApiResponse<{ history: MealPlanHistoryItem[] }>>;
    createMealPlan(request: string): Promise<ApiResponse<MealPlanResult>>;
  };

  billing: {
    getStatus(): Promise<ApiResponse<{ billing: BillingStatus }>>;
    createCheckoutSession(): Promise<ApiResponse<BillingSession>>;
    createPortalSession(): Promise<ApiResponse<BillingSession>>;
    cancelSubscription(): Promise<ApiResponse<{ billing: BillingStatus }>>;
    reinstateSubscription(): Promise<ApiResponse<{ billing: BillingStatus }>>;
  };

  discover: {
    recipes(options?: { limit?: number; offset?: number; tags?: string[]; query?: string }): Promise<ApiResponse<{ recipes: Recipe[]; total: number }>>;
    cookbooks(options?: { limit?: number; offset?: number; query?: string }): Promise<ApiResponse<{ cookbooks: Cookbook[]; total: number }>>;
    getRecipe(id: string): Promise<ApiResponse<{ recipe: Recipe }>>;
    getCookbook(id: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>>;
    saveRecipe(recipeId: string): Promise<ApiResponse<{ id: string }>>;
    saveCookbook(cookbookId: string): Promise<ApiResponse<{ id: string }>>;
    unsaveRecipe(recipeId: string): Promise<ApiResponse<{ success: boolean; id?: string | null }>>;
    unsaveCookbook(cookbookId: string): Promise<ApiResponse<{ success: boolean; id?: string | null }>>;
  };

  profile: {
    get(userId: string): Promise<ApiResponse<{ profile: UserProfile }>>;
    listFriends(userId: string): Promise<ApiResponse<{ friends: ProfileUser[] }>>;
    addFriend(data: { userId?: string; email?: string }): Promise<ApiResponse<{ success?: boolean; message?: string; friend?: ProfileUser }>>;
    removeFriend(userId: string): Promise<ApiResponse<{ success: boolean }>>;
    acceptFriendRequest(friendRequestId: string): Promise<ApiResponse<{ success: boolean; friend: ProfileUser }>>;
    declineFriendRequest(friendRequestId: string): Promise<ApiResponse<{ success: boolean }>>;
  };
}

export interface Notification {
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

// Token storage interface - allows different storage strategies
export interface ITokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
}
