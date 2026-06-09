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
      await expect(page.locator('.recipe-card')).toHaveCount(3);
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
      await expect(page.locator('.recipe-card')).toHaveCount(4);
    });

    test('should create a recipe with only required fields', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByRole('button', { name: 'Manual' }).click();
      await page.getByLabel('Title').fill('Simple Recipe');
      await page.getByLabel('Description').fill('A simple test recipe');
      await page.getByLabel('Ingredients').fill('ingredient 1\ningredient 2');
      await page.getByLabel('Instructions').fill('step 1\nstep 2');
      await page.getByRole('button', { name: 'Save Recipe' }).click();

      await expect(page.getByText('Simple Recipe')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation for required fields', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByRole('button', { name: 'Manual' }).click();
      await page.getByRole('button', { name: 'Save Recipe' }).click();

      await expect(page.getByText('Please enter a recipe title')).toBeVisible();
    });

    test('should add suggested tags when clicked', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByRole('button', { name: 'Manual' }).click();

      await page.locator('.tag-suggestion').first().click();

      await expect(page.locator('.tag-chip').first()).toBeVisible();
    });

    test('should show image upload controls', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByRole('button', { name: 'Manual' }).click();

      await expect(page.getByText('Image', { exact: true })).toBeVisible();
      await expect(page.locator('#image-upload')).toBeAttached();
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
      await expect(page.locator('.modal-detail .meta-value').filter({ hasText: '15 mins' })).toBeVisible();
      await expect(page.locator('.modal-detail .meta-value').filter({ hasText: '30 mins' })).toBeVisible();
    });

    test('should display recipe tags', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();

      await expect(page.locator('.modal-detail .detail-tags .tag').filter({ hasText: 'dinner' })).toBeVisible();
      await expect(page.locator('.modal-detail .detail-tags .tag').filter({ hasText: 'chicken' })).toBeVisible();
      await expect(page.locator('.modal-detail .detail-tags .tag').filter({ hasText: 'healthy' })).toBeVisible();
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
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-delete').click();
      await page.locator('.confirm-modal').getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' })).not.toBeVisible({ timeout: 10000 });
      await expect(page.locator('.recipe-card')).toHaveCount(2);
    });

    test('should not delete recipe when confirmation is cancelled', async ({ page }) => {
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await card.hover();
      await card.locator('.card-delete').click();
      await page.locator('.confirm-modal').getByRole('button', { name: 'Cancel' }).click();

      await expect(page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' })).toBeVisible();
    });

    test('should delete recipe from detail view', async ({ page }) => {
      await page.getByText('Herb-Crusted Chicken').click();
      await page.locator('.modal-detail').getByRole('button', { name: 'Delete', exact: true }).click();
      await page.locator('.confirm-modal').getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' })).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Search Recipes', () => {
    test('should filter recipes by title search', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).not.toBeVisible();
      await expect(page.locator('.recipe-card')).toHaveCount(1);
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

      await expect(page.getByText('No matches found')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
    });

    test('should clear search when clicking clear button', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');
      await expect(page.locator('.recipe-card')).toHaveCount(1);

      await page.locator('.btn-clear-input').click();

      await expect(page.locator('.recipe-card')).toHaveCount(3);
    });

    test('should be case insensitive', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('CHICKEN');

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
    });
  });

  test.describe('Filter by Tags', () => {
    test('should display available tags', async ({ page }) => {
      await page.getByRole('button', { name: 'Filter' }).click();
      await expect(page.locator('.filter-tags .filter-tag').first()).toBeVisible();
    });

    test('should filter recipes by selecting a tag', async ({ page }) => {
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.locator('.filter-tags').getByRole('button', { name: 'dinner', exact: true }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.getByText('Classic Buttermilk Pancakes')).not.toBeVisible();
    });

    test('should show checkmark on selected tag', async ({ page }) => {
      await page.getByRole('button', { name: 'Filter' }).click();
      const tag = page.locator('.filter-tags').getByRole('button', { name: 'dinner', exact: true });
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

      await page.getByRole('button', { name: 'Filter' }).click();
      await page.locator('.filter-tags').getByRole('button', { name: 'dinner', exact: true }).click();
      await page.locator('.filter-tags').getByRole('button', { name: 'dessert', exact: true }).click();

      // Should only show recipes with both tags
      await expect(page.getByText('Multi-tag Recipe')).toBeVisible();
      await expect(page.getByText('Herb-Crusted Chicken')).not.toBeVisible();
    });

    test('should deselect tag when clicking again', async ({ page }) => {
      await page.getByRole('button', { name: 'Filter' }).click();
      const tag = page.locator('.filter-tags').getByRole('button', { name: 'dinner', exact: true });
      await tag.click();
      await expect(page.locator('.recipe-card')).toHaveCount(1);

      await tag.click();
      await expect(page.locator('.recipe-card')).toHaveCount(3);
    });
  });

  test.describe('Combined Search and Filter', () => {
    test('should combine search and tag filters', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.locator('.filter-tags').getByRole('button', { name: 'dinner', exact: true }).click();

      await expect(page.getByText('Herb-Crusted Chicken')).toBeVisible();
      await expect(page.locator('.recipe-card')).toHaveCount(1);
    });

    test('should clear all filters with Clear Filters button', async ({ page }) => {
      await page.getByPlaceholder('Search recipes').fill('chicken');
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.locator('.filter-tags').getByRole('button', { name: 'dinner', exact: true }).click();

      await page.getByRole('button', { name: 'Clear all' }).click();

      await expect(page.getByPlaceholder('Search recipes')).toHaveValue('');
      await expect(page.locator('.recipe-card')).toHaveCount(3);
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
      await expect(card.locator('.meta-item').filter({ hasText: '15 mins' })).toBeVisible();
    });

    test('should display tags on recipe card', async ({ page }) => {
      const card = page.locator('.recipe-card').filter({ hasText: 'Herb-Crusted Chicken' });
      await expect(card.locator('.tag').first()).toBeVisible();
    });

    test('should show placeholder image for recipes without image', async ({ page, helpers }) => {
      await helpers.createRecipe({
        ...testRecipe,
        title: 'No Image Recipe',
      });

      const card = page.locator('.recipe-card').filter({ hasText: 'No Image Recipe' });
      await expect(card.locator('.card-image-placeholder')).toBeVisible();
    });
  });

  test.describe('URL Import Tab', () => {
    test('should show URL import tab in add recipe modal', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await expect(page.getByRole('button', { name: 'From URL' })).toBeVisible();
    });

    test('should switch to URL import tab', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByRole('button', { name: 'From URL' }).click();

      await expect(page.getByPlaceholder('https://example.com/recipe')).toBeVisible();
    });

    test('should show notice about URL import feature', async ({ page }) => {
      await page.getByRole('button', { name: 'New Recipe' }).click();
      await page.getByRole('button', { name: 'From URL' }).click();

      await expect(page.getByText('Import a recipe from any URL.')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when all recipes are deleted', async ({ page }) => {
      // Delete all sample recipes
      for (let i = 0; i < 3; i++) {
        const card = page.locator('.recipe-card').first();
        await card.hover();
        await card.locator('.card-delete').click();
        await page.locator('.confirm-modal').getByRole('button', { name: 'Delete', exact: true }).click();
        await page.waitForTimeout(500);
      }

      await expect(page.getByText('No recipes yet')).toBeVisible();
      await expect(page.locator('.empty-state').getByRole('button', { name: 'New Recipe' })).toBeVisible();
    });
  });
});
