"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    toasts: Toast[];
    toast: {
        success: (message: string) => void;
        error: (message: string) => void;
        info: (message: string) => void;
    };
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, variant: ToastVariant) => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    const toast = {
        success: (message: string) => addToast(message, "success"),
        error: (message: string) => addToast(message, "error"),
        info: (message: string) => addToast(message, "info"),
    };

    const variantStyles: Record<ToastVariant, string> = {
        success: "bg-emerald-950/90 border-emerald-700 text-emerald-200",
        error: "bg-red-950/90 border-red-700 text-red-200",
        info: "bg-violet-950/90 border-violet-700 text-violet-200",
    };

    return (
        <ToastContext.Provider value={{ toasts, toast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto px-5 py-3.5 rounded-xl border text-sm font-medium shadow-2xl backdrop-blur-md animate-toast-in ${variantStyles[t.variant]}`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx.toast;
}
