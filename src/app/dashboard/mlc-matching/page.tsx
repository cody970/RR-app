"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
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
import {
    Play,
    Loader2,
    Search,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    DollarSign,
    Music,
    Database,
    Activity,
    ArrowRight,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

// ---------- Types ----------

interface MLCMatchJob {
    id: string;
    status: string;
    totalWorks: number;
    matchesFound: number;
    createdAt: string;
    error?: string;
    _count?: { results: number };
}

interface MLCHealth {
    bulkApi: { circuitBreakerState: string };
    publicSearch: { circuitBreakerState: string };
    durp: { circuitBreakerState: string };
    configured: { bulkApiKey: boolean; durpKey: boolean };
}

interface SingleSearchResult {
    found: boolean;
    works?: Array<{
        id: string;
        title: string;
        iswc?: string;
        writers: string[];
        publishers: string[];
        status: string;
        claimStatus?: string;
    }>;
    recordings?: Array<{
        id: string;
        title: string;
        isrc: string;
        artist: string;
        matchStatus: string;
        estimatedRoyalty?: number;
    }>;
    totalResults: number;
    unclaimedAmount?: number;
}

// ---------- Component ----------

export default function MLCMatchingPage() {
    const [jobs, setJobs] = useState<MLCMatchJob[]>([]);
    const [health, setHealth] = useState<MLCHealth | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const [activeTab, setActiveTab] = useState<"jobs" | "search" | "unclaimed">("jobs");

    // Single search state
    const [searchType, setSearchType] = useState<"title" | "isrc" | "iswc">("title");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchWriter, setSearchWriter] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<SingleSearchResult | null>(null);

    // Unclaimed state
    const [unclaimedData, setUnclaimedData] = useState<{
        unclaimedAmount: number;
        unmatchedWorks: Array<{ id: string; title: string; iswc?: string; claimStatus?: string }>;
        lastChecked: string;
    } | null>(null);
    const [isCheckingUnclaimed, setIsCheckingUnclaimed] = useState(false);

    const toast = useToast();

    const fetchJobs = useCallback(async () => {
        try {
            const res = await fetch("/api/mlc-matching");
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs || []);
                setHealth(data.health || null);
            }
        } catch (error) {
            console.error("Failed to fetch MLC jobs:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 15000);
        return () => clearInterval(interval);
    }, [fetchJobs]);

    // ---------- Handlers ----------

    const triggerBulkMatch = async () => {
        setIsTriggering(true);
        try {
            const res = await fetch("/api/mlc-matching", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "bulk", limit: 50 }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to trigger job");
            }

            const data = await res.json();
            toast.success(
                `MLC matching completed: ${data.result?.matched || 0} matches found out of ${data.result?.totalSubmitted || 0} items.`
            );
            await fetchJobs();
        } catch (error: any) {
            toast.error(error.message || "Failed to trigger the matching job.");
        } finally {
            setIsTriggering(false);
        }
    };

    const handleSingleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error("Please enter a search query.");
            return;
        }

        setIsSearching(true);
        setSearchResult(null);

        try {
            const body: Record<string, string> = { mode: "single" };
            if (searchType === "title") {
                body.title = searchQuery;
                if (searchWriter.trim()) body.writer = searchWriter;
            } else if (searchType === "isrc") {
                body.isrc = searchQuery;
            } else if (searchType === "iswc") {
                body.iswc = searchQuery;
            }

            const res = await fetch("/api/mlc-matching", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Search failed");
            }

            const data = await res.json();
            setSearchResult(data.result);

            if (data.result?.found) {
                toast.success(`Found ${data.result.totalResults} result(s) on The MLC.`);
            } else {
                toast.info("No results found on The MLC for this query.");
            }
        } catch (error: any) {
            toast.error(error.message || "Search failed.");
        } finally {
            setIsSearching(false);
        }
    };

    const checkUnclaimed = async () => {
        setIsCheckingUnclaimed(true);
        try {
            const res = await fetch("/api/mlc-matching", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "unclaimed" }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to check unclaimed royalties");
            }

            const data = await res.json();
            setUnclaimedData(data.result);

            if (data.result?.unclaimedAmount > 0) {
                toast.success(
                    `Found $${data.result.unclaimedAmount.toLocaleString()} in unclaimed royalties!`
                );
            } else {
                toast.info("No unclaimed royalties found at this time.");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to check unclaimed royalties.");
        } finally {
            setIsCheckingUnclaimed(false);
        }
    };

    // ---------- UI Helpers ----------

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "COMPLETED":
                return (
                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                    </Badge>
                );
            case "FAILED":
                return (
                    <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" /> Failed
                    </Badge>
                );
            case "RUNNING":
                return (
                    <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 animate-pulse">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {status}
                    </Badge>
                );
        }
    };

    const getCircuitBreakerBadge = (state: string) => {
        switch (state) {
            case "CLOSED":
                return <Badge className="bg-green-500/10 text-green-500">Healthy</Badge>;
            case "OPEN":
                return <Badge variant="destructive">Circuit Open</Badge>;
            case "HALF_OPEN":
                return <Badge className="bg-yellow-500/10 text-yellow-500">Recovering</Badge>;
            default:
                return <Badge variant="secondary">{state}</Badge>;
        }
    };

    const hasRunningJob = jobs.some(
        (j) => j.status === "RUNNING" || j.status === "PENDING"
    );

    // ---------- Render ----------

    return (
        <DashboardShell>
            <DashboardHeader
                heading="MLC Matching Tool"
                text="Discover unmatched recordings and unclaimed mechanical royalties at The MLC. Search by title, ISRC, or ISWC, run bulk matching against your catalog, and monitor for unclaimed royalties."
            >
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchJobs}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={triggerBulkMatch}
                        disabled={isTriggering || hasRunningJob}
                    >
                        {isTriggering ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="mr-2 h-4 w-4" />
                        )}
                        Run Bulk Match
                    </Button>
                </div>
            </DashboardHeader>

            {/* Health Status Cards */}
            {health && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Bulk API</span>
                            {getCircuitBreakerBadge(health.bulkApi.circuitBreakerState)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                                {health.configured.bulkApiKey ? "Configured" : "Not configured"}
                            </span>
                        </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Public Search</span>
                            {getCircuitBreakerBadge(health.publicSearch.circuitBreakerState)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Always available</span>
                        </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">DURP Portal</span>
                            {getCircuitBreakerBadge(health.durp.circuitBreakerState)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                                {health.configured.durpKey ? "Configured" : "Not configured"}
                            </span>
                        </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                                Unclaimed Royalties
                            </span>
                            <Badge className="bg-purple-500/10 text-purple-500">
                                <DollarSign className="w-3 h-3 mr-1" />
                                {unclaimedData
                                    ? `$${unclaimedData.unclaimedAmount.toLocaleString()}`
                                    : "Check now"}
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={checkUnclaimed}
                            disabled={isCheckingUnclaimed}
                            className="w-full mt-1"
                        >
                            {isCheckingUnclaimed ? (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                                <DollarSign className="mr-2 h-3 w-3" />
                            )}
                            Check Unclaimed
                        </Button>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 border-b">
                <button
                    onClick={() => setActiveTab("jobs")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "jobs"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Music className="w-4 h-4 inline mr-2" />
                    Matching Jobs
                </button>
                <button
                    onClick={() => setActiveTab("search")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "search"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Search className="w-4 h-4 inline mr-2" />
                    Search MLC
                </button>
                <button
                    onClick={() => setActiveTab("unclaimed")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "unclaimed"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Unclaimed Royalties
                </button>
            </div>

            {/* Tab Content */}
            <div className="grid gap-6">
                {/* ---------- Jobs Tab ---------- */}
                {activeTab === "jobs" && (
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Works Processed</TableHead>
                                    <TableHead className="text-right">Matches Found</TableHead>
                                    <TableHead className="text-right">Match Rate</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : jobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="text-center h-24 text-muted-foreground"
                                        >
                                            No matching jobs run yet. Click &apos;Run Bulk Match&apos; to
                                            start discovering unmatched recordings.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    jobs.map((job) => {
                                        const matchRate =
                                            job.totalWorks > 0
                                                ? Math.round(
                                                      (job.matchesFound / job.totalWorks) * 100
                                                  )
                                                : 0;
                                        return (
                                            <TableRow key={job.id}>
                                                <TableCell className="font-medium">
                                                    {format(
                                                        new Date(job.createdAt),
                                                        "MMM d, yyyy h:mm a"
                                                    )}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(job.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    {job.totalWorks}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-blue-600">
                                                    {job.matchesFound}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {job.totalWorks > 0 ? (
                                                        <span
                                                            className={
                                                                matchRate >= 70
                                                                    ? "text-green-600"
                                                                    : matchRate >= 40
                                                                    ? "text-yellow-600"
                                                                    : "text-red-600"
                                                            }
                                                        >
                                                            {matchRate}%
                                                        </span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* ---------- Search Tab ---------- */}
                {activeTab === "search" && (
                    <div className="space-y-4">
                        <div className="border rounded-lg p-6 bg-white">
                            <h3 className="text-lg font-semibold mb-4">Search The MLC Database</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Search for works and recordings in The MLC&apos;s database by title,
                                ISRC, or ISWC. This uses the MLC Public Search API (or Bulk Data API
                                if configured).
                            </p>

                            <div className="flex gap-2 mb-4">
                                {(["title", "isrc", "iswc"] as const).map((type) => (
                                    <Button
                                        key={type}
                                        variant={searchType === type ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                            setSearchType(type);
                                            setSearchQuery("");
                                            setSearchResult(null);
                                        }}
                                    >
                                        {type.toUpperCase()}
                                    </Button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={
                                        searchType === "title"
                                            ? "Enter song title..."
                                            : searchType === "isrc"
                                            ? "Enter ISRC (e.g., USRC17607839)..."
                                            : "Enter ISWC (e.g., T-345246800-1)..."
                                    }
                                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onKeyDown={(e) => e.key === "Enter" && handleSingleSearch()}
                                />
                                {searchType === "title" && (
                                    <input
                                        type="text"
                                        value={searchWriter}
                                        onChange={(e) => setSearchWriter(e.target.value)}
                                        placeholder="Writer name (optional)..."
                                        className="w-48 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}
                                <Button onClick={handleSingleSearch} disabled={isSearching}>
                                    {isSearching ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-4 w-4" />
                                    )}
                                    Search
                                </Button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchResult && (
                            <div className="border rounded-lg p-6 bg-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">
                                        Search Results ({searchResult.totalResults})
                                    </h3>
                                    {searchResult.unclaimedAmount !== undefined &&
                                        searchResult.unclaimedAmount > 0 && (
                                            <Badge className="bg-purple-500/10 text-purple-500">
                                                <DollarSign className="w-3 h-3 mr-1" />$
                                                {searchResult.unclaimedAmount.toLocaleString()}{" "}
                                                unclaimed
                                            </Badge>
                                        )}
                                </div>

                                {!searchResult.found ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No results found on The MLC for this query.</p>
                                        <p className="text-xs mt-1">
                                            This may indicate the work is not yet registered with The
                                            MLC.
                                        </p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Identifier</TableHead>
                                                <TableHead>Writers / Artists</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Claim Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {searchResult.works?.map((work, i) => (
                                                <TableRow key={`work-${i}`}>
                                                    <TableCell className="font-medium">
                                                        {work.title}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        {work.iswc || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {work.writers.join(", ") || "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(work.status)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {work.claimStatus === "UNCLAIMED" ? (
                                                            <Badge variant="destructive">
                                                                Unclaimed
                                                            </Badge>
                                                        ) : work.claimStatus === "CLAIMED" ? (
                                                            <Badge className="bg-green-500/10 text-green-500">
                                                                Claimed
                                                            </Badge>
                                                        ) : work.claimStatus === "PARTIAL" ? (
                                                            <Badge className="bg-yellow-500/10 text-yellow-500">
                                                                Partial
                                                            </Badge>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {searchResult.recordings?.map((rec, i) => (
                                                <TableRow key={`rec-${i}`}>
                                                    <TableCell className="font-medium">
                                                        {rec.title}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        {rec.isrc}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {rec.artist}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(rec.matchStatus)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {rec.estimatedRoyalty ? (
                                                            <span className="text-purple-600 font-medium">
                                                                ${rec.estimatedRoyalty.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ---------- Unclaimed Tab ---------- */}
                {activeTab === "unclaimed" && (
                    <div className="space-y-4">
                        <div className="border rounded-lg p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Unclaimed Mechanical Royalties
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        The MLC holds approximately $200M in undistributed royalties.
                                        Check if any belong to your catalog.
                                    </p>
                                </div>
                                <Button
                                    onClick={checkUnclaimed}
                                    disabled={isCheckingUnclaimed}
                                >
                                    {isCheckingUnclaimed ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <DollarSign className="mr-2 h-4 w-4" />
                                    )}
                                    Check Now
                                </Button>
                            </div>

                            {unclaimedData ? (
                                <div className="space-y-4">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="border rounded-lg p-4 bg-purple-50">
                                            <p className="text-sm text-muted-foreground">
                                                Estimated Unclaimed
                                            </p>
                                            <p className="text-2xl font-bold text-purple-600">
                                                ${unclaimedData.unclaimedAmount.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="border rounded-lg p-4 bg-blue-50">
                                            <p className="text-sm text-muted-foreground">
                                                Unmatched Works
                                            </p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {unclaimedData.unmatchedWorks.length}
                                            </p>
                                        </div>
                                        <div className="border rounded-lg p-4 bg-gray-50">
                                            <p className="text-sm text-muted-foreground">
                                                Last Checked
                                            </p>
                                            <p className="text-sm font-medium mt-1">
                                                {format(
                                                    new Date(unclaimedData.lastChecked),
                                                    "MMM d, yyyy h:mm a"
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Unmatched Works Table */}
                                    {unclaimedData.unmatchedWorks.length > 0 && (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Title</TableHead>
                                                    <TableHead>ISWC</TableHead>
                                                    <TableHead>Claim Status</TableHead>
                                                    <TableHead className="text-right">
                                                        Action
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {unclaimedData.unmatchedWorks.map((work, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-medium">
                                                            {work.title}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono">
                                                            {work.iswc || "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {work.claimStatus === "UNCLAIMED" ? (
                                                                <Badge variant="destructive">
                                                                    Unclaimed
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">
                                                                    {work.claimStatus || "Unknown"}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm">
                                                                Claim{" "}
                                                                <ArrowRight className="ml-1 h-3 w-3" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>
                                        Click &apos;Check Now&apos; to scan for unclaimed royalties at The
                                        MLC.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* MLC Context Info */}
                        <div className="border rounded-lg p-6 bg-blue-50/50">
                            <h4 className="font-semibold text-sm mb-2">
                                About MLC Unclaimed Royalties
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                The Mechanical Licensing Collective (MLC) was created under the Music
                                Modernization Act to administer blanket mechanical licenses for
                                streaming services. When DSPs report usage but the MLC cannot match a
                                recording to a registered work, the royalties go into an
                                &quot;unmatched&quot; pool. As of the latest data, approximately $200M
                                in royalties remain undistributed. Regular monitoring helps ensure your
                                catalog is fully registered and all royalties are being collected.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}