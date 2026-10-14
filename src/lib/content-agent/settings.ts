import { z } from "zod";

/**
 * Owner-editable settings stored on each `agent_instructions` version. Parsed
 * with defaults on read so older versions stay valid when new keys are added.
 */
export const AgentSettings = z
  .object({
    cadence: z.enum(["daily", "weekdays", "weekly"]).default("daily"),
    posts_per_run: z.number().int().min(0).max(5).default(1),
    auto_publish: z.boolean().default(false),
    min_words: z.number().int().min(300).max(5000).default(1200),
    max_words: z.number().int().min(300).max(6000).default(2000),
    /** When more posts than this await review, the agent pauses drafting. */
    max_review_backlog: z.number().int().min(0).max(50).default(5),
    tone: z
      .string()
      .max(500)
      .default("Plain English, authoritative, calm. Second person. No hype."),
    audience: z
      .string()
      .max(500)
      .default(
        "Injured Californians and mistreated employees researching their options before calling a lawyer.",
      ),
    internal_links: z
      .object({
        min: z.number().int().min(0).max(20).default(3),
        max: z.number().int().min(0).max(30).default(8),
        must_link_target_url: z.boolean().default(true),
        avoid_cannibalization: z.boolean().default(true),
      })
      .default({ min: 3, max: 8, must_link_target_url: true, avoid_cannibalization: true }),
    required_sections: z.array(z.string().max(60)).max(12).default([]),
    banned_phrases: z.array(z.string().max(80)).max(50).default([]),
    hero_image: z.enum(["none", "optional", "required"]).default("optional"),
    notify_on: z
      .array(z.enum(["questions", "failure", "needs_human", "every_run"]))
      .default(["questions", "failure", "needs_human"]),
    run_timeout_minutes: z.number().int().min(15).max(720).default(180),
  })
  .strict();

export type AgentSettings = z.infer<typeof AgentSettings>;

/** Lenient read: unknown/invalid stored JSON falls back to defaults per key. */
export function parseSettings(raw: unknown): AgentSettings {
  const strict = AgentSettings.safeParse(raw ?? {});
  if (strict.success) return strict.data;
  // Drop unknown keys and retry so a single bad key doesn't nuke the rest.
  const obj = typeof raw === "object" && raw !== null ? { ...(raw as Record<string, unknown>) } : {};
  const known = new Set(Object.keys(AgentSettings.shape));
  for (const k of Object.keys(obj)) if (!known.has(k)) delete obj[k];
  const loose = AgentSettings.safeParse(obj);
  return loose.success ? loose.data : AgentSettings.parse({});
}
