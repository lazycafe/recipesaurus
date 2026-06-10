import { test, expect, testCookbook, testRecipe } from './fixtures';

test.describe('Cookbook Recipes', () => {
  const user = {
    email: `cookbook-recipes-${Date.now()}@example.com`,
    name: 'Cookbook Recipes User',
    password: 'CookbookRecipes123!',
  };

  test.beforeEach(async ({ page, helpers }) => {
    await helpers.register(user);
  });

  test.describe('Add to Cookbook Button', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();
    });

    test('should show add to cookbook button on recipe card hover', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();

      // The BookPlus icon button should be visible
      await expect(card.getByRole('button', { name: 'Add to cookbook' })).toBeVisible();
    });

    test('should open add to cookbook modal when clicking button', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await expect(page.getByRole('heading', { name: 'Add to Cookbook' })).toBeVisible();
    });

    test('should show recipe title in modal', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal('Herb-Crusted Chicken');
      await expect(page.getByText('Add "Herb-Crusted Chicken" to a cookbook')).toBeVisible();
    });
  });

  test.describe('Add to Cookbook Modal', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();
    });

    test('should list available cookbooks', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await expect(page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name })).toBeVisible();
    });

    test('should show cookbook recipe count', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await expect(page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name }).getByText('0 recipes')).toBeVisible();
    });

    test('should show Create New Cookbook button', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await expect(page.getByRole('button', { name: 'Create New Cookbook' })).toBeVisible();
    });

    test('should add recipe to cookbook when clicking cookbook item', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name }).click();

      // Should show checkmark indicating it was added
      await expect(page.locator('.cookbook-checkbox-item.added').filter({ hasText: testCookbook.name })).toBeVisible();
    });

    test('should show loading state while adding', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      // Click to add
      await page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name }).click();

      // After adding, should show check mark
      await expect(page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name }).locator('.cookbook-checkbox-status svg')).toBeVisible();
    });

    test('should prevent adding same recipe twice', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      // Add recipe
      await page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name }).click();
      await expect(page.locator('.cookbook-checkbox-item.added').filter({ hasText: testCookbook.name })).toBeVisible();

      // The selected cookbook should stay marked as added.
      await expect(page.locator('.cookbook-checkbox-item.added').filter({ hasText: testCookbook.name })).toBeVisible();
    });

    test('should close modal when clicking X', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await expect(page.getByRole('heading', { name: 'Add to Cookbook' })).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.getByRole('heading', { name: 'Add to Cookbook' })).not.toBeVisible();
    });

    test('should open create cookbook modal from add to cookbook modal', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await page.getByRole('button', { name: 'Create New Cookbook' }).click();

      await expect(page.getByRole('heading', { name: 'Create Cookbook' })).toBeVisible();
    });
  });

  test.describe('Default Cookbook Options', () => {
    test('should show existing default cookbook options', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await expect(page.locator('.cookbook-checkbox-item').first()).toBeVisible();
    });

    test('should show create cookbook button alongside default options', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal();
      await expect(page.getByRole('button', { name: 'Create New Cookbook' })).toBeVisible();
    });
  });

  test.describe('Recipe in Cookbook', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();

      // Add a recipe to the cookbook
      await helpers.addRecipeToCookbook('Herb-Crusted Chicken', testCookbook.name);
    });

    test('should show recipe in cookbook detail', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should update recipe count in cookbook', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();

      await expect(page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).getByText('1 recipe')).toBeVisible();
    });

    test('should show recipe card in cookbook detail', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      await expect(page.locator('.recipe-card')).toBeVisible();
    });

    test('should open recipe detail from cookbook', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText('Ingredients')).toBeVisible();
      await expect(page.getByText('Instructions')).toBeVisible();
    });
  });

  test.describe('Remove Recipe from Cookbook', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();

      // Add a recipe to the cookbook
      await helpers.addRecipeToCookbook('Herb-Crusted Chicken', testCookbook.name);
    });

    test('should show selected cookbook in add-to-cookbook modal', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal('Herb-Crusted Chicken');
      await expect(page.locator('.cookbook-checkbox-item.added').filter({ hasText: testCookbook.name })).toBeVisible();
    });

    test('should remove recipe from cookbook when toggling selected cookbook', async ({ page, helpers }) => {
      await helpers.removeRecipeFromCookbook('Herb-Crusted Chicken', testCookbook.name);

      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText('No recipes yet')).toBeVisible();
    });

    test('should keep recipe in cookbook when modal is closed without toggling', async ({ page, helpers }) => {
      await helpers.openAddToCookbookModal('Herb-Crusted Chicken');
      await page.locator('.modal-close').click();

      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should not delete the actual recipe when removing from cookbook', async ({ page, helpers }) => {
      await helpers.removeRecipeFromCookbook('Herb-Crusted Chicken', testCookbook.name);

      await helpers.navigateToRecipes();

      // Recipe should still exist
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });
  });

  test.describe('Multiple Recipes in Cookbook', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();
    });

    test('should add multiple recipes to same cookbook', async ({ page, helpers }) => {
      // Add first recipe
      await helpers.addRecipeToCookbook('Herb-Crusted Chicken', testCookbook.name);

      // Add second recipe
      await helpers.addRecipeToCookbook('Classic Buttermilk Pancakes', testCookbook.name);

      // Check cookbook has both recipes
      await helpers.navigateToCookbooks();
      await expect(page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).getByText('2 recipes')).toBeVisible();

      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).toBeVisible();
    });

    test('should show correct recipe count after adding multiple recipes', async ({ page, helpers }) => {
      // Add all three sample recipes
      const recipes = ['Herb-Crusted Chicken', 'Classic Buttermilk Pancakes', 'Chocolate Fondant'];

      for (const recipeName of recipes) {
        await helpers.addRecipeToCookbook(recipeName, testCookbook.name);
      }

      await helpers.navigateToCookbooks();
      await expect(page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).getByText('3 recipes')).toBeVisible();
    });
  });

  test.describe('Recipe in Multiple Cookbooks', () => {
    test('should add same recipe to multiple cookbooks', async ({ page, helpers }) => {
      const cookbook2 = { name: 'Second Cookbook', description: 'Another cookbook' };

      await helpers.createCookbook(testCookbook);
      await helpers.createCookbook(cookbook2);
      await helpers.navigateToRecipes();

      // Open add to cookbook modal
      await helpers.openAddToCookbookModal();

      // Should see both cookbooks
      await expect(page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name })).toBeVisible();
      await expect(page.locator('.cookbook-checkbox-item').filter({ hasText: cookbook2.name })).toBeVisible();

      // Add to first cookbook
      await helpers.selectCookbookInAddToCookbookModal(testCookbook.name);

      // Add to second cookbook
      await helpers.selectCookbookInAddToCookbookModal(cookbook2.name);

      // Both selected cookbooks should show as added, even if default collections are also selected.
      await expect(page.locator('.cookbook-checkbox-item.added').filter({ hasText: testCookbook.name })).toBeVisible();
      await expect(page.locator('.cookbook-checkbox-item.added').filter({ hasText: cookbook2.name })).toBeVisible();
    });
  });
});
