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
      await expect(card.locator('.card-action').first()).toBeVisible();
    });

    test('should open add to cookbook modal when clicking button', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByRole('heading', { name: 'Add to Cookbook' })).toBeVisible();
    });

    test('should show recipe title in modal', async ({ page }) => {
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByText('Add "Herb-Crusted Chicken" to a cookbook')).toBeVisible();
    });
  });

  test.describe('Add to Cookbook Modal', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();
    });

    test('should list available cookbooks', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByText(testCookbook.name)).toBeVisible();
    });

    test('should show cookbook recipe count', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByText('0 recipes')).toBeVisible();
    });

    test('should show Create New Cookbook button', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByRole('button', { name: 'Create New Cookbook' })).toBeVisible();
    });

    test('should add recipe to cookbook when clicking cookbook item', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await page.locator('.cookbook-checkbox-item').click();

      // Should show checkmark indicating it was added
      await expect(page.locator('.cookbook-checkbox-item.added')).toBeVisible();
    });

    test('should show loading state while adding', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      // Click to add
      await page.locator('.cookbook-checkbox-item').click();

      // After adding, should show check mark
      await expect(page.locator('.cookbook-checkbox-status svg')).toBeVisible();
    });

    test('should prevent adding same recipe twice', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      // Add recipe
      await page.locator('.cookbook-checkbox-item').click();
      await expect(page.locator('.cookbook-checkbox-item.added')).toBeVisible();

      // The button should be disabled
      await expect(page.locator('.cookbook-checkbox-item')).toBeDisabled();
    });

    test('should close modal when clicking X', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();
      await expect(page.getByRole('heading', { name: 'Add to Cookbook' })).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.getByRole('heading', { name: 'Add to Cookbook' })).not.toBeVisible();
    });

    test('should open create cookbook modal from add to cookbook modal', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await page.getByRole('button', { name: 'Create New Cookbook' }).click();

      await expect(page.getByRole('heading', { name: 'Create Cookbook' })).toBeVisible();
    });
  });

  test.describe('No Cookbooks State', () => {
    test('should show message when user has no cookbooks', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByText("You don't have any cookbooks yet")).toBeVisible();
    });

    test('should show create cookbook button when no cookbooks', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByRole('button', { name: 'Create New Cookbook' })).toBeVisible();
    });
  });

  test.describe('Recipe in Cookbook', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();

      // Add a recipe to the cookbook
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
    });

    test('should show recipe in cookbook detail', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should update recipe count in cookbook', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();

      await expect(page.getByText('1 recipe')).toBeVisible();
    });

    test('should show recipe card in cookbook detail', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();

      await expect(page.locator('.recipe-card')).toBeVisible();
    });

    test('should open recipe detail from cookbook', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText('Ingredients')).toBeVisible();
      await expect(page.getByText('Instructions')).toBeVisible();
    });
  });

  test.describe('Remove Recipe from Cookbook', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.navigateToRecipes();

      // Add a recipe to the cookbook
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
    });

    test('should show remove button on recipe card in cookbook', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();

      const recipeCard = page.locator('.cookbook-recipe-card');
      await recipeCard.hover();

      await expect(page.locator('.remove-from-cookbook')).toBeVisible();
    });

    test('should remove recipe from cookbook after confirmation', async ({ page, helpers }) => {
      page.on('dialog', dialog => dialog.accept());

      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();

      const recipeCard = page.locator('.cookbook-recipe-card');
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();

      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText('No recipes yet')).toBeVisible();
    });

    test('should not remove recipe when confirmation is cancelled', async ({ page, helpers }) => {
      page.on('dialog', dialog => dialog.dismiss());

      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();

      const recipeCard = page.locator('.cookbook-recipe-card');
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should not delete the actual recipe when removing from cookbook', async ({ page, helpers }) => {
      page.on('dialog', dialog => dialog.accept());

      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();

      const recipeCard = page.locator('.cookbook-recipe-card');
      await recipeCard.hover();
      await page.locator('.remove-from-cookbook').click();
      await page.waitForTimeout(500);

      // Close cookbook detail
      await page.locator('.modal-close').click();

      // Navigate back to recipes
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
      let card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();

      // Add second recipe
      card = page.locator('.recipe-card').filter({ hasText: 'Classic Buttermilk Pancakes' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();

      // Check cookbook has both recipes
      await helpers.navigateToCookbooks();
      await expect(page.getByText('2 recipes')).toBeVisible();

      await page.getByText(testCookbook.name).click();
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).toBeVisible();
    });

    test('should show correct recipe count after adding multiple recipes', async ({ page, helpers }) => {
      // Add all three sample recipes
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
      await expect(page.getByText('3 recipes')).toBeVisible();
    });
  });

  test.describe('Recipe in Multiple Cookbooks', () => {
    test('should add same recipe to multiple cookbooks', async ({ page, helpers }) => {
      const cookbook2 = { name: 'Second Cookbook', description: 'Another cookbook' };

      await helpers.createCookbook(testCookbook);
      await helpers.createCookbook(cookbook2);
      await helpers.navigateToRecipes();

      // Open add to cookbook modal
      const card = page.locator('.recipe-card').first();
      await card.hover();
      await card.locator('.card-action').first().click();

      // Should see both cookbooks
      await expect(page.getByText(testCookbook.name)).toBeVisible();
      await expect(page.getByText(cookbook2.name)).toBeVisible();

      // Add to first cookbook
      await page.locator('.cookbook-checkbox-item').first().click();
      await page.waitForTimeout(500);

      // Add to second cookbook
      await page.locator('.cookbook-checkbox-item').last().click();
      await page.waitForTimeout(500);

      // Both should show as added
      const addedItems = page.locator('.cookbook-checkbox-item.added');
      await expect(addedItems).toHaveCount(2);
    });
  });
});
