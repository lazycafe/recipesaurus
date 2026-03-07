// Core types for the client abstraction layer

export interface User {
  id: string;
  email: string;
  name: string;
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
  createdAt: number;
  addedByUserId?: string | null;
  addedByUserName?: string | null;
}

export interface Cookbook {
  id: string;
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
  coverImage?: string;
  isPublic?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
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
    shareByEmail(cookbookId: string, email: string): Promise<ApiResponse<{ success: boolean; sharedWith?: { id: string; name: string } }>>;
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

  discover: {
    recipes(options?: { limit?: number; offset?: number; tags?: string[] }): Promise<ApiResponse<{ recipes: Recipe[]; total: number }>>;
    cookbooks(options?: { limit?: number; offset?: number }): Promise<ApiResponse<{ cookbooks: Cookbook[]; total: number }>>;
    getRecipe(id: string): Promise<ApiResponse<{ recipe: Recipe }>>;
    getCookbook(id: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>>;
    saveRecipe(recipeId: string): Promise<ApiResponse<{ id: string }>>;
  };
}

export interface Notification {
  id: string;
  type: 'cookbook_invite' | 'recipe_added';
  title: string;
  message: string;
  data: {
    inviteId?: string;
    cookbookId?: string;
    cookbookName?: string;
    recipeId?: string;
    invitedBy?: string;
    addedBy?: string;
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
