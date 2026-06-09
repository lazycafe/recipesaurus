export const SHARE_LINK_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const COOKBOOK_SHARE_LINK_RATE_LIMIT = 60;
export const DISCOVERY_SEARCH_MAX_LENGTH = 120;

export function getShareLinkExpiresAt(createdAt: number): number {
  return createdAt + SHARE_LINK_DURATION_MS;
}

export function isShareLinkExpired(createdAt: number, now = Date.now()): boolean {
  return getShareLinkExpiresAt(createdAt) <= now;
}

export function normalizeDiscoverySearchQuery(query?: string | null): string {
  return (query || '').trim().replace(/\s+/g, ' ').slice(0, DISCOVERY_SEARCH_MAX_LENGTH);
}

export function getSqlLikePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, match => `\\${match}`)}%`;
}
