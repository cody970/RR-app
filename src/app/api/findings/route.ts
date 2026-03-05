import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const status = searchParams.get("status");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

        const where: any = {
            orgId: session.user.orgId,
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
    } catch (err: any) {
        return new Response(err.message, { status: 500 });
    }
}
