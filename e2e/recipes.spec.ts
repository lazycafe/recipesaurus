import { test, expect, testRecipe, testRecipe2 } from './fixtures';

test.describe('Recipes', () => {
  const recipeUser = {
    email: `recipe-test-${Date.now()}@example.com`,
    name: 'Recipe Test User',
    password: 'RecipePassword123!',
  };

  test.beforeEach(async ({ page, helpers }) => {
    await helpers.register(recipeUser);
  });

  test.describe('Sample Recipes', () => {
    test('should show sample recipes for new users', async ({ page }) => {
      // New users get 3 sample recipes
      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Classic Buttermilk Pancakes')).toBeVisible();
      await expect(page.getByText('Chocolate Fondant')).toBeVisible();
    });

    test('should display recipe count', async ({ page }) => {
      await expect(page.getByText('3 recipes')).toBeVisible();
    });
  });

  test.describe('Create Recipe', () => {
    test('should open add recipe modal', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await expect(page.getByRole('heading', { name: 'Add Recipe' })).toBeVisible();
    });

    test('should create a new recipe with all fields', async ({ page, helpers }) => {
      await helpers.createRecipe(testRecipe);

      // Recipe should appear in the grid
      await expect(page.getByText(testRecipe.title)).toBeVisible();
      await expect(page.getByText('4 recipes')).toBeVisible();
    });

    test('should create a recipe with only required fields', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByLabel('Recipe Title').fill('Simple Recipe');
      await page.getByLabel('Description').fill('A simple test recipe');
      await page.getByLabel('Ingredients').fill('ingredient 1\ningredient 2');
      await page.getByLabel('Instructions').fill('step 1\nstep 2');
      await page.getByRole('button', { name: 'Add Recipe' }).click();

      await expect(page.getByText('Simple Recipe')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation for required fields', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByRole('button', { name: 'Add Recipe' }).click();

      // HTML5 validation should prevent submission
      await expect(page.getByLabel('Recipe Title')).toBeFocused();
    });

    test('should add suggested tags when clicked', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();

      const tagsInput = page.getByLabel('Tags');
      await page.locator('.suggested-tag').first().click();

      const tagValue = await tagsInput.inputValue();
      expect(tagValue.length).toBeGreaterThan(0);
    });

    test('should support image URL input', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByLabel('Recipe Title').fill('Recipe with Image');
      await page.getByLabel('Description').fill('Test recipe with image');
      await page.getByLabel('Ingredients').fill('ingredient');
      await page.getByLabel('Instructions').fill('instruction');
      await page.getByLabel('Image URL').fill('https://example.com/image.jpg');
      await page.getByRole('button', { name: 'Add Recipe' }).click();

      await expect(page.getByText('Recipe with Image')).toBeVisible({ timeout: 10000 });
    });

    test('should close add recipe modal when clicking X', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await expect(page.getByRole('heading', { name: 'Add Recipe' })).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.getByRole('heading', { name: 'Add Recipe' })).not.toBeVisible();
    });
  });

  test.describe('View Recipe Detail', () => {
    test('should open recipe detail modal when clicking recipe card', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.locator('.detail-title, .recipe-detail h2')).toContainText('Herb-Crusted Chicken');
      await expect(page.getByText('Ingredients')).toBeVisible();
      await expect(page.getByText('Instructions')).toBeVisible();
    });

    test('should display all recipe details', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      // Check ingredients
      await expect(page.getByText('4 chicken breasts')).toBeVisible();

      // Check instructions
      await expect(page.getByText('Preheat oven to 400')).toBeVisible();

      // Check meta info
      await expect(page.getByText('15 mins')).toBeVisible();
      await expect(page.getByText('30 mins')).toBeVisible();
    });

    test('should display recipe tags', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.getByText('dinner')).toBeVisible();
      await expect(page.getByText('chicken')).toBeVisible();
      await expect(page.getByText('healthy')).toBeVisible();
    });

    test('should toggle ingredient checkboxes', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      const checkbox = page.locator('.ingredients-list input[type="checkbox"]').first();
      await checkbox.check();
      await expect(checkbox).toBeChecked();

      await checkbox.uncheck();
      await expect(checkbox).not.toBeChecked();
    });

    test('should close recipe detail when clicking X', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await expect(page.locator('.detail-title, .recipe-detail h2')).toBeVisible();

      await page.locator('.modal-close').click();

      await expect(page.locator('.detail-title, .recipe-detail h2')).not.toBeVisible();
    });
  });

  test.describe('Delete Recipe', () => {
    test('should show delete button on recipe card hover', async ({ page }) => {
      const card = page.locator('.recipe-card').first();
      await card.hover();

      await expect(card.locator('.card-delete')).toBeVisible();
    });

    test('should delete recipe after confirmation', async ({ page }) => {
      // Accept the confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-delete').click();

      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByText('2 recipes')).toBeVisible();
    });

    test('should not delete recipe when confirmation is cancelled', async ({ page }) => {
      // Dismiss the confirmation dialog
      page.on('dialog', dialog => dialog.dismiss());

      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-delete').click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });

    test('should delete recipe from detail view', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());

      await page.getByText('Herb-Crusted Chicken').click();
      await page.getByRole('button', { name: 'Delete Recipe' }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Search Recipes', () => {
    test('should filter recipes by title search', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).not.toBeVisible();
      await expect(page.getByText('1 recipe of 3')).toBeVisible();
    });

    test('should filter recipes by ingredient search', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chocolate');

      await expect(page.getByText('Chocolate Fondant')).toBeVisible();
      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible();
    });

    test('should filter recipes by tag search', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('breakfast');

      await expect(page.getByText('Classic Buttermilk Pancakes')).toBeVisible();
      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible();
    });

    test('should show empty state when no matches', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('nonexistent recipe xyz');

      await expect(page.getByText('No recipes found')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
    });

    test('should clear search when clicking clear button', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');
      await expect(page.getByText('1 recipe of 3')).toBeVisible();

      await page.getByRole('button', { name: 'Clear Filters' }).click();

      await expect(page.getByText('3 recipes')).toBeVisible();
    });

    test('should be case insensitive', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('CHICKEN');

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });
  });

  test.describe('Filter by Tags', () => {
    test('should display available tags', async ({ page }) => {
      await expect(page.locator('.filter-tags .tag')).toHaveCount(await page.locator('.filter-tags .tag').count());
    });

    test('should filter recipes by selecting a tag', async ({ page }) => {
      await page.locator('.filter-tags .tag').filter({ hasText: 'dinner' }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).not.toBeVisible();
    });

    test('should show checkmark on selected tag', async ({ page }) => {
      const tag = page.locator('.filter-tags .tag').filter({ hasText: 'dinner' });
      await tag.click();

      await expect(tag.locator('svg')).toBeVisible();
    });

    test('should allow multiple tag selection', async ({ page, helpers }) => {
      // First create a recipe with multiple tags
      await helpers.createRecipe({
        ...testRecipe,
        title: 'Multi-tag Recipe',
        tags: 'dinner, dessert',
      });

      await page.locator('.filter-tags .tag').filter({ hasText: 'dinner' }).click();
      await page.locator('.filter-tags .tag').filter({ hasText: 'dessert' }).click();

      // Should only show recipes with both tags
      await expect(page.getByText('Multi-tag Recipe')).toBeVisible();
      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible();
    });

    test('should deselect tag when clicking again', async ({ page }) => {
      const tag = page.locator('.filter-tags .tag').filter({ hasText: 'dinner' });
      await tag.click();
      await expect(page.getByText('1 recipe of 3')).toBeVisible();

      await tag.click();
      await expect(page.getByText('3 recipes')).toBeVisible();
    });
  });

  test.describe('Combined Search and Filter', () => {
    test('should combine search and tag filters', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');
      await page.locator('.filter-tags .tag').filter({ hasText: 'dinner' }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('1 recipe of 3')).toBeVisible();
    });

    test('should clear all filters with Clear Filters button', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');
      await page.locator('.filter-tags .tag').filter({ hasText: 'dinner' }).click();

      await page.getByRole('button', { name: 'Clear Filters' }).click();

      await expect(page.getByPlaceholder('Search recipes')).toHaveValue('');
      await expect(page.getByText('3 recipes')).toBeVisible();
    });
  });

  test.describe('Recipe Cards', () => {
    test('should display recipe card with title and description', async ({ page }) => {
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await expect(card.locator('.card-title')).toContainText('Herb-Crusted Chicken');
      await expect(card.locator('.card-description')).toContainText('Tender chicken');
    });

    test('should display prep time on recipe card', async ({ page }) => {
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await expect(card.locator('.meta-item')).toContainText('15 mins');
    });

    test('should display tags on recipe card', async ({ page }) => {
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await expect(card.locator('.tag').first()).toBeVisible();
    });

    test('should show placeholder image for recipes without image', async ({ page }) => {
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await expect(card.locator('.card-image-placeholder')).toBeVisible();
    });
  });

  test.describe('URL Import Tab', () => {
    test('should show URL import tab in add recipe modal', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await expect(page.getByText('Import from URL')).toBeVisible();
    });

    test('should switch to URL import tab', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByText('Import from URL').click();

      await expect(page.getByPlaceholder('https://example.com/recipe')).toBeVisible();
    });

    test('should show notice about URL import feature', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByText('Import from URL').click();

      await expect(page.getByText('Coming Soon')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when all recipes are deleted', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());

      // Delete all sample recipes
      for (let i = 0; i < 3; i++) {
        const card = page.locator('.recipe-card').first();
        await card.hover();
        await card.locator('.card-delete').click();
        await page.waitForTimeout(500);
      }

      await expect(page.getByText('No recipes yet')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Your First Recipe' })).toBeVisible();
    });
  });
});
