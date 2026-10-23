"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  changeAdminRole,
  getInviteLink,
  removeAdmin,
  resendInvite,
} from "./actions";

const ROLES = ["owner", "staff", "intake"] as const;

/** Owner-only controls for one admin row: change role / revoke access, and
 *  for a pending invitee (no password yet) resend or copy their invite link. */
export default function AdminRowActions({
  userId,
  role,
  isSelf,
  pending,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
  /** True while the admin has not chosen a password (invite not accepted). */
  pending: boolean;
}) {
  const [busy, startTransition] = React.useTransition();

  function withUser(): FormData {
    const fd = new FormData();
    fd.set("userId", userId);
    return fd;
  }

  function onRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = withUser();
    fd.set("role", e.currentTarget.value);
    startTransition(async () => {
      const result = await changeAdminRole(fd);
      if (result.ok) toast.success("Role updated.");
      else toast.error(result.error);
    });
  }

  function onRemove() {
    if (!window.confirm("Revoke this admin's access?")) return;
    startTransition(async () => {
      const result = await removeAdmin(withUser());
      if (result.ok) toast.success("Admin removed.");
      else toast.error(result.error);
    });
  }

  function onResend() {
    startTransition(async () => {
      const result = await resendInvite(withUser());
      if (result.ok) toast.success("Invite re-sent.");
      else toast.error(result.error);
    });
  }

  function onCopyLink() {
    startTransition(async () => {
      const result = await getInviteLink(withUser());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      try {
        await navigator.clipboard.writeText(result.url);
        toast.success("Invite link copied. It works once and expires in an hour.");
      } catch {
        // Clipboard can be blocked (insecure context, permissions). Show the
        // link so the owner can still copy it by hand.
        window.prompt("Copy this invite link:", result.url);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {pending && !isSelf ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={onResend}
            disabled={busy}
          >
            Resend invite
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCopyLink}
            disabled={busy}
          >
            Copy link
          </Button>
        </>
      ) : null}
      <select
        defaultValue={role}
        onChange={onRoleChange}
        disabled={busy || isSelf}
        aria-label="Role"
        className="border-input h-8 rounded-md border bg-transparent px-2 text-xs capitalize outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
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
          disabled={busy}
        >
          Remove
        </Button>
      )}
    </div>
  );
}
