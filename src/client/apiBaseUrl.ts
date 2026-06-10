export const PRODUCTION_API_BASE_URL = 'https://api.recipesaurus.ai';

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || PRODUCTION_API_BASE_URL).replace(/\/+$/, '');
}
