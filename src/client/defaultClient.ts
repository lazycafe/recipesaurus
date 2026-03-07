import { createHttpClient, IClient } from './index';

// Default HTTP client for production use
export const defaultClient: IClient = createHttpClient();

// Async getter for dev mode - allows lazy initialization of InMemoryClient
let clientPromise: Promise<IClient> | null = null;

export async function getClient(): Promise<IClient> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_DEV_CLIENT === 'true') {
    if (!clientPromise) {
      const { createDevClient } = await import('./devClient');
      clientPromise = createDevClient();
    }
    return clientPromise;
  }
  return defaultClient;
}

export function isDevClientEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_USE_DEV_CLIENT === 'true';
}
