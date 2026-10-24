"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";

import { Turnstile } from "@/components/marketing/turnstile";
import { FIRM, TCPA_CONSENT_TEXT } from "@/lib/constants";
import {
  ATTRIBUTION_FIELDS,
  readAttributionInBrowser,
} from "@/lib/analytics/attribution";
import { track } from "@/lib/analytics/track";
import { recordStoredLead } from "@/lib/analytics/stored-lead";
import { practiceFromLabel } from "@/lib/data/practice-area-options";
import {
  lazyLeadResolver,
  preloadLeadValidation,
} from "@/lib/validation/lazy-lead-resolver";
import { leadFormDefaults, type LeadFormValues } from "@/lib/validation/lead-form-values";

type Field = {
  name: string;
  placeholder: string;
  required: boolean;
  tag: string;
  row?: boolean;
  options?: { value: string; label: string }[];
  style?: string;
};

type Props = {
  id?: string;
  fields: Field[];
  submitLabel: string;
  practiceArea?: string;
  formStyle?: CSSProperties;
  rowStyle?: CSSProperties;
  inputStyle?: CSSProperties;
  textareaStyle?: CSSProperties;
  buttonStyle?: CSSProperties;
  buttonClassName?: string;
  note?: string;
  noteStyle?: CSSProperties;
};

const DESCRIPTION_MAX = 500;

const DEFAULT_INPUT: CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 50,
  padding: "0 16px",
  border: "1px solid #e3d3b2",
  borderRadius: 2,
  background: "#fffdf8",
  color: "#131a20",
  fontSize: 16,
};

/**
 * Lead form rendered with the design handoff's field styling. Behaviour is
 * identical to the site-wide LeadForm: same Zod schema, TCPA consent
 * (unchecked by default, verbatim text), Cloudflare Turnstile, honeypot,
 * UTM capture, and POST /api/leads. Text only — no uploads.
 */
