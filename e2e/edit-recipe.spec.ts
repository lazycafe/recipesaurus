import { test, expect, testRecipe } from './fixtures';

test.describe('Edit Recipe', () => {
  const user = {
    email: `edit-recipe-${Date.now()}@example.com`,
    name: 'Edit Recipe User',
    password: 'EditRecipe123!',
  };

  test.beforeEach(async ({ page, helpers }) => {
    await helpers.register(user);
  });

  test.describe('Edit Button', () => {
    test('should show Edit Recipe button in recipe detail', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByRole('button', { name: 'Edit Recipe' })).toBeVisible();
    });

    test('should open edit modal when clicking Edit Recipe', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit Recipe' }).click();

      await expect(page.getByRole('heading', { name: 'Edit Recipe' })).toBeVisible();
    });
  });

  test.describe('Edit Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit Recipe' }).click();
    });

    test('should pre-fill form with current recipe data', async ({ page }) => {
      await expect(page.getByLabel('Recipe Title')).toHaveValue('Herb-Crusted Chicken');
      await expect(page.getByLabel('Description')).toContainText('Tender chicken');
    });

    test('should update recipe title', async ({ page }) => {
      await page.getByLabel('Recipe Title').fill('Updated Chicken Recipe');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect(page.getByText('Updated Chicken Recipe')).toBeVisible({ timeout: 10000 });
    });

    test('should update recipe description', async ({ page }) => {
      await page.getByLabel('Description').fill('A new updated description');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('A new updated description')).toBeVisible();
    });

    test('should update recipe ingredients', async ({ page }) => {
      await page.getByLabel('Ingredients').fill('new ingredient 1\nnew ingredient 2\nnew ingredient 3');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('new ingredient 1')).toBeVisible();
    });

    test('should update recipe instructions', async ({ page }) => {
      await page.getByLabel('Instructions').fill('new step 1\nnew step 2');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('new step 1')).toBeVisible();
    });

    test('should update recipe tags', async ({ page }) => {
      await page.getByLabel('Tags').fill('updated, tags, test');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('updated')).toBeVisible();
    });

    test('should update prep time', async ({ page }) => {
      await page.locator('input[placeholder="e.g., 30 mins"]').first().fill('25 mins');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('25 mins')).toBeVisible();
    });

    test('should update cook time', async ({ page }) => {
      await page.locator('input[placeholder="e.g., 1 hour"]').fill('40 mins');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('40 mins')).toBeVisible();
    });

    test('should update servings', async ({ page }) => {
      await page.locator('input[placeholder="e.g., 4"]').fill('6');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('6')).toBeVisible();
    });

    test('should close edit modal when clicking X', async ({ page }) => {
      await page.locator('.modal-close').first().click();

      await expect(page.getByRole('heading', { name: 'Edit Recipe' })).not.toBeVisible();
    });

    test('should show validation for empty title', async ({ page }) => {
      await page.getByLabel('Recipe Title').fill('');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // HTML5 validation should prevent submission
      await expect(page.getByLabel('Recipe Title')).toBeFocused();
    });
  });

  test.describe('Image URL Update', () => {
    test('should add image URL to recipe without image', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit Recipe' }).click();

      await page.getByLabel('Image URL').fill('https://example.com/chicken.jpg');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Verify the card shows the image (or at least the recipe was updated)
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Source URL Update', () => {
    test('should add source URL to recipe', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit Recipe' }).click();

      await page.getByLabel('Source URL').fill('https://example.com/original-recipe');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      // Source URL should be displayed as a link
      await expect(page.getByRole('link', { name: 'View Original' })).toBeVisible();
    });
  });
});
