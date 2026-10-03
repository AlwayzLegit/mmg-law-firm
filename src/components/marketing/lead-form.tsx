"use client";

import * as React from "react";
import { useForm, type Resolver, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Bike,
  Briefcase,
  Car,
  CheckCircle2,
  Dog,
  PersonStanding,
  Phone,
  Plus,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FIRM, TCPA_CONSENT_TEXT } from "@/lib/constants";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { TIER_1_LOCATIONS } from "@/lib/data/locations";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";
import { LeadSchema, leadFormDefaults, type LeadFormValues } from "@/lib/validation/lead";

import { resolveIcon } from "./primitives/resolve-icon";
import { Turnstile } from "./turnstile";

type LeadFormProps = {
  /** Kept for call-site compatibility — both variants render all three steps. */
  variant?: "compact" | "full";
  defaultPracticeArea?: string;
  defaultCitySlug?: string;
  defaultCountySlug?: string;
  headline?: string;
  /** Heading level for the headline — h2 when the form is the page's main section (contact). */
  headingAs?: "h2" | "h3";
  description?: string;
  className?: string;
  /** Ignored by the stepper (no field to focus on step 1); kept for compatibility. */
  autoFocus?: boolean;
};

const DESCRIPTION_MAX = 500;
const OTHER = "__other__";

/** Step-1 matter tiles → practice-area slugs. "Something else" sends no area. */
const MATTERS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "car-accidents", label: "Car accident", icon: Car },
  { id: "truck-accidents", label: "Truck accident", icon: Truck },
  { id: "motorcycle-accidents", label: "Motorcycle", icon: Bike },
  { id: "pedestrian-accidents", label: "Pedestrian", icon: PersonStanding },
  { id: "slip-and-fall", label: "Slip and fall", icon: TriangleAlert },
  { id: "dog-bites", label: "Dog bite", icon: Dog },
  { id: "rideshare-accidents", label: "Uber / Lyft", icon: Smartphone },
  { id: "employment-law", label: "Workplace matter", icon: Briefcase },
  { id: OTHER, label: "Something else", icon: Plus },
];

const inputCls =
  "block h-[46px] w-full rounded-[10px] border border-input bg-card px-3 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-text-faint focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,163,90,.25)]";
const labelCls = "micro-label text-text-soft block tracking-[0.12em]";

/**
 * Lead intake (redesign v2): a three-step card over the existing LeadSchema
 * and /api/leads contract. Step 1 picks the matter, step 2 the details,
 * step 3 contact + TCPA consent + Turnstile. Honeypot, UTM capture and the
 * PostHog funnel events are unchanged.
 */
