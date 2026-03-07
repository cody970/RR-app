"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden relative">
                <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                <main className="relative flex-1 overflow-y-auto p-4 md:p-8">
                    {/* Subtle grid pattern background */}
                    <div className="absolute inset-0 grid-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

                    {/* Ambient Blobs for "Wow" factor */}
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
