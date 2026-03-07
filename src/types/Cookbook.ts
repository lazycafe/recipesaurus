export interface Cookbook {
  id: string;
  name: string;
  description?: string;
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

export interface CookbookFormData {
  name: string;
  description: string;
}
