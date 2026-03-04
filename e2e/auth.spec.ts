import { test, expect, testUser } from './fixtures';

test.describe('Authentication', () => {
  test.describe('Landing Page', () => {
    test('should display landing page for unauthenticated users', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Recipesaurus' })).toBeVisible();
      await expect(page.getByText('Your personal recipe collection')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should show dinosaur mascot on landing page', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.landing-mascot')).toBeVisible();
    });
  });

  test.describe('Registration', () => {
    const uniqueUser = {
      email: `register-test-${Date.now()}@example.com`,
      name: 'Registration Test User',
      password: 'SecurePassword123!',
    };

    test('should open registration modal when clicking Get Started', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should successfully register a new user', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      await page.getByLabel('Name').fill(uniqueUser.name);
      await page.getByLabel('Email').fill(uniqueUser.email);
      await page.getByLabel('Password').fill(uniqueUser.password);
      await page.getByRole('button', { name: 'Create Account' }).click();

      // Should be redirected to main app
      await expect(page.getByText(uniqueUser.name)).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'New Recipe' })).toBeVisible();
    });

    test('should show error for password less than 8 characters', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      await page.getByLabel('Name').fill('Short Password User');
      await page.getByLabel('Email').fill('short@example.com');
      await page.getByLabel('Password').fill('short');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page, helpers }) => {
      // First register a user
      const duplicateUser = {
        email: `duplicate-${Date.now()}@example.com`,
        name: 'Duplicate User',
        password: 'Password123!',
      };
      await helpers.register(duplicateUser);
      await helpers.logout();

      // Try to register with the same email
      await page.getByRole('button', { name: 'Get Started' }).click();
      await page.getByLabel('Name').fill('Another User');
      await page.getByLabel('Email').fill(duplicateUser.email);
      await page.getByLabel('Password').fill('DifferentPassword123!');
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(page.getByText('An account with this email already exists')).toBeVisible();
    });

    test('should show error for missing required fields', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();

      // Try to submit empty form
      await page.getByRole('button', { name: 'Create Account' }).click();

      // HTML5 validation should prevent submission
      await expect(page.getByLabel('Name')).toBeFocused();
    });

    test('should switch to login mode from registration', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();
      await page.getByText('Sign in').click();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    });
  });

  test.describe('Login', () => {
    const loginUser = {
      email: `login-test-${Date.now()}@example.com`,
      name: 'Login Test User',
      password: 'LoginPassword123!',
    };

    test.beforeAll(async ({ browser }) => {
      // Register the user first
      const page = await browser.newPage();
      await page.goto('/');
      await page.getByRole('button', { name: 'Get Started' }).click();
      await page.getByLabel('Name').fill(loginUser.name);
      await page.getByLabel('Email').fill(loginUser.email);
      await page.getByLabel('Password').fill(loginUser.password);
      await page.getByRole('button', { name: 'Create Account' }).click();
      await expect(page.getByText(loginUser.name)).toBeVisible({ timeout: 10000 });
      await page.close();
    });

    test('should open login modal when clicking Sign In', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should successfully log in an existing user', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.getByLabel('Email').fill(loginUser.email);
      await page.getByLabel('Password').fill(loginUser.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page.getByText(loginUser.name)).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'New Recipe' })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.getByLabel('Email').fill('nonexistent@example.com');
      await page.getByLabel('Password').fill('WrongPassword123!');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('should show error for wrong password', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.getByLabel('Email').fill(loginUser.email);
      await page.getByLabel('Password').fill('WrongPassword123!');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();

      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('type', 'password');

      await page.locator('.password-toggle').click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      await page.locator('.password-toggle').click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should switch to registration mode from login', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.getByText('Create one').click();
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should successfully log out', async ({ page, helpers }) => {
      const logoutUser = {
        email: `logout-test-${Date.now()}@example.com`,
        name: 'Logout Test User',
        password: 'LogoutPassword123!',
      };

      await helpers.register(logoutUser);
      await expect(page.getByText(logoutUser.name)).toBeVisible();

      await page.getByRole('button', { name: 'Sign out' }).click();

      await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page refresh', async ({ page, helpers }) => {
      const sessionUser = {
        email: `session-test-${Date.now()}@example.com`,
        name: 'Session Test User',
        password: 'SessionPassword123!',
      };

      await helpers.register(sessionUser);
      await expect(page.getByText(sessionUser.name)).toBeVisible();

      await page.reload();

      await expect(page.getByText(sessionUser.name)).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'New Recipe' })).toBeVisible();
    });
  });

  test.describe('Modal Behavior', () => {
    test('should close modal when clicking X button', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.getByRole('heading', { name: 'Welcome Back' })).not.toBeVisible();
    });

    test('should close modal when clicking overlay', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

      await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });

      await expect(page.getByRole('heading', { name: 'Welcome Back' })).not.toBeVisible();
    });
  });
});
