import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = (session.user as any).orgId;

        // Fetch statement-related findings
        const findings = await db.finding.findMany({
            where: {
                orgId,
                type: { startsWith: "STATEMENT_" },
            },
            orderBy: [{ severity: "asc" }, { estimatedImpact: "desc" }],
            take: 100,
        });

        // Summary stats
        const total = findings.length;
        const totalImpact = findings.reduce((s, f) => s + (f.estimatedImpact || 0), 0);
        const open = findings.filter(f => f.status === "OPEN").length;
        const high = findings.filter(f => f.severity === "HIGH").length;

        const byType = findings.reduce((acc, f) => {
            acc[f.type] = (acc[f.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            total,
            totalImpact,
            open,
            high,
            byType,
            findings: findings.map(f => ({
                id: f.id,
                type: f.type,
                severity: f.severity,
                status: f.status,
                confidence: f.confidence,
                estimatedImpact: f.estimatedImpact,
                description: f.metadataFix,
                createdAt: f.createdAt,
            })),
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
