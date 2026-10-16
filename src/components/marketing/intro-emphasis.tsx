/**
 * City intros are displayed inside PageHero's paragraph. Render the balanced
 * **emphasis** already stored by editors without adding block elements, links,
 * raw HTML, client JavaScript, or changing any wording/metadata fallback.
 * Leave other syntax and unmatched markers as text.
 */
export function IntroEmphasis({ text }: { text: string }) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}
