"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    CheckSquare,
    X,
    Coins,
    ShieldAlert,
    History as HistoryIcon,
    Sparkles,
    FileCheck,
    Loader2,
    ChevronDown,
} from "lucide-react";

// ---------- Types ----------

export interface BulkAction {
    /** Unique key for this action */
    key: string;
    /** Display label */
    label: string;
    /** Icon component */
    icon: React.ReactNode;
    /** Tailwind classes for text/hover color */
    className?: string;
    /** Whether this action requires confirmation */
    confirm?: boolean;
    /** Confirmation message */
    confirmMessage?: string;
    /** Whether this action is currently loading */
    loading?: boolean;
    /** Whether this action is disabled */
    disabled?: boolean;
    /** Group label for dropdown grouping (optional) */
    group?: string;
}

export interface BulkActionBarProps {
    /** Set of selected item IDs */
    selectedIds: Set<string>;
    /** Total number of items on the current page */
    totalItems: number;
    /** Callback when an action is triggered */
    onAction: (actionKey: string, ids: string[]) => Promise<void> | void;
    /** Callback to clear selection */
    onClearSelection: () => void;
    /** Callback to select all items */
    onSelectAll?: () => void;
    /** Available bulk actions */
    actions: BulkAction[];
    /** Optional: noun for items (default: "items") */
    itemNoun?: string;
    /** Optional: accent color scheme */
    accentColor?: "amber" | "blue" | "emerald" | "slate";
}

// ---------- Color Maps ----------

const accentColors = {
    amber: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: "text-amber-600",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-800",
    },
    blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "text-blue-600",
        text: "text-blue-700",
        badge: "bg-blue-100 text-blue-800",
    },
    emerald: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        icon: "text-emerald-600",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-800",
    },
    slate: {
        bg: "bg-slate-50",
        border: "border-slate-200",
        icon: "text-slate-600",
        text: "text-slate-700",
        badge: "bg-slate-100 text-slate-800",
    },
};

// ---------- Component ----------

