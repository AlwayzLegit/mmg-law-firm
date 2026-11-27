// @types/node 20 (this repo's pin) has no node:sqlite. The D1 data-layer tests
// run the real schema in Node 22's built-in SQLite behind a fake of the D1
// binding (OPS-362); this declares just the part they use.
declare module "node:sqlite" {
  interface StatementSync {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number | bigint };
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
