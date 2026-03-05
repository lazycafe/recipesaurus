import { test, expect, testCookbook } from './fixtures';

test.describe('Shared Cookbook Collaboration', () => {
  const owner = {
    email: `collab-owner-${Date.now()}@example.com`,
    name: 'Cookbook Owner',
    password: 'OwnerPass123!',
  };

  const collaborator = {
    email: `collab-user-${Date.now()}@example.com`,
    name: 'Collaborator',
    password: 'CollabPass123!',
  };

  // Pre-register the collaborator
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.getByLabel('Name').fill(collaborator.name);
    await page.getByLabel('Email').fill(collaborator.email);
    await page.locator('#password').fill(collaborator.password);
    await page.locator('#confirmPassword').fill(collaborator.password);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText(collaborator.name)).toBeVisible({ timeout: 10000 });
    await page.close();
  });

  test.describe('Shared User Adding Recipes', () => {
    test.beforeEach(async ({ page, helpers }) => {
      // Owner creates cookbook and shares it
      await helpers.register(owner);
      await helpers.createCookbook(testCookbook);

      // Add a recipe to the cookbook as owner
      await helpers.navigateToRecipes();
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();

      // Share with collaborator
      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(collaborator.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${collaborator.name}`)).toBeVisible({ timeout: 10000 });

      // Logout and login as collaborator
      await page.locator('.modal-close').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
      await helpers.logout();
      await helpers.login(collaborator);
    });

    test('should show shared cookbook in add to cookbook modal', async ({ page, helpers }) => {
      await helpers.navigateToRecipes();
      const card = page.locator('.recipe-card').filter({ hasText: 'Classic Buttermilk Pancakes' });
      await card.hover();
      await card.locator('.card-action').first().click();

      await expect(page.getByText(testCookbook.name)).toBeVisible();
      await expect(page.getByText(`Shared by ${owner.name}`)).toBeVisible();
    });

    test('should allow shared user to add recipe to shared cookbook', async ({ page, helpers }) => {
      await helpers.navigateToRecipes();
      const card = page.locator('.recipe-card').filter({ hasText: 'Classic Buttermilk Pancakes' });
      await card.hover();
      await card.locator('.card-action').first().click();

      await page.locator('.cookbook-checkbox-item').click();
      await expect(page.locator('.cookbook-checkbox-item.added')).toBeVisible({ timeout: 5000 });
    });

    test('should show recipe added by collaborator in cookbook', async ({ page, helpers }) => {
      // Add a recipe as collaborator
      await helpers.navigateToRecipes();
      const card = page.locator('.recipe-card').filter({ hasText: 'Classic Buttermilk Pancakes' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();

      // View the shared cookbook
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();
      await page.getByText(testCookbook.name).click();

      // Should see both recipes
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).toBeVisible();
    });
  });

  test.describe('Recipe Attribution', () => {
    test.beforeEach(async ({ page, helpers }) => {
      // Owner creates cookbook, adds recipe, and shares
      await helpers.register(owner);
      await helpers.createCookbook(testCookbook);

      // Owner adds a recipe
      await helpers.navigateToRecipes();
      let card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();

      // Share with collaborator
      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(collaborator.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${collaborator.name}`)).toBeVisible({ timeout: 10000 });

      // Logout, login as collaborator, add recipe
      await page.locator('.modal-close').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
      await helpers.logout();
      await helpers.login(collaborator);

      await helpers.navigateToRecipes();
      card = page.locator('.recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
    });

    test('should show who added each recipe', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();
      await page.getByText(testCookbook.name).click();

      // Should show "Added by" attribution for both recipes
      await expect(page.locator('.recipe-added-by')).toHaveCount(2);
    });

    test('should show owner name for owner-added recipes', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();
      await page.getByText(testCookbook.name).click();

      await expect(page.getByText(`Added by ${owner.name}`)).toBeVisible();
    });

    test('should show collaborator name for collaborator-added recipes', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();
      await page.getByText(testCookbook.name).click();

      await expect(page.getByText(`Added by ${collaborator.name}`)).toBeVisible();
    });
  });

  test.describe('Shared User Removing Recipes', () => {
    test.beforeEach(async ({ page, helpers }) => {
      // Owner creates cookbook, adds recipe, and shares
      await helpers.register(owner);
      await helpers.createCookbook(testCookbook);

      // Owner adds a recipe
      await helpers.navigateToRecipes();
      let card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();

      // Share with collaborator
      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(collaborator.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${collaborator.name}`)).toBeVisible({ timeout: 10000 });

      // Logout, login as collaborator
      await page.locator('.modal-close').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
      await helpers.logout();
      await helpers.login(collaborator);

      // Add a recipe as collaborator
      await helpers.navigateToRecipes();
      card = page.locator('.recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await card.hover();
      await card.locator('.card-action').first().click();
      await page.locator('.cookbook-checkbox-item').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
    });

    test('should show remove button only on own recipes for shared user', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();
      await page.getByText(testCookbook.name).click();

      // Collaborator's recipe (Chocolate Fondant) should have remove button
      const collabRecipe = page.locator('.cookbook-recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await collabRecipe.hover();
      await expect(collabRecipe.locator('.remove-from-cookbook')).toBeVisible();

      // Owner's recipe (Herb-Crusted Chicken) should NOT have remove button for collaborator
      const ownerRecipe = page.locator('.cookbook-recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await ownerRecipe.hover();
      await expect(ownerRecipe.locator('.remove-from-cookbook')).not.toBeVisible();
    });

    test('should allow collaborator to remove their own recipe', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();
      await page.getByText(testCookbook.name).click();

      const collabRecipe = page.locator('.cookbook-recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await collabRecipe.hover();
      await collabRecipe.locator('.remove-from-cookbook').click();

      await page.getByRole('button', { name: 'Remove' }).click();

      await expect(page.getByText('Chocolate Fondant')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('owner can remove any recipe including collaborator added ones', async ({ page, helpers, browser }) => {
      // Logout and login as owner
      await helpers.logout();
      await helpers.login(owner);

      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();

      // Owner should be able to see remove button on all recipes
      const collabRecipe = page.locator('.cookbook-recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await collabRecipe.hover();
      await expect(collabRecipe.locator('.remove-from-cookbook')).toBeVisible();

      // Remove collaborator's recipe
      await collabRecipe.locator('.remove-from-cookbook').click();
      await page.getByRole('button', { name: 'Remove' }).click();

      await expect(page.getByText('Chocolate Fondant')).not.toBeVisible({ timeout: 5000 });
    });
  });
});
