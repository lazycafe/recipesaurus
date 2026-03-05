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
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
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
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cookbooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
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

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT,
      attempted_at INTEGER NOT NULL,
      success INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
    CREATE INDEX IF NOT EXISTS idx_cookbooks_user_id ON cookbooks(user_id);
    CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_cookbook_id ON cookbook_recipes(cookbook_id);
    CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_recipe_id ON cookbook_recipes(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_cookbook_shares_cookbook_id ON cookbook_shares(cookbook_id);
    CREATE INDEX IF NOT EXISTS idx_cookbook_shares_shared_with ON cookbook_shares(shared_with_user_id);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
  `);

  return db;
}

// Export the SqlJsDatabase type for use in the harness
export type { SqlJsDatabase };
