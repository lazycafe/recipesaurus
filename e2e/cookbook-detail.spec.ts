import { test, expect, testCookbook } from './fixtures';

test.describe('Cookbook Detail Features', () => {
  const user = {
    email: `cookbook-detail-${Date.now()}@example.com`,
    name: 'Cookbook Detail User',
    password: 'CookbookDetail123!',
  };

  test.beforeEach(async ({ page, helpers }) => {
    await helpers.register(user);
    await helpers.createCookbook(testCookbook);
    await helpers.navigateToRecipes();

    // Add multiple recipes to the cookbook
    const recipes = ['Herb-Crusted Chicken', 'Classic Buttermilk Pancakes', 'Chocolate Fondant'];
    for (const recipeName of recipes) {
      await helpers.addRecipeToCookbook(recipeName, testCookbook.name);
    }

    await helpers.navigateToCookbooks();
    await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();
  });

  test.describe('Search within Cookbook', () => {
    test('should display search bar in cookbook detail', async ({ page }) => {
      await expect(page.getByPlaceholder('Search in cookbook...')).toBeVisible();
    });

    test('should filter recipes by search term', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('chicken');

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).not.toBeVisible();
    });

    test('should filter by ingredient', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('chocolate');

      await expect(page.getByText('Chocolate Fondant')).toBeVisible();
      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible();
    });

    test('should be case insensitive', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('CHICKEN');

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should show recipe count when filtered', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('chicken');

      await expect(page.getByText('1 recipe of 3')).toBeVisible();
    });

    test('should show empty state when no matches', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('nonexistent');

      await expect(page.getByText('No matches found')).toBeVisible();
    });

    test('should show clear button when search has value', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('chicken');

      await expect(page.locator('.btn-clear')).toBeVisible();
    });

    test('should clear search when clicking clear button', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('chicken');
      await page.locator('.btn-clear').click();

      await expect(page.getByPlaceholder('Search in cookbook...')).toHaveValue('');
      await expect(page.getByText('3 recipes')).toBeVisible();
    });
  });

  test.describe('Filter by Tags within Cookbook', () => {
    test('should display tag filters', async ({ page }) => {
      await expect(page.locator('.cookbook-filter-tags')).toBeVisible();
    });

    test('should filter recipes by tag', async ({ page }) => {
      await page.getByRole('button', { name: 'dinner', exact: true }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).not.toBeVisible();
    });

    test('should show checkmark on selected tag', async ({ page }) => {
      const tag = page.getByRole('button', { name: 'dinner', exact: true });
      await tag.click();

      await expect(tag.locator('svg')).toBeVisible();
    });

    test('should deselect tag when clicking again', async ({ page }) => {
      const tag = page.getByRole('button', { name: 'dinner', exact: true });
      await tag.click();
      await expect(page.getByText('1 recipe of 3')).toBeVisible();

      await tag.click();
      await expect(page.getByText('3 recipes')).toBeVisible();
    });

    test('should allow multiple tag selection', async ({ page }) => {
      await page.getByRole('button', { name: 'dinner', exact: true }).click();
      await page.getByRole('button', { name: 'healthy', exact: true }).click();

      // Only chicken recipe has both dinner and healthy tags
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });
  });

  test.describe('Combined Search and Tag Filters', () => {
    test('should combine search and tag filters', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('herb');
      await page.getByRole('button', { name: 'dinner', exact: true }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('1 recipe of 3')).toBeVisible();
    });

    test('should clear all filters from empty state', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('nonexistent');
      await expect(page.getByText('No matches found')).toBeVisible();

      await page.getByRole('button', { name: 'Clear Filters' }).click();

      await expect(page.getByText('3 recipes')).toBeVisible();
    });
  });

  test.describe('Recipe Detail from Cookbook', () => {
    test('should open recipe detail when clicking recipe card', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText('Ingredients')).toBeVisible();
      await expect(page.getByText('Instructions')).toBeVisible();
    });

    test('should show close button in recipe detail', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    });

    test('should return to cookbook when closing recipe detail', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Close' }).click();

      await expect(page.getByText('3 recipes')).toBeVisible();
    });

    test('should close recipe detail when clicking X', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Close' }).click();

      await expect(page.getByRole('heading', { name: testCookbook.name })).toBeVisible();
      await expect(page.locator('.modal-detail')).not.toBeVisible();
    });
  });

  test.describe('In-App Delete Confirmation Modal', () => {
    test('should show in-app confirmation modal when deleting recipe', async ({ page, helpers }) => {
      await helpers.clickRecipeCardButton('Delete recipe', 'Herb-Crusted Chicken');

      await expect(page.locator('.confirm-modal')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Delete Recipe' })).toBeVisible();
    });

    test('should show recipe name in confirmation modal', async ({ page, helpers }) => {
      await helpers.clickRecipeCardButton('Delete recipe', 'Herb-Crusted Chicken');

      await expect(page.locator('.confirm-modal').getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should delete recipe when clicking Delete button', async ({ page, helpers }) => {
      await helpers.clickRecipeCardButton('Delete recipe', 'Herb-Crusted Chicken');

      await page.locator('.confirm-modal').getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page.getByText('2 recipes')).toBeVisible({ timeout: 5000 });
    });

    test('should cancel delete when clicking Cancel button', async ({ page, helpers }) => {
      await helpers.clickRecipeCardButton('Delete recipe', 'Herb-Crusted Chicken');

      await page.getByRole('button', { name: 'Cancel' }).click();

      await expect(page.locator('.confirm-modal')).not.toBeVisible();
      await expect(page.getByText('3 recipes')).toBeVisible();
    });

    test('should close confirmation modal when clicking overlay', async ({ page, helpers }) => {
      await helpers.clickRecipeCardButton('Delete recipe', 'Herb-Crusted Chicken');

      await page.locator('.confirm-modal-overlay').click({ position: { x: 10, y: 10 } });

      await expect(page.locator('.confirm-modal')).not.toBeVisible();
    });
  });
});
