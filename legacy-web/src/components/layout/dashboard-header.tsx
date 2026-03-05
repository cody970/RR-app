import React from "react";

interface DashboardHeaderProps {
    heading: string;
    text?: string;
    children?: React.ReactNode;
}

export function DashboardHeader({
    heading,
    text,
    children,
}: DashboardHeaderProps) {
    return (
        <div className="flex items-center justify-between px-2 pb-6">
            <div className="grid gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{heading}</h1>
                {text && <p className="text-lg text-slate-500">{text}</p>}
            </div>
            {children}
        </div>
    );
}
