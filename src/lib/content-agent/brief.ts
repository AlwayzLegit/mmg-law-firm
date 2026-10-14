import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasScope } from "@/lib/api/scopes";
import type { ApiPrincipal } from "@/lib/api/auth";
import { DISCLAIMERS, FIRM } from "@/lib/constants";
import { siteUrl } from "@/lib/seo/canonical";

import { getActiveInstructions, type ActiveInstructions } from "./instructions";
import { parseSettings, type AgentSettings } from "./settings";
import { buildSiteUrls, type SiteUrls } from "./site-urls";

/**
 * The "brief": everything the daily content agent needs in one payload.
 * `assembleBrief` is pure (unit-tested); `loadBrief` does the I/O.
 */

export type BriefTopic = {
  id: string;
  keyword: string;
  intent: string;
  practice_area: { id: string; slug: string; name: string; url: string } | null;
  county: { id: string; slug: string; name: string } | null;
  city: { id: string; slug: string; name: string } | null;
  target_url: string | null;
  title_hint: string | null;
  priority: number;
  volume: number | null;
  kd: number | null;
  cpc: number | null;
  notes: string | null;
};

export type BriefPost = {
  id: string;
  slug: string;
  url: string;
  title: string;
  primary_keyword: string | null;
  secondary_keywords: string[];
  tags: string[];
  practice_area_ids: string[];
  review_status: string;
  is_published: boolean;
  published_at: string | null;
  word_count: number | null;
  created_via: string;
  created_at: string;
};

export type BriefAnswer = {
  question_id: string;
  asked_in_run_id: string;
  asked_at: string;
  kind: string;
  question: string;
  context: string | null;
  answer: string;
  answered_at: string | null;
  topic_id: string | null;
  post_id: string | null;
};

export type BriefInputs = {
  now: Date;
  principal: ApiPrincipal | null;
  instructions: ActiveInstructions | null;
  claimed: BriefTopic[];
  upcoming: BriefTopic[];
  topicCounts: Record<string, number>;
  recentPosts: BriefPost[];
  keywordCoverage: Array<{ keyword: string; slug: string }>;
  reviewBacklog: Array<{ id: string; title: string; created_at: string }>;
  postCounts: { published: number; needs_review: number; created_last_7d: number };
  answers: BriefAnswer[];
  openQuestionsCount: number;
  siteUrls: SiteUrls;
  seoIssues: Array<{ post_id: string; title: string; issue: string; severity: string }>;
  lastRun: {
    id: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    summary_md: string | null;
    posts_created: string[];
  } | null;
};

export function assembleBrief(i: BriefInputs) {
  const settings: AgentSettings = i.instructions?.settings ?? parseSettings({});
  const mayPublish =
    settings.auto_publish &&
    (i.principal ? hasScope(i.principal.scopes, "blog:publish") : false);
  const backlogOver = i.reviewBacklog.length > settings.max_review_backlog;

  return {
    generated_at: i.now.toISOString(),
    site: {
      base_url: siteUrl(),
      firm: {
        name: FIRM.legalName,
        attorney: FIRM.attorneyName,
        bar_number: FIRM.barNumber,
        phone: FIRM.phone,
        city: FIRM.address.city,
        state: FIRM.address.state,
        languages: FIRM.languages,
        contact_url: "/contact",
      },
      disclaimers: {
        attorney_advertising: DISCLAIMERS.advertising,
        general: DISCLAIMERS.general,
        results: DISCLAIMERS.results,
        testimonial: DISCLAIMERS.testimonial,
      },
    },
    instructions: i.instructions
      ? {
          version: i.instructions.version,
          created_at: i.instructions.created_at,
          body_md: i.instructions.body_md.slice(0, 32000),
          settings,
        }
      : null,
    policy: {
      may_publish: mayPublish,
      default_review_status: "needs_review" as const,
      posts_per_run: settings.posts_per_run,
      min_words: settings.min_words,
      max_words: settings.max_words,
      internal_links: settings.internal_links,
      banned_phrases: settings.banned_phrases,
      required_sections: settings.required_sections,
      hero_image: settings.hero_image,
      pause_drafting: backlogOver,
      pause_reason: backlogOver
        ? `${i.reviewBacklog.length} posts await review (limit ${settings.max_review_backlog}). Do not draft more until the owner clears the backlog.`
        : null,
      create_endpoint: "POST /api/admin/blog",
      image_endpoint: "POST /api/admin/images",
      report_endpoint: "PATCH /api/admin/agent/runs/{run_id}",
    },
    topics: {
      claimed: i.claimed,
      upcoming: i.upcoming.slice(0, 10).map((t) => ({
        id: t.id,
        keyword: t.keyword,
        intent: t.intent,
        priority: t.priority,
        target_url: t.target_url,
      })),
      counts: i.topicCounts,
    },
    history: {
      recent_posts: i.recentPosts,
      keyword_coverage: i.keywordCoverage,
      review_backlog: i.reviewBacklog.slice(0, 10),
      counts: i.postCounts,
    },
    answers: i.answers,
    open_questions_count: i.openQuestionsCount,
    site_urls: i.siteUrls,
    seo_issues: i.seoIssues.slice(0, 25),
    last_run: i.lastRun
      ? { ...i.lastRun, summary_md: i.lastRun.summary_md?.slice(0, 2000) ?? null }
      : null,
  };
}

