import {
  assertColumn,
  columnList,
  compileOrder,
  compileWhere,
  decodeRow,
  defaultNullsFirst,
  encodeValue,
  parseLogicString,
  parseSelect,
  postgresMessage,
  QueryError,
  resolveRelation,
  shapeRow,
  sqliteErrorCode,
  tableInfo,
  type EmbedItem,
  type Filter,
  type SelectShape,
  type FilterOp,
  type OrderBy,
  type ParsedSelect,
} from "./d1Sql";

// supabase-js–compatible query client over a Cloudflare D1 binding.
// src/lib/supabase/admin.ts and server.ts hand this out instead of the
// Supabase client when DATA_PROVIDER=d1 and a D1 binding exists, so the
// files that query through `supabase.from(…)` run unchanged on D1.
//
// Ported from The Look (AlwayzLegit/thelook, commit a6db2f6,
// src/lib/db/d1Client.ts) by OPS-362 (part 1 of OPS-353). Changes for MMG
// Law: nested and "!inner" embeds, filters on embedded columns, .contains()
// on a JSON-array column, and an empty RPC table (every rpc() answers
// PGRST202 until the part that moves that Postgres function).
//
// Contract kept from supabase-js / PostgREST:
//   • awaiting a builder resolves { data, error, count, status } and
//     never rejects (database errors come back in `error`);
//   • .single() → PGRST116 unless exactly one row; .maybeSingle() → null for none;
//   • unknown columns → PGRST204; constraint failures → 23505 / 23503 / 23502 / 23514;
//   • booleans and JSON columns decode to JS values; NULL ordering as Postgres.
// Not supported (unused in src/, audited 2026-11-27): full-text search,
// range operators, .overlaps(), embed hints other than !inner / !left,
// order() on an embedded table.

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<{ results: T[] }[]>;
}

export interface PostgrestLikeError { message: string; code: string; details: string | null; hint: string | null }
export interface PostgrestLikeResult<T = unknown> {
  data: T | null;
  error: PostgrestLikeError | null;
  count: number | null;
  status: number;
  statusText: string;
}

type Row = Record<string, unknown>;
type Op = "select" | "insert" | "update" | "upsert" | "delete";

function toError(err: unknown): PostgrestLikeError {
  if (err instanceof QueryError) return { message: err.message, code: err.code, details: err.details, hint: err.hint };
  const raw = err instanceof Error ? err.message : String(err);
  const code = sqliteErrorCode(raw);
  return { message: postgresMessage(code, raw), code, details: raw, hint: null };
}

// D1 occasionally fails a single call with an internal or network error
// (observed 2026-11-02: three public pages rendered their empty
// fallback within one minute of a deploy). Reads are idempotent, so
// one retry after a short pause hides the blip; writes are never
// retried here, their callers decide.
const TRANSIENT_D1 = /D1_ERROR|7403|internal error|network connection|reset|timeout|overloaded|too many requests/i;

export function isTransientD1Error(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_D1.test(msg);
}

export async function retryRead<R>(fn: () => Promise<R>, delayMs = 150): Promise<R> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransientD1Error(err)) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return fn();
  }
}

function fail<T>(err: unknown, status = 400): PostgrestLikeResult<T> {
  return { data: null, error: toError(err), count: null, status, statusText: "Bad Request" };
}

export class D1QueryBuilder<T = unknown> implements PromiseLike<PostgrestLikeResult<T>> {
  private op: Op = "select";
  private selectString: string | undefined;
  private returning = false;
  private countMode: "exact" | null = null;
  private head = false;
  private filters: Filter[] = [];
  private orders: OrderBy[] = [];
  private limitN: number | null = null;
  private offsetN = 0;
  private cardinality: "many" | "single" | "maybeSingle" = "many";
  private values: Row[] = [];
  private onConflict: string[] | null = null;
  private ignoreDuplicates = false;
  private shouldThrow = false;
  private pending: Promise<PostgrestLikeResult<T>> | null = null;

  constructor(private readonly table: string, private readonly db: () => Promise<D1Like>) {}

