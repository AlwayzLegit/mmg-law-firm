import Link from "next/link";
import { Star } from "lucide-react";

import { TestimonialsEmptyGuide } from "@/components/admin/testimonials-empty-guide";
import { AdminPageHeader, EmptyNote, Panel, SearchForm } from "@/components/admin/ui";
import { sanitizeSearchTerm as sanitize } from "@/lib/search";
import { getServerSupabase } from "@/lib/supabase/server";

import NewTestimonialForm from "./new-testimonial-form";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function ContentTestimonialsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const rawQ = (params.q ?? "").trim();
  const q = sanitize(rawQ);

  const supabase = await getServerSupabase();
  let query = supabase
    .from("testimonials")
    .select(
      "id, client_initials, city, quote, rating, source, is_approved, display_order, created_at",
    )
    .order("is_approved", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (q)
    query = query.or(
      `quote.ilike.%${q}%,client_initials.ilike.%${q}%,city.ilike.%${q}%`,
    );

  const { data, error } = await query;

  const rows = data ?? [];
  const pending = rows.filter((r) => !r.is_approved);
  const approved = rows.filter((r) => r.is_approved);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Testimonials"
        description="Per CRPC §7.1, only approved testimonials appear publicly with the proximity disclaimer. Use initials, never full names."
        actions={<NewTestimonialForm />}
      />

      {rows.length > 0 || rawQ ? (
        <SearchForm
          className="mt-6"
          action="/admin/content/testimonials"
          value={rawQ}
          placeholder="Search quote, initials, or city"
          ariaLabel="Search testimonials"
          clearHref="/admin/content/testimonials"
        />
      ) : null}

      {error ? (
        <Panel className="mt-6">
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        </Panel>
      ) : rows.length === 0 && rawQ ? (
        <Panel className="mt-6">
          <EmptyNote>No testimonials match &ldquo;{rawQ}&rdquo;.</EmptyNote>
        </Panel>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <TestimonialsEmptyGuide />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <Panel title={`Pending review (${pending.length})`}>
            {pending.length === 0 ? (
              <EmptyNote>Nothing pending. New testimonials land here for attorney review.</EmptyNote>
            ) : (
              <List rows={pending} />
            )}
          </Panel>

          <Panel title={`Approved (${approved.length})`}>
            {approved.length === 0 ? (
              <EmptyNote>No approved testimonials yet. Once approved they&apos;ll appear on /reviews and on the homepage.</EmptyNote>
            ) : (
              <List rows={approved} />
            )}
          </Panel>
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
    <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
      {rows.map((t) => (
        <li key={t.id}>
          <Link
            href={`/admin/content/testimonials/${t.id}`}
            className="bg-ink/3 hover:bg-ink/6 text-foreground block rounded-[10px] px-4 py-3 text-[13px] no-underline transition-colors"
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="text-stone m-0">
                <strong className="text-foreground">{t.client_initials}</strong>
                {t.city ? ` · ${t.city}` : ""}
                {t.source ? ` · ${t.source}` : ""}
                {" · "}
                {new Date(t.created_at).toLocaleDateString("en-US")}
              </p>
              {t.rating ? <Stars value={t.rating} /> : null}
            </div>
            <p className="font-display text-foreground m-0 mt-1.5 line-clamp-2 text-[15px] italic">
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
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${v} of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden
          className={`h-3 w-3 ${i < v ? "fill-gold text-gold" : "text-ink/15"}`}
        />
      ))}
    </span>
  );
}
