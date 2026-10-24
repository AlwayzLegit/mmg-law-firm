import RootDocument from "@/components/layout/root-document";

export { metadata, viewport } from "@/components/layout/root-document";

/** A separate root forces document navigation across the privacy boundary.
 * Removing a tracking component alone would leave its SDK running in memory.
 * `theme-admin` applies the admin palette (v3 brand) to every page under this
 * root: the admin app and the sign-in / password pages. */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootDocument bodyClassName="theme-admin">{children}</RootDocument>;
}
