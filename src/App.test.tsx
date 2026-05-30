import { describe, it, expect } from 'vitest';
import { getPageKeyForPath, getSharedRecipePreviewData, getSharedRecipeToken, PAGE_KEYS } from './App';

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

describe('getPageKeyForPath', () => {
  it('uses the public home key for unauthenticated app routes', () => {
    expect(getPageKeyForPath('/cookbooks', { isAuthenticated: false, isAuthLoading: false })).toBe(PAGE_KEYS.publicHome);
  });

  it('waits for auth state before tracking authenticated app routes', () => {
    expect(getPageKeyForPath('/cookbooks', { isAuthenticated: false, isAuthLoading: true })).toBeNull();
  });

  it('maps authenticated routes to stable page keys', () => {
    const context = { isAuthenticated: true, isAuthLoading: false };

    expect(getPageKeyForPath('/discover/recipes', context)).toBe(PAGE_KEYS.discoverRecipes);
    expect(getPageKeyForPath('/discover/cookbooks/abc123', context)).toBe(PAGE_KEYS.discoverCookbookDetail);
    expect(getPageKeyForPath('/cookbooks/abc123', context)).toBe(PAGE_KEYS.cookbookDetail);
    expect(getPageKeyForPath('/settings', context)).toBe(PAGE_KEYS.settings);
  });

  it('tracks public utility and share routes independently of auth loading', () => {
    const loadingContext = { isAuthenticated: false, isAuthLoading: true };

    expect(getPageKeyForPath('/shared/share-token', loadingContext)).toBe(PAGE_KEYS.sharedCookbook);
    expect(getPageKeyForPath('/shared-recipe/share-token', loadingContext)).toBe(PAGE_KEYS.sharedRecipePreview);
    expect(getPageKeyForPath('/reset-password?token=abc', loadingContext)).toBe(PAGE_KEYS.resetPassword);
    expect(getPageKeyForPath('/verify-email?token=abc', loadingContext)).toBe(PAGE_KEYS.verifyEmail);
  });
});
