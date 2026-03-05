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
  DbLoginAttempt,
  UserInfo,
  RecipeInfo,
  CookbookInfo,
  CookbookShareInfo,
  CookbookShareLinkInfo,
} from './types';

export { CoreHandlers, webCryptoProvider } from './handlers';
export type { CryptoProvider } from './handlers';
export { D1Adapter } from './D1Adapter';
export { SqliteAdapter, createInMemoryDatabase } from './SqliteAdapter';
export type { SqlJsDatabase } from './SqliteAdapter';
