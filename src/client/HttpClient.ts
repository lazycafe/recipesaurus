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
  CreateRecipeData,
  UpdateRecipeData,
  CreateCookbookData,
  UpdateCookbookData,
  Notification,
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

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
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
  };

  invites = {
    accept: (inviteId: string): Promise<ApiResponse<{ success: boolean; cookbookId: string; cookbookName: string }>> => {
      return this.transport.request('POST', `/api/invites/${inviteId}/accept`);
    },

    decline: (inviteId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.transport.request('POST', `/api/invites/${inviteId}/decline`);
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
