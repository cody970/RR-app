import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { generateRetroactiveClaim } from "@/lib/infra/claim-service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; gapId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ideally, we'd verify the user belongs to the org that owns the scan/gap
        // But the claim-service handles the orgId check.
        // For now, we need the user's orgId. We assume session.user includes orgId, or we fallback.
        // Let's assume session.user.orgId is valid.
        const orgId = (session.user as any).orgId;
        if (!orgId) {
            return NextResponse.json({ error: "No organization found for user" }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const targetSociety = body.targetSociety || "Relevant Society";

        const claim = await generateRetroactiveClaim((await params).gapId, orgId, targetSociety);

        return NextResponse.json({ success: true, claim });
    } catch (error: any) {
        console.error("Error generating LOD:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate LOD" },
            { status: 500 }
        );
    }
}
