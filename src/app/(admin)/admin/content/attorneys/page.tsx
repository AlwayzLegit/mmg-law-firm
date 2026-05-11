import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import NewAttorneyForm from "./new-attorney-form";

export default async function ContentAttorneysAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("attorney_profiles")
    .select(
      "id, slug, full_name, job_title, bar_number, is_published, headshot_url, updated_at",
    )
    .order("display_order")
    .order("full_name");

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
            Attorney profiles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One row per attorney. The published row drives the bio page,
            attorney card on the homepage, and the Person JSON-LD used by
            search engines.
          </p>
        </div>
        <NewAttorneyForm />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Profiles ({data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attorneys yet. Click{" "}
              <strong className="text-foreground">New attorney</strong> to
              create one. The seed migration adds Mihran&apos;s row
              automatically.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((p) => (
                <li key={p.id} className="py-3">
                  <Link
                    href={`/admin/content/attorneys/${p.id}`}
                    className="flex items-center justify-between gap-3 text-sm hover:text-primary"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={p.headshot_url}
                        name={p.full_name}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.job_title ? `${p.job_title} · ` : ""}
                          CA Bar #{p.bar_number}
                          {" · "}
                          /attorneys/{p.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-2 text-xs">
                      <span
                        className={`rounded-md px-2 py-0.5 font-medium ${
                          p.is_published
                            ? "bg-success/10 text-success"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                      <time
                        dateTime={p.updated_at}
                        className="text-muted-foreground"
                      >
                        {new Date(p.updated_at).toLocaleDateString("en-US")}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Avatar({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 3);
  if (src) {
    // Plain <img> here — admin index, not size-critical, and avoids the
    // next/image remotePatterns gymnastics for arbitrary upload URLs.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-9 w-9 flex-none rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground"
    >
      {initials}
    </span>
  );
}
