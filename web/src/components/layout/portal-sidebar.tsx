"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Library,
    DollarSign,
    Settings,
    LogOut,
    X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
    { name: "Overview", href: "/portal", icon: LayoutDashboard },
    { name: "Catalog", href: "/portal/catalog", icon: Library },
    { name: "Earnings", href: "/portal/earnings", icon: DollarSign },
    { name: "Settings", href: "/portal/settings", icon: Settings },
];

export function PortalSidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r border-slate-200/80">
            {/* Logo + Mobile Close */}
            <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-md shadow-indigo-500/20">
                        WP
                    </div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Workspace
                    </h1>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <div className="flex flex-1 flex-col overflow-y-auto py-4">
                <nav className="flex-1 space-y-0.5 px-3">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onClose}
                                className={`group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full" />
                                )}
                                <item.icon
                                    className={`mr-3 h-[18px] w-[18px] flex-shrink-0 transition-all duration-200 ${isActive
                                        ? "text-indigo-600"
                                        : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                                        }`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Footer */}
            <div className="px-3 py-3 border-t border-slate-200/80">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-indigo-500/15">
                        WP
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">Workspace</p>
                        <p className="text-xs text-slate-400">Portal v1.0</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                        title="Sign out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
