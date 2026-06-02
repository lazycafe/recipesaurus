import type { IDatabaseAdapter, QueryResult } from './types';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

// sql.js Database Adapter (pure JavaScript SQLite)
export class SqliteAdapter implements IDatabaseAdapter {
  constructor(private db: SqlJsDatabase) {}

  async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params.map(p => p as null | number | string | Uint8Array));
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      const result: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        result[col] = values[i];
      });
      stmt.free();
      return result as T;
    }
    stmt.free();
    return null;
  }

  async all<T>(sql: string, ...params: unknown[]): Promise<QueryResult<T>> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params.map(p => p as null | number | string | Uint8Array));
    const results: T[] = [];
    const columns = stmt.getColumnNames();
    while (stmt.step()) {
      const values = stmt.get();
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      results.push(row as T);
    }
    stmt.free();
    return { results };
  }

  async run(sql: string, ...params: unknown[]): Promise<void> {
    this.db.run(sql, params.map(p => p as null | number | string | Uint8Array));
  }
}

// Helper to create an in-memory SQLite database with schema
export async function createInMemoryDatabase(): Promise<SqlJsDatabase> {
  const maybeProcess = (globalThis as { process?: { cwd?: () => string; versions?: { node?: string } } }).process;
  const SQL = await initSqlJs({
    locateFile: () => maybeProcess?.versions?.node
      ? `${maybeProcess.cwd?.() || '.'}/node_modules/sql.js/dist/sql-wasm.wasm`
      : '/sql-wasm.wasm',
  });
  const db = new SQL.Database();

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      tags TEXT,
      image_url TEXT,
      source_url TEXT,
      prep_time TEXT,
      cook_time TEXT,
      servings TEXT,
      source_recipe_id TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (source_recipe_id) REFERENCES recipes(id)
    );

    CREATE TABLE IF NOT EXISTS cookbooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      system_type TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cookbook_recipes (
      cookbook_id TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      added_by_user_id TEXT,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (cookbook_id, recipe_id),
      FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );

    CREATE TABLE IF NOT EXISTS cookbook_shares (
      id TEXT PRIMARY KEY,
      cookbook_id TEXT NOT NULL,
      shared_with_user_id TEXT NOT NULL,
      shared_by_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id),
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id),
      FOREIGN KEY (shared_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cookbook_share_links (
      id TEXT PRIMARY KEY,
      cookbook_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id)
    );

    CREATE TABLE IF NOT EXISTS recipe_share_links (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      recipe_data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT,
      attempted_at INTEGER NOT NULL,
      success INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_meal_plan_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      user_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      status TEXT NOT NULL,
      current_period_end INTEGER,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cookbook_invites (
      id TEXT PRIMARY KEY,
      cookbook_id TEXT NOT NULL,
      invited_user_id TEXT NOT NULL,
      invited_by_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (cookbook_id) REFERENCES cookbooks(id),
      FOREIGN KEY (invited_user_id) REFERENCES users(id),
      FOREIGN KEY (invited_by_user_id) REFERENCES users(id),
      UNIQUE(cookbook_id, invited_user_id)
    );

    CREATE TABLE IF NOT EXISTS friendships (
      user_a_id TEXT NOT NULL,
      user_b_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_a_id, user_b_id),
      FOREIGN KEY (user_a_id) REFERENCES users(id),
      FOREIGN KEY (user_b_id) REFERENCES users(id),
      CHECK (user_a_id <> user_b_id)
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      requested_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      responded_at INTEGER,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (requested_user_id) REFERENCES users(id),
      UNIQUE(requester_id, requested_user_id),
      CHECK (requester_id <> requested_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_owner_id ON recipes(owner_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_source_recipe_id ON recipes(source_recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
    CREATE INDEX IF NOT EXISTS idx_cookbooks_user_id ON cookbooks(user_id);
    CREATE INDEX IF NOT EXISTS idx_cookbooks_is_public ON cookbooks(is_public);
    CREATE INDEX IF NOT EXISTS idx_cookbooks_system_type ON cookbooks(system_type);
    CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_cookbook_id ON cookbook_recipes(cookbook_id);
    CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_recipe_id ON cookbook_recipes(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_cookbook_shares_cookbook_id ON cookbook_shares(cookbook_id);
    CREATE INDEX IF NOT EXISTS idx_cookbook_shares_shared_with ON cookbook_shares(shared_with_user_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_requested_user ON friend_requests(requested_user_id);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
    CREATE INDEX IF NOT EXISTS idx_recipe_share_links_token ON recipe_share_links(token);
    CREATE INDEX IF NOT EXISTS idx_recipe_share_links_created_at ON recipe_share_links(created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_meal_plan_requests_user_created ON ai_meal_plan_requests(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_customer ON user_subscriptions(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription ON user_subscriptions(stripe_subscription_id);
  `);

  return db;
}

// Export the SqlJsDatabase type for use in the harness
export type { SqlJsDatabase };
