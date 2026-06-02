import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';

describe('Profiles and friends', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  it('updates profile details and adds friends by email', async () => {
    const aliceClient = harness.createClient();
    const bobClient = harness.createClient();

    const alice = await aliceClient.auth.register('alice@example.com', 'Alice Chef', 'Password123');
    const bob = await bobClient.auth.register('bob@example.com', 'Bob Baker', 'Password123');

    expect(alice.data?.user?.avatarUrl).toBeNull();

    const updated = await aliceClient.auth.updateProfile({
      name: 'Alice Sauces',
      avatarUrl: 'https://example.com/alice.png',
    });

    expect(updated.error).toBeUndefined();
    expect(updated.data?.user.name).toBe('Alice Sauces');
    expect(updated.data?.user.avatarUrl).toBe('https://example.com/alice.png');

    const friendRequest = await aliceClient.profile.addFriend({ email: 'bob@example.com' });
    expect(friendRequest.error).toBeUndefined();
    expect(friendRequest.data?.friend.id).toBe(bob.data?.user?.id);

    const aliceProfile = await aliceClient.profile.get(alice.data!.user!.id);
    expect(aliceProfile.data?.profile.friendCount).toBe(0);
    expect(aliceProfile.data?.profile.isCurrentUser).toBe(true);
    expect(aliceProfile.data?.profile.recipeCount).toBe(3);
    expect(aliceProfile.data?.profile.cookbookCount).toBe(1);

    const bobNotifications = await bobClient.notifications.list();
    expect(bobNotifications.data?.notifications).toHaveLength(1);
    expect(bobNotifications.data?.notifications[0].type).toBe('friend_request');
    const friendRequestId = bobNotifications.data!.notifications[0].data?.friendRequestId!;

    const accepted = await bobClient.profile.acceptFriendRequest(friendRequestId);
    expect(accepted.error).toBeUndefined();
    expect(accepted.data?.friend.id).toBe(alice.data?.user?.id);

    const aliceNotifications = await aliceClient.notifications.list();
    expect(aliceNotifications.data?.notifications).toHaveLength(1);
    expect(aliceNotifications.data?.notifications[0]).toMatchObject({
      type: 'friend_request_accepted',
      title: 'Friend request accepted',
      message: 'Bob Baker accepted your friend request',
      data: {
        friendId: bob.data?.user?.id,
        friendName: 'Bob Baker',
        accepterId: bob.data?.user?.id,
        accepterName: 'Bob Baker',
      },
      isRead: false,
    });

    const acceptedAgain = await bobClient.profile.acceptFriendRequest(friendRequestId);
    expect(acceptedAgain.error).toBeUndefined();
    expect(acceptedAgain.data?.friend.id).toBe(alice.data?.user?.id);

    const aliceNotificationsAfterRetry = await aliceClient.notifications.list();
    expect(aliceNotificationsAfterRetry.data?.notifications).toHaveLength(1);

    const aliceProfileAfterAccept = await aliceClient.profile.get(alice.data!.user!.id);
    expect(aliceProfileAfterAccept.data?.profile.friendCount).toBe(1);

    const bobProfileAsAlice = await aliceClient.profile.get(bob.data!.user!.id);
    expect(bobProfileAsAlice.data?.profile.isFriend).toBe(true);

    const friends = await aliceClient.profile.listFriends(alice.data!.user!.id);
    expect(friends.data?.friends).toEqual([
      {
        id: bob.data!.user!.id,
        name: 'Bob Baker',
        avatarUrl: null,
      },
    ]);
  });

  it('shows only public recipes and cookbooks on profiles while counting all saved content', async () => {
    const aliceClient = harness.createClient();

    const alice = await aliceClient.auth.register('alice@example.com', 'Alice Chef', 'Password123');
    expect(alice.error).toBeUndefined();

    const privateRecipe = await aliceClient.recipes.create({
      title: 'Private Recipe',
      description: 'For my eyes only',
      ingredients: ['secret ingredient'],
      instructions: ['keep private'],
      tags: ['private'],
      isPublic: false,
    });
    expect(privateRecipe.error).toBeUndefined();

    const publicRecipe = await aliceClient.recipes.create({
      title: 'Public Recipe',
      description: 'Shared with everyone',
      ingredients: ['public ingredient'],
      instructions: ['share freely'],
      tags: ['public'],
      isPublic: true,
    });
    expect(publicRecipe.error).toBeUndefined();

    const privateCookbook = await aliceClient.cookbooks.create({
      name: 'Private Cookbook',
      isPublic: false,
    });
    expect(privateCookbook.error).toBeUndefined();

    const publicCookbook = await aliceClient.cookbooks.create({
      name: 'Public Cookbook',
      isPublic: true,
    });
    expect(publicCookbook.error).toBeUndefined();

    const profile = await aliceClient.profile.get(alice.data!.user!.id);
    expect(profile.error).toBeUndefined();
    expect(profile.data?.profile.isCurrentUser).toBe(true);
    expect(profile.data?.profile.recipeCount).toBe(5);
    expect(profile.data?.profile.cookbookCount).toBe(3);
    expect(profile.data?.profile.recipes.map(recipe => recipe.title)).toEqual(['Public Recipe']);
    expect(profile.data?.profile.cookbooks.map(cookbook => cookbook.name)).toEqual(['Public Cookbook']);
  });

  it('accepts a pending friend request even when the notification request id is stale', async () => {
    const aliceClient = harness.createClient();
    const bobClient = harness.createClient();

    const alice = await aliceClient.auth.register('alice@example.com', 'Alice Chef', 'Password123');
    const bob = await bobClient.auth.register('bob@example.com', 'Bob Baker', 'Password123');

    const friendRequest = await aliceClient.profile.addFriend({ email: 'bob@example.com' });
    expect(friendRequest.error).toBeUndefined();

    const db = (harness as unknown as {
      db: { run: (sql: string, params?: unknown[]) => void };
    }).db;
    db.run(
      'UPDATE notifications SET data = ? WHERE user_id = ? AND type = ?',
      [
        JSON.stringify({
          friendRequestId: 'stale-request-id',
          requesterId: alice.data!.user!.id,
          requesterName: 'Alice Chef',
        }),
        bob.data!.user!.id,
        'friend_request',
      ]
    );

    const accepted = await bobClient.profile.acceptFriendRequest('stale-request-id');
    expect(accepted.error).toBeUndefined();
    expect(accepted.data?.friend.id).toBe(alice.data?.user?.id);

    const bobProfileAsAlice = await aliceClient.profile.get(bob.data!.user!.id);
    expect(bobProfileAsAlice.data?.profile.isFriend).toBe(true);

    const bobNotifications = await bobClient.notifications.list();
    expect(bobNotifications.data?.notifications).toHaveLength(0);
  });

  it('cleans stale friend request notifications when users are already friends', async () => {
    const aliceClient = harness.createClient();
    const bobClient = harness.createClient();

    const alice = await aliceClient.auth.register('alice@example.com', 'Alice Chef', 'Password123');
    const bob = await bobClient.auth.register('bob@example.com', 'Bob Baker', 'Password123');

    const friendRequest = await aliceClient.profile.addFriend({ email: 'bob@example.com' });
    expect(friendRequest.error).toBeUndefined();

    const bobNotifications = await bobClient.notifications.list();
    const friendRequestId = bobNotifications.data!.notifications[0].data?.friendRequestId!;

    const accepted = await bobClient.profile.acceptFriendRequest(friendRequestId);
    expect(accepted.error).toBeUndefined();

    const db = (harness as unknown as {
      db: { run: (sql: string, params?: unknown[]) => void };
    }).db;
    db.run('DELETE FROM friend_requests WHERE id = ?', [friendRequestId]);
    db.run(
      `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'stale-already-friends-notification',
        bob.data!.user!.id,
        'friend_request',
        'Friend request',
        'Alice Chef sent you a friend request',
        JSON.stringify({
          friendRequestId: 'deleted-request-id',
          requesterId: alice.data!.user!.id,
          requesterName: 'Alice Chef',
        }),
        0,
        Date.now(),
      ]
    );

    const acceptedAgain = await bobClient.profile.acceptFriendRequest('deleted-request-id');
    expect(acceptedAgain.error).toBeUndefined();
    expect(acceptedAgain.data?.friend.id).toBe(alice.data?.user?.id);

    const notificationsAfterAccept = await bobClient.notifications.list();
    expect(notificationsAfterAccept.data?.notifications).toHaveLength(0);
  });

  it('accepts a declined friend request when the notification still exists', async () => {
    const aliceClient = harness.createClient();
    const bobClient = harness.createClient();

    const alice = await aliceClient.auth.register('alice@example.com', 'Alice Chef', 'Password123');
    const bob = await bobClient.auth.register('bob@example.com', 'Bob Baker', 'Password123');

    const friendRequest = await aliceClient.profile.addFriend({ email: 'bob@example.com' });
    expect(friendRequest.error).toBeUndefined();

    const bobNotifications = await bobClient.notifications.list();
    const friendRequestId = bobNotifications.data!.notifications[0].data?.friendRequestId!;

    const db = (harness as unknown as {
      db: { run: (sql: string, params?: unknown[]) => void };
    }).db;
    db.run("UPDATE friend_requests SET status = 'declined', responded_at = ? WHERE id = ?", [
      Date.now(),
      friendRequestId,
    ]);

    const accepted = await bobClient.profile.acceptFriendRequest(friendRequestId);
    expect(accepted.error).toBeUndefined();
    expect(accepted.data?.friend.id).toBe(alice.data?.user?.id);

    const bobProfileAsAlice = await aliceClient.profile.get(bob.data!.user!.id);
    expect(bobProfileAsAlice.data?.profile.isFriend).toBe(true);

    const bobNotificationsAfterAccept = await bobClient.notifications.list();
    expect(bobNotificationsAfterAccept.data?.notifications).toHaveLength(0);

    const aliceNotifications = await aliceClient.notifications.list();
    expect(aliceNotifications.data?.notifications).toHaveLength(1);
    expect(aliceNotifications.data?.notifications[0]).toMatchObject({
      type: 'friend_request_accepted',
      message: 'Bob Baker accepted your friend request',
    });
  });

  it('treats repeated friend request declines as successful cleanup', async () => {
    const aliceClient = harness.createClient();
    const bobClient = harness.createClient();

    await aliceClient.auth.register('alice@example.com', 'Alice Chef', 'Password123');
    await bobClient.auth.register('bob@example.com', 'Bob Baker', 'Password123');

    const friendRequest = await aliceClient.profile.addFriend({ email: 'bob@example.com' });
    expect(friendRequest.error).toBeUndefined();

    const bobNotifications = await bobClient.notifications.list();
    const friendRequestId = bobNotifications.data!.notifications[0].data?.friendRequestId!;

    const declined = await bobClient.profile.declineFriendRequest(friendRequestId);
    expect(declined.error).toBeUndefined();

    const declinedAgain = await bobClient.profile.declineFriendRequest(friendRequestId);
    expect(declinedAgain.error).toBeUndefined();
    expect(declinedAgain.data?.success).toBe(true);
  });
});
