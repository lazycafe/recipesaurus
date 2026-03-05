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
      const card = page.locator('.recipe-card').filter({ hasText: recipeName });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
    }

    await helpers.navigateToCookbooks();
    await page.getByText(testCookbook.name).click();
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
      await page.locator('.filter-tag').filter({ hasText: 'dinner' }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).not.toBeVisible();
    });

    test('should show checkmark on selected tag', async ({ page }) => {
      const tag = page.locator('.filter-tag').filter({ hasText: 'dinner' });
      await tag.click();

      await expect(tag.locator('svg')).toBeVisible();
    });

    test('should deselect tag when clicking again', async ({ page }) => {
      const tag = page.locator('.filter-tag').filter({ hasText: 'dinner' });
      await tag.click();
      await expect(page.getByText('1 recipe of 3')).toBeVisible();

      await tag.click();
      await expect(page.getByText('3 recipes')).toBeVisible();
    });

    test('should allow multiple tag selection', async ({ page }) => {
      await page.locator('.filter-tag').filter({ hasText: 'dinner' }).click();
      await page.locator('.filter-tag').filter({ hasText: 'healthy' }).click();

      // Only chicken recipe has both dinner and healthy tags
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });
  });

  test.describe('Combined Search and Tag Filters', () => {
    test('should combine search and tag filters', async ({ page }) => {
      await page.getByPlaceholder('Search in cookbook...').fill('herb');
      await page.locator('.filter-tag').filter({ hasText: 'dinner' }).click();

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

    test('should show back button in recipe detail', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText(`Back to ${testCookbook.name}`)).toBeVisible();
    });

    test('should return to cookbook when clicking back', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByText(`Back to ${testCookbook.name}`).click();

      await expect(page.getByText('3 recipes')).toBeVisible();
    });

    test('should close entire cookbook modal when clicking X from recipe detail', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.locator('.modal-close').click();

      await expect(page.locator('.cookbook-detail')).not.toBeVisible();
    });
  });

  test.describe('In-App Remove Confirmation Modal', () => {
    test('should show in-app confirmation modal when removing recipe', async ({ page }) => {
      const recipeCard = page.locator('.cookbook-recipe-card').first();
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();

      await expect(page.locator('.confirm-modal')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Remove Recipe' })).toBeVisible();
    });

    test('should show recipe name in confirmation modal', async ({ page }) => {
      const recipeCard = page.locator('.cookbook-recipe-card').first();
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should remove recipe when clicking Remove button', async ({ page }) => {
      const recipeCard = page.locator('.cookbook-recipe-card').first();
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();

      await page.getByRole('button', { name: 'Remove' }).click();

      await expect(page.getByText('2 recipes')).toBeVisible({ timeout: 5000 });
    });

    test('should cancel removal when clicking Cancel button', async ({ page }) => {
      const recipeCard = page.locator('.cookbook-recipe-card').first();
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();

      await page.getByRole('button', { name: 'Cancel' }).click();

      await expect(page.locator('.confirm-modal')).not.toBeVisible();
      await expect(page.getByText('3 recipes')).toBeVisible();
    });

    test('should close confirmation modal when clicking overlay', async ({ page }) => {
      const recipeCard = page.locator('.cookbook-recipe-card').first();
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();

      await page.locator('.confirm-modal-overlay').click({ position: { x: 10, y: 10 } });

      await expect(page.locator('.confirm-modal')).not.toBeVisible();
    });
  });
});
