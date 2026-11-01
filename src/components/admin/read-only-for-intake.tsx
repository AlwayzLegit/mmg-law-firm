import { canEdit, requireAdmin } from "@/lib/auth/require-admin";

/**
 * Wraps admin sections intake accounts may read but not change (content,
 * media, firm settings, templates). For intake, every input and button inside
 * is disabled through a disabled <fieldset>, and a notice says why; links
 * still work so they can browse. The server actions enforce the same rule
 * (requireEditor), this just keeps intake from hitting those errors.
 */
export default async function ReadOnlyForIntake({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();
  if (canEdit(profile.role)) return children;
  return (
    <>
      <p
        role="note"
        className="border-border bg-secondary/60 text-foreground mb-4 rounded-lg border px-4 py-3 text-sm"
      >
        Intake accounts can view this section but not change it. Ask an owner or
        staff member to make edits.
      </p>
      <fieldset disabled className="contents">
        {children}
      </fieldset>
    </>
  );
}
