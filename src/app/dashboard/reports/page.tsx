"use client";

import { Button } from "@/components/ui/button";
import { DownloadCloud, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { exportToCSV } from "@/lib/reports/export-utils";
import { useState } from "react";

export default function ReportsPage() {
    const toast = useToast();
    const [loadingReport, setLoadingReport] = useState<string | null>(null);

    const downloadReport = async (type: string, key: string) => {
        setLoadingReport(key);
        try {
            const res = await fetch(`/api/reports/export?type=${key}`);
            if (!res.ok) throw new Error("Export failed");

            const data = await res.json();
            if (data.length === 0) {
                toast.error(`No data found for ${type}`);
                return;
            }

            // Map data to clean CSV headers
            const exportData = data.map((f: any) => ({
                ID: f.id,
                Type: f.type,
                Severity: f.severity,
                Status: f.status,
                Confidence: `${f.confidence}%`,
                EstImpactUSD: f.estimatedImpact,
                ResourceID: f.resourceId
            }));

            const filename = `${type.toLowerCase().replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}`;
            exportToCSV(filename, exportData);
            toast.success(`${type} generated successfully!`);
        } catch (error) {
            toast.error("Failed to generate report");
        } finally {
            setLoadingReport(null);
        }
    };

    const reports = [
        { title: "Audit Summary", key: "SUMMARY", desc: "High-level metrics and total estimated leakage." },
        { title: "Registration Gaps", key: "GAPS", desc: "Missing ISWCs, ISRCs, and completely unregistered works." },
        { title: "Unlinked Recordings", key: "UNLINKED", desc: "Recordings that are not linked to a master composition." },
        { title: "Split Conflicts", key: "CONFLICTS", desc: "Works where writer splits do not equal 100% or conflict with societies." }
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="px-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Export Reports</h1>
                <p className="text-slate-500">
                    Download CSV data packs of your catalog anomalies for offline analysis or manual CWR uploads.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 px-2">
                {reports.map((report) => (
                    <div key={report.title} className="p-6 border border-slate-200 rounded-xl bg-white flex flex-col justify-between shadow-sm group hover:shadow-md hover:border-amber-300 transition-all duration-300">
                        <div className="mb-6">
                            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                                <FileText className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-2">{report.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{report.desc}</p>
                        </div>
                        <Button
                            onClick={() => downloadReport(report.title, report.key)}
                            disabled={loadingReport !== null}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 h-11 transition-all duration-200"
                        >
                            {loadingReport === report.key ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
                            ) : (
                                <DownloadCloud className="mr-2 h-4 w-4" />
                            )}
                            {loadingReport === report.key ? "Generating..." : "Download CSV"}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
