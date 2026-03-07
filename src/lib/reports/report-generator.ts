/**
 * Report Generator
 *
 * Generates comprehensive reports in multiple formats (PDF, CSV, JSON).
 * Supports various report types: audit summary, revenue breakdown,
 * catalog health, and recovery progress.
 */

import { db } from "@/lib/infra/db";
import { formatCurrency } from "@/lib/finance/currency";

// ---------- Types ----------

export type ReportType =
    | "AUDIT_SUMMARY"
    | "REVENUE_BREAKDOWN"
    | "CATALOG_HEALTH"
    | "RECOVERY_PROGRESS"
    | "CUSTOM";

export type ReportFormat = "PDF" | "CSV" | "JSON";

export type ReportSchedule = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

export interface ReportFilters {
    dateFrom?: string;
    dateTo?: string;
    societies?: string[];
    severities?: string[];
    statuses?: string[];
    minImpact?: number;
}

export interface ReportData {
    type: ReportType;
    orgName: string;
    generatedAt: string;
    period: { from: string; to: string };
    sections: ReportSection[];
}

export interface ReportSection {
    title: string;
    summary?: Record<string, string | number>;
    table?: {
        headers: string[];
        rows: (string | number)[][];
    };
}

// ---------- Report Type Definitions ----------

export const REPORT_TYPES: Record<
    ReportType,
    { label: string; description: string; icon: string }
> = {
    AUDIT_SUMMARY: {
        label: "Audit Summary",
        description: "Comprehensive overview of all audit findings, severity breakdown, and financial impact.",
        icon: "FileSearch",
    },
    REVENUE_BREAKDOWN: {
        label: "Revenue Breakdown",
        description: "Detailed revenue analysis by society, period, and top-earning works.",
        icon: "DollarSign",
    },
    CATALOG_HEALTH: {
        label: "Catalog Health",
        description: "Registration coverage, metadata completeness, and catalog quality metrics.",
        icon: "HeartPulse",
    },
    RECOVERY_PROGRESS: {
        label: "Recovery Progress",
        description: "Track recovered revenue, open disputes, and recovery efficiency over time.",
        icon: "TrendingUp",
    },
    CUSTOM: {
        label: "Custom Report",
        description: "Build a custom report with selected data points and filters.",
        icon: "Settings2",
    },
};

export const SCHEDULE_OPTIONS: Record<
    ReportSchedule,
    { label: string; description: string }
> = {
    DAILY: { label: "Daily", description: "Every day at 6:00 AM UTC" },
    WEEKLY: { label: "Weekly", description: "Every Monday at 6:00 AM UTC" },
    MONTHLY: { label: "Monthly", description: "1st of each month at 6:00 AM UTC" },
    QUARTERLY: { label: "Quarterly", description: "Jan 1, Apr 1, Jul 1, Oct 1 at 6:00 AM UTC" },
};

// ---------- Data Fetchers ----------

