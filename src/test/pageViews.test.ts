import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReactTestHarness } from './ReactTestHarness';

describe('Page view tracking', () => {
  let harness: ReactTestHarness;

  beforeEach(async () => {
    harness = await ReactTestHarness.create();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await harness.reset();
    harness.close();
  });

  it('counts page views by page key within a time frame', async () => {
    const client = harness.getClient();
    const now = vi.spyOn(Date, 'now');

    now.mockReturnValue(1_000);
    await client.analytics.trackPageView('public_home');

    now.mockReturnValue(2_000);
    await client.analytics.trackPageView('discover_recipes');
    await client.analytics.trackPageView('discover_recipes');

    now.mockReturnValue(3_000);
    await client.analytics.trackPageView('discover_recipes');

    const result = await client.analytics.getPageViews({
      pageKey: 'discover_recipes',
      from: 1_500,
      to: 2_500,
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      counts: [{ pageKey: 'discover_recipes', count: 2 }],
      total: 2,
      from: 1_500,
      to: 2_500,
    });
  });

  it('can return counts for all page keys in a window', async () => {
    const client = harness.getClient();
    const now = vi.spyOn(Date, 'now');

    now.mockReturnValue(1_000);
    await client.analytics.trackPageView('public_home');
    await client.analytics.trackPageView('public_home');
    await client.analytics.trackPageView('settings');

    const result = await client.analytics.getPageViews({
      from: new Date(500).toISOString(),
      to: new Date(1_500),
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.counts).toEqual([
      { pageKey: 'public_home', count: 2 },
      { pageKey: 'settings', count: 1 },
    ]);
    expect(result.data?.total).toBe(3);
  });

  it('rejects invalid page keys', async () => {
    const client = harness.getClient();

    const trackResult = await client.analytics.trackPageView('../nope');
    const queryResult = await client.analytics.getPageViews({ pageKey: '../nope' });

    expect(trackResult.error).toBe('Invalid page key');
    expect(queryResult.error).toBe('Invalid page key');
  });
});
