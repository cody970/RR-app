"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity as ActivityIcon, Clock, AlertCircle, Shield, CheckCircle2 } from "lucide-react";

interface Activity {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: {
        email: string;
    };
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await fetch("/api/activity");
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data);
                }
            } catch (error) {
                console.error("Failed to fetch activities:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 60000);
        return () => clearInterval(interval);
    }, []);

    const getActionIcon = (action: string) => {
        switch (action) {
            case "RECOVERY_LOGGED":
                return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
            case "CATALOG_ENRICHED":
                return <AlertCircle className="h-4 w-4 text-slate-500" />;
            case "MEMBER_ROLE_UPDATED":
                return <Shield className="h-4 w-4 text-amber-600" />;
            case "FINDING_DISPUTED":
                return <ActivityIcon className="h-4 w-4 text-rose-600" />;
            default:
                return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-slate-900 text-sm font-semibold">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="h-8 w-8 rounded-full bg-slate-200" />
                                <div className="flex-1 space-y-2 mt-1.5">
                                    <div className="h-2.5 w-24 bg-slate-200 rounded" />
                                    <div className="h-2 w-full max-w-[200px] bg-slate-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 mb-6">
                <CardTitle className="text-slate-900 text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.length > 0 ? (
                        activities.map((activity) => (
                            <div key={activity.id} className="relative flex gap-3 pb-6 last:pb-0">
                                {/* Timeline line */}
                                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200 last:hidden" />

                                <div className="relative z-10 flex h-8 w-8 min-w-8 items-center justify-center rounded-full bg-slate-50 border border-slate-200 shadow-sm">
                                    {getActionIcon(activity.action)}
                                </div>
                                <div className="flex-1 min-w-0 mt-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-slate-900 truncate">
                                            {activity.user.email.split("@")[0]}
                                        </p>
                                        <time className="text-[10px] text-slate-500 uppercase font-medium">
                                            {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </time>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                        {activity.details || activity.action.replace(/_/g, " ")}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-slate-400 font-medium">No recent activity detected.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
