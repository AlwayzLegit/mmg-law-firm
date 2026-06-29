import { FIRM } from "@/lib/constants";

/**
 * Starter message templates for the lead Communications hub. These are
 * *drafts* — the admin always sees the interpolated text in the compose box
 * and edits/approves before anything sends (human-in-the-loop, which keeps
 * outbound messaging CRPC-compliant: no guarantees, no case-outcome promises).
 *
 * `{{first}}` is replaced with the lead's first name client-side. Other firm
 * facts are baked in from constants so phone/name never drift.
 */
export type MessageTemplate = {
  id: string;
  label: string;
  channel: "sms" | "email";
  /** Email only. */
  subject?: string;
  body: string;
};

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // ---- SMS ----
  {
    id: "sms-intro",
    label: "SMS · First contact",
    channel: "sms",
    body: `Hi {{first}}, this is ${FIRM.legalName}. Thanks for reaching out about your case — when's a good time for a quick call? You can also reach us at ${FIRM.phone}.`,
  },
  {
    id: "sms-followup",
    label: "SMS · Follow-up",
    channel: "sms",
    body: `Hi {{first}}, following up on your inquiry with ${FIRM.legalName}. We'd still like to hear what happened and see how we can help. Reply here or call ${FIRM.phone}.`,
  },
  {
    id: "sms-schedule",
    label: "SMS · Schedule a call",
    channel: "sms",
    body: `Hi {{first}}, ${FIRM.legalName} here. Are you available for a brief call today or tomorrow? Let us know a time that works and we'll call you.`,
  },
  // ---- Email ----
  {
    id: "email-intro",
    label: "Email · First contact",
    channel: "email",
    subject: `Your inquiry with ${FIRM.legalName}`,
    body: `Hi {{first}},

Thank you for reaching out to ${FIRM.legalName}. We received your message and would like to learn more about what happened so we can explain your options.

What's the best phone number and time to reach you for a free, no-obligation consultation? You can also call us directly at ${FIRM.phone}.

We look forward to speaking with you.

${FIRM.attorneyName}
${FIRM.legalName}
${FIRM.phone}`,
  },
  {
    id: "email-followup",
    label: "Email · Follow-up",
    channel: "email",
    subject: `Following up on your inquiry — ${FIRM.legalName}`,
    body: `Hi {{first}},

I wanted to follow up on the inquiry you submitted to ${FIRM.legalName}. We're still glad to help and would like to hear more about your situation.

If you have a few minutes, reply to this email or call us at ${FIRM.phone} and we'll find a time that works for you.

${FIRM.attorneyName}
${FIRM.legalName}
${FIRM.phone}`,
  },
];

/** Insert the lead's first name into a template body/subject. */
export function fillTemplate(text: string, fullName: string | null): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0] || "there";
  return text.replaceAll("{{first}}", first);
}
