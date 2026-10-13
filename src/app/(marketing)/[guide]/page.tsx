import { notFound } from "next/navigation";

import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";
import { V3_GUIDES } from "@/lib/v3/pages";

// Root-level guide pages from the v3 design handoff (e.g.
// /truck-rollover-accident-lawyer). Only registered slugs render; anything
// else 404s. Static routes (/contact, /blog, …) always win over this one.
export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return V3_GUIDES.map((p) => ({ guide: p.path.slice(1) }));
}

function find(guide: string) {
  return V3_GUIDES.find((p) => p.path === `/${guide}`);
}

type Props = { params: Promise<{ guide: string }> };

export async function generateMetadata({ params }: Props) {
  const { guide } = await params;
  const page = find(guide);
  if (!page) return {};
  return v3Metadata(page.key);
}

export default async function GuidePage({ params }: Props) {
  const { guide } = await params;
  const page = find(guide);
  if (!page) notFound();
  return <V3PageShell pageKey={page.key} />;
}
