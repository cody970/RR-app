import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

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
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { currency } = await req.json();

    const updated = await db.organization.update({
        where: { id: session.user.orgId },
        data: { currency }
    });

    return NextResponse.json(updated);
}
