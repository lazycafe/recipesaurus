import { describe, expect, it, vi } from 'vitest';
import worker from './index';

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

    const response = await worker.fetch(
      new Request('https://recipesaurus-api.andreay226.workers.dev/api/friend-requests/accept', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer session-id',
          'Content-Type': 'application/json',
          Origin: 'https://recipesaurus.ai',
        },
        body: JSON.stringify({ friendRequestId: 'friend-request-id' }),
      }),
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
