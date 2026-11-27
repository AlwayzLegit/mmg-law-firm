// Pure helpers for scripts/cloudflare/export-supabase-to-d1.mjs
// (Cloudflare migration, task 2). Kept separate so tests can import
// them without network access.

// Parses migrations/d1/0001_schema.sql (and friends) into
// [{ table, columns: [{ name, kind }] }] in file order, which is also
// foreign-key order. kind: "bool" | "json" | "plain".
export function parseSchema(sql) {
  const tables = [];
  const re = /CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(([\s\S]*?)\n\);/g;
  let m;
  while ((m = re.exec(sql))) {
    const table = m[1];
    const body = m[2];
    const columns = [];
    for (const raw of body.split("\n")) {
      const line = raw.replace(/--.*$/, "").trim();
      if (!line) continue;
      const cm = /^([a-z_][a-z0-9_]*)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)\b/i.exec(line);
      if (!cm) continue; // constraint lines (PRIMARY KEY (...), UNIQUE, CHECK, CONSTRAINT, FOREIGN KEY)
      const name = cm[1];
      if (/^(constraint|primary|unique|check|foreign)$/i.test(name)) continue;
      let kind = "plain";
      if (new RegExp(`CHECK\\s*\\(\\s*${name}\\s+IN\\s*\\(\\s*0\\s*,\\s*1\\s*\\)\\s*\\)`, "i").test(line)) kind = "bool";
      else if (new RegExp(`json_valid\\(\\s*${name}\\s*\\)`, "i").test(line)) kind = "json";
      columns.push({ name, kind });
    }
    tables.push({ table, columns });
  }
  return tables;
}

const TS_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/;

// One Supabase (PostgREST JSON) value → the D1 representation.
export function convertValue(value, kind) {
  if (value === null || value === undefined) return null;
  if (kind === "bool") {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === "true" || value === "t") return 1;
    if (value === "false" || value === "f") return 0;
    return value ? 1 : 0;
  }
  if (kind === "json") return typeof value === "string" ? value : JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || (typeof value === "object")) return JSON.stringify(value);
  if (typeof value === "string" && TS_RE.test(value)) {
    const d = new Date(value.replace(" ", "T"));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return value;
}

// SQLite literal for an already-converted value.
export function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return v.toString();
  return "'" + String(v).replace(/'/g, "''") + "'";
}

export function insertStatement(table, columns, row) {
  const names = columns.map((c) => c.name);
  const vals = columns.map((c) => sqlLiteral(convertValue(row[c.name], c.kind)));
  return `INSERT INTO ${table} (${names.join(", ")}) VALUES (${vals.join(", ")});`;
}

// Columns present in Supabase rows that the D1 schema does not have
// (would be silently dropped) — reported, never guessed.
export function unknownColumns(columns, row) {
  const known = new Set(columns.map((c) => c.name));
  return Object.keys(row).filter((k) => !known.has(k));
}
