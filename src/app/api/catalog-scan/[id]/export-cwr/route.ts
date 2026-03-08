import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { generateCwrForDownload } from "@/lib/infra/registration-service";

/**
 * GET /api/catalog-scan/:id/export-cwr
 *
 * Generates and downloads a CWR (Common Works Registration) file
 * for all open gaps in a specific catalog scan.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: scanId } = params;

        // Fetch scan and its gaps that are ready for registration
        const scan = await db.catalogScan.findUnique({
            where: { id: scanId },
            include: {
                gaps: {
                    where: {
                        status: "OPEN",
                        workId: { not: null }
                    }
                }
            },
        });

        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        if (scan.orgId !== session.user.orgId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const workIds = scan.gaps
            .map((g: any) => g.workId)
            .filter((id: string | null): id is string => !!id);

        if (workIds.length === 0) {
            return NextResponse.json(
                { error: "No open work registration gaps found for this scan" },
                { status: 400 }
            );
        }

        // Get organization info for the CWR header
        const org = await db.organization.findUnique({
            where: { id: scan.orgId },
        });

        // Generate CWR content using the registration service
        const cwrContent = await generateCwrForDownload(
            scan.orgId,
            workIds,
            org?.name || "RoyaltyRadar",
            undefined, // Publisher IPI (could be added to Org model later)
            5 // Default co-publisher split
        );

        // Return as a downloadable file
        return new NextResponse(cwrContent, {
            headers: {
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="RoyaltyRadar_Scan_${scanId}.cwr"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[CWR_EXPORT_ERROR]", error);
        return NextResponse.json(
            { error: "Failed to generate CWR file" },
            { status: 500 }
        );
    }
}
