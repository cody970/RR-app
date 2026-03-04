import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { name } = await req.json();

    // Generate a secure API Key prefixed with rr_
    const rawKey = crypto.randomBytes(32).toString("hex");
    const apiKey = `rr_${rawKey}`;

    const newKey = await db.apiKey.create({
        data: {
            key: apiKey,
            name: name || "Default Key",
            orgId: session.user.orgId,
        }
    });

    // Return the key only once
    return NextResponse.json(newKey);
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