export function LeadForm({
  variant = "compact",
  defaultPracticeArea,
  defaultCitySlug,
  defaultCountySlug,
  headline = "Request a free consultation",
  headingAs: Heading = "h3",
  description = "Tell us briefly what happened. We'll call you back within one business hour during office hours.",
  className,
}: LeadFormProps) {
  const form = useForm<LeadFormValues, unknown, LeadFormValues>({
    // LeadSchema uses preprocess/transform, so zodResolver's inferred input type
    // collapses to `unknown`; the cast narrows it to the form's value shape.
    resolver: zodResolver(LeadSchema) as unknown as Resolver<LeadFormValues, unknown, LeadFormValues>,
    mode: "onBlur",
    defaultValues: {
      ...leadFormDefaults,
      practice_area: defaultPracticeArea ?? leadFormDefaults.practice_area,
      city_slug: defaultCitySlug ?? leadFormDefaults.city_slug,
      county_slug: defaultCountySlug ?? leadFormDefaults.county_slug,
    },
  });

  const [step, setStep] = React.useState<0 | 1 | 2>(0);
  const [matter, setMatter] = React.useState<string>(defaultPracticeArea ?? "");
  const [submitted, setSubmitted] = React.useState(false);

  // If the page's practice area isn't one of the nine tiles, add it so the
  // preselection is visible (e.g. bicycle accidents, wrongful termination).
  const tiles = React.useMemo(() => {
    if (!defaultPracticeArea || MATTERS.some((m) => m.id === defaultPracticeArea)) return MATTERS;
    const area = PRACTICE_AREAS.find((p) => p.slug === defaultPracticeArea);
    if (!area) return MATTERS;
    const extra = { id: area.slug, label: area.shortName, icon: resolveIcon(area.icon) };
    return [...MATTERS.slice(0, -1), extra, MATTERS[MATTERS.length - 1]];
  }, [defaultPracticeArea]);

  // Funnel: fire once when the visitor first interacts.
  const startedRef = React.useRef(false);
  const markStarted = React.useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    captureEvent("lead_form_started", { variant });
  }, [variant]);

  const handleTurnstileToken = React.useCallback(
    (token: string) => form.setValue("turnstileToken", token),
    [form],
  );

  // Capture page metadata client-side once.
  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    form.setValue("source_url", window.location.href);
    form.setValue("referrer", document.referrer || undefined);
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"] as const) {
      const v = sp.get(k);
      if (v) form.setValue(k, v);
    }
  }, [form]);

  React.useEffect(() => {
    captureEvent("lead_form_viewed", {
      variant,
      practice_area: defaultPracticeArea ?? null,
      city_slug: defaultCitySlug ?? null,
      county_slug: defaultCountySlug ?? null,
    });
  }, [variant, defaultPracticeArea, defaultCitySlug, defaultCountySlug]);

  function pickMatter(id: string) {
    markStarted();
    setMatter(id);
    form.setValue("practice_area", id === OTHER ? undefined : id, { shouldValidate: false });
  }

  async function onSubmit(values: LeadFormValues) {
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
        toast.error("You've sent several requests recently. Please wait a moment and try again — or call us directly.");
        return;
      }
      if (!res.ok) {
        const data = await safeJson(res);
        if (data?.error === "validation-failed" && data.issues) {
          const issues = data.issues as Record<string, string[]>;
          for (const [field, messages] of Object.entries(issues)) {
            if (messages?.[0]) form.setError(field as keyof LeadFormValues, { message: messages[0] });
          }
          toast.error("Please check the highlighted fields.");
          return;
        }
        if (data?.error === "turnstile-failed") {
          toast.error(`Bot-protection failed to load. Please call us at ${FIRM.phone} or email ${FIRM.intakeEmail}.`);
          return;
        }
        toast.error("We couldn't submit your request. Please try again, or call us directly.");
        return;
      }
      setSubmitted(true);
      toast.success("We received your request — we'll be in touch shortly.");
      // PostHog conversion event. No PII.
      captureEvent("lead_submitted", {
        variant,
        practice_area: values.practice_area || undefined,
        county_slug: values.county_slug || undefined,
        city_slug: values.city_slug || undefined,
        preferred_contact: values.preferred_contact || undefined,
        has_attorney: values.has_attorney ?? undefined,
      });
      form.reset(leadFormDefaults);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      toast.error(
        aborted
          ? `This is taking longer than expected. Please try again, or call us at ${FIRM.phone}.`
          : "Network error. Please try again, or call us directly.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  const stepN = submitted ? 3 : step + 1;
  const progress = submitted ? 100 : ((step + 1) / 3) * 100;
  const descLen = (useWatch({ control: form.control, name: "description" }) ?? "").length;

  return (
    <div
      className={cn(
        "border-ink/10 shadow-lift text-ink relative rounded-[18px] border bg-white p-7 font-sans leading-[1.6] md:p-8",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-gold-deep m-0 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
          <span aria-hidden className="bg-success inline-block h-1.5 w-1.5 rounded-full" />
          Free consultation
        </p>
        <p className="text-stone m-0 text-xs" aria-live="polite">
          Step {stepN} of 3
        </p>
      </div>
      <div className="bg-ink/8 mt-3 h-[3px] overflow-hidden rounded-sm" aria-hidden>
        <div className="bg-gold h-full transition-[width] duration-[400ms] ease-out" style={{ width: `${progress}%` }} />
      </div>
      <Heading className="font-display mt-5 text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink">{headline}</Heading>
      <p className="text-stone mt-2 text-sm">{description}</p>

      {submitted ? (
        <div className="bg-paper mt-[22px] rounded-[14px] p-[22px]">
          <p className="text-success m-0 text-[11px] font-semibold tracking-[0.16em] uppercase">Received</p>
          <h3 className="font-display mt-2.5 text-[30px] leading-[1.1] font-semibold">Your request is in.</h3>
          <p className="text-stone mt-2 text-[15px]">
            We&apos;ll call you back within one business hour during office hours. If your matter is urgent, please call
            us directly.
          </p>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <a href={`tel:${FIRM.phoneTel}`} className="bg-ink text-cream inline-flex h-11 items-center gap-2 rounded-full px-[18px] text-[13px] font-semibold no-underline">
              <Phone className="h-3.5 w-3.5" aria-hidden /> Call {FIRM.phone}
            </a>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                setMatter(defaultPracticeArea ?? "");
              }}
              className="border-ink/20 hover:bg-paper h-11 rounded-full border bg-white px-[18px] text-[13px] font-semibold"
            >
              Submit another
            </button>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative">
            {/* Honeypot — hidden from users, catches naive bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="lead-company">Company (leave blank)</label>
              <input id="lead-company" type="text" tabIndex={-1} autoComplete="off" {...form.register("company")} />
            </div>

            {/* ---- Step 1: matter ------------------------------------------------ */}
            <fieldset className={cn("m-0 border-0 p-0", step !== 0 && "hidden")}>
              <legend className={cn(labelCls, "mt-[22px]")}>What happened?</legend>
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5" role="radiogroup" aria-label="Type of matter">
                {tiles.map((m) => {
                  const on = matter === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => pickMatter(m.id)}
                      className={cn(
                        "flex flex-col items-start gap-2.5 rounded-xl border p-3 text-left text-[13px] font-semibold transition-colors",
                        on ? "border-ink bg-ink text-cream" : "border-ink/10 bg-paper text-ink hover:border-ink/30",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", on ? "text-gold" : "text-gold-deep")} aria-hidden />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!matter}
                onClick={() => setStep(1)}
                className={cn(
                  "text-cream mt-5 flex h-[50px] w-full items-center justify-between rounded-full px-5 text-sm font-semibold transition-colors",
                  matter ? "bg-ink hover:bg-ink-hover" : "bg-ink/35 cursor-not-allowed",
                )}
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </fieldset>

            {/* ---- Step 2: details ----------------------------------------------- */}
            <div className={cn(step !== 1 && "hidden")}>
              <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
                <FormField
                  control={form.control}
                  name="city_slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Where did it happen?</FormLabel>
                      <FormControl
                        as="select"
                        className={cn(inputCls, "mt-1.5")}
                        value={field.value ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const v = e.currentTarget.value;
                          field.onChange(v || undefined);
                          const match = TIER_1_LOCATIONS.find((l) => l.citySlug === v);
                          if (match) form.setValue("county_slug", match.countySlug);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                      >
                        <option value="">Pick a city</option>
                        {TIER_1_LOCATIONS.map((l) => (
                          <option key={l.citySlug} value={l.citySlug}>
                            {l.cityName}
                          </option>
                        ))}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="incident_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>
                        Date of incident <span className="font-normal tracking-normal normal-case">(if known)</span>
                      </FormLabel>
                      <FormControl
                        as="input"
                        type="date"
                        className={cn(inputCls, "mt-1.5")}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="mt-3.5">
                    <FormLabel className={labelCls}>What happened?</FormLabel>
                    <FormControl
                      as="textarea"
                      rows={4}
                      maxLength={DESCRIPTION_MAX}
                      placeholder="In a few sentences — type of incident, where, and how you're doing now."
                      className={cn(inputCls, "mt-1.5 h-auto min-h-[110px] resize-none py-3 leading-[1.6]")}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      onFocus={markStarted}
                      name={field.name}
                    />
                    <div className="text-stone mt-1.5 flex justify-between gap-3 text-xs">
                      <span>Do not include sensitive medical details — we&apos;ll discuss those securely after we connect.</span>
                      <span className={cn("tabular-nums", descLen >= DESCRIPTION_MAX && "text-destructive")} aria-hidden>
                        {descLen}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-[18px] flex gap-2.5">
                <button type="button" onClick={() => setStep(0)} className="border-ink/20 hover:bg-paper h-[50px] rounded-full border bg-white px-[18px] text-sm font-semibold">
                  Back
                </button>
                <button type="button" onClick={() => setStep(2)} className="bg-ink text-cream hover:bg-ink-hover flex h-[50px] flex-1 items-center justify-between rounded-full px-5 text-sm font-semibold">
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            {/* ---- Step 3: contact ----------------------------------------------- */}
            <div className={cn("mt-[22px] grid gap-3.5", step !== 2 && "hidden")}>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Full name</FormLabel>
                      <FormControl as="input" autoComplete="name" placeholder="Jane Doe" className={cn(inputCls, "mt-1.5")} {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Phone</FormLabel>
                      <FormControl as="input" type="tel" autoComplete="tel" placeholder="(555) 555-1234" className={cn(inputCls, "mt-1.5")} {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>
                      Email <span className="font-normal tracking-normal normal-case">(optional)</span>
                    </FormLabel>
                    <FormControl
                      as="input"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={cn(inputCls, "mt-1.5")}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consent_contact"
                render={({ field }) => (
                  <FormItem className="bg-paper flex flex-row items-start gap-3 rounded-xl p-3.5">
                    <FormControl
                      as="input"
                      type="checkbox"
                      className="accent-ink mt-0.5 h-[18px] w-[18px] flex-none"
                      checked={field.value === true}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.currentTarget.checked)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                    <div className="grid gap-1">
                      <FormLabel className="text-stone text-xs leading-[1.55] font-normal">{TCPA_CONSENT_TEXT}</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="turnstileToken"
                render={({ field }) => (
                  <FormItem>
                    {step === 2 ? (
                      <Turnstile
                        // Read process.env directly: Next only inlines NEXT_PUBLIC_*
                        // into the client bundle for literal references.
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
                        onToken={handleTurnstileToken}
                        action="lead-form"
                      />
                    ) : null}
                    <input type="hidden" {...field} value={field.value ?? ""} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setStep(1)} className="border-ink/20 hover:bg-paper h-[50px] rounded-full border bg-white px-[18px] text-sm font-semibold">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-gold text-ink hover:bg-gold-light flex h-[50px] flex-1 items-center justify-between rounded-full px-5 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  <span>{form.formState.isSubmitting ? "Sending…" : "Request Free Consultation"}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="text-stone m-0 text-xs">
                By submitting, you confirm you have read and agreed to our{" "}
                <a href="/legal/privacy" className="text-stone hover:text-ink underline underline-offset-2">
                  Privacy Policy
                </a>
                . Submitting this form does not create an attorney-client relationship.
              </p>
            </div>
          </form>
        </Form>
      )}

      <div className="border-ink/8 text-stone mt-5 flex flex-wrap gap-x-[18px] gap-y-2 border-t pt-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="text-gold-deep h-3.5 w-3.5" aria-hidden /> No fee unless we win
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="text-gold-deep h-3.5 w-3.5" aria-hidden /> Reply in 1 business hr
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Phone className="text-gold-deep h-3.5 w-3.5" aria-hidden /> Confidential intake
        </span>
      </div>
    </div>
  );
}

function safeJson(res: Response): Promise<{ error?: string; issues?: unknown }> {
  return res.json().catch(() => ({}));
}

/** Fire an analytics event (queued until PostHog loads). Never sends PII. */
function captureEvent(event: string, props?: Record<string, unknown>) {
  track(event, props);
}
