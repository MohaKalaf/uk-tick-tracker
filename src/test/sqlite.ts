// Tests only: the Db interface over Node's built-in SQLite, the engine D1 runs on
import { DatabaseSync } from "node:sqlite";
import type { Db, Param } from "@/lib/db/db";
import { SCHEMA } from "@/lib/db/schema";

export function memoryDb(): Db {
  const sqlite = new DatabaseSync(":memory:");
  for (const sql of SCHEMA) sqlite.exec(sql);
  const p = (params: Param[] = []) => params as (string | number | null)[];
  return {
    all: async <T>(sql: string, params?: Param[]) => sqlite.prepare(sql).all(...p(params)) as T[],
    first: async <T>(sql: string, params?: Param[]) => (sqlite.prepare(sql).get(...p(params)) as T | undefined) ?? null,
    run: async (sql, params) => {
      sqlite.prepare(sql).run(...p(params));
    },
    batch: async (statements) => {
      sqlite.exec("BEGIN");
      try {
        for (const s of statements) sqlite.prepare(s.sql).run(...p(s.params));
        sqlite.exec("COMMIT");
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
  };
}
