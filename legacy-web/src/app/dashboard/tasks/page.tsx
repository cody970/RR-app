"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Inbox, Play } from "lucide-react";

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/tasks");
            if (res.ok) setTasks(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const updateStatus = async (id: string, status: string) => {
        await fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchTasks();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Resolution Tasks</h1>
                <p className="text-slate-500">
                    Manage and track the remediation of catalog anomalies.
                </p>
            </div>

            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <Inbox className="h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No tasks created</h3>
                        <p className="text-slate-500 mt-1 max-w-sm">
                            Convert findings into tasks from the Audit Engine page.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {tasks.map((task) => (
                            <div key={task.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${task.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                            task.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                            {task.status.replace("_", " ")}
                                        </span>
                                        <span className="text-sm font-mono text-slate-400">ID: {task.id.substring(0, 8)}</span>
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 mb-1">
                                        Fix {task.finding?.type?.replace(/_/g, " ")} on {task.finding?.resourceType}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Resource: <span className="font-mono text-slate-600 font-medium">{task.finding?.resourceId}</span>
                                        {task.assigneeEmail && ` • Assigned to: ${task.assigneeEmail}`}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    {task.status !== 'IN_PROGRESS' && task.status !== 'RESOLVED' && (
                                        <Button
                                            variant="outline"
                                            onClick={() => updateStatus(task.id, 'IN_PROGRESS')}
                                            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                                        >
                                            <Play className="h-4 w-4 mr-2" /> Start
                                        </Button>
                                    )}
                                    {task.status !== 'RESOLVED' && (
                                        <Button
                                            onClick={() => updateStatus(task.id, 'RESOLVED')}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
