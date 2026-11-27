// Reads supabase/migrations/*.sql and returns the tables and columns the
// Postgres schema ends up with: { table: [column, ...] } (OPS-362).
// It understands exactly the DDL those files use: "create table [if not
// exists] [public.]t ( ... )", "alter table t add column [if not exists] c",
// and "drop table [if exists] t". The D1 twin test uses it to fail when a
// Postgres table or column has no D1 twin (the schema drifted).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const NOT_COLUMN = /^(constraint|primary|unique|check|foreign|exclude|like)$/i;

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// Top-level comma split that ignores commas inside parentheses and quotes.
function splitCommas(body) {
  const out = [];
  let depth = 0;
  let quote = false;
  let cur = "";
  for (const ch of body) {
    if (ch === "'") quote = !quote;
    if (!quote) {
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
  if (cur.trim()) out.push(cur);
  return out;
}

// The text between the parentheses that open at `from`.
function balanced(sql, from) {
  let depth = 0;
  let quote = false;
  for (let i = from; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") quote = !quote;
    if (quote) continue;
    if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return sql.slice(from + 1, i);
  }
  return sql.slice(from + 1);
}

export function loadPostgresSql(root) {
  const dir = join(root, "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"));
}

export function parsePostgresTables(files) {
  const tables = {};
  for (const file of files) {
    const sql = stripComments(file);
    const create = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi;
    let m;
    while ((m = create.exec(sql))) {
      const name = m[1];
      const body = balanced(sql, m.index + m[0].length - 1);
      const cols = [];
      for (const item of splitCommas(body)) {
        const first = /^\s*"?([a-z_][a-z0-9_]*)"?/i.exec(item);
        if (first && !NOT_COLUMN.test(first[1])) cols.push(first[1].toLowerCase());
      }
      tables[name] ??= new Set();
      for (const c of cols) tables[name].add(c);
    }
    const alter = /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\b([^;]*);/gi;
    while ((m = alter.exec(sql))) {
      const add = /\badd\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi;
      let a;
      while ((a = add.exec(m[2]))) {
        tables[m[1]] ??= new Set();
        tables[m[1]].add(a[1].toLowerCase());
      }
    }
    const drop = /\bdrop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
    while ((m = drop.exec(sql))) delete tables[m[1]];
  }
  return Object.fromEntries(Object.entries(tables).map(([t, set]) => [t, [...set]]));
}
