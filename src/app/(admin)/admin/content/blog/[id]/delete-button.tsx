"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { deleteBlogPost } from "../actions";

export default function DeleteButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const ok = window.confirm(
      `Permanently delete "${title}"? This cannot be undone.`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await deleteBlogPost(fd);
      if (result.ok) {
        toast.success("Post deleted.");
        router.push("/admin/content/blog");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
      className="w-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {pending ? "Deleting..." : "Delete post"}
    </Button>
  );
}
