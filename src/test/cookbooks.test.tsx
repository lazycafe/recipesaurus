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
        expect(screen.getByText('My Cookbooks (0)')).toBeDefined();
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
        expect(screen.getByText('My Cookbooks (2)')).toBeDefined();
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

      // Share the cookbook
      await ownerClient.cookbooks.shareByEmail(cookbookId, 'shared@example.com');

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
  });

  describe('Cookbook sharing', () => {
    it('should share cookbook with another user', async () => {
      // Create owner
      const ownerClient = harness.createClient();
      await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
      const cookbookResult = await ownerClient.cookbooks.create({ name: 'My Cookbook' });
      const cookbookId = cookbookResult.data!.id;

      // Create recipient
      const recipientClient = harness.createClient();
      await recipientClient.auth.register('recipient@example.com', 'Recipient', 'Password123');

      // Share
      const shareResult = await ownerClient.cookbooks.shareByEmail(cookbookId, 'recipient@example.com');
      expect(shareResult.data!.success).toBe(true);
      expect(shareResult.data!.sharedWith!.name).toBe('Recipient');

      // Verify recipient can see it
      const recipientCookbooks = await recipientClient.cookbooks.list();
      expect(recipientCookbooks.data!.shared.length).toBe(1);
      expect(recipientCookbooks.data!.shared[0].name).toBe('My Cookbook');
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
