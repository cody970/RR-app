"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, MessageSquare, PenTool, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { SignaturePad, hashSignature } from "@/components/portal/signature-pad";
import { SplitSlider } from "@/components/portal/split-slider";

interface SplitResolutionFormProps {
    token: string;
    proposedSplit?: number;
    writerName?: string;
}

export default function SplitResolutionForm({ token, proposedSplit, writerName }: SplitResolutionFormProps) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"default" | "dispute" | "counter" | "sign">("default");
    const [reason, setReason] = useState("");
    const [counterSplit, setCounterSplit] = useState<number>(proposedSplit || 50);
    const [counterNote, setCounterNote] = useState("");
    const router = useRouter();

    const [submitted, setSubmitted] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    const handleResolve = async (action: "APPROVE" | "DISPUTE" | "COUNTER_PROPOSAL") => {
        if (action === "DISPUTE" && !reason.trim()) {
            alert("Please provide a reason for disputing this split.");
            return;
        }

        if (action === "COUNTER_PROPOSAL") {
            if (counterSplit <= 0 || counterSplit > 100) {
                alert("Please enter a valid split percentage between 0 and 100.");
                return;
            }
            if (!counterNote.trim()) {
                alert("Please provide a brief explanation for your counter-proposal.");
                return;
            }
        }

        if (action === "APPROVE" && !signatureData) {
            // Switch to signature mode if trying to approve without signature
            setMode("sign");
            return;
        }

        if (loading || submitted) return;
        setLoading(true);
        try {
            const payload: Record<string, unknown> = { token, action };

            if (action === "DISPUTE") {
                payload.reason = reason;
            } else if (action === "COUNTER_PROPOSAL") {
                payload.reason = `Counter-proposal: ${counterSplit}% — ${counterNote}`;
                payload.counterProposedSplit = counterSplit;
                // Send as DISPUTE with counter-proposal data so existing API handles it
                payload.action = "DISPUTE";
            } else if (action === "APPROVE" && signatureData) {
                // Include signature data for approval
                payload.signatureData = signatureData;
                payload.signatureHash = await hashSignature(signatureData);
            }

            const res = await fetch("/api/splits/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setSubmitted(true);
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "An error occurred.");
            }
        } catch (e) {
            console.error(e);
            alert("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // ---------- Sign Mode ----------
    if (mode === "sign") {
        return (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs text-emerald-700">
                        <strong>Digital Signature:</strong> Sign below to confirm your agreement to the {proposedSplit}% split.
                    </p>
                </div>

                <SignaturePad
                    onSignatureChange={setSignatureData}
                    width={Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 64 : 380)}
                    height={160}
                />

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="w-full bg-slate-50"
                        onClick={() => setMode("default")}
                        disabled={loading}
                    >
                        Back
                    </Button>
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleResolve("APPROVE")}
                        disabled={loading || !signatureData}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <PenTool className="w-4 h-4 mr-1.5" />
                        Sign & Approve
                    </Button>
                </div>
            </div>
        );
    }

    // ---------- Counter-Proposal Mode ----------
    if (mode === "counter") {
        return (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <p className="text-xs text-indigo-700">
                        <strong>Counter-Proposal:</strong> Use the slider to suggest a different split percentage.
                        The publisher will review your proposal and may accept, negotiate, or decline.
                    </p>
                </div>

                {/* Touch-friendly slider */}
                <SplitSlider
                    value={counterSplit}
                    onChange={setCounterSplit}
                    originalValue={proposedSplit}
                    disabled={loading}
                />

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Explanation
                    </label>
                    <textarea
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 h-20"
                        placeholder="e.g., I co-wrote the melody and lyrics, which represents a larger contribution..."
                        value={counterNote}
                        onChange={(e) => setCounterNote(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="w-full bg-slate-50"
                        onClick={() => setMode("default")}
                        disabled={loading}
                    >
                        Back
                    </Button>
                    <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleResolve("COUNTER_PROPOSAL")}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Counter-Proposal
                    </Button>
                </div>
            </div>
        );
    }

    // ---------- Dispute Mode ----------
    if (mode === "dispute") {
        return (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Dispute</label>
                    <textarea
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3 h-24"
                        placeholder="e.g., My correct split is 50%, not 25%."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="w-full bg-slate-50"
                        onClick={() => setMode("default")}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => handleResolve("DISPUTE")}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Dispute
                    </Button>
                </div>
            </div>
        );
    }

    // ---------- Default Mode ----------
    return (
        <div className="w-full space-y-3">
            <Button
                className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm touch-manipulation"
                onClick={() => handleResolve("APPROVE")}
                disabled={loading}
            >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!loading && <Check className="w-5 h-5 mr-2" />}
                Approve Split & Sign-off
            </Button>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    className="h-10 text-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50 touch-manipulation"
                    onClick={() => setMode("counter")}
                    disabled={loading}
                >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Counter-Propose
                </Button>
                <Button
                    variant="ghost"
                    className="h-10 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 touch-manipulation"
                    onClick={() => setMode("dispute")}
                    disabled={loading}
                >
                    I dispute this split
                </Button>
            </div>

            {/* Link to full negotiation page */}
            <div className="pt-2">
                <Button
                    variant="outline"
                    className="w-full h-10 text-sm text-slate-600 border-slate-200 hover:bg-slate-50 touch-manipulation"
                    onClick={() => router.push(`/portal/splits/${token}/negotiate`)}
                    disabled={loading}
                >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Open Full Negotiation Chat
                </Button>
            </div>

            <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400">
                    By clicking Approve, you&apos;ll be asked to provide a digital signature to legally confirm your publishing share.
                    Your IP address and timestamp will be logged for verification.
                </p>
            </div>
        </div>
    );
}