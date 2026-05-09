# MMG Law Firm — Build Handoff

> **You are Claude Code.** This document is the single source of truth for the build. The full original handoff lives at the bottom of this file in the **Original Spec** section. The top of the file captures decisions and deviations made during the build.

@AGENTS.md

---

## Critical platform notes (read every session)

### Next.js 16 (this scaffold uses 16.2.6, not 15)

The scaffold landed on Next.js 16, which the spec did not anticipate. Important breaking changes from Next.js 15 that this codebase honors:

- **Async Request APIs**. `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are all `Promise`s now — must be `await`ed. Use the generated `PageProps<'/route'>` / `LayoutProps<'/route'>` helpers.
- **`middleware.ts` → `proxy.ts`**. The file is renamed. The `proxy` runtime is `nodejs` only (no `edge`). Where the spec says "middleware", we use `src/proxy.ts`. Supabase SSR session refresh works fine on Node.
- **`generateSitemaps` / image-metadata `id` is a Promise**. Await it inside the generator function.
- **`next lint` is gone**. `package.json` runs `eslint` directly.
- **`revalidateTag(tag, cacheLife)` requires two args**. Use `'max'` for our infrequent content edits, or `updateTag` from a server action when read-your-writes is needed.
- **Turbopack is the default** for `dev` and `build`. Don't add `--turbopack`.
- **`images.qualities` default is `[75]`**. If we ever pass a non-75 `quality`, configure it in `next.config.ts`.

### Stack snapshot

| Layer | Version |
|---|---|
| Next.js | 16.2.6 (App Router, Turbopack) |
| React | 19.2.4 |
| TypeScript | 5.9 (strict) |
| Tailwind | 4.3 (`@theme` syntax in `globals.css`) |
| shadcn/ui | base-nova preset, native HTML primitives (not Radix) |
| Supabase | `@supabase/supabase-js` 2.105, `@supabase/ssr` 0.10 |
| Forms | react-hook-form 7.75 + Zod 4.4 |
| Email | Resend 6 |
| Icons | lucide-react |
| Fonts | Inter (body) + Fraunces (display), via `next/font` |
| Package manager | pnpm 9.15 |

### shadcn note

The CLI installed the `base-nova` style. Components like `Label` are native `<label>` elements (no `@radix-ui/react-label`). `form.tsx` was hand-written (the registry's `form` didn't ship with the preset) using react-hook-form + the native `Label`.

### Working-directory note

The repo root is `C:\Users\jetni\Desktop\MMG Law` (the directory name has a space, which means we cannot rename the npm package after `mmg-lawfirm`). The `package.json` `name` stays `mmg-lawfirm`.

---

## Build cadence

Build in groups (see §8 of the original spec). Commit after each group. If a decision affects more than one group, stop and ask the human before proceeding.

- **Group A**: foundation — root layout, marketing layout, header, footer, error/not-found, legal pages **← in progress**
- **Group B**: homepage
- **Group C**: attorney bio + practice areas
- **Group D**: locations (counties, cities, city × practice)
- **Group E**: trust pages, blog, contact, admin

Build well. Take the time.

---

## Original spec (authoritative — read all of it)

### 0. Project context

**Client**: MMG Law Firm — solo personal-injury practice run by attorney Mihran M. Ghazaryan (CA Bar #311455), based in Glendale, CA. Existing site: `mmg-lawfirm.com`.

**Goal**: Rebuild as a modern Next.js site optimized for California-statewide local SEO (county + city + practice-area pages) with a custom admin for lead management. Strategic decision is locked: **single domain, subfolder architecture, no multi-domain network.**

**Non-negotiable constraints**:
1. Single domain: `mmg-lawfirm.com`. No subdomains for content. No 58-domain network.
2. Every public-facing page must be California State Bar compliant (CRPC 7.1–7.5): firm name + Glendale address in footer, "Attorney Advertising" disclaimer, no guarantee language, testimonial/case-result disclaimers in proximity.
3. No fake addresses, no virtual office GBP listings.
4. No find-and-replace city pages. Each city × practice page requires unique `local_angle_md` to publish.
5. Lead form does not accept medical records or PHI. Plain text accident description only.

**Design direction**: Fresh, modern, professional. shadcn/ui + Tailwind. Trustworthy + premium — a law firm a bilingual Armenian-American business owner in Glendale would hire.

### 4. Firm constants

All firm references must use `src/lib/constants.ts`. Never hardcode.

### 5. Database schema

Migrations live in `supabase/migrations/`. RLS enabled on every table. Public-read for published rows; admin-only otherwise. Public lead inserts go through the API route using the service-role key.

Tables: `counties`, `cities`, `practice_areas`, `location_pages`, `blog_posts`, `testimonials`, `case_results`, `leads`, `lead_notes`, `audit_log`, `admin_profiles`. (Full DDL in §5 of the original handoff prompt — replicate it into `0001_init.sql` exactly.)

### 6. Routing & rendering rules

- `generateStaticParams` only returns rows with `is_published = true`
- `dynamicParams = true`, `revalidate = 86400`
- Unpublished rows → `notFound()`, never auto-generated filler
- Every page implements `generateMetadata` with canonical URL

### 7. SEO requirements per page type

Every page: self-canonical, OG/Twitter, breadcrumb JSON-LD, page-appropriate schema, footer w/ firm info + 4 disclaimers, "Attorney Advertising" label on landing pages.

Schema builders live in `lib/seo/schema.ts`. Sitemap in `app/sitemap.ts`. Robots in `app/robots.ts`.

### 9. Lead form

- Lives on `/contact/`; compact embed on hero, every city page, every practice page.
- TCPA consent checkbox unchecked by default with the verbatim text from §9.1.
- Cloudflare Turnstile required server-side.
- Validation in `lib/validation/lead.ts` (Zod). Phone normalized to E.164 US.
- POST `/api/leads/route.ts`: parse → validate → verify Turnstile → capture metadata → insert via service-role client → email notify → SMS stub → audit log → 200.
- Rate limit by IP: 5/hour. Spam heuristics route to `status='spam'` without notify.
- **NO file uploads.** Plain text description only.

### 10. Admin

- `/admin/*` gated by `requireAdmin()` (server-side) + Supabase magic-link auth.
- Initial setup: insert into `admin_profiles` manually after first deploy.
- Dashboard, leads (list + detail + kanban), content (counties, cities, location_pages, practice_areas, blog, testimonials, case_results), simple analytics from Postgres, settings.

### 11. Design system

Tokens in `src/app/globals.css`. Brand = navy `#2b46d8` primary, gold `#c9a35a` accent (hover/dividers only). Inter for body, Fraunces for display. Generous whitespace; max content width 1200px landings, 720px long-form. No carousels.

### 12. Performance & accessibility

- Lighthouse mobile ≥ 90 perf / ≥ 95 a11y / ≥ 95 best-practices / 100 SEO
- All images via `next/image` with width/height/alt
- Self-host fonts via `next/font`
- Skip-to-content link, ARIA labels, keyboard accessible, AA contrast minimum

### 13. Security

- Service-role Supabase client only in API routes / server actions, never imported by client components
- Rate limit `/api/leads`
- Validate Turnstile server-side on every lead submission
- No PII in logs

### 16. Definition of done (per group)

- [ ] All routes render without errors
- [ ] All pages have correct title, meta description, canonical, OG image
- [ ] All pages have appropriate JSON-LD validated by Google Rich Results Test
- [ ] Lighthouse mobile scores meet targets
- [ ] No console errors; `pnpm tsc --noEmit` clean; `pnpm lint` clean
- [ ] Forms keyboard-navigable and screen-reader friendly
- [ ] All firm references use `FIRM` constants
- [ ] All disclaimers present per CRPC 7.1
- [ ] Mobile layout correct at 375px and 768px

### 17. Hard rules

1. No find-and-replace city pages. Each requires `local_angle_md` to publish.
2. No second domain, subdomain, or multi-tenant logic.
3. No file uploads on the public lead form.
4. No hardcoded firm contact info outside `lib/constants.ts`.
5. No Google reCAPTCHA. Cloudflare Turnstile only.
6. No invented case results, testimonials, or attorney credentials. Use `// TODO(human):` and an empty state.
7. No AI-generated content on public pages without `// TODO(human): attorney review required`.
8. No Vercel Hobby in production.
9. No GBP API integrations.
10. No ecommerce, payments, or client portal.

### 18. Open questions (don't block; leave TODOs)

- Confirm attorney languages (assumed English/Armenian/Russian)
- Confirm year firm was founded
- Real headshot of attorney
- Bar admission date and law school
- Avvo/Justia/LinkedIn URLs for `sameAs`
- Existing blog content for migration
- Existing case results to seed `case_results`
- Spanish intake support?
- 10DLC brand registration plan (impacts SMS go-live)
- Privacy / disclaimer copy needs attorney review before publish
