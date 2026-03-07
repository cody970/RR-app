import { db } from "@/lib/infra/db";
import crypto from "crypto";

/**
 * Hash API key using SHA-256 for secure comparison.
 * Keys are stored hashed, so we must hash incoming keys before lookup.
 */
function hashApiKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(key: string | null) {
    if (!key) return null;

    // Hash the incoming key to match how it's stored in the database
    const keyHash = hashApiKey(key);

    const apiKey = await db.apiKey.findUnique({
        where: { key: keyHash },
        include: { organization: true }
    });

    if (!apiKey) return null;

    // API Key Expiration: 90 days
    const EXPIRATION_DAYS = 90;
    const expiresAt = new Date(apiKey.createdAt.getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    if (expiresAt < new Date()) {
        // Key expired
        return null;
    }

    if (apiKey.revokedAt) return null;

    // Update last used timestamp (background)
    db.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    }).catch(console.error);

    return apiKey.organization;
}
