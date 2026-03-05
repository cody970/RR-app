"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Lock, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function AgentDemoPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [connected, setConnected] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [applying, setApplying] = useState(false);
    const [evidenceHash, setEvidenceHash] = useState("");

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/tasks");
            if (res.ok) setTasks(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const openTasks = tasks.filter(t => t.status !== "RESOLVED");

    const generateMockDiff = (task: any) => {
        if (task.finding.type === "MISSING_ISWC") {
            return {
                field: "ISWC",
                oldValue: "None (Unregistered)",
                newValue: `T-${Math.floor(Math.random() * 900000000) + 100000000}-1`
            };
        }
        if (task.finding.type === "MISSING_ISRC") {
            return {
                field: "ISRC",
                oldValue: "None",
                newValue: `US-RC1-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 90000) + 10000}`
            };
        }
        return { field: "Split", oldValue: "Unknown", newValue: "Verified 50%" };
    };

    const applyFix = async () => {
        if (!selectedTask) return;
        setApplying(true);
        try {
            const diff = generateMockDiff(selectedTask);
            const res = await fetch("/api/agent/apply-fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId: selectedTask.id,
                    proposedFix: diff
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setEvidenceHash(data.evidenceHash);
                fetchTasks();
            }
        } catch (e) {
            console.error("Failed to apply fix", e);
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">RoyaltyFix Agent</h1>
                <p className="text-slate-500">
                    Connect your PRO/Society portals to allow our agent to securely apply metadata fixes on your behalf.
                </p>
            </div>

            {!connected ? (
                <div className="border border-slate-200 rounded-xl bg-white p-8 text-center shadow-sm">
                    <Globe className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                    <h2 className="text-xl font-medium text-slate-900 mb-4">Portals Disconnected</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        You must authorize RoyaltyRadar to apply fixes directly to your societies (ASCAP, BMI, The MLC).
                        Credentials are never stored; we use a secure local runner for headed session automation.
                    </p>
                    <Button
                        onClick={() => setConnected(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10"
                    >
                        <ShieldCheck className="mr-2 h-5 w-5" /> Connect Mock Portals
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h2 className="text-xl font-medium text-slate-900">Pending Fixes ({openTasks.length})</h2>
                        {openTasks.length === 0 ? (
                            <div className="p-8 border border-slate-200 rounded-xl bg-slate-50/50 text-center shadow-sm">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                                <p className="text-slate-500">No pending tasks to fix.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {openTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className={`p-4 border rounded-xl cursor-pointer shadow-sm transition-colors ${selectedTask?.id === task.id
                                            ? "border-amber-400 bg-amber-50"
                                            : "border-slate-200 hover:bg-slate-50 bg-white"
                                            }`}
                                    >
                                        <h3 className="font-medium text-slate-900 mb-1">Fix {task.finding?.type.replace(/_/g, " ")}</h3>
                                        <p className="text-sm text-slate-500">Resource: <span className="font-mono text-slate-700">{task.finding?.resourceId}</span></p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        {selectedTask ? (
                            <div className="border border-slate-200 rounded-xl bg-white shadow-sm p-6 sticky top-24">
                                <div className="flex items-center gap-2 text-slate-900 mb-6">
                                    <Lock className="h-5 w-5 text-amber-500" />
                                    <span className="font-semibold">Secure Diff Preview</span>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-tight">Resolution Plan</h3>
                                    <p className="text-slate-700 text-sm">
                                        The agent will navigate to the target portal, locate resource <span className="font-mono text-slate-900 font-medium">{selectedTask.finding?.resourceId}</span>, and apply the required metadata updates.
                                    </p>
                                </div>

                                {(() => {
                                    const diff = generateMockDiff(selectedTask);
                                    return (
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8 font-mono text-sm shadow-inner">
                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                                                <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200 text-center relative shadow-sm">
                                                    <span className="absolute -top-2 -left-2 bg-red-100 text-red-700 border border-red-200 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Current</span>
                                                    {diff.oldValue}
                                                </div>
                                                <ArrowRight className="text-slate-400 h-5 w-5" />
                                                <div className="bg-emerald-50 text-emerald-600 p-3 rounded border border-emerald-200 text-center relative shadow-sm">
                                                    <span className="absolute -top-2 -right-2 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Proposed</span>
                                                    {diff.newValue}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {evidenceHash ? (
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 mb-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                            <strong className="font-medium text-emerald-900">Fix Applied Successfully</strong>
                                        </div>
                                        <p className="text-xs text-emerald-700/80 font-mono break-all leading-tight">
                                            Immutable Log Hash:<br />{evidenceHash}
                                        </p>
                                    </div>
                                ) : null}

                                <div className="flex gap-3 mt-4">
                                    <Button
                                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10"
                                        onClick={applyFix}
                                        disabled={applying}
                                    >
                                        {applying ? "Applying Fix..." : "Approve & Apply"}
                                    </Button>
                                    <Button variant="outline" className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm" onClick={() => setSelectedTask(null)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="border border-slate-200 border-dashed rounded-xl bg-slate-50/50 h-full min-h-[400px] flex items-center justify-center text-slate-400">
                                Select a task to preview diff
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
