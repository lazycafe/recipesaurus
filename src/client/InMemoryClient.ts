import type {
  IClient,
  ITokenStorage,
  ApiResponse,
  User,
  Recipe,
  Cookbook,
  CookbookShare,
  CookbookShareLink,
  CreateRecipeData,
  UpdateRecipeData,
  CreateCookbookData,
  UpdateCookbookData,
  Notification,
} from './types';

// Type definitions for core handlers (matches api/src/core/handlers.ts)
interface RequestContext {
  sessionId?: string;
  ip?: string | null;
}

interface ApiResult<T> {
  data?: T;
  error?: string;
  status: number;
}

// Interface for CoreHandlers - matches the class in api/src/core/handlers.ts
export interface ICoreHandlers {
  getSession(ctx: RequestContext): Promise<ApiResult<{ user: User | null }>>;
  login(email: string, password: string, ctx: RequestContext): Promise<ApiResult<{ user: User; token: string }>>;
  register(email: string, name: string, password: string): Promise<ApiResult<{ user: User; token: string }>>;
  logout(ctx: RequestContext): Promise<ApiResult<{ success: boolean }>>;
  getRecipes(ctx: RequestContext): Promise<ApiResult<{ recipes: Recipe[] }>>;
  createRecipe(ctx: RequestContext, data: CreateRecipeData): Promise<ApiResult<{ id: string }>>;
  updateRecipe(ctx: RequestContext, id: string, data: Partial<CreateRecipeData>): Promise<ApiResult<{ success: boolean }>>;
  deleteRecipe(ctx: RequestContext, id: string): Promise<ApiResult<{ success: boolean }>>;
  getCookbooks(ctx: RequestContext): Promise<ApiResult<{ owned: Cookbook[]; shared: Cookbook[] }>>;
  getCookbook(ctx: RequestContext, id: string): Promise<ApiResult<{ cookbook: Cookbook; recipes: Recipe[] }>>;
  createCookbook(ctx: RequestContext, data: { name: string; description?: string; coverImage?: string; isPublic?: boolean }): Promise<ApiResult<{ id: string }>>;
  updateCookbook(ctx: RequestContext, id: string, data: { name?: string; description?: string; coverImage?: string; isPublic?: boolean }): Promise<ApiResult<{ success: boolean }>>;
  deleteCookbook(ctx: RequestContext, id: string): Promise<ApiResult<{ success: boolean }>>;
  addRecipeToCookbook(ctx: RequestContext, cookbookId: string, recipeId: string): Promise<ApiResult<{ success: boolean }>>;
  removeRecipeFromCookbook(ctx: RequestContext, cookbookId: string, recipeId: string): Promise<ApiResult<{ success: boolean }>>;
  shareByEmail(ctx: RequestContext, cookbookId: string, email: string): Promise<ApiResult<{ success: boolean; sharedWith?: { id: string; name: string } }>>;
  removeShare(ctx: RequestContext, cookbookId: string, userId: string): Promise<ApiResult<{ success: boolean }>>;
  getShares(ctx: RequestContext, cookbookId: string): Promise<ApiResult<{ shares: CookbookShare[]; links: CookbookShareLink[] }>>;
  createShareLink(ctx: RequestContext, cookbookId: string): Promise<ApiResult<CookbookShareLink>>;
  revokeShareLink(ctx: RequestContext, cookbookId: string, linkId: string): Promise<ApiResult<{ success: boolean }>>;
  getSharedCookbook(token: string): Promise<ApiResult<{ cookbook: Cookbook; recipes: Recipe[] }>>;
  getCookbooksForRecipe(ctx: RequestContext, recipeId: string): Promise<ApiResult<{ cookbookIds: string[] }>>;
  // Discovery endpoints
  getDiscoverRecipes(ctx: RequestContext, options?: { limit?: number; offset?: number; tags?: string[] }): Promise<ApiResult<{ recipes: Recipe[]; total: number }>>;
  getDiscoverCookbooks(ctx: RequestContext, options?: { limit?: number; offset?: number }): Promise<ApiResult<{ cookbooks: Cookbook[]; total: number }>>;
  getPublicRecipe(recipeId: string): Promise<ApiResult<{ recipe: Recipe }>>;
  getPublicCookbook(cookbookId: string): Promise<ApiResult<{ cookbook: Cookbook; recipes: Recipe[] }>>;
  saveRecipe(ctx: RequestContext, recipeId: string): Promise<ApiResult<{ id: string }>>;
  savePreviewRecipe(ctx: RequestContext, data: {
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    prepTime?: string;
    cookTime?: string;
    servings?: string;
    imageUrl?: string;
    sourceUrl: string;
  }): Promise<ApiResult<{ id: string }>>;
  // Notifications
  getNotifications(ctx: RequestContext): Promise<ApiResult<{ notifications: Notification[]; unreadCount: number }>>;
  markNotificationRead(ctx: RequestContext, notificationId: string): Promise<ApiResult<{ success: boolean }>>;
  markAllNotificationsRead(ctx: RequestContext): Promise<ApiResult<{ success: boolean }>>;
  clearAllNotifications(ctx: RequestContext): Promise<ApiResult<{ success: boolean }>>;
  // Invites
  acceptInvite(ctx: RequestContext, inviteId: string): Promise<ApiResult<{ success: boolean; cookbookId: string; cookbookName: string }>>;
  declineInvite(ctx: RequestContext, inviteId: string): Promise<ApiResult<{ success: boolean }>>;
}