async function fetchAuditSummaryData(
    orgId: string,
    filters: ReportFilters,
): Promise<ReportSection[]> {
    const dateFilter: Record<string, unknown> = {};
    if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);

    const where: Record<string, unknown> = { orgId };
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
    if (filters.severities?.length) where.severity = { in: filters.severities };
    if (filters.statuses?.length) where.status = { in: filters.statuses };

    const [findings, byType, bySeverity, aggregate] = await Promise.all([
        db.finding.findMany({
            where,
            orderBy: { estimatedImpact: "desc" },
            take: 50,
        }),
        db.finding.groupBy({
            by: ["type"],
            where,
            _count: { id: true },
            _sum: { estimatedImpact: true, recoveredAmount: true },
        }),
        db.finding.groupBy({
            by: ["severity"],
            where,
            _count: { id: true },
            _sum: { estimatedImpact: true },
        }),
        db.finding.aggregate({
            where,
            _count: { id: true },
            _sum: { estimatedImpact: true, recoveredAmount: true },
        }),
    ]);

    const totalImpact = aggregate._sum.estimatedImpact || 0;
    const totalRecovered = aggregate._sum.recoveredAmount || 0;

    return [
        {
            title: "Overview",
            summary: {
                "Total Findings": aggregate._count.id,
                "Estimated Impact": formatCurrency(totalImpact),
                "Recovered Amount": formatCurrency(totalRecovered),
                "Recovery Rate": totalImpact > 0
                    ? `${((totalRecovered / totalImpact) * 100).toFixed(1)}%`
                    : "N/A",
            },
        },
        {
            title: "Findings by Type",
            table: {
                headers: ["Type", "Count", "Est. Impact", "Recovered"],
                rows: byType.map((t) => [
                    t.type.replace(/_/g, " "),
                    t._count.id,
                    formatCurrency(t._sum.estimatedImpact || 0),
                    formatCurrency(t._sum.recoveredAmount || 0),
                ]),
            },
        },
        {
            title: "Findings by Severity",
            table: {
                headers: ["Severity", "Count", "Est. Impact"],
                rows: bySeverity.map((s) => [
                    s.severity,
                    s._count.id,
                    formatCurrency(s._sum.estimatedImpact || 0),
                ]),
            },
        },
        {
            title: "Top Findings by Impact",
            table: {
                headers: ["Type", "Severity", "Status", "Impact", "Resource"],
                rows: findings.slice(0, 25).map((f) => [
                    f.type.replace(/_/g, " "),
                    f.severity,
                    f.status,
                    formatCurrency(f.estimatedImpact || 0),
                    f.resourceId,
                ]),
            },
        },
    ];
}

async function fetchRevenueBreakdownData(
    orgId: string,
    filters: ReportFilters,
): Promise<ReportSection[]> {
    const periodsWhere: Record<string, unknown> = { orgId };
    if (filters.dateFrom || filters.dateTo) {
        const dateFilter: Record<string, unknown> = {};
        if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
        if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
        periodsWhere.startDate = dateFilter;
    }

    const periods = await db.royaltyPeriod.findMany({
        where: periodsWhere,
        orderBy: { startDate: "desc" },
    });

    // Group by society
    const bySociety: Record<string, { total: number; count: number }> = {};
    let grandTotal = 0;

    for (const p of periods) {
        const key = p.source || "UNKNOWN";
        if (!bySociety[key]) bySociety[key] = { total: 0, count: 0 };
        bySociety[key].total += p.totalAmount || 0;
        bySociety[key].count++;
        grandTotal += p.totalAmount || 0;
    }

    // Top works by revenue
    const topWorks = await db.statementLine.groupBy({
        by: ["workId"],
        where: {
            statement: { orgId },
            workId: { not: null },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 20,
    });

    // Fetch work titles
    const workIds = topWorks.map((w) => w.workId).filter(Boolean) as string[];
    const works = workIds.length > 0
        ? await db.work.findMany({
              where: { id: { in: workIds } },
              select: { id: true, title: true },
          })
        : [];
    const workMap = new Map(works.map((w) => [w.id, w.title]));

    return [
        {
            title: "Revenue Overview",
            summary: {
                "Total Revenue": formatCurrency(grandTotal),
                "Statement Periods": periods.length,
                "Societies": Object.keys(bySociety).length,
            },
        },
        {
            title: "Revenue by Society",
            table: {
                headers: ["Society", "Total Revenue", "Periods", "% of Total"],
                rows: Object.entries(bySociety)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([society, data]) => [
                        society,
                        formatCurrency(data.total),
                        data.count,
                        grandTotal > 0
                            ? `${((data.total / grandTotal) * 100).toFixed(1)}%`
                            : "0%",
                    ]),
            },
        },
        {
            title: "Revenue by Period",
            table: {
                headers: ["Period", "Society", "Amount", "Lines"],
                rows: periods.slice(0, 30).map((p) => [
                    `${p.startDate.toISOString().split("T")[0]} — ${p.endDate.toISOString().split("T")[0]}`,
                    p.source || "Unknown",
                    formatCurrency(p.totalAmount || 0),
                    p.lineCount || 0,
                ]),
            },
        },
        {
            title: "Top Works by Revenue",
            table: {
                headers: ["Work", "Total Revenue", "Statement Lines"],
                rows: topWorks.map((w) => [
                    workMap.get(w.workId || "") || w.workId || "Unknown",
                    formatCurrency(w._sum.amount || 0),
                    w._count.id,
                ]),
            },
        },
    ];
}

