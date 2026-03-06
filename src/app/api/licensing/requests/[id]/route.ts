import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function PATCH(
    req: NextRequest,
    context: any
) {
    try {
        const { params } = context;
        const id = params.id;
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = session.user.orgId;

        const body = await req.json();

        const request = await db.licenseRequest.update({
            where: { id, orgId },
            data: {
                status: body.status,
                notes: body.notes !== undefined ? body.notes : undefined,
            },
        });

        return NextResponse.json(request);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
