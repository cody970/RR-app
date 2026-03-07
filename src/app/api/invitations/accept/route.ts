import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import { z } from "zod";
import crypto from "crypto";

const acceptInvitationSchema = z.object({
    token: z.string().min(1, "Token is required"),
});

/**
 * GET /api/invitations/accept?token=xxx
 * Get invitation details (for UI to show before accepting)
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        // Hash the token to look up in database
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const invitation = await db.orgInvitation.findUnique({
            where: { token: hashedToken },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                expiresAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        if (!invitation) {
            return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
        }

        if (invitation.status !== "PENDING") {
            return NextResponse.json(
                { error: `Invitation has already been ${invitation.status.toLowerCase()}` },
                { status: 400 }
            );
        }

        if (new Date() > invitation.expiresAt) {
            // Mark as expired
            await db.orgInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" }
            });
            return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
        }

        return NextResponse.json({
            email: invitation.email,
            role: invitation.role,
            organization: invitation.organization.name,
            expiresAt: invitation.expiresAt,
        });

    } catch (error: unknown) {
        logger.error({ error }, "Error fetching invitation details");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/invitations/accept
 * Accept an invitation and create user account or link existing OAuth account
 * 
 * This endpoint handles the case where a user clicks an invitation link.
 * The user will be redirected to sign in with OAuth, and then this endpoint
 * links them to the organization.
 */
export async function POST(req: Request) {
    try {
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }
        const parsed = acceptInvitationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { token } = parsed.data;

        // Hash the token to look up in database
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const invitation = await db.orgInvitation.findUnique({
            where: { token: hashedToken },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        if (!invitation) {
            return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
        }

        if (invitation.status !== "PENDING") {
            return NextResponse.json(
                { error: `Invitation has already been ${invitation.status.toLowerCase()}` },
                { status: 400 }
            );
        }

        if (new Date() > invitation.expiresAt) {
            await db.orgInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" }
            });
            return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
        }

        // Check if user already exists in the system (might be in different org)
        const existingUser = await db.user.findUnique({
            where: { email: invitation.email }
        });

        if (existingUser) {
            // User exists - they need to sign in with their existing account
            // For now, we'll return info to redirect them to sign in
            // The OAuth callback will handle joining the org
            return NextResponse.json({
                action: "signin_required",
                message: "User account exists. Please sign in to accept the invitation.",
                email: invitation.email,
                organizationName: invitation.organization.name,
            });
        }

        // User doesn't exist - they'll need to sign up via OAuth
        // Store the invitation token in a cookie/session so OAuth callback can use it
        return NextResponse.json({
            action: "signup_required",
            message: "Please sign up with OAuth to join the organization.",
            email: invitation.email,
            organizationName: invitation.organization.name,
            role: invitation.role,
        });

    } catch (error: unknown) {
        logger.error({ error }, "Error accepting invitation");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
