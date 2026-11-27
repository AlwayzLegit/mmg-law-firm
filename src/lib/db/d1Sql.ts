import { D1_SCHEMA, type ColumnKind, type TableInfo } from "./d1Schema.generated";

// Pure half of the D1 data layer: parses the PostgREST-style inputs the
// app already passes to supabase-js and turns them into parameterised
// SQLite. No database access here, so all of it is unit-tested against
// the real schema.
//
// Ported from The Look (AlwayzLegit/thelook, commit a6db2f6,
// src/lib/db/d1Sql.ts) by OPS-362. Changes for MMG Law, from an audit of
// what src/ calls (2026-11-27): nested embeds, "!inner" embeds, filters on
// embedded columns ("cities.counties.slug") and the "cs" (contains)
// operator that .contains("tags", [..]) uses on a JSON-array column.
//
// Scope: eq, neq, gt, gte, lt, lte, like, ilike, is, in, cs, not(col, op,
// value), or("…") with nested and(…), order (ascending / nullsFirst), range,
// limit, select lists with embedded relations to any depth
// ("*, practice_areas(name)", "cities!inner(slug, counties!inner(slug))",
// "category:blog_categories(slug, name)"), count exact / head.

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in" | "cs";
export type CmpFilter = { kind: "cmp"; op: FilterOp; column: string; value: unknown; negate?: boolean };
export type GroupFilter = { kind: "group"; join: "and" | "or"; items: Filter[]; negate?: boolean };
export type Filter = CmpFilter | GroupFilter;

export interface OrderBy { column: string; ascending: boolean; nullsFirst: boolean }

export interface SelectItem { kind: "column"; name: string; alias: string }
export interface EmbedItem { kind: "embed"; table: string; alias: string; columns: SelectItem[]; star: boolean; embeds: EmbedItem[]; inner: boolean }
export interface ParsedSelect { star: boolean; columns: SelectItem[]; embeds: EmbedItem[] }

// Anything with columns and embeds: a select list or one embedded relation.
export type SelectShape = { star: boolean; columns: SelectItem[]; embeds?: EmbedItem[] };

export class QueryError extends Error {
  constructor(message: string, public code: string, public details: string | null = null, public hint: string | null = null) {
    super(message);
    this.name = "QueryError";
  }
}

const IDENT = /^[a-z_][a-z0-9_]*$/;

export function tableInfo(table: string): TableInfo {
  const t = D1_SCHEMA[table];
  if (!t) throw new QueryError(`relation "public.${table}" does not exist`, "42P01");
  return t;
}

export function assertColumn(table: string, column: string): ColumnKind {
  const kind = tableInfo(table).columns[column];
  if (!kind) throw new QueryError(`Could not find the '${column}' column of '${table}' in the schema cache`, "PGRST204");
  return kind;
}

// Splits on commas that are not inside parentheses or double quotes.
export function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let cur = "";
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    if (!quoted) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        out.push(cur);
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim() || out.length) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

// --- select lists ------------------------------------------------------

export function parseSelect(table: string, select: string | undefined): ParsedSelect {
  const raw = (select ?? "*").replace(/\s+/g, " ").trim() || "*";
  const parsed: ParsedSelect = { star: false, columns: [], embeds: [] };
  for (const item of splitTopLevel(raw)) {
    const embed = /^(?:([a-z_][a-z0-9_]*)\s*:\s*)?([a-z_][a-z0-9_]*)(?:\s*!\s*([a-z_][a-z0-9_]*))?\s*\(([\s\S]*)\)$/.exec(item);
    if (embed) {
      const target = embed[2];
      const hint = embed[3];
      if (hint && hint !== "inner" && hint !== "left") {
        throw new QueryError(`embed hint !${hint} (${item}) is not supported by the D1 client`, "PGRST100");
      }
      tableInfo(target);
      const inner = parseSelect(target, embed[4]);
      parsed.embeds.push({
        kind: "embed", table: target, alias: embed[1] || target,
        columns: inner.columns, star: inner.star, embeds: inner.embeds, inner: hint === "inner",
      });
      continue;
    }
    if (item === "*") {
      parsed.star = true;
      continue;
    }
    const col = /^(?:([a-z_][a-z0-9_]*)\s*:\s*)?([a-z_][a-z0-9_]*)$/.exec(item);
    if (!col) throw new QueryError(`failed to parse select parameter (${item})`, "PGRST100");
    assertColumn(table, col[2]);
    parsed.columns.push({ kind: "column", name: col[2], alias: col[1] || col[2] });
  }
  return parsed;
}

