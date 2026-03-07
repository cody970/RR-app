"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, UploadCloud, ScanSearch, SearchCheck, FileCheck2, DollarSign, Briefcase, Workflow, Bot, FileText, Shield, Users, CreditCard, LogOut, Wallet } from "lucide-react";
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
        <div className="flex h-full w-64 flex-col bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl border-r border-slate-200/60 dark:border-white/5 transition-all duration-300">
            {/* Logo */}
            <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-slate-200/60 dark:border-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
                    RR
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Royalty<span className="text-gradient-gold">Radar</span>
                </h1>
            </div>

            {/* Nav */}
            <div className="flex flex-1 flex-col overflow-y-auto py-4">
                <nav className="flex-1 px-4 space-y-6">
                    {navSections.map((section) => (
                        <div key={section.label}>
                            <div className="px-3 mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                                    {section.label}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={onClose}
                                            className={`group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${isActive
                                                ? "bg-slate-900/5 dark:bg-white/5 text-indigo-600 dark:text-indigo-400"
                                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-900 dark:hover:text-slate-200"
                                                }`}
                                        >
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r-full shadow-[0_0_12px_rgba(79,70,229,0.4)]" />
                                            )}
                                            <item.icon
                                                className={`mr-3 h-[18px] w-[18px] flex-shrink-0 transition-all duration-300 ${isActive
                                                    ? "text-indigo-600 dark:text-indigo-400 scale-110"
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
            <div className="px-4 py-4 border-t border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-indigo-500/10">
                        RR
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">RoyaltyRadar</p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">v0.2.0 PRO</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300"
                        title="Sign out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
