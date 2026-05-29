"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FIRM, TCPA_CONSENT_TEXT } from "@/lib/constants";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { TIER_1_LOCATIONS } from "@/lib/data/locations";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  LeadSchema,
  leadFormDefaults,
  type LeadFormValues,
} from "@/lib/validation/lead";

import { Turnstile } from "./turnstile";

type LeadFormProps = {
  variant?: "compact" | "full";
  defaultPracticeArea?: string;
  defaultCitySlug?: string;
  defaultCountySlug?: string;
  headline?: string;
  description?: string;
  className?: string;
};

export function LeadForm({
  variant = "compact",
  defaultPracticeArea,
  defaultCitySlug,
  defaultCountySlug,
  headline = "Request a free consultation",
  description = "Tell us briefly what happened. We'll call you back within one business hour during office hours.",
  className,
}: LeadFormProps) {
  const isFull = variant === "full";

  // Type the third generic explicitly so Control<...> stays consistent —
  // otherwise zodResolver infers the transformed (output) type for
  // TTransformedValues, which conflicts with LeadFormValues used by Control.
  const form = useForm<LeadFormValues, unknown, LeadFormValues>({
    resolver: zodResolver(LeadSchema) as never,
    mode: "onBlur",
    defaultValues: {
      ...leadFormDefaults,
      practice_area: defaultPracticeArea ?? leadFormDefaults.practice_area,
      city_slug: defaultCitySlug ?? leadFormDefaults.city_slug,
      county_slug: defaultCountySlug ?? leadFormDefaults.county_slug,
    },
  });

  const [submitted, setSubmitted] = React.useState(false);

  const handleTurnstileToken = React.useCallback(
    (token: string) => {
      form.setValue("turnstileToken", token);
    },
    [form],
  );

  // Capture page metadata client-side once.
  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    form.setValue("source_url", window.location.href);
    form.setValue("referrer", document.referrer || undefined);
    const utmSource = sp.get("utm_source");
    if (utmSource) form.setValue("utm_source", utmSource);
    const utmMedium = sp.get("utm_medium");
    if (utmMedium) form.setValue("utm_medium", utmMedium);
    const utmCampaign = sp.get("utm_campaign");
    if (utmCampaign) form.setValue("utm_campaign", utmCampaign);
    const utmTerm = sp.get("utm_term");
    if (utmTerm) form.setValue("utm_term", utmTerm);
    const utmContent = sp.get("utm_content");
    if (utmContent) form.setValue("utm_content", utmContent);
    const gclid = sp.get("gclid");
    if (gclid) form.setValue("gclid", gclid);
  }, [form]);

  async function onSubmit(values: LeadFormValues) {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 429) {
        toast.error(
          "You've sent several requests recently. Please wait a moment and try again — or call us directly.",
        );
        return;
      }

      if (!res.ok) {
        const data = await safeJson(res);
        if (data?.error === "validation-failed" && data.issues) {
          const issues = data.issues as Record<string, string[]>;
          for (const [field, messages] of Object.entries(issues)) {
            if (messages?.[0]) {
              form.setError(field as keyof LeadFormValues, {
                message: messages[0],
              });
            }
          }
          toast.error("Please check the highlighted fields.");
          return;
        }
        if (data?.error === "turnstile-failed") {
          toast.error(
            `Bot-protection failed to load. Please call us at ${FIRM.phone} or email ${FIRM.intakeEmail}.`,
          );
          return;
        }
        toast.error(
          "We couldn't submit your request. Please try again, or call us directly.",
        );
        return;
      }

      setSubmitted(true);
      toast.success("We received your request — we'll be in touch shortly.");
      form.reset(leadFormDefaults);
    } catch {
      toast.error(
        "Network error. Please try again, or call us directly.",
      );
    }
  }

  if (submitted) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-success/30 bg-card p-7 shadow-[0_40px_80px_-40px_rgba(34,179,128,0.35)] ring-1 ring-success/10 md:p-9",
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-success/25 via-success/10 to-transparent blur-3xl"
        />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-success to-transparent"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success ring-4 ring-success/5">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-success">
            Received
          </p>
        </div>
        <h3 className="relative mt-5 font-display text-2xl font-medium leading-tight tracking-tight md:text-3xl">
          Your request is in.
        </h3>
        <p className="relative mt-3 leading-relaxed text-muted-foreground">
          We&apos;ll call you back within one business hour during office
          hours. If your matter is urgent, please call us directly.
        </p>
        <div className="relative mt-7 flex flex-wrap gap-3">
          <a
            href={`tel:${FIRM.phoneTel}`}
            className={cn(
              buttonVariants({ size: "marketing" }),
              "gap-2 py-3.5",
            )}
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call {FIRM.phone}
          </a>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className={cn(
              buttonVariants({ variant: "outline", size: "marketing" }),
              "py-3.5",
            )}
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/80 bg-card p-7 shadow-[0_40px_80px_-40px_rgba(20,30,80,0.28)] ring-1 ring-border/30 md:p-9",
        className,
      )}
    >
      {/* Decorative gradient corner — subtle premium-feeling */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-[var(--color-gold-500)]/20 via-primary/10 to-transparent blur-3xl"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-transparent"
      />

      <div className="relative mb-7 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Free consultation
          </p>
          <h3 className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight md:text-3xl">
            {headline}
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="relative grid gap-6"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Full name
                  </FormLabel>
                  <div className="relative mt-1.5">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                      aria-hidden
                    />
                    <FormControl
                      as={Input}
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className="h-12 pl-10 text-base shadow-sm"
                      {...field}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Phone
                  </FormLabel>
                  <div className="relative mt-1.5">
                    <Phone
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
                      aria-hidden
                    />
                    <FormControl
                      as={Input}
                      type="tel"
                      autoComplete="tel"
                      placeholder="(555) 555-1234"
                      className="h-12 pl-10 text-base shadow-sm"
                      {...field}
                    />
                  </div>
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
                <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Email <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
                </FormLabel>
                <div className="relative mt-1.5">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
                    aria-hidden
                  />
                  <FormControl
                    as={Input}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-12 pl-10 text-base shadow-sm"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {isFull ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="practice_area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Type of matter
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || undefined)}
                      >
                        <FormControl as={SelectTrigger} className="mt-1.5 h-12 text-base shadow-sm">
                          <SelectValue placeholder="Select an option" />
                        </FormControl>
                        <SelectContent>
                          {PRACTICE_AREAS.map((p) => (
                            <SelectItem key={p.slug} value={p.slug}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city_slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Where did it happen?
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => {
                          field.onChange(v || undefined);
                          const match = TIER_1_LOCATIONS.find(
                            (l) => l.citySlug === v,
                          );
                          if (match) {
                            form.setValue("county_slug", match.countySlug);
                          }
                        }}
                      >
                        <FormControl as={SelectTrigger} className="mt-1.5 h-12 text-base shadow-sm">
                          <SelectValue placeholder="Pick a city" />
                        </FormControl>
                        <SelectContent>
                          {TIER_1_LOCATIONS.map((l) => (
                            <SelectItem key={l.citySlug} value={l.citySlug}>
                              {l.cityName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="incident_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Date of incident{" "}
                      <span className="font-normal normal-case text-muted-foreground/70">(if known)</span>
                    </FormLabel>
                    <FormControl
                      as={Input}
                      type="date"
                      className="mt-1.5 h-12 text-base shadow-sm"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What happened?
                </FormLabel>
                <FormControl
                  as={Textarea}
                  rows={4}
                  maxLength={500}
                  placeholder="In a few sentences — type of incident, where, and how you're doing now."
                  className="mt-1.5 min-h-32 resize-none text-base leading-relaxed shadow-sm"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
                <FormDescription className="text-xs">
                  Do not include sensitive medical details — we&apos;ll discuss
                  those securely after we connect.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consent_contact"
            render={({ field }) => (
              <FormItem className="group/consent relative flex flex-row items-start gap-3.5 rounded-2xl border border-border/80 bg-secondary/40 p-4 transition-colors hover:border-primary/30 has-aria-checked-true:border-success/40 has-aria-checked-true:bg-success/5 md:p-5">
                <span
                  aria-hidden
                  className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-[var(--color-gold-500)]/60 opacity-0 transition-opacity group-has-aria-checked-true/consent:opacity-100"
                />
                <FormControl
                  as={Checkbox}
                  checked={field.value === true}
                  onCheckedChange={(v: boolean | "indeterminate") =>
                    field.onChange(v === true)
                  }
                  className="mt-0.5 size-5 shrink-0"
                />
                <div className="grid gap-1">
                  <FormLabel className="text-xs leading-relaxed font-normal text-foreground/85">
                    {TCPA_CONSENT_TEXT}
                  </FormLabel>
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
                <Turnstile
                  siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onToken={handleTurnstileToken}
                  action="lead-form"
                />
                <input type="hidden" {...field} value={field.value ?? ""} />
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="marketing"
            disabled={form.formState.isSubmitting}
            className="group/cta relative w-full justify-between overflow-hidden bg-gradient-to-r from-primary via-primary to-[var(--color-brand-700,#18298c)] py-4 text-base shadow-[0_10px_30px_-10px_rgba(43,70,216,0.55)] transition-all hover:shadow-[0_18px_40px_-12px_rgba(43,70,216,0.65)] hover:translate-y-[-1px]"
          >
            <span className="relative z-10 flex items-center gap-2 text-base font-medium">
              {form.formState.isSubmitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Sending…
                </>
              ) : (
                <>Request Free Consultation</>
              )}
            </span>
            <ArrowRight
              className="relative z-10 h-5 w-5 transition-transform group-hover/cta:translate-x-1"
              aria-hidden
            />
            <span
              aria-hidden
              className="absolute inset-y-0 left-[-30%] w-1/3 -skew-x-12 bg-white/15 opacity-0 transition-all duration-700 group-hover/cta:left-[120%] group-hover/cta:opacity-100"
            />
          </Button>

          {/* Trust strip below the CTA — three short, scannable proofs */}
          <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-5 text-[11px] leading-snug text-muted-foreground sm:gap-3">
            <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:text-left">
              <ShieldCheck className="h-4 w-4 flex-none text-primary" aria-hidden />
              <span>No fee unless we win</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:text-left">
              <CheckCircle2 className="h-4 w-4 flex-none text-primary" aria-hidden />
              <span>Reply in 1 business hr</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:text-left">
              <Phone className="h-4 w-4 flex-none text-primary" aria-hidden />
              <span>Confidential intake</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            By submitting, you confirm you have read and agreed to our{" "}
            <a
              href="/legal/privacy"
              className="underline underline-offset-2 hover:text-primary"
            >
              Privacy Policy
            </a>
            . Submitting this form does not create an attorney-client
            relationship.
          </p>
        </form>
      </Form>
    </div>
  );
}

function safeJson(res: Response): Promise<{ error?: string; issues?: unknown }> {
  return res.json().catch(() => ({}));
}
