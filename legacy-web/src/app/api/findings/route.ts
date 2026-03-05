import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = (session.user as any).orgId;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        // Filter params
        const type = searchParams.get("type");
        const severity = searchParams.get("severity");
        const status = searchParams.get("status");
        const search = searchParams.get("search");
        const sortBy = searchParams.get("sortBy") || "estimatedImpact";
        const sortOrder = searchParams.get("sortOrder") || "desc";

        // Build dynamic where clause
        const where: any = { orgId };

        if (type) where.type = type;
        if (severity) where.severity = severity;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { resourceId: { contains: search, mode: "insensitive" } },
                { type: { contains: search, mode: "insensitive" } },
            ];
        }

        // Validate sortBy to prevent injection
        const allowedSorts = ["estimatedImpact", "createdAt", "severity", "confidence", "type"];
        const safeSort = allowedSorts.includes(sortBy) ? sortBy : "estimatedImpact";
        const safeOrder = sortOrder === "asc" ? "asc" : "desc";

        const [findings, totalCount] = await Promise.all([
            db.finding.findMany({
                where,
                orderBy: { [safeSort]: safeOrder },
                skip,
                take: limit
            }),
            db.finding.count({ where })
        ]);

        return NextResponse.json({
            findings,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit
            }
        });
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
