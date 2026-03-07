import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";

const updateSettingsSchema = z.object({
    currency: z.string().length(3, "Currency must be a 3-letter ISO code").optional(),
    name: z.string().min(1).max(100).optional(),
});

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const org = await db.organization.findUnique({
        where: { id: session.user.orgId },
        include: {
            apiKeys: {
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    lastUsedAt: true,
                    // key is hidden
                }
            }
        }
    });

    return NextResponse.json(org);
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });

        // RBAC check
        try {
            validatePermission(session.user.role, "SETTINGS_EDIT");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Forbidden";
            return new NextResponse(message, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const parsed = updateSettingsSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { currency, name } = parsed.data;

        if (!currency && !name) {
            return new NextResponse("No valid fields to update", { status: 400 });
        }

        const updateData: { currency?: string; name?: string } = {};
        if (currency) updateData.currency = currency;
        if (name) updateData.name = name;

        const updated = await db.organization.update({
            where: { id: session.user.orgId },
            data: updateData
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return new NextResponse(message, { status: 500 });
    }
}