/** Lightweight skeleton for a blog post while its data + MDX render. */
export default function BlogPostLoading() {
  return (
    <div className="container-prose animate-pulse py-16 md:py-20">
      <div className="bg-secondary h-4 w-32 rounded" />
      <div className="bg-secondary mt-6 h-10 w-full rounded" />
      <div className="bg-secondary mt-3 h-10 w-3/4 rounded" />
      <div className="bg-secondary/70 mt-6 h-4 w-48 rounded" />

      <div className="bg-secondary/50 mt-10 aspect-[16/9] w-full rounded-2xl" />

      <div className="mt-10 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-secondary/60 h-4 rounded"
            style={{ width: `${85 + ((i * 7) % 15)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
