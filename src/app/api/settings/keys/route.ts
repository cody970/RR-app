import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import crypto from "crypto";

function hashApiKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { name } = await req.json();

    // Generate a secure API Key prefixed with rr_
    const rawKey = crypto.randomBytes(32).toString("hex");
    const apiKey = `rr_${rawKey}`;

    // Store only the hash — the raw key is returned once and never stored
    const keyHash = hashApiKey(apiKey);

    const newKey = await db.apiKey.create({
        data: {
            key: keyHash,
            name: name || "Default Key",
            orgId: session.user.orgId,
        }
    });

    // Return the raw key only on creation (client must save it)
    return NextResponse.json({ ...newKey, key: apiKey });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return new Response("Missing ID", { status: 400 });

    await db.apiKey.delete({
        where: { id, orgId: session.user.orgId }
    });

    return new Response(null, { status: 204 });
}
