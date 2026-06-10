import { test as base, expect, Page } from '@playwright/test';

export interface E2EUser {
  email: string;
  name: string;
  password: string;
}

export interface E2ERecipe {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  tags: string;
  prepTime: string;
  cookTime: string;
  servings: string;
}

export interface E2ECookbook {
  name: string;
  description?: string;
}

// Test user data
export const testUser = {
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  password: 'TestPassword123!',
};

export const secondUser = {
  email: `test2-${Date.now()}@example.com`,
  name: 'Second User',
  password: 'TestPassword456!',
};

// Test recipe data
export const testRecipe = {
  title: 'Test Chocolate Cake',
  description: 'A delicious chocolate cake for testing',
  ingredients: 'flour\nsugar\ncocoa powder\neggs\nbutter',
  instructions: 'Mix dry ingredients\nAdd wet ingredients\nBake at 350F',
  tags: 'dessert, chocolate, cake',
  prepTime: '20 mins',
  cookTime: '45 mins',
  servings: '8',
};

export const testRecipe2 = {
  title: 'Test Pasta Carbonara',
  description: 'Classic Italian pasta dish',
  ingredients: 'spaghetti\npancetta\neggs\nparmesan\nblack pepper',
  instructions: 'Cook pasta\nFry pancetta\nMix eggs and cheese\nCombine',
  tags: 'dinner, italian, pasta',
  prepTime: '10 mins',
  cookTime: '20 mins',
  servings: '4',
};

// Test cookbook data
export const testCookbook = {
  name: 'My Test Cookbook',
  description: 'A cookbook for testing purposes',
};

export const testCookbook2 = {
  name: 'Italian Favorites',
  description: 'Collection of Italian recipes',
};

// Helper class for common operations
export class TestHelpers {
  constructor(private page: Page) {}

  async register(user: E2EUser) {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Get Started', exact: true }).click();
    await this.page.getByLabel('Name').fill(user.name);
    await this.page.getByLabel('Email').fill(user.email);
    await this.page.locator('#password').fill(user.password);
    await this.page.locator('#confirmPassword').fill(user.password);
    await this.page.getByRole('button', { name: 'Create Account' }).click();
    await expect(this.page.getByRole('heading', { name: 'My Recipes' })).toBeVisible({ timeout: 10000 });
  }

  async login(user: E2EUser) {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
    await this.page.getByLabel('Email').fill(user.email);
    await this.page.locator('#password').fill(user.password);
    await this.page.locator('.auth-submit').click();
    await expect(this.page.getByRole('heading', { name: 'My Recipes' })).toBeVisible({ timeout: 10000 });
  }

  async logout() {
    await this.page.getByRole('button', { name: 'User menu' }).click();
    await this.page.getByRole('button', { name: 'Sign out' }).click();
    await expect(this.page.getByRole('button', { name: 'Get Started', exact: true })).toBeVisible();
  }

  async createRecipe(recipe: E2ERecipe) {
    await this.page.getByRole('button', { name: 'New Recipe' }).click();
    await this.page.getByRole('button', { name: 'Manual' }).click();
    await this.page.getByLabel('Title').fill(recipe.title);
    await this.page.getByLabel('Description').fill(recipe.description);
    await this.page.getByLabel('Ingredients').fill(recipe.ingredients);
    await this.page.getByLabel('Instructions').fill(recipe.instructions);
    for (const tag of recipe.tags.split(',').map(tag => tag.trim()).filter(Boolean)) {
      await this.page.locator('.tag-input').fill(tag);
      await this.page.keyboard.press('Enter');
    }
    await this.page.getByLabel('Prep Time').fill(recipe.prepTime);
    await this.page.getByLabel('Cook Time').fill(recipe.cookTime);
    await this.page.getByLabel('Servings').fill(recipe.servings);
    await this.page.getByRole('button', { name: 'Save Recipe' }).click();
    await expect(this.page.getByText(recipe.title)).toBeVisible({ timeout: 10000 });
  }

  async navigateToCookbooks() {
    await this.page.getByRole('link', { name: 'Cookbooks', exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'Cookbooks' })).toBeVisible();
  }

  async navigateToRecipes() {
    await this.page.getByRole('link', { name: 'My Recipes' }).click();
  }

  async createCookbook(cookbook: E2ECookbook) {
    await this.navigateToCookbooks();
    await this.page.getByRole('button', { name: 'New Cookbook' }).click();
    await this.page.getByLabel('Name').fill(cookbook.name);
    if (cookbook.description) {
      await this.page.getByLabel('Description').fill(cookbook.description);
    }
    await this.page.getByRole('button', { name: 'Create Cookbook' }).click();
    await expect(this.page.locator('.cookbook-card-link').filter({ hasText: cookbook.name })).toBeVisible({ timeout: 10000 });
  }

  async openAddToCookbookModal(recipeTitle?: string) {
    const card = recipeTitle
      ? this.page.locator('.recipe-card').filter({ hasText: recipeTitle })
      : this.page.locator('.recipe-card').first();

    await card.hover();
    await card.locator('.card-action').first().click();
    await expect(this.page.getByRole('heading', { name: 'Add to Cookbook' })).toBeVisible();
  }

  async selectCookbookInAddToCookbookModal(cookbookName: string) {
    const cookbookOption = this.page.locator('.cookbook-checkbox-item').filter({ hasText: cookbookName });
    await expect(cookbookOption).toBeVisible();
    await cookbookOption.click();
    await expect(cookbookOption).toHaveClass(/added/);
  }

  async deselectCookbookInAddToCookbookModal(cookbookName: string) {
    const cookbookOption = this.page.locator('.cookbook-checkbox-item').filter({ hasText: cookbookName });
    await expect(cookbookOption).toHaveClass(/added/);
    await cookbookOption.click();
    await expect(cookbookOption).not.toHaveClass(/added/);
  }

  async addRecipeToCookbook(recipeTitle: string, cookbookName: string) {
    await this.openAddToCookbookModal(recipeTitle);
    await this.selectCookbookInAddToCookbookModal(cookbookName);
    await this.closeModal();
    await expect(this.page.getByRole('heading', { name: 'Add to Cookbook' })).not.toBeVisible();
  }

  async removeRecipeFromCookbook(recipeTitle: string, cookbookName: string) {
    await this.openAddToCookbookModal(recipeTitle);
    await this.deselectCookbookInAddToCookbookModal(cookbookName);
    await this.closeModal();
    await expect(this.page.getByRole('heading', { name: 'Add to Cookbook' })).not.toBeVisible();
  }

  async openRecipeDetail(recipeTitle: string) {
    await this.page.getByText(recipeTitle).click();
    await expect(this.page.locator('.recipe-detail, .modal-overlay')).toBeVisible();
  }

  async closeModal() {
    await this.page.locator('.modal-close').first().click();
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
}

// Extended test fixture with helpers
export const test = base.extend<{ helpers: TestHelpers }>({
  helpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },
});

export { expect };
