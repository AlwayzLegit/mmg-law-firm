"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { changeAdminRole, removeAdmin } from "./actions";

const ROLES = ["owner", "staff", "intake"] as const;

/** Owner-only controls for one admin row: change role / revoke access. */
export default function AdminRowActions({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function onRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.currentTarget.value;
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    startTransition(async () => {
      const result = await changeAdminRole(fd);
      if (result.ok) toast.success("Role updated.");
      else toast.error(result.error);
    });
  }

  function onRemove() {
    if (!window.confirm("Revoke this admin's access?")) return;
    const fd = new FormData();
    fd.set("userId", userId);
    startTransition(async () => {
      const result = await removeAdmin(fd);
      if (result.ok) toast.success("Admin removed.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={role}
        onChange={onRoleChange}
        disabled={pending || isSelf}
        aria-label="Role"
        className="h-8 rounded-md border border-border bg-background px-2 text-xs capitalize focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r} className="capitalize">
            {r}
          </option>
        ))}
      </select>
      {isSelf ? (
        <span className="text-xs text-muted-foreground">You</span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onRemove}
          disabled={pending}
        >
          Remove
        </Button>
      )}
    </div>
  );
}