// --- values ---------------------------------------------------------------

// JS value → what SQLite stores for this column.
export function encodeValue(kind: ColumnKind, value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (kind === "bool") {
    if (value === true || value === "true" || value === "t" || value === 1 || value === "1") return 1;
    if (value === false || value === "false" || value === "f" || value === 0 || value === "0") return 0;
    return value ? 1 : 0;
  }
  if (kind === "json") return typeof value === "string" ? jsonTextOrString(value) : JSON.stringify(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return value;
}

// A string handed to a JSON column: keep it if it already is JSON text
// (the export stored PostgREST output verbatim), else store it as a
// JSON string literal — what Postgres jsonb would hold.
function jsonTextOrString(s: string): string {
  try {
    JSON.parse(s);
    return s;
  } catch {
    return JSON.stringify(s);
  }
}

// SQLite value → what PostgREST would have returned.
export function decodeValue(kind: ColumnKind | undefined, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (kind === "bool") return value === 1 || value === "1" || value === true;
  if (kind === "json" && typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (typeof value === "bigint") return Number(value);
  return value;
}

export function decodeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const cols = tableInfo(table).columns;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = decodeValue(cols[k], v);
  return out;
}

// --- filters ----------------------------------------------------------------

const OPS: FilterOp[] = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "cs"];

function unquote(v: string): string {
  return v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\"/g, '"') : v;
}

function parseLiteral(op: FilterOp, raw: string): unknown {
  if (op === "is") {
    const v = raw.toLowerCase();
    if (v === "null") return null;
    if (v === "true") return true;
    if (v === "false") return false;
    throw new QueryError(`failed to parse filter (is.${raw})`, "PGRST100");
  }
  if (op === "in") {
    const m = /^\(([\s\S]*)\)$/.exec(raw);
    if (!m) throw new QueryError(`failed to parse filter (in.${raw})`, "PGRST100");
    return m[1] === "" ? [] : splitTopLevel(m[1]).map(unquote);
  }
  if (op === "cs") {
    const m = /^\{([\s\S]*)\}$/.exec(raw);
    if (!m) throw new QueryError(`failed to parse filter (cs.${raw})`, "PGRST100");
    return m[1] === "" ? [] : splitTopLevel(m[1]).map(unquote);
  }
  return unquote(raw);
}

// PostgREST logic-tree syntax: "a.eq.1,b.ilike.%x%,and(c.eq.2,d.not.is.null)".
export function parseLogicString(input: string, join: "and" | "or" = "or"): GroupFilter {
  const items: Filter[] = [];
  for (const part of splitTopLevel(input)) {
    const group = /^(not\.)?(and|or)\(([\s\S]*)\)$/.exec(part);
    if (group) {
      const inner = parseLogicString(group[3], group[2] as "and" | "or");
      items.push({ ...inner, negate: Boolean(group[1]) });
      continue;
    }
    const m = /^([a-z_][a-z0-9_]*)\.(not\.)?([a-z]+)\.([\s\S]*)$/.exec(part);
    if (!m || !OPS.includes(m[3] as FilterOp)) throw new QueryError(`failed to parse logic tree (${input})`, "PGRST100");
    const op = m[3] as FilterOp;
    items.push({ kind: "cmp", op, column: m[1], value: parseLiteral(op, m[4]), negate: Boolean(m[2]) });
  }
  return { kind: "group", join, items };
}

// LIKE pattern with PostgREST's "*" wildcard alias.
function likePattern(v: unknown): string {
  return String(v).replace(/\*/g, "%");
}

// Case-sensitive LIKE (Postgres) → SQLite GLOB.
export function likeToGlob(pattern: string): string {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\" && i + 1 < pattern.length) {
      const next = pattern[++i];
      out += next === "*" || next === "?" || next === "[" ? `[${next}]` : next;
    } else if (ch === "%") out += "*";
    else if (ch === "_") out += "?";
    else if (ch === "*" || ch === "?" || ch === "[") out += `[${ch}]`;
    else out += ch;
  }
  return out;
}

