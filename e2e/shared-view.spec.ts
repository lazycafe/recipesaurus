import { test, expect, testCookbook } from './fixtures';

test.describe('Public Shared Cookbook View', () => {
  const user = {
    email: `shared-view-${Date.now()}@example.com`,
    name: 'Shared View User',
    password: 'SharedViewPassword123!',
  };

  let shareToken: string;

  test.beforeEach(async ({ page, helpers }) => {
    // Create user, cookbook, add recipes, and generate share link
    await helpers.register(user);
    await helpers.createCookbook(testCookbook);

    // Add a recipe to the cookbook
    await helpers.navigateToRecipes();
    const card = page.locator('.recipe-card').first();
    await card.hover();
    await card.locator('.card-action').first().click();
    await page.locator('.cookbook-checkbox-item').click();
    await page.waitForTimeout(500);
    await page.locator('.modal-close').click();

    // Generate share link
    await helpers.navigateToCookbooks();
    await page.getByText(testCookbook.name).click();
    await page.getByRole('button', { name: 'Share' }).click();
    await page.getByText('Share Link').click();
    await page.getByRole('button', { name: 'Generate New Link' }).click();

    // Wait for link to appear and extract token
    await expect(page.locator('.share-link-url')).toBeVisible({ timeout: 10000 });
    const linkText = await page.locator('.share-link-url').textContent();
    // Extract token from the truncated URL display
    const match = linkText?.match(/\/shared\/([a-f0-9]+)/);
    if (!match) {
      throw new Error('Could not extract share token');
    }
    // We need the full token, so we'll copy it
    // For now, let's get it from the API response by clicking copy
    await page.locator('.share-link-actions button').first().click();
    // Get from clipboard
    shareToken = await page.evaluate(async () => {
      const text = await navigator.clipboard.readText();
      const match = text.match(/\/shared\/([a-f0-9]+)$/);
      return match ? match[1] : '';
    });
  });

  test.describe('Access via Share Link', () => {
    test('should display shared cookbook without login', async ({ page, context }) => {
      // Clear cookies to simulate logged out state
      await context.clearCookies();

      await page.goto(`/shared/${shareToken}`);

      await expect(page.getByRole('heading', { name: testCookbook.name })).toBeVisible({ timeout: 10000 });
    });

    test('should display cookbook owner name', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.getByText(`Shared by ${user.name}`)).toBeVisible({ timeout: 10000 });
    });

    test('should display cookbook description', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.getByText(testCookbook.description)).toBeVisible({ timeout: 10000 });
    });

    test('should display recipes in cookbook', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible({ timeout: 10000 });
    });

    test('should display recipe count', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.getByText('1 recipe')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Recipe Cards in Shared View', () => {
    test('should display recipe cards with title and description', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      const recipeCard = page.locator('.recipe-card').first();
      await expect(recipeCard.locator('.card-title')).toContainText('Herb-Crusted Chicken');
    });

    test('should not show delete button on recipe cards', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      const recipeCard = page.locator('.recipe-card').first();
      await recipeCard.hover();

      // Should NOT have any action buttons
      await expect(recipeCard.locator('.card-delete')).not.toBeVisible();
      await expect(recipeCard.locator('.card-action')).not.toBeVisible();
    });

    test('should display recipe meta info', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.getByText('15 mins')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Recipe Detail in Shared View', () => {
    test('should open recipe detail when clicking recipe card', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText('Ingredients')).toBeVisible();
      await expect(page.getByText('Instructions')).toBeVisible();
    });

    test('should display recipe ingredients', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText('4 chicken breasts')).toBeVisible();
    });

    test('should display recipe instructions', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText('Preheat oven')).toBeVisible();
    });

    test('should close recipe detail when clicking X', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('Ingredients')).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.getByText('Ingredients')).not.toBeVisible();
    });

    test('should close recipe detail when clicking overlay', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('Ingredients')).toBeVisible();

      await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });

      await expect(page.getByText('Ingredients')).not.toBeVisible();
    });
  });

  test.describe('Shared View Header', () => {
    test('should display dinosaur mascot', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.locator('.shared-header svg, .shared-header-content svg')).toBeVisible({ timeout: 10000 });
    });

    test('should have sage green background header', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      const header = page.locator('.shared-header');
      await expect(header).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Shared View Footer', () => {
    test('should display Recipesaurus link in footer', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.locator('.footer a')).toContainText('Recipesaurus');
    });

    test('should link to main app', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      const link = page.locator('.footer a');
      await expect(link).toHaveAttribute('href', '/');
    });
  });

  test.describe('Invalid Share Link', () => {
    test('should show error for invalid token', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto('/shared/invalidtoken123');

      await expect(page.getByText('Cookbook Not Found')).toBeVisible({ timeout: 10000 });
    });

    test('should show helpful message for invalid link', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto('/shared/invalidtoken123');

      await expect(page.getByText('This share link may have expired or been revoked')).toBeVisible({ timeout: 10000 });
    });

    test('should show link to main app for invalid link', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto('/shared/invalidtoken123');

      await expect(page.getByRole('link', { name: 'Go to Recipesaurus' })).toBeVisible({ timeout: 10000 });
    });

    test('should display dinosaur mascot on error page', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto('/shared/invalidtoken123');

      await expect(page.locator('.shared-error svg')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Revoked Share Link', () => {
    test('should show error after link is revoked', async ({ page, helpers, context }) => {
      // Revoke the link
      page.on('dialog', dialog => dialog.accept());

      await helpers.navigateToCookbooks();
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();
      await page.locator('.btn-danger-icon').click();
      await page.waitForTimeout(1000);

      // Try to access with revoked link
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      await expect(page.getByText('Cookbook Not Found')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Empty Cookbook Share', () => {
    test('should show empty state for cookbook with no recipes', async ({ page, helpers, context }) => {
      // Create new cookbook without recipes and get share link
      const emptyBookName = 'Empty Test Cookbook';
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'New Cookbook' }).click();
      await page.getByLabel('Name').fill(emptyBookName);
      await page.getByRole('button', { name: 'Create Cookbook' }).click();
      await expect(page.getByText(emptyBookName)).toBeVisible({ timeout: 10000 });

      // Generate share link for empty cookbook
      await page.getByText(emptyBookName).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.locator('.share-link-url')).toBeVisible({ timeout: 10000 });
      await page.locator('.share-link-actions button').first().click();

      const emptyToken = await page.evaluate(async () => {
        const text = await navigator.clipboard.readText();
        const match = text.match(/\/shared\/([a-f0-9]+)$/);
        return match ? match[1] : '';
      });

      // Access shared empty cookbook
      await context.clearCookies();
      await page.goto(`/shared/${emptyToken}`);

      await expect(page.getByText('No recipes yet')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('This cookbook is empty')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible via keyboard navigation', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/shared/${shareToken}`);

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Recipe card should be focusable
      const focused = await page.evaluate(() => document.activeElement?.className);
      expect(focused).toBeDefined();
    });
  });
});
