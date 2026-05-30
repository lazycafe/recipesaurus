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
  CreateRecipeData,
  UpdateRecipeData,
  CreateCookbookData,
  UpdateCookbookData,
  MealPlanUsage,
  MealPlanResult,
  BillingStatus,
  BillingSession,
  PageViewCount,
  PageViewEvent,
  PageViewEventQuery,
  PageViewQuery,
} from './types';

export { HttpClient, HttpTransport, LocalStorageTokenStorage, createHttpClient } from './HttpClient';
export { InMemoryClient, InMemoryTokenStorage } from './InMemoryClient';
export { ClientProvider, useClient, useOptionalClient } from './ClientContext';