export function compileFilter(table: string, f: Filter, params: unknown[], shape?: SelectShape): string {
  if (f.kind === "group") {
    if (!f.items.length) return f.negate ? "0" : "1";
    const sql = "(" + f.items.map((i) => compileFilter(table, i, params, shape)).join(f.join === "and" ? " AND " : " OR ") + ")";
    return f.negate ? `NOT ${sql}` : sql;
  }
  if (f.column.includes(".")) return compileEmbeddedFilter(table, f, params, shape);
  const kind = assertColumn(table, f.column);
  const col = `"${f.column}"`;
  let sql: string;
  switch (f.op) {
    case "eq": sql = `${col} = ?`; params.push(encodeValue(kind, f.value)); break;
    case "neq": sql = `${col} <> ?`; params.push(encodeValue(kind, f.value)); break;
    case "gt": sql = `${col} > ?`; params.push(encodeValue(kind, f.value)); break;
    case "gte": sql = `${col} >= ?`; params.push(encodeValue(kind, f.value)); break;
    case "lt": sql = `${col} < ?`; params.push(encodeValue(kind, f.value)); break;
    case "lte": sql = `${col} <= ?`; params.push(encodeValue(kind, f.value)); break;
    // SQLite LIKE is case-insensitive for ASCII, like Postgres ILIKE.
    case "ilike": sql = `${col} LIKE ? ESCAPE '\\'`; params.push(likePattern(f.value)); break;
    case "like": sql = `${col} GLOB ?`; params.push(likeToGlob(likePattern(f.value))); break;
    case "is":
      if (f.value === null) sql = `${col} IS NULL`;
      else if (f.value === true || f.value === false) sql = `${col} IS ${f.value ? 1 : 0}`;
      else throw new QueryError(`invalid value for is: ${String(f.value)}`, "PGRST100");
      break;
    case "cs": {
      // Postgres array contains: every wanted value is in the JSON array.
      if (kind !== "json") throw new QueryError(`operator cs needs an array column, ${f.column} is not one`, "42883");
      const want = Array.isArray(f.value) ? f.value : [f.value];
      sql = `(${col} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM json_each(?) w WHERE w.value NOT IN (SELECT value FROM json_each(${col}))))`;
      params.push(JSON.stringify(want));
      break;
    }
    case "in": {
      const list = Array.isArray(f.value) ? f.value : [f.value];
      // json_each keeps one bound parameter however long the list (D1
      // caps a statement at 100 parameters).
      sql = `${col} IN (SELECT value FROM json_each(?))`;
      params.push(JSON.stringify(list.map((v) => encodeValue(kind, v))));
      break;
    }
  }
  if (!f.negate) return sql;
  if (f.op === "is") return sql.replace(" IS ", " IS NOT ");
  return `NOT (${sql})`;
}

// A filter on an embedded column, "cities.counties.slug": PostgREST applies
// it to the embedded rows, and with "!inner" that also drops base rows
// that have no matching embedded row. Here every hop must be "!inner" and
// the filter becomes a chain of "fk IN (SELECT pk FROM target WHERE …)"
// subqueries, which is the same set of base rows. The hops are to-one in
// every MMG query; two filters on one to-many hop are checked separately
// (a PostgREST join would check them on the same row).
function compileEmbeddedFilter(table: string, f: CmpFilter, params: unknown[], shape?: SelectShape): string {
  const segments = f.column.split(".");
  const leaf = segments.pop() as string;
  const hops: { from: string; to: string; rel: Relation }[] = [];
  let current = table;
  let embeds = shape?.embeds ?? [];
  for (const seg of segments) {
    const embed = embeds.find((e) => e.alias === seg || e.table === seg);
    if (!embed) {
      throw new QueryError(`filter on "${f.column}" needs "${seg}" in the select list`, "PGRST100", null, `Add ${seg}!inner(…) to select().`);
    }
    if (!embed.inner) {
      throw new QueryError(`filter on "${f.column}" needs ${seg}!inner in the D1 client`, "PGRST100", null, `Write ${seg}!inner(…) in select().`);
    }
    hops.push({ from: current, to: embed.table, rel: resolveRelation(current, embed.table) });
    current = embed.table;
    embeds = embed.embeds;
  }
  let sql = compileFilter(current, { ...f, column: leaf }, params);
  for (let i = hops.length - 1; i >= 0; i--) {
    const { to, rel } = hops[i];
    sql = `"${rel.localColumn}" IN (SELECT "${rel.remoteColumn}" FROM "${to}" WHERE ${sql})`;
  }
  return sql;
}

