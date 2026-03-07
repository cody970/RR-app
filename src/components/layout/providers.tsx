"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "../ui/toast-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
