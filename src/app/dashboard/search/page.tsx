"use client";

import { useState } from "react";
  const [importing, setImporting] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleImport(item: any) {
    setImporting(item.id || item.title || item.name);
    setImportSuccess(null);
    setImportError(null);
    // Normalize for import
    let type = item.type;
    let data: any = {};
    if (type === "track" || type === "recording") {
      data = {
        title: item.title || item.name,
        isrc: item.identifier || item.isrc || "",
      };
    } else if (type === "work" || type === "album") {
      data = {
        title: item.title || item.name,
        iswc: item.identifier || item.iswc || "",
      };
    } else {
      setImportError("Unsupported type for import");
      setImporting(null);
      return;
    }
    try {
      const res = await fetch("/api/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) throw new Error("Import failed");
      setImportSuccess(`Imported: ${item.title || item.name}`);
    } catch (err: any) {
      setImportError(err.message || "Unknown error");
    } finally {
      setImporting(null);
    }
  }
import { musoEnrichSchema } from "@/lib/schemas";
import { SearchCheck } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const body = { action: "search", query };
      const parsed = musoEnrichSchema.safeParse(body);
      if (!parsed.success) {
        setError("Invalid search query");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <SearchCheck className="w-6 h-6 text-indigo-500" />
        Search Catalog
      </h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          className="flex-1 px-4 py-2 border rounded-lg"
          placeholder="Search by artist, album, track, org, ISRC, etc."
          value={query}
          onChange={e => setQuery(e.target.value)}
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div>
        {importSuccess && <div className="text-green-600 mb-2">{importSuccess}</div>}
        {importError && <div className="text-red-500 mb-2">{importError}</div>}
        {results.length > 0 ? (
          <ul className="space-y-4">
            {results.map((item, i) => (
              <li key={i} className="p-4 border rounded-lg flex items-center gap-4">
                {item.image && (
                  <img src={item.image} alt="" className="w-12 h-12 rounded object-cover" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">{item.title || item.name}</div>
                  <div className="text-xs text-slate-500 flex gap-2 items-center">
                    <span>{item.type}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
                      {item.source}
                    </span>
                  </div>
                  {item.summary && <div className="text-sm mt-1">{item.summary}</div>}
                </div>
                {(item.source === "muso" || item.source === "spotify") && (item.type === "track" || item.type === "recording" || item.type === "work" || item.type === "album") && (
                  <button
                    className="ml-4 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                    disabled={importing === (item.id || item.title || item.name)}
                    onClick={() => handleImport(item)}
                  >
                    {importing === (item.id || item.title || item.name) ? "Importing..." : "Import"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-slate-400">No results yet. Try searching for an artist, album, track, or org.</div>
        )}
      </div>
    </div>
  );
}
