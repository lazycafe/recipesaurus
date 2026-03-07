import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';

describe('Edge cases and error handling', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  describe('Auth edge cases', () => {
    it('should reject registration with short password', async () => {
      const client = harness.getClient();
      const result = await client.auth.register('test@example.com', 'Test', 'short');
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject registration without uppercase', async () => {
      const client = harness.getClient();
      const result = await client.auth.register('test@example.com', 'Test', 'password123');
      expect(result.error).toContain('uppercase');
    });

    it('should reject registration without lowercase', async () => {
      const client = harness.getClient();
      const result = await client.auth.register('test@example.com', 'Test', 'PASSWORD123');
      expect(result.error).toContain('lowercase');
    });

    it('should reject registration without number', async () => {
      const client = harness.getClient();
      const result = await client.auth.register('test@example.com', 'Test', 'PasswordABC');
      expect(result.error).toContain('number');
    });

    it('should reject duplicate email registration', async () => {
      const client = harness.getClient();
      await client.auth.register('test@example.com', 'Test', 'Password123');

      const client2 = harness.createClient();
      const result = await client2.auth.register('test@example.com', 'Test2', 'Password123');
      expect(result.error).toContain('already exists');
    });

    it('should reject login with wrong password', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      await harness.logout();

      const client = harness.getClient();
      const result = await client.auth.login('test@example.com', 'WrongPassword1');
      expect(result.error).toContain('Invalid');
    });

    it('should reject login with non-existent user', async () => {
      const client = harness.getClient();
      const result = await client.auth.login('nonexistent@example.com', 'Password123');
      expect(result.error).toContain('Invalid');
    });

    it('should reject registration with missing fields', async () => {
      const client = harness.getClient();
      const result = await client.auth.register('', '', '');
      expect(result.error).toBeDefined();
    });

    it('should handle logout when not logged in', async () => {
      const client = harness.getClient();
      const result = await client.auth.logout();
      expect(result.data?.success).toBe(true);
    });

    it('should return null session when not logged in', async () => {
      const client = harness.getClient();
      const result = await client.auth.getSession();
      expect(result.data?.user).toBeNull();
    });
  });

  describe('Recipe edge cases', () => {
    it('should reject recipe operations when not logged in', async () => {
      const client = harness.getClient();

      const listResult = await client.recipes.list();
      expect(listResult.error).toContain('Unauthorized');

      const createResult = await client.recipes.create({
        title: 'Test',
        description: 'Test',
        ingredients: ['a'],
        instructions: ['b'],
        tags: [],
      });
      expect(createResult.error).toContain('Unauthorized');
    });

    it('should handle update of non-existent recipe', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const client = harness.getClient();

      const result = await client.recipes.update('nonexistent-id', { title: 'New Title' });
      expect(result.error).toContain('not found');
    });

    it('should delete recipe successfully', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const recipeId = await harness.seedRecipe({ title: 'To Delete' });

      const client = harness.getClient();
      const deleteResult = await client.recipes.delete(recipeId);
      expect(deleteResult.data?.success).toBe(true);

      // Verify deleted
      const listResult = await client.recipes.list();
      expect(listResult.data?.recipes.find(r => r.id === recipeId)).toBeUndefined();
    });

    it('should update recipe successfully', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const recipeId = await harness.seedRecipe({ title: 'Original' });

      const client = harness.getClient();
      const updateResult = await client.recipes.update(recipeId, {
        title: 'Updated Title',
        description: 'Updated description',
        ingredients: ['new ingredient'],
        instructions: ['new step'],
        tags: ['updated'],
      });
      expect(updateResult.data?.success).toBe(true);

      // Verify updated
      const listResult = await client.recipes.list();
      const recipe = listResult.data?.recipes.find(r => r.id === recipeId);
      expect(recipe?.title).toBe('Updated Title');
    });
  });

  describe('Cookbook edge cases', () => {
    it('should reject cookbook operations when not logged in', async () => {
      const client = harness.getClient();

      const listResult = await client.cookbooks.list();
      expect(listResult.error).toContain('Unauthorized');

      const createResult = await client.cookbooks.create({ name: 'Test' });
      expect(createResult.error).toContain('Unauthorized');
    });

    it('should handle get of non-existent cookbook', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const client = harness.getClient();

      const result = await client.cookbooks.get('nonexistent-id');
      expect(result.error).toContain('not found');
    });

    it('should handle update of non-existent cookbook', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const client = harness.getClient();

      const result = await client.cookbooks.update('nonexistent-id', { name: 'New' });
      expect(result.error).toContain('not found');
    });

    it('should delete cookbook successfully', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const cookbookId = await harness.seedCookbook({ name: 'To Delete' });

      const client = harness.getClient();
      const deleteResult = await client.cookbooks.delete(cookbookId);
      expect(deleteResult.data?.success).toBe(true);

      // Verify deleted
      const listResult = await client.cookbooks.list();
      expect(listResult.data?.owned.find(c => c.id === cookbookId)).toBeUndefined();
    });

    it('should update cookbook successfully', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const cookbookId = await harness.seedCookbook({ name: 'Original' });

      const client = harness.getClient();
      await client.cookbooks.update(cookbookId, {
        name: 'Updated Name',
        description: 'New description',
      });

      const getResult = await client.cookbooks.get(cookbookId);
      expect(getResult.data?.cookbook.name).toBe('Updated Name');
    });

    it('should handle adding non-existent recipe to cookbook', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const cookbookId = await harness.seedCookbook({ name: 'Test Cookbook' });

      const client = harness.getClient();
      const result = await client.cookbooks.addRecipe(cookbookId, 'nonexistent-recipe');
      expect(result.error).toContain('not found');
    });

    it('should handle adding recipe to non-existent cookbook', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const recipeId = await harness.seedRecipe({ title: 'Test Recipe' });

      const client = harness.getClient();
      const result = await client.cookbooks.addRecipe('nonexistent-cookbook', recipeId);
      expect(result.error).toContain('not found');
    });

    it('should handle adding same recipe twice (idempotent)', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const recipeId = await harness.seedRecipe({ title: 'Test Recipe' });
      const cookbookId = await harness.seedCookbook({ name: 'Test Cookbook' });

      const client = harness.getClient();
      await client.cookbooks.addRecipe(cookbookId, recipeId);
      const result = await client.cookbooks.addRecipe(cookbookId, recipeId);
      expect(result.data?.success).toBe(true);

      // Should still only have one
      const getResult = await client.cookbooks.get(cookbookId);
      expect(getResult.data?.recipes.length).toBe(1);
    });

    it('should remove recipe from cookbook as owner', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const recipeId = await harness.seedRecipe({ title: 'Test Recipe' });
      const cookbookId = await harness.seedCookbook({ name: 'Test Cookbook' });

      const client = harness.getClient();
      await client.cookbooks.addRecipe(cookbookId, recipeId);

      const removeResult = await client.cookbooks.removeRecipe(cookbookId, recipeId);
      expect(removeResult.data?.success).toBe(true);

      const getResult = await client.cookbooks.get(cookbookId);
      expect(getResult.data?.recipes.length).toBe(0);
    });
  });

  describe('Sharing edge cases', () => {
    it('should reject sharing cookbook with self', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const cookbookId = await harness.seedCookbook({ name: 'Test' });

      const client = harness.getClient();
      const result = await client.cookbooks.shareByEmail(cookbookId, 'test@example.com');
      expect(result.error).toContain('yourself');
    });

    it('should reject sharing with non-existent user', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const cookbookId = await harness.seedCookbook({ name: 'Test' });

      const client = harness.getClient();
      const result = await client.cookbooks.shareByEmail(cookbookId, 'nonexistent@example.com');
      expect(result.error).toContain('not found');
    });

    it('should reject sending duplicate invite to same user', async () => {
      // Owner creates cookbook
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Test' });
      const cookbookId = cookbookResult.data!.id;

      // Create target user
      const targetClient = harness.createClient();
      await targetClient.auth.register('target@example.com', 'Target', 'Password123');

      // Share first time - should succeed
      const result1 = await ownerClient.cookbooks.shareByEmail(cookbookId, 'target@example.com');
      expect(result1.data?.success).toBe(true);

      // Share second time - should fail (invite already sent)
      const result2 = await ownerClient.cookbooks.shareByEmail(cookbookId, 'target@example.com');
      expect(result2.error).toContain('already');
    });

    it('should remove share successfully', async () => {
      // Owner creates cookbook
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Test' });
      const cookbookId = cookbookResult.data!.id;

      // Create and share with target user
      const targetClient = harness.createClient();
      await targetClient.auth.register('target@example.com', 'Target', 'Password123');
      const shareResult = await ownerClient.cookbooks.shareByEmail(cookbookId, 'target@example.com');
      const targetUserId = shareResult.data!.sharedWith!.id;

      // Accept the invite
      const notifications = await targetClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;
      await targetClient.invites.accept(inviteId);

      // Target should see it after accepting
      let targetList = await targetClient.cookbooks.list();
      expect(targetList.data?.shared.length).toBe(1);

      // Remove share
      const removeResult = await ownerClient.cookbooks.removeShare(cookbookId, targetUserId);
      expect(removeResult.data?.success).toBe(true);

      // Target should no longer see it
      targetList = await targetClient.cookbooks.list();
      expect(targetList.data?.shared.length).toBe(0);
    });

    it('should get shares for cookbook', async () => {
      // Owner creates cookbook
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Test' });
      const cookbookId = cookbookResult.data!.id;

      // Create and share with target
      const targetClient = harness.createClient();
      await targetClient.auth.register('target@example.com', 'Target', 'Password123');
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'target@example.com');

      // Accept the invite
      const notifications = await targetClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;
      await targetClient.invites.accept(inviteId);

      // Create share link
      await ownerClient.cookbooks.createShareLink(cookbookId);

      // Get shares
      const sharesResult = await ownerClient.cookbooks.getShares(cookbookId);
      expect(sharesResult.data?.shares.length).toBe(1);
      expect(sharesResult.data?.shares[0].userEmail).toBe('target@example.com');
      expect(sharesResult.data?.links.length).toBe(1);
    });

    it('should revoke share link', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      const cookbookId = await harness.seedCookbook({ name: 'Test' });

      const client = harness.getClient();
      const linkResult = await client.cookbooks.createShareLink(cookbookId);
      const linkId = linkResult.data!.id;
      const token = linkResult.data!.token;

      // Revoke
      const revokeResult = await client.cookbooks.revokeShareLink(cookbookId, linkId);
      expect(revokeResult.data?.success).toBe(true);

      // Should not be accessible
      const sharedResult = await client.cookbooks.getShared(token);
      expect(sharedResult.error).toContain('not found');
    });

    it('should reject invalid share token', async () => {
      const client = harness.getClient();
      const result = await client.cookbooks.getShared('invalid-token');
      expect(result.error).toContain('not found');
    });

    it('should allow shared user to add recipes', async () => {
      // Owner creates cookbook
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Shared Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      // Create shared user with a recipe
      const sharedClient = harness.createClient();
      await sharedClient.auth.register('shared@example.com', 'Shared', 'Password123');
      const recipeResult = await sharedClient.recipes.create({
        title: 'Shared Recipe',
        description: 'Recipe from shared user',
        ingredients: ['a'],
        instructions: ['b'],
        tags: [],
      });
      const recipeId = recipeResult.data!.id;

      // Share cookbook and accept invite
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'shared@example.com');
      const notifications = await sharedClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;
      await sharedClient.invites.accept(inviteId);

      // Shared user adds recipe
      const addResult = await sharedClient.cookbooks.addRecipe(cookbookId, recipeId);
      expect(addResult.data?.success).toBe(true);

      // Verify recipe is in cookbook
      const getResult = await sharedClient.cookbooks.get(cookbookId);
      expect(getResult.data?.recipes.length).toBe(1);
    });

    it('should allow shared user to remove only their own recipes', async () => {
      // Owner creates cookbook and adds a recipe
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const ownerRecipeResult = await ownerClient.recipes.create({
        title: 'Owner Recipe',
        description: 'By owner',
        ingredients: ['a'],
        instructions: ['b'],
        tags: [],
      });
      const ownerRecipeId = ownerRecipeResult.data!.id;
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Shared Cookbook' });
      const cookbookId = cookbookResult.data!.id;
      await ownerClient.cookbooks.addRecipe(cookbookId, ownerRecipeId);

      // Create shared user with a recipe
      const sharedClient = harness.createClient();
      await sharedClient.auth.register('shared@example.com', 'Shared', 'Password123');
      const sharedRecipeResult = await sharedClient.recipes.create({
        title: 'Shared Recipe',
        description: 'By shared user',
        ingredients: ['a'],
        instructions: ['b'],
        tags: [],
      });
      const sharedRecipeId = sharedRecipeResult.data!.id;

      // Share cookbook and accept invite
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'shared@example.com');
      const notifications = await sharedClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;
      await sharedClient.invites.accept(inviteId);

      // Add shared user's recipe
      await sharedClient.cookbooks.addRecipe(cookbookId, sharedRecipeId);

      // Shared user tries to remove owner's recipe - should be silent (no error but no effect)
      await sharedClient.cookbooks.removeRecipe(cookbookId, ownerRecipeId);

      // Owner's recipe should still be there
      let getResult = await ownerClient.cookbooks.get(cookbookId);
      expect(getResult.data?.recipes.find(r => r.id === ownerRecipeId)).toBeDefined();

      // Shared user removes their own recipe - should work
      await sharedClient.cookbooks.removeRecipe(cookbookId, sharedRecipeId);
      getResult = await ownerClient.cookbooks.get(cookbookId);
      expect(getResult.data?.recipes.find(r => r.id === sharedRecipeId)).toBeUndefined();
    });
  });

  describe('Rate limiting', () => {
    it('should track failed login attempts', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      await harness.logout();

      const client = harness.getClient();

      // Make multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await client.auth.login('test@example.com', 'WrongPassword1');
      }

      // Should still be able to login with correct password
      const result = await client.auth.login('test@example.com', 'Password123');
      expect(result.data?.user).toBeDefined();
    });

    it('should show remaining attempts warning', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      await harness.logout();

      const client = harness.getClient();

      // Make 3 failed attempts (leaves 2 remaining, triggers warning)
      for (let i = 0; i < 3; i++) {
        await client.auth.login('test@example.com', 'WrongPassword1');
      }

      // 4th attempt should show warning
      const result = await client.auth.login('test@example.com', 'WrongPassword1');
      expect(result.error).toContain('attempt');
    });

    it('should lock out after too many attempts', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test');
      await harness.logout();

      const client = harness.getClient();

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await client.auth.login('test@example.com', 'WrongPassword1');
      }

      // 6th attempt should be rate limited
      const result = await client.auth.login('test@example.com', 'WrongPassword1');
      expect(result.error).toContain('Too many');
    });
  });
});