async function fetchCatalogHealthData(
    orgId: string,
    _filters: ReportFilters,
): Promise<ReportSection[]> {
    const [
        totalWorks,
        totalRecordings,
        worksWithIswc,
        recordingsWithIsrc,
        totalRegistrations,
        totalWriters,
    ] = await Promise.all([
        db.work.count({ where: { orgId } }),
        db.recording.count({ where: { orgId } }),
        db.work.count({ where: { orgId, iswc: { not: null } } }),
        db.recording.count({ where: { orgId, isrc: { not: null } } }),
        db.registration.count({ where: { work: { orgId } } }),
        db.writer.count({ where: { orgId } }),
    ]);

    const iswcCoverage = totalWorks > 0 ? ((worksWithIswc / totalWorks) * 100).toFixed(1) : "0";
    const isrcCoverage = totalRecordings > 0 ? ((recordingsWithIsrc / totalRecordings) * 100).toFixed(1) : "0";

    // Registration coverage by society
    const regBySociety = await db.registration.groupBy({
        by: ["society"],
        where: { work: { orgId } },
        _count: { id: true },
    });

    return [
        {
            title: "Catalog Overview",
            summary: {
                "Total Works": totalWorks,
                "Total Recordings": totalRecordings,
                "Total Writers": totalWriters,
                "Total Registrations": totalRegistrations,
                "ISWC Coverage": `${iswcCoverage}%`,
                "ISRC Coverage": `${isrcCoverage}%`,
            },
        },
        {
            title: "Registration Coverage by Society",
            table: {
                headers: ["Society", "Registrations", "% of Works"],
                rows: regBySociety.map((r) => [
                    r.society,
                    r._count.id,
                    totalWorks > 0
                        ? `${((r._count.id / totalWorks) * 100).toFixed(1)}%`
                        : "0%",
                ]),
            },
        },
    ];
}

async function fetchRecoveryProgressData(
    orgId: string,
    filters: ReportFilters,
): Promise<ReportSection[]> {
    const where: Record<string, unknown> = { orgId };
    if (filters.dateFrom || filters.dateTo) {
        const dateFilter: Record<string, unknown> = {};
        if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
        if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
        where.createdAt = dateFilter;
    }

    const [total, open, recovered, disputed, ignored] = await Promise.all([
        db.finding.count({ where }),
        db.finding.count({ where: { ...where, status: "OPEN" } }),
        db.finding.count({ where: { ...where, status: "RECOVERED" } }),
        db.finding.count({ where: { ...where, status: "DISPUTED" } }),
        db.finding.count({ where: { ...where, status: "IGNORED" } }),
    ]);

    const aggregate = await db.finding.aggregate({
        where,
        _sum: { estimatedImpact: true, recoveredAmount: true },
    });

    const totalImpact = aggregate._sum.estimatedImpact || 0;
    const totalRecoveredAmt = aggregate._sum.recoveredAmount || 0;

    // Recovery by type
    const byType = await db.finding.groupBy({
        by: ["type"],
        where: { ...where, status: "RECOVERED" },
        _count: { id: true },
        _sum: { recoveredAmount: true },
    });

    return [
        {
            title: "Recovery Overview",
            summary: {
                "Total Findings": total,
                "Open": open,
                "Recovered": recovered,
                "Disputed": disputed,
                "Ignored": ignored,
                "Total Impact": formatCurrency(totalImpact),
                "Total Recovered": formatCurrency(totalRecoveredAmt),
                "Recovery Rate": totalImpact > 0
                    ? `${((totalRecoveredAmt / totalImpact) * 100).toFixed(1)}%`
                    : "N/A",
            },
        },
        {
            title: "Recovery by Finding Type",
            table: {
                headers: ["Type", "Recovered Count", "Recovered Amount"],
                rows: byType.map((t) => [
                    t.type.replace(/_/g, " "),
                    t._count.id,
                    formatCurrency(t._sum.recoveredAmount || 0),
                ]),
            },
        },
    ];
}

