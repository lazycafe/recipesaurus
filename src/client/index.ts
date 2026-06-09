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
  RecipeShareLink,
  RecipeSharePayload,
  ProfileUser,
  UserProfile,
  CreateRecipeData,
  UpdateRecipeData,
  CreateCookbookData,
  UpdateCookbookData,
  MealPlanUsage,
  MealPlanResult,
  BillingStatus,
  BillingSession,
} from './types';

export { HttpClient, HttpTransport, CookieSessionTokenStorage, LocalStorageTokenStorage, createHttpClient } from './HttpClient';
export { InMemoryClient, InMemoryTokenStorage } from './InMemoryClient';
export { ClientProvider, useClient, useOptionalClient } from './ClientContext';
