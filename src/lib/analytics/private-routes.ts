/** Authentication/setup routes are part of the internal admin application. */
export function isPrivateAnalyticsPath(pathname: string): boolean {
  let path = pathname.split(/[?#]/, 1)[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* Match the literal path. */
  }
  return /^\/(?:admin|login|onboarding|auth)(?:\/|$)/i.test(path);
}

export function isPrivateAnalyticsUrl(value: string, origin: string): boolean {
  try {
    const url = new URL(value, origin);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const ownHost = new URL(origin).hostname
      .toLowerCase()
      .replace(/^www\./, "");
    return (
      (host === ownHost || host === "mmg-lawfirm.com") &&
      isPrivateAnalyticsPath(url.pathname)
    );
  } catch {
    return false;
  }
}

/** Remove only internal URL values, including legacy nested initial/referrer
 * properties. Do not change public attribution, SDK tokens or consent state. */
export function withoutPrivateAnalyticsUrls(
  properties: Record<string, unknown>,
  origin: string,
): Record<string, unknown> {
  const clean = (value: unknown): unknown => {
    if (
      typeof value === "string" &&
      /^(?:https?:\/\/|\/)/i.test(value) &&
      isPrivateAnalyticsUrl(value, origin)
    )
      return undefined;
    if (Array.isArray(value))
      return value.map(clean).filter((v) => v !== undefined);
    if (
      value &&
      typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      return Object.fromEntries(
        Object.entries(value).flatMap(([k, v]) => {
          const result = clean(v);
          return result === undefined ? [] : [[k, result]];
        }),
      );
    }
    return value;
  };
  return clean(properties) as Record<string, unknown>;
}

/** Also reject a queued event explicitly attributed to an internal page,
 * even if a caller attempts to flush it after returning to a public page. */
export function filterPublicAnalyticsEvent<
  T extends { properties: Record<string, unknown> },
>(event: T | null, location: { pathname: string; origin: string }): T | null {
  if (!event || isPrivateAnalyticsPath(location.pathname)) return null;
  for (const key of ["$current_url", "$pathname", "pathname"]) {
    const value = event.properties[key];
    if (
      typeof value === "string" &&
      isPrivateAnalyticsUrl(value, location.origin)
    )
      return null;
  }
  return {
    ...event,
    properties: withoutPrivateAnalyticsUrls(event.properties, location.origin),
  };
}
