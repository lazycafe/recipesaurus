const API_BASE = import.meta.env.VITE_API_URL || 'https://recipesaurus-api.andreay226.workers.dev';
const TOKEN_KEY = 'recipesaurus_token';

// Token management
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers,
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

// Auth API
export interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export const authApi = {
  async register(email: string, name: string, password: string): Promise<ApiResponse<{ user: UserResponse; token?: string }>> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    });
  },

  async login(email: string, password: string): Promise<ApiResponse<{ user: UserResponse; token?: string }>> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return request('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getSession(): Promise<ApiResponse<{ user: UserResponse | null }>> {
    return request('/api/auth/session');
  },
};

// Recipes API
export interface RecipeResponse {
  id: string;
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
  createdAt: number;
  addedByUserId?: string;
  addedByUserName?: string | null;
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
}

export const recipesApi = {
  async getAll(): Promise<ApiResponse<{ recipes: RecipeResponse[] }>> {
    return request('/api/recipes');
  },

  async create(recipe: CreateRecipeData): Promise<ApiResponse<{ id: string }>> {
    return request('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  },

  async update(id: string, recipe: Partial<CreateRecipeData>): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipe),
    });
  },

  async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/recipes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Cookbooks API
export interface CookbookResponse {
  id: string;
  name: string;
  description?: string;
  coverImage?: string | null;
  recipeCount: number;
  createdAt: number;
  updatedAt: number;
  isOwner: boolean;
  ownerName?: string;
}

export interface CookbookShareResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sharedAt: number;
}

export interface CookbookShareLinkResponse {
  id: string;
  token: string;
  isActive: boolean;
  createdAt: number;
}

export const cookbooksApi = {
  async getAll(): Promise<ApiResponse<{ owned: CookbookResponse[]; shared: CookbookResponse[] }>> {
    return request('/api/cookbooks');
  },

  async get(id: string): Promise<ApiResponse<{ cookbook: CookbookResponse; recipes: RecipeResponse[] }>> {
    return request(`/api/cookbooks/${id}`);
  },

  async create(data: { name: string; description?: string; coverImage?: string }): Promise<ApiResponse<{ id: string }>> {
    return request('/api/cookbooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: { name?: string; description?: string; coverImage?: string }): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/cookbooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/cookbooks/${id}`, {
      method: 'DELETE',
    });
  },

  async addRecipe(cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/cookbooks/${cookbookId}/recipes`, {
      method: 'POST',
      body: JSON.stringify({ recipeId }),
    });
  },

  async removeRecipe(cookbookId: string, recipeId: string): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/cookbooks/${cookbookId}/recipes/${recipeId}`, {
      method: 'DELETE',
    });
  },

  async shareByEmail(cookbookId: string, email: string): Promise<ApiResponse<{ success: boolean; sharedWith?: { id: string; name: string } }>> {
    return request(`/api/cookbooks/${cookbookId}/share`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async removeShare(cookbookId: string, userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/cookbooks/${cookbookId}/share/${userId}`, {
      method: 'DELETE',
    });
  },

  async getShares(cookbookId: string): Promise<ApiResponse<{ shares: CookbookShareResponse[]; links: CookbookShareLinkResponse[] }>> {
    return request(`/api/cookbooks/${cookbookId}/shares`);
  },

  async createShareLink(cookbookId: string): Promise<ApiResponse<CookbookShareLinkResponse>> {
    return request(`/api/cookbooks/${cookbookId}/share-link`, {
      method: 'POST',
    });
  },

  async revokeShareLink(cookbookId: string, linkId: string): Promise<ApiResponse<{ success: boolean }>> {
    return request(`/api/cookbooks/${cookbookId}/share-link/${linkId}`, {
      method: 'DELETE',
    });
  },

  async getShared(token: string): Promise<ApiResponse<{ cookbook: CookbookResponse; recipes: RecipeResponse[] }>> {
    return request(`/api/shared/${token}`);
  },
};
