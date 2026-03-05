import { test, expect } from './fixtures';

test.describe('Security Features', () => {
  test.describe('Password Requirements', () => {
    test('should show password requirements hint on registration', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      await expect(page.getByText('8+ characters with uppercase, lowercase, and number')).toBeVisible();
    });

    test('should reject password without uppercase letter', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`);
      await page.locator('#password').fill('lowercase123');
      await page.locator('#confirmPassword').fill('lowercase123');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('Password must contain at least one uppercase letter')).toBeVisible();
    });

    test('should reject password without lowercase letter', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`);
      await page.locator('#password').fill('UPPERCASE123');
      await page.locator('#confirmPassword').fill('UPPERCASE123');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('Password must contain at least one lowercase letter')).toBeVisible();
    });

    test('should reject password without number', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`);
      await page.locator('#password').fill('NoNumbersHere');
      await page.locator('#confirmPassword').fill('NoNumbersHere');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('Password must contain at least one number')).toBeVisible();
    });

    test('should accept valid password with all requirements', async ({ page }) => {
      const user = {
        email: `valid-pass-${Date.now()}@example.com`,
        name: 'Valid Password User',
        password: 'ValidPass123',
      };

      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      await page.getByLabel('Name').fill(user.name);
      await page.getByLabel('Email').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.locator('#confirmPassword').fill(user.password);
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText(user.name)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Rate Limiting', () => {
    const rateLimitUser = {
      email: `ratelimit-${Date.now()}@example.com`,
      name: 'Rate Limit User',
      password: 'RateLimit123!',
    };

    test.beforeAll(async ({ browser }) => {
      // Register the user first
      const page = await browser.newPage();
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();
      await page.getByLabel('Name').fill(rateLimitUser.name);
      await page.getByLabel('Email').fill(rateLimitUser.email);
      await page.locator('#password').fill(rateLimitUser.password);
      await page.locator('#confirmPassword').fill(rateLimitUser.password);
      await page.getByRole('button', { name: 'Create Account' }).click();
      await expect(page.getByText(rateLimitUser.name)).toBeVisible({ timeout: 10000 });
      await page.close();
    });

    test('should show remaining attempts warning after multiple failed logins', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).first().click();

      // Try 3 failed logins
      for (let i = 0; i < 3; i++) {
        await page.getByLabel('Email').fill(rateLimitUser.email);
        await page.locator('#password').fill('WrongPassword123!');
        await page.locator('.auth-submit').click();
        await page.waitForTimeout(500);
      }

      // 4th attempt should show remaining attempts warning
      await page.getByLabel('Email').fill(rateLimitUser.email);
      await page.locator('#password').fill('WrongPassword123!');
      await page.locator('.auth-submit').click();

      // Should see remaining attempts warning (1 or 2 attempts remaining)
      await expect(page.getByText(/attempts remaining/)).toBeVisible({ timeout: 5000 });
    });

    test('should block login after too many failed attempts', async ({ page }) => {
      // Use a different email to avoid affecting other tests
      const blockedUser = {
        email: `blocked-${Date.now()}@example.com`,
        name: 'Blocked User',
        password: 'BlockedPass123!',
      };

      // Register this user first
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();
      await page.getByLabel('Name').fill(blockedUser.name);
      await page.getByLabel('Email').fill(blockedUser.email);
      await page.locator('#password').fill(blockedUser.password);
      await page.locator('#confirmPassword').fill(blockedUser.password);
      await page.locator('.auth-submit').click();
      await expect(page.getByText(blockedUser.name)).toBeVisible({ timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: 'Sign out' }).click();

      // Try 6 failed logins (exceeds the 5 attempt limit)
      await page.getByRole('button', { name: 'Sign In' }).first().click();
      for (let i = 0; i < 6; i++) {
        await page.getByLabel('Email').fill(blockedUser.email);
        await page.locator('#password').fill('WrongPassword123!');
        await page.locator('.auth-submit').click();
        await page.waitForTimeout(300);
      }

      // Should be rate limited
      await expect(page.getByText('Too many failed login attempts')).toBeVisible({ timeout: 5000 });
    });
  });
});
