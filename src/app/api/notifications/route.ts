import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");

        const [notifications, unreadCount] = await Promise.all([
            db.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: limit,
            }),
            db.notification.count({
                where: { userId, read: false },
            }),
        ]);

        return NextResponse.json({ notifications, unreadCount });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const userId = session.user.id;

        const body = await req.json();

        if (body.markAllRead) {
            await db.notification.updateMany({
                where: { userId, read: false },
                data: { read: true },
            });
        } else if (body.id) {
            // CRIT-3 fix: Scope update to the current user's notifications only
            // This prevents IDOR where any user could mark any notification as read
            const result = await db.notification.updateMany({
                where: { 
                    id: body.id,
                    userId // Ensures the notification belongs to the current user
                },
                data: { read: true },
            });

            if (result.count === 0) {
                return NextResponse.json({ error: "Notification not found or access denied" }, { status: 404 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
