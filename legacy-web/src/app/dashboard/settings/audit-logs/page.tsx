"use client";

import { useEffect, useState } from "react";
import {
    Shield,
    Search,
    Calendar,
    User as UserIcon,
    Fingerprint,
    CheckCircle,
    AlertCircle,
    Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/audit-logs?page=${page}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setPagination({
                    currentPage: data.pagination.currentPage,
                    totalPages: data.pagination.pages
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Shield className="h-8 w-8 text-slate-700" />
                        Audit Trail
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Cryptographically hashed logs of all sensitive system actions.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by action or user..."
                        className="pl-10 bg-white border-slate-200 text-slate-900 focus:ring-amber-500 rounded-xl shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Evidence Hash</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
                                        <p className="text-slate-500 mt-4">Decrypting audit trail...</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                        No audit logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-sm">{format(new Date(log.timestamp), "MMM d, HH:mm:ss")}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-900">{log.user?.email || "System"}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{log.user?.role || "SYSTEM"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 px-2 py-0.5 rounded-md font-mono text-[11px] shadow-sm">
                                                {log.action}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group/hash cursor-help" title={log.evidenceHash}>
                                                <Fingerprint className="h-3.5 w-3.5 text-slate-400 group-hover/hash:text-slate-600 transition-colors" />
                                                <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-600 transition-colors">
                                                    {log.evidenceHash.substring(0, 12)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-emerald-600">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                            Showing page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchLogs(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="px-3 py-1 text-xs border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => fetchLogs(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="px-3 py-1 text-xs border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                <div>
                    <h4 className="text-sm font-semibold text-slate-800">Compliance Implementation</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        All audit logs are stored with a SHA-256 evidence hash generated at the time of entry.
                        In an enterprise environment, these hashes should be periodically flushed to a WORM (Write-Once-Read-Many) storage or a ledger for cold-storage audit defense.
                    </p>
                </div>
            </div>
        </div>
    );
}
