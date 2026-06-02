import type {
  IClient,
  ITransport,
  ITokenStorage,
  ApiResponse,
  User,
  Recipe,
  Cookbook,
  CookbookShare,
  CookbookShareLink,
  RecipeShareLink,
  RecipeSharePayload,
  CreateRecipeData,
  UpdateRecipeData,
  CreateCookbookData,
  UpdateCookbookData,
  Notification,
  MealPlanUsage,
  MealPlanHistoryItem,
  MealPlanResult,
  BillingStatus,
  BillingSession,
  ProfileUser,
  UserProfile,
} from './types';

// Default localStorage-based token storage
export class LocalStorageTokenStorage implements ITokenStorage {
  private readonly key: string;

  constructor(key = 'recipesaurus_token') {
    this.key = key;
  }

  getToken(): string | null {
    return localStorage.getItem(this.key);
  }

  setToken(token: string): void {
    localStorage.setItem(this.key, token);
  }

  clearToken(): void {
    localStorage.removeItem(this.key);
  }
}

// HTTP transport implementation
export class HttpTransport implements ITransport {
  constructor(
    private readonly baseUrl: string,
    private readonly tokenStorage: ITokenStorage
  ) {}

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const token = this.tokenStorage.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        credentials: 'include',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();
      let data: unknown = null;

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { error: responseText };
        }
      }

      if (!response.ok) {
        const errorData = data && typeof data === 'object' ? data as { error?: string; code?: string } : {};
        return {
          error: errorData.error || response.statusText || 'Request failed',
          status: response.status,
          code: errorData.code,
        };
      }

      return { data: data as T, status: response.status };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Network error. Please try again.' };
    }
  }
}

// HTTP Client implementation
export class HttpClient implements IClient {
  private readonly transport: ITransport;
  private readonly tokenStorage: ITokenStorage;

  constructor(transport: ITransport, tokenStorage: ITokenStorage) {
    this.transport = transport;
    this.tokenStorage = tokenStorage;
  }

  auth = {
    getSession: (): Promise<ApiResponse<{ user: User | null }>> => {
      return this.transport.request('GET', '/api/auth/session');
    },

    login: async (email: string, password: string): Promise<ApiResponse<{ user: User; token?: string }>> => {
      const result = await this.transport.request<{ user: User; token?: string }>('POST', '/api/auth/login', {
        email,
        password,
      });
      if (result.data?.token) {
        this.tokenStorage.setToken(result.data.token);
      }
      return result;
    },

    register: async (
      email: string,
      name: string,
      password: string
    ): Promise<ApiResponse<{ user: User; token?: string }>> => {
      const result = await this.transport.request<{ user: User; token?: string }>('POST', '/api/auth/register', {
        email,
        name,
        password,
      });
      if (result.data?.token) {
        this.tokenStorage.setToken(result.data.token);
      }
      return result;
    },

    logout: async (): Promise<ApiResponse<{ success: boolean }>> => {
      const result = await this.transport.request<{ success: boolean }>('POST', '/api/auth/logout');
      this.tokenStorage.clearToken();
      return result;
    },

    updateProfile: (data: { name?: string; avatarUrl?: string | null }): Promise<ApiResponse<{ user: User }>> => {
      return this.transport.request('PUT', '/api/auth/profile', data);
    },

    verifyEmail: async (token: string): Promise<ApiResponse<{ user: User; token?: string; verified?: boolean }>> => {
      const result = await this.transport.request<{ user: User; token?: string; verified?: boolean }>('POST', '/api/auth/verify-email', { token });
      if (result.data?.token) {
        this.tokenStorage.setToken(result.data.token);
      }
      return result;
    },

    resendVerification: (email: string): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
      return this.transport.request('POST', '/api/auth/resend-verification', { email });
    },

    forgotPassword: (email: string): Promise<ApiResponse<{ message: string }>> => {
      return this.transport.request('POST', '/api/auth/forgot-password', { email });
    },

