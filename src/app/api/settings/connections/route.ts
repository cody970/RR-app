import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// GET /api/settings/connections — list all ingestion sources for the org
// ---------------------------------------------------------------------------

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        const sources = await db.ingestionSource.findMany({
            where: { orgId: session.user.orgId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ sources });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// POST /api/settings/connections — create a new ingestion source
// ---------------------------------------------------------------------------

const createSourceSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    societyHint: z.enum(["ASCAP", "BMI", "MLC", "SOUNDEXCHANGE"]).optional(),
    senderFilter: z.string().max(500).optional(),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        validatePermission(session.user.role, "SETTINGS_EDIT");
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return new NextResponse(message, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const parsed = createSourceSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { name, societyHint, senderFilter } = parsed.data;

        // Generate a unique ingest email address using a random token
        const token = randomBytes(8).toString("hex");
        const orgSlug = session.user.orgId.slice(0, 8).toLowerCase();
        const ingestEmail = `ingest-${orgSlug}-${token}@royaltyradar.io`;

        const source = await db.ingestionSource.create({
            data: {
                orgId: session.user.orgId,
                name,
                type: "EMAIL",
                ingestEmail,
                societyHint: societyHint ?? null,
                senderFilter: senderFilter ?? null,
                enabled: true,
            },
        });

        return NextResponse.json({ source }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}