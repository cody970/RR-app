"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Library, Disc3, CheckCircle2, XCircle, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

type CatalogTab = "works" | "recordings";

export default function CatalogPage() {
    const [tab, setTab] = useState<CatalogTab>("works");
    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type: tab, page: String(page) });
            if (query) params.set("q", query);
            const res = await fetch(`/api/catalog?${params}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items);
                setTotal(data.total);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [tab, page, query]);

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    useEffect(() => {
        setPage(1);
    }, [tab, query]);

    const totalPages = Math.ceil(total / 20) || 1;

    const [enrichingId, setEnrichingId] = useState<string | null>(null);

    const handleEnrich = async (id: string, title: string, currentId?: string) => {
        setEnrichingId(id);
        try {
            const res = await fetch("/api/catalog", {
                method: "POST",
                body: JSON.stringify({ id, type: tab, title, currentId }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.found) {
                    toast.success(`Synced with ${data.provider}${data.matchScore ? ` (${data.matchScore}% confidence)` : ""}`);
                    await fetchCatalog(); // Refresh list to see new ID
                } else {
                    toast.info("No match found in global databases.");
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setEnrichingId(null);
        }
    };

    const HealthBadge = ({ ok, label }: { ok: boolean; label: string }) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all duration-200 ${ok
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : "bg-red-50 text-red-600 border-red-200"
            }`}>
            {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {label}
        </span>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 px-2">Catalog Browser</h1>
                <p className="text-slate-500 px-2">Browse and search your works and recordings.</p>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-2">
                <div className="flex bg-slate-50 rounded-lg border border-slate-200 p-1">
                    <button
                        onClick={() => setTab("works")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${tab === "works"
                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                            : "text-slate-500 hover:text-slate-900"
                            }`}
                    >
                        <Library className="h-4 w-4" /> Works
                    </button>
                    <button
                        onClick={() => setTab("recordings")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${tab === "recordings"
                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                            : "text-slate-500 hover:text-slate-900"
                            }`}
                    >
                        <Disc3 className="h-4 w-4" /> Recordings
                    </button>
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={`Search ${tab} by title...`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200 shadow-sm"
                    />
                </div>

                <span className="text-sm text-slate-500">{total} {tab}</span>
            </div>

            {/* Table */}
            <div className="mx-2 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading catalog...</div>
                ) : items.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <Library className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No {tab} found</h3>
                        <p className="text-slate-500 mt-1 max-w-sm">
                            {query ? "Try a different search term." : "Import catalog data to get started."}
                        </p>
                        {!query && (
                            <a href="/dashboard/import" className="mt-4 text-amber-600 font-medium hover:underline text-sm">
                                Go to Import →
                            </a>
                        )}
                    </div>
                ) : tab === "works" ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Title</th>
                                    <th className="px-6 py-3">ISWC</th>
                                    <th className="px-6 py-3">Writers</th>
                                    <th className="px-6 py-3">Health</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((work: any) => (
                                    <tr key={work.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900">{work.title}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                            {work.iswc || <span className="text-red-500/70 italic">Missing</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {work.writers?.length > 0
                                                ? work.writers.map((ww: any) => ww.writer?.name).join(", ")
                                                : <span className="text-slate-400 italic">None</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 flex-wrap">
                                                <HealthBadge ok={!!work.iswc} label="ISWC" />
                                                <HealthBadge ok={work.registrations?.length > 0} label="Registered" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all ${enrichingId === work.id ? "animate-pulse" : ""}`}
                                                disabled={!!enrichingId || !!work.iswc}
                                                onClick={() => handleEnrich(work.id, work.title, work.iswc)}
                                            >
                                                {enrichingId === work.id ? "Syncing..." : work.iswc ? "Verified" : "Sync Global"}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Title</th>
                                    <th className="px-6 py-3">ISRC</th>
                                    <th className="px-6 py-3">Linked Work</th>
                                    <th className="px-6 py-3">Health</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((rec: any) => (
                                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900">{rec.title}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                            {rec.isrc || <span className="text-red-500/70 italic">Missing</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {rec.work?.title || <span className="text-slate-400 italic">Unlinked</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 flex-wrap">
                                                <HealthBadge ok={!!rec.isrc} label="ISRC" />
                                                <HealthBadge ok={!!rec.workId} label="Linked" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all ${enrichingId === rec.id ? "animate-pulse" : ""}`}
                                                disabled={!!enrichingId || !!rec.isrc}
                                                onClick={() => handleEnrich(rec.id, rec.title, rec.isrc)}
                                            >
                                                {enrichingId === rec.id ? "Syncing..." : rec.isrc ? "Verified" : "Sync Global"}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {total > 20 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
