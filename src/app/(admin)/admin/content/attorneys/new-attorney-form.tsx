"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createAttorneyProfileAndRedirect } from "./actions";

export default function NewAttorneyForm() {
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [barNumber, setBarNumber] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New attorney
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fullName.trim() || !barNumber.trim()) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createAttorneyProfileAndRedirect(fd);
      if (result && !result.ok) toast.error(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        name="full_name"
        autoFocus
        required
        minLength={2}
        maxLength={160}
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.currentTarget.value)}
        className="h-9 w-56"
      />
      <Input
        name="bar_number"
        required
        minLength={1}
        maxLength={40}
        placeholder="CA Bar #"
        value={barNumber}
        onChange={(e) => setBarNumber(e.currentTarget.value)}
        className="h-9 w-32"
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending || !fullName.trim() || !barNumber.trim()}
      >
        {pending ? "Creating..." : "Create draft"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setFullName("");
          setBarNumber("");
        }}
        disabled={pending}
      >
        Cancel
      </Button>
    </form>
  );
}
