import { test, expect, testCookbook } from './fixtures';
import type { Page } from '@playwright/test';

test.describe('Cookbook Sharing', () => {
  const user1 = {
    email: `share-user1-${Date.now()}@example.com`,
    name: 'Share User One',
    password: 'SharePassword123!',
  };

  const user2 = {
    email: `share-user2-${Date.now()}@example.com`,
    name: 'Share User Two',
    password: 'SharePassword456!',
  };

  async function seedSharingState(
    page: Page,
    options: { makeFriends?: boolean; acceptedShare?: boolean; loginAs?: 'owner' | 'recipient' } = {}
  ) {
    await page.goto('/');

    await page.evaluate(async ({ owner, recipient, cookbook, makeFriends, acceptedShare, loginAs }) => {
      const { createDevClient } = await import('/src/client/devClient.ts');
      const client = await createDevClient();

      const fail = (message: string): never => {
        throw new Error(message);
      };

      const recipientRegistration = await client.auth.register(
        recipient.email,
        recipient.name,
        recipient.password
      );
      const recipientUser = recipientRegistration.data?.user;
      if (!recipientUser) {
        fail(`Could not register recipient: ${recipientRegistration.error ?? 'missing user'}`);
      }

      await client.auth.logout();

      const ownerRegistration = await client.auth.register(owner.email, owner.name, owner.password);
      if (!ownerRegistration.data?.user) {
        fail(`Could not register owner: ${ownerRegistration.error ?? 'missing user'}`);
      }

      const cookbookResult = await client.cookbooks.create(cookbook);
      const cookbookId = cookbookResult.data?.id;
      if (!cookbookId) {
        fail(`Could not create cookbook: ${cookbookResult.error ?? 'missing id'}`);
      }

      if (makeFriends) {
        const friendRequest = await client.profile.addFriend({ email: recipient.email });
        if (friendRequest.error) {
          fail(`Could not request friendship: ${friendRequest.error}`);
        }

        await client.auth.logout();

        const recipientLogin = await client.auth.login(recipient.email, recipient.password);
        if (!recipientLogin.data?.user) {
          fail(`Could not log in recipient: ${recipientLogin.error ?? 'missing user'}`);
        }

        const notifications = await client.notifications.list();
        const friendRequestId = notifications.data?.notifications.find(
          notification => notification.type === 'friend_request'
        )?.data?.friendRequestId;
        if (!friendRequestId) {
          fail('Could not find friend request notification');
        }

        const acceptFriend = await client.profile.acceptFriendRequest(friendRequestId);
        if (acceptFriend.error) {
          fail(`Could not accept friend request: ${acceptFriend.error}`);
        }

        await client.auth.logout();

        const ownerLogin = await client.auth.login(owner.email, owner.password);
        if (!ownerLogin.data?.user) {
          fail(`Could not log owner back in: ${ownerLogin.error ?? 'missing user'}`);
        }
      }

      if (acceptedShare) {
        const shareResult = await client.cookbooks.shareByEmail(cookbookId, recipient.email);
        if (shareResult.error) {
          fail(`Could not share cookbook: ${shareResult.error}`);
        }

        await client.auth.logout();

        const recipientLogin = await client.auth.login(recipient.email, recipient.password);
        if (!recipientLogin.data?.user) {
          fail(`Could not log in recipient: ${recipientLogin.error ?? 'missing user'}`);
        }

        const notifications = await client.notifications.list();
        const inviteId = notifications.data?.notifications.find(
          notification => notification.type === 'cookbook_invite' && notification.data?.cookbookId === cookbookId
        )?.data?.inviteId;
        if (!inviteId) {
          fail('Could not find cookbook invite notification');
        }

        const acceptInvite = await client.invites.accept(inviteId);
        if (acceptInvite.error) {
          fail(`Could not accept cookbook invite: ${acceptInvite.error}`);
        }
      }

      await client.auth.logout();

      const finalUser = loginAs === 'recipient' ? recipient : owner;
      const finalLogin = await client.auth.login(finalUser.email, finalUser.password);
      if (!finalLogin.data?.user) {
        fail(`Could not log final user in: ${finalLogin.error ?? 'missing user'}`);
      }
    }, {
      owner: user1,
      recipient: user2,
      cookbook: testCookbook,
      makeFriends: Boolean(options.makeFriends),
      acceptedShare: Boolean(options.acceptedShare),
      loginAs: options.loginAs ?? 'owner',
    });

    await page.goto('/cookbooks');
    await expect(page.getByRole('heading', { name: 'Cookbooks' })).toBeVisible({ timeout: 10000 });
  }

  async function openShareModal(page: Page) {
    await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.locator('.share-modal')).toBeVisible();
  }

  test.describe('Share Modal', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);
    });

    test('should open share modal when clicking Share button', async ({ page }) => {
      await openShareModal(page);

      await expect(page.getByRole('heading', { name: `Share "${testCookbook.name}"` })).toBeVisible();
    });

    test('should show Share with User tab by default', async ({ page }) => {
      await openShareModal(page);

      const userTab = page.locator('.share-tab').filter({ hasText: 'Share with User' });
      await expect(userTab).toHaveClass(/active/);
    });

    test('should show empty friend state when there are no friends', async ({ page }) => {
      await openShareModal(page);

      await expect(page.getByText('Add friends before sharing cookbooks with users.')).toBeVisible();
    });

    test('should show Share Link tab', async ({ page }) => {
      await openShareModal(page);

      await expect(page.getByText('Share Link')).toBeVisible();
    });

    test('should close share modal when clicking X', async ({ page }) => {
      await openShareModal(page);

      await page.locator('.modal-close').click();

      await expect(page.locator('.share-modal')).not.toBeVisible();
    });
  });

  test.describe('Share with User', () => {
    test.beforeEach(async ({ page }) => {
      await seedSharingState(page, { makeFriends: true });
    });

    test('should list friends in the share modal', async ({ page }) => {
      await openShareModal(page);

      const friendRow = page.locator('.share-friend-item').filter({ hasText: user2.name });
      await expect(friendRow).toBeVisible();
      await expect(friendRow).toContainText('Friend');
    });

    test('should send a cookbook invite to a friend', async ({ page }) => {
      await openShareModal(page);

      const friendRow = page.locator('.share-friend-item').filter({ hasText: user2.name });
      await friendRow.getByRole('button', { name: 'Share' }).click();

      await expect(page.getByText(`Invite sent to ${user2.name}`)).toBeVisible({ timeout: 10000 });
      await expect(friendRow.getByRole('button', { name: 'Sent' })).toBeDisabled();
    });

    test('should mark friend as pending after sharing', async ({ page }) => {
      await openShareModal(page);

      const friendRow = page.locator('.share-friend-item').filter({ hasText: user2.name });
      await friendRow.getByRole('button', { name: 'Share' }).click();

      await expect(friendRow).toContainText('Invite pending');
      await expect(friendRow.getByRole('button', { name: 'Sent' })).toBeVisible();
    });
  });

  test.describe('Remove User Share', () => {
    test.beforeEach(async ({ page }) => {
      await seedSharingState(page, { acceptedShare: true });
      await openShareModal(page);
    });

    test('should show remove button for shared user', async ({ page }) => {
      await expect(page.locator('.share-item').filter({ hasText: user2.name })).toBeVisible();
      await expect(page.locator('.share-item-remove')).toBeVisible();
    });

    test('should remove share access after confirmation', async ({ page }) => {
      await page.locator('.share-item-remove').click();
      await page.locator('.confirm-modal').getByRole('button', { name: 'Remove', exact: true }).click();

      await expect(page.locator('.share-item').filter({ hasText: user2.name })).not.toBeVisible({ timeout: 5000 });
    });

    test('should not remove share when confirmation is cancelled', async ({ page }) => {
      await page.locator('.share-item-remove').click();
      await page.locator('.confirm-modal').getByRole('button', { name: 'Cancel' }).click();

      await expect(page.locator('.share-item').filter({ hasText: user2.name })).toBeVisible();
    });
  });

  test.describe('Share Link Tab', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);
    });

    test('should switch to Share Link tab', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();

      const linkTab = page.locator('.share-tab').filter({ hasText: 'Share Link' });
      await expect(linkTab).toHaveClass(/active/);
    });

    test('should show info about share links', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();

      await expect(page.getByText('Anyone with the link can view this cookbook')).toBeVisible();
    });

    test('should show Generate New Link button', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();

      await expect(page.getByRole('button', { name: 'Generate New Link' })).toBeVisible();
    });

    test('should generate a share link', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();

      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.locator('.share-link-item')).toBeVisible({ timeout: 10000 });
    });

    test('should show Active Links section after generating', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.getByText('Active Links')).toBeVisible({ timeout: 10000 });
    });

    test('should show copy button for share link', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.locator('.share-link-actions button').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show revoke button for share link', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      await expect(page.locator('.btn-danger-icon')).toBeVisible({ timeout: 10000 });
    });

    test('should generate multiple share links', async ({ page }) => {
      await openShareModal(page);
      await page.getByText('Share Link').click();

      await page.getByRole('button', { name: 'Generate New Link' }).click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();

      const links = page.locator('.share-link-item');
      await expect(links).toHaveCount(2, { timeout: 10000 });
    });
  });

  test.describe('Revoke Share Link', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await helpers.register(user1);
      await helpers.createCookbook(testCookbook);

      await openShareModal(page);
      await page.getByText('Share Link').click();
      await page.getByRole('button', { name: 'Generate New Link' }).click();
      await expect(page.locator('.share-link-item')).toBeVisible({ timeout: 10000 });
    });

    test('should revoke share link after confirmation', async ({ page }) => {
      await page.locator('.btn-danger-icon').click();
      await page.locator('.confirm-modal').getByRole('button', { name: 'Revoke', exact: true }).click();

      await expect(page.locator('.share-link-item')).not.toBeVisible({ timeout: 5000 });
    });

    test('should not revoke share link when confirmation is cancelled', async ({ page }) => {
      await page.locator('.btn-danger-icon').click();
      await page.locator('.confirm-modal').getByRole('button', { name: 'Cancel' }).click();

      await expect(page.locator('.share-link-item')).toBeVisible();
    });
  });

  test.describe('Shared Cookbook Access', () => {
    test.beforeEach(async ({ page }) => {
      await seedSharingState(page, { acceptedShare: true, loginAs: 'recipient' });
    });

    test('should see shared cookbook in cookbooks grid', async ({ page }) => {
      await expect(page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name })).toBeVisible();
    });

    test('should show owner name on shared cookbook', async ({ page }) => {
      await expect(page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name })).toContainText(user1.name);
    });

    test('should not show Edit button for shared cookbook', async ({ page }) => {
      await page.locator('.cookbook-card-link').filter({ hasText: testCookbook.name }).click();

      await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Share' })).not.toBeVisible();
    });

    test('should not show delete button on shared cookbook card', async ({ page }) => {
      const card = page.locator('.cookbook-card').filter({ hasText: testCookbook.name });
      await card.hover();

      await expect(card.locator('.card-delete')).not.toBeVisible();
    });
  });
});
