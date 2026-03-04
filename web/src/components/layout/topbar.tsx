"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Search, User as UserIcon, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "./notification-bell";

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { data: session } = useSession();

    return (
        <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
            <div className="flex flex-1 items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 flex-1">
                    {onMenuToggle && (
                        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                            <Menu className="h-5 w-5" />
                        </button>
                    )}
                    <div className="flex w-full max-w-md items-center relative">
                        <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search catalog by title, ISRC, ISWC..."
                            className="w-full bg-slate-50 border-slate-200 pl-10 text-sm text-slate-700 placeholder:text-slate-400 rounded-xl h-9 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/30 transition-all duration-300"
                        />
                    </div>
                </div>
                <div className="ml-4 flex items-center gap-3">
                    {/* Notifications */}
                    <NotificationBell />

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-200" />

                    {/* User */}
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-md shadow-amber-500/15">
                            <span className="text-xs font-bold text-white">
                                {session?.user?.email?.charAt(0).toUpperCase() || <UserIcon className="h-3.5 w-3.5" />}
                            </span>
                        </div>
                        <div className="hidden md:block text-sm">
                            <p className="font-medium text-slate-700 text-xs">{session?.user?.email}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{(session?.user as any)?.role}</p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl h-8 px-3 transition-all duration-200"
                    >
                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        <span className="hidden sm:inline text-xs">Sign Out</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
