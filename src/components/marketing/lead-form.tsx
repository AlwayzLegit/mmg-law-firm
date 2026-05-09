"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Phone } from "lucide-react";
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
          "relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-[0_30px_60px_-30px_rgba(20,30,80,0.25)] md:p-8",
          className,
        )}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success to-transparent"
        />
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path
                d="M5 10l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">
            Received
          </p>
        </div>
        <h3 className="mt-4 font-display text-2xl font-medium tracking-tight md:text-3xl">
          Your request is in.
        </h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          We&apos;ll call you back within one business hour during office
          hours. If your matter is urgent, please call us directly.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`tel:${FIRM.phoneTel}`}
            className={cn(
              buttonVariants({ size: "marketing" }),
              "gap-2",
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
        "relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-[0_30px_60px_-30px_rgba(20,30,80,0.18)] md:p-8",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-transparent"
      />

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Free consultation
          </p>
          <h3 className="mt-2 font-display text-2xl font-medium tracking-tight md:text-3xl">
            {headline}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="grid gap-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl as={Input} autoComplete="name" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl
                    as={Input}
                    type="tel"
                    autoComplete="tel"
                    placeholder="(555) 555-1234"
                    {...field}
                  />
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
                <FormLabel>
                  Email <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl
                  as={Input}
                  type="email"
                  autoComplete="email"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {isFull ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="practice_area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of matter</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || undefined)}
                      >
                        <FormControl as={SelectTrigger}>
                          <SelectValue placeholder="Select" />
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
                      <FormLabel>Where did it happen?</FormLabel>
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
                        <FormControl as={SelectTrigger}>
                          <SelectValue placeholder="City" />
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
                    <FormLabel>
                      Date of incident{" "}
                      <span className="text-muted-foreground">(if known)</span>
                    </FormLabel>
                    <FormControl
                      as={Input}
                      type="date"
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
                <FormLabel>What happened?</FormLabel>
                <FormControl
                  as={Textarea}
                  rows={4}
                  maxLength={500}
                  placeholder="In a few sentences — type of incident, where, and how you're doing now."
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
                <FormDescription>
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
              <FormItem className="flex flex-row items-start gap-3 rounded-xl border border-border bg-secondary/30 p-4">
                <FormControl
                  as={Checkbox}
                  checked={field.value === true}
                  onCheckedChange={(v: boolean | "indeterminate") =>
                    field.onChange(v === true)
                  }
                />
                <div className="grid gap-1">
                  <FormLabel className="text-xs leading-relaxed font-normal text-foreground/80">
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
                  onToken={(t) => form.setValue("turnstileToken", t)}
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
            className="group/cta w-full justify-between"
          >
            <span>
              {form.formState.isSubmitting
                ? "Sending..."
                : "Request Free Consultation"}
            </span>
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
              aria-hidden
            />
          </Button>

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
