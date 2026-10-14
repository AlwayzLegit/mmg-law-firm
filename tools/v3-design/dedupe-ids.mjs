// Makes element ids unique inside a generated v3 page body.
//
// The design repeats one dialog template per state (e.g. six "medical
// expenses / lost income / …" detail dialogs), so the converter emitted the
// same `id` (and matching `aria-labelledby`) several times — invalid HTML, and
// screen readers announce the wrong dialog title. Each `aria-labelledby={"x"}`
// starts a new numbered instance; the first `id={"x"}` after it becomes
// `x-N` and further repeats inside the same instance become `x-N-K`.
// Ids that already occur once are left untouched.
//
//   node tools/v3-design/dedupe-ids.mjs [page.tsx …]   (default: all pages)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function dedupeIds(src) {
  const counts = {};
  for (const m of src.matchAll(/\bid=\{"([^"]+)"\}/g)) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  const dupes = new Set(Object.keys(counts).filter((k) => counts[k] > 1));
  if (dupes.size === 0) return src;
  const instance = {}; // id → current instance number
  const seenInInstance = {}; // id → ids emitted in the current instance
  return src.replace(/\b(aria-labelledby|aria-controls|id)=\{"([^"]+)"\}/g, (m, attr, id) => {
    if (!dupes.has(id)) return m;
    if (attr !== "id") {
      instance[id] = (instance[id] ?? 0) + 1;
      seenInInstance[id] = 0;
      return `${attr}={"${id}-${instance[id]}"}`;
    }
    if (!instance[id]) {
      // An id before any reference: give it its own instance number.
      instance[id] = 1;
      seenInInstance[id] = 0;
    }
    const k = seenInInstance[id]++;
    return `id={"${id}-${instance[id]}${k ? `-${k}` : ""}"}`;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = path.resolve("src/components/v3/pages");
  const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => path.join(dir, f));
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const out = dedupeIds(src);
    if (out !== src) {
      fs.writeFileSync(f, out);
      console.log("deduped ids in", path.basename(f));
    }
  }
}
