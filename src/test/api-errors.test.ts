import { describe, expect, it } from 'vitest';
import {
  RECIPESAURUS_BAD_GATEWAY_CODE,
  RECIPESAURUS_BAD_REQUEST_CODE,
  RECIPESAURUS_FORBIDDEN_CODE,
  RECIPESAURUS_INTERNAL_ERROR_CODE,
  RECIPESAURUS_NOT_FOUND_CODE,
  RECIPESAURUS_PAYMENT_REQUIRED_CODE,
  RECIPESAURUS_RATE_LIMITED_CODE,
  RECIPESAURUS_UNAUTHORIZED_CODE,
  RECIPESAURUS_UNAVAILABLE_CODE,
  getDefaultRecipesaurusErrorCode,
} from '../../api/src/core/apiErrors';

describe('Recipesaurus API error codes', () => {
  it('maps common HTTP failures to stable response codes', () => {
    expect(getDefaultRecipesaurusErrorCode(400)).toBe(RECIPESAURUS_BAD_REQUEST_CODE);
    expect(getDefaultRecipesaurusErrorCode(401)).toBe(RECIPESAURUS_UNAUTHORIZED_CODE);
    expect(getDefaultRecipesaurusErrorCode(402)).toBe(RECIPESAURUS_PAYMENT_REQUIRED_CODE);
    expect(getDefaultRecipesaurusErrorCode(403)).toBe(RECIPESAURUS_FORBIDDEN_CODE);
    expect(getDefaultRecipesaurusErrorCode(404)).toBe(RECIPESAURUS_NOT_FOUND_CODE);
    expect(getDefaultRecipesaurusErrorCode(429)).toBe(RECIPESAURUS_RATE_LIMITED_CODE);
    expect(getDefaultRecipesaurusErrorCode(502)).toBe(RECIPESAURUS_BAD_GATEWAY_CODE);
    expect(getDefaultRecipesaurusErrorCode(503)).toBe(RECIPESAURUS_UNAVAILABLE_CODE);
    expect(getDefaultRecipesaurusErrorCode(500)).toBe(RECIPESAURUS_INTERNAL_ERROR_CODE);
  });
});
