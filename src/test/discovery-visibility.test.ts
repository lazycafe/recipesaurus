import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';

describe('public discovery visibility', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
    await harness.seedUser('chef@example.com', 'Password123', 'Chef');
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  it('shows a recipe in Discover after it is made public and removes it when private', async () => {
    const client = harness.getClient();
    const createResult = await client.recipes.create({
      title: 'Public Toggle Pasta',
      description: 'A recipe that starts private',
      ingredients: ['pasta'],
      instructions: ['boil pasta'],
      tags: ['dinner'],
      isPublic: false,
    });
    const recipeId = createResult.data!.id;

    let discoverResult = await client.discover.recipes({ limit: 20 });
    expect(discoverResult.data!.recipes.some(recipe => recipe.id === recipeId)).toBe(false);

    await client.recipes.update(recipeId, { isPublic: true });

    discoverResult = await client.discover.recipes({ limit: 20 });
    const matchingRecipes = discoverResult.data!.recipes.filter(recipe => recipe.id === recipeId);
    expect(matchingRecipes).toHaveLength(1);
    expect(matchingRecipes[0].isPublic).toBe(true);
    expect(matchingRecipes[0].isOwner).toBe(true);

    await client.recipes.update(recipeId, { isPublic: false });

    discoverResult = await client.discover.recipes({ limit: 20 });
    expect(discoverResult.data!.recipes.some(recipe => recipe.id === recipeId)).toBe(false);
  });

  it('shows a cookbook in Discover after it is made public and removes it when private', async () => {
    const client = harness.getClient();
    const createResult = await client.cookbooks.create({
      name: 'Public Toggle Cookbook',
      description: 'A cookbook that starts private',
      isPublic: false,
    });
    const cookbookId = createResult.data!.id;

    let discoverResult = await client.discover.cookbooks({ limit: 20 });
    expect(discoverResult.data!.cookbooks.some(cookbook => cookbook.id === cookbookId)).toBe(false);

    await client.cookbooks.update(cookbookId, { isPublic: true });

    discoverResult = await client.discover.cookbooks({ limit: 20 });
    const matchingCookbooks = discoverResult.data!.cookbooks.filter(cookbook => cookbook.id === cookbookId);
    expect(matchingCookbooks).toHaveLength(1);
    expect(matchingCookbooks[0].isPublic).toBe(true);
    expect(matchingCookbooks[0].isOwner).toBe(true);

    await client.cookbooks.update(cookbookId, { isPublic: false });

    discoverResult = await client.discover.cookbooks({ limit: 20 });
    expect(discoverResult.data!.cookbooks.some(cookbook => cookbook.id === cookbookId)).toBe(false);
  });

  it('keeps private recipes hidden inside public cookbooks', async () => {
    const ownerClient = harness.getClient();
    const publicRecipe = await ownerClient.recipes.create({
      title: 'Visible Cookbook Recipe',
      description: 'This one can be discovered',
      ingredients: ['rice'],
      instructions: ['steam'],
      tags: ['side'],
      isPublic: true,
    });
    const privateRecipe = await ownerClient.recipes.create({
      title: 'Hidden Cookbook Recipe',
      description: 'This one stays private',
      ingredients: ['secret'],
      instructions: ['hide'],
      tags: ['private'],
      isPublic: false,
    });
    const cookbook = await ownerClient.cookbooks.create({
      name: 'Mixed Visibility Cookbook',
      description: 'Contains public and private recipes',
      isPublic: true,
    });
    await ownerClient.cookbooks.addRecipe(cookbook.data!.id, publicRecipe.data!.id);
    await ownerClient.cookbooks.addRecipe(cookbook.data!.id, privateRecipe.data!.id);

    const viewerClient = harness.createClient();
    await viewerClient.auth.register('viewer@example.com', 'Viewer', 'Password123');

    const discoverList = await viewerClient.discover.cookbooks({ limit: 20 });
    const discoveredCookbook = discoverList.data!.cookbooks.find(item => item.id === cookbook.data!.id)!;
    expect(discoveredCookbook.recipeCount).toBe(1);

    const detail = await viewerClient.discover.getCookbook(cookbook.data!.id);
    expect(detail.data!.cookbook.recipeCount).toBe(1);
    expect(detail.data!.recipes.map(recipe => recipe.title)).toEqual(['Visible Cookbook Recipe']);

    const saveResult = await viewerClient.discover.saveCookbook(cookbook.data!.id);
    const savedCookbook = await viewerClient.cookbooks.get(saveResult.data!.id);
    expect(savedCookbook.data!.recipes.map(recipe => recipe.title)).toEqual(['Visible Cookbook Recipe']);
  });

  it('does not return duplicate recipes or cookbooks on Discover', async () => {
    const client = harness.getClient();
    const recipeResult = await client.recipes.create({
      title: 'Unique Public Recipe',
      description: 'Visible once',
      ingredients: ['flour'],
      instructions: ['mix'],
      tags: ['quick'],
      isPublic: true,
    });
    const cookbookResult = await client.cookbooks.create({
      name: 'Unique Public Cookbook',
      isPublic: true,
    });
    await client.cookbooks.addRecipe(cookbookResult.data!.id, recipeResult.data!.id);

    const recipeDiscoverResult = await client.discover.recipes({ limit: 20 });
    const recipeIds = recipeDiscoverResult.data!.recipes.map(recipe => recipe.id);
    expect(new Set(recipeIds).size).toBe(recipeIds.length);

    const cookbookDiscoverResult = await client.discover.cookbooks({ limit: 20 });
    const cookbookIds = cookbookDiscoverResult.data!.cookbooks.map(cookbook => cookbook.id);
    expect(new Set(cookbookIds).size).toBe(cookbookIds.length);
  });

  it('reuses an existing saved recipe reference when saving the same public recipe again', async () => {
    const ownerClient = harness.getClient();
    const recipeResult = await ownerClient.recipes.create({
      title: 'Shareable Lentil Soup',
      description: 'One public recipe should save once',
      ingredients: ['lentils', 'stock'],
      instructions: ['simmer'],
      tags: ['soup'],
      isPublic: true,
    });

    const saverClient = harness.createClient();
    await saverClient.auth.register('saver@example.com', 'Saver', 'Password123');

    const firstSave = await saverClient.discover.saveRecipe(recipeResult.data!.id);
    const secondSave = await saverClient.discover.saveRecipe(recipeResult.data!.id);

    expect(firstSave.data!.id).toBe(recipeResult.data!.id);
    expect(secondSave.data!.id).toBe(firstSave.data!.id);

    const recipesResult = await saverClient.recipes.list();
    const savedRecipes = recipesResult.data!.recipes.filter(recipe => recipe.title === 'Shareable Lentil Soup');
    expect(savedRecipes).toHaveLength(1);
    expect(savedRecipes[0]).toMatchObject({
      id: recipeResult.data!.id,
      isOwner: true,
      isPublic: false,
      ownerName: 'Chef',
    });
  });

  it('does not duplicate a user-owned public recipe when saved from Discover', async () => {
    const client = harness.getClient();
    const recipeResult = await client.recipes.create({
      title: 'Own Public Salad',
      description: 'Already belongs to this user',
      ingredients: ['greens'],
      instructions: ['toss'],
      tags: ['salad'],
      isPublic: true,
    });

    const saveResult = await client.discover.saveRecipe(recipeResult.data!.id);
    expect(saveResult.data!.id).toBe(recipeResult.data!.id);

    const recipesResult = await client.recipes.list();
    const matchingRecipes = recipesResult.data!.recipes.filter(recipe => recipe.title === 'Own Public Salad');
    expect(matchingRecipes).toHaveLength(1);
  });

  it('references a saved public recipe until edit materializes a new row', async () => {
    const ownerClient = harness.getClient();
    const recipeResult = await ownerClient.recipes.create({
      title: 'Heart State Tomato Soup',
      description: 'A recipe with tracked saved state',
      ingredients: ['tomatoes', 'stock'],
      instructions: ['simmer'],
      tags: ['soup'],
      isPublic: true,
    });

    const saverClient = harness.createClient();
    await saverClient.auth.register('recipe-saver@example.com', 'Recipe Saver', 'Password123');

    let discoverResult = await saverClient.discover.recipes({ limit: 20 });
    let discoveredRecipe = discoverResult.data!.recipes.find(recipe => recipe.id === recipeResult.data!.id)!;
    expect(discoveredRecipe.isSaved).toBe(false);
    expect(discoveredRecipe.savedCopyId).toBeNull();

    const saveResult = await saverClient.discover.saveRecipe(recipeResult.data!.id);
    expect(saveResult.data!.id).toBe(recipeResult.data!.id);

    discoverResult = await saverClient.discover.recipes({ limit: 20 });
    discoveredRecipe = discoverResult.data!.recipes.find(recipe => recipe.id === recipeResult.data!.id)!;
    expect(discoveredRecipe.isSaved).toBe(true);
    expect(discoveredRecipe.savedCopyId).toBe(saveResult.data!.id);

    let recipesResult = await saverClient.recipes.list();
    const savedReference = recipesResult.data!.recipes.find(recipe => recipe.id === saveResult.data!.id)!;
    expect(savedReference).toMatchObject({
      id: recipeResult.data!.id,
      isOwner: true,
      isPublic: false,
      ownerName: 'Chef',
    });

    const updateResult = await saverClient.recipes.update(saveResult.data!.id, { title: 'Edited Tomato Soup' });
    const materializedRecipeId = updateResult.data!.id!;
    expect(materializedRecipeId).not.toBe(recipeResult.data!.id);

    discoverResult = await saverClient.discover.recipes({ limit: 20 });
    discoveredRecipe = discoverResult.data!.recipes.find(recipe => recipe.id === recipeResult.data!.id)!;
    expect(discoveredRecipe.isSaved).toBe(false);
    expect(discoveredRecipe.savedCopyId).toBeNull();

    const secondSave = await saverClient.discover.saveRecipe(recipeResult.data!.id);
    expect(secondSave.data!.id).toBe(recipeResult.data!.id);

    const unsaveResult = await saverClient.discover.unsaveRecipe(recipeResult.data!.id);
    expect(unsaveResult.data!.id).toBe(secondSave.data!.id);

    discoverResult = await saverClient.discover.recipes({ limit: 20 });
    discoveredRecipe = discoverResult.data!.recipes.find(recipe => recipe.id === recipeResult.data!.id)!;
    expect(discoveredRecipe.isSaved).toBe(false);
    expect(discoveredRecipe.savedCopyId).toBeNull();

    recipesResult = await saverClient.recipes.list();
    expect(recipesResult.data!.recipes.some(recipe => recipe.id === materializedRecipeId)).toBe(true);
    expect(recipesResult.data!.recipes.some(recipe => recipe.id === recipeResult.data!.id)).toBe(false);
    expect(recipesResult.data!.recipes.some(recipe => recipe.id === secondSave.data!.id)).toBe(false);
  });

  it('reports and removes only the unedited saved cookbook for public cookbooks', async () => {
    const ownerClient = harness.getClient();
    const recipeResult = await ownerClient.recipes.create({
      title: 'Cookbook Heart Beans',
      description: 'A recipe in a public cookbook',
      ingredients: ['beans'],
      instructions: ['season'],
      tags: ['dinner'],
      isPublic: true,
    });
    const cookbookResult = await ownerClient.cookbooks.create({
      name: 'Heart State Cookbook',
      description: 'A cookbook with tracked saved state',
      isPublic: true,
    });
    await ownerClient.cookbooks.addRecipe(cookbookResult.data!.id, recipeResult.data!.id);

    const saverClient = harness.createClient();
    await saverClient.auth.register('cookbook-saver@example.com', 'Cookbook Saver', 'Password123');

    let discoverResult = await saverClient.discover.cookbooks({ limit: 20 });
    let discoveredCookbook = discoverResult.data!.cookbooks.find(cookbook => cookbook.id === cookbookResult.data!.id)!;
    expect(discoveredCookbook.isSaved).toBe(false);
    expect(discoveredCookbook.savedCopyId).toBeNull();

    const saveResult = await saverClient.discover.saveCookbook(cookbookResult.data!.id);

    discoverResult = await saverClient.discover.cookbooks({ limit: 20 });
    discoveredCookbook = discoverResult.data!.cookbooks.find(cookbook => cookbook.id === cookbookResult.data!.id)!;
    expect(discoveredCookbook.isSaved).toBe(true);
    expect(discoveredCookbook.savedCopyId).toBe(saveResult.data!.id);

    await saverClient.cookbooks.update(saveResult.data!.id, { name: 'Edited Heart State Cookbook' });

    discoverResult = await saverClient.discover.cookbooks({ limit: 20 });
    discoveredCookbook = discoverResult.data!.cookbooks.find(cookbook => cookbook.id === cookbookResult.data!.id)!;
    expect(discoveredCookbook.isSaved).toBe(false);
    expect(discoveredCookbook.savedCopyId).toBeNull();

    const secondSave = await saverClient.discover.saveCookbook(cookbookResult.data!.id);
    expect(secondSave.data!.id).not.toBe(saveResult.data!.id);

    const unsaveResult = await saverClient.discover.unsaveCookbook(cookbookResult.data!.id);
    expect(unsaveResult.data!.id).toBe(secondSave.data!.id);

    discoverResult = await saverClient.discover.cookbooks({ limit: 20 });
    discoveredCookbook = discoverResult.data!.cookbooks.find(cookbook => cookbook.id === cookbookResult.data!.id)!;
    expect(discoveredCookbook.isSaved).toBe(false);
    expect(discoveredCookbook.savedCopyId).toBeNull();

    const cookbooksResult = await saverClient.cookbooks.list();
    expect(cookbooksResult.data!.owned.some(cookbook => cookbook.id === saveResult.data!.id)).toBe(true);
    expect(cookbooksResult.data!.owned.some(cookbook => cookbook.id === secondSave.data!.id)).toBe(false);
  });

  it('saves large public cookbooks in batches without duplicating existing recipe references', async () => {
    const ownerClient = harness.getClient();
    const cookbookResult = await ownerClient.cookbooks.create({
      name: 'Batch Save Cookbook',
      description: 'A cookbook large enough to exercise chunked inserts',
      isPublic: true,
    });

    const sourceRecipeIds: string[] = [];
    for (let index = 0; index < 18; index += 1) {
      const recipeResult = await ownerClient.recipes.create({
        title: `Batch Save Recipe ${index + 1}`,
        description: `Recipe ${index + 1}`,
        ingredients: [`ingredient ${index + 1}`],
        instructions: [`step ${index + 1}`],
        tags: ['batch'],
        isPublic: true,
      });
      sourceRecipeIds.push(recipeResult.data!.id);
      await ownerClient.cookbooks.addRecipe(cookbookResult.data!.id, recipeResult.data!.id);
    }

    const saverClient = harness.createClient();
    await saverClient.auth.register('batch-saver@example.com', 'Batch Saver', 'Password123');
    const existingRecipeSave = await saverClient.discover.saveRecipe(sourceRecipeIds[0]);

    const saveResult = await saverClient.discover.saveCookbook(cookbookResult.data!.id);
    const savedCookbook = await saverClient.cookbooks.get(saveResult.data!.id);
    expect(savedCookbook.data!.recipes).toHaveLength(18);
    expect(savedCookbook.data!.recipes.map(recipe => recipe.id).sort()).toEqual([...sourceRecipeIds].sort());
    expect(savedCookbook.data!.recipes.some(recipe => recipe.id === existingRecipeSave.data!.id)).toBe(true);

    const recipesResult = await saverClient.recipes.list();
    const savedBatchRecipes = recipesResult.data!.recipes.filter(recipe => recipe.title.startsWith('Batch Save Recipe'));
    expect(savedBatchRecipes).toHaveLength(18);
  });
});
