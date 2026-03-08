"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/ui/command-palette";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-dvh bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500">

            {/* Desktop sidebar — always visible on lg+ */}
            <div className="hidden lg:flex h-full shrink-0">
                <Sidebar />
            </div>

            {/* Mobile sidebar — vaul drawer for touch-friendly swipe-to-dismiss */}
            <Drawer.Root open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" />
                    <Drawer.Content
                        className="fixed inset-y-0 left-0 z-50 h-full outline-none lg:hidden"
                        aria-label="Navigation sidebar"
                    >
                        <Drawer.Title className="sr-only">Navigation</Drawer.Title>
                        <Sidebar onClose={() => setSidebarOpen(false)} />
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden relative min-w-0">
                {/* Command palette — mounted at shell level so it's always available */}
                <CommandPalette />

                <Topbar
                    onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                />

                <main className="relative flex-1 overflow-y-auto p-4 md:p-8">
                    {/* Subtle grid pattern background */}
                    <div className="absolute inset-0 grid-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

                    {/* Ambient blobs */}
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-glow delay-500" />

                    <div className="relative mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
