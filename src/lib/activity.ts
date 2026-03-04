import { db } from "./db";
import { createHash } from "crypto";

export async function logActivity({
    orgId,
    userId,
    action,
    resourceId,
    resourceType,
    details,
}: {
    orgId: string;
    userId: string;
    action: string;
    resourceId?: string;
    resourceType?: string;
    details?: string;
}) {
    try {
        // 1. Create Activity (for standard feed)
        const activity = await db.activity.create({
            data: {
                orgId,
                userId,
                action,
                resourceId,
                resourceType,
                details,
            },
        });

        // 2. Create AuditLog (for compliance/legal trail)
        // Generate evidence hash for immutability check
        const dataToHash = JSON.stringify({ action, details, userId, timestamp: new Date().toISOString() });
        const evidenceHash = createHash("sha256").update(dataToHash).digest("hex");

        await db.auditLog.create({
            data: {
                orgId,
                userId,
                action,
                details: details || "{}", // Ensure JSON-compatible or string
                evidenceHash,
            }
        });

        return activity;
    } catch (error) {
        console.error("Failed to log activity:", error);
        return null;
    }
}
