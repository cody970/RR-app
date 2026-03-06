import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    try {
        const { resourceType, resourceId, field, value } = await req.json();

        if (!resourceType || !resourceId || !field || value === undefined) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const orgId = session.user.orgId;

        if (resourceType === "Work") {
            await db.work.update({
                where: { id: resourceId, orgId },
                data: { [field]: value }
            });
        } else if (resourceType === "Recording") {
            await db.recording.update({
                where: { id: resourceId, orgId },
                data: { [field]: value }
            });
        } else {
            return new NextResponse(`Unsupported resource type: ${resourceType}`, { status: 400 });
        }

        // Close all findings related to this resource/field anomaly if needed
        // For simplicity, we just return success
        return NextResponse.json({ status: "success" });

    } catch (e) {
        console.error("Apply fix error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
