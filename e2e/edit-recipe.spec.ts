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

      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    });

    test('should open edit modal when clicking Edit Recipe', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'Edit Recipe' })).toBeVisible();
    });
  });

  test.describe('Edit Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
    });

    test('should pre-fill form with current recipe data', async ({ page }) => {
      await expect(page.getByLabel('Title')).toHaveValue('Herb-Crusted Chicken');
      await expect(page.getByLabel('Description')).toContainText('Tender chicken');
    });

    test('should update recipe title', async ({ page }) => {
      await page.getByLabel('Title').fill('Updated Chicken Recipe');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await expect(page.getByText('Updated Chicken Recipe')).toBeVisible({ timeout: 10000 });
    });

    test('should update recipe description', async ({ page }) => {
      await page.getByLabel('Description').fill('A new updated description');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.locator('.detail-description').filter({ hasText: 'A new updated description' })).toBeVisible();
    });

    test('should update recipe ingredients', async ({ page }) => {
      await page.getByLabel('Ingredients').fill('new ingredient 1\nnew ingredient 2\nnew ingredient 3');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('new ingredient 1')).toBeVisible();
    });

    test('should update recipe instructions', async ({ page }) => {
      await page.getByLabel('Instructions').fill('new step 1\nnew step 2');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('new step 1')).toBeVisible();
    });

    test('should update recipe tags', async ({ page }) => {
      await page.locator('.tag-input').fill('updated');
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('updated')).toBeVisible();
    });

    test('should update prep time', async ({ page }) => {
      await page.getByLabel('Prep Time').fill('25 mins');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.locator('.modal-detail .meta-value').filter({ hasText: '25 mins' })).toBeVisible();
    });

    test('should update cook time', async ({ page }) => {
      await page.getByLabel('Cook Time').fill('40 mins');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.getByText('40 mins')).toBeVisible();
    });

    test('should update servings', async ({ page }) => {
      await page.getByLabel('Servings').fill('6');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.locator('.modal-detail .meta-value').filter({ hasText: '6' })).toBeVisible();
    });

    test('should close edit modal when clicking X', async ({ page }) => {
      await page.locator('.modal-close').first().click();

      await expect(page.getByRole('heading', { name: 'Edit Recipe' })).not.toBeVisible();
    });

    test('should show validation for empty title', async ({ page }) => {
      await page.getByLabel('Title').fill('');
      await page.getByRole('button', { name: 'Update Recipe' }).click();

      await expect(page.getByText('Please enter a recipe title')).toBeVisible();
    });
  });

  test.describe('Image Controls', () => {
    test('should show image controls while editing recipe', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();

      await expect(page.getByText('Image', { exact: true })).toBeVisible();
      await expect(page.locator('#image-upload')).toBeAttached();
    });
  });

  test.describe('Visibility Controls', () => {
    test('should show visibility controls while editing recipe', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();

      await expect(page.getByText('Visibility')).toBeVisible();
      await expect(page.locator('.visibility-control')).toBeVisible();
    });
  });
});
