import { db } from "@/lib/db";

export async function validateApiKey(key: string | null) {
    if (!key) return null;

    const apiKey = await db.apiKey.findUnique({
        where: { key },
        include: { organization: true }
    });

    if (!apiKey) return null;

    // Update last used timestamp (background)
    db.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    }).catch(console.error);

    return apiKey.organization;
}
