// The small slice of a SQL database the app needs. Cloudflare D1 implements it in
// production; tests use Node's built-in SQLite, so the same SQL runs in both.

export type Param = string | number | null;

export interface Statement {
  sql: string;
  params?: Param[];
}

export interface Db {
  all<T>(sql: string, params?: Param[]): Promise<T[]>;
  first<T>(sql: string, params?: Param[]): Promise<T | null>;
  run(sql: string, params?: Param[]): Promise<void>;
  // All or nothing
  batch(statements: Statement[]): Promise<void>;
}

// Structural type for the parts of D1Database used here
interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
  batch(statements: unknown[]): Promise<unknown>;
}

export function d1(database: D1Like): Db {
  const bound = (sql: string, params: Param[] = []) => database.prepare(sql).bind(...params);
  return {
    all: async <T>(sql: string, params?: Param[]) => (await bound(sql, params).all<T>()).results,
    first: <T>(sql: string, params?: Param[]) => bound(sql, params).first<T>(),
    run: async (sql, params) => {
      await bound(sql, params).run();
    },
    batch: async (statements) => {
      if (statements.length) await database.batch(statements.map((s) => bound(s.sql, s.params)));
    },
  };
}
