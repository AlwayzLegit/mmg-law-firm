import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function ContentTestimonialsAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("testimonials")
    .select("id, client_initials, city, quote, rating, is_approved, source")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Testimonials
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Per CRPC 7.1, only approved testimonials appear publicly with the
        proximity disclaimer.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">All testimonials</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No testimonials yet. {/* TODO(group-e): inline approve/edit */}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((t) => (
                <li key={t.id} className="py-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t.client_initials}
                      {t.city ? ` · ${t.city}` : ""}
                      {t.rating ? ` · ${t.rating}★` : ""}
                      {t.source ? ` · ${t.source}` : ""}
                    </p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        t.is_approved
                          ? "bg-success/10 text-success"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {t.is_approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-2 italic">&ldquo;{t.quote}&rdquo;</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
