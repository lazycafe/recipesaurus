import { test, expect, testCookbook } from './fixtures';

test.describe('Cookbook Sharing', () => {
  const user1 = {
    email: `share-user1-${Date.now()}@example.com`,
    name: 'Share User One',
    password: 'SharePassword123!',
  };

  const user2 = {
    email: `share-user2-${Date.now()}@example.com`,
    name: 'Share User Two',
    password: 'SharePassword456!',
  };

  test.describe('Share Modal', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);
    });

    test('should open share modal when clicking Share button', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByRole('heading', { name: `Share "${testCookbook.name}"` })).toBeVisible();
    });

    test('should show Share by Email tab by default', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      const emailTab = page.locator('.share-tab').filter({ hasText: 'Share by Email' });
      await expect(emailTab).toHaveClass(/active/);
    });

    test('should show email input field', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByPlaceholder('Enter email address')).toBeVisible();
    });

    test('should show Share Link tab', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByText('Share Link')).toBeVisible();
    });

    test('should close share modal when clicking X', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.locator('.share-modal')).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.locator('.share-modal')).not.toBeVisible();
    });
  });

  test.describe('Share by Email', () => {
    test.beforeEach(async ({ browser }) => {
      // Register user2 first so they exist
      const page2 = await browser.newPage();
      await page2.goto('/');
      await page2.getByRole('button', { name: 'Get Started' }).click();
      await page2.getByLabel('Name').fill(user2.name);
      await page2.getByLabel('Email').fill(user2.email);
      await page2.getByLabel('Password').fill(user2.password);
      await page2.getByRole('button', { name: 'Create Account' }).click();
      await expect(page2.getByText(user2.name)).toBeVisible({ timeout: 10000 });
      await page2.close();
    });

    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);
    });

    test('should share cookbook with another user by email', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });
    });

    test('should show error for non-existent email', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await page.getByPlaceholder('Enter email address').fill('nonexistent@example.com');
      await page.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByText('No user found with that email')).toBeVisible();
    });

    test('should show error when trying to share with self', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await page.getByPlaceholder('Enter email address').fill(user1.email);
      await page.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByText('Cannot share with yourself')).toBeVisible();
    });

    test('should show error when cookbook already shared with user', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      // Share first time
      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });

      // Try to share again
      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByText('Cookbook is already shared with this user')).toBeVisible();
    });

    test('should show shared users list after sharing', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await page.waitForTimeout(1000);

      await expect(page.getByText('Shared with')).toBeVisible();
      await expect(page.getByText(user2.name)).toBeVisible();
      await expect(page.getByText(user2.email)).toBeVisible();
    });

    test('should clear input after successful share', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();

      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });

      await expect(page.getByPlaceholder('Enter email address')).toHaveValue('');
    });
  });

  test.describe('Remove Email Share', () => {
    test.beforeEach(async ({ browser }) => {
      // Register user2 first
      const page2 = await browser.newPage();
      await page2.goto('/');
      await page2.getByRole('button', { name: 'Get Started' }).click();
      await page2.getByLabel('Name').fill(user2.name);
      await page2.getByLabel('Email').fill(user2.email);
      await page2.getByLabel('Password').fill(user2.password);
      await page2.getByRole('button', { name: 'Create Account' }).click();
      await expect(page2.getByText(user2.name)).toBeVisible({ timeout: 10000 });
      await page2.close();
    });

    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);

      // Share with user2
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });
    });

    test('should show remove button for shared user', async ({ page }) => {
      await expect(page.locator('.share-item-remove')).toBeVisible();
    });

    test('should remove share access after confirmation', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());

      await page.locator('.share-item-remove').click();

      await expect(page.locator('.share-item')).not.toBeVisible({ timeout: 5000 });
    });

    test('should not remove share when confirmation is cancelled', async ({ page }) => {
      page.on('dialog', dialog => dialog.dismiss());

      await page.locator('.share-item-remove').click();

      await expect(page.getByText(user2.name)).toBeVisible();
    });
  });

  test.describe('Share Link Tab', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);
    });

    test('should switch to Share Link tab', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();

      const linkTab = page.locator('.share-tab').filter({ hasText: 'Share Link' });
      await expect(linkTab).toHaveClass(/active/);
    });

    test('should show info about share links', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();

      await expect(page.getByText('Anyone with the link can view this cookbook')).toBeVisible();
    });

    test('should show Generate New Link button', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();

      await expect(page.getByRole('button', { name: 'Generate New Link' })).toBeVisible();
    });

    test('should generate a share link', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();

      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.locator('.share-link-item')).toBeVisible({ timeout: 10000 });
    });

    test('should show Active Links section after generating', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.getByText('Active Links')).toBeVisible({ timeout: 10000 });
    });

    test('should show copy button for share link', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.locator('.share-link-actions button').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show revoke button for share link', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.locator('.btn-danger-icon')).toBeVisible({ timeout: 10000 });
    });

    test('should generate multiple share links', async ({ page }) => {
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();

      await page.getByRole('button', { name: 'Generate New Link' }).click();
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      const links = page.locator('.share-link-item');
      await expect(links).toHaveCount(2, { timeout: 10000 });
    });
  });

  test.describe('Revoke Share Link', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);

      // Generate a share link
      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();
      await expect(page.locator('.share-link-item')).toBeVisible({ timeout: 10000 });
    });

    test('should revoke share link after confirmation', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());

      await page.locator('.btn-danger-icon').click();

      await expect(page.locator('.share-link-item')).not.toBeVisible({ timeout: 5000 });
    });

    test('should not revoke share link when confirmation is cancelled', async ({ page }) => {
      page.on('dialog', dialog => dialog.dismiss());

      await page.locator('.btn-danger-icon').click();

      await expect(page.locator('.share-link-item')).toBeVisible();
    });
  });

  test.describe('Shared Cookbook Access', () => {
    test.beforeEach(async ({ browser }) => {
      // Register user2 first
      const page2 = await browser.newPage();
      await page2.goto('/');
      await page2.getByRole('button', { name: 'Get Started' }).click();
      await page2.getByLabel('Name').fill(user2.name);
      await page2.getByLabel('Email').fill(user2.email);
      await page2.getByLabel('Password').fill(user2.password);
      await page2.getByRole('button', { name: 'Create Account' }).click();
      await expect(page2.getByText(user2.name)).toBeVisible({ timeout: 10000 });
      await page2.close();
    });

    test('should see shared cookbook in Shared with Me tab', async ({ page, helpers, browser }) => {
      // User1 creates and shares cookbook
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);

      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });

      // Logout user1
      await page.locator('.modal-close').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
      await helpers.logout();

      // Login as user2
      await helpers.login(user2);
      await helpers.navigateToCookbooks();

      // Should see "Shared with Me" tab
      await expect(page.getByText('Shared with Me')).toBeVisible();
      await page.getByText('Shared with Me').click();

      // Should see the shared cookbook
      await expect(page.getByText(testCookbook.name)).toBeVisible();
    });

    test('should show owner name on shared cookbook', async ({ page, helpers, browser }) => {
      // User1 creates and shares cookbook
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);

      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });

      // Logout user1 and login as user2
      await page.locator('.modal-close').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
      await helpers.logout();
      await helpers.login(user2);
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();

      // Should show owner name
      await expect(page.getByText(user1.name)).toBeVisible();
    });

    test('should not show Edit button for shared cookbook', async ({ page, helpers, browser }) => {
      // User1 creates and shares cookbook
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);

      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });

      // Logout user1 and login as user2
      await page.locator('.modal-close').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
      await helpers.logout();
      await helpers.login(user2);
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();
      await page.getByText(testCookbook.name).click();

      // Should NOT show Edit or Share buttons
      await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Share' })).not.toBeVisible();
    });

    test('should not show delete button on shared cookbook card', async ({ page, helpers, browser }) => {
      // User1 creates and shares cookbook
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);

      await page.getByText(testCookbook.name).click();
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByPlaceholder('Enter email address').fill(user2.email);
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByText(`Shared with ${user2.name}`)).toBeVisible({ timeout: 10000 });

      // Logout user1 and login as user2
      await page.locator('.modal-close').click();
      await page.waitForTimeout(500);
      await page.locator('.modal-close').click();
      await helpers.logout();
      await helpers.login(user2);
      await helpers.navigateToCookbooks();
      await page.getByText('Shared with Me').click();

      // Hover on shared cookbook card - should NOT have delete button
      const card = page.locator('.cookbook-card').first();
      await card.hover();
      await expect(card.locator('.card-delete')).not.toBeVisible();
    });
  });
});
