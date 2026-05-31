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

  it('reuses an existing My Recipes copy when saving the same public recipe again', async () => {
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

    expect(secondSave.data!.id).toBe(firstSave.data!.id);

    const recipesResult = await saverClient.recipes.list();
    const savedCopies = recipesResult.data!.recipes.filter(recipe => recipe.title === 'Shareable Lentil Soup');
    expect(savedCopies).toHaveLength(1);
    expect(savedCopies[0].isPublic).toBe(false);
    expect(savedCopies[0].isOwner).toBe(true);
    expect(savedCopies[0].ownerName).toBe('Saver');
    expect(savedCopies[0].sourceRecipeId).toBe(recipeResult.data!.id);
    expect(savedCopies[0].sourceRecipe?.ownerName).toBe('Chef');
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

  it('creates editable public remixes with stable source attribution', async () => {
    const ownerClient = harness.getClient();
    const recipeResult = await ownerClient.recipes.create({
      title: 'Original Citrus Noodles',
      description: 'Bright noodles',
      ingredients: ['noodles', 'lime'],
      instructions: ['Boil noodles', 'Toss with lime'],
      tags: ['dinner'],
      isPublic: true,
    });

    const saverClient = harness.createClient();
    const registerResult = await saverClient.auth.register('remixer@example.com', 'Remixer', 'Password123');
    const remixer = registerResult.data!.user!;

    const remixResult = await saverClient.discover.remixRecipe(recipeResult.data!.id);
    expect(remixResult.error).toBeUndefined();

    const remixedId = remixResult.data!.id;
    const remixedRecipes = await saverClient.recipes.list();
    const draft = remixedRecipes.data!.recipes.find(recipe => recipe.id === remixedId);
    expect(draft?.isOwner).toBe(true);
    expect(draft?.ownerName).toBe(remixer.name);
    expect(draft?.sourceRecipeId).toBe(recipeResult.data!.id);
    expect(draft?.sourceRecipe?.title).toBe('Original Citrus Noodles');
    expect(draft?.sourceRecipe?.ownerName).toBe('Chef');

    const updateResult = await saverClient.recipes.update(remixedId, {
      title: 'Spicy Citrus Noodles',
      ingredients: ['noodles', 'lime', 'chili crisp'],
      instructions: ['Boil noodles', 'Toss with lime and chili crisp'],
      isPublic: true,
    });
    expect(updateResult.error).toBeUndefined();

    await ownerClient.recipes.update(recipeResult.data!.id, {
      title: 'Renamed Original Citrus Noodles',
    });

    const discoverResult = await saverClient.discover.recipes({ limit: 20 });
    const publicRemix = discoverResult.data!.recipes.find(recipe => recipe.id === remixedId);
    expect(publicRemix?.title).toBe('Spicy Citrus Noodles');
    expect(publicRemix?.ownerName).toBe('Remixer');
    expect(publicRemix?.sourceRecipe?.title).toBe('Original Citrus Noodles');
    expect(publicRemix?.sourceRecipe?.ingredients).toEqual(['noodles', 'lime']);
    expect(publicRemix?.ingredients).toContain('chili crisp');
  });
});
