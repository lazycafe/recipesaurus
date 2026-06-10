import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl, PRODUCTION_API_BASE_URL } from './apiBaseUrl';

describe('apiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults production API calls to the Recipesaurus API subdomain', () => {
    vi.stubEnv('VITE_API_URL', '');

    expect(getApiBaseUrl()).toBe(PRODUCTION_API_BASE_URL);
    expect(getApiBaseUrl()).toBe('https://api.recipesaurus.ai');
  });

  it('uses a configured API URL without trailing slashes', () => {
    vi.stubEnv('VITE_API_URL', 'https://staging-api.recipesaurus.ai///');

    expect(getApiBaseUrl()).toBe('https://staging-api.recipesaurus.ai');
  });
});
