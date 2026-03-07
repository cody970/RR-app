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
                return <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
            case "CATALOG_ENRICHED":
                return <AlertCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
            case "MEMBER_ROLE_UPDATED":
                return <Shield className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
            case "FINDING_DISPUTED":
                return <ActivityIcon className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
            default:
                return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card">
                <CardHeader className="pb-4">
                    <CardTitle className="text-foreground text-sm font-semibold tracking-tight">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="h-9 w-9 rounded-xl bg-muted" />
                                <div className="flex-1 space-y-2.5 mt-1.5">
                                    <div className="h-2.5 w-24 bg-muted rounded" />
                                    <div className="h-2 w-full max-w-[200px] bg-muted/60 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl glass-card relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <ActivityIcon className="h-24 w-24 text-indigo-500" />
            </div>
            <CardHeader className="pb-4 border-b border-border/50 mb-6">
                <CardTitle className="text-foreground text-sm font-semibold tracking-tight flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4 text-indigo-500" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.length > 0 ? (
                        activities.map((activity) => (
                            <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
                                {/* Timeline line */}
                                <div className="absolute left-[18px] top-9 bottom-0 w-px bg-gradient-to-b from-border/80 via-border/40 to-transparent last:hidden" />

                                <div className="relative z-10 flex h-9 w-9 min-w-[36px] items-center justify-center rounded-xl bg-muted/50 border border-border/80 shadow-sm transition-colors group-hover:border-indigo-500/30">
                                    {getActionIcon(activity.action)}
                                </div>
                                <div className="flex-1 min-w-0 mt-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold text-foreground truncate tracking-tight">
                                            {activity.user.email.split("@")[0]}
                                        </p>
                                        <time className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </time>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                                        {activity.details || activity.action.replace(/_/g, " ")}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                <Clock className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">No recent activity detected.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
