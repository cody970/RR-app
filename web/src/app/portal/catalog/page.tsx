import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Music, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function PortalCatalog() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) return null;

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            writer: {
                include: {
                    works: {
                        include: { work: true }
                    }
                }
            }
        }
    });

    const works = user?.writer?.works || [];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold text-slate-900">My Catalog</h2>
                    <p className="text-sm text-slate-500">View and manage your registered tracks and split shares.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search tracks..."
                            className="pl-10 h-10 rounded-xl bg-white border-slate-200"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200/60 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4 font-semibold">Track Details</th>
                            <th className="px-6 py-4 font-semibold">ISWC</th>
                            <th className="px-6 py-4 font-semibold text-center">Your Share</th>
                            <th className="px-6 py-4 font-semibold text-right">Added</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {works.length > 0 ? (
                            works.map((ww: any) => (
                                <tr key={ww.work.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                                <Music className="h-4.5 w-4.5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{ww.work.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-medium">{ww.role || 'Writer'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                            {ww.work.iswc || "PENDING"}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                                            {ww.splitPercent}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs text-slate-400">
                                            {new Date(ww.work.createdAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                            <Music className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-900">No tracks found</p>
                                            <p className="text-xs text-slate-400">Your registered tracks will appear here once linked.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