export type Brief = ReturnType<typeof assembleBrief>;

export type LoadBriefOptions = {
  principal: ApiPrincipal | null;
  /** Topics claimed by the current run (already claimed by the caller). */
  claimed?: BriefTopic[];
  urlsLimit?: number;
  historyLimit?: number;
  include?: Set<"site_urls" | "history" | "seo_issues" | "answers">;
  /** Answers already marked delivered to this run (POST runs) — pass them in. */
  answers?: BriefAnswer[];
};

const TOPIC_SELECT =
  "id, keyword, intent, target_url, title_hint, priority, volume, kd, cpc, notes, status, practice_areas(id, slug, name), counties(id, slug, name), cities(id, slug, name)";

type TopicRow = {
  id: string;
  keyword: string;
  intent: string;
  target_url: string | null;
  title_hint: string | null;
  priority: number;
  volume: number | null;
  kd: number | null;
  cpc: number | string | null;
  notes: string | null;
  status: string;
  practice_areas: { id: string; slug: string; name: string } | null;
  counties: { id: string; slug: string; name: string } | null;
  cities: { id: string; slug: string; name: string } | null;
};

export function toBriefTopic(r: TopicRow): BriefTopic {
  return {
    id: r.id,
    keyword: r.keyword,
    intent: r.intent,
    practice_area: r.practice_areas
      ? { ...r.practice_areas, url: `/practice-areas/${r.practice_areas.slug}` }
      : null,
    county: r.counties ?? null,
    city: r.cities ?? null,
    target_url: r.target_url,
    title_hint: r.title_hint,
    priority: r.priority,
    volume: r.volume,
    kd: r.kd,
    cpc: r.cpc == null ? null : Number(r.cpc),
    notes: r.notes,
  };
}

export { TOPIC_SELECT };

