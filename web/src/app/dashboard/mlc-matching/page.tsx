"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, Search, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Assuming this exists from shadcn

interface MLCMatchJob {
    id: string;
    status: string;
    totalWorks: number;
    matchesFound: number;
    createdAt: string;
}

export default function MLCMatchingPage() {
    const [jobs, setJobs] = useState<MLCMatchJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchJobs();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchJobs, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await fetch("/api/mlc-matching");
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
            }
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerMatchingJob = async () => {
        setIsTriggering(true);
        try {
            const res = await fetch("/api/mlc-matching", { method: "POST" });
            if (!res.ok) throw new Error("Failed to trigger job");

            toast({
                title: "Job Started",
                description: "MLC Matching automation has been queued.",
            });
            await fetchJobs();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to trigger the matching job.",
                variant: "destructive"
            });
        } finally {
            setIsTriggering(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "COMPLETED": return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
            case "FAILED": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            case "RUNNING": return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
            default: return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {status}</Badge>;
        }
    };

    return (
        <DashboardShell>
            <DashboardHeader
                heading="MLC Matching Automation"
                text="Automate the discovery and matching of sound recordings on the MLC portal."
            >
                <Button onClick={triggerMatchingJob} disabled={isTriggering || jobs.some(j => j.status === 'RUNNING' || j.status === 'PENDING')}>
                    {isTriggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run Matching Job
                </Button>
            </DashboardHeader>

            <div className="grid gap-6">
                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Works Processed</TableHead>
                                <TableHead className="text-right">Matches Found</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : jobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        No matching jobs run yet. Click 'Run Matching Job' to start.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(job.createdAt), "MMM d, yyyy h:mm a")}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                                        <TableCell className="text-right">{job.totalWorks}</TableCell>
                                        <TableCell className="text-right font-medium text-blue-600">
                                            {job.matchesFound}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardShell>
    );
}