// In-memory token storage for testing
export class InMemoryTokenStorage implements ITokenStorage {
  private token: string | null = null;

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }
}

// Helper to convert ApiResult to ApiResponse
function toApiResponse<T>(result: ApiResult<T>): ApiResponse<T> {
  if (result.error) {
    return { error: result.error };
  }
  return { data: result.data };
}

// In-memory client that directly calls core handlers
export class InMemoryClient implements IClient {
  private tokenStorage: ITokenStorage;

  constructor(
    private handlers: ICoreHandlers,
    tokenStorage?: ITokenStorage
  ) {
    this.tokenStorage = tokenStorage || new InMemoryTokenStorage();
  }

  private getContext(): RequestContext {
    return {
      sessionId: this.tokenStorage.getToken() || undefined,
      ip: '127.0.0.1',
    };
  }

  auth = {
    getSession: async (): Promise<ApiResponse<{ user: User | null }>> => {
      const result = await this.handlers.getSession(this.getContext());
      return toApiResponse(result);
    },

    login: async (email: string, password: string): Promise<ApiResponse<{ user: User; token?: string }>> => {
      const result = await this.handlers.login(email, password, this.getContext());
      if (result.data?.token) {
        this.tokenStorage.setToken(result.data.token);
      }
      return toApiResponse(result);
    },

    register: async (
      email: string,
      name: string,
      password: string
    ): Promise<ApiResponse<{ user: User; token?: string }>> => {
      const result = await this.handlers.register(email, name, password);
      if (result.data?.token) {
        this.tokenStorage.setToken(result.data.token);
      }
      return toApiResponse(result);
    },

    logout: async (): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.logout(this.getContext());
      this.tokenStorage.clearToken();
      return toApiResponse(result);
    },

    verifyEmail: async (): Promise<ApiResponse<{ user: User; token?: string; verified?: boolean }>> => {
      // Stub for testing - email verification not implemented in InMemoryClient
      return { error: 'Email verification not implemented in test mode' };
    },

