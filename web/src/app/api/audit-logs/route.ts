import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const orgId = session.user.orgId;
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            db.auditLog.findMany({
                where: { orgId },
                include: { user: { select: { email: true, role: true } } },
                orderBy: { timestamp: "desc" },
                skip,
                take: limit,
            }),
            db.auditLog.count({ where: { orgId } }),
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            }
        });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
