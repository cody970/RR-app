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
        <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="flex flex-1 items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 flex-1">
                    {onMenuToggle && (
                        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                            <Menu className="h-5 w-5" />
                        </button>
                    )}
                    <div className="flex w-full max-w-md items-center relative group">
                        <Search className="absolute left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-amber-500" />
                        <Input
                            type="text"
                            placeholder="Search catalog by title, ISRC, ISWC..."
                            className="w-full bg-muted/50 border-input pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground rounded-xl h-9 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/30 transition-all duration-300"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted border border-border text-[10px] font-medium text-muted-foreground">
                            <Command className="h-2.5 w-2.5" />K
                        </div>
                    </div>
                </div>
                <div className="ml-4 flex items-center gap-3">
                    {/* Notifications */}
                    <NotificationBell />

                    {/* Divider */}
                    <div className="h-6 w-px bg-border" />

                    {/* User */}
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-md shadow-amber-500/15 ring-2 ring-amber-500/10">
                            <span className="text-xs font-bold text-white">
                                {userInitial || <UserIcon className="h-3.5 w-3.5" />}
                            </span>
                        </div>
                        <div className="hidden md:block text-sm">
                            <p className="font-medium text-foreground text-xs">{session?.user?.email}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{userRole}</p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl h-8 px-3 transition-all duration-200"
                    >
                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        <span className="hidden sm:inline text-xs">Sign Out</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
