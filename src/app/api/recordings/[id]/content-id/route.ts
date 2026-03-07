import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { HaawkClient } from "@/lib/clients/haawk-client";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = (session.user as any).orgId;
        if (!orgId) {
            return NextResponse.json({ error: "No organization found" }, { status: 403 });
        }

        const haawk = new HaawkClient();

        // Submit the recording to Content ID
        const result = await haawk.submitRecording(params.id, {
            platforms: ["YouTube", "Facebook", "Instagram", "TikTok"],
            policy: "MONETIZE"
        });

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error("Error submitting to Content ID:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit recording" },
            { status: 500 }
        );
    }
}
