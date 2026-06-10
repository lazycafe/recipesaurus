import { test, expect, testCookbook } from './fixtures';
import type { Page } from '@playwright/test';

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

  async function logoutToHome(page: Page) {
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Get Started', exact: true })).toBeVisible();
  }

  async function seedSharedCookbook(page: Page, options: { addCollaboratorRecipe?: boolean } = {}) {
    await page.goto('/');

    await page.evaluate(async ({ owner, collaborator, cookbook, addCollaboratorRecipe }) => {
      const { createDevClient } = await import('/src/client/devClient.ts');
      const client = await createDevClient();

      const fail = (message: string): never => {
        throw new Error(message);
      };

      const collaboratorRegistration = await client.auth.register(
        collaborator.email,
        collaborator.name,
        collaborator.password
      );
      if (!collaboratorRegistration.data?.user) {
        fail(`Could not register collaborator: ${collaboratorRegistration.error ?? 'missing user'}`);
      }

      await client.auth.logout();

      const ownerRegistration = await client.auth.register(owner.email, owner.name, owner.password);
      if (!ownerRegistration.data?.user) {
        fail(`Could not register owner: ${ownerRegistration.error ?? 'missing user'}`);
      }

      const cookbookResult = await client.cookbooks.create(cookbook);
      const cookbookId = cookbookResult.data?.id;
      if (!cookbookId) {
        fail(`Could not create cookbook: ${cookbookResult.error ?? 'missing id'}`);
      }

      const ownerRecipes = await client.recipes.list();
      const ownerRecipe = ownerRecipes.data?.recipes.find(recipe => recipe.title === 'Herb-Crusted Chicken');
      if (!ownerRecipe) {
        fail('Could not find owner sample recipe');
      }

      const addOwnerRecipe = await client.cookbooks.addRecipe(cookbookId, ownerRecipe.id);
      if (addOwnerRecipe.error) {
        fail(`Could not add owner recipe: ${addOwnerRecipe.error}`);
      }

      const shareResult = await client.cookbooks.shareByEmail(cookbookId, collaborator.email);
      if (shareResult.error) {
        fail(`Could not share cookbook: ${shareResult.error}`);
      }

      await client.auth.logout();

      const collaboratorLogin = await client.auth.login(collaborator.email, collaborator.password);
      if (!collaboratorLogin.data?.user) {
        fail(`Could not log in collaborator: ${collaboratorLogin.error ?? 'missing user'}`);
      }

      const notifications = await client.notifications.list();
      const inviteId = notifications.data?.notifications.find(
        notification => notification.type === 'cookbook_invite' && notification.data?.cookbookId === cookbookId
      )?.data?.inviteId;
      if (!inviteId) {
        fail('Could not find cookbook invite notification');
      }

      const acceptInvite = await client.invites.accept(inviteId);
      if (acceptInvite.error) {
        fail(`Could not accept cookbook invite: ${acceptInvite.error}`);
      }

      if (addCollaboratorRecipe) {
        const collaboratorRecipes = await client.recipes.list();
        const collaboratorRecipe = collaboratorRecipes.data?.recipes.find(recipe => recipe.title === 'Chocolate Fondant');
        if (!collaboratorRecipe) {
          fail('Could not find collaborator sample recipe');
        }

        const addCollaboratorRecipeResult = await client.cookbooks.addRecipe(cookbookId, collaboratorRecipe.id);
        if (addCollaboratorRecipeResult.error) {
          fail(`Could not add collaborator recipe: ${addCollaboratorRecipeResult.error}`);
        }
      }
    }, {
      owner,
      collaborator,
      cookbook: testCookbook,
      addCollaboratorRecipe: Boolean(options.addCollaboratorRecipe),
    });

    await page.goto('/my-recipes');
    await expect(page.getByRole('heading', { name: 'My Recipes' })).toBeVisible({ timeout: 10000 });
  }

  test.describe('Shared User Adding Recipes', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await seedSharedCookbook(page);
    });

    test('should show shared cookbook in add to cookbook modal', async ({ page, helpers }) => {
      await helpers.navigateToRecipes();
      const card = page.locator('.recipe-card').filter({ hasText: 'Classic Buttermilk Pancakes' });
      await card.hover();
      await card.locator('.card-action').first().click();

      const sharedOption = page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name });
      await expect(sharedOption).toBeVisible();
      await expect(sharedOption).toContainText(`Shared by ${owner.name}`);
    });

    test('should allow shared user to add recipe to shared cookbook', async ({ page, helpers }) => {
      await helpers.navigateToRecipes();
      const card = page.locator('.recipe-card').filter({ hasText: 'Classic Buttermilk Pancakes' });
      await card.hover();
      await card.locator('.card-action').first().click();

      await page.locator('.cookbook-checkbox-item').filter({ hasText: testCookbook.name }).click();
      await expect(page.locator('.cookbook-checkbox-item.added').filter({ hasText: testCookbook.name })).toBeVisible({ timeout: 5000 });
    });

    test('should show recipe added by collaborator in cookbook', async ({ page, helpers }) => {
      // Add a recipe as collaborator
      await helpers.navigateToRecipes();
      await helpers.addRecipeToCookbook('Classic Buttermilk Pancakes', testCookbook.name);

      // View the shared cookbook
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      // Should see both recipes
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).toBeVisible();
    });
  });

  test.describe('Recipe Attribution', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await seedSharedCookbook(page, { addCollaboratorRecipe: true });
    });

    test('should show who added each recipe', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      // Should show "Added by" attribution for both recipes
      await expect(page.locator('.card-footer').filter({ hasText: 'Added by' })).toHaveCount(2);
    });

    test('should show owner name for owner-added recipes', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      await expect(page.getByText(`Added by ${owner.name}`)).toBeVisible();
    });

    test('should show collaborator name for collaborator-added recipes', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      await expect(page.getByText(`Added by ${collaborator.name}`)).toBeVisible();
    });
  });

  test.describe('Shared User Removing Recipes', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await seedSharedCookbook(page, { addCollaboratorRecipe: true });
    });

    test('should show remove button only on own recipes for shared user', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      // Collaborator's recipe (Chocolate Fondant) should have a delete button
      const collabRecipe = page.locator('.recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await collabRecipe.hover();
      await expect(collabRecipe.locator('.card-delete')).toBeVisible();

      // Owner's recipe (Herb-Crusted Chicken) should NOT have a delete button for collaborator
      const ownerRecipe = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await ownerRecipe.hover();
      await expect(ownerRecipe.locator('.card-delete')).not.toBeVisible();
    });

    test('should allow collaborator to remove their own recipe', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      const collabRecipe = page.locator('.recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await collabRecipe.hover();
      await collabRecipe.locator('.card-delete').click();

      await page.locator('.confirm-modal').getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page.getByText('Chocolate Fondant')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('owner does not get a delete control for collaborator-owned recipes', async ({ page, helpers }) => {
      // Logout and login as owner
      await logoutToHome(page);
      await helpers.login(owner);

      await helpers.navigateToCookbooks();
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      const collabRecipe = page.locator('.recipe-card').filter({ hasText: 'Chocolate Fondant' });
      await collabRecipe.hover();
      await expect(collabRecipe.locator('.card-delete')).not.toBeVisible();
    });
  });
});
