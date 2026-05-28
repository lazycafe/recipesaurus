import { describe, it, expect } from 'vitest';
import { getSharedRecipePreviewData } from './App';

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