export function BulkActionBar({
    selectedIds,
    totalItems,
    onAction,
    onClearSelection,
    onSelectAll,
    actions,
    itemNoun = "items",
    accentColor = "amber",
}: BulkActionBarProps) {
    const [confirmingAction, setConfirmingAction] = useState<string | null>(null);
    const [runningAction, setRunningAction] = useState<string | null>(null);
    const [showMore, setShowMore] = useState(false);

    const colors = accentColors[accentColor];
    const count = selectedIds.size;

    if (count === 0) return null;

    const handleAction = async (action: BulkAction) => {
        if (action.confirm && confirmingAction !== action.key) {
            setConfirmingAction(action.key);
            return;
        }

        setConfirmingAction(null);
        setRunningAction(action.key);

        try {
            await onAction(action.key, Array.from(selectedIds));
        } finally {
            setRunningAction(null);
        }
    };

    const cancelConfirm = () => setConfirmingAction(null);

    // Split actions into primary (first 4) and overflow
    const primaryActions = actions.slice(0, 4);
    const overflowActions = actions.slice(4);

    return (
        <div
            className={`px-6 py-2.5 border-b ${colors.border} ${colors.bg} flex items-center gap-3 animate-in slide-in-from-top-1 duration-200`}
        >
            {/* Selection indicator */}
            <div className="flex items-center gap-2">
                <CheckSquare className={`h-4 w-4 ${colors.icon}`} />
                <span className={`text-sm font-medium ${colors.text}`}>
                    {count} {count === 1 ? itemNoun.replace(/s$/, "") : itemNoun}
                </span>
                {onSelectAll && count < totalItems && (
                    <button
                        onClick={onSelectAll}
                        className={`text-xs underline underline-offset-2 ${colors.text} hover:opacity-80`}
                    >
                        Select all {totalItems}
                    </button>
                )}
            </div>

            {/* Confirmation overlay */}
            {confirmingAction && (
                <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-700">
                        {actions.find(a => a.key === confirmingAction)?.confirmMessage ||
                            `Are you sure? This will affect ${count} ${itemNoun}.`}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => {
                            const action = actions.find(a => a.key === confirmingAction);
                            if (action) handleAction(action);
                        }}
                    >
                        Confirm
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-slate-500 hover:bg-slate-100"
                        onClick={cancelConfirm}
                    >
                        Cancel
                    </Button>
                </div>
            )}

            {/* Action buttons */}
            {!confirmingAction && (
                <div className="flex gap-1.5 ml-auto">
                    {primaryActions.map((action) => (
                        <Button
                            key={action.key}
                            variant="ghost"
                            size="sm"
                            className={`h-7 text-xs ${action.className || "text-slate-600 hover:bg-slate-100"}`}
                            onClick={() => handleAction(action)}
                            disabled={action.disabled || runningAction === action.key || action.loading}
                        >
                            {runningAction === action.key ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                                action.icon
                            )}
                            {action.label}
                        </Button>
                    ))}

                    {/* Overflow menu */}
                    {overflowActions.length > 0 && (
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-slate-500 hover:bg-slate-100"
                                onClick={() => setShowMore(!showMore)}
                            >
                                More <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                            {showMore && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMore(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[160px]">
                                        {overflowActions.map((action) => (
                                            <button
                                                key={action.key}
                                                className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-slate-50 ${
                                                    action.className || "text-slate-600"
                                                } ${action.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                                onClick={() => {
                                                    setShowMore(false);
                                                    handleAction(action);
                                                }}
                                                disabled={action.disabled || runningAction === action.key}
                                            >
                                                {runningAction === action.key ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    action.icon
                                                )}
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Clear selection */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        onClick={onClearSelection}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
        </div>
    );
}

// ---------- Preset Action Factories ----------

/**
 * Common bulk actions for findings pages.
 */
export function findingsBulkActions(): BulkAction[] {
    return [
        {
            key: "recover",
            label: "Recover",
            icon: <Coins className="h-3 w-3 mr-1" />,
            className: "text-emerald-600 hover:bg-emerald-100",
        },
        {
            key: "dispute",
            label: "Dispute",
            icon: <ShieldAlert className="h-3 w-3 mr-1" />,
            className: "text-red-600 hover:bg-red-100",
            confirm: true,
            confirmMessage: "Mark selected findings as disputed? This will generate dispute letters.",
        },
        {
            key: "createTasks",
            label: "Create Tasks",
            icon: <HistoryIcon className="h-3 w-3 mr-1" />,
            className: "text-amber-700 hover:bg-amber-100",
        },
        {
            key: "enrich",
            label: "Auto-Enrich",
            icon: <Sparkles className="h-3 w-3 mr-1" />,
            className: "text-violet-600 hover:bg-violet-100",
        },
        {
            key: "register",
            label: "Register",
            icon: <FileCheck className="h-3 w-3 mr-1" />,
            className: "text-blue-600 hover:bg-blue-100",
            confirm: true,
            confirmMessage: "Submit selected works for registration with PROs?",
        },
        {
            key: "ignore",
            label: "Ignore",
            icon: <X className="h-3 w-3 mr-1" />,
            className: "text-slate-500 hover:bg-slate-200",
        },
    ];
}

/**
 * Common bulk actions for catalog/works pages.
 */
export function catalogBulkActions(): BulkAction[] {
    return [
        {
            key: "enrich",
            label: "Auto-Enrich",
            icon: <Sparkles className="h-3 w-3 mr-1" />,
            className: "text-violet-600 hover:bg-violet-100",
        },
        {
            key: "register",
            label: "Register with PROs",
            icon: <FileCheck className="h-3 w-3 mr-1" />,
            className: "text-blue-600 hover:bg-blue-100",
            confirm: true,
            confirmMessage: "Submit selected works for registration?",
        },
    ];
}