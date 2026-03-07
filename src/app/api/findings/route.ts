import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { ApiErrors } from "@/lib/api/error-response";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const status = searchParams.get("status");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return ApiErrors.Unauthorized();

        const orgId = session.user.orgId;
        if (!orgId) return ApiErrors.Forbidden("No organization linked to account");

        const where: any = {
            orgId,
        };

        if (type) where.type = type;
        if (status) where.status = status;

        const [findings, total] = await Promise.all([
            db.finding.findMany({
                where,
                include: {
                    resource: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: limit,
                skip: skip,
            }),
            db.finding.count({ where })
        ]);

        return NextResponse.json({
            findings,
            pagination: {
                total,
                page,
                limit,
                hasMore: total > skip + findings.length
            }
        });
    } catch (error: any) {
        console.error("Findings API error:", error);
        return ApiErrors.Internal(error?.message || "Internal Server Error");
    }
}
