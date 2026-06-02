import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';
import type { IClient } from '../client/types';

describe('Recipe sharing with users', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  async function acceptFriendRequest(ownerClient: IClient, recipientClient: IClient, recipientUserId: string) {
    const friendRequest = await ownerClient.profile.addFriend({ userId: recipientUserId });
    expect(friendRequest.error).toBeUndefined();

    const notifications = await recipientClient.notifications.list();
    const friendRequestId = notifications.data!.notifications.find(
      notification => notification.type === 'friend_request'
    )?.data?.friendRequestId;
    expect(friendRequestId).toBeDefined();

    const accepted = await recipientClient.profile.acceptFriendRequest(friendRequestId!);
    expect(accepted.error).toBeUndefined();
  }

  it('shares a recipe with an accepted friend and creates a notification', async () => {
    const ownerClient = harness.createClient();
    await ownerClient.auth.register('owner@example.com', 'Owner Chef', 'Password123');

    const recipientClient = harness.createClient();
    const recipient = await recipientClient.auth.register('recipient@example.com', 'Recipe Friend', 'Password123');
    const recipientUserId = recipient.data!.user!.id;

    await acceptFriendRequest(ownerClient, recipientClient, recipientUserId);

    const recipe = {
      title: 'Pasta Night',
      description: 'Cozy weeknight pasta',
      ingredients: ['pasta', 'tomatoes'],
      instructions: ['Boil pasta', 'Simmer sauce'],
      tags: ['dinner'],
    };

    const shareResult = await ownerClient.recipes.shareWithUser(recipe, recipientUserId);
    expect(shareResult.error).toBeUndefined();
    expect(shareResult.data?.sharedWith?.id).toBe(recipientUserId);
    expect(shareResult.data?.shareLink?.token).toBeDefined();

    const notifications = await recipientClient.notifications.list();
    const recipeShare = notifications.data!.notifications.find(
      notification => notification.type === 'recipe_share'
    );
    expect(recipeShare?.message).toContain('Pasta Night');
    expect(recipeShare?.data?.shareToken).toBe(shareResult.data!.shareLink!.token);
    expect(recipeShare?.data?.recipeTitle).toBe('Pasta Night');
    expect(recipeShare?.data?.sharedBy).toBe('Owner Chef');

    const sharedRecipe = await recipientClient.recipes.getShared(shareResult.data!.shareLink!.token);
    expect(sharedRecipe.error).toBeUndefined();
    expect(sharedRecipe.data?.recipe.title).toBe('Pasta Night');
  });

  it('allows recipe share payloads larger than the previous 64 KB cap', async () => {
    const ownerClient = harness.createClient();
    await ownerClient.auth.register('owner@example.com', 'Owner Chef', 'Password123');

    const recipientClient = harness.createClient();
    const recipient = await recipientClient.auth.register('recipient@example.com', 'Recipe Friend', 'Password123');
    const recipientUserId = recipient.data!.user!.id;

    await acceptFriendRequest(ownerClient, recipientClient, recipientUserId);

    const largeRecipe = {
      title: 'Detailed Feast',
      description: 'a'.repeat(90 * 1024),
      ingredients: ['flour', 'water'],
      instructions: ['mix', 'bake'],
    };

    const linkResult = await ownerClient.recipes.createShareLink(largeRecipe);
    expect(linkResult.error).toBeUndefined();
    expect(linkResult.data?.token).toBeDefined();

    const shareResult = await ownerClient.recipes.shareWithUser(largeRecipe, recipientUserId);
    expect(shareResult.error).toBeUndefined();
    expect(shareResult.data?.shareLink?.token).toBeDefined();
  });

  it('rejects recipe sharing with someone who is not a friend', async () => {
    const ownerClient = harness.createClient();
    await ownerClient.auth.register('owner@example.com', 'Owner Chef', 'Password123');

    const recipientClient = harness.createClient();
    const recipient = await recipientClient.auth.register('recipient@example.com', 'Recipe Friend', 'Password123');

    const shareResult = await ownerClient.recipes.shareWithUser(
      {
        title: 'Pasta Night',
        ingredients: ['pasta'],
        instructions: ['cook'],
      },
      recipient.data!.user!.id
    );

    expect(shareResult.error).toContain('friends');
  });
});
