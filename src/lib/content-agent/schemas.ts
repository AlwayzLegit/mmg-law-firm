import { z } from "zod";

import { AgentSettings } from "./settings";

/** Zod schemas for the content-agent API payloads (shared by routes + OpenAPI). */

export const TOPIC_INTENTS = [
  "informational",
  "supporting_post",
  "local",
  "faq",
  "news",
  "comparison",
] as const;
export const TOPIC_STATUSES = [
  "queued",
  "claimed",
  "drafted",
  "published",
  "skipped",
  "rejected",
] as const;
export const RUN_STATUSES = ["running", "succeeded", "failed", "needs_human"] as const;
export const QUESTION_KINDS = ["decision", "fact_check", "approval", "blocker", "other"] as const;

const Uuid = z.string().uuid();
const Slug = z.string().trim().min(1).max(80);
const RelUrl = z
  .string()
  .trim()
  .max(300)
  .regex(/^\/[^\s]*$/, "target_url must be a site-relative path starting with /");

export const StartRunInput = z
  .object({
    agent_name: z.string().trim().min(2).max(80),
    claim_topics: z.number().int().min(0).max(5).optional(),
    topic_ids: z.array(Uuid).max(5).optional(),
    include_brief: z.boolean().default(true),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type StartRunData = z.infer<typeof StartRunInput>;

export const RunTopicUpdate = z.object({
  id: Uuid,
  status: z.enum(["drafted", "published", "skipped", "queued"]),
  post_id: Uuid.nullish(),
  note: z.string().trim().max(1000).nullish(),
});

export const RunQuestionInput = z.object({
  kind: z.enum(QUESTION_KINDS).default("other"),
  question: z.string().trim().min(5).max(2000),
  context: z.string().trim().max(4000).nullish(),
  topic_id: Uuid.nullish(),
  post_id: Uuid.nullish(),
});

export const PatchRunInput = z
  .object({
    status: z.enum(RUN_STATUSES).optional(),
    summary_md: z.string().max(8000).nullish(),
    report: z.record(z.string(), z.unknown()).optional(),
    metrics: z.record(z.string(), z.number()).optional(),
    posts_created: z.array(Uuid).max(50).optional(),
    topics: z.array(RunTopicUpdate).max(20).optional(),
    questions: z.array(RunQuestionInput).max(10).optional(),
    error: z.string().max(4000).nullish(),
    log: z.array(z.string().max(500)).max(200).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "No fields supplied");
export type PatchRunData = z.infer<typeof PatchRunInput>;

export const TopicInput = z
  .object({
    keyword: z.string().trim().min(2).max(160),
    intent: z.enum(TOPIC_INTENTS).default("informational"),
    practice_area_id: Uuid.nullish(),
    practice_area_slug: Slug.nullish(),
    county_id: Uuid.nullish(),
    county_slug: Slug.nullish(),
    city_id: Uuid.nullish(),
    city_slug: Slug.nullish(),
    target_url: RelUrl.nullish(),
    title_hint: z.string().trim().max(200).nullish(),
    priority: z.number().int().min(0).max(1000).optional(),
    volume: z.number().int().min(0).nullish(),
    kd: z.number().int().min(0).max(100).nullish(),
    cpc: z.number().min(0).nullish(),
    notes: z.string().trim().max(2000).nullish(),
    source: z.string().trim().max(40).optional(),
  })
  .strict();
export type TopicData = z.infer<typeof TopicInput>;

export const TopicsCreateInput = z.object({
  topics: z.array(TopicInput).min(1).max(100),
  upsert: z.boolean().default(false),
});

export const TopicPatchInput = TopicInput.partial()
  .extend({
    status: z.enum(TOPIC_STATUSES).optional(),
    note: z.string().trim().max(1000).nullish(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "No fields supplied");

export const InstructionsPutInput = z
  .object({
    body_md: z.string().min(50).max(32000),
    settings: AgentSettings.partial().optional(),
    change_note: z.string().trim().max(300).nullish(),
  })
  .strict();

export const QuestionPatchInput = z
  .object({
    answer: z.string().trim().min(1).max(4000).optional(),
    status: z.enum(["dismissed"]).optional(),
  })
  .strict()
  .refine((v) => v.answer !== undefined || v.status !== undefined, "Provide answer or status");

export const StandaloneQuestionInput = RunQuestionInput.extend({ run_id: Uuid });