    resetPassword: (token: string, password: string): Promise<ApiResponse<{ message: string }>> => {
      return this.transport.request('POST', '/api/auth/reset-password', { token, password });
    },
  };

  recipes = {
    list: (): Promise<ApiResponse<{ recipes: Recipe[] }>> => {
      return this.transport.request('GET', '/api/recipes');
    },

    create: (data: CreateRecipeData): Promise<ApiResponse<{ id: string }>> => {
      return this.transport.request('POST', '/api/recipes', data);
    },

    update: (id: string, data: UpdateRecipeData): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('PUT', `/api/recipes/${id}`, data);
    },

    delete: (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('DELETE', `/api/recipes/${id}`);
    },

    getCookbooksForRecipe: (recipeId: string): Promise<ApiResponse<{ cookbookIds: string[] }>> => {
      return this.transport.request('GET', `/api/recipes/${recipeId}/cookbooks`);
    },

    createShareLink: (data: RecipeSharePayload): Promise<ApiResponse<RecipeShareLink>> => {
      return this.transport.request('POST', '/api/recipe-shares', data);
    },

    getShared: (token: string): Promise<ApiResponse<{ recipe: RecipeSharePayload }>> => {
      return this.transport.request('GET', `/api/recipe-shares/${token}`);
    },

    saveFromPreview: (data: {
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
      return this.transport.request('POST', '/api/recipes/from-preview', data);
    },
  };

  cookbooks = {
    list: (): Promise<ApiResponse<{ owned: Cookbook[]; shared: Cookbook[] }>> => {
      return this.transport.request('GET', '/api/cookbooks');
    },

    get: (id: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>> => {
      return this.transport.request('GET', `/api/cookbooks/${id}`);
    },

    create: (data: CreateCookbookData): Promise<ApiResponse<{ id: string }>> => {
      return this.transport.request('POST', '/api/cookbooks', data);
    },

    update: (id: string, data: UpdateCookbookData): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('PUT', `/api/cookbooks/${id}`, data);
    },

    delete: (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('DELETE', `/api/cookbooks/${id}`);
    },

    addRecipe: (cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('POST', `/api/cookbooks/${cookbookId}/recipes`, { recipeId });
    },

    removeRecipe: (cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('DELETE', `/api/cookbooks/${cookbookId}/recipes/${recipeId}`);
    },

    shareByEmail: (
      cookbookId: string,
      email: string
    ): Promise<ApiResponse<{ success: boolean; sharedWith?: { id: string; name: string } }>> => {
      return this.transport.request('POST', `/api/cookbooks/${cookbookId}/share`, { email });
    },

    removeShare: (cookbookId: string, userId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('DELETE', `/api/cookbooks/${cookbookId}/share/${userId}`);
    },

    getShares: (
      cookbookId: string
    ): Promise<ApiResponse<{ shares: CookbookShare[]; links: CookbookShareLink[] }>> => {
      return this.transport.request('GET', `/api/cookbooks/${cookbookId}/shares`);
    },

    createShareLink: (cookbookId: string): Promise<ApiResponse<CookbookShareLink>> => {
      return this.transport.request('POST', `/api/cookbooks/${cookbookId}/share-link`);
    },

    revokeShareLink: (cookbookId: string, linkId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('DELETE', `/api/cookbooks/${cookbookId}/share-link/${linkId}`);
    },

    getShared: (token: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>> => {
      return this.transport.request('GET', `/api/shared/${token}`);
    },
  };

  notifications = {
    list: (): Promise<ApiResponse<{ notifications: Notification[]; unreadCount: number }>> => {
      return this.transport.request('GET', '/api/notifications');
    },

    markRead: (notificationId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('POST', `/api/notifications/${notificationId}/read`);
    },

    markAllRead: (): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('POST', '/api/notifications/read-all');
    },

    clearAll: (): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('DELETE', '/api/notifications/clear-all');
    },
  };

  invites = {
    accept: (inviteId: string): Promise<ApiResponse<{ success: boolean; cookbookId: string; cookbookName: string }>> => {
      return this.transport.request('POST', `/api/invites/${inviteId}/accept`);
    },

    decline: (inviteId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('POST', `/api/invites/${inviteId}/decline`);
    },
  };

  ai = {
    getMealPlanUsage: (): Promise<ApiResponse<{ usage: MealPlanUsage }>> => {
      return this.transport.request('GET', '/api/ai/meal-planner/usage');
    },

    getMealPlanHistory: (): Promise<ApiResponse<{ history: MealPlanHistoryItem[] }>> => {
      return this.transport.request('GET', '/api/ai/meal-planner/history');
    },

    createMealPlan: (request: string): Promise<ApiResponse<MealPlanResult>> => {
      return this.transport.request('POST', '/api/ai/meal-planner', { request });
    },
  };

  billing = {
    getStatus: (): Promise<ApiResponse<{ billing: BillingStatus }>> => {
      return this.transport.request('GET', '/api/billing/status');
    },

    createCheckoutSession: (): Promise<ApiResponse<BillingSession>> => {
      return this.transport.request('POST', '/api/billing/create-checkout-session');
    },

    createPortalSession: (): Promise<ApiResponse<BillingSession>> => {
      return this.transport.request('POST', '/api/billing/create-portal-session');
    },

    cancelSubscription: (): Promise<ApiResponse<{ billing: BillingStatus }>> => {
      return this.transport.request('POST', '/api/billing/cancel-subscription');
    },

    reinstateSubscription: (): Promise<ApiResponse<{ billing: BillingStatus }>> => {
      return this.transport.request('POST', '/api/billing/reinstate-subscription');
    },
  };

  discover = {
    recipes: (options?: { limit?: number; offset?: number; tags?: string[] }): Promise<ApiResponse<{ recipes: Recipe[]; total: number }>> => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      if (options?.tags) params.set('tags', options.tags.join(','));
      const query = params.toString();
      return this.transport.request('GET', `/api/discover/recipes${query ? `?${query}` : ''}`);
    },

    cookbooks: (options?: { limit?: number; offset?: number }): Promise<ApiResponse<{ cookbooks: Cookbook[]; total: number }>> => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      const query = params.toString();
      return this.transport.request('GET', `/api/discover/cookbooks${query ? `?${query}` : ''}`);
    },

    getRecipe: (id: string): Promise<ApiResponse<{ recipe: Recipe }>> => {
      return this.transport.request('GET', `/api/discover/recipes/${id}`);
    },

    getCookbook: (id: string): Promise<ApiResponse<{ cookbook: Cookbook; recipes: Recipe[] }>> => {
      return this.transport.request('GET', `/api/discover/cookbooks/${id}`);
    },

    saveRecipe: (recipeId: string): Promise<ApiResponse<{ id: string }>> => {
      return this.transport.request('POST', `/api/discover/recipes/${recipeId}/save`);
    },

    saveCookbook: (cookbookId: string): Promise<ApiResponse<{ id: string }>> => {
      return this.transport.request('POST', `/api/discover/cookbooks/${cookbookId}/save`);
    },
  };

  profile = {
    get: (userId: string): Promise<ApiResponse<{ profile: UserProfile }>> => {
      return this.transport.request('GET', `/api/profiles/${userId}`);
    },

    listFriends: (userId: string): Promise<ApiResponse<{ friends: ProfileUser[] }>> => {
      return this.transport.request('GET', `/api/profiles/${userId}/friends`);
    },

    addFriend: (data: { userId?: string; email?: string }): Promise<ApiResponse<{ friend: ProfileUser }>> => {
      return this.transport.request('POST', '/api/friends', data);
    },

    removeFriend: (userId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('DELETE', `/api/friends/${userId}`);
    },

    acceptFriendRequest: (friendRequestId: string): Promise<ApiResponse<{ success: boolean; friend: ProfileUser }>> => {
      return this.transport.request('POST', '/api/friend-requests/accept', { friendRequestId });
    },

    declineFriendRequest: (friendRequestId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('POST', '/api/friend-requests/decline', { friendRequestId });
    },
  };
}

// Factory function to create HTTP client with default configuration
export function createHttpClient(
  baseUrl: string = import.meta.env.VITE_API_URL || 'https://recipesaurus-api.andreay226.workers.dev',
  tokenStorage: ITokenStorage = new LocalStorageTokenStorage()
): IClient {
  const transport = new HttpTransport(baseUrl, tokenStorage);
  return new HttpClient(transport, tokenStorage);
}
