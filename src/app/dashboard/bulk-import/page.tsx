"use client";

import { useRef, useState } from "react";

export default function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setProgress(0);
    setStatus(null);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("Uploading...");
    setProgress(0);
    try {
      const chunkSize = 10 * 1024 * 1024; // 10MB
      const totalChunks = Math.ceil(file.size / chunkSize);
      const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const res = await fetch("/api/bulk-upload/chunk", {
          method: "POST",
          headers: {
            "x-upload-id": uploadId,
            "x-chunk-index": i.toString(),
            "x-chunks-total": totalChunks.toString(),
          },
          body: chunk,
        });
        if (!res.ok) {
          setStatus(`Failed at chunk ${i + 1}`);
          return;
        }
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      // Notify backend to assemble and process
      const completeRes = await fetch("/api/bulk-upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, chunksTotal: totalChunks, filename: file.name }),
      });
      if (!completeRes.ok) {
        setStatus("Failed to complete upload");
        return;
      }
      setStatus("Upload complete and processing started");
    } catch (err) {
      setStatus("An error occurred during upload. Please try again or check your connection.");
      // Optionally log error for debugging
      // console.error(err);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Bulk Catalog Import</h1>
      <div className="mb-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="block mb-2"
        />
        {file && <div className="mb-2">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>}
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50"
          disabled={!file || status === "Uploading..."}
          onClick={handleUpload}
        >
          Upload
        </button>
      </div>
      {progress > 0 && (
        <div className="mb-2">Progress: {progress}%</div>
      )}
      {status && <div className="text-green-600">{status}</div>}
      <div className="mt-8 text-slate-500 text-sm">
        Supports large files (multi-GB). Upload your own catalog or third-party data for audit and enrichment. Chunked upload and background processing coming soon.
      </div>
    </div>
  );
}
