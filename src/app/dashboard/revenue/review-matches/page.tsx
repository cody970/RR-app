"use client";

import { useEffect, useState, useCallback } from "react";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowRight,
    Loader2,
    Search,
    Filter,
    ChevronDown,
    Music,
    DollarSign,
    RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FuzzyMatch {
    lineId: string;
    statementId: string;
    statementTitle: string;
    statementArtist: string | null;
    statementIsrc: string | null;
    statementIswc: string | null;
    amount: number;
    uses: number;
    society: string | null;
    territory: string | null;
    matchedWorkId: string;
    matchedWorkTitle: string;
    matchedWorkIswc: string | null;
    createdAt: string;
}

type ReviewAction = "confirm" | "reject" | null;

export default function ReviewMatchesPage() {
    const [matches, setMatches] = useState<FuzzyMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [actions, setActions] = useState<Map<string, ReviewAction>>(new Map());
    const [total, setTotal] = useState(0);
    const [filterSociety, setFilterSociety] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [submitResult, setSubmitResult] = useState<{
        confirmed: number;
        rejected: number;
        corrected: number;
    } | null>(null);

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/statements/review-matches?limit=100");
            if (res.ok) {
                const data = await res.json();
                setMatches(data.matches || []);
                setTotal(data.total || 0);
            }
        } catch (e) {
            console.error("Failed to fetch matches:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    const setAction = (lineId: string, action: ReviewAction) => {
        setActions(prev => {
            const next = new Map(prev);
            if (next.get(lineId) === action) {
                next.delete(lineId); // Toggle off
            } else {
                next.set(lineId, action);
            }
            return next;
        });
    };

    const confirmAll = () => {
        const next = new Map<string, ReviewAction>();
        filteredMatches.forEach(m => next.set(m.lineId, "confirm"));
        setActions(next);
    };

    const rejectAll = () => {
        const next = new Map<string, ReviewAction>();
        filteredMatches.forEach(m => next.set(m.lineId, "reject"));
        setActions(next);
    };

    const submitReview = async () => {
        const reviewActions = Array.from(actions.entries())
            .filter(([, action]) => action !== null)
            .map(([lineId, action]) => ({
                lineId,
                action: action as "confirm" | "reject",
            }));

        if (reviewActions.length === 0) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/statements/review-matches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actions: reviewActions }),
            });

            if (res.ok) {
                const result = await res.json();
                setSubmitResult(result);
                setActions(new Map());
                // Refresh the list
                await fetchMatches();
            }
        } catch (e) {
            console.error("Failed to submit review:", e);
        } finally {
            setSubmitting(false);
        }
    };

    // Filter matches
    const filteredMatches = matches.filter(m => {
        if (filterSociety !== "all" && m.society !== filterSociety) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                m.statementTitle?.toLowerCase().includes(q) ||
                m.matchedWorkTitle?.toLowerCase().includes(q) ||
                m.statementArtist?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const societies = [...new Set(matches.map(m => m.society).filter(Boolean))];
    const pendingActions = actions.size;
    const totalFuzzyAmount = filteredMatches.reduce((sum, m) => sum + m.amount, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Review Fuzzy Matches</h1>
                <p className="text-slate-500 mt-1">
                    These statement lines were matched to catalog works using AI-powered fuzzy matching.
                    Review and confirm or reject each match before they flow into revenue calculations.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-50">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{total}</p>
                                <p className="text-xs text-slate-500">Pending Review</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-50">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    ${totalFuzzyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-slate-500">Potential Revenue</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50">
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {Array.from(actions.values()).filter(a => a === "confirm").length}
                                </p>
                                <p className="text-xs text-slate-500">Marked Confirmed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-50">
                                <XCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {Array.from(actions.values()).filter(a => a === "reject").length}
                                </p>
                                <p className="text-xs text-slate-500">Marked Rejected</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Success Banner */}
            {submitResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-emerald-800">
                            Review submitted successfully!
                        </p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                            {submitResult.confirmed} confirmed, {submitResult.rejected} rejected, {submitResult.corrected} corrected
                        </p>
                    </div>
                    <button
                        onClick={() => setSubmitResult(null)}
                        className="ml-auto text-emerald-600 hover:text-emerald-800"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Filters & Actions Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by title or artist..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                        </div>

                        {/* Society Filter */}
                        <select
                            value={filterSociety}
                            onChange={e => setFilterSociety(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                            <option value="all">All Societies</option>
                            {societies.map(s => (
                                <option key={s} value={s!}>{s}</option>
                            ))}
                        </select>

                        {/* Bulk Actions */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={confirmAll}
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Confirm All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={rejectAll}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject All
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Match List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    <span className="ml-3 text-slate-500">Loading fuzzy matches...</span>
                </div>
            ) : filteredMatches.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
                        <h3 className="text-lg font-semibold text-slate-900">All Clear!</h3>
                        <p className="text-slate-500 mt-1">
                            No fuzzy matches need review. All statement lines are either exactly matched or unmatched.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredMatches.map(match => {
                        const action = actions.get(match.lineId);
                        return (
                            <Card
                                key={match.lineId}
                                className={`transition-all ${
                                    action === "confirm"
                                        ? "ring-2 ring-emerald-300 bg-emerald-50/30"
                                        : action === "reject"
                                        ? "ring-2 ring-red-300 bg-red-50/30"
                                        : "hover:shadow-md"
                                }`}
                            >
                                <CardContent className="py-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                        {/* Statement Line (Left) */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="text-xs bg-slate-50">
                                                    {match.society || "Unknown"}
                                                </Badge>
                                                <span className="text-xs text-slate-400">Statement Line</span>
                                            </div>
                                            <p className="font-medium text-slate-900 truncate">
                                                {match.statementTitle}
                                            </p>
                                            {match.statementArtist && (
                                                <p className="text-sm text-slate-500 truncate">
                                                    {match.statementArtist}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                {match.statementIsrc && <span>ISRC: {match.statementIsrc}</span>}
                                                {match.statementIswc && <span>ISWC: {match.statementIswc}</span>}
                                                <span>{match.uses.toLocaleString()} uses</span>
                                                <span className="font-medium text-emerald-600">
                                                    ${match.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="hidden lg:flex items-center px-2">
                                            <ArrowRight className="h-5 w-5 text-amber-400" />
                                        </div>

                                        {/* Matched Work (Right) */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                                    <Music className="h-3 w-3 mr-1" />
                                                    Fuzzy Match
                                                </Badge>
                                                <span className="text-xs text-slate-400">Catalog Work</span>
                                            </div>
                                            <p className="font-medium text-slate-900 truncate">
                                                {match.matchedWorkTitle}
                                            </p>
                                            {match.matchedWorkIswc && (
                                                <p className="text-xs text-slate-400 mt-1">
                                                    ISWC: {match.matchedWorkIswc}
                                                </p>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => setAction(match.lineId, "confirm")}
                                                className={`p-2 rounded-lg transition-all ${
                                                    action === "confirm"
                                                        ? "bg-emerald-500 text-white shadow-sm"
                                                        : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600"
                                                }`}
                                                title="Confirm match"
                                            >
                                                <CheckCircle2 className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setAction(match.lineId, "reject")}
                                                className={`p-2 rounded-lg transition-all ${
                                                    action === "reject"
                                                        ? "bg-red-500 text-white shadow-sm"
                                                        : "bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600"
                                                }`}
                                                title="Reject match"
                                            >
                                                <XCircle className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Submit Bar */}
            {pendingActions > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">{pendingActions}</span> matches reviewed
                            <span className="mx-2">·</span>
                            <span className="text-emerald-600">
                                {Array.from(actions.values()).filter(a => a === "confirm").length} confirmed
                            </span>
                            <span className="mx-2">·</span>
                            <span className="text-red-600">
                                {Array.from(actions.values()).filter(a => a === "reject").length} rejected
                            </span>
                        </div>
                        <Button
                            onClick={submitReview}
                            disabled={submitting}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Submit Review ({pendingActions})
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}