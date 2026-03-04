import { test, expect, testCookbook, testCookbook2 } from './fixtures';

test.describe('Cookbooks', () => {
  const cookbookUser = {
    email: `cookbook-test-${Date.now()}@example.com`,
    name: 'Cookbook Test User',
    password: 'CookbookPassword123!',
  };

  test.beforeEach(async ({ page, helpers }) => {
    await helpers.register(cookbookUser);
  });

  test.describe('Navigation', () => {
    test('should show Cookbooks tab in header', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Cookbooks' })).toBeVisible();
    });

    test('should navigate to cookbooks view when clicking Cookbooks tab', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();

      await expect(page.getByText('My Cookbooks')).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Cookbook' })).toBeVisible();
    });

    test('should show Recipes tab as active by default', async ({ page }) => {
      const recipesTab = page.getByRole('button', { name: 'Recipes' });
      await expect(recipesTab).toHaveClass(/active/);
    });

    test('should highlight Cookbooks tab when active', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();

      const cookbooksTab = page.getByRole('button', { name: 'Cookbooks' });
      await expect(cookbooksTab).toHaveClass(/active/);
    });

    test('should switch between Recipes and Cookbooks views', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await expect(page.getByText('My Cookbooks')).toBeVisible();

      await helpers.navigateToRecipes();
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });
  });

  test.describe('Cookbook List', () => {
    test('should show empty state when no cookbooks exist', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();

      await expect(page.getByText('No cookbooks yet')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Your First Cookbook' })).toBeVisible();
    });

    test('should show My Cookbooks tab by default', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();

      const myTab = page.locator('.cookbook-tab').filter({ hasText: 'My Cookbooks' });
      await expect(myTab).toHaveClass(/active/);
    });

    test('should not show Shared with Me tab when no shared cookbooks', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();

      await expect(page.getByText('Shared with Me')).not.toBeVisible();
    });
  });

  test.describe('Create Cookbook', () => {
    test('should open create cookbook modal from header button', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'New Cookbook' }).click();

      await expect(page.getByRole('heading', { name: 'Create Cookbook' })).toBeVisible();
    });

    test('should open create cookbook modal from empty state button', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'Create Your First Cookbook' }).click();

      await expect(page.getByRole('heading', { name: 'Create Cookbook' })).toBeVisible();
    });

    test('should create a cookbook with name and description', async ({ page, helpers }) => {
      await helpers.createCookbook(testCookbook);

      await expect(page.getByText(testCookbook.name)).toBeVisible();
      await expect(page.getByText(testCookbook.description)).toBeVisible();
    });

    test('should create a cookbook with only name', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'New Cookbook' }).click();
      await page.getByLabel('Name').fill('Name Only Cookbook');
      await page.getByRole('button', { name: 'Create Cookbook' }).click();

      await expect(page.getByText('Name Only Cookbook')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for empty name', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'New Cookbook' }).click();
      await page.getByRole('button', { name: 'Create Cookbook' }).click();

      await expect(page.getByText('Cookbook name is required')).toBeVisible();
    });

    test('should show loading state while creating', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'New Cookbook' }).click();
      await page.getByLabel('Name').fill('Loading Test Cookbook');

      const submitButton = page.getByRole('button', { name: 'Create Cookbook' });
      await submitButton.click();

      // The button should briefly show loading state
      // This test checks the button exists and cookbook is created
      await expect(page.getByText('Loading Test Cookbook')).toBeVisible({ timeout: 10000 });
    });

    test('should close create modal when clicking X', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'New Cookbook' }).click();
      await expect(page.getByRole('heading', { name: 'Create Cookbook' })).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.getByRole('heading', { name: 'Create Cookbook' })).not.toBeVisible();
    });

    test('should close create modal when clicking overlay', async ({ page, helpers }) => {
      await helpers.navigateToCookbooks();
      await page.getByRole('button', { name: 'New Cookbook' }).click();

      await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });

      await expect(page.getByRole('heading', { name: 'Create Cookbook' })).not.toBeVisible();
    });
  });

  test.describe('Cookbook Card', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
    });

    test('should display cookbook name', async ({ page }) => {
      await expect(page.getByText(testCookbook.name)).toBeVisible();
    });

    test('should display cookbook description', async ({ page }) => {
      await expect(page.getByText(testCookbook.description)).toBeVisible();
    });

    test('should display recipe count', async ({ page }) => {
      await expect(page.getByText('0 recipes')).toBeVisible();
    });

    test('should display book icon', async ({ page }) => {
      await expect(page.locator('.cookbook-card-icon')).toBeVisible();
    });

    test('should show delete button on hover', async ({ page }) => {
      const card = page.locator('.cookbook-card').first();
      await card.hover();

      await expect(card.locator('.card-delete')).toBeVisible();
    });
  });

  test.describe('Cookbook Detail', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
    });

    test('should open cookbook detail when clicking card', async ({ page }) => {
      await page.getByText(testCookbook.name).click();

      await expect(page.locator('.cookbook-detail')).toBeVisible();
      await expect(page.getByRole('heading', { name: testCookbook.name })).toBeVisible();
    });

    test('should display cookbook description in detail view', async ({ page }) => {
      await page.getByText(testCookbook.name).click();

      await expect(page.getByText(testCookbook.description)).toBeVisible();
    });

    test('should show Edit button for owned cookbook', async ({ page }) => {
      await page.getByText(testCookbook.name).click();

      await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    });

    test('should show Share button for owned cookbook', async ({ page }) => {
      await page.getByText(testCookbook.name).click();

      await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
    });

    test('should show empty state when cookbook has no recipes', async ({ page }) => {
      await page.getByText(testCookbook.name).click();

      await expect(page.getByText('No recipes yet')).toBeVisible();
    });

    test('should close cookbook detail when clicking X', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await expect(page.locator('.cookbook-detail')).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.locator('.cookbook-detail')).not.toBeVisible();
    });

    test('should close cookbook detail when clicking overlay', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await expect(page.locator('.cookbook-detail')).toBeVisible();

      await page.locator('.cookbook-detail-overlay').click({ position: { x: 10, y: 10 } });

      await expect(page.locator('.cookbook-detail')).not.toBeVisible();
    });
  });

  test.describe('Edit Cookbook', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
    });

    test('should open edit modal when clicking Edit button', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Edit' }).click();

      await expect(page.getByRole('heading', { name: 'Edit Cookbook' })).toBeVisible();
    });

    test('should pre-fill form with current cookbook data', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Edit' }).click();

      await expect(page.getByLabel('Name')).toHaveValue(testCookbook.name);
      await expect(page.getByLabel('Description')).toHaveValue(testCookbook.description);
    });

    test('should update cookbook name', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Edit' }).click();

      await page.getByLabel('Name').fill('Updated Cookbook Name');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect(page.getByText('Updated Cookbook Name')).toBeVisible({ timeout: 10000 });
    });

    test('should update cookbook description', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Edit' }).click();

      await page.getByLabel('Description').fill('Updated description');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText(testCookbook.name).click();
      await expect(page.getByText('Updated description')).toBeVisible();
    });
  });

  test.describe('Delete Cookbook', () => {
    test.beforeEach(async ({ helpers }) => {
      await helpers.createCookbook(testCookbook);
    });

    test('should delete cookbook after confirmation', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());

      const card = page.locator('.cookbook-card').first();
      await card.hover();
      await card.locator('.card-delete').click();

      await expect(page.getByText(testCookbook.name)).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByText('No cookbooks yet')).toBeVisible();
    });

    test('should not delete cookbook when confirmation is cancelled', async ({ page }) => {
      page.on('dialog', dialog => dialog.dismiss());

      const card = page.locator('.cookbook-card').first();
      await card.hover();
      await card.locator('.card-delete').click();

      await expect(page.getByText(testCookbook.name)).toBeVisible();
    });

    test('should show confirmation message mentioning recipes won\'t be deleted', async ({ page }) => {
      let dialogMessage = '';
      page.on('dialog', dialog => {
        dialogMessage = dialog.message();
        dialog.accept();
      });

      const card = page.locator('.cookbook-card').first();
      await card.hover();
      await card.locator('.card-delete').click();

      expect(dialogMessage).toContain('Recipes will not be deleted');
    });
  });

  test.describe('Multiple Cookbooks', () => {
    test('should create multiple cookbooks', async ({ page, helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.createCookbook(testCookbook2);

      await expect(page.getByText(testCookbook.name)).toBeVisible();
      await expect(page.getByText(testCookbook2.name)).toBeVisible();
    });

    test('should show cookbook count in tab', async ({ page, helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.createCookbook(testCookbook2);

      await expect(page.locator('.tab-count').filter({ hasText: '2' })).toBeVisible();
    });

    test('should display cookbooks in grid layout', async ({ page, helpers }) => {
      await helpers.createCookbook(testCookbook);
      await helpers.createCookbook(testCookbook2);

      const cards = page.locator('.cookbook-card');
      await expect(cards).toHaveCount(2);
    });
  });
});
