// Core module exports
export type {
  IDatabaseAdapter,
  QueryResult,
  RequestContext,
  ApiResult,
  DbUser,
  DbSession,
  DbRecipe,
  DbCookbook,
  DbCookbookRecipe,
  DbCookbookShare,
  DbCookbookShareLink,
  DbRecipeShareLink,
  DbLoginAttempt,
  DbFriendship,
  UserInfo,
  ProfileUserInfo,
  UserProfileInfo,
  RecipeInfo,
  CookbookInfo,
  CookbookShareInfo,
  CookbookShareLinkInfo,
  RecipeSharePayload,
  RecipeShareLinkInfo,
} from './types';

export { CoreHandlers, webCryptoProvider } from './handlers';
export type { CryptoProvider } from './handlers';
export {
  COOKBOOK_SHARE_LINK_RATE_LIMIT,
  DISCOVERY_SEARCH_MAX_LENGTH,
  SHARE_LINK_DURATION_MS,
  getShareLinkExpiresAt,
  getSqlLikePattern,
  isShareLinkExpired,
  normalizeDiscoverySearchQuery,
} from './shared';
export { D1Adapter } from './D1Adapter';
export { SqliteAdapter, createInMemoryDatabase } from './SqliteAdapter';
export type { SqlJsDatabase } from './SqliteAdapter';
