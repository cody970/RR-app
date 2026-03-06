import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const orgId = session.user.orgId;
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "SUMMARY"; // SUMMARY, GAPS, CONFLICTS, UNLINKED

        let findings;

        switch (type) {
            case "GAPS":
                findings = await db.finding.findMany({
                    where: { orgId, type: { in: ["MISSING_ISWC", "MISSING_ISRC"] } },
                    orderBy: { severity: "desc" }
                });
                break;
            case "CONFLICTS":
                findings = await db.finding.findMany({
                    where: { orgId, type: { in: ["SPLIT_OVERLAP", "TERRITORY_CONFLICT"] } },
                    orderBy: { estimatedImpact: "desc" }
                });
                break;
            case "UNLINKED":
                findings = await db.finding.findMany({
                    where: { orgId, type: "UNLINKED_RECORDING" },
                    orderBy: { estimatedImpact: "desc" }
                });
                break;
            default: // SUMMARY
                findings = await db.finding.findMany({
                    where: { orgId },
                    orderBy: { estimatedImpact: "desc" }
                });
        }

        return NextResponse.json(findings);
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
