import type { Page, TestInfo } from '@playwright/test';
import { test, expect, type E2ERecipe } from './fixtures';

function uniqueSuffix(testInfo: TestInfo, label: string) {
  return `${label}-${testInfo.workerIndex}-${Date.now()}`;
}

function trackClientErrors(page: Page) {
  const errors: string[] = [];

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  page.on('console', message => {
    if (message.type() !== 'error') return;

    const text = message.text();
    if (/Failed to load resource|favicon|ResizeObserver loop/i.test(text)) return;

    errors.push(`console.error: ${text}`);
  });

  return errors;
}

async function expectHealthyApp(page: Page) {
  await expect(page.locator('.loading-screen')).not.toBeVisible({ timeout: 10000 });
  await expect(page.locator('.app')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Cannot read properties|ReferenceError|TypeError|Unhandled/i);
}

function expectNoNewClientErrors(errors: string[], startIndex: number) {
  expect(errors.slice(startIndex)).toEqual([]);
}

async function getSharePath(page: Page, prefix: '/shared/' | '/shared-recipe/') {
  const shareLink = page.locator('.share-link-url').first();
  const value = (await shareLink.getAttribute('title')) ?? await shareLink.textContent();
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = value?.match(new RegExp(`${escapedPrefix}[^\\s]+`));

  if (!match) {
    throw new Error(`Could not find ${prefix} share URL in "${value ?? ''}"`);
  }

  return match[0];
}

async function assertLoggedOutRoute(
  page: Page,
  path: string,
  assertion: (page: Page) => Promise<void>
) {
  const errors = trackClientErrors(page);

  await page.evaluate(async () => {
    const { createDevClient } = await import('/src/client/devClient.ts');
    const client = await createDevClient();
    await client.auth.logout();
  });
  await page.goto(path);
  await assertion(page);
  await expectHealthyApp(page);
  expect(errors).toEqual([]);
}

async function seedAuthenticatedSmokeState(page: Page, testInfo: TestInfo) {
  const suffix = uniqueSuffix(testInfo, 'route-smoke');
  const user = {
    email: `${suffix}@example.com`,
    name: 'Route Smoke User',
    password: 'RouteSmoke123!',
  };
  const recipe = {
    title: `Route Smoke Bowl ${suffix}`,
    description: 'A public recipe used to prove production routes render real app data.',
    ingredients: ['rice', 'beans', 'lime'],
    instructions: ['Cook rice', 'Warm beans', 'Finish with lime'],
    tags: ['smoke', 'dinner'],
    prepTime: '12 mins',
    cookTime: '18 mins',
    servings: '2',
  };
  const cookbook = {
    name: `Route Smoke Cookbook ${suffix}`,
    description: 'A public cookbook for route smoke coverage.',
  };

  await page.goto('/');

  const seed = await page.evaluate(async ({ user, recipe, cookbook }) => {
    const { createDevClient } = await import('/src/client/devClient.ts');
    const client = await createDevClient();
    const fail = (message: string): never => {
      throw new Error(message);
    };

    const registration = await client.auth.register(user.email, user.name, user.password);
    const registeredUser = registration.data?.user;
    if (!registeredUser) {
      fail(`Could not register route smoke user: ${registration.error ?? 'missing user'}`);
    }

    const recipeResult = await client.recipes.create({ ...recipe, isPublic: true });
    const recipeId = recipeResult.data?.id;
    if (!recipeId) {
      fail(`Could not create route smoke recipe: ${recipeResult.error ?? 'missing id'}`);
    }

    const cookbookResult = await client.cookbooks.create({ ...cookbook, isPublic: true });
    const cookbookId = cookbookResult.data?.id;
    if (!cookbookId) {
      fail(`Could not create route smoke cookbook: ${cookbookResult.error ?? 'missing id'}`);
    }

    const addRecipeResult = await client.cookbooks.addRecipe(cookbookId, recipeId);
    if (addRecipeResult.error) {
      fail(`Could not add route smoke recipe to cookbook: ${addRecipeResult.error}`);
    }

    const publicCookbooks = await client.discover.cookbooks({ limit: 10, offset: 0 });
    const publicCookbook = publicCookbooks.data?.cookbooks.find(item => item.id !== cookbookId);
    if (!publicCookbook) {
      fail('Could not find a community cookbook for route smoke coverage');
    }

    const publicRecipes = await client.discover.recipes({ limit: 10, offset: 0 });
    const publicRecipe = publicRecipes.data?.recipes.find(item => item.id !== recipeId);
    if (!publicRecipe) {
      fail('Could not find a community recipe for route smoke coverage');
    }

    return {
      userId: registeredUser.id,
      userName: registeredUser.name,
      cookbookId,
      cookbookName: cookbook.name,
      recipeTitle: recipe.title,
      publicCookbookId: publicCookbook.id,
      publicCookbookName: publicCookbook.name,
      publicRecipeTitle: publicRecipe.title,
    };
  }, { user, recipe, cookbook });

  await page.goto('/my-recipes');
  await expect(page.getByRole('heading', { name: 'My Recipes' })).toBeVisible({ timeout: 10000 });

  return seed;
}

