import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Video, Play, FileText } from "lucide-react";

export default async function SyncLicensingPage() {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.orgId;

    if (!orgId) return null;

    // Fetch sync quotes and placements
    const quotes = await db.syncQuote.findMany({
        where: { orgId },
        include: { work: true },
        orderBy: { updatedAt: 'desc' }
    });

    const placements = await db.syncPlacement.findMany({
        where: { orgId },
        include: { work: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sync Licensing</h2>
                    <p className="text-slate-500">Manage quotes, licenses, and media placements</p>
                </div>
                <div className="flex gap-2">
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Quote
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle>Active Quotes & Pitching</CardTitle>
                            <CardDescription>Quotes sent out to music supervisors</CardDescription>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-slate-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Work</th>
                                        <th className="px-4 py-2 font-medium">Project</th>
                                        <th className="px-4 py-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {quotes.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-6 text-center text-slate-500 text-sm">
                                                No active quotes.
                                            </td>
                                        </tr>
                                    ) : (
                                        quotes.map(q => (
                                            <tr key={q.id}>
                                                <td className="px-4 py-3 font-medium text-slate-900">{q.work.title}</td>
                                                <td className="px-4 py-3 text-slate-600">{q.projectName}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-700">{q.status}</Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle>Recent Placements</CardTitle>
                            <CardDescription>Confirmed syncs in media</CardDescription>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Video className="h-5 w-5 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 space-y-3">
                            {placements.length === 0 ? (
                                <div className="py-6 text-center text-slate-500 border border-slate-200 rounded-lg bg-slate-50/50 text-sm">
                                    No placements tracked yet.
                                </div>
                            ) : (
                                placements.map(p => (
                                    <div key={p.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-lg bg-white shadow-sm hover:border-slate-200 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                            <Play className="h-4 w-4 text-amber-600 ml-0.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{p.productionName}</p>
                                            <p className="text-xs text-slate-500 truncate">{p.work.title} • {p.mediaType}</p>
                                        </div>
                                        <div className="text-right whitespace-nowrap">
                                            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">Secured</Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
