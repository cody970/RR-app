import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const orgId = session.user.orgId;
        const users = await db.user.findMany({
            where: { orgId },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json(users);
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        // Only ADMIN/OWNER can manage team
        try {
            validatePermission(session.user.role, "TEAM_MANAGE");
        } catch (e: any) {
            return new NextResponse(e.message, { status: 403 });
        }

        const { userId, role } = await req.json();
        const orgId = session.user.orgId;

        // Prevent self-demotion if only one owner/admin? (Skipping for MVP but good for production)

        const updatedUser = await db.user.update({
            where: { id: userId, orgId },
            data: { role }
        });

        const { logActivity } = await import("@/lib/infra/activity");
        await logActivity({
            orgId,
            userId: session.user.id,
            action: "MEMBER_ROLE_UPDATED",
            details: `Updated role for ${updatedUser.email} to ${role}`
        });

        return NextResponse.json(updatedUser);
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
