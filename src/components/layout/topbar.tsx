"use client";

import { useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Search, User as UserIcon, Menu, Command } from "lucide-react";
import { NotificationBell } from "./notification-bell";

// Dispatch a synthetic keyboard event so CommandPalette's keydown listener opens
function openCommandPalette() {
    document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
}

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { data: session } = useSession();

    const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
    const userInitial = session?.user?.email?.charAt(0).toUpperCase();

    const handleSearchClick = useCallback(() => {
        openCommandPalette();
    }, []);

    return (
        <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 border-b border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-950/50 backdrop-blur-2xl transition-all duration-300">
            <div className="flex flex-1 items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">

                {/* Left: hamburger + search */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {onMenuToggle && (
                        <button
                            onClick={onMenuToggle}
                            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex-shrink-0"
                            aria-label="Open navigation"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        </button>
                    )}

                    {/* Search — clicking opens command palette */}
                    <button
                        type="button"
                        onClick={handleSearchClick}
                        aria-label="Open command palette (⌘K)"
                        className="flex w-full max-w-xs sm:max-w-md items-center gap-2 h-9 rounded-2xl bg-slate-100/50 dark:bg-white/[0.03] border border-transparent dark:border-white/5 px-3 text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-slate-200 dark:hover:border-white/10 transition-all duration-200 text-left"
                    >
                        <Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate hidden sm:block text-xs">Search catalog, ISRCs, ISWCs…</span>
                        <span className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-400 dark:text-slate-500 shadow-sm flex-shrink-0">
                            <Command className="h-2.5 w-2.5" aria-hidden="true" />K
                        </span>
                    </button>
                </div>

                {/* Right: notifications + user */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <NotificationBell />

                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

                    {/* User avatar + name */}
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/15 ring-2 ring-white/10 dark:ring-white/5 flex-shrink-0">
                            <span className="text-xs font-black text-white">
                                {userInitial || <UserIcon className="h-3.5 w-3.5" />}
                            </span>
                        </div>
                        <div className="hidden xl:block text-left">
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px] leading-none mb-1 truncate max-w-[120px]">
                                {session?.user?.email?.split("@")[0]}
                            </p>
                            <p className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase font-black tracking-widest">
                                {userRole}
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl h-8 px-2 sm:px-3 transition-all duration-300"
                        aria-label="Sign out"
                    >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden lg:inline text-xs font-semibold ml-2">Sign Out</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
