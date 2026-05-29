import Link from "next/link";
import { Star } from "lucide-react";

import { TestimonialsEmptyGuide } from "@/components/admin/testimonials-empty-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import NewTestimonialForm from "./new-testimonial-form";

export default async function ContentTestimonialsAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("testimonials")
    .select(
      "id, client_initials, city, quote, rating, source, is_approved, display_order, created_at",
    )
    .order("is_approved", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const pending = rows.filter((r) => !r.is_approved);
  const approved = rows.filter((r) => r.is_approved);

  return (
    <div>
      <Link
        href="/admin/content/pages"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Content
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Testimonials
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per CRPC §7.1, only approved testimonials appear publicly with
            the proximity disclaimer. Use initials, never full names.
          </p>
        </div>
        <NewTestimonialForm />
      </div>

      {error ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <TestimonialsEmptyGuide />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Pending review ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing pending. New testimonials land here for attorney
                  review.
                </p>
              ) : (
                <List rows={pending} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Approved ({approved.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approved.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No approved testimonials yet. Once approved they&apos;ll
                  appear on /reviews and on the homepage.
                </p>
              ) : (
                <List rows={approved} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

type Row = {
  id: string;
  client_initials: string;
  city: string | null;
  quote: string;
  rating: number | null;
  source: string | null;
  is_approved: boolean;
  display_order: number;
  created_at: string;
};

function List({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((t) => (
        <li key={t.id} className="py-3">
          <Link
            href={`/admin/content/testimonials/${t.id}`}
            className="block text-sm hover:text-primary"
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t.client_initials}</strong>
                {t.city ? ` · ${t.city}` : ""}
                {t.source ? ` · ${t.source}` : ""}
                {" · "}
                {new Date(t.created_at).toLocaleDateString("en-US")}
              </p>
              {t.rating ? <Stars value={t.rating} /> : null}
            </div>
            <p className="mt-1 line-clamp-2 italic text-foreground">
              &ldquo;{t.quote}&rdquo;
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Stars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${v} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden
          className={`h-3 w-3 ${i < v ? "fill-amber-500 text-amber-500" : "text-muted"}`}
        />
      ))}
    </span>
  );
}
