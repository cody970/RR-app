"use client";

import { useState } from "react";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function PortalShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900">
            {/* Desktop portal sidebar */}
            <div className="hidden lg:flex">
                <PortalSidebar />
            </div>

            {/* Mobile portal sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="relative z-50 h-full w-72 animate-slide-in-left">
                        <PortalSidebar isOpen={true} onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
