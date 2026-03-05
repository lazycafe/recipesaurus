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
  createCookbook(ctx: RequestContext, data: { name: string; description?: string; coverImage?: string }): Promise<ApiResult<{ id: string }>>;
  updateCookbook(ctx: RequestContext, id: string, data: { name?: string; description?: string; coverImage?: string }): Promise<ApiResult<{ success: boolean }>>;
  deleteCookbook(ctx: RequestContext, id: string): Promise<ApiResult<{ success: boolean }>>;
  addRecipeToCookbook(ctx: RequestContext, cookbookId: string, recipeId: string): Promise<ApiResult<{ success: boolean }>>;
  removeRecipeFromCookbook(ctx: RequestContext, cookbookId: string, recipeId: string): Promise<ApiResult<{ success: boolean }>>;
  shareByEmail(ctx: RequestContext, cookbookId: string, email: string): Promise<ApiResult<{ success: boolean; sharedWith?: { id: string; name: string } }>>;
  removeShare(ctx: RequestContext, cookbookId: string, userId: string): Promise<ApiResult<{ success: boolean }>>;
  getShares(ctx: RequestContext, cookbookId: string): Promise<ApiResult<{ shares: CookbookShare[]; links: CookbookShareLink[] }>>;
  createShareLink(ctx: RequestContext, cookbookId: string): Promise<ApiResult<CookbookShareLink>>;
  revokeShareLink(ctx: RequestContext, cookbookId: string, linkId: string): Promise<ApiResult<{ success: boolean }>>;
  getSharedCookbook(token: string): Promise<ApiResult<{ cookbook: Cookbook; recipes: Recipe[] }>>;
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

    getCookbooksForRecipe: async (_recipeId: string): Promise<ApiResponse<{ cookbookIds: string[] }>> => {
      // Stub implementation - in real implementation this would query cookbook_recipes table
      return { data: { cookbookIds: [] } };
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

  // Notifications - stub implementation for testing
  notifications = {
    list: async (): Promise<ApiResponse<{ notifications: Notification[]; unreadCount: number }>> => {
      return { data: { notifications: [], unreadCount: 0 } };
    },

    markRead: async (_notificationId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return { data: { success: true } };
    },

    markAllRead: async (): Promise<ApiResponse<{ success: boolean }>> => {
      return { data: { success: true } };
    },

    clearAll: async (): Promise<ApiResponse<{ success: boolean }>> => {
      return { data: { success: true } };
    },
  };

  // Invites - stub implementation for testing
  invites = {
    accept: async (_inviteId: string): Promise<ApiResponse<{ success: boolean; cookbookId: string; cookbookName: string }>> => {
      return { data: { success: true, cookbookId: '', cookbookName: '' } };
    },

    decline: async (_inviteId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return { data: { success: true } };
    },
  };
}
