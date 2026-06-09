import { describe, expect, it, vi } from 'vitest';
import worker from './index';

describe('registration Worker routes', () => {
  it('returns a generic response for existing emails without sending mail or signup webhooks', async () => {
    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('SELECT count FROM rate_limits')) return null;
            if (sql.includes('SELECT id FROM users WHERE email')) return { id: 'existing-user' };
            return null;
          },
          run: async () => ({ success: true }),
        }),
      }),
    };
    const waitUntil = vi.fn();

    const response = await worker.fetch(
      new Request('https://recipesaurus-api.andreay226.workers.dev/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://recipesaurus.ai',
        },
        body: JSON.stringify({
          email: 'taken@example.com',
          name: 'Taken User',
          password: 'Password123',
        }),
      }),
      {
        DB: db,
        ENVIRONMENT: 'production',
        APP_URL: 'https://recipesaurus.ai',
        RESEND_API_KEY: 'test-resend-key',
      } as never,
      { waitUntil } as never
    );

    await expect(response.json()).resolves.toEqual({
      requiresVerification: true,
      email: 'taken@example.com',
      message: 'If this email can be registered, you will receive a verification email.',
    });
    expect(response.status).toBe(200);
    expect(waitUntil).not.toHaveBeenCalled();
  });
});

describe('friend request Worker routes', () => {
  it('returns the underlying error message when accepting a friend request fails unexpectedly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => {
            throw new Error('D1 session lookup failed');
          },
        }),
      }),
    };

    const request = new Request('https://recipesaurus-api.andreay226.workers.dev/api/friend-requests/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://recipesaurus.ai',
      },
      body: JSON.stringify({ friendRequestId: 'friend-request-id' }),
    });
    Object.defineProperty(request, 'headers', {
      value: new Headers({
        Cookie: 'session=session-id',
        'Content-Type': 'application/json',
        Origin: 'https://recipesaurus.ai',
      }),
    });

    const response = await worker.fetch(
      request,
      {
        DB: db,
        ENVIRONMENT: 'production',
        APP_URL: 'https://recipesaurus.ai',
        RESEND_API_KEY: 'test-resend-key',
      } as never,
      {} as never
    );

    consoleError.mockRestore();

    await expect(response.json()).resolves.toEqual({
      error: 'Failed to accept friend request: D1 session lookup failed',
      code: 'RECIPESAURUS_FRIEND_REQUEST_ACCEPT_FAILED',
    });
    expect(response.status).toBe(500);
  });
});
