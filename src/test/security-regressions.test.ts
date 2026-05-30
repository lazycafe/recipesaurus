import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';
import type { RecipeSharePayload } from '../client/types';

describe('Security regressions', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    await harness.reset();
    harness.close();
  });

  it('clears failed login attempts after a successful login', async () => {
    await harness.seedUser('login-reset@example.com', 'Password123', 'Login Reset');
    await harness.logout();

    const client = harness.getClient();

    for (let i = 0; i < 4; i++) {
      const result = await client.auth.login('login-reset@example.com', 'WrongPassword1');
      expect(result.error).toContain('Invalid');
    }

    await expect(client.auth.login('login-reset@example.com', 'Password123')).resolves.toMatchObject({
      data: {
        user: {
          email: 'login-reset@example.com',
        },
      },
    });

    await client.auth.logout();
    const failedAfterSuccess = await client.auth.login('login-reset@example.com', 'WrongPassword1');
    expect(failedAfterSuccess.error).toContain('Invalid');

    const finalLogin = await client.auth.login('login-reset@example.com', 'Password123');
    expect(finalLogin.data?.user.email).toBe('login-reset@example.com');
    expect(finalLogin.error).toBeUndefined();
  });

  it('does not let another user create cookbook share links', async () => {
    const ownerClient = harness.createClient();
    await ownerClient.auth.register('owner@example.com', 'Owner', 'Password123');
    const cookbookResult = await ownerClient.cookbooks.create({ name: 'Private Cookbook' });
    const cookbookId = cookbookResult.data!.id;

    const otherClient = harness.createClient();
    await otherClient.auth.register('other@example.com', 'Other', 'Password123');

    const result = await otherClient.cookbooks.createShareLink(cookbookId);

    expect(result.error).toContain('not found');
    expect(result.data).toBeUndefined();
  });

  it('normalizes recipe share payloads before storing public links', async () => {
    const client = harness.getClient();
    const payload = {
      title: '  Lemon Tart  ',
      description: '  Bright and tart  ',
      ingredients: [' lemon ', '', 42],
      instructions: [' whisk ', null, ' bake '],
      imageUrl: '  https://example.com/tart.png  ',
      unexpected: '<script>alert("xss")</script>',
    } as unknown as RecipeSharePayload;

    const linkResult = await client.recipes.createShareLink(payload);
    expect(linkResult.data?.token).toBeDefined();

    const sharedResult = await client.recipes.getShared(linkResult.data!.token);

    expect(sharedResult.data?.recipe).toEqual({
      title: 'Lemon Tart',
      description: 'Bright and tart',
      ingredients: ['lemon'],
      instructions: ['whisk', 'bake'],
      prepTime: null,
      cookTime: null,
      servings: null,
      imageUrl: 'https://example.com/tart.png',
      sourceUrl: null,
    });
  });

  it('rejects malformed or oversized recipe share payloads', async () => {
    const client = harness.getClient();

    const malformed = await client.recipes.createShareLink({
      title: 'No Steps',
      description: 'Missing public recipe requirements',
      ingredients: ['flour'],
      instructions: [],
    });
    expect(malformed.error).toContain('title, ingredients, and instructions');

    const oversized = await client.recipes.createShareLink({
      title: 'Huge Recipe',
      description: 'Too large for a public share token',
      ingredients: ['a'.repeat(65 * 1024)],
      instructions: ['mix'],
    });
    expect(oversized.error).toContain('too large');
  });
});
