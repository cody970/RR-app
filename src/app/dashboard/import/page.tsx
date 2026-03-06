"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { UploadCloud, File, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { TemplateTypes, TemplateType, getTemplateHeaders } from "@/lib/reports/templates";
import { Button } from "@/components/ui/button";
import { downloadTemplate } from "@/lib/reports/export-utils";
import { IngestHistory } from "@/components/dashboard/ingest-history";

export default function ImportPage() {
    const { data: session } = useSession();
    const [selectedType, setSelectedType] = useState<TemplateType>("Works");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ imported?: number; errors?: any[] } | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const processUpload = async () => {
        if (!file) return;
        setUploading(true);
        setErrorMsg("");
        setResult(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target?.result as string;
            try {
                const res = await fetch("/api/ingest/csv", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: selectedType, csvData }),
                });

                if (!res.ok) {
                    setErrorMsg(await res.text() || "Upload failed");
                } else {
                    setResult(await res.json());
                    setRefreshTrigger(prev => prev + 1); // Refresh history
                    setFile(null); // Clear file on success
                }
            } catch (err) {
                setErrorMsg("Failed to upload the file.");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Ingest Catalog & Usage</h1>
                <p className="text-slate-500 max-w-2xl">
                    Upload standardized CSV files. The engine applies strict row-level validation.
                    Invalid rows are isolated, allowing valid data to persist.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <label className="text-sm font-medium text-slate-700 block">Template Type</label>
                    <div className="space-y-2">
                        {TemplateTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 ${selectedType === type
                                    ? "bg-slate-900 text-white font-medium shadow-md shadow-slate-900/10 border border-slate-900"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => downloadTemplate(selectedType, getTemplateHeaders(selectedType))}
                        className="w-full mt-4 border-slate-200 text-slate-600 hover:bg-slate-50 bg-white shadow-sm"
                    >
                        <Download className="mr-2 h-4 w-4" /> Download Template
                    </Button>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <div
                        className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 hover:bg-slate-100 p-12 text-center transition-colors cursor-pointer"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-upload")?.click()}
                    >
                        <input
                            id="file-upload"
                            type="file"
                            accept={selectedType === "CWR File" ? ".cwr,.txt" : ".csv"}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {file ? (
                            <div className="flex flex-col items-center">
                                <File className="h-12 w-12 text-amber-500 mb-4" />
                                <p className="text-lg font-medium text-slate-900">{file.name}</p>
                                <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <UploadCloud className="h-12 w-12 text-slate-400 mb-4" />
                                <p className="text-lg font-medium text-slate-800 mb-1">Click to upload or drag & drop</p>
                                <p className="text-sm text-slate-500">CSV files only (max 5MB)</p>
                            </div>
                        )}
                    </div>

                    {errorMsg && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 shadow-sm">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <p className="text-sm">{errorMsg}</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 shadow-sm">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                <p className="text-sm">
                                    Successfully imported <span className="font-bold">{result.imported}</span> valid rows.
                                </p>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                    <div className="bg-amber-50 px-4 py-3 border-b border-slate-200">
                                        <h3 className="text-sm font-medium text-amber-800 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-600" />
                                            {result.errors.length} rows contained errors and were skipped
                                        </h3>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-4 bg-slate-50/50">
                                        <ul className="space-y-3">
                                            {result.errors.map((err, i) => (
                                                <li key={i} className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                    <span className="font-mono text-slate-800 font-medium mb-1 block">Row {err.row}:</span>
                                                    <span className="text-red-500">{JSON.stringify(err.errors)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={processUpload}
                            disabled={!file || uploading}
                            className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px] shadow-md shadow-slate-900/10 transition-all duration-200"
                        >
                            {uploading ? "Processing..." : "Run Import"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-12 pt-12 border-t border-slate-200">
                <IngestHistory refreshTrigger={refreshTrigger} />
            </div>
        </div>
    );
}
