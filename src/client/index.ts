// Client abstraction layer
export type {
  IClient,
  ITransport,
  ITokenStorage,
  ApiResponse,
  User,
  Recipe,
  Cookbook,
  CookbookShare,
  CookbookShareLink,
  CreateRecipeData,
  UpdateRecipeData,
  CreateCookbookData,
  UpdateCookbookData,
} from './types';

export { HttpClient, HttpTransport, LocalStorageTokenStorage, createHttpClient } from './HttpClient';
export { InMemoryClient, InMemoryTokenStorage } from './InMemoryClient';
export { ClientProvider, useClient } from './ClientContext';
