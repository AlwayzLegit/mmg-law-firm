/** Preserve the homepage's existing metadata inheritance depth. Next applies
 * title templates to descendants, not a page at the layout's own segment. */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
