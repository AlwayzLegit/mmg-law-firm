import RootDocument from "@/components/layout/root-document";

export { metadata, viewport } from "@/components/layout/root-document";

/** A separate root forces document navigation across the privacy boundary.
 * Removing a tracking component alone would leave its SDK running in memory. */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootDocument>{children}</RootDocument>;
}
