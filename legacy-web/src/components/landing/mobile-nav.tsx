"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <div className="md:hidden">
            <button
                onClick={() => setOpen(!open)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Toggle mobile menu"
            >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {open && (
                <div className="absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xl animate-slide-up z-50">
                    <nav className="flex flex-col px-6 py-4 space-y-1">
                        <Link
                            href="#features"
                            onClick={() => setOpen(false)}
                            className="py-3 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            Features
                        </Link>
                        <Link
                            href="#how-it-works"
                            onClick={() => setOpen(false)}
                            className="py-3 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            How it Works
                        </Link>
                        <Link
                            href="#pricing"
                            onClick={() => setOpen(false)}
                            className="py-3 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            Pricing
                        </Link>

                        <div className="pt-3 border-t border-slate-100 space-y-2">
                            <Link href="/login" onClick={() => setOpen(false)}>
                                <Button variant="outline" className="w-full h-11 rounded-xl border-slate-200 text-slate-700">
                                    Log in
                                </Button>
                            </Link>
                            <Link href="/register" onClick={() => setOpen(false)}>
                                <Button className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
                                    Start Free Trial
                                </Button>
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </div>
    );
}
