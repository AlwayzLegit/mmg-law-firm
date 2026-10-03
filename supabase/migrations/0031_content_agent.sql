-- 0031_content_agent.sql — Content-agent Admin API foundation.
--
-- Adds everything the external daily blog-writing agent needs to work
-- against this system through /api/admin/*:
--
--   * api_keys           — hashed bearer tokens with scopes (replaces the
--                          single shared ADMIN_API_KEY over time)
--   * agent_instructions — versioned, owner-edited editorial instructions
--   * content_topics     — the prioritized keyword/topic queue
--   * agent_runs         — one row per agent run, with the written-back report
--   * agent_questions    — questions the agent asks; owner answers feed the
--                          next run's brief
--   * api_idempotency    — Idempotency-Key storage for POST routes
--   * blog_posts         — keyword/review columns the agent reads and writes
--
-- Plus: an atomic topic-claim RPC, and a service-role-callable variant of
-- content_health_issues() so the API can report blog SEO issues.
--
-- All tables: RLS on. Admins (is_admin()) manage rows from the admin UI;
-- the API uses the service role, which bypasses RLS.

-- -------------------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------------------
create or replace function is_owner() returns boolean as $$
  select exists (
    select 1 from admin_profiles where user_id = auth.uid() and role = 'owner'
  );
$$ language sql stable security definer set search_path = public;
grant execute on function is_owner() to anon, authenticated;

-- -------------------------------------------------------------------------
-- api_keys — token format: mmg_<prefix8>_<secret>. Only the sha256 of the
-- full token is stored; the prefix is a display/lookup handle.
-- -------------------------------------------------------------------------
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prefix text not null unique,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  rate_limit_per_hour int not null default 600 check (rate_limit_per_hour between 1 and 100000),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);
alter table api_keys enable row level security;
drop policy if exists api_keys_owner_all on api_keys;
create policy api_keys_owner_all on api_keys
  for all using (is_owner()) with check (is_owner());

-- -------------------------------------------------------------------------
-- agent_instructions — insert-only history; the active version is max(version).
-- -------------------------------------------------------------------------
create sequence if not exists agent_instructions_version_seq;
create table if not exists agent_instructions (
  id uuid primary key default gen_random_uuid(),
  version int not null unique default nextval('agent_instructions_version_seq'),
  body_md text not null,
  settings jsonb not null default '{}'::jsonb,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table agent_instructions enable row level security;
drop policy if exists agent_instructions_admin_all on agent_instructions;
create policy agent_instructions_admin_all on agent_instructions
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------------
-- agent_runs
-- -------------------------------------------------------------------------
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  api_key_id uuid references api_keys(id) on delete set null,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'needs_human')),
  started_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  finished_at timestamptz,
  instructions_version int,
  summary_md text,
  report jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  log jsonb not null default '[]'::jsonb,
  posts_created uuid[] not null default '{}',
  topics_claimed uuid[] not null default '{}',
  topics_consumed uuid[] not null default '{}',
  error text,
  meta jsonb
);
create index if not exists agent_runs_started_idx on agent_runs (started_at desc);
create index if not exists agent_runs_running_idx on agent_runs (heartbeat_at)
  where status = 'running';
alter table agent_runs enable row level security;
drop policy if exists agent_runs_admin_all on agent_runs;
create policy agent_runs_admin_all on agent_runs
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------------
-- content_topics — the queue. `target_url` is the money page a supporting
-- post must link to (and never compete with).
-- -------------------------------------------------------------------------
create table if not exists content_topics (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  intent text not null default 'informational'
    check (intent in ('informational', 'supporting_post', 'local', 'faq', 'news', 'comparison')),
  practice_area_id uuid references practice_areas(id) on delete set null,
  county_id uuid references counties(id) on delete set null,
  city_id uuid references cities(id) on delete set null,
  target_url text,
  title_hint text,
  priority int not null default 50,
  status text not null default 'queued'
    check (status in ('queued', 'claimed', 'drafted', 'published', 'skipped', 'rejected')),
  source text not null default 'manual',
  volume int,
  kd int,
  cpc numeric(8, 2),
  notes text,
  claimed_by_run_id uuid references agent_runs(id) on delete set null,
  claimed_at timestamptz,
  post_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists content_topics_keyword_uidx on content_topics (lower(keyword));
create index if not exists content_topics_queue_idx on content_topics (status, priority, created_at);
drop trigger if exists trg_content_topics_set_updated_at on content_topics;
create trigger trg_content_topics_set_updated_at
  before update on content_topics
  for each row execute function set_updated_at();
alter table content_topics enable row level security;
drop policy if exists content_topics_admin_all on content_topics;
create policy content_topics_admin_all on content_topics
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------------
-- agent_questions — asked by a run; answered by the owner; delivered to the
-- next run that starts (delivered_run_id).
-- -------------------------------------------------------------------------
create table if not exists agent_questions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  topic_id uuid references content_topics(id) on delete set null,
  post_id uuid,
  kind text not null default 'other'
    check (kind in ('decision', 'fact_check', 'approval', 'blocker', 'other')),
  question text not null,
  context text,
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed')),
  answer text,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  delivered_run_id uuid references agent_runs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists agent_questions_open_idx on agent_questions (created_at)
  where status = 'open';
create index if not exists agent_questions_undelivered_idx on agent_questions (answered_at)
  where status = 'answered' and delivered_run_id is null;
alter table agent_questions enable row level security;
drop policy if exists agent_questions_admin_all on agent_questions;
create policy agent_questions_admin_all on agent_questions
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------------
-- api_idempotency — service-role only (same posture as rate_limits).
-- -------------------------------------------------------------------------
create table if not exists api_idempotency (
  principal text not null,
  idem_key text not null,
  request_hash text not null,
  state text not null default 'in_progress' check (state in ('in_progress', 'done')),
  response_status int,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  primary key (principal, idem_key)
);
create index if not exists api_idempotency_expires_idx on api_idempotency (expires_at);
alter table api_idempotency enable row level security;
drop policy if exists api_idempotency_deny_all on api_idempotency;
create policy api_idempotency_deny_all on api_idempotency
  for all using (false) with check (false);

-- -------------------------------------------------------------------------
-- blog_posts — keyword + review workflow columns
-- -------------------------------------------------------------------------
alter table blog_posts
  add column if not exists primary_keyword text,
  add column if not exists secondary_keywords text[] not null default '{}',
  add column if not exists hero_image_alt text,
  add column if not exists review_status text not null default 'draft',
  add column if not exists topic_id uuid references content_topics(id) on delete set null,
  add column if not exists created_via text not null default 'admin';

alter table blog_posts drop constraint if exists blog_posts_review_status_check;
alter table blog_posts add constraint blog_posts_review_status_check
  check (review_status in ('draft', 'needs_review', 'approved', 'published', 'rejected'));
alter table blog_posts drop constraint if exists blog_posts_created_via_check;
alter table blog_posts add constraint blog_posts_created_via_check
  check (created_via in ('admin', 'admin_api', 'agent', 'seed'));

-- Word count as a stored generated column (all referenced functions are
-- IMMUTABLE, which Postgres requires here).
alter table blog_posts
  add column if not exists word_count int generated always as (
    coalesce(array_length(regexp_split_to_array(btrim(body_md), '\s+'), 1), 0)
  ) stored;

update blog_posts set review_status = 'published' where is_published and review_status <> 'published';

create index if not exists blog_posts_needs_review_idx on blog_posts (created_at)
  where review_status = 'needs_review';

alter table content_topics drop constraint if exists content_topics_post_fk;
alter table content_topics add constraint content_topics_post_fk
  foreign key (post_id) references blog_posts(id) on delete set null;
alter table agent_questions drop constraint if exists agent_questions_post_fk;
alter table agent_questions add constraint agent_questions_post_fk
  foreign key (post_id) references blog_posts(id) on delete set null;

-- Keep review_status in step with is_published whichever path flips it
-- (admin UI toggle, bulk actions, or the API).
create or replace function blog_posts_sync_review_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_published and not coalesce(old.is_published, false) then
    new.review_status := 'published';
  elsif not new.is_published and coalesce(old.is_published, false)
        and new.review_status = 'published' then
    new.review_status := 'approved';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_blog_posts_sync_review on blog_posts;
create trigger trg_blog_posts_sync_review
  before update on blog_posts
  for each row execute function blog_posts_sync_review_status();

-- -------------------------------------------------------------------------
-- Atomic topic claim. `for update skip locked` so two agents (e.g. a Cowork
-- routine and an n8n flow) starting at once never claim the same topic.
-- Service-role only.
-- -------------------------------------------------------------------------
create or replace function claim_content_topics(
  p_run_id uuid,
  p_limit int,
  p_topic_ids uuid[] default null
)
returns setof content_topics
language sql
security definer
set search_path = public, pg_temp
as $$
  update content_topics t
     set status = 'claimed',
         claimed_by_run_id = p_run_id,
         claimed_at = now()
   where t.id in (
     select id
       from content_topics
      where status = 'queued'
        and (p_topic_ids is null or id = any (p_topic_ids))
      order by priority asc, created_at asc
      limit greatest(coalesce(p_limit, 0), 0)
      for update skip locked
   )
  returning t.*;
$$;
revoke execute on function claim_content_topics(uuid, int, uuid[]) from public, anon, authenticated;
grant execute on function claim_content_topics(uuid, int, uuid[]) to service_role;

-- -------------------------------------------------------------------------
-- Content health: move the checks into an unguarded, service-role-only
-- function; keep content_health_issues() as the is_admin()-guarded wrapper
-- the admin SEO page already calls.
-- -------------------------------------------------------------------------
create or replace function content_health_issues_unguarded()
returns table (
  entity text,
  entity_id uuid,
  label text,
  issue text,
  severity text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- ---- location pages (published) ----
  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Missing meta description', 'high'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published
    and (lp.meta_description is null or length(lp.meta_description) = 0);

  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Meta too long (' || length(lp.meta_description) || ' chars)', 'medium'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published and length(lp.meta_description) > 160;

  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Thin local angle (' || coalesce(length(lp.local_angle_md), 0) || ' chars)', 'medium'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published and coalesce(length(lp.local_angle_md), 0) < 200;

  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Overdue for review', 'low'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where lp.is_published
    and (
      lp.last_reviewed_at < now() - interval '365 days'
      or (lp.last_reviewed_at is null and lp.created_at < now() - interval '365 days')
    );

  return query
  select 'location_page', lp.id,
         coalesce(c.name, '?') || ' · ' || coalesce(pa.name, '?'),
         'Draft — needs local angle to publish', 'low'
  from location_pages lp
  left join cities c on c.id = lp.city_id
  left join practice_areas pa on pa.id = lp.practice_area_id
  where not lp.is_published and lp.local_angle_md is null;

  -- ---- counties ----
  return query
  select 'county', c.id, c.name, 'Missing meta description', 'high'
  from counties c
  where c.is_published
    and (c.meta_description is null or length(c.meta_description) = 0);

  return query
  select 'county', c.id, c.name,
         'Meta too long (' || length(c.meta_description) || ' chars)', 'medium'
  from counties c
  where c.is_published and length(c.meta_description) > 160;

  return query
  select 'county', c.id, c.name,
         'Thin intro (' || coalesce(length(c.intro_md), 0) || ' chars)', 'low'
  from counties c
  where c.is_published and coalesce(length(c.intro_md), 0) < 200;

  -- ---- practice areas ----
  return query
  select 'practice_area', pa.id, pa.name, 'Missing meta description', 'high'
  from practice_areas pa
  where pa.is_published
    and (pa.meta_description is null or length(pa.meta_description) = 0);

  return query
  select 'practice_area', pa.id, pa.name,
         'Meta too long (' || length(pa.meta_description) || ' chars)', 'medium'
  from practice_areas pa
  where pa.is_published and length(pa.meta_description) > 160;

  -- ---- blog posts ----
  return query
  select 'blog', b.id, b.title, 'Missing meta description', 'high'
  from blog_posts b
  where b.is_published
    and (b.meta_description is null or length(b.meta_description) = 0);

  return query
  select 'blog', b.id, b.title,
         'Meta too long (' || length(b.meta_description) || ' chars)', 'medium'
  from blog_posts b
  where b.is_published and length(b.meta_description) > 160;

  return query
  select 'blog', b.id, b.title,
         'Thin body (' || coalesce(length(b.body_md), 0) || ' chars)', 'low'
  from blog_posts b
  where b.is_published and coalesce(length(b.body_md), 0) < 500;

  return query
  select 'blog', b.id, b.title, 'Missing primary keyword', 'low'
  from blog_posts b
  where b.is_published
    and (b.primary_keyword is null or length(b.primary_keyword) = 0);
end;
$$;
revoke execute on function content_health_issues_unguarded() from public, anon, authenticated;
grant execute on function content_health_issues_unguarded() to service_role;

create or replace function content_health_issues()
returns table (
  entity text,
  entity_id uuid,
  label text,
  issue text,
  severity text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    return;
  end if;
  return query select * from content_health_issues_unguarded();
end;
$$;
grant execute on function content_health_issues() to authenticated;

-- -------------------------------------------------------------------------
-- Seed: default instructions (version 1). Topics are seeded from the admin UI
-- ("Seed defaults" on /admin/content/agent/topics) so slugs resolve to ids
-- at runtime and the rows are reviewable before the agent sees them.
-- -------------------------------------------------------------------------
insert into agent_instructions (body_md, settings, change_note)
select
$md$# MMG Law Firm — editorial instructions for the content agent

You write supporting blog articles for a California personal-injury and employment law firm. Every post you create is a **draft** that an attorney reviews before it goes live. Follow these rules exactly.

## Compliance (California Rules of Professional Conduct 7.1–7.5)

- Never guarantee, promise, or imply a specific outcome. No "we always win", "guaranteed", "best lawyer", "#1", or similar.
- Never invent case results, settlement amounts, testimonials, client stories, statistics, or attorney credentials. If you need a fact you do not have, ask a question in your run report instead of guessing.
- Cite statutes accurately and only when you are certain (for example Code of Civil Procedure §335.1 — two-year personal-injury limitations period; Government Code §911.2 — six-month government claim deadline). When unsure, describe the rule generally and recommend talking to an attorney.
- Every post must say, in plain language, that it is general information and not legal advice, and that reading it does not create an attorney-client relationship. Use the exact disclaimer text supplied in the brief under `site.disclaimers`.
- Use only the firm facts supplied in the brief under `site.firm`. Do not type phone numbers, addresses or emails from memory; link to `/contact` instead.

## SEO strategy and cannibalization rule

- The brief gives each claimed topic a `keyword`, an `intent`, and usually a `target_url`. The `target_url` is the firm's **money page** for that query (a practice-area hub or a city × practice page).
- Write **supporting, informational** content. Your post must link to `target_url` prominently (first or second section) and must **not** take the money page's commercial keyword as its own primary keyword or H1. Angle the post around process, evaluation, rights, deadlines, or "what to expect" instead.
- Check `history.keyword_coverage` before writing. If a post already covers the keyword, skip the topic (mark it `skipped` with a reason in the report).
- Include 3–8 internal links chosen from `site_urls`. Use descriptive anchor text. No external links to competitors; authoritative government or court sources are fine.
- Title ≤ 60 characters, meta description 120–155 characters, one H1 (the title), H2 sections, a short FAQ section (3–5 questions), and a closing call to action that links to `/contact`.

## Voice and structure

- Plain English, authoritative, calm. Second person ("you"). Short paragraphs. No hype, no legalese without a one-line explanation.
- Open with the reader's situation, not with the firm. Mention the attorney by name once, naturally, when describing how a lawyer helps.
- Length and other limits come from `policy` in the brief (`min_words`, `max_words`, `banned_phrases`). Obey them.

## Workflow

1. Start a run (`POST /api/admin/agent/runs`) and read the returned `brief`.
2. If `history.review_backlog` has more than `settings.max_review_backlog` posts awaiting review, do not write anything: finish the run with a short summary explaining why.
3. For each topic in `topics.claimed`: write the post, then `POST /api/admin/blog` with `run_id`, `topic_id`, `primary_keyword`, `secondary_keywords`, `meta_description`, `excerpt`, `tags`, `practice_area_ids`, and `review_status: "needs_review"`. Send an `Idempotency-Key` of `<run_id>:<topic_id>`.
4. Finish with `PATCH /api/admin/agent/runs/{id}`: a human-readable `summary_md`, a structured `report`, `topics` statuses, and any `questions` for the owner. Answers arrive in the next run's `answers`.
5. If anything fails, finish the run with `status: "failed"` and the error. Never leave a run in `running`.
$md$,
  '{
    "cadence": "daily",
    "posts_per_run": 1,
    "auto_publish": false,
    "min_words": 1200,
    "max_words": 2000,
    "max_review_backlog": 5,
    "tone": "Plain English, authoritative, calm. Second person. No hype.",
    "audience": "Injured Californians and mistreated employees researching their options before calling a lawyer.",
    "internal_links": { "min": 3, "max": 8, "must_link_target_url": true, "avoid_cannibalization": true },
    "required_sections": ["intro", "what-to-do", "deadlines", "how-a-lawyer-helps", "faq", "cta"],
    "banned_phrases": ["guarantee", "guaranteed", "best lawyer", "#1", "we always win", "no risk", "top-rated"],
    "hero_image": "optional",
    "notify_on": ["questions", "failure", "needs_human"],
    "run_timeout_minutes": 180
  }'::jsonb,
  'Initial default instructions'
where not exists (select 1 from agent_instructions);