  // --- verbs -------------------------------------------------------------
  select(columns?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }): this {
    if (this.op === "select") {
      this.selectString = columns;
      if (opts?.count) this.countMode = "exact";
      if (opts?.head) this.head = true;
    } else {
      this.returning = true;
      this.selectString = columns;
    }
    return this;
  }
  insert(values: Row | Row[], opts?: { count?: "exact"; defaultToNull?: boolean }): this {
    this.op = "insert";
    if (opts?.count) this.countMode = "exact";
    this.values = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean; count?: "exact" }): this {
    this.op = "upsert";
    this.values = Array.isArray(values) ? values : [values];
    this.onConflict = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : null;
    this.ignoreDuplicates = Boolean(opts?.ignoreDuplicates);
    return this;
  }
  update(values: Row, opts?: { count?: "exact" }): this {
    this.op = "update";
    this.values = [values];
    if (opts?.count) this.countMode = "exact";
    return this;
  }
  delete(opts?: { count?: "exact" }): this {
    this.op = "delete";
    if (opts?.count) this.countMode = "exact";
    return this;
  }

  // --- filters -------------------------------------------------------------
  private cmp(op: FilterOp, column: string, value: unknown, negate = false): this {
    this.filters.push({ kind: "cmp", op, column, value, negate });
    return this;
  }
  eq(column: string, value: unknown) { return this.cmp("eq", column, value); }
  neq(column: string, value: unknown) { return this.cmp("neq", column, value); }
  gt(column: string, value: unknown) { return this.cmp("gt", column, value); }
  gte(column: string, value: unknown) { return this.cmp("gte", column, value); }
  lt(column: string, value: unknown) { return this.cmp("lt", column, value); }
  lte(column: string, value: unknown) { return this.cmp("lte", column, value); }
  like(column: string, pattern: string) { return this.cmp("like", column, pattern); }
  ilike(column: string, pattern: string) { return this.cmp("ilike", column, pattern); }
  is(column: string, value: null | boolean) { return this.cmp("is", column, value); }
  // Postgres array "contains" (@>): .contains("tags", ["vip"]). tags is a JSON array here.
  contains(column: string, value: readonly unknown[] | string) {
    if (typeof value === "string") {
      const inner = /^\{([\s\S]*)\}$/.exec(value);
      return this.cmp("cs", column, inner ? (inner[1] === "" ? [] : inner[1].split(",").map((v) => v.trim())) : [value]);
    }
    return this.cmp("cs", column, [...value]);
  }
  in(column: string, values: readonly unknown[]) { return this.cmp("in", column, [...values]); }
  match(query: Record<string, unknown>) {
    for (const [k, v] of Object.entries(query)) this.cmp("eq", k, v);
    return this;
  }
  not(column: string, operator: string, value: unknown): this {
    const op = operator as FilterOp;
    if (op === "in" && typeof value === "string") {
      this.filters.push({ ...(parseLogicString(`${column}.in.${value}`, "and").items[0] as Filter), negate: true } as Filter);
      return this;
    }
    return this.cmp(op, column, value, true);
  }
  // The referencedTable option (filters on an embedded table) is not used in src/.
  or(filters: string): this {
    this.filters.push(parseLogicString(filters, "or"));
    return this;
  }
  filter(column: string, operator: string, value: unknown): this {
    const negate = operator.startsWith("not.");
    const op = (negate ? operator.slice(4) : operator) as FilterOp;
    if (typeof value === "string" && (op === "in" || op === "is")) {
      this.filters.push({ ...(parseLogicString(`${column}.${op}.${value}`, "and").items[0] as Filter), negate } as Filter);
      return this;
    }
    return this.cmp(op, column, value, negate);
  }

  // --- modifiers -----------------------------------------------------------
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string; referencedTable?: string }): this {
    if (opts?.foreignTable || opts?.referencedTable) return this; // not used in src/
    const ascending = opts?.ascending ?? true;
    this.orders.push({ column, ascending, nullsFirst: opts?.nullsFirst ?? defaultNullsFirst(ascending) });
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number): this {
    this.offsetN = from;
    this.limitN = Math.max(0, to - from + 1);
    return this;
  }
  single(): this {
    this.cardinality = "single";
    return this;
  }
  maybeSingle(): this {
    this.cardinality = "maybeSingle";
    return this;
  }
  returns<U>(): D1QueryBuilder<U> {
    return this as unknown as D1QueryBuilder<U>;
  }
  throwOnError(): this {
    this.shouldThrow = true;
    return this;
  }
  abortSignal(): this {
    return this; // D1 calls are short; nothing to cancel.
  }

  then<R1 = PostgrestLikeResult<T>, R2 = never>(
    onfulfilled?: ((value: PostgrestLikeResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    this.pending ??= this.run();
    return this.pending.then((res) => {
      if (this.shouldThrow && res.error) throw Object.assign(new Error(res.error.message), res.error);
      return res;
    }).then(onfulfilled, onrejected);
  }

  // --- execution -----------------------------------------------------------
  private async run(): Promise<PostgrestLikeResult<T>> {
    try {
      tableInfo(this.table);
      const db = await this.db();
      switch (this.op) {
        case "select": return await retryRead(() => this.runSelect(db));
        case "insert":
        case "upsert": return await this.runInsert(db);
        case "update": return await this.runUpdate(db);
        case "delete": return await this.runDelete(db);
      }
    } catch (err) {
      return fail<T>(err);
    }
  }

  private finish(rows: Row[], count: number | null, status: number): PostgrestLikeResult<T> {
    if (this.cardinality === "many") return { data: rows as T, error: null, count, status, statusText: "OK" };
    if (rows.length === 1) return { data: rows[0] as T, error: null, count, status, statusText: "OK" };
    if (rows.length === 0 && this.cardinality === "maybeSingle") return { data: null, error: null, count, status, statusText: "OK" };
    return {
      data: null,
      error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116", details: `The result contains ${rows.length} rows`, hint: null },
      count,
      status: 406,
      statusText: "Not Acceptable",
    };
  }

  private helperColumns(parsed: ParsedSelect): string[] {
    return parsed.embeds.map((e) => resolveRelation(this.table, e.table).localColumn);
  }

  private async runSelect(db: D1Like): Promise<PostgrestLikeResult<T>> {
    const parsed = parseSelect(this.table, this.selectString);
    const params: unknown[] = [];
    const where = compileWhere(this.table, this.filters, params, parsed);
    let count: number | null = null;
    if (this.countMode || this.head) {
      const res = await db.prepare(`SELECT count(*) AS n FROM "${this.table}"${where}`).bind(...params).all<{ n: number }>();
      count = Number(res.results[0]?.n ?? 0);
      if (this.head) return { data: null, error: null, count, status: 200, statusText: "OK" };
    }
    const helpers = this.helperColumns(parsed);
    let sql = `SELECT ${columnList(this.table, parsed, helpers)} FROM "${this.table}"${where}${compileOrder(this.table, this.orders)}`;
    if (this.limitN !== null || this.offsetN) sql += ` LIMIT ${this.limitN ?? -1} OFFSET ${this.offsetN}`;
    const { results } = await db.prepare(sql).bind(...params).all<Row>();
    const rows = await this.shape(db, results, parsed, helpers);
    return this.finish(rows, count, 200);
  }

  private async shape(db: D1Like, raw: Row[], parsed: ParsedSelect, helpers: string[]): Promise<Row[]> {
    return this.shapeRows(db, this.table, raw.map((r) => decodeRow(this.table, r)), parsed, helpers);
  }

  // Attaches the embeds (to any depth) to already-decoded rows of `table`,
  // then applies the select list's aliases. Used for the base rows and,
  // recursively, for the rows of each embedded table.
  private async shapeRows(db: D1Like, table: string, decoded: Row[], parsed: SelectShape, helpers: string[]): Promise<Row[]> {
    const embeds = parsed.embeds ?? [];
    for (const embed of embeds) await this.attach(db, table, decoded, embed);
    return decoded.map((r) => {
      const shaped = shapeRow(r, parsed, helpers);
      for (const k of Object.keys(shaped)) if (k.startsWith("__embed_")) delete shaped[k];
      for (const e of embeds) shaped[e.alias] = r[`__embed_${e.alias}`];
      return shaped;
    });
  }

  private async attach(db: D1Like, base: string, rows: Row[], embed: EmbedItem): Promise<void> {
    const rel = resolveRelation(base, embed.table);
    const key = `__embed_${embed.alias}`;
    const keys = [...new Set(rows.map((r) => r[rel.localColumn]).filter((v) => v !== null && v !== undefined))];
    const empty = rel.cardinality === "one" ? null : [];
    if (!keys.length) {
      for (const r of rows) r[key] = rel.cardinality === "one" ? null : [];
      return;
    }
    const nestedLocals = embed.embeds.map((e) => resolveRelation(embed.table, e.table).localColumn);
    const helpers = [rel.remoteColumn, ...nestedLocals];
    const cols = columnList(embed.table, embed, helpers);
    const { results } = await db
      .prepare(`SELECT ${cols} FROM "${embed.table}" WHERE "${rel.remoteColumn}" IN (SELECT value FROM json_each(?))`)
      .bind(JSON.stringify(keys))
      .all<Row>();
    const decoded = results.map((r) => decodeRow(embed.table, r));
    const outs = await this.shapeRows(db, embed.table, decoded, embed, helpers);
    for (const r of rows) {
      const k = r[rel.localColumn];
      const matches = outs.filter((_, i) => decoded[i][rel.remoteColumn] === k);
      r[key] = rel.cardinality === "one" ? matches[0] ?? empty : matches;
    }
  }

  private encodeRow(row: Row): { cols: string[]; vals: unknown[] } {
    const cols: string[] = [];
    const vals: unknown[] = [];
    for (const [k, v] of Object.entries(row)) {
      if (v === undefined) continue;
      const kind = assertColumn(this.table, k);
      cols.push(k);
      vals.push(encodeValue(kind, v));
    }
    return { cols, vals };
  }

  // SQLite's RETURNING shows the row before the table's AFTER triggers ran
  // (updated_at, blog_posts.review_status); Postgres' BEFORE triggers return the
  // finished row. So a write that returns rows reads them again by primary key.
  private async finalRows(db: D1Like, written: Row[]): Promise<Row[]> {
    const pk = tableInfo(this.table).pk;
    if (pk.length !== 1 || !written.length) return written;
    const ids = written.map((r) => r[pk[0]]).filter((v) => v !== null && v !== undefined);
    if (ids.length !== written.length) return written;
    const { results } = await db
      .prepare(`SELECT * FROM "${this.table}" WHERE "${pk[0]}" IN (SELECT value FROM json_each(?))`)
      .bind(JSON.stringify(ids))
      .all<Row>();
    const byId = new Map(results.map((r) => [r[pk[0]], r]));
    return written.map((r) => byId.get(r[pk[0]]) ?? r);
  }

  private async runInsert(db: D1Like): Promise<PostgrestLikeResult<T>> {
    if (!this.values.length) return this.finish([], this.countMode ? 0 : null, 201);
    const info = tableInfo(this.table);
    const conflict = this.onConflict ?? info.pk;
    const ret = this.returning ? " RETURNING *" : "";
    const stmts = this.values.map((row) => {
      const { cols, vals } = this.encodeRow(row);
      let sql = cols.length
        ? `INSERT INTO "${this.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
        : `INSERT INTO "${this.table}" DEFAULT VALUES`;
      if (this.op === "upsert") {
        for (const c of conflict) assertColumn(this.table, c);
        const updatable = cols.filter((c) => !conflict.includes(c));
        sql += ` ON CONFLICT (${conflict.map((c) => `"${c}"`).join(", ")}) ` +
          (this.ignoreDuplicates || !updatable.length ? "DO NOTHING" : `DO UPDATE SET ${updatable.map((c) => `"${c}" = excluded."${c}"`).join(", ")}`);
      }
      return db.prepare(sql + ret).bind(...vals);
    });
    // One row: a single statement is atomic on its own, so no batch
    // transaction is opened. Several rows: one batch = one transaction,
    // like a multi-row PostgREST insert.
    const results = stmts.length === 1 ? [await stmts[0].all<Row>()] : await db.batch<Row>(stmts);
    const rows = this.returning ? await this.finalRows(db, results.flatMap((r) => r.results || [])) : [];
    if (!this.returning) return { data: null, error: null, count: this.countMode ? this.values.length : null, status: 201, statusText: "Created" };
    const parsed = parseSelect(this.table, this.selectString);
    const shaped = await this.shape(db, rows, parsed, this.helperColumns(parsed));
    return this.finish(shaped, this.countMode ? shaped.length : null, 201);
  }

  private requireFilter(verb: string): void {
    if (!this.filters.length) throw new QueryError(`${verb} requires a WHERE clause`, "21000", null, "Add a filter (eq, in, …) before the call.");
  }

  private async runUpdate(db: D1Like): Promise<PostgrestLikeResult<T>> {
    this.requireFilter("UPDATE");
    const { cols, vals } = this.encodeRow(this.values[0] || {});
    if (!cols.length) return this.finish([], 0, 200);
    const params: unknown[] = [...vals];
    const where = compileWhere(this.table, this.filters, params);
    const set = cols.map((c) => `"${c}" = ?`).join(", ");
    const sql = `UPDATE "${this.table}" SET ${set}${where}`;
    if (this.returning || this.countMode) {
      const { results } = await db.prepare(`${sql} RETURNING *`).bind(...params).all<Row>();
      if (!this.returning) return { data: null, error: null, count: results.length, status: 204, statusText: "No Content" };
      const parsed = parseSelect(this.table, this.selectString);
      return this.finish(await this.shape(db, await this.finalRows(db, results), parsed, this.helperColumns(parsed)), this.countMode ? results.length : null, 200);
    }
    await db.prepare(sql).bind(...params).run();
    return { data: null, error: null, count: null, status: 204, statusText: "No Content" };
  }

  private async runDelete(db: D1Like): Promise<PostgrestLikeResult<T>> {
    this.requireFilter("DELETE");
    const params: unknown[] = [];
    const where = compileWhere(this.table, this.filters, params);
    const sql = `DELETE FROM "${this.table}"${where}`;
    if (this.returning || this.countMode) {
      const { results } = await db.prepare(`${sql} RETURNING *`).bind(...params).all<Row>();
      if (!this.returning) return { data: null, error: null, count: results.length, status: 204, statusText: "No Content" };
      const parsed = parseSelect(this.table, this.selectString);
      return this.finish(await this.shape(db, results, parsed, this.helperColumns(parsed)), this.countMode ? results.length : null, 200);
    }
    await db.prepare(sql).bind(...params).run();
    return { data: null, error: null, count: null, status: 204, statusText: "No Content" };
  }
}

// --- RPCs ------------------------------------------------------------------
// MMG Law's Postgres functions (bump_rate_limit, claim_content_topics,
// content_health_issues, bump_error_count, error_counts_recent, ...) are not
// moved yet. Each is a later part of OPS-353; until then rpc() answers
// PGRST202 (function not found), exactly what PostgREST says for a name it
// does not know, so a route that calls one fails loudly instead of silently.

type RpcImpl = (db: D1Like, args: Record<string, unknown>) => Promise<unknown>;

export const RPCS: Record<string, RpcImpl> = {};

class D1RpcCall<T = unknown> implements PromiseLike<PostgrestLikeResult<T>> {
  private pending: Promise<PostgrestLikeResult<T>> | null = null;
  constructor(private readonly name: string, private readonly args: Record<string, unknown>, private readonly db: () => Promise<D1Like>) {}
  private async run(): Promise<PostgrestLikeResult<T>> {
    const impl = RPCS[this.name];
    if (!impl) return fail<T>(new QueryError(`Could not find the function public.${this.name} in the schema cache`, "PGRST202"), 404);
    try {
      const db = await this.db();
      // Writes are never retried here.
      const data = await impl(db, this.args);
      return { data: data as T, error: null, count: null, status: 200, statusText: "OK" };
    } catch (err) {
      return fail<T>(err);
    }
  }
  then<R1 = PostgrestLikeResult<T>, R2 = never>(
    onfulfilled?: ((value: PostgrestLikeResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    this.pending ??= this.run();
    return this.pending.then(onfulfilled, onrejected);
  }
}

export interface D1DataClient {
  from<T = unknown>(table: string): D1QueryBuilder<T>;
  rpc<T = unknown>(name: string, args?: Record<string, unknown>): D1RpcCall<T>;
}

export function createD1DataClient(getDb: () => Promise<D1Like>): D1DataClient {
  return {
    from: <T>(table: string) => new D1QueryBuilder<T>(table, getDb),
    rpc: <T>(name: string, args: Record<string, unknown> = {}) => new D1RpcCall<T>(name, args, getDb),
  };
}
