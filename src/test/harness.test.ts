import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';

describe('ReactTestHarness', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  describe('user management', () => {
    it('should seed a user with valid password', async () => {
      const { user, token } = await harness.seedUser('test@example.com', 'Password123', 'Test User');

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(token).toBeDefined();
    });

    it('should login as seeded user', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      await harness.logout();

      const user = await harness.loginAs('test@example.com', 'Password123');

      expect(user.email).toBe('test@example.com');
    });

    it('should get current user after login', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');

      const currentUser = await harness.getCurrentUser();

      expect(currentUser).not.toBeNull();
      expect(currentUser!.email).toBe('test@example.com');
    });

    it('should return null for current user when logged out', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      await harness.logout();

      const currentUser = await harness.getCurrentUser();

      expect(currentUser).toBeNull();
    });
  });

  describe('recipe management', () => {
    beforeEach(async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
    });

    it('should seed a recipe', async () => {
      const recipeId = await harness.seedRecipe({
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: ['item 1', 'item 2'],
        instructions: ['step 1', 'step 2'],
        tags: ['test', 'quick'],
      });

      expect(recipeId).toBeDefined();

      const client = harness.getClient();
      const result = await client.recipes.list();

      // Account for sample recipe added during user creation
      expect(result.data!.recipes.length).toBeGreaterThanOrEqual(1);
      const recipe = result.data!.recipes.find(r => r.id === recipeId);
      expect(recipe).toBeDefined();
      expect(recipe!.title).toBe('Test Recipe');
    });
  });

  describe('cookbook management', () => {
    beforeEach(async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
    });

    it('should seed a cookbook', async () => {
      const cookbookId = await harness.seedCookbook({
        name: 'Test Cookbook',
        description: 'A test cookbook',
      });

      expect(cookbookId).toBeDefined();

      const client = harness.getClient();
      const result = await client.cookbooks.list();

      expect(result.data!.owned.length).toBe(3); // Default cookbook + My Recipe Collection + seeded one
      expect(result.data!.owned.some(c => c.name === 'Test Cookbook')).toBe(true);
    });
  });

  describe('multiple clients', () => {
    it('should support multiple independent clients', async () => {
      // Create two users with separate clients
      const client1 = harness.createClient();
      const client2 = harness.createClient();

      // Register users
      await client1.auth.register('user1@example.com', 'User One', 'Password123');
      await client2.auth.register('user2@example.com', 'User Two', 'Password123');

      // Create recipes with each client
      await client1.recipes.create({
        title: 'User 1 Recipe',
        description: 'Recipe by user 1',
        ingredients: ['item'],
        instructions: ['step'],
        tags: [],
      });

      await client2.recipes.create({
        title: 'User 2 Recipe',
        description: 'Recipe by user 2',
        ingredients: ['item'],
        instructions: ['step'],
        tags: [],
      });

      // Each user should see only their own recipes (plus sample recipe)
      const result1 = await client1.recipes.list();
      const result2 = await client2.recipes.list();

      expect(result1.data!.recipes.some(r => r.title === 'User 1 Recipe')).toBe(true);
      expect(result1.data!.recipes.some(r => r.title === 'User 2 Recipe')).toBe(false);

      expect(result2.data!.recipes.some(r => r.title === 'User 2 Recipe')).toBe(true);
      expect(result2.data!.recipes.some(r => r.title === 'User 1 Recipe')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset the database to clean state', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      await harness.seedRecipe({ title: 'Test Recipe' });
      await harness.seedCookbook({ name: 'Test Cookbook' });

      await harness.reset();

      // Should not be logged in
      const currentUser = await harness.getCurrentUser();
      expect(currentUser).toBeNull();

      // Create a new user to verify database is empty
      await harness.seedUser('new@example.com', 'Password123', 'New User');
      const client = harness.getClient();

      // Sample recipes should exist
      const recipes = await client.recipes.list();
      expect(recipes.data!.recipes.length).toBe(3);
      expect(recipes.data!.recipes.some(r => r.title === 'Herb-Crusted Chicken')).toBe(true);

      // Default cookbooks should exist (My Favorite Recipes + My Recipe Collection)
      const cookbooks = await client.cookbooks.list();
      expect(cookbooks.data!.owned.length).toBe(2);
      expect(cookbooks.data!.owned.some(c => c.name === 'My Favorite Recipes')).toBe(true);
      expect(cookbooks.data!.owned.some(c => c.name === 'My Recipe Collection')).toBe(true);
    });
  });
});
