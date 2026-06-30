/** Estimate reading time in whole minutes (minimum 1). 220 wpm for prose. */
export function readingTime(markdown: string): number {
  if (!markdown) return 1;
  // Strip code blocks (they aren't "read" the same way) before counting.
  const stripped = markdown.replace(/```[\s\S]*?```/g, "");
  const words = stripped.match(/\b[\p{L}\p{N}'-]+\b/gu)?.length ?? 0;
  return Math.max(1, Math.round(words / 220));
}
