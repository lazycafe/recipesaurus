import React, { ReactNode } from 'react';
import type { IClient, User } from '../client/types';
import { ClientProvider } from '../client/ClientContext';
import { InMemoryClient, InMemoryTokenStorage } from '../client/InMemoryClient';
import type { Database as SqlJsDatabase } from 'sql.js';

// Dynamically import core modules (only available in Node.js test environment)
let CoreHandlers: typeof import('../../api/src/core/handlers').CoreHandlers;
let SqliteAdapter: typeof import('../../api/src/core/SqliteAdapter').SqliteAdapter;
let createInMemoryDatabase: typeof import('../../api/src/core/SqliteAdapter').createInMemoryDatabase;
let webCryptoProvider: typeof import('../../api/src/core/handlers').webCryptoProvider;

// Load core modules
async function loadCoreModules() {
  const handlersModule = await import('../../api/src/core/handlers');
  const sqliteModule = await import('../../api/src/core/SqliteAdapter');

  CoreHandlers = handlersModule.CoreHandlers;
  webCryptoProvider = handlersModule.webCryptoProvider;
  SqliteAdapter = sqliteModule.SqliteAdapter;
  createInMemoryDatabase = sqliteModule.createInMemoryDatabase;
}

export interface ReactTestHarnessOptions {
  // Additional providers to wrap components with
  additionalProviders?: React.ComponentType<{ children: ReactNode }>[];
}

export class ReactTestHarness {
  private db: SqlJsDatabase;
  private client: IClient;
  private tokenStorage: InMemoryTokenStorage;

  private constructor(db: SqlJsDatabase, client: IClient, tokenStorage: InMemoryTokenStorage) {
    this.db = db;
    this.client = client;
    this.tokenStorage = tokenStorage;
  }

  /**
   * Create a new test harness with an in-memory database
   */
  static async create(_options: ReactTestHarnessOptions = {}): Promise<ReactTestHarness> {
    // Load core modules if not already loaded
    if (!CoreHandlers) {
      await loadCoreModules();
    }

    // Create in-memory database
    const db = await createInMemoryDatabase();

    // Create database adapter and handlers
    const adapter = new SqliteAdapter(db);
    const handlers = new CoreHandlers(adapter, webCryptoProvider);

    // Create token storage and client
    const tokenStorage = new InMemoryTokenStorage();
    const client = new InMemoryClient(handlers, tokenStorage);

    return new ReactTestHarness(db, client, tokenStorage);
  }

  /**
   * Get the client instance for direct API calls in tests
   */
  getClient(): IClient {
    return this.client;
  }

  /**
   * Create a new client instance with its own token storage
   * Useful for simulating multiple users
   */
  createClient(): IClient {
    const adapter = new SqliteAdapter(this.db);
    const handlers = new CoreHandlers(adapter, webCryptoProvider);
    const tokenStorage = new InMemoryTokenStorage();
    return new InMemoryClient(handlers, tokenStorage);
  }

  /**
   * Get a wrapper component that provides the client context
   * Use this to wrap components under test
   */
  getWrapper(): React.FC<{ children: ReactNode }> {
    const client = this.client;
    return function TestWrapper({ children }: { children: ReactNode }) {
      return (
        <ClientProvider client={client}>
          {children}
        </ClientProvider>
      );
    };
  }

  /**
   * Create a wrapper for a specific client instance
   * Useful for testing with multiple users
   */
  createWrapperForClient(client: IClient): React.FC<{ children: ReactNode }> {
    return function TestWrapper({ children }: { children: ReactNode }) {
      return (
        <ClientProvider client={client}>
          {children}
        </ClientProvider>
      );
    };
  }

  // Test utilities

  /**
   * Seed a user directly in the database (bypasses password validation)
   * Returns the created user and session token
   */
  async seedUser(
    email: string,
    password: string,
    name?: string
  ): Promise<{ user: User; token: string }> {
    const result = await this.client.auth.register(
      email,
      name || email.split('@')[0],
      password
    );

    if (result.error || !result.data || !result.data.user) {
      throw new Error(`Failed to seed user: ${result.error}`);
    }

    return {
      user: result.data.user,
      token: result.data.token!,
    };
  }

  /**
   * Login as a user and set the token
   */
  async loginAs(email: string, password: string): Promise<User> {
    const result = await this.client.auth.login(email, password);
    if (result.error || !result.data) {
      throw new Error(`Failed to login: ${result.error}`);
    }
    return result.data.user;
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    await this.client.auth.logout();
  }

  /**
   * Get the current logged-in user
   */
  async getCurrentUser(): Promise<User | null> {
    const result = await this.client.auth.getSession();
    return result.data?.user || null;
  }

  /**
   * Seed a recipe for the current user
   */
  async seedRecipe(data: {
    title: string;
    description?: string;
    ingredients?: string[];
    instructions?: string[];
    tags?: string[];
  }): Promise<string> {
    const result = await this.client.recipes.create({
      title: data.title,
      description: data.description || 'Test recipe description',
      ingredients: data.ingredients || ['ingredient 1', 'ingredient 2'],
      instructions: data.instructions || ['step 1', 'step 2'],
      tags: data.tags || ['test'],
    });

    if (result.error || !result.data) {
      throw new Error(`Failed to seed recipe: ${result.error}`);
    }

    return result.data.id;
  }

  /**
   * Seed a cookbook for the current user
   */
  async seedCookbook(data: {
    name: string;
    description?: string;
  }): Promise<string> {
    const result = await this.client.cookbooks.create({
      name: data.name,
      description: data.description,
    });

    if (result.error || !result.data) {
      throw new Error(`Failed to seed cookbook: ${result.error}`);
    }

    return result.data.id;
  }

  /**
   * Reset the database to a clean state
   */
  async reset(): Promise<void> {
    // Clear all tables
    this.db.run('DELETE FROM cookbook_share_links');
    this.db.run('DELETE FROM cookbook_shares');
    this.db.run('DELETE FROM cookbook_recipes');
    this.db.run('DELETE FROM cookbooks');
    this.db.run('DELETE FROM recipes');
    this.db.run('DELETE FROM sessions');
    this.db.run('DELETE FROM login_attempts');
    this.db.run('DELETE FROM users');

    // Clear token storage
    this.tokenStorage.clearToken();
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
