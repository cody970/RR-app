import { Library, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataStateProps {
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    emptyMessage?: string;
    emptyAction?: React.ReactNode;
    loadingMessage?: string;
    onRetry?: () => void;
    children: React.ReactNode;
}

export function DataState({
    loading,
    error,
    empty,
    emptyMessage = "No items found",
    emptyAction,
    loadingMessage = "Loading data...",
    onRetry,
    children
}: DataStateProps) {
    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p>{loadingMessage}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col items-center gap-4 text-center shadow-sm">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                    <h3 className="font-semibold text-red-800">Something went wrong</h3>
                    <p className="text-sm mt-1">{error}</p>
                </div>
                {onRetry && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        className="bg-white border-red-200 text-red-700 hover:bg-red-100"
                    >
                        Try Again
                    </Button>
                )}
            </div>
        );
    }

    if (empty) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-slate-200 shadow-sm">
                <Library className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">{emptyMessage}</h3>
                {emptyAction && <div className="mt-4">{emptyAction}</div>}
            </div>
        );
    }

    return <>{children}</>;
}
