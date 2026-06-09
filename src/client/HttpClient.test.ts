import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient, HttpTransport } from './HttpClient';
import type { ITokenStorage, ITransport } from './types';

const tokenStorage: ITokenStorage = {
  getToken: () => null,
  setToken: vi.fn(),
  clearToken: vi.fn(),
};

describe('HttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('sends friend request ids in notification action request bodies', async () => {
    const transport: ITransport = {
      request: vi.fn(async () => ({ data: { success: true } })),
    } as unknown as ITransport;
    const client = new HttpClient(transport, tokenStorage);

    await client.profile.acceptFriendRequest('request/with spaces%');
    await client.profile.declineFriendRequest('request/with spaces%');

    expect(transport.request).toHaveBeenNthCalledWith(
      1,
      'POST',
      '/api/friend-requests/accept',
      { friendRequestId: 'request/with spaces%' }
    );
    expect(transport.request).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/api/friend-requests/decline',
      { friendRequestId: 'request/with spaces%' }
    );
  });

  it('encodes recipe share tokens in notification action paths', async () => {
    const transport: ITransport = {
      request: vi.fn(async () => ({ data: { success: true } })),
    } as unknown as ITransport;
    const client = new HttpClient(transport, tokenStorage);

    await client.recipes.acceptShare('share/token with spaces%');
    await client.recipes.declineShare('share/token with spaces%');

    expect(transport.request).toHaveBeenNthCalledWith(
      1,
      'POST',
      '/api/recipe-shares/share%2Ftoken%20with%20spaces%25/accept'
    );
    expect(transport.request).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/api/recipe-shares/share%2Ftoken%20with%20spaces%25/decline'
    );
  });

  it('returns response status for non-json api failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Worker failed', { status: 502, statusText: 'Bad Gateway' }))
    );
    const transport = new HttpTransport('https://api.test', tokenStorage);

    const result = await transport.request('POST', '/api/friend-requests/request-1/accept');

    expect(result).toEqual({
      error: 'Worker failed',
      status: 502,
      code: undefined,
    });
  });

  it('does not send bearer tokens from browser token storage', async () => {
    let capturedInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const transport = new HttpTransport('https://api.test', {
      getToken: () => 'session-id',
      setToken: vi.fn(),
      clearToken: vi.fn(),
    });

    await transport.request('GET', '/api/auth/session');

    expect((capturedInit?.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
