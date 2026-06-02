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
    expect(aliceProfile.data?.profile.recipeCount).toBeGreaterThan(0);
    expect(aliceProfile.data?.profile.cookbookCount).toBeGreaterThan(0);

    const bobNotifications = await bobClient.notifications.list();
    expect(bobNotifications.data?.notifications).toHaveLength(1);
    expect(bobNotifications.data?.notifications[0].type).toBe('friend_request');
    const friendRequestId = bobNotifications.data!.notifications[0].data?.friendRequestId!;

    const accepted = await bobClient.profile.acceptFriendRequest(friendRequestId);
    expect(accepted.error).toBeUndefined();
    expect(accepted.data?.friend.id).toBe(alice.data?.user?.id);

    const acceptedAgain = await bobClient.profile.acceptFriendRequest(friendRequestId);
    expect(acceptedAgain.error).toBeUndefined();
    expect(acceptedAgain.data?.friend.id).toBe(alice.data?.user?.id);

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
