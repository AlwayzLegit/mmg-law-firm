<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version is **Next.js 16**. APIs and conventions differ from older versions:

- `cookies()`, `headers()`, `params`, `searchParams` are **Promises** — `await` them.
- `middleware.ts` is renamed to `proxy.ts` (Node runtime only).
- `next lint` is removed; run `eslint` directly.
- `revalidateTag(tag, cacheLife)` requires the second argument.
- Turbopack is default for `dev` and `build`.
- `next/image` `images.qualities` defaults to `[75]`.

Read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` if uncertain.
<!-- END:nextjs-agent-rules -->

# MMG Law project rules

- The full build spec is in `CLAUDE.md` at the repo root.
- All firm contact info must come from `src/lib/constants.ts`. Never hardcode.
- Every public page must include the four disclaimers from `DISCLAIMERS` in proximity to relevant content (footer at minimum).
- Lead form: text-only, no file uploads, Cloudflare Turnstile only.
- City × practice pages require unique `local_angle_md` to publish.
- Use the four disclaimers verbatim. Do not paraphrase.
- Mark unverified content with `// TODO(human):` — never invent case results, testimonials, or credentials.
