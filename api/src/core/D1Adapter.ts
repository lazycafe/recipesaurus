import type { IDatabaseAdapter, QueryResult } from './types';

// Cloudflare D1 Database Adapter
export class D1Adapter implements IDatabaseAdapter {
  constructor(private db: D1Database) {}

  async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    return bound.first<T>();
  }

  async all<T>(sql: string, ...params: unknown[]): Promise<QueryResult<T>> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all<T>();
    return { results: result.results };
  }

  async run(sql: string, ...params: unknown[]): Promise<void> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    await bound.run();
  }
}
