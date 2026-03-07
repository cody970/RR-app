import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { z } from "zod";
// Note: These notification functions are ready for use when publisher contact info is available
// import { sendCounterProposalEmail, sendCounterProposalSms } from "@/lib/notifications";

const negotiateSchema = z.object({
    token: z.string().min(1),
    action: z.enum(["COUNTER", "ACCEPT", "MESSAGE"]),
    counterSplit: z.number().min(0).max(100).optional(),
    message: z.string().optional(),
    senderName: z.string().optional(),
    senderEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const parsed = negotiateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request data", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { token, action, counterSplit, message, senderName, senderEmail } = parsed.data;

        // Find the signoff by token
        const signoff = await db.splitSignoff.findUnique({
            where: { token },
            include: {
                work: true,
                organization: true,
                negotiation: {
                    include: {
                        messages: {
                            orderBy: { createdAt: "desc" },
                            take: 50,
                        },
                    },
                },
            },
        });

        if (!signoff) {
            return NextResponse.json({ error: "Invalid token" }, { status: 404 });
        }

        if (signoff.expiresAt < new Date()) {
            return NextResponse.json({ error: "This link has expired" }, { status: 400 });
        }

        if (signoff.status === "APPROVED") {
            return NextResponse.json({ error: "This split has already been approved" }, { status: 400 });
        }

        // Get or create negotiation
        let negotiation = signoff.negotiation;
        if (!negotiation) {
            negotiation = await db.splitNegotiation.create({
                data: {
                    workId: signoff.workId,
                    organizationId: signoff.organizationId,
                    proposedSplit: signoff.proposedSplit,
                    expiresAt: signoff.expiresAt,
                    totalParties: 2, // Default to 2 parties
                },
                include: {
                    messages: true,
                },
            });

            // Link the negotiation to the signoff
            await db.splitSignoff.update({
                where: { id: signoff.id },
                data: { negotiationId: negotiation.id },
            });
        }

        // Base URL for notification links (used when notification system is fully configured)
        // const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        // const portalUrl = `${baseUrl}/portal/splits/${token}/negotiate`;

        if (action === "COUNTER") {
            if (counterSplit === undefined) {
                return NextResponse.json(
                    { error: "Counter split value is required" },
                    { status: 400 }
                );
            }

            // Update negotiation with counter-proposal
            const updatedNegotiation = await db.splitNegotiation.update({
                where: { id: negotiation.id },
                data: {
                    counterProposal: counterSplit,
                    status: "COUNTER",
                    currentRound: negotiation.currentRound + 1,
                },
            });

            // Add message for the counter-proposal
            await db.negotiationMessage.create({
                data: {
                    negotiationId: negotiation.id,
                    senderName: senderName || signoff.writerName,
                    senderEmail: senderEmail || signoff.targetEmail,
                    senderRole: "COLLABORATOR",
                    message: message || `Counter-proposal: ${counterSplit}%`,
                    proposedValue: counterSplit,
                },
            });

            // TODO: In production, get publisher contact info from organization
            // For now, we log the notification
            console.log(`[Notification] Counter-proposal ${counterSplit}% sent for ${signoff.work.title}`);

            // Optionally send email notification to publisher
            // await sendCounterProposalEmail(
            //     publisherEmail,
            //     publisherName,
            //     senderName || signoff.writerName,
            //     signoff.work.title,
            //     signoff.proposedSplit,
            //     counterSplit,
            //     message || "",
            //     portalUrl
            // );

            return NextResponse.json({
                success: true,
                negotiation: updatedNegotiation,
                message: "Counter-proposal submitted",
            });
        }

        if (action === "ACCEPT") {
            // Accept the current proposal (either original or counter)
            const acceptedSplit = negotiation.counterProposal ?? negotiation.proposedSplit;

            await db.splitNegotiation.update({
                where: { id: negotiation.id },
                data: { status: "AGREED" },
            });

            // Add acceptance message
            await db.negotiationMessage.create({
                data: {
                    negotiationId: negotiation.id,
                    senderName: senderName || signoff.writerName,
                    senderEmail: senderEmail || signoff.targetEmail,
                    senderRole: "COLLABORATOR",
                    message: `Accepted split of ${acceptedSplit}%`,
                },
            });

            return NextResponse.json({
                success: true,
                message: "Split accepted. Proceed to sign-off.",
                acceptedSplit,
            });
        }

        if (action === "MESSAGE") {
            if (!message?.trim()) {
                return NextResponse.json(
                    { error: "Message is required" },
                    { status: 400 }
                );
            }

            // Add a chat message without changing the split
            await db.negotiationMessage.create({
                data: {
                    negotiationId: negotiation.id,
                    senderName: senderName || signoff.writerName,
                    senderEmail: senderEmail || signoff.targetEmail,
                    senderRole: "COLLABORATOR",
                    message: message,
                },
            });

            return NextResponse.json({
                success: true,
                message: "Message sent",
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error in negotiation:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const signoff = await db.splitSignoff.findUnique({
            where: { token },
            include: {
                work: {
                    include: {
                        writers: {
                            include: { writer: true },
                        },
                    },
                },
                organization: true,
                negotiation: {
                    include: {
                        messages: {
                            orderBy: { createdAt: "asc" },
                        },
                    },
                },
            },
        });

        if (!signoff) {
            return NextResponse.json({ error: "Invalid token" }, { status: 404 });
        }

        return NextResponse.json({
            signoff: {
                id: signoff.id,
                workId: signoff.workId,
                writerName: signoff.writerName,
                targetEmail: signoff.targetEmail,
                proposedSplit: signoff.proposedSplit,
                status: signoff.status,
                expiresAt: signoff.expiresAt,
            },
            work: {
                id: signoff.work.id,
                title: signoff.work.title,
                iswc: signoff.work.iswc,
                writers: signoff.work.writers.map((ww) => ({
                    name: ww.writer.name,
                    splitPercent: ww.splitPercent,
                })),
            },
            organization: {
                id: signoff.organization.id,
                name: signoff.organization.name,
            },
            negotiation: signoff.negotiation
                ? {
                      id: signoff.negotiation.id,
                      status: signoff.negotiation.status,
                      proposedSplit: signoff.negotiation.proposedSplit,
                      counterProposal: signoff.negotiation.counterProposal,
                      currentRound: signoff.negotiation.currentRound,
                      totalParties: signoff.negotiation.totalParties,
                      messages: signoff.negotiation.messages.map((m) => ({
                          id: m.id,
                          senderName: m.senderName,
                          senderRole: m.senderRole,
                          message: m.message,
                          proposedValue: m.proposedValue,
                          createdAt: m.createdAt,
                      })),
                  }
                : null,
        });
    } catch (error) {
        console.error("Error fetching negotiation:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
