import { createHttpClient, IClient } from './index';

// Default HTTP client for production use
// This is created once and shared across the app
export const defaultClient: IClient = createHttpClient();