// ---------- Main Generator ----------

/**
 * Generate report data for a given type and org.
 */
export async function generateReportData(
    orgId: string,
    type: ReportType,
    filters: ReportFilters = {},
): Promise<ReportData> {
    const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
    });

    const now = new Date();
    const from = filters.dateFrom || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to = filters.dateTo || now.toISOString().split("T")[0];

    let sections: ReportSection[];

    switch (type) {
        case "AUDIT_SUMMARY":
            sections = await fetchAuditSummaryData(orgId, filters);
            break;
        case "REVENUE_BREAKDOWN":
            sections = await fetchRevenueBreakdownData(orgId, filters);
            break;
        case "CATALOG_HEALTH":
            sections = await fetchCatalogHealthData(orgId, filters);
            break;
        case "RECOVERY_PROGRESS":
            sections = await fetchRecoveryProgressData(orgId, filters);
            break;
        case "CUSTOM":
            // Custom combines all sections
            sections = [
                ...(await fetchAuditSummaryData(orgId, filters)),
                ...(await fetchRevenueBreakdownData(orgId, filters)),
                ...(await fetchCatalogHealthData(orgId, filters)),
            ];
            break;
        default:
            sections = [];
    }

    return {
        type,
        orgName: org?.name || "Unknown Organization",
        generatedAt: now.toISOString(),
        period: { from, to },
        sections,
    };
}

/**
 * Convert report data to CSV format.
 */
export function reportDataToCSV(data: ReportData): string {
    const lines: string[] = [];

    lines.push(`# ${REPORT_TYPES[data.type]?.label || data.type} Report`);
    lines.push(`# Organization: ${data.orgName}`);
    lines.push(`# Generated: ${data.generatedAt}`);
    lines.push(`# Period: ${data.period.from} to ${data.period.to}`);
    lines.push("");

    for (const section of data.sections) {
        lines.push(`## ${section.title}`);

        if (section.summary) {
            for (const [key, value] of Object.entries(section.summary)) {
                lines.push(`${key},${value}`);
            }
            lines.push("");
        }

        if (section.table) {
            lines.push(section.table.headers.join(","));
            for (const row of section.table.rows) {
                lines.push(
                    row
                        .map((cell) => {
                            const str = String(cell);
                            return str.includes(",") ? `"${str}"` : str;
                        })
                        .join(","),
                );
            }
            lines.push("");
        }
    }

    return lines.join("\n");
}

/**
 * Convert report data to JSON format.
 */
export function reportDataToJSON(data: ReportData): string {
    return JSON.stringify(data, null, 2);
}

/**
 * Calculate the next run time for a scheduled report.
 */
export function calculateNextRun(schedule: ReportSchedule, from: Date = new Date()): Date {
    const next = new Date(from);
    next.setUTCHours(6, 0, 0, 0); // Always run at 6:00 AM UTC

    switch (schedule) {
        case "DAILY":
            next.setUTCDate(next.getUTCDate() + 1);
            break;
        case "WEEKLY":
            // Next Monday
            const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7;
            next.setUTCDate(next.getUTCDate() + daysUntilMonday);
            break;
        case "MONTHLY":
            next.setUTCMonth(next.getUTCMonth() + 1);
            next.setUTCDate(1);
            break;
        case "QUARTERLY":
            const currentQuarter = Math.floor(next.getUTCMonth() / 3);
            next.setUTCMonth((currentQuarter + 1) * 3);
            next.setUTCDate(1);
            break;
    }

    return next;
}