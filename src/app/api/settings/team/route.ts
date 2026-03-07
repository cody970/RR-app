import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";

const validRoles = ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const;

const updateRoleSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    role: z.enum(validRoles, { errorMap: () => ({ message: "Invalid role" }) }),
});

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return new NextResponse(message, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        // Only ADMIN/OWNER can manage team
        try {
            validatePermission(session.user.role, "TEAM_MANAGE");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Forbidden";
            return new NextResponse(message, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const parsed = updateRoleSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { userId, role } = parsed.data;
        const orgId = session.user.orgId;

        // Prevent self-modification
        if (userId === session.user.id) {
            return new NextResponse("Cannot modify your own role", { status: 400 });
        }

        // Verify user belongs to same org
        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { orgId: true, email: true }
        });

        if (!targetUser || targetUser.orgId !== orgId) {
            return new NextResponse("User not found in your organization", { status: 404 });
        }

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return new NextResponse(message, { status: 500 });
    }
}