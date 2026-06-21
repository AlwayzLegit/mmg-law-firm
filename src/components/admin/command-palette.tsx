"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileText,
  Gavel,
  Image as ImageIcon,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Newspaper,
  Quote,
  ScrollText,
  Search,
  Settings,
  Signpost,
  Star,
  Users,
} from "lucide-react";

type Command = {
  label: string;
  href: string;
  group: string;
  keywords?: string;
  icon: React.ComponentType<{ className?: string }>;
  newTab?: boolean;
  ownerOnly?: boolean;
};

type LeadHit = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
};

const COMMANDS: Command[] = [
  {
    label: "Dashboard",
    href: "/admin",
    group: "Go to",
    icon: LayoutDashboard,
  },
  { label: "Leads", href: "/admin/leads", group: "Go to", icon: Users },
  {
    label: "Leads board",
    href: "/admin/leads/board",
    group: "Leads",
    keywords: "kanban pipeline drag",
    icon: Users,
  },
  {
    label: "New leads",
    href: "/admin/leads?status=new",
    group: "Leads",
    keywords: "intake unread",
    icon: Users,
  },
  {
    label: "Follow-ups due",
    href: "/admin/leads?due=1",
    group: "Leads",
    keywords: "overdue reminder",
    icon: Users,
  },
  {
    label: "Unassigned leads",
    href: "/admin/leads?status=new&assignee=unassigned",
    group: "Leads",
    keywords: "owner",
    icon: Users,
  },
  {
    label: "Manage tags",
    href: "/admin/leads/tags",
    group: "Leads",
    keywords: "labels rename merge",
    icon: Users,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    group: "Go to",
    keywords: "reports stats conversion",
    icon: BarChart3,
  },
  {
    label: "Media library",
    href: "/admin/media",
    group: "Go to",
    keywords: "images uploads",
    icon: ImageIcon,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    group: "Go to",
    keywords: "firm team admins security",
    icon: Settings,
  },
  {
    label: "Audit log",
    href: "/admin/audit",
    group: "Go to",
    keywords: "history activity",
    icon: ScrollText,
    ownerOnly: true,
  },
  // Content
  {
    label: "Content overview",
    href: "/admin/content/pages",
    group: "Content",
    keywords: "pages review",
    icon: FileText,
  },
  {
    label: "Counties",
    href: "/admin/content/counties",
    group: "Content",
    icon: Building2,
  },
  {
    label: "Cities",
    href: "/admin/content/cities",
    group: "Content",
    icon: MapPin,
  },
  {
    label: "Location pages",
    href: "/admin/content/location-pages",
    group: "Content",
    keywords: "city practice local angle",
    icon: Signpost,
  },
  {
    label: "Practice areas",
    href: "/admin/content/practice-areas",
    group: "Content",
    icon: Gavel,
  },
  {
    label: "Blog",
    href: "/admin/content/blog",
    group: "Content",
    keywords: "posts articles",
    icon: Newspaper,
  },
  {
    label: "Testimonials",
    href: "/admin/content/testimonials",
    group: "Content",
    keywords: "reviews",
    icon: Quote,
  },
  {
    label: "Case results",
    href: "/admin/case-results",
    group: "Content",
    keywords: "recoveries verdicts settlements",
    icon: Star,
  },
  {
    label: "Legal pages",
    href: "/admin/content/legal",
    group: "Content",
    keywords: "privacy disclaimer terms",
    icon: ScrollText,
  },
  {
    label: "Redirects",
    href: "/admin/content/redirects",
    group: "Content",
    keywords: "301 url",
    icon: Megaphone,
  },
  // Misc
  {
    label: "View public site",
    href: "/",
    group: "Other",
    keywords: "preview live website",
    icon: Signpost,
    newTab: true,
  },
];

/**
 * Admin command palette. Press ⌘K / Ctrl-K (or tap the launcher in the
 * header) to jump to any admin destination. Doubles as the navigation
 * surface on mobile, where the sidebar is hidden.
 */
export default function CommandPalette({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [leads, setLeads] = useState<LeadHit[]>([]);

  const commands = useMemo(
    () => COMMANDS.filter((c) => !c.ownerOnly || isOwner),
    [isOwner],
  );

  const navResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Combined, navigable list: nav matches first, then lead hits. Lead hits
  // only count once the query is long enough to have triggered a fetch, so
  // stale results from a previous longer query stay hidden.
  const results = useMemo<Command[]>(() => {
    if (query.trim().length < 2) return navResults;
    const leadCmds: Command[] = leads.map((l) => ({
      label: l.full_name,
      href: `/admin/leads/${l.id}`,
      group: l.phone ?? l.status,
      icon: Users,
    }));
    return [...navResults, ...leadCmds];
  }, [navResults, leads, query]);

  // Debounced lead typeahead (queries the admin-only search endpoint).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/lead-search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { leads?: LeadHit[] };
        setLeads(json.leads ?? []);
      } catch {
        // Aborted or offline — leave the previous results in place.
      }
    }, 180);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    setLeads([]);
  }, []);

  const run = useCallback(
    (cmd: Command) => {
      close();
      if (cmd.newTab) {
        window.open(cmd.href, "_blank", "noopener");
      } else {
        router.push(cmd.href);
      }
    },
    [close, router],
  );

  // Global ⌘K / Ctrl-K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the active row in view as it changes.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = results[active];
      if (cmd) run(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border bg-secondary/50 text-muted-foreground hover:bg-secondary inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors"
        aria-label="Open command menu"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="border-border bg-background ml-1 hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command menu"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={close}
            aria-hidden
          />
          <div className="border-border bg-background relative z-10 w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl">
            <div className="border-border flex items-center gap-2 border-b px-3">
              <Search
                className="text-muted-foreground h-4 w-4 flex-none"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Jump to a page or search leads…"
                aria-label="Search admin and leads"
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <ul
              ref={listRef}
              className="max-h-[50vh] overflow-y-auto p-2"
              role="listbox"
            >
              {results.length === 0 ? (
                <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                  No matches.
                </li>
              ) : (
                results.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <li key={cmd.href} data-index={i}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onClick={() => run(cmd)}
                        onMouseMove={() => setActive(i)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                          i === active
                            ? "bg-secondary text-foreground"
                            : "text-foreground/90"
                        }`}
                      >
                        <Icon className="text-muted-foreground h-4 w-4 flex-none" />
                        <span className="flex-1">{cmd.label}</span>
                        <span className="text-muted-foreground text-xs">
                          {cmd.group}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
