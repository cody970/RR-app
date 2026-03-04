import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail } from "lucide-react";

export default async function PortalProfile() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Fetch the user's linked writer profile
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            writer: true
        }
    });

    const writer = user?.writer;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900">Your Profile</h2>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Full Name</p>
                            <p className="font-semibold text-slate-900">{writer?.name || user?.email?.split('@')[0] || "Unknown"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Email Address</p>
                            <p className="font-semibold text-slate-900">{user?.email}</p>
                        </div>
                    </div>

                    {writer?.ipiCae && (
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <span className="font-bold text-slate-400 text-xs text-center">IPI</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">IPI/CAE Number</p>
                                <p className="font-semibold text-slate-900">{writer.ipiCae}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
