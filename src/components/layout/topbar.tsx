"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Search, User as UserIcon, Menu, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "./notification-bell";

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { data: session } = useSession();

    const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
    const userInitial = session?.user?.email?.charAt(0).toUpperCase();

    return (
        <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 border-b border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-slate-950/50 backdrop-blur-2xl transition-all duration-300">
            <div className="flex flex-1 items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 flex-1">
                    {onMenuToggle && (
                        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                            <Menu className="h-5 w-5" />
                        </button>
                    )}
                    <div className="flex w-full max-w-md items-center relative group">
                        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                        <Input
                            type="text"
                            placeholder="Search catalog, ISRCs, ISWCs..."
                            className="w-full bg-slate-100/50 dark:bg-white/[0.03] border-transparent dark:border-white/5 pl-10 pr-16 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl h-9 focus-visible:ring-indigo-500/30 focus-visible:bg-white dark:focus-visible:bg-slate-900 focus-visible:border-indigo-500/20 transition-all duration-300"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-400 dark:text-slate-500 shadow-sm">
                            <Command className="h-2.5 w-2.5" />K
                        </div>
                    </div>
                </div>
                <div className="ml-4 flex items-center gap-4">
                    {/* Notifications */}
                    <NotificationBell />

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

                    {/* User */}
                    <div className="flex items-center gap-3 pl-1">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/15 ring-2 ring-white/10 dark:ring-white/5">
                            <span className="text-xs font-black text-white">
                                {userInitial || <UserIcon className="h-3.5 w-3.5" />}
                            </span>
                        </div>
                        <div className="hidden xl:block text-left">
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px] leading-none mb-1">{session?.user?.email?.split('@')[0]}</p>
                            <p className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase font-black tracking-widest">{userRole}</p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl h-8 px-3 transition-all duration-300"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        <span className="hidden lg:inline text-xs font-semibold">Sign Out</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
