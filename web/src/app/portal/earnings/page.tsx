import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";

export default async function PortalEarnings() {
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900">Earnings Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm border-t-4 border-t-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                            Total Earnings (YTD)
                            <DollarSign className="h-4 w-4 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">$0.00</div>
                        <p className="text-xs text-slate-500 mt-1">Pending first statement parsing</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                            Last Payout
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">$0.00</div>
                        <p className="text-xs text-slate-500 mt-1">N/A</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Transactions</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                    <p className="text-slate-500">Earnings data will appear here once royalty statements are processed by your publisher/organization.</p>
                </div>
            </div>
        </div>
    );
}
