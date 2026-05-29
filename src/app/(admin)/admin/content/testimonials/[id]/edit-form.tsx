"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { updateTestimonial } from "../actions";
import { TESTIMONIAL_SOURCES } from "../constants";

type Props = {
  id: string;
  client_initials: string;
  city: string;
  practice_area_id: string;
  quote: string;
  rating: number;
  source: string;
  display_order: number;
  practiceAreas: { id: string; name: string }[];
};

export default function EditForm(props: Props) {
  const [initials, setInitials] = React.useState(props.client_initials);
  const [city, setCity] = React.useState(props.city);
  const [practice, setPractice] = React.useState(props.practice_area_id);
  const [quote, setQuote] = React.useState(props.quote);
  const [rating, setRating] = React.useState(props.rating);
  const [source, setSource] = React.useState(props.source);
  const [order, setOrder] = React.useState(props.display_order);
  const [pending, startTransition] = React.useTransition();

  const dirty =
    initials !== props.client_initials ||
    city !== props.city ||
    practice !== props.practice_area_id ||
    quote !== props.quote ||
    rating !== props.rating ||
    source !== props.source ||
    order !== props.display_order;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateTestimonial(fd);
      if (result.ok) toast.success("Saved.");
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={onSave} className="grid gap-6">
      <input type="hidden" name="id" value={props.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="quote"
            required
            minLength={10}
            maxLength={1500}
            rows={5}
            value={quote}
            onChange={(e) => setQuote(e.currentTarget.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {quote.length} / 1500 chars. Quote should be the client&apos;s
            actual words — paraphrasing changes the legal posture.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attribution</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Client initials"
            hint="No full names — CRPC §7.1."
          >
            <Input
              name="client_initials"
              required
              maxLength={10}
              value={initials}
              onChange={(e) => setInitials(e.currentTarget.value.toUpperCase())}
            />
          </Field>
          <Field label="City (optional)">
            <Input
              name="city"
              maxLength={80}
              value={city}
              onChange={(e) => setCity(e.currentTarget.value)}
              placeholder="Glendale"
            />
          </Field>
          <Field label="Practice area (optional)">
            <select
              name="practice_area_id"
              value={practice}
              onChange={(e) => setPractice(e.currentTarget.value)}
              className="h-11 w-full rounded-xl border border-input bg-transparent px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(20,30,80,0.04)] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option value="">—</option>
              {props.practiceAreas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select
              name="source"
              value={source}
              onChange={(e) => setSource(e.currentTarget.value)}
              className="h-11 w-full rounded-xl border border-input bg-transparent px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(20,30,80,0.04)] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option value="">—</option>
              {TESTIMONIAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Star rating">
            <div className="flex items-center gap-1">
              <input type="hidden" name="rating" value={rating || ""} />
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className="rounded-md p-1 transition-colors hover:bg-secondary"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      n <= rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground"
                    }`}
                    aria-hidden
                  />
                </button>
              ))}
              {rating > 0 ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {rating} / 5 — click again to clear
                </span>
              ) : (
                <span className="ml-2 text-xs text-muted-foreground">
                  No rating
                </span>
              )}
            </div>
          </Field>
          <Field
            label="Display order"
            hint="Lower numbers show first. Default 100."
          >
            <Input
              name="display_order"
              type="number"
              min={0}
              max={9999}
              value={order}
              onChange={(e) =>
                setOrder(parseInt(e.currentTarget.value, 10) || 0)
              }
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
