import { describe, it, expect } from 'vitest';
import { getAuthenticatedDefaultRoute, getSharedRecipePreviewData, getSharedRecipeToken } from './App';

describe('getAuthenticatedDefaultRoute', () => {
  it('sends users with recipes to My Recipes', () => {
    expect(getAuthenticatedDefaultRoute(1)).toBe('/my-recipes');
  });

  it('sends users without recipes to Discover recipes', () => {
    expect(getAuthenticatedDefaultRoute(0)).toBe('/discover/recipes');
  });
});

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
