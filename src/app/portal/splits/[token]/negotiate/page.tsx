"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SplitPieChart, type SplitSlice } from "@/components/portal/split-pie-chart";
import { SplitSlider } from "@/components/portal/split-slider";
import { SignaturePad, hashSignature } from "@/components/portal/signature-pad";
import {
    Music,
    Send,
    MessageCircle,
    Check,
    ArrowLeft,
    Loader2,
    Users,
    PenTool,
    RefreshCw,
} from "lucide-react";

interface NegotiationMessage {
    id: string;
    senderName: string;
    senderRole: string;
    message: string;
    proposedValue: number | null;
    createdAt: string;
}

interface NegotiationData {
    signoff: {
        id: string;
        workId: string;
        writerName: string;
        targetEmail: string;
        proposedSplit: number;
        status: string;
        expiresAt: string;
    };
    work: {
        id: string;
        title: string;
        iswc: string | null;
        writers: Array<{ name: string; splitPercent: number }>;
    };
    organization: {
        id: string;
        name: string;
    };
    negotiation: {
        id: string;
        status: string;
        proposedSplit: number;
        counterProposal: number | null;
        currentRound: number;
        totalParties: number;
        messages: NegotiationMessage[];
    } | null;
}

export default function NegotiatePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [data, setData] = useState<NegotiationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [counterSplit, setCounterSplit] = useState<number>(50);
    const [sending, setSending] = useState(false);
    const [mode, setMode] = useState<"chat" | "counter" | "sign">("chat");
    const [signatureData, setSignatureData] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/splits/negotiate?token=${token}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to load negotiation");
            }
            const json = await res.json();
            setData(json);
            if (json.signoff) {
                setCounterSplit(
                    json.negotiation?.counterProposal ?? json.signoff.proposedSplit
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        // Scroll to bottom of messages when new messages arrive
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [data?.negotiation?.messages]);

    const sendMessage = async () => {
        if (!message.trim() || sending) return;

        setSending(true);
        try {
            const res = await fetch("/api/splits/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    action: "MESSAGE",
                    message: message.trim(),
                    senderName: data?.signoff.writerName,
                    senderEmail: data?.signoff.targetEmail,
                }),
            });

            if (res.ok) {
                setMessage("");
                await fetchData();
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to send message");
            }
        } catch {
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const sendCounterProposal = async () => {
        if (sending) return;

        setSending(true);
        try {
            const res = await fetch("/api/splits/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    action: "COUNTER",
                    counterSplit,
                    message: `I propose ${counterSplit}% instead.`,
                    senderName: data?.signoff.writerName,
                    senderEmail: data?.signoff.targetEmail,
                }),
            });

            if (res.ok) {
                setMode("chat");
                await fetchData();
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to submit counter-proposal");
            }
        } catch {
            alert("Failed to submit counter-proposal");
        } finally {
            setSending(false);
        }
    };

    const acceptAndSign = async () => {
        if (!signatureData || sending) return;

        setSending(true);
        try {
            // First accept the negotiation
            const acceptRes = await fetch("/api/splits/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    action: "ACCEPT",
                    senderName: data?.signoff.writerName,
                    senderEmail: data?.signoff.targetEmail,
                }),
            });

            if (!acceptRes.ok) {
                const errData = await acceptRes.json();
                throw new Error(errData.error || "Failed to accept");
            }

            // Then resolve with signature
            const signatureHash = await hashSignature(signatureData);
            const resolveRes = await fetch("/api/splits/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    action: "APPROVE",
                    signatureData,
                    signatureHash,
                }),
            });

            if (resolveRes.ok) {
                router.push(`/portal/splits/${token}`);
            } else {
                const errData = await resolveRes.json();
                alert(errData.error || "Failed to complete sign-off");
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to complete sign-off");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">Loading negotiation...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-rose-600">{error || "Failed to load data"}</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => router.push(`/portal/splits/${token}`)}
                        >
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { signoff, work, organization, negotiation } = data;
    const currentSplit = negotiation?.counterProposal ?? signoff.proposedSplit;
    const isExpired = new Date(signoff.expiresAt) < new Date();

    // Build split slices for pie chart
    const splitSlices: SplitSlice[] = work.writers.map((w) => ({
        label: w.name,
        percent: w.splitPercent,
        isCurrentUser: w.name === signoff.writerName,
    }));

    // If current writer isn't in list, add them
    if (!splitSlices.some((s) => s.isCurrentUser)) {
        splitSlices.push({
            label: signoff.writerName,
            percent: currentSplit,
            isCurrentUser: true,
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/portal/splits/${token}`)}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-semibold text-slate-900 truncate">
                            {work.title}
                        </h1>
                        <p className="text-xs text-slate-500">{organization.name}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-indigo-600">
                            {currentSplit}%
                        </div>
                        <p className="text-[10px] text-slate-400">Current Split</p>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 p-4 pb-20 md:pb-4">
                <div className="max-w-lg mx-auto space-y-4">
                    {/* Split visualization */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Ownership Split
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SplitPieChart slices={splitSlices} size={160} />
                        </CardContent>
                    </Card>

                    {/* Mode-specific content */}
                    {mode === "chat" && (
                        <>
                            {/* Messages */}
                            <Card className="flex-1">
                                <CardHeader className="pb-2 border-b">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4" />
                                        Negotiation Chat
                                        <span className="text-xs text-slate-400 font-normal ml-auto">
                                            Round {negotiation?.currentRound || 1}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="h-64 overflow-y-auto p-4 space-y-3">
                                        {/* Initial proposal message */}
                                        <div className="flex gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <Music className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="bg-slate-100 rounded-lg p-3 text-sm">
                                                    <p className="font-medium text-slate-700">
                                                        {organization.name}
                                                    </p>
                                                    <p className="text-slate-600 mt-1">
                                                        Proposed {signoff.proposedSplit}% split for{" "}
                                                        <strong>{signoff.writerName}</strong>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chat messages */}
                                        {negotiation?.messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex gap-2 ${
                                                    msg.senderRole === "PUBLISHER"
                                                        ? ""
                                                        : "flex-row-reverse"
                                                }`}
                                            >
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                        msg.senderRole === "PUBLISHER"
                                                            ? "bg-slate-100"
                                                            : "bg-indigo-100"
                                                    }`}
                                                >
                                                    {msg.senderRole === "PUBLISHER" ? (
                                                        <Music className="w-4 h-4 text-slate-500" />
                                                    ) : (
                                                        <span className="text-xs font-medium text-indigo-600">
                                                            {msg.senderName.charAt(0)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    className={`max-w-[75%] rounded-lg p-3 text-sm ${
                                                        msg.senderRole === "PUBLISHER"
                                                            ? "bg-slate-100"
                                                            : "bg-indigo-600 text-white"
                                                    }`}
                                                >
                                                    {msg.proposedValue && (
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded text-xs mb-1 ${
                                                                msg.senderRole === "PUBLISHER"
                                                                    ? "bg-slate-200 text-slate-600"
                                                                    : "bg-indigo-500 text-indigo-100"
                                                            }`}
                                                        >
                                                            {msg.proposedValue}%
                                                        </span>
                                                    )}
                                                    <p>{msg.message}</p>
                                                    <p
                                                        className={`text-[10px] mt-1 ${
                                                            msg.senderRole === "PUBLISHER"
                                                                ? "text-slate-400"
                                                                : "text-indigo-200"
                                                        }`}
                                                    >
                                                        {new Date(msg.createdAt).toLocaleTimeString(
                                                            [],
                                                            { hour: "2-digit", minute: "2-digit" }
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message input */}
                                    {!isExpired && signoff.status === "PENDING" && (
                                        <div className="border-t p-3 flex gap-2">
                                            <input
                                                type="text"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                                placeholder="Type a message..."
                                                className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={sendMessage}
                                                disabled={!message.trim() || sending}
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Action buttons */}
                            {!isExpired && signoff.status === "PENDING" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setMode("counter")}
                                        className="h-12"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Counter-Propose
                                    </Button>
                                    <Button
                                        onClick={() => setMode("sign")}
                                        className="h-12 bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Accept & Sign
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {mode === "counter" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Counter-Proposal</CardTitle>
                                <CardDescription>
                                    Use the slider to propose a different split percentage
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <SplitSlider
                                    value={counterSplit}
                                    onChange={setCounterSplit}
                                    originalValue={signoff.proposedSplit}
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" onClick={() => setMode("chat")}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={sendCounterProposal}
                                        disabled={sending}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Submit Proposal
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {mode === "sign" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <PenTool className="w-4 h-4" />
                                    Digital Signature
                                </CardTitle>
                                <CardDescription>
                                    Sign below to confirm your agreement to the {currentSplit}% split
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                    <p className="text-sm text-emerald-800">
                                        You are agreeing to a <strong>{currentSplit}%</strong> publishing
                                        share for <strong>&ldquo;{work.title}&rdquo;</strong>
                                    </p>
                                </div>

                                <SignaturePad
                                    onSignatureChange={setSignatureData}
                                    width={Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 64 : 380)}
                                    height={180}
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" onClick={() => setMode("chat")}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={acceptAndSign}
                                        disabled={!signatureData || sending}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Complete Sign-off
                                    </Button>
                                </div>

                                <p className="text-[10px] text-slate-400 text-center">
                                    By signing, you legally confirm your publishing share for this work.
                                    Your signature and IP address will be recorded for verification.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
