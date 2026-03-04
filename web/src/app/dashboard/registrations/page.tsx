import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";

export default async function RegistrationsPage() {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.orgId;

    if (!orgId) return null;

    // Fetch registrations joined with their Works
    const registrations = await db.registration.findMany({
        where: {
            work: { orgId } // filter by organization's works
        },
        include: {
            work: true,
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">PRO Registrations</h2>
                    <p className="text-slate-500">Manage your work registrations across Performing Rights Organizations</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-200">
                        <Upload className="w-4 h-4 mr-2" />
                        Import CWR
                    </Button>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>All Registrations</CardTitle>
                    <CardDescription>View status of your works at various PROs like ASCAP, BMI, PRS, etc.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Work Title</th>
                                    <th className="px-4 py-3 font-medium">ISWC</th>
                                    <th className="px-4 py-3 font-medium">Society</th>
                                    <th className="px-4 py-3 font-medium">Split Registered</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {registrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                            <p className="font-medium text-slate-900 mb-1">No registrations found</p>
                                            <p className="text-sm">Import CWR acks or sync from data sources.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    registrations.map(reg => (
                                        <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-900">{reg.work.title}</td>
                                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{reg.work.iswc || 'N/A'}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">{reg.society}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-medium">{reg.totalSplitRegistered}%</td>
                                            <td className="px-4 py-3">
                                                {reg.status === 'COMPLETE' || reg.status === 'REGISTERED' || reg.status === 'ACCEPTED' ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Registered</Badge>
                                                ) : reg.status === 'PENDING' ? (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 border">Pending</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200 border">{reg.status}</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
