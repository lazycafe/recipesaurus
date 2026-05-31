export interface Recipe {
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
  isPublic?: boolean;
  createdAt: number;
  sourceRecipeId?: string | null;
  sourceRecipe?: RecipeSourceSnapshot | null;
  ownerName?: string | null;
  isOwner?: boolean;
}

export interface RecipeSourceSnapshot {
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
  ownerId?: string | null;
  ownerName?: string | null;
  createdAt?: number | null;
}

export interface RecipeFormData {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  tags: string;
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  sourceUrl: string;
  isPublic: boolean;
}
