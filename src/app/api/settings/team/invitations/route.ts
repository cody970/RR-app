import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import { validatePermission } from "@/lib/auth/rbac";
import { logger } from "@/lib/infra/logger";
import { z } from "zod";
import crypto from "crypto";

const validRoles = ["ADMIN", "EDITOR", "VIEWER"] as const; // Note: OWNER cannot be assigned via invitation

const createInvitationSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(validRoles, { errorMap: () => ({ message: "Invalid role. Must be ADMIN, EDITOR, or VIEWER" }) }),
});

/**
 * GET /api/settings/team/invitations
 * List all pending invitations for the organization
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only ADMIN/OWNER can view invitations
        try {
            validatePermission(session.user.role, "TEAM_MANAGE");
        } catch {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const orgId = session.user.orgId;
        const invitations = await db.orgInvitation.findMany({
            where: { 
                orgId,
                status: "PENDING",
                expiresAt: { gt: new Date() } // Only show non-expired
            },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                expiresAt: true,
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(invitations);
    } catch (error: unknown) {
        logger.error({ error }, "Error fetching invitations");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/settings/team/invitations
 * Create a new invitation to join the organization
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only ADMIN/OWNER can send invitations
        try {
            validatePermission(session.user.role, "TEAM_MANAGE");
        } catch {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }
        const parsed = createInvitationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { email, role } = parsed.data;
        const orgId = session.user.orgId;
        const normalizedEmail = email.toLowerCase();

        // Check if user already exists in org
        const existingUser = await db.user.findFirst({
            where: { email: normalizedEmail, orgId }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User already belongs to this organization" },
                { status: 409 }
            );
        }

        // Check for existing pending invitation
        const existingInvitation = await db.orgInvitation.findFirst({
            where: {
                email: normalizedEmail,
                orgId,
                status: "PENDING",
                expiresAt: { gt: new Date() }
            }
        });

        if (existingInvitation) {
            return NextResponse.json(
                { error: "An invitation for this email is already pending" },
                { status: 409 }
            );
        }

        // Generate secure invitation token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        // Invitation expires in 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await db.orgInvitation.create({
            data: {
                email: normalizedEmail,
                role,
                token: hashedToken,
                status: "PENDING",
                expiresAt,
                invitedById: session.user.id,
                orgId,
            }
        });

        // Log the invitation activity
        const { logActivity } = await import("@/lib/infra/activity");
        await logActivity({
            orgId,
            userId: session.user.id,
            action: "INVITATION_CREATED",
            details: `Invited ${normalizedEmail} with role ${role}`
        });

        logger.info({ 
            orgId, 
            invitedEmail: normalizedEmail, 
            role, 
            invitedBy: session.user.id 
        }, "Organization invitation created");

        // Return the raw token only once (it's hashed in DB)
        return NextResponse.json({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            // Include the invitation link that can be sent to the user
            inviteToken: rawToken,
        }, { status: 201 });

    } catch (error: unknown) {
        logger.error({ error }, "Error creating invitation");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/settings/team/invitations
 * Revoke a pending invitation
 */
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only ADMIN/OWNER can revoke invitations
        try {
            validatePermission(session.user.role, "TEAM_MANAGE");
        } catch {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const invitationId = searchParams.get("id");

        if (!invitationId) {
            return NextResponse.json(
                { error: "Invitation ID is required" },
                { status: 400 }
            );
        }

        const orgId = session.user.orgId;

        // Verify invitation belongs to org and is pending
        const invitation = await db.orgInvitation.findFirst({
            where: {
                id: invitationId,
                orgId,
                status: "PENDING"
            }
        });

        if (!invitation) {
            return NextResponse.json(
                { error: "Invitation not found or already processed" },
                { status: 404 }
            );
        }

        await db.orgInvitation.update({
            where: { id: invitationId },
            data: { status: "REVOKED" }
        });

        // Log the revocation
        const { logActivity } = await import("@/lib/infra/activity");
        await logActivity({
            orgId,
            userId: session.user.id,
            action: "INVITATION_REVOKED",
            details: `Revoked invitation for ${invitation.email}`
        });

        logger.info({ 
            orgId, 
            invitationId, 
            email: invitation.email,
            revokedBy: session.user.id 
        }, "Organization invitation revoked");

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        logger.error({ error }, "Error revoking invitation");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
