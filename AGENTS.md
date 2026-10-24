<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MMG Law project rules

- The full build spec is in `CLAUDE.md` at the repo root.
- All firm contact info must come from `src/lib/constants.ts`. Never hardcode.
- Every public page must include the four disclaimers from `DISCLAIMERS` in proximity to relevant content (footer at minimum).
- Lead form: text-only, no file uploads, Cloudflare Turnstile only.
- City × practice pages require unique `local_angle_md` to publish.
- Use the four disclaimers verbatim. Do not paraphrase.
- Mark unverified content with `// TODO(human):` — never invent case results, testimonials, or credentials.
