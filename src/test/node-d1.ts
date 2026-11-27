import type { DatabaseSync } from "node:sqlite";

import type { D1Like, D1Statement } from "@/lib/db/d1Client";

/**
 * A fake of the D1 binding API over Node's built-in SQLite, for tests. The
 * same shape as the one in src/lib/db/d1Client.test.ts.
 */
export function nodeD1(db: DatabaseSync): D1Like {
  const stmt = (sql: string, params: unknown[] = []): D1Statement & { sync(): Record<string, unknown>[] } => ({
    bind: (...values: unknown[]) => stmt(sql, values),
    sync: () => db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[],
    all: async <T,>() => ({ results: db.prepare(sql).all(...(params as never[])) as T[] }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(params as never[])).changes) } }),
  });
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async <T,>(stmts: D1Statement[]) => {
      db.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ results: (s as ReturnType<typeof stmt>).sync() as T[] }));
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
