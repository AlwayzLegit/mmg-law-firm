import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function ContentBlogAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, is_published, published_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Blog
      </h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts yet. {/* TODO(group-e): inline create/edit modal */}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">/{p.slug}</p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      p.is_published
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {p.is_published ? "Published" : "Draft"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Editor coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {/* TODO(group-e): inline post editor with markdown + hero image
              upload to Supabase Storage `blog-images` bucket, tag input,
              scheduled publish (`published_at` future date). */}
          For now, write posts directly in the Supabase Studio table editor
          and flip <code className="rounded bg-secondary px-1 py-0.5 text-xs">
            is_published
          </code>.
        </CardContent>
      </Card>
    </div>
  );
}
