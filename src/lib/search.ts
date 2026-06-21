/**
 * Search-term sanitizers shared across the admin list/search surfaces.
 *
 * Postgres/PostgREST `.or()` filters and `ilike` patterns treat `%`, `_`,
 * `,`, `(`, and `)` as metacharacters. Stripping them keeps user input from
 * breaking the filter grammar (or smuggling extra conditions into an `.or()`).
 */

/** Strip PostgREST `.or()` / `ilike` metacharacters from a free-text term. */
export function sanitizeSearchTerm(q: string): string {
  return q
    .replace(/[%_,()]/g, " ")
    .trim()
    .slice(0, 80);
}

/** Constrain a slug/source param to a safe charset for `.eq()` filters. */
export function slugish(v: string | undefined): string {
  return (v ?? "")
    .replace(/[^a-zA-Z0-9 _.\-]/g, "")
    .trim()
    .slice(0, 80);
}
