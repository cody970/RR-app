import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";

// ---------------------------------------------------------------------------
// PATCH /api/settings/connections/[id] — update an ingestion source
// ---------------------------------------------------------------------------

const updateSourceSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
    societyHint: z.enum(["ASCAP", "BMI", "MLC", "SOUNDEXCHANGE"]).nullable().optional(),
    senderFilter: z.string().max(500).nullable().optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        validatePermission(session.user.role, "SETTINGS_EDIT");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        // Verify the source belongs to the user's org
        const existing = await db.ingestionSource.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Ingestion source not found" },
                { status: 404 },
            );
        }

        const body = await req.json().catch(() => ({}));
        const parsed = updateSourceSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { name, enabled, societyHint, senderFilter } = parsed.data;

        // Build update payload — only include fields that were provided
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (enabled !== undefined) updateData.enabled = enabled;
        if (societyHint !== undefined) updateData.societyHint = societyHint;
        if (senderFilter !== undefined) updateData.senderFilter = senderFilter;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 },
            );
        }

        const updated = await db.ingestionSource.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json({ source: updated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// DELETE /api/settings/connections/[id] — delete an ingestion source
// ---------------------------------------------------------------------------

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        validatePermission(session.user.role, "SETTINGS_EDIT");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        // Verify the source belongs to the user's org
        const existing = await db.ingestionSource.findFirst({
            where: { id: params.id, orgId: session.user.orgId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Ingestion source not found" },
                { status: 404 },
            );
        }

        // Delete associated logs first, then the source
        await db.ingestionLog.deleteMany({
            where: { sourceId: params.id },
        });

        await db.ingestionSource.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}