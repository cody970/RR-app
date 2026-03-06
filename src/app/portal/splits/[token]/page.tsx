import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, CheckCircle2, AlertCircle } from "lucide-react";
import SplitResolutionForm from "./SplitResolutionForm";

const prisma = new PrismaClient();

export default async function SplitResolutionPage({
    params
}: {
    params: { token: string }
}) {
    const token = params.token;

    const signoff = await prisma.splitSignoff.findUnique({
        where: { token },
        include: {
            organization: true,
            work: true
        }
    });

    if (!signoff) {
        notFound();
    }

    const { work, organization, writerName, proposedSplit, targetEmail, status, expiresAt } = signoff;

    const isExpired = expiresAt < new Date();
    const isResolved = status !== "PENDING";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg mb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                    <Music className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">RoyaltyRadar Splits</h1>
                <p className="text-slate-500 mt-2">Secure Split Resolution Portal</p>
            </div>

            <Card className="w-full max-w-lg border-slate-200 shadow-sm">
                <CardHeader className="text-center pb-6 border-b border-slate-100 bg-white rounded-t-xl">
                    <CardTitle className="text-xl">Split Sign-off Request</CardTitle>
                    <CardDescription className="pt-2">
                        {organization.name} has requested your approval for the publishing splits on the following work:
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 bg-slate-50/50">
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <h3 className="text-sm font-medium text-slate-500 mb-1">Work Title</h3>
                            <p className="text-lg font-semibold text-slate-900">{work.title}</p>
                            {work.iswc && (
                                <p className="text-xs font-mono text-slate-400 mt-1">ISWC: {work.iswc}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-200">
                                <h3 className="text-sm font-medium text-slate-500 mb-1">Writer</h3>
                                <p className="font-medium text-slate-900">{writerName}</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-indigo-100 bg-indigo-50/30">
                                <h3 className="text-sm font-medium text-indigo-600 mb-1">Proposed Split</h3>
                                <p className="text-2xl font-bold text-indigo-700">{proposedSplit}%</p>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex-col gap-4 p-6 bg-white rounded-b-xl border-t border-slate-100">
                    {isResolved ? (
                        <div className="w-full text-center py-4 space-y-2">
                            {status === "APPROVED" ? (
                                <>
                                    <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-emerald-900">Split Approved</h3>
                                    <p className="text-sm text-emerald-700">Thank you for confirming your split. {organization.name} has been notified.</p>
                                </>
                            ) : (
                                <>
                                    <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-3">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-rose-900">Split Disputed</h3>
                                    <p className="text-sm text-rose-700">You have disputed this split. {organization.name} will review your notes and follow up.</p>
                                </>
                            )}
                        </div>
                    ) : isExpired ? (
                        <div className="w-full text-center py-4 space-y-2">
                            <h3 className="text-lg font-semibold text-slate-700">Link Expired</h3>
                            <p className="text-sm text-slate-500">This sign-off request has expired. Please contact {organization.name} for a new link.</p>
                        </div>
                    ) : (
                        <SplitResolutionForm token={token} />
                    )}
                </CardFooter>
            </Card>

            <p className="text-xs text-slate-400 mt-8">
                Powered by RoyaltyRadar
            </p>
        </div>
    );
}
