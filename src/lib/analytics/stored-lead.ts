type LeadEventParameters = {
  send_to: string;
  page_location: string;
  page_referrer: string;
  page_title: string;
};

declare global {
  interface Window {
    gtag?: (
      command: "event",
      name: "generate_lead",
      parameters: LeadEventParameters,
    ) => void;
  }
}

const handledResponses = new WeakSet<Response>();

/**
 * Count only the API's explicit storage acknowledgement. Never accept form
 * values here. This is a stored submission, not a qualified lead or client.
 * Use the existing Google tag/queue; no second tag or consent changes.
 */
export async function recordStoredLead(response: Response): Promise<void> {
  if (!response.ok || handledResponses.has(response)) return;
  handledResponses.add(response);

  try {
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("ok" in data) ||
      data.ok !== true ||
      !("persisted" in data) ||
      data.persisted !== true
    )
      return;

    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    if (!gaId || typeof window === "undefined" || !window.gtag) return;

    // Override automatic URL/title fields for this event only. Query/hash,
    // referrer paths and form contents must not enter the event payload.
    const location = new URL(window.location.href);
    let referrer = "";
    try {
      const url = new URL(document.referrer);
      if (url.protocol === "https:" || url.protocol === "http:") {
        referrer = url.origin;
      }
    } catch {
      /* No valid referrer. */
    }

    window.gtag("event", "generate_lead", {
      send_to: gaId,
      page_location: location.origin + location.pathname,
      page_referrer: referrer,
      page_title: "Consultation request",
    });
  } catch {
    // Malformed responses, blocked analytics or tag errors must never turn
    // an accepted submission into a user-facing form failure.
  }
}