export function V3LeadForm({
  id,
  fields,
  submitLabel,
  practiceArea,
  formStyle,
  rowStyle,
  inputStyle,
  textareaStyle,
  buttonStyle,
  buttonClassName,
  note,
  noteStyle,
}: Props) {
  const uid = React.useId();
  const form = useForm<LeadFormValues, unknown, LeadFormValues>({
    resolver: lazyLeadResolver,
    mode: "onBlur",
    defaultValues: { ...leadFormDefaults, practice_area: practiceArea },
  });
  const [sent, setSent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const errors = form.formState.errors;

  React.useEffect(() => {
    const attribution = readAttributionInBrowser();
    for (const k of ATTRIBUTION_FIELDS) {
      const v = attribution[k];
      if (v) form.setValue(k, v);
    }
    capture("lead_form_viewed", { variant: "v3", practice_area: practiceArea ?? null });
  }, [form, practiceArea]);

  const onToken = React.useCallback(
    (t: string) => form.setValue("turnstileToken", t, { shouldValidate: false }),
    [form],
  );

  async function onSubmit(values: LeadFormValues) {
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
        signal: controller.signal,
      });
      if (res.status === 429) {
        setError(`You've sent several requests recently. Please call ${FIRM.phone}.`);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          issues?: Record<string, string[]>;
        };
        if (data.error === "validation-failed" && data.issues) {
          for (const [f, msgs] of Object.entries(data.issues)) {
            if (msgs?.[0]) form.setError(f as keyof LeadFormValues, { message: msgs[0] });
          }
          setError("Please check the highlighted fields.");
          return;
        }
        setError(
          data.error === "turnstile-failed"
            ? `Bot protection failed to load. Please call ${FIRM.phone}.`
            : `We couldn't submit your request. Please try again or call ${FIRM.phone}.`,
        );
        return;
      }
      void recordStoredLead(res);
      setSent(values.full_name.trim().split(/\s+/)[0] || "for reaching out");
      capture("lead_submitted", { variant: "v3", practice_area: values.practice_area || undefined });
      form.reset({ ...leadFormDefaults, practice_area: practiceArea });
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setError(
        aborted
          ? `This is taking longer than expected. Please call ${FIRM.phone}.`
          : `Network error. Please try again or call ${FIRM.phone}.`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  if (sent) {
    return (
      <div id={id} role="status" aria-live="polite">
        <p style={{ fontSize: 26, lineHeight: 1.25, color: "#131a20" }}>Thank you, {sent}.</p>
        <p style={{ marginTop: 12, fontSize: 16.5, lineHeight: 1.6, color: "#3a434a" }}>
          Your request has been received. We follow up during office hours. For immediate help,
          call{" "}
          <a href={`tel:${FIRM.phoneTel}`} style={{ color: "#987022" }}>
            {FIRM.phone}
          </a>
          .
        </p>
      </div>
    );
  }

  const input = { ...DEFAULT_INPUT, ...inputStyle };
  const textarea: CSSProperties = {
    ...DEFAULT_INPUT,
    height: undefined,
    minHeight: 100,
    padding: "13px 16px",
    lineHeight: 1.5,
    resize: "vertical",
    display: "block",
    ...textareaStyle,
  };
  const errStyle: CSSProperties = { marginTop: 4, fontSize: 13.5, color: "#a12a1d" };

  const renderField = (f: Field) => {
    const label = f.placeholder.replace(/\s*\*$/, "");
    const fid = `${uid}-${f.name}`;
    const sr = (
      <label htmlFor={fid} className="sr-only">
        {label}
      </label>
    );
    if (f.name === "name")
      return (
        <div key={f.name} style={{ minWidth: 0 }}>
          {sr}
          <input id={fid} type="text" autoComplete="name" placeholder={f.placeholder} style={input} className="v3-field" aria-invalid={!!errors.full_name} {...form.register("full_name")} />
          {errors.full_name ? <p style={errStyle}>{errors.full_name.message}</p> : null}
        </div>
      );
    if (f.name === "phone")
      return (
        <div key={f.name} style={{ minWidth: 0 }}>
          {sr}
          <input id={fid} type="tel" autoComplete="tel" placeholder={f.placeholder} style={input} className="v3-field" aria-invalid={!!errors.phone} {...form.register("phone")} />
          {errors.phone ? <p style={errStyle}>{errors.phone.message}</p> : null}
        </div>
      );
    if (f.name === "email")
      return (
        <div key={f.name} style={{ minWidth: 0 }}>
          {sr}
          <input id={fid} type="email" autoComplete="email" placeholder={f.placeholder} style={input} className="v3-field" aria-invalid={!!errors.email} {...form.register("email")} />
          {errors.email ? <p style={errStyle}>{errors.email.message}</p> : null}
        </div>
      );
    if (f.tag === "select")
      return (
        <div key={f.name} style={{ minWidth: 0 }}>
          {sr}
          <select
            id={fid}
            style={{ ...input, appearance: "auto" }}
            className="v3-field"
            defaultValue=""
            onChange={(e) => {
              const opt = f.options?.find((o) => o.value === e.target.value);
              form.setValue("practice_area", opt ? practiceFromLabel(opt.label) ?? practiceArea : practiceArea);
            }}
          >
            {(f.options ?? []).map((o) => (
              <option key={o.value + o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    // free-text description (case / msg / message)
    return (
      <div key={f.name} style={{ minWidth: 0 }}>
        {sr}
        <textarea id={fid} rows={3} maxLength={DESCRIPTION_MAX} placeholder={f.placeholder} style={textarea} className="v3-field" aria-invalid={!!errors.description} {...form.register("description")} />
        {errors.description ? <p style={errStyle}>{errors.description.message}</p> : null}
      </div>
    );
  };

  const rowFields = fields.filter((f) => f.row);
  const rest = fields.filter((f) => !f.row);

  return (
    <form
      id={id}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      style={{ display: "grid", gap: 14, ...formStyle }}
      onFocus={() => {
        void preloadLeadValidation().catch(() => {}); // validation chunk, ready by first blur
        capture("lead_form_started", { variant: "v3" }, true);
      }}
    >
      <div aria-hidden style={{ position: "absolute", left: -9999, width: 0, height: 0, overflow: "hidden" }}>
        <label htmlFor={`${uid}-company`}>Company (leave blank)</label>
        <input id={`${uid}-company`} type="text" tabIndex={-1} autoComplete="off" {...form.register("company")} />
      </div>
      {rowFields.length ? <div style={rowStyle}>{rowFields.map(renderField)}</div> : null}
      {rest.map(renderField)}

      <label style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, alignItems: "start", fontSize: 13, lineHeight: 1.5, color: "#3a434a", cursor: "pointer" }}>
        <input type="checkbox" style={{ width: 18, height: 18, marginTop: 2, accentColor: "#987022" }} aria-invalid={!!errors.consent_contact} {...form.register("consent_contact")} />
        <span>{TCPA_CONSENT_TEXT}</span>
      </label>
      {errors.consent_contact ? <p style={errStyle}>{errors.consent_contact.message}</p> : null}

      <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} onToken={onToken} action="lead-form" />
      {errors.turnstileToken ? <p style={errStyle}>{errors.turnstileToken.message}</p> : null}

      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className={buttonClassName}
        style={{
          height: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "#e8c384",
          borderRadius: 2,
          color: "#181b1c",
          fontSize: 17,
          cursor: "pointer",
          ...buttonStyle,
          opacity: form.formState.isSubmitting ? 0.7 : 1,
        }}
      >
        {form.formState.isSubmitting ? "Sending…" : submitLabel}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
          <path d="M5 12h14" />
          <path d="M13 18l6-6" />
          <path d="M13 6l6 6" />
        </svg>
      </button>
      {error ? (
        <p role="alert" style={errStyle}>
          {error}
        </p>
      ) : null}
      {note ? <p style={noteStyle}>{note}</p> : null}
    </form>
  );
}

let started = false;
function capture(event: string, props?: Record<string, unknown>, once = false) {
  if (typeof window === "undefined") return;
  if (once) {
    if (started) return;
    started = true;
  }
  track(event, props); // queued until PostHog loads (see lib/analytics/track)
}
