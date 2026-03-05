"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Library,
    UploadCloud,
    ScanSearch,
    SearchCheck,
    FileCheck2,
    DollarSign,
    Briefcase,
    Workflow,
    Bot,
    FileText,
    Shield,
    Users,
    CreditCard,
    LogOut,
    Wallet,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navSections = [
    {
        label: "Core",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Import", href: "/dashboard/import", icon: UploadCloud },
            { name: "Catalog", href: "/dashboard/catalog", icon: Library },
        ],
    },
    {
        label: "Analysis",
        items: [
            { name: "Audit Engine", href: "/dashboard/audit", icon: ScanSearch },
            { name: "Catalog Scanner", href: "/dashboard/catalog-scan", icon: SearchCheck },
            { name: "Registrations", href: "/dashboard/registrations", icon: FileCheck2 },
            { name: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
        ],
    },
    {
        label: "Operations",
        items: [
            { name: "Accounting Hub", href: "/dashboard/accounting", icon: Wallet },
            { name: "Licensing Hub", href: "/dashboard/licensing", icon: Briefcase },
            { name: "Tasks", href: "/dashboard/tasks", icon: Workflow },
            { name: "Agent Demo", href: "/dashboard/agent", icon: Bot },
            { name: "Reports", href: "/dashboard/reports", icon: FileText },
        ],
    },
    {
        label: "Settings",
        items: [
            { name: "Team", href: "/dashboard/settings/team", icon: Users },
            { name: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
            { name: "Audit Trail", href: "/dashboard/settings/audit-logs", icon: Shield },
        ],
    },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col bg-white/80 dark:bg-sidebar/80 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50">
            {/* Logo */}
            <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-slate-200/80 dark:border-slate-700/50">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-black text-white shadow-md shadow-amber-500/20">
                    RR
                </div>
                <h1 className="text-lg font-bold text-gradient-gold">
                    RoyaltyRadar
                </h1>
            </div>

            {/* Nav */}
            <div className="flex flex-1 flex-col overflow-y-auto py-3">
                <nav className="flex-1 px-3 space-y-5">
                    {navSections.map((section) => (
                        <div key={section.label}>
                            <div className="px-3 mb-2">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    {section.label}
                                </span>
                            </div>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={onClose}
                                            className={`group relative flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive
                                                ? "bg-gradient-to-r from-amber-50 to-yellow-50/50 dark:from-amber-500/10 dark:to-yellow-500/5 text-amber-700 dark:text-amber-400 shadow-sm shadow-amber-500/5"
                                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                                                }`}
                                        >
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-amber-500 to-yellow-500 rounded-r-full shadow-sm shadow-amber-500/30" />
                                            )}
                                            <item.icon
                                                className={`mr-3 h-[18px] w-[18px] flex-shrink-0 transition-all duration-200 ${isActive
                                                    ? "text-amber-600 dark:text-amber-400"
                                                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:scale-110"
                                                    }`}
                                                aria-hidden="true"
                                            />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Footer */}
            <div className="px-3 py-3 border-t border-slate-200/80 dark:border-slate-700/50">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-amber-500/15">
                        RR
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">RoyaltyRadar</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">v0.2.0</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                        title="Sign out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
