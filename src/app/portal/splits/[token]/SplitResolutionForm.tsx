"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SplitResolutionForm({ token }: { token: string }) {
    const [loading, setLoading] = useState(false);
    const [disputeMode, setDisputeMode] = useState(false);
    const [reason, setReason] = useState("");
    const router = useRouter();

    const handleResolve = async (action: "APPROVE" | "DISPUTE") => {
        if (action === "DISPUTE" && !reason.trim()) {
            alert("Please provide a reason for disputing this split.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/splits/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, action, reason: action === "DISPUTE" ? reason : undefined }),
            });

            if (res.ok) {
                router.refresh(); // Reload the server component to show the resolved state
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

    if (disputeMode) {
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
                        onClick={() => setDisputeMode(false)}
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

    return (
        <div className="w-full space-y-3">
            <Button
                className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                onClick={() => handleResolve("APPROVE")}
                disabled={loading}
            >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!loading && <Check className="w-5 h-5 mr-2" />}
                Approve Split & Sign-off
            </Button>

            <Button
                variant="ghost"
                className="w-full h-10 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                onClick={() => setDisputeMode(true)}
                disabled={loading}
            >
                I dispute this split
            </Button>

            <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400">
                    By clicking Approve, you legally confirm your publishing share for this work.
                    Your IP address and timestamp will be logged for verification.
                </p>
            </div>
        </div>
    );
}
