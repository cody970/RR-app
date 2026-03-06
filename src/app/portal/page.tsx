import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, AlertCircle } from "lucide-react";

export default async function PortalDashboard() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

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

    const writer = user?.writer;

    if (!writer) {
        return (
            <div className="max-w-3xl mx-auto mt-10">
                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-800">
                            <AlertCircle className="h-5 w-5" />
                            No Writer Profile Linked
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-amber-700">
                        Your account hasn't been linked to a Writer profile yet. Please contact your organization owner to link your account.
                    </CardContent>
                </Card>
            </div>
        );
    }

    const linkedWorksCount = writer.works.length;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900">Welcome, {writer.name}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm border-t-4 border-t-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                            Registered Works
                            <Music className="h-4 w-4 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{linkedWorksCount}</div>
                        <p className="text-xs text-slate-500 mt-1">Works you have a split in</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Catalog</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {writer.works.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No works found in your catalog.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {writer.works.map((ww) => (
                                <div key={ww.work.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <Music className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{ww.work.title}</p>
                                            <p className="text-xs text-slate-500">ISWC: {ww.work.iswc || "Pending"}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border-green-200">
                                            {ww.splitPercent}% Share
                                        </div>
                                        <span className="text-xs text-slate-400">{ww.role || 'Writer'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
