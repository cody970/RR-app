"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/infra/utils";

/**
 * SparkNavigation — Spark Design System sidebar / top-nav wrapper.
 *
 * Renders a responsive sidebar on desktop and a drawer on mobile.
 */
export interface SparkNavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: Omit<SparkNavItem, "children">[];
}

export interface SparkNavigationProps {
  items: SparkNavItem[];
  /** Rendered in the top-left branding area */
  logo?: React.ReactNode;
  /** Rendered at the bottom of the sidebar */
  footer?: React.ReactNode;
  className?: string;
}

const SparkNavigation: React.FC<SparkNavigationProps> = ({
  items,
  logo,
  footer,
  className,
}) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItem = ({
    item,
    depth = 0,
  }: {
    item: SparkNavItem;
    depth?: number;
  }) => {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");
    const hasChildren = item.children && item.children.length > 0;
    const groupOpen = openGroups[item.label];

    if (hasChildren) {
      return (
        <li>
          <button
            type="button"
            aria-expanded={groupOpen}
            onClick={() => toggleGroup(item.label)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[var(--sprk-border-radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
              "text-slate-600 dark:text-slate-400",
              "hover:bg-[var(--sprk-color-neutral-100)] dark:hover:bg-[var(--sprk-color-neutral-200)]",
              depth > 0 && "pl-8"
            )}
          >
            {item.icon && (
              <span className="size-4 shrink-0" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn("size-4 transition-transform", groupOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          {groupOpen && (
            <ul role="list" className="mt-1 space-y-1">
              {item.children!.map((child) => (
                <NavItem key={child.href} item={child} depth={depth + 1} />
              ))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li>
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-[var(--sprk-border-radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-[var(--sprk-color-primary)]/10 text-[var(--sprk-color-primary)] dark:bg-[var(--sprk-color-primary)]/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-[var(--sprk-color-neutral-100)] dark:hover:bg-[var(--sprk-color-neutral-200)] hover:text-slate-900 dark:hover:text-white",
            depth > 0 && "pl-8"
          )}
        >
          {item.icon && (
            <span
              className={cn("size-4 shrink-0", isActive && "text-[var(--sprk-color-primary)]")}
              aria-hidden="true"
            >
              {item.icon}
            </span>
          )}
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                isActive
                  ? "bg-[var(--sprk-color-primary)] text-white"
                  : "bg-[var(--sprk-color-neutral-200)] text-slate-600 dark:bg-[var(--sprk-color-neutral-300)] dark:text-slate-300"
              )}
              aria-label={`${item.badge} notifications`}
            >
              {item.badge}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4">
      {/* Logo */}
      {logo && (
        <div className="px-3 py-2">{logo}</div>
      )}

      {/* Nav items */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2">
        <ul role="list" className="space-y-1">
          {items.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </ul>
      </nav>

      {/* Footer slot */}
      {footer && (
        <div className="border-t border-[var(--sprk-border-color)] px-3 py-4">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside
        data-spark="navigation"
        className={cn(
          "hidden lg:flex h-full w-64 shrink-0 flex-col",
          "border-r border-[var(--sprk-border-color)] bg-white dark:bg-[var(--sprk-color-neutral-50)]",
          className
        )}
        aria-label="Sidebar navigation"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile hamburger button ───────────────────────────────────── */}
      <button
        type="button"
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
        aria-controls="spark-mobile-nav"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-[var(--sprk-color-primary)] text-white shadow-lg lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <nav
            id="spark-mobile-nav"
            className={cn(
              "absolute inset-y-0 left-0 w-72",
              "border-r border-[var(--sprk-border-color)] bg-white dark:bg-[var(--sprk-color-neutral-50)]",
              "shadow-xl",
              "animate-slide-up"
            )}
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--sprk-border-color)] px-4">
              {logo}
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--sprk-color-neutral-100)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-2">
              <SidebarContent />
            </div>
          </nav>
        </div>
      )}
    </>
  );
};

SparkNavigation.displayName = "SparkNavigation";

export { SparkNavigation };
