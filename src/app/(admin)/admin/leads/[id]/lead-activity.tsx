import {
  CircleCheck,
  CirclePlus,
  FileText,
  Flag,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

export type ActivityEvent = {
  id: string;
  action: string;
  diff: Record<string, unknown> | null;
  ts: string;
  actorLabel: string;
};

/** Map an audit action code to a friendly label + icon. */
function describe(e: ActivityEvent): { label: string; Icon: LucideIcon } {
  const d = e.diff ?? {};
  switch (e.action) {
    case "create":
      return { label: "Lead created", Icon: CirclePlus };
    case "create_spam":
      return { label: "Flagged as spam on submission", Icon: Flag };
    case "status_change":
      return {
        label: `Status changed: ${String(d.from ?? "?")} → ${String(d.to ?? "?")}`,
        Icon: CircleCheck,
      };
    case "conflict_check":
      return {
        label: `Conflict check ran — ${String(d.hits ?? 0)} hit(s)`,
        Icon: ShieldCheck,
      };
    case "note_added":
      return { label: "Note added", Icon: FileText };
    case "assigned":
      return { label: "Assigned to an admin", Icon: UserCheck };
    case "unassigned":
      return { label: "Unassigned", Icon: UserCheck };
    case "follow_up_set":
      return { label: "Follow-up reminder set", Icon: CircleCheck };
    case "follow_up_clear":
      return { label: "Follow-up reminder cleared", Icon: CircleCheck };
    default:
      return { label: e.action.replace(/_/g, " "), Icon: CircleCheck };
  }
}

export default function LeadActivity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No recorded activity yet.</p>
    );
  }
  return (
    <ul className="space-y-4">
      {events.map((e) => {
        const { label, Icon } = describe(e);
        return (
          <li key={e.id} className="flex gap-3">
            <span className="bg-secondary text-muted-foreground mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm">{label}</p>
              <p className="text-muted-foreground text-xs">
                {e.actorLabel} ·{" "}
                {new Date(e.ts).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
