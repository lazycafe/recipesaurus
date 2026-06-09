import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactTestHarness } from './ReactTestHarness';
import { useClient } from '../client/ClientContext';
import { useState, useEffect } from 'react';
import type { Cookbook } from '../client/types';

// Test component that displays cookbooks
function CookbookList() {
  const client = useClient();
  const [owned, setOwned] = useState<Cookbook[]>([]);
  const [shared, setShared] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.cookbooks.list().then(result => {
      if (result.data) {
        setOwned(result.data.owned);
        setShared(result.data.shared);
      }
      setLoading(false);
    });
  }, [client]);

  if (loading) return <div>Loading cookbooks...</div>;

  return (
    <div>
      <h2>My Cookbooks ({owned.length})</h2>
      <ul>
        {owned.map(cb => (
          <li key={cb.id} data-testid={`owned-${cb.id}`}>
            {cb.name} ({cb.recipeCount} recipes)
          </li>
        ))}
      </ul>
      <h2>Shared With Me ({shared.length})</h2>
      <ul>
        {shared.map(cb => (
          <li key={cb.id} data-testid={`shared-${cb.id}`}>
            {cb.name} by {cb.ownerName}
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('Cookbooks with React components', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  describe('CookbookList', () => {
    it('should show no cookbooks when user has none', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const Wrapper = harness.getWrapper();

      render(
        <Wrapper>
          <CookbookList />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('My Cookbooks (2)')).toBeDefined(); // Default + Liked Recipes cookbooks
        expect(screen.getByText('Shared With Me (0)')).toBeDefined();
      });
    });

    it('should show owned cookbooks', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      await harness.seedCookbook({ name: 'Breakfast Favorites' });
      await harness.seedCookbook({ name: 'Dinner Ideas' });
      const Wrapper = harness.getWrapper();

      render(
        <Wrapper>
          <CookbookList />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('My Cookbooks (4)')).toBeDefined(); // Default + Liked + 2 seeded
        expect(screen.getByText('Breakfast Favorites (0 recipes)')).toBeDefined();
        expect(screen.getByText('Dinner Ideas (0 recipes)')).toBeDefined();
      });
    });

    it('should show shared cookbooks', async () => {
      // Create owner user and cookbook
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner User', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Shared Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      // Create shared user
      const sharedClient = harness.createClient();
      await sharedClient.auth.register('shared@example.com', 'Shared User', 'Password123');

      // Share the cookbook (creates invite)
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'shared@example.com');

      // Accept the invite
      const notifications = await sharedClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;
      await sharedClient.invites.accept(inviteId);

      // Render as shared user
      const Wrapper = harness.createWrapperForClient(sharedClient);

      render(
        <Wrapper>
          <CookbookList />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Shared With Me (1)')).toBeDefined();
        expect(screen.getByText('Shared Cookbook by Owner User')).toBeDefined();
      });
    });

    it('should add recipe to cookbook', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const recipeId = await harness.seedRecipe({ title: 'Test Recipe' });
      const cookbookId = await harness.seedCookbook({ name: 'My Cookbook' });

      const client = harness.getClient();
      await client.cookbooks.addRecipe(cookbookId, recipeId);

      const result = await client.cookbooks.get(cookbookId);
      expect(result.data!.recipes.length).toBe(1);
      expect(result.data!.recipes[0].title).toBe('Test Recipe');
    });

    it('should persist cookbook cover images through create and update', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const client = harness.getClient();
      const firstCover = 'data:image/jpeg;base64,first-cover';
      const secondCover = 'data:image/jpeg;base64,second-cover';

      const createResult = await client.cookbooks.create({
        name: 'Covered Cookbook',
        coverImage: firstCover,
      });
      const cookbookId = createResult.data!.id;

      const listResult = await client.cookbooks.list();
      expect(listResult.data!.owned.find(cookbook => cookbook.id === cookbookId)?.coverImage).toBe(firstCover);

      let getResult = await client.cookbooks.get(cookbookId);
      expect(getResult.data!.cookbook.coverImage).toBe(firstCover);

      const updateResult = await client.cookbooks.update(cookbookId, {
        coverImage: secondCover,
      });
      expect(updateResult.data!.success).toBe(true);

      getResult = await client.cookbooks.get(cookbookId);
      expect(getResult.data!.cookbook.coverImage).toBe(secondCover);

      await client.cookbooks.update(cookbookId, {
        coverImage: null,
      });
      getResult = await client.cookbooks.get(cookbookId);
      expect(getResult.data!.cookbook.coverImage).toBeNull();
    });

    it('should get cookbooks containing a recipe', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const recipeId = await harness.seedRecipe({ title: 'Test Recipe' });
      const cookbook1Id = await harness.seedCookbook({ name: 'Cookbook 1' });
      const cookbook2Id = await harness.seedCookbook({ name: 'Cookbook 2' });
      await harness.seedCookbook({ name: 'Cookbook 3' }); // Not added

      const client = harness.getClient();
      await client.cookbooks.addRecipe(cookbook1Id, recipeId);
      await client.cookbooks.addRecipe(cookbook2Id, recipeId);

      const result = await client.recipes.getCookbooksForRecipe(recipeId);
      expect(result.data).toBeDefined();
      expect(result.data!.cookbookIds.length).toBe(2);
      expect(result.data!.cookbookIds).toContain(cookbook1Id);
      expect(result.data!.cookbookIds).toContain(cookbook2Id);
    });

    it('should return empty array when recipe not in any cookbook', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const recipeId = await harness.seedRecipe({ title: 'Test Recipe' });
      await harness.seedCookbook({ name: 'Empty Cookbook' });

      const client = harness.getClient();
      const result = await client.recipes.getCookbooksForRecipe(recipeId);
      expect(result.data).toBeDefined();
      expect(result.data!.cookbookIds.length).toBe(0);
    });

    it('should include shared cookbooks when getting cookbooks for recipe', async () => {
      // Create owner with recipe and cookbook
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const recipeResult = await ownerClient.recipes.create({
        title: 'Shared Recipe',
        description: 'A shared recipe',
        ingredients: ['ingredient'],
        instructions: ['step'],
        tags: [],
      });
      const recipeId = recipeResult.data!.id;
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Shared Cookbook' });
      const cookbookId = cookbookResult.data!.id;
      await ownerClient.cookbooks.addRecipe(cookbookId, recipeId);

      // Create shared user
      const sharedClient = harness.createClient();
      await sharedClient.auth.register('shared@example.com', 'Shared User', 'Password123');

      // Share the cookbook (creates invite)
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'shared@example.com');

      // Accept the invite
      const notifications = await sharedClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;
      await sharedClient.invites.accept(inviteId);

      // Shared user should see the cookbook when querying for the recipe
      const result = await sharedClient.recipes.getCookbooksForRecipe(recipeId);
      expect(result.data).toBeDefined();
      expect(result.data!.cookbookIds).toContain(cookbookId);
    });
  });

  describe('Cookbook sharing', () => {
    it('should send notification when sharing cookbook with another user', async () => {
      // Create owner
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'My Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      // Create recipient
      const recipientClient = harness.createClient();
      await recipientClient.auth.register('recipient@example.com', 'Recipient', 'Password123');

      // Share creates an invite, not immediate access
      const shareResult = await ownerClient.cookbooks.shareByEmail(cookbookId, 'recipient@example.com');
      expect(shareResult.data!.success).toBe(true);

      // Recipient should receive a notification
      const notifications = await recipientClient.notifications.list();
      expect(notifications.data!.notifications.length).toBe(1);
      expect(notifications.data!.notifications[0].type).toBe('cookbook_invite');
      expect(notifications.data!.notifications[0].message).toContain('My Cookbook');
      expect(notifications.data!.notifications[0].data?.inviteId).toBeDefined();
    });

    it('should share cookbook with an accepted friend by user id', async () => {
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Friend Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      const recipientClient = harness.createClient();
      const recipient = await recipientClient.auth.register('recipient@example.com', 'Recipient', 'Password123');
      const recipientUserId = recipient.data!.user!.id;

      const friendRequest = await ownerClient.profile.addFriend({ userId: recipientUserId });
      expect(friendRequest.error).toBeUndefined();

      const friendNotifications = await recipientClient.notifications.list();
      const friendRequestId = friendNotifications.data!.notifications.find(
        notification => notification.type === 'friend_request'
      )?.data?.friendRequestId;
      expect(friendRequestId).toBeDefined();
      await recipientClient.profile.acceptFriendRequest(friendRequestId!);

      const shareResult = await ownerClient.cookbooks.shareWithUser(cookbookId, recipientUserId);
      expect(shareResult.error).toBeUndefined();
      expect(shareResult.data?.sharedWith?.id).toBe(recipientUserId);

      const notifications = await recipientClient.notifications.list();
      const invite = notifications.data!.notifications.find(notification => notification.type === 'cookbook_invite');
      expect(invite?.message).toContain('Friend Cookbook');
      expect(invite?.data?.inviteId).toBeDefined();
    });

    it('should reject sharing cookbook by user id with someone who is not a friend', async () => {
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Friend Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      const recipientClient = harness.createClient();
      const recipient = await recipientClient.auth.register('recipient@example.com', 'Recipient', 'Password123');

      const shareResult = await ownerClient.cookbooks.shareWithUser(cookbookId, recipient.data!.user!.id);
      expect(shareResult.error).toContain('friends');
    });

    it('should allow recipient to accept invite and see shared cookbook', async () => {
      // Create owner
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'My Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      // Create recipient
      const recipientClient = harness.createClient();
      await recipientClient.auth.register('recipient@example.com', 'Recipient', 'Password123');

      // Share
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'recipient@example.com');

      // Before accepting, recipient doesn't have access
      const beforeAccept = await recipientClient.cookbooks.list();
      expect(beforeAccept.data!.shared.length).toBe(0);

      // Get invite from notification
      const notifications = await recipientClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;

      // Accept the invite
      const acceptResult = await recipientClient.invites.accept(inviteId);
      expect(acceptResult.data!.success).toBe(true);
      expect(acceptResult.data!.cookbookName).toBe('My Cookbook');

      // Now recipient can see it
      const afterAccept = await recipientClient.cookbooks.list();
      expect(afterAccept.data!.shared.length).toBe(1);
      expect(afterAccept.data!.shared[0].name).toBe('My Cookbook');
    });

    it('should notify cookbook collaborators when a recipe is added', async () => {
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'Shared Dinners' });
      const cookbookId = cookbookResult.data!.id;

      const sharedClient = harness.createClient();
      await sharedClient.auth.register('shared@example.com', 'Shared User', 'Password123');
      const recipeResult = await sharedClient.recipes.create({
        title: 'Pesto Pasta',
        description: 'A fast pasta dinner',
        ingredients: ['pasta', 'pesto'],
        instructions: ['Boil pasta', 'Toss with pesto'],
        tags: ['dinner'],
      });
      const recipeId = recipeResult.data!.id;

      await ownerClient.cookbooks.shareByEmail(cookbookId, 'shared@example.com');
      const inviteNotifications = await sharedClient.notifications.list();
      const inviteId = inviteNotifications.data!.notifications[0].data?.inviteId!;
      await sharedClient.invites.accept(inviteId);

      await sharedClient.cookbooks.addRecipe(cookbookId, recipeId);

      const ownerNotifications = await ownerClient.notifications.list();
      const recipeNotification = ownerNotifications.data!.notifications.find(n => n.type === 'recipe_added');

      expect(recipeNotification).toBeDefined();
      expect(recipeNotification?.message).toContain('Pesto Pasta');
      expect(recipeNotification?.data?.cookbookId).toBe(cookbookId);
      expect(recipeNotification?.data?.recipeId).toBe(recipeId);
    });

    it('should allow recipient to decline invite', async () => {
      // Create owner
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'My Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      // Create recipient
      const recipientClient = harness.createClient();
      await recipientClient.auth.register('recipient@example.com', 'Recipient', 'Password123');

      // Share
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'recipient@example.com');

      // Get invite from notification
      const notifications = await recipientClient.notifications.list();
      const inviteId = notifications.data!.notifications[0].data?.inviteId!;

      // Decline the invite
      const declineResult = await recipientClient.invites.decline(inviteId);
      expect(declineResult.data!.success).toBe(true);

      // Recipient still doesn't have access
      const afterDecline = await recipientClient.cookbooks.list();
      expect(afterDecline.data!.shared.length).toBe(0);
    });

    it('should create share link', async () => {
      await harness.seedUser('test@example.com', 'Password123', 'Test User');
      const cookbookId = await harness.seedCookbook({ name: 'My Cookbook' });

      const client = harness.getClient();
      const linkResult = await client.cookbooks.createShareLink(cookbookId);

      expect(linkResult.data!.token).toBeDefined();
      expect(linkResult.data!.isActive).toBe(true);

      // Can view via share link
      const sharedView = await client.cookbooks.getShared(linkResult.data!.token);
      expect(sharedView.data!.cookbook.name).toBe('My Cookbook');
    });
  });
});
