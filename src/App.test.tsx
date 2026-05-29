import { describe, it, expect } from 'vitest';
import { getSharedRecipePreviewData, getSharedRecipeToken, isKnownAppPath } from './App';

describe('getSharedRecipePreviewData', () => {
  it('reads encoded recipe data from the public preview route', () => {
    expect(getSharedRecipePreviewData('/preview/encoded-recipe')).toBe('encoded-recipe');
  });

  it('keeps legacy shared recipe links working', () => {
    expect(getSharedRecipePreviewData('/recipe/encoded-recipe')).toBe('encoded-recipe');
  });

  it('ignores unrelated routes', () => {
    expect(getSharedRecipePreviewData('/cookbooks')).toBeNull();
  });
});

describe('getSharedRecipeToken', () => {
  it('reads tokens from short public shared recipe links', () => {
    expect(getSharedRecipeToken('/shared-recipe/share-token')).toBe('share-token');
  });

  it('ignores unrelated routes', () => {
    expect(getSharedRecipeToken('/preview/encoded-recipe')).toBeNull();
  });
});

describe('isKnownAppPath', () => {
  it('accepts known static app paths', () => {
    expect(isKnownAppPath('/cookbooks')).toBe(true);
    expect(isKnownAppPath('/settings')).toBe(true);
  });

  it('accepts known dynamic app paths', () => {
    expect(isKnownAppPath('/cookbooks/family-favorites')).toBe(true);
    expect(isKnownAppPath('/discover/cookbooks/public-cookbook')).toBe(true);
  });

  it('rejects invalid app paths', () => {
    expect(isKnownAppPath('/missing-page')).toBe(false);
    expect(isKnownAppPath('/discover/unknown')).toBe(false);
  });
});