export async function loadBrief(
  supabase: SupabaseClient,
  opts: LoadBriefOptions,
): Promise<Brief> {
  const include = opts.include ?? new Set(["site_urls", "history", "seo_issues", "answers"] as const);
  const historyLimit = Math.min(Math.max(opts.historyLimit ?? 30, 1), 100);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400e3).toISOString();

  const [instructions, upcoming, counts, posts, coverage, backlog, pubCount, nrCount, recentCount, answers, openQ, siteUrls, seo, lastRun] =
    await Promise.all([
      getActiveInstructions(supabase),
      supabase
        .from("content_topics")
        .select(TOPIC_SELECT)
        .eq("status", "queued")
        .order("priority")
        .order("created_at")
        .limit(10),
      supabase.from("content_topics").select("status"),
      include.has("history")
        ? supabase
            .from("blog_posts")
            .select(
              "id, slug, title, primary_keyword, secondary_keywords, tags, practice_area_ids, review_status, is_published, published_at, word_count, created_via, created_at",
            )
            .neq("review_status", "rejected")
            .order("created_at", { ascending: false })
            .limit(historyLimit)
        : Promise.resolve({ data: [] as unknown[], error: null }),
      include.has("history")
        ? supabase
            .from("blog_posts")
            .select("primary_keyword, slug")
            .neq("review_status", "rejected")
            .not("primary_keyword", "is", null)
            .limit(500)
        : Promise.resolve({ data: [] as unknown[], error: null }),
      supabase
        .from("blog_posts")
        .select("id, title, created_at")
        .eq("review_status", "needs_review")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("review_status", "needs_review"),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      opts.answers
        ? Promise.resolve({ data: null, error: null })
        : include.has("answers")
          ? supabase
              .from("agent_questions")
              .select("id, run_id, created_at, kind, question, context, answer, answered_at, topic_id, post_id")
              .eq("status", "answered")
              .is("delivered_run_id", null)
              .order("answered_at")
              .limit(50)
          : Promise.resolve({ data: [] as unknown[], error: null }),
      supabase.from("agent_questions").select("id", { count: "exact", head: true }).eq("status", "open"),
      include.has("site_urls")
        ? buildSiteUrls(supabase, { limit: opts.urlsLimit ?? 200 })
        : Promise.resolve(emptySiteUrls()),
      include.has("seo_issues")
        ? supabase.rpc("content_health_issues_unguarded")
        : Promise.resolve({ data: [] as unknown[], error: null }),
      supabase
        .from("agent_runs")
        .select("id, status, started_at, finished_at, summary_md, posts_created")
        .neq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const topicCounts: Record<string, number> = {};
  for (const r of (counts.data ?? []) as Array<{ status: string }>) {
    topicCounts[r.status] = (topicCounts[r.status] ?? 0) + 1;
  }

  const recentPosts = ((posts.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
    id: p.id as string,
    slug: p.slug as string,
    url: `/blog/${p.slug as string}`,
    title: p.title as string,
    primary_keyword: (p.primary_keyword as string | null) ?? null,
    secondary_keywords: (p.secondary_keywords as string[] | null) ?? [],
    tags: (p.tags as string[] | null) ?? [],
    practice_area_ids: (p.practice_area_ids as string[] | null) ?? [],
    review_status: p.review_status as string,
    is_published: Boolean(p.is_published),
    published_at: (p.published_at as string | null) ?? null,
    word_count: (p.word_count as number | null) ?? null,
    created_via: (p.created_via as string) ?? "admin",
    created_at: p.created_at as string,
  }));

  const seoRows = ((seo.data ?? []) as Array<{ entity: string; entity_id: string; label: string; issue: string; severity: string }>)
    .filter((r) => r.entity === "blog")
    .map((r) => ({ post_id: r.entity_id, title: r.label, issue: r.issue, severity: r.severity }));

  const answerRows = opts.answers ??
    ((answers.data ?? []) as Array<Record<string, unknown>>).map((q) => ({
      question_id: q.id as string,
      asked_in_run_id: q.run_id as string,
      asked_at: q.created_at as string,
      kind: q.kind as string,
      question: q.question as string,
      context: (q.context as string | null) ?? null,
      answer: (q.answer as string) ?? "",
      answered_at: (q.answered_at as string | null) ?? null,
      topic_id: (q.topic_id as string | null) ?? null,
      post_id: (q.post_id as string | null) ?? null,
    }));

  return assembleBrief({
    now: new Date(),
    principal: opts.principal,
    instructions,
    claimed: opts.claimed ?? [],
    upcoming: ((upcoming.data ?? []) as unknown as TopicRow[]).map(toBriefTopic),
    topicCounts,
    recentPosts,
    keywordCoverage: ((coverage.data ?? []) as Array<{ primary_keyword: string; slug: string }>).map((r) => ({
      keyword: r.primary_keyword,
      slug: r.slug,
    })),
    reviewBacklog: (backlog.data ?? []) as Array<{ id: string; title: string; created_at: string }>,
    postCounts: {
      published: pubCount.count ?? 0,
      needs_review: nrCount.count ?? 0,
      created_last_7d: recentCount.count ?? 0,
    },
    answers: answerRows,
    openQuestionsCount: openQ.count ?? 0,
    siteUrls: siteUrls as SiteUrls,
    seoIssues: seoRows,
    lastRun: (lastRun.data as BriefInputs["lastRun"]) ?? null,
  });
}

function emptySiteUrls(): SiteUrls {
  return {
    practice_areas: [],
    counties: [],
    locations: [],
    legal: [],
    static: [],
    truncated: false,
    total_locations: 0,
  };
}
