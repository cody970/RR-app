import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Issue a License from an Approved Request or directly
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new Response("Unauthorized", { status: 401 });
        const orgId = (session.user as any).orgId;

        const body = await req.json();

        // Start transaction if it involves updating request status
        const tx = await db.$transaction(async (prisma: any) => {
            if (body.requestId) {
                // Ensure request belongs to org
                const reqCheck = await prisma.licenseRequest.findUnique({
                    where: { id: body.requestId, orgId },
                });
                if (!reqCheck) throw new Error("Request not found");

                // Update request to APPROVED if not already
                if (reqCheck.status !== "APPROVED") {
                    await prisma.licenseRequest.update({
                        where: { id: body.requestId },
                        data: { status: "APPROVED" },
                    });
                }
            }

            const license = await prisma.license.create({
                data: {
                    orgId,
                    workId: body.workId,
                    requestId: body.requestId || null,
                    licenseType: body.licenseType || "SYNC",
                    licenseeName: body.licenseeName,
                    fee: parseFloat(body.fee) || 0,
                    startDate: body.startDate ? new Date(body.startDate) : null,
                    endDate: body.endDate ? new Date(body.endDate) : null,
                    territory: body.territory,
                    media: body.media,
                    status: "ACTIVE",
                },
            });

            return license;
        });

        return NextResponse.json(tx);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
