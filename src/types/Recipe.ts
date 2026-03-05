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
  createdAt: number;
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
}
