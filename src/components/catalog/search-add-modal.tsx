"use client";

import { useState, useCallback, useRef } from "react";
import { Search, Plus, X, Loader2, Music, Disc3, Library } from "lucide-react";
import { Button } from "@/components/ui/button";

type SearchType = "work" | "recording" | "isrc" | "iswc";

interface MBWorkResult {
    id: string;
    title: string;
    iswcs: string[];
    type?: string;
    relations?: { type: string; "target-type": string; artist?: { name: string } }[];
}

interface MBRecordingResult {
    id: string;
    title: string;
    isrcs: string[];
    length?: number;
    artists: string[];
    releases?: { id: string; title: string; date?: string }[];
}

type SearchResult = MBWorkResult | MBRecordingResult;

interface SearchAddModalProps {
    open: boolean;
    onClose: () => void;
    onAdded: () => void;
}

export function SearchAddModal({ open, onClose, onAdded }: SearchAddModalProps) {
    const [searchType, setSearchType] = useState<SearchType>("work");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Manual entry mode
    const [manualMode, setManualMode] = useState(false);
    const [manualTitle, setManualTitle] = useState("");
    const [manualId, setManualId] = useState(""); // ISWC or ISRC
    const [manualArtist, setManualArtist] = useState("");
    const [manualWriter, setManualWriter] = useState("");
    const [manualType, setManualType] = useState<"work" | "recording">("work");

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = useCallback(async () => {
        if (query.length < 2) return;
        setSearching(true);
        setError(null);
        setResults([]);
        setSuccess(null);
        try {
            const params = new URLSearchParams({ q: query, type: searchType, limit: "10" });
            const res = await fetch(`/api/musicbrainz/search?${params}`);
            if (res.status === 429) {
                setError("Rate limit reached. Wait a moment and try again.");
                return;
            }
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || "Search failed");
                return;
            }
            const data = await res.json();
            setResults(data.results || []);
            if ((data.results || []).length === 0) {
                setError("No results found. Try a different query or add manually.");
            }
        } catch {
            setError("Network error during search");
        } finally {
            setSearching(false);
        }
    }, [query, searchType]);

    const handleAddWork = async (result: MBWorkResult) => {
        setAdding(result.id);
        setError(null);
        setSuccess(null);
        try {
            const writers: { name: string; splitPercent: number }[] = [];
            if (result.relations) {
                for (const rel of result.relations) {
                    if (rel["target-type"] === "artist" && rel.artist?.name) {
                        writers.push({ name: rel.artist.name, splitPercent: 100 });
                    }
                }
            }
            const res = await fetch("/api/catalog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "work",
                    title: result.title,
                    iswc: result.iswcs?.[0] || null,
                    writers,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || "Failed to add work");
                return;
            }
            setSuccess(`"${result.title}" added to catalog!`);
            onAdded();
        } catch {
            setError("Network error while adding work");
        } finally {
            setAdding(null);
        }
    };

    const handleAddRecording = async (result: MBRecordingResult) => {
        setAdding(result.id);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch("/api/catalog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "recording",
                    title: result.title,
                    isrc: result.isrcs?.[0] || null,
                    artistName: result.artists?.join(", ") || null,
                    durationSec: result.length ? Math.round(result.length / 1000) : null,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || "Failed to add recording");
                return;
            }
            setSuccess(`"${result.title}" added to catalog!`);
            onAdded();
        } catch {
            setError("Network error while adding recording");
        } finally {
            setAdding(null);
        }
    };

    const handleManualAdd = async () => {
        if (!manualTitle.trim()) {
            setError("Title is required");
            return;
        }
        setAdding("manual");
        setError(null);
        setSuccess(null);
        try {
            const body = manualType === "work"
                ? {
                    type: "work" as const,
                    title: manualTitle.trim(),
                    iswc: manualId.trim() || null,
                    writers: manualWriter.trim()
                        ? [{ name: manualWriter.trim(), splitPercent: 100 }]
                        : [],
                }
                : {
                    type: "recording" as const,
                    title: manualTitle.trim(),
                    isrc: manualId.trim() || null,
                    artistName: manualArtist.trim() || null,
                };

            const res = await fetch("/api/catalog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || "Failed to add item");
                return;
            }
            setSuccess(`"${manualTitle}" added to catalog!`);
            setManualTitle("");
            setManualId("");
            setManualArtist("");
            setManualWriter("");
            onAdded();
        } catch {
            setError("Network error while adding");
        } finally {
            setAdding(null);
        }
    };

    const reset = () => {
        setQuery("");
        setResults([]);
        setError(null);
        setSuccess(null);
        setManualMode(false);
        setManualTitle("");
        setManualId("");
        setManualArtist("");
        setManualWriter("");
    };

    if (!open) return null;

    const isWorkSearch = searchType === "work" || searchType === "iswc";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => { reset(); onClose(); }}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Music className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Add to Catalog</h2>
                            <p className="text-xs text-slate-500">Search MusicBrainz or add manually</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { reset(); onClose(); }}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {/* Mode toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setManualMode(false)}
                            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${!manualMode
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            <Search className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                            Search Databases
                        </button>
                        <button
                            onClick={() => setManualMode(true)}
                            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${manualMode
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            <Plus className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                            Manual Entry
                        </button>
                    </div>

                    {!manualMode ? (
                        <>
                            {/* Search type selector */}
                            <div className="flex gap-1 bg-slate-50 rounded-lg border border-slate-200 p-1">
                                {(["work", "recording", "iswc", "isrc"] as SearchType[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => { setSearchType(t); setResults([]); setError(null); }}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${searchType === t
                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                            : "text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        {t === "work" && <Library className="inline h-3 w-3 mr-1 -mt-0.5" />}
                                        {t === "recording" && <Disc3 className="inline h-3 w-3 mr-1 -mt-0.5" />}
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Search bar */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={
                                            searchType === "isrc" ? "Enter ISRC code..." :
                                            searchType === "iswc" ? "Enter ISWC code..." :
                                            `Search ${searchType}s by title...`
                                        }
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                    />
                                </div>
                                <Button
                                    onClick={handleSearch}
                                    disabled={searching || query.length < 2}
                                    className="bg-amber-500 hover:bg-amber-600 text-white px-4"
                                >
                                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                                </Button>
                            </div>

                            {/* Results */}
                            {results.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 font-medium">{results.length} results from MusicBrainz</p>
                                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                        {results.map((r) => (
                                            <div
                                                key={r.id}
                                                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30 transition-all"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                                        {isWorkSearch && (r as MBWorkResult).iswcs?.length > 0 && (
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                ISWC: {(r as MBWorkResult).iswcs[0]}
                                                            </span>
                                                        )}
                                                        {!isWorkSearch && (r as MBRecordingResult).artists?.length > 0 && (
                                                            <span className="text-xs text-slate-500">
                                                                {(r as MBRecordingResult).artists.join(", ")}
                                                            </span>
                                                        )}
                                                        {!isWorkSearch && (r as MBRecordingResult).isrcs?.length > 0 && (
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                ISRC: {(r as MBRecordingResult).isrcs[0]}
                                                            </span>
                                                        )}
                                                        {!isWorkSearch && (r as MBRecordingResult).length && (
                                                            <span className="text-xs text-slate-400">
                                                                {Math.floor((r as MBRecordingResult).length! / 60000)}:
                                                                {String(Math.floor(((r as MBRecordingResult).length! % 60000) / 1000)).padStart(2, "0")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                                                    disabled={adding === r.id}
                                                    onClick={() => isWorkSearch
                                                        ? handleAddWork(r as MBWorkResult)
                                                        : handleAddRecording(r as MBRecordingResult)
                                                    }
                                                >
                                                    {adding === r.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <><Plus className="h-3.5 w-3.5 mr-1" />Add</>
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Manual entry form */
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setManualType("work")}
                                    className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all ${manualType === "work"
                                        ? "bg-amber-100 text-amber-700 border border-amber-300"
                                        : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                                        }`}
                                >
                                    <Library className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                                    Work
                                </button>
                                <button
                                    onClick={() => setManualType("recording")}
                                    className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all ${manualType === "recording"
                                        ? "bg-amber-100 text-amber-700 border border-amber-300"
                                        : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                                        }`}
                                >
                                    <Disc3 className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                                    Recording
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={manualTitle}
                                    onChange={(e) => setManualTitle(e.target.value)}
                                    placeholder="Song title"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    {manualType === "work" ? "ISWC" : "ISRC"}
                                </label>
                                <input
                                    type="text"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    placeholder={manualType === "work" ? "T-123.456.789-0" : "US-S1Z-03-00001"}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                />
                            </div>

                            {manualType === "work" ? (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Writer Name</label>
                                    <input
                                        type="text"
                                        value={manualWriter}
                                        onChange={(e) => setManualWriter(e.target.value)}
                                        placeholder="Writer/Composer name"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Artist Name</label>
                                    <input
                                        type="text"
                                        value={manualArtist}
                                        onChange={(e) => setManualArtist(e.target.value)}
                                        placeholder="Performing artist"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                    />
                                </div>
                            )}

                            <Button
                                onClick={handleManualAdd}
                                disabled={!manualTitle.trim() || adding === "manual"}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {adding === "manual" ? (
                                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</>
                                ) : (
                                    <><Plus className="h-4 w-4 mr-2" />Add to Catalog</>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Success/Error messages */}
                    {success && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                            <Plus className="h-4 w-4 shrink-0" />
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                            <X className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
