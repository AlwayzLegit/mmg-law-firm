import { env } from "@/lib/env";

const SITE_URL = (env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export function siteUrl(): string {
  return SITE_URL;
}

export function canonicalUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(
      `canonicalUrl: path must start with "/", received "${path}"`,
    );
  }
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
