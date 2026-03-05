"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-card rounded-lg border border-border shadow-sm m-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        We encountered an unexpected error while rendering this part of the application.
                        Our team has been notified.
                    </p>
                    <Button
                        onClick={() => this.setState({ hasError: false })}
                        variant="outline"
                    >
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
