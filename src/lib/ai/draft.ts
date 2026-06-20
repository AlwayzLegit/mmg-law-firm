import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";
import { FIRM } from "@/lib/constants";

export type BlogDraft = {
  title: string;
  excerpt: string;
  meta_description: string;
  body_md: string;
};

export function isAiConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You are a legal-content writer drafting a blog post for ${FIRM.legalName}, a California personal-injury law firm in Glendale led by ${FIRM.attorneyName} (CA Bar #${FIRM.barNumber}).

Hard rules:
- This is a FIRST DRAFT for attorney review — it will NOT be published as-is.
- California personal-injury law only. Be accurate and practical.
- NO guarantees of outcome, NO "best/#1" superlatives, NO specific case results, NO invented statistics, testimonials, or client stories.
- Plain, trustworthy, professional tone. Short paragraphs. Use H2 (##) section headings.
- Do not fabricate citations. If you reference a statute (e.g. CCP §335.1), keep it general and correct.
- Output Markdown for the body.

Return ONLY a JSON object, no prose, no code fences, matching exactly:
{"title": string, "excerpt": string (<=300 chars), "meta_description": string (<=155 chars), "body_md": string}`;

/**
 * Generate a blog post draft from a topic via Claude. Returns null when the
 * AI key isn't configured. Throws on API/parse errors so the caller can
 * surface a message. The result is always treated as an unreviewed draft.
 */
export async function generateBlogDraft(
  topic: string,
): Promise<BlogDraft | null> {
  if (!env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Write the blog post draft about: ${topic}`,
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    throw new Error(
      "The model declined to draft this topic. Try rewording it.",
    );
  }

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const json = stripFences(text);
  let parsed: Partial<BlogDraft>;
  try {
    parsed = JSON.parse(json) as Partial<BlogDraft>;
  } catch {
    throw new Error("Couldn't parse the AI response. Try again.");
  }

  if (!parsed.title || !parsed.body_md) {
    throw new Error("The AI response was missing a title or body. Try again.");
  }

  return {
    title: String(parsed.title).slice(0, 160),
    excerpt: String(parsed.excerpt ?? "").slice(0, 400),
    meta_description: String(parsed.meta_description ?? "").slice(0, 220),
    body_md: String(parsed.body_md),
  };
}

/** Strip ```json … ``` fences if the model wrapped its JSON. */
function stripFences(s: string): string {
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(s.trim());
  return fence ? fence[1] : s;
}