    resendVerification: async (): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
      // Stub for testing - no actual email sent
      return { data: { success: true, message: 'Verification email sent' } };
    },

    forgotPassword: async (): Promise<ApiResponse<{ message: string }>> => {
      // Stub for testing - no actual email sent
      return { data: { message: 'If an account exists with this email, you will receive a password reset link.' } };
    },

    resetPassword: async (): Promise<ApiResponse<{ message: string }>> => {
      // Stub for testing - no actual password reset
      return { data: { message: 'Password reset successfully. Please log in with your new password.' } };
    },
  };

  recipes = {
    list: async (): Promise<ApiResponse<{ recipes: Recipe[] }>> => {
      const result = await this.handlers.getRecipes(this.getContext());
      return toApiResponse(result);
    },

    create: async (data: CreateRecipeData): Promise<ApiResponse<{ id: string }>> => {
      const result = await this.handlers.createRecipe(this.getContext(), data);
      return toApiResponse(result);
    },

    update: async (id: string, data: UpdateRecipeData): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.updateRecipe(this.getContext(), id, data);
      return toApiResponse(result);
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.deleteRecipe(this.getContext(), id);
      return toApiResponse(result);
    },

    getCookbooksForRecipe: async (recipeId: string): Promise<ApiResponse<{ cookbookIds: string[] }>> => {
      const result = await this.handlers.getCookbooksForRecipe(this.getContext(), recipeId);
      return toApiResponse(result);
    },

    saveFromPreview: async (data: {
      title: string;
      description: string;
      ingredients: string[];
      instructions: string[];
      prepTime?: string;
      cookTime?: string;
      servings?: string;
      imageUrl?: string;
      sourceUrl: string;
    }): Promise<ApiResponse<{ id: string; collectionId?: string }>> => {
      const result = await this.handlers.savePreviewRecipe(this.getContext(), data);
      return toApiResponse(result);
    },
  };

  cookbooks = {
    list: async (): Promise<ApiResponse<{ owned: Cookbook[]; shared: Cookbook[] }>> => {
      const result = await this.handlers.getCookbooks(this.getContext());
      return toApiResponse(result);
    },

    get: async (id: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>> => {
      const result = await this.handlers.getCookbook(this.getContext(), id);
      return toApiResponse(result);
    },

    create: async (data: CreateCookbookData): Promise<ApiResponse<{ id: string }>> => {
      const result = await this.handlers.createCookbook(this.getContext(), data);
      return toApiResponse(result);
    },

    update: async (id: string, data: UpdateCookbookData): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.updateCookbook(this.getContext(), id, data);
      return toApiResponse(result);
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.deleteCookbook(this.getContext(), id);
      return toApiResponse(result);
    },

    addRecipe: async (cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.addRecipeToCookbook(this.getContext(), cookbookId, recipeId);
      return toApiResponse(result);
    },

    removeRecipe: async (cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.removeRecipeFromCookbook(this.getContext(), cookbookId, recipeId);
      return toApiResponse(result);
    },

    shareByEmail: async (
      cookbookId: string,
      email: string
    ): Promise<ApiResponse<{ success: boolean; sharedWith?: { id: string; name: string } }>> => {
      const result = await this.handlers.shareByEmail(this.getContext(), cookbookId, email);
      return toApiResponse(result);
    },

    removeShare: async (cookbookId: string, userId: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.removeShare(this.getContext(), cookbookId, userId);
      return toApiResponse(result);
    },

    getShares: async (
      cookbookId: string
    ): Promise<ApiResponse<{ shares: CookbookShare[]; links: CookbookShareLink[] }>> => {
      const result = await this.handlers.getShares(this.getContext(), cookbookId);
      return toApiResponse(result);
    },

    createShareLink: async (cookbookId: string): Promise<ApiResponse<CookbookShareLink>> => {
      const result = await this.handlers.createShareLink(this.getContext(), cookbookId);
      return toApiResponse(result);
    },

    revokeShareLink: async (cookbookId: string, linkId: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.revokeShareLink(this.getContext(), cookbookId, linkId);
      return toApiResponse(result);
    },

    getShared: async (token: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>> => {
      const result = await this.handlers.getSharedCookbook(token);
      return toApiResponse(result);
    },
  };

  // Notifications
  notifications = {
    list: async (): Promise<ApiResponse<{ notifications: Notification[]; unreadCount: number }>> => {
      const result = await this.handlers.getNotifications(this.getContext());
      return toApiResponse(result);
    },

    markRead: async (notificationId: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.markNotificationRead(this.getContext(), notificationId);
      return toApiResponse(result);
    },

    markAllRead: async (): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.markAllNotificationsRead(this.getContext());
      return toApiResponse(result);
    },

    clearAll: async (): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.clearAllNotifications(this.getContext());
      return toApiResponse(result);
    },
  };

  // Invites
  invites = {
    accept: async (inviteId: string): Promise<ApiResponse<{ success: boolean; cookbookId: string; cookbookName: string }>> => {
      const result = await this.handlers.acceptInvite(this.getContext(), inviteId);
      return toApiResponse(result);
    },

    decline: async (inviteId: string): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.handlers.declineInvite(this.getContext(), inviteId);
      return toApiResponse(result);
    },
  };

  // Discovery - public content
  discover = {
    recipes: async (options?: { limit?: number; offset?: number; tags?: string[] }): Promise<ApiResponse<{ recipes: Recipe[]; total: number }>> => {
      const result = await this.handlers.getDiscoverRecipes(this.getContext(), options);
      return toApiResponse(result);
    },

    cookbooks: async (options?: { limit?: number; offset?: number }): Promise<ApiResponse<{ cookbooks: Cookbook[]; total: number }>> => {
      const result = await this.handlers.getDiscoverCookbooks(this.getContext(), options);
      return toApiResponse(result);
    },

    getRecipe: async (id: string): Promise<ApiResponse<{ recipe: Recipe }>> => {
      const result = await this.handlers.getPublicRecipe(id);
      return toApiResponse(result);
    },

    getCookbook: async (id: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>> => {
      const result = await this.handlers.getPublicCookbook(id);
      return toApiResponse(result);
    },

    saveRecipe: async (recipeId: string): Promise<ApiResponse<{ id: string }>> => {
      const result = await this.handlers.saveRecipe(this.getContext(), recipeId);
      return toApiResponse(result);
    },
  };
}
