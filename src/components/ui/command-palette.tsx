"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Library,
  UploadCloud,
  ScanSearch,
  SearchCheck,
  FileCheck2,
  DollarSign,
  BarChart3,
  Wallet,
  Briefcase,
  Workflow,
  Bot,
  FileText,
  Shield,
  Users,
  CreditCard,
  Monitor,
  Music2,
  Shuffle,
  ArrowRight,
  Search,
  X,
} from "lucide-react";

const commands = [
  {
    group: "Core",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Import Catalog", href: "/dashboard/import", icon: UploadCloud },
      { name: "Catalog", href: "/dashboard/catalog", icon: Library },
    ],
  },
  {
    group: "Analysis",
    items: [
      { name: "Audit Engine", href: "/dashboard/audit", icon: ScanSearch },
      { name: "Catalog Scanner", href: "/dashboard/catalog-scan", icon: SearchCheck },
      { name: "Registrations", href: "/dashboard/registrations", icon: FileCheck2 },
      { name: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "Content ID Monitoring", href: "/dashboard/content-id", icon: Monitor },
      { name: "MLC Matching", href: "/dashboard/mlc-matching", icon: Music2 },
    ],
  },
  {
    group: "Operations",
    items: [
      { name: "Sync Licensing", href: "/dashboard/sync", icon: Shuffle },
      { name: "Accounting Hub", href: "/dashboard/accounting", icon: Wallet },
      { name: "Licensing Hub", href: "/dashboard/licensing", icon: Briefcase },
      { name: "Tasks", href: "/dashboard/tasks", icon: Workflow },
      { name: "Agent Demo", href: "/dashboard/agent", icon: Bot },
      { name: "Reports", href: "/dashboard/reports", icon: FileText },
    ],
  },
  {
    group: "Settings",
    items: [
      { name: "Team Settings", href: "/dashboard/settings/team", icon: Users },
      { name: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
      { name: "Audit Trail", href: "/dashboard/settings/audit-logs", icon: Shield },
    ],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl">
        <Command
          className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-900/20 overflow-hidden"
          label="Command palette"
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-slate-100 dark:border-white/10 px-4 py-3 gap-3">
            <Search
              className="h-4 w-4 text-slate-400 flex-shrink-0"
              aria-hidden="true"
            />
            <Command.Input
              autoFocus
              placeholder="Search pages and actions..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            />
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              aria-label="Close command palette"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              ESC
            </button>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto py-2">
            <Command.Empty className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No results found.
            </Command.Empty>

            {commands.map((group) => (
              <Command.Group
                key={group.group}
                heading={group.group}
                className="[&>[cmdk-group-heading]]:px-4 [&>[cmdk-group-heading]]:py-2 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:font-bold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-[0.15em] [&>[cmdk-group-heading]]:text-slate-400 dark:[&>[cmdk-group-heading]]:text-slate-500"
              >
                {group.items.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.name}
                    onSelect={() => navigate(item.href)}
                    className="group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/10 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 group-aria-selected:bg-indigo-100 dark:group-aria-selected:bg-indigo-500/20 transition-colors">
                      <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <span className="flex-1">{item.name}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-aria-selected:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-slate-100 dark:border-white/10 px-4 py-2.5 flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[9px] font-bold border border-slate-200 dark:border-white/10">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[9px] font-bold border border-slate-200 dark:border-white/10">
                ↵
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[9px] font-bold border border-slate-200 dark:border-white/10">
                ESC
              </kbd>
              Close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
