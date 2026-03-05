"use client";

import { useState, useEffect, useCallback } from "react";
import {
    X, Search, ChevronRight, ChevronLeft, Loader2, Download, Send,
    CheckCircle2, Sparkles, AlertTriangle, Wand2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------

interface Work {
    id: string;
    title: string;
    iswc: string | null;
    writers?: { writer: { name: string } }[];
}

interface EnrichedWork extends Work {
    enriched?: boolean;
    enriching?: boolean;
    enrichedIswc?: string;
    enrichedCredits?: { name: string; role: string; ipiNameNumber?: string }[];
    enrichmentProvider?: string;
    missingFields?: string[];
}

interface RegisterWizardProps {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
    works: Work[];
    gaps?: { id: string; title: string; society: string; iswc: string | null; artistName: string | null }[];
}

const SOCIETIES = [
    { id: "ASCAP", label: "ASCAP", desc: "Performing rights" },
    { id: "BMI", label: "BMI", desc: "Performing rights" },
    { id: "SESAC", label: "SESAC", desc: "Performing rights" },
    { id: "MLC", label: "The MLC", desc: "Mechanical licensing" },
    { id: "HFA", label: "Harry Fox Agency", desc: "Mechanical licensing" },
    { id: "SoundExchange", label: "SoundExchange", desc: "Digital performance" },
];

export default function RegisterWizard({ open, onClose, onComplete, works, gaps }: RegisterWizardProps) {
    const [step, setStep] = useState(1);
    const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());
    const [selectedGapIds, setSelectedGapIds] = useState<Set<string>>(new Set());
    const [selectedSocieties, setSelectedSocieties] = useState<Set<string>>(new Set(["ASCAP", "BMI"]));
    const [searchQuery, setSearchQuery] = useState("");
    const [publisherName, setPublisherName] = useState("");
    const [publisherIpi, setPublisherIpi] = useState("");
    const [coPublisherSplit, setCoPublisherSplit] = useState(5);
    const [method, setMethod] = useState<"TUNEREGISTRY" | "CWR_GENERATE">("TUNEREGISTRY");
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Auto-fill state
    const [enrichedWorks, setEnrichedWorks] = useState<Map<string, EnrichedWork>>(new Map());
    const [autoFilling, setAutoFilling] = useState(false);
    const [autoFillComplete, setAutoFillComplete] = useState(false);
    const [autoFillStats, setAutoFillStats] = useState({ enriched: 0, ipisFound: 0, iswcsFound: 0 });
    const [lookingUpIpi, setLookingUpIpi] = useState(false);
    const [ipiLookupResult, setIpiLookupResult] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedWorks(new Set());
            setSelectedGapIds(new Set());
            setResult(null);
            setEnrichedWorks(new Map());
            setAutoFillComplete(false);
            setAutoFillStats({ enriched: 0, ipisFound: 0, iswcsFound: 0 });
            setIpiLookupResult(null);
        }
    }, [open]);

    if (!open) return null;

    const useGaps = gaps && gaps.length > 0;
    const totalSteps = 4;

    const filteredWorks = works.filter(w =>
        w.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredGaps = gaps?.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const toggleWork = (id: string) => {
        const next = new Set(selectedWorks);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedWorks(next);
    };
    const toggleGap = (id: string) => {
        const next = new Set(selectedGapIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedGapIds(next);
    };
    const toggleSociety = (id: string) => {
        const next = new Set(selectedSocieties);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedSocieties(next);
    };
    const selectAllWorks = () => {
        if (useGaps) {
            setSelectedGapIds(new Set(filteredGaps.map(g => g.id)));
        } else {
            setSelectedWorks(new Set(filteredWorks.map(w => w.id)));
        }
    };

    const canProceed = () => {
        if (step === 1) return useGaps ? selectedGapIds.size > 0 : selectedWorks.size > 0;
        if (step === 2) return selectedSocieties.size > 0;
        if (step === 3) return true;
        return false;
    };

    // ---------- Auto-Fill Logic ----------

    const enrichSelectedWorks = async () => {
        setAutoFilling(true);
        setAutoFillComplete(false);
        let enriched = 0, ipisFound = 0, iswcsFound = 0;

        const selectedWorkItems = works.filter(w => selectedWorks.has(w.id));
        const newEnriched = new Map(enrichedWorks);

        for (const work of selectedWorkItems) {
            try {
                // Call our enrichment API for each work
                const res = await fetch("/api/enrich", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: work.title,
                        currentId: work.iswc || undefined,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    const entry: EnrichedWork = {
                        ...work,
                        enriched: data.found,
                        enrichmentProvider: data.provider,
                        missingFields: [],
                    };

                    // Capture enriched ISWC
                    if (data.externalIswc && !work.iswc) {
                        entry.enrichedIswc = data.externalIswc;
                        iswcsFound++;
                    }

                    // Capture credits with IPI numbers from Muso.ai
                    if (data.credits && data.credits.length > 0) {
                        entry.enrichedCredits = data.credits;
                        const ipis = data.credits.filter((c: any) => c.ipiNameNumber);
                        ipisFound += ipis.length;
                    }

                    // Flag missing fields
                    if (!work.iswc && !data.externalIswc) entry.missingFields!.push("ISWC");
                    if (!work.writers?.length && !data.credits?.length) entry.missingFields!.push("Writers");

                    if (data.found) enriched++;
                    newEnriched.set(work.id, entry);
                }
            } catch (e) {
                console.error(`Enrichment failed for ${work.title}:`, e);
                newEnriched.set(work.id, {
                    ...work,
                    enriched: false,
                    missingFields: ["ISWC", "Writers"],
                });
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 150));
        }

        setEnrichedWorks(newEnriched);
        setAutoFillStats({ enriched, ipisFound, iswcsFound });
        setAutoFilling(false);
        setAutoFillComplete(true);
    };

    const lookupPublisherIpi = async () => {
        if (!publisherName.trim()) return;
        setLookingUpIpi(true);
        setIpiLookupResult(null);
        try {
            const res = await fetch("/api/muso/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "find-writer-ipi",
                    writerName: publisherName.trim(),
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.ipiNameNumber) {
                    setPublisherIpi(data.ipiNameNumber);
                    setIpiLookupResult("found");
                } else {
                    setIpiLookupResult("not_found");
                }
            }
        } catch {
            setIpiLookupResult("error");
        } finally {
            setLookingUpIpi(false);
        }
    };

    // Auto-enrich when moving to step 2 (if not already done)
    const handleNextStep = () => {
        if (step === 1 && !autoFillComplete && selectedWorks.size > 0 && !useGaps) {
            // Trigger enrichment silently when leaving step 1
            enrichSelectedWorks();
        }
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            if (method === "CWR_GENERATE") {
                const res = await fetch("/api/registrations/cwr/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        workIds: useGaps ? [] : Array.from(selectedWorks),
                        publisherName,
                        publisherIpi,
                        coPublisherSplit,
                    }),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `registration_${Date.now()}.cwr`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setResult({ success: true, method: "CWR_GENERATE" });
                } else {
                    const data = await res.json();
                    setResult({ success: false, error: data.error });
                }
            } else {
                const res = await fetch("/api/registrations/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        workIds: useGaps ? undefined : Array.from(selectedWorks),
                        gapIds: useGaps ? Array.from(selectedGapIds) : undefined,
                        societies: Array.from(selectedSocieties),
                        method,
                        publisherName,
                        publisherIpi,
                        coPublisherSplit,
                    }),
                });
                const data = await res.json();
                setResult(data);
            }
        } catch (e) {
            setResult({ success: false, error: "Network error" });
        } finally {
            setSubmitting(false);
            setStep(5);
        }
    };

    // Count works with issues
    const worksWithIssues = Array.from(enrichedWorks.values()).filter(
        w => (w.missingFields?.length || 0) > 0
    ).length;
    const worksFullyEnriched = Array.from(enrichedWorks.values()).filter(w => w.enriched).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Register Works</h2>
                        <p className="text-sm text-slate-500">
                            {step <= totalSteps ? `Step ${step} of ${totalSteps}` : "Complete"}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-3">
                    <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-amber-500" : "bg-slate-200"
                                }`} />
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Step 1: Select Works */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">
                                    Select {useGaps ? "Gaps" : "Works"} to Register
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Choose which {useGaps ? "unregistered items" : "works"} you want to submit. We&apos;ll auto-fill missing data.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by title..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                                    />
                                </div>
                                <Button size="sm" variant="outline" onClick={selectAllWorks} className="text-xs">
                                    Select All
                                </Button>
                            </div>

                            <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
                                {useGaps ? filteredGaps.map(gap => (
                                    <label key={gap.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedGapIds.has(gap.id)}
                                            onChange={() => toggleGap(gap.id)}
                                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{gap.title}</p>
                                            <p className="text-xs text-slate-500">
                                                {gap.artistName || "Unknown"} · {gap.society} · {gap.iswc || "No ISWC"}
                                            </p>
                                        </div>
                                    </label>
                                )) : filteredWorks.map(work => {
                                    const ew = enrichedWorks.get(work.id);
                                    const hasMissing = !work.iswc && !ew?.enrichedIswc;
                                    return (
                                        <label key={work.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedWorks.has(work.id)}
                                                onChange={() => toggleWork(work.id)}
                                                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{work.title}</p>
                                                    {ew?.enriched && (
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {ew?.enrichedIswc ? (
                                                        <span className="text-emerald-600">✓ {ew.enrichedIswc}</span>
                                                    ) : (
                                                        work.iswc || <span className={hasMissing && selectedWorks.has(work.id) ? "text-amber-500" : ""}>No ISWC</span>
                                                    )}
                                                    {ew?.enrichedCredits && (
                                                        <span className="text-emerald-600 ml-2">· {ew.enrichedCredits.length} credits found</span>
                                                    )}
                                                </p>
                                            </div>
                                            {hasMissing && selectedWorks.has(work.id) && (
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                            )}
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500">
                                    {useGaps ? selectedGapIds.size : selectedWorks.size} selected
                                </p>
                                {!useGaps && selectedWorks.size > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={enrichSelectedWorks}
                                        disabled={autoFilling}
                                        className="text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
                                    >
                                        {autoFilling ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> Checking...</>
                                        ) : autoFillComplete ? (
                                            <><RefreshCw className="w-3 h-3" /> Re-check</>
                                        ) : (
                                            <><Wand2 className="w-3 h-3" /> Auto-fill missing data</>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {/* Auto-fill results banner */}
                            {autoFillComplete && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                    <div className="flex items-start gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                        <div className="text-xs text-emerald-800">
                                            <p className="font-semibold mb-1">Auto-fill complete</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                                <span>{autoFillStats.enriched} works enriched</span>
                                                {autoFillStats.iswcsFound > 0 && (
                                                    <span>· {autoFillStats.iswcsFound} ISWCs found</span>
                                                )}
                                                {autoFillStats.ipisFound > 0 && (
                                                    <span>· {autoFillStats.ipisFound} IPI numbers resolved</span>
                                                )}
                                            </div>
                                            {worksWithIssues > 0 && (
                                                <p className="text-amber-700 mt-1">
                                                    ⚠ {worksWithIssues} work(s) still missing data — registration will proceed with available info.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Choose Societies */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">Target Societies</h3>
                                <p className="text-sm text-slate-500">Where should these works be registered?</p>
                            </div>

                            {/* Enrichment progress banner */}
                            {autoFilling && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                    <div className="flex items-center gap-2 text-xs text-blue-700">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Auto-filling missing data in the background...</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {SOCIETIES.map(s => (
                                    <label
                                        key={s.id}
                                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${selectedSocieties.has(s.id)
                                            ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400/30"
                                            : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSocieties.has(s.id)}
                                            onChange={() => toggleSociety(s.id)}
                                            className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                                            <p className="text-xs text-slate-500">{s.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Publisher Info with Auto-Fill */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">Publisher Information</h3>
                                <p className="text-sm text-slate-500">
                                    Set up your co-publisher split. We&apos;ll try to find your IPI number automatically.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Your Publisher Name</label>
                                    <input
                                        type="text"
                                        value={publisherName}
                                        onChange={e => { setPublisherName(e.target.value); setIpiLookupResult(null); }}
                                        placeholder="e.g. My Music Publishing LLC"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Publisher IPI Number</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={publisherIpi}
                                            onChange={e => setPublisherIpi(e.target.value)}
                                            placeholder="e.g. 123456789"
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={lookupPublisherIpi}
                                            disabled={lookingUpIpi || !publisherName.trim()}
                                            className="text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 flex-shrink-0"
                                        >
                                            {lookingUpIpi ? (
                                                <><Loader2 className="w-3 h-3 animate-spin" /> Looking up...</>
                                            ) : (
                                                <><Wand2 className="w-3 h-3" /> Look up IPI</>
                                            )}
                                        </Button>
                                    </div>
                                    {/* IPI lookup result messages */}
                                    {ipiLookupResult === "found" && (
                                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            IPI found via Muso.ai and auto-filled!
                                        </p>
                                    )}
                                    {ipiLookupResult === "not_found" && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            IPI not found for &quot;{publisherName}&quot;. Enter manually or continue without it.
                                        </p>
                                    )}
                                    {ipiLookupResult === "error" && (
                                        <p className="text-xs text-red-500 mt-1">Lookup failed. You can enter manually.</p>
                                    )}
                                    {!ipiLookupResult && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            Your IPI/CAE number from your PRO.
                                            {publisherName.trim() && " Click \"Look up IPI\" to search automatically."}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Co-Publisher Split: <strong>{coPublisherSplit}%</strong>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={50}
                                        value={coPublisherSplit}
                                        onChange={e => setCoPublisherSplit(Number(e.target.value))}
                                        className="w-full accent-amber-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>You: {100 - coPublisherSplit}%</span>
                                        <span>Admin fee: {coPublisherSplit}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Enriched credits preview */}
                            {autoFillComplete && worksFullyEnriched > 0 && (
                                <Card className="border-emerald-200 bg-emerald-50/50">
                                    <CardContent className="p-3">
                                        <div className="flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-emerald-800">
                                                <p className="font-semibold">Auto-filled writer data</p>
                                                <p className="text-emerald-700 mt-0.5">
                                                    Found verified credits for {worksFullyEnriched} work(s) including{" "}
                                                    {autoFillStats.ipisFound > 0 ? `${autoFillStats.ipisFound} IPI number(s)` : "writer names"} via Muso.ai.
                                                    This data will be included in your registration.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="border-slate-200 bg-slate-50">
                                <CardContent className="p-3">
                                    <p className="text-xs text-slate-600">
                                        <strong>How it works:</strong> We register as a co-publisher with a {coPublisherSplit}% share.
                                        The remaining {100 - coPublisherSplit}% flows directly to your PRO account.
                                        Unlike traditional admin publishers, your royalties never pass through us.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Missing data warning */}
                            {!publisherIpi && !publisherName && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div className="text-xs text-amber-800">
                                            <p className="font-semibold">Optional: Publisher info improves matching</p>
                                            <p>Adding your publisher name and IPI helps PROs match your works faster. You can still proceed without them.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Review & Submit */}
                    {step === 4 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">Review & Submit</h3>
                                <p className="text-sm text-slate-500">Review your registration details before submitting.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-600">Works to register</span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        {useGaps ? selectedGapIds.size : selectedWorks.size}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-600">Target societies</span>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        {Array.from(selectedSocieties).map(s => (
                                            <Badge key={s} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                                {s}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-600">Publisher</span>
                                    <span className="text-sm text-slate-900">{publisherName || <span className="text-slate-400">Not set</span>}</span>
                                </div>
                                {publisherIpi && (
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-slate-600">IPI Number</span>
                                        <span className="text-sm text-slate-900 font-mono">{publisherIpi}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-600">Split</span>
                                    <span className="text-sm text-slate-900">{100 - coPublisherSplit}% / {coPublisherSplit}%</span>
                                </div>
                                {autoFillComplete && (
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-sm text-slate-600">Auto-filled</span>
                                        <div className="flex gap-1.5">
                                            {autoFillStats.iswcsFound > 0 && (
                                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    {autoFillStats.iswcsFound} ISWCs
                                                </Badge>
                                            )}
                                            {autoFillStats.ipisFound > 0 && (
                                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    {autoFillStats.ipisFound} IPIs
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                {autoFillStats.enriched} enriched
                                            </Badge>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Data completeness indicator */}
                            {autoFillComplete && worksWithIssues > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div className="text-xs text-amber-800">
                                            <p className="font-semibold">{worksWithIssues} work(s) have incomplete data</p>
                                            <p>Registration will proceed with the data available. Missing ISWCs or credits may be requested by the PRO later.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Submission Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all ${method === "TUNEREGISTRY"
                                            ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400/30"
                                            : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <input type="radio" name="method" value="TUNEREGISTRY" checked={method === "TUNEREGISTRY"} onChange={() => setMethod("TUNEREGISTRY")} className="sr-only" />
                                        <Send className="w-6 h-6 text-amber-600" />
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-900">Auto-Register</p>
                                            <p className="text-xs text-slate-500">Submit via TuneRegistry API</p>
                                        </div>
                                    </label>
                                    <label
                                        className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all ${method === "CWR_GENERATE"
                                            ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400/30"
                                            : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <input type="radio" name="method" value="CWR_GENERATE" checked={method === "CWR_GENERATE"} onChange={() => setMethod("CWR_GENERATE")} className="sr-only" />
                                        <Download className="w-6 h-6 text-slate-600" />
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-900">Download CWR</p>
                                            <p className="text-xs text-slate-500">Upload to PRO portals manually</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Results */}
                    {step === 5 && result && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            {result.success !== false ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Registration Submitted!</h3>
                                    <div className="text-center space-y-1">
                                        {result.method === "CWR_GENERATE" ? (
                                            <p className="text-sm text-slate-600">
                                                CWR file downloaded. Upload to your PRO portal(s) to complete registration.
                                            </p>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-600">
                                                    {result.submitted || 0} work(s) submitted for registration.
                                                </p>
                                                {result.failed > 0 && (
                                                    <p className="text-sm text-red-600">
                                                        {result.failed} failed. Check batch details for more info.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <Button onClick={() => { onComplete(); onClose(); }} className="bg-amber-500 hover:bg-amber-600 text-white">
                                        Done
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                        <X className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Submission Failed</h3>
                                    <p className="text-sm text-slate-600">{result.error || "An unexpected error occurred."}</p>
                                    <Button variant="outline" onClick={() => setStep(4)}>
                                        Try Again
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step <= totalSteps && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                        <Button
                            variant="ghost"
                            onClick={() => step === 1 ? onClose() : setStep(step - 1)}
                            className="text-slate-600"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            {step === 1 ? "Cancel" : "Back"}
                        </Button>

                        {step < totalSteps ? (
                            <Button
                                onClick={handleNextStep}
                                disabled={!canProceed()}
                                className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                                ) : method === "CWR_GENERATE" ? (
                                    <><Download className="w-4 h-4 mr-2" /> Generate CWR</>
                                ) : (
                                    <><Send className="w-4 h-4 mr-2" /> Submit Registration</>
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
