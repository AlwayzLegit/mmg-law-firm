/**
 * Serialize a JSON-LD payload for safe inlining in
 * <script type="application/ld+json">. Escapes the characters that can break
 * out of a script tag (`<`) or terminate a JS string literal in older
 * parsers (U+2028, U+2029).
 */
const LINE_SEPARATORS = /[\u2028\u2029]/g;

export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(LINE_SEPARATORS, (ch) =>
      ch === "\u2028" ? "\\u2028" : "\\u2029",
    );
}
