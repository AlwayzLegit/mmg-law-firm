/**
 * Email alerts for the monitor (OPS-59). Sent only after the quiet time
 * (round.mjs emits no event before it) and only when ALERT_EMAIL,
 * RESEND_API_KEY and RESEND_FROM_EMAIL are all set on the Worker: the owner's
 * switch (see monitor-deploy.yml, "Alert settings"). Without them the monitor
 * records and logs one line with no address in it.
 */
export function alertsConfigured(env) {
  return Boolean(env.ALERT_EMAIL && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

/** Subject and text from the fixed failure words only. Never a response body. */
export function composeAlert(event, site) {
  const host = String(site).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const why = event.reason ? ` Last failure: ${event.reason}.` : "";
  if (event.type === "recovery") {
    return { subject: `[MMG monitor] recovered: ${host}`, text: `The site is answering again.${why}` };
  }
  const again = event.type === "reminder" ? " (still failing)" : "";
  return {
    subject: `[MMG monitor] DOWN${again}: ${host}`,
    text: `The health checks fail from outside the site.${why} The monitor's /status page has the details.`,
  };
}

/** Returns "sent", "skipped" or "failed". Never throws and never logs a secret or an address. */
export async function sendAlert(env, event, fetchImpl = fetch, log = console.log) {
  if (!alertsConfigured(env)) {
    log("monitor: alert not sent, mail settings not set");
    return "skipped";
  }
  const { subject, text } = composeAlert(event, env.SITE_URL);
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [env.ALERT_EMAIL], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      log(`monitor: alert failed, provider answered ${res.status}`);
      return "failed";
    }
    return "sent";
  } catch {
    log("monitor: alert failed, no answer from the provider");
    return "failed";
  }
}