// "!inner" embeds with no filter still drop base rows that have no match.
function innerConditions(table: string, embeds: EmbedItem[]): string[] {
  const out: string[] = [];
  for (const e of embeds) {
    if (!e.inner) continue;
    const rel = resolveRelation(table, e.table);
    const nested = innerConditions(e.table, e.embeds);
    out.push(`"${rel.localColumn}" IN (SELECT "${rel.remoteColumn}" FROM "${e.table}"${nested.length ? " WHERE " + nested.join(" AND ") : ""})`);
  }
  return out;
}

export function compileWhere(table: string, filters: Filter[], params: unknown[], shape?: SelectShape): string {
  const parts = filters.map((f) => compileFilter(table, f, params, shape));
  if (shape?.embeds) parts.push(...innerConditions(table, shape.embeds));
  if (!parts.length) return "";
  return " WHERE " + parts.join(" AND ");
}

// Postgres orders NULLs last ascending and first descending; SQLite does
// the opposite unless told, so the clause is always explicit.
export function compileOrder(table: string, orders: OrderBy[]): string {
  if (!orders.length) return "";
  return " ORDER BY " + orders.map((o) => {
    assertColumn(table, o.column);
    return `"${o.column}" ${o.ascending ? "ASC" : "DESC"} NULLS ${o.nullsFirst ? "FIRST" : "LAST"}`;
  }).join(", ");
}

export function defaultNullsFirst(ascending: boolean): boolean {
  return !ascending;
}

// --- embedding ------------------------------------------------------------

export type Relation =
  | { cardinality: "one"; localColumn: string; remoteColumn: string } // base.fk → target.pk
  | { cardinality: "many"; localColumn: string; remoteColumn: string }; // target.fk → base.pk

export function resolveRelation(base: string, target: string): Relation {
  const b = tableInfo(base);
  const t = tableInfo(target);
  const out = b.fks.filter((fk) => fk.table === target);
  if (out.length) {
    // More than one FK to the same table: prefer <target-singular>_id.
    const singular = target.replace(/ies$/, "y").replace(/s$/, "");
    const fk = out.length === 1 ? out[0] : out.find((f) => f.column === `${singular}_id`) || out[0];
    return { cardinality: "one", localColumn: fk.column, remoteColumn: fk.refColumn };
  }
  const back = t.fks.filter((fk) => fk.table === base);
  if (back.length) return { cardinality: "many", localColumn: back[0].refColumn, remoteColumn: back[0].column };
  throw new QueryError(`Could not find a relationship between '${base}' and '${target}' in the schema cache`, "PGRST200");
}

export function columnList(table: string, parsed: SelectShape, extra: string[] = []): string {
  if (parsed.star) return "*";
  const names = new Set([...parsed.columns.map((c) => c.name), ...extra]);
  if (!names.size) return "*";
  for (const n of names) if (!IDENT.test(n)) throw new QueryError(`bad column ${n}`, "PGRST100");
  return [...names].map((n) => `"${n}"`).join(", ");
}

// Applies column aliases and drops helper columns added for embedding.
export function shapeRow(row: Record<string, unknown>, parsed: SelectShape, helperColumns: string[]): Record<string, unknown> {
  if (parsed.star) {
    const out = { ...row };
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const c of parsed.columns) out[c.alias] = row[c.name];
  for (const h of helperColumns) if (!(h in out) && !parsed.columns.some((c) => c.name === h)) delete out[h];
  return out;
}

// SQLite constraint text → Postgres wording, because a few routes match
// on the message (e.g. `error.message.includes("unique")` for a
// duplicate email → 409). The SQLite text stays in the message too.
export function postgresMessage(code: string, message: string): string {
  switch (code) {
    case "23505": return `duplicate key value violates unique constraint (${message})`;
    case "23503": return `insert or update violates foreign key constraint (${message})`;
    case "23502": return `null value violates not-null constraint (${message})`;
    case "23514": return `new row violates check constraint (${message})`;
    default: return message;
  }
}

// SQLite error text → the Postgres SQLSTATE the app checks.
export function sqliteErrorCode(message: string): string {
  if (/UNIQUE constraint failed|PRIMARY KEY/i.test(message)) return "23505";
  if (/FOREIGN KEY constraint failed/i.test(message)) return "23503";
  if (/NOT NULL constraint failed/i.test(message)) return "23502";
  if (/CHECK constraint failed/i.test(message)) return "23514";
  if (/no such column/i.test(message)) return "42703";
  if (/no such table/i.test(message)) return "42P01";
  return "XX000";
}
