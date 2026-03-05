import { test as base, expect, Page } from '@playwright/test';

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

  async register(user: typeof testUser) {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Get Started' }).click();
    await this.page.getByLabel('Name').fill(user.name);
    await this.page.getByLabel('Email').fill(user.email);
    await this.page.locator('#password').fill(user.password);
    await this.page.locator('#confirmPassword').fill(user.password);
    await this.page.getByRole('button', { name: 'Create Account' }).click();
    await expect(this.page.getByText(user.name)).toBeVisible({ timeout: 10000 });
  }

  async login(user: typeof testUser) {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Sign In' }).click();
    await this.page.getByLabel('Email').fill(user.email);
    await this.page.locator('#password').fill(user.password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
    await expect(this.page.getByText(user.name)).toBeVisible({ timeout: 10000 });
  }

  async logout() {
    await this.page.getByRole('button', { name: 'Sign out' }).click();
    await expect(this.page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  }

  async createRecipe(recipe: typeof testRecipe) {
    await this.page.getByRole('button', { name: 'New Recipe' }).click();
    await this.page.getByLabel('Recipe Title').fill(recipe.title);
    await this.page.getByLabel('Description').fill(recipe.description);
    await this.page.getByLabel('Ingredients').fill(recipe.ingredients);
    await this.page.getByLabel('Instructions').fill(recipe.instructions);
    await this.page.getByLabel('Tags').fill(recipe.tags);
    await this.page.locator('input[placeholder="e.g., 30 mins"]').first().fill(recipe.prepTime);
    await this.page.locator('input[placeholder="e.g., 1 hour"]').fill(recipe.cookTime);
    await this.page.locator('input[placeholder="e.g., 4"]').fill(recipe.servings);
    await this.page.getByRole('button', { name: 'Add Recipe' }).click();
    await expect(this.page.getByText(recipe.title)).toBeVisible({ timeout: 10000 });
  }

  async navigateToCookbooks() {
    await this.page.getByRole('button', { name: 'Cookbooks' }).click();
    await expect(this.page.getByText('My Cookbooks')).toBeVisible();
  }

  async navigateToRecipes() {
    await this.page.getByRole('button', { name: 'Recipes' }).click();
  }

  async createCookbook(cookbook: typeof testCookbook) {
    await this.navigateToCookbooks();
    await this.page.getByRole('button', { name: 'New Cookbook' }).click();
    await this.page.getByLabel('Name').fill(cookbook.name);
    await this.page.getByLabel('Description').fill(cookbook.description);
    await this.page.getByRole('button', { name: 'Create Cookbook' }).click();
    await expect(this.page.getByText(cookbook.name)).toBeVisible({ timeout: 10000 });
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
