import { db } from "@/lib/infra/db";

export async function validateApiKey(key: string | null) {
    if (!key) return null;

    const apiKey = await db.apiKey.findUnique({
        where: { key },
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
