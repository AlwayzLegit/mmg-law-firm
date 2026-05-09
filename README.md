# MMG Law Firm

Next.js rebuild of `mmg-lawfirm.com` — California personal-injury practice run by Mihran M. Ghazaryan (CA Bar #311455), based in Glendale. Single-domain, subfolder architecture optimized for statewide local SEO, with a custom admin for lead management.

The full build spec is in [`CLAUDE.md`](./CLAUDE.md). Read it before making changes — there are non-negotiable constraints (CRPC 7.1 compliance, no multi-domain network, no scaled city-page generation, no PHI on the public form).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript 5 (strict)
- Tailwind 4 + shadcn/ui (`base-nova` preset)
- Supabase (Postgres + Auth + Storage) via `@supabase/ssr`
- React Hook Form + Zod
- Resend for transactional email; Twilio stubbed for SMS
- Cloudflare Turnstile for spam protection
- pnpm 9 / Node 20 LTS

## Local development

1. `pnpm install`
2. `cp .env.local.example .env.local` and fill in real values:
   - Spin up a Supabase project (free tier is fine for dev) — copy URL, anon key, service role key
   - Sign up at [resend.com](https://resend.com) and create an API key
   - Sign up at Cloudflare and create a Turnstile widget for `localhost`
3. Run the SQL migrations in the Supabase SQL editor in order: `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_seed_geo.sql`
4. Generate types: `pnpm dlx supabase gen types typescript --project-id <id> > src/types/database.ts`
5. Insert your admin profile manually:
   ```sql
   insert into admin_profiles (user_id, role, full_name)
   values ('<uuid-from-auth.users>', 'owner', 'Mihran M. Ghazaryan');
   ```
6. `pnpm dev`

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier write |

## Deployment

- **Vercel Pro** required (Hobby ToS forbids commercial use).
- **Supabase Pro** for production: free tier pauses projects after 7 days of inactivity and has no point-in-time recovery — both unacceptable for a live legal site.

## Adding content

- **New city** — insert a row in `cities` (or use the admin UI) with `is_published=false`. Add `intro_md` and `local_stats_md`. Flip `is_published=true` when content is real.
- **New county** — same pattern in `counties`.
- **City x practice page** — insert a row in `location_pages` referencing the `city_id` and `practice_area_id`. **`local_angle_md` is required** before `is_published=true` — pages without genuinely local content stay unpublished.
- **Blog post** — `/admin/content/blog` — write markdown body, set `published_at` (future date allowed for scheduling), flip `is_published=true`.

## Bar compliance reminders

Every public-facing page must include:
- Firm name and Glendale address (in the footer)
- "Attorney Advertising" disclaimer (footer + landing pages)
- General-purposes disclaimer (footer)
- Past-results disclaimer (in proximity to any case results)
- Testimonial disclaimer (in proximity to any client quotes)
- Bar number for the responsible attorney (footer)

Do not paraphrase the disclaimers — use the strings in `src/lib/constants.ts` (`DISCLAIMERS`) verbatim.

## Schema markup

JSON-LD builders live in `src/lib/seo/schema.ts`. Validate emitted markup using [Google Rich Results Test](https://search.google.com/test/rich-results) before each release.
