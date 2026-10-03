/**
 * Scopes for the machine-to-machine admin API. A key carries a list of
 * scopes; `*` grants everything (the legacy env `ADMIN_API_KEY` behaves as a
 * `*` key). Scopes are checked per route via `authenticateApi(req, [...])`.
 */
export const SCOPES = [
  "*",
  "blog:read",
  "blog:write",
  "blog:publish",
  "images:read",
  "images:write",
  "leads:read",
  "agent:read",
  "agent:write",
  "agent:admin",
] as const;

export type Scope = (typeof SCOPES)[number];

export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  "*": "Everything (legacy shared key behaviour)",
  "blog:read": "List and read blog posts, taxonomy",
  "blog:write": "Create and edit blog posts (drafts)",
  "blog:publish": "Publish / unpublish blog posts",
  "images:read": "List media",
  "images:write": "Upload and delete media",
  "leads:read": "Search leads (name/phone/status only)",
  "agent:read": "Read the content-agent brief, topics, runs, history",
  "agent:write": "Start runs, claim topics, write reports, ask questions",
  "agent:admin": "Edit instructions, answer questions, force-publish",
};

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}

/** True when `granted` covers `required` (directly or via `*`). */
export function hasScope(
  granted: ReadonlySet<string> | readonly string[],
  required: Scope,
): boolean {
  const set = granted instanceof Set ? granted : new Set(granted);
  return set.has("*") || set.has(required);
}

/** Normalize a free-form list into valid, de-duplicated scopes. */
export function normalizeScopes(input: readonly string[]): Scope[] {
  const out = new Set<Scope>();
  for (const raw of input) {
    const v = raw.trim();
    if (isScope(v)) out.add(v);
  }
  return [...out];
}
