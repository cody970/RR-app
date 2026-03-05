/**
 * Typed session helper — eliminates boilerplate and `as any` casts.
 *
 * Usage:
 *   const { session, orgId, role } = await requireAuth();
 *   // throws → caller should wrap in try/catch or use in a route that handles errors
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}

export async function requireAuth() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        throw new AuthError("Unauthorized", 401);
    }

    return {
        session,
        userId: session.user.id,
        orgId: session.user.orgId!,
        role: session.user.role ?? "VIEWER",
    };
}