test.describe('Production smoke coverage', () => {
  test('keeps authenticated production routes rendering without client errors', async ({ page }, testInfo) => {
    const errors = trackClientErrors(page);
    const seed = await seedAuthenticatedSmokeState(page, testInfo);

    const routeChecks: Array<{
      path: string;
      assert: (page: Page) => Promise<void>;
    }> = [
      {
        path: '/',
        assert: async currentPage => {
          await expect(currentPage).toHaveURL(/\/my-recipes$/);
          await expect(currentPage.getByRole('heading', { name: 'My Recipes' })).toBeVisible();
        },
      },
      {
        path: '/recipes',
        assert: async currentPage => {
          await expect(currentPage).toHaveURL(/\/my-recipes$/);
          await expect(currentPage.getByText(seed.recipeTitle)).toBeVisible();
        },
      },
      {
        path: '/my-recipes',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'My Recipes' })).toBeVisible();
          await expect(currentPage.getByRole('button', { name: 'New Recipe' })).toBeVisible();
        },
      },
      {
        path: '/cookbooks',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'Cookbooks' })).toBeVisible();
          await expect(currentPage.locator('.cookbook-card-link').filter({ hasText: seed.cookbookName })).toBeVisible();
        },
      },
      {
        path: `/cookbooks/${seed.cookbookId}`,
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: seed.cookbookName })).toBeVisible();
          await expect(currentPage.getByText(seed.recipeTitle)).toBeVisible();
        },
      },
      {
        path: '/discover',
        assert: async currentPage => {
          await expect(currentPage).toHaveURL(/\/discover\/recipes$/);
          await expect(currentPage.getByRole('heading', { name: 'Discover' })).toBeVisible();
        },
      },
      {
        path: '/discover/recipes',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'Community recipes' })).toBeVisible();
          await expect(currentPage.getByText(seed.publicRecipeTitle).first()).toBeVisible();
        },
      },
      {
        path: '/discover/cookbooks',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'Shared cookbooks' })).toBeVisible();
          await expect(currentPage.getByText(seed.publicCookbookName).first()).toBeVisible();
        },
      },
      {
        path: `/discover/cookbooks/${seed.publicCookbookId}`,
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: seed.publicCookbookName })).toBeVisible();
          await expect(currentPage.getByRole('button', { name: /Save Cookbook|Saved/ })).toBeVisible();
        },
      },
      {
        path: '/meal-planner',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'AI Meal Planner' })).toBeVisible();
          await expect(currentPage.getByRole('button', { name: 'Get Suggestions' })).toBeVisible();
        },
      },
      {
        path: '/settings',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'Settings' })).toBeVisible();
          await expect(currentPage.locator('.settings-page').getByText(seed.userName)).toBeVisible();
          await expect(currentPage.getByRole('heading', { name: 'Subscription' })).toBeVisible();
        },
      },
      {
        path: '/profile',
        assert: async currentPage => {
          await expect(currentPage).toHaveURL(new RegExp(`/profiles/${seed.userId}$`));
          await expect(currentPage.getByRole('heading', { name: seed.userName })).toBeVisible();
        },
      },
      {
        path: `/profiles/${seed.userId}`,
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: seed.userName })).toBeVisible();
          await expect(currentPage.getByRole('button', { name: 'Edit' })).toBeVisible();
        },
      },
      {
        path: '/terms',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'Terms of Use' })).toBeVisible();
        },
      },
      {
        path: '/feedback',
        assert: async currentPage => {
          await expect(currentPage.getByRole('heading', { name: 'Give Feedback' })).toBeVisible();
          await expect(currentPage.getByRole('button', { name: 'Send Feedback' })).toBeDisabled();
        },
      },
    ];

    for (const route of routeChecks) {
      const errorIndex = errors.length;
      await page.goto(route.path);
      await route.assert(page);
      await expectHealthyApp(page);
      expectNoNewClientErrors(errors, errorIndex);
    }
  });

  test('covers account creation, recipe/cookbook creation, and public share links', async ({ page, helpers }, testInfo) => {
    const errors = trackClientErrors(page);
    const suffix = uniqueSuffix(testInfo, 'share-smoke');
    const user = {
      email: `${suffix}@example.com`,
      name: 'Share Smoke User',
      password: 'ShareSmoke123!',
    };
    const recipe: E2ERecipe = {
      title: `Share Smoke Tacos ${suffix}`,
      description: 'A crisp production-smoke recipe for sharing.',
      ingredients: 'tortillas\nbeans\nsalsa\ncilantro',
      instructions: 'Warm tortillas\nFill with beans\nTop with salsa and cilantro',
      tags: 'smoke, tacos',
      prepTime: '10 mins',
      cookTime: '8 mins',
      servings: '3',
    };
    const cookbook = {
      name: `Share Smoke Cookbook ${suffix}`,
      description: 'A cookbook created by the production smoke journey.',
    };

    await helpers.register(user);
    await helpers.createRecipe(recipe);

    await page.getByPlaceholder('Search recipes').fill(recipe.title);
    await expect(page.locator('.recipe-card')).toHaveCount(1);
    await expect(page.getByText(recipe.title)).toBeVisible();
    await page.getByPlaceholder('Search recipes').fill('');

    await helpers.createCookbook(cookbook);
    await helpers.navigateToRecipes();
    await helpers.addRecipeToCookbook(recipe.title, cookbook.name);

    await page.locator('.recipe-card').filter({ hasText: recipe.title }).click();
    await expect(page.locator('.modal-detail')).toBeVisible();
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByRole('heading', { name: `Share "${recipe.title}"` })).toBeVisible();
    await page.getByText('Share Link').click();
    await page.locator('.share-modal .share-link-actions button').click();
    await expect(page.locator('.share-modal .share-link-url')).toContainText('/shared-recipe/', { timeout: 10000 });
    const recipeSharePath = await getSharePath(page, '/shared-recipe/');
    await page.locator('.share-modal .modal-close').click();
    await page.locator('.modal-detail .modal-close').click();

    await helpers.navigateToCookbooks();
    await page.locator('.cookbook-card-link').filter({ hasText: cookbook.name }).click();
    await expect(page.getByText(recipe.title)).toBeVisible();
    await page.getByRole('button', { name: 'Share' }).click();
    await page.getByText('Share Link').click();
    await page.getByRole('button', { name: 'Generate New Link' }).click();
    await expect(page.locator('.share-link-url')).toContainText('/shared/', { timeout: 10000 });
    const cookbookSharePath = await getSharePath(page, '/shared/');

    await assertLoggedOutRoute(page, recipeSharePath, async anonymousPage => {
      await expect(anonymousPage.getByRole('heading', { name: recipe.title })).toBeVisible({ timeout: 10000 });
      await expect(anonymousPage.getByRole('heading', { name: 'Ingredients' })).toBeVisible();
      await expect(anonymousPage.getByRole('button', { name: 'Save to Recipesaurus' })).toBeVisible();
    });

    await assertLoggedOutRoute(page, cookbookSharePath, async anonymousPage => {
      await expect(anonymousPage.getByRole('heading', { name: cookbook.name })).toBeVisible({ timeout: 10000 });
      await expect(anonymousPage.getByText(recipe.title)).toBeVisible();
      await expect(anonymousPage.getByText('Shared by')).toBeVisible();
    });

    expect(errors).toEqual([]);
  });

  test('covers discovery saves and AI meal planner suggestions', async ({ page, helpers }, testInfo) => {
    const errors = trackClientErrors(page);
    const suffix = uniqueSuffix(testInfo, 'discover-smoke');
    const user = {
      email: `${suffix}@example.com`,
      name: 'Discovery Smoke User',
      password: 'DiscoverySmoke123!',
    };

    await helpers.register(user);

    await page.goto('/discover/recipes');
    await expect(page.getByRole('heading', { name: 'Community recipes' })).toBeVisible({ timeout: 10000 });
    const recipeCard = page.locator('.discovery-card').filter({
      has: page.getByRole('button', { name: 'Save recipe' }),
    }).first();
    const publicRecipeTitle = (await recipeCard.locator('.discovery-card-title').innerText()).trim();
    await recipeCard.locator('.discovery-card-title').click();
    await expect(page.locator('.modal-detail').getByRole('heading', { name: publicRecipeTitle })).toBeVisible();
    await page.locator('.modal-detail').getByRole('button', { name: /Save Recipe|Save to My Recipes/ }).click();
    await expect(page.getByText('Saved to My Recipes')).toBeVisible({ timeout: 10000 });

    await page.goto('/my-recipes');
    await expect(page.getByText(publicRecipeTitle)).toBeVisible({ timeout: 10000 });

    await page.goto('/discover/cookbooks');
    await expect(page.getByRole('heading', { name: 'Shared cookbooks' })).toBeVisible({ timeout: 10000 });
    const cookbookCard = page.locator('.discovery-card').filter({
      has: page.getByRole('button', { name: 'Save cookbook' }),
    }).first();
    const publicCookbookName = (await cookbookCard.locator('.discovery-card-title').innerText()).trim();
    await cookbookCard.locator('.discovery-card-title').click();
    await expect(page.locator('.public-cookbook-header h1')).toHaveText(publicCookbookName, { timeout: 10000 });
    await page.getByRole('button', { name: 'Save Cookbook' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 10000 });

    await page.goto('/cookbooks');
    await expect(page.locator('.cookbook-card-link').filter({ hasText: publicCookbookName }).first()).toBeVisible({ timeout: 10000 });

    await page.goto('/meal-planner');
    await expect(page.getByRole('heading', { name: 'AI Meal Planner' })).toBeVisible({ timeout: 10000 });
    await page.getByLabel('What should Recipesaurus plan?').fill(
      `Plan two easy dinners using ${publicRecipeTitle} and one vegetable side.`
    );
    await page.getByRole('button', { name: 'Get Suggestions' }).click();
    await expect(page.getByRole('heading', { name: 'Suggestions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.meal-planner-result')).toContainText(publicRecipeTitle);

    await page.getByRole('button', { name: 'Expand history' }).click();
    await expect(page.locator('.meal-planner-history-item').first()).toContainText('Plan two easy dinners');

    expect(errors).toEqual([]);
  });
});
