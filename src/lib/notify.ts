import { db } from "./db";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

interface CreateNotificationOptions {
    orgId: string;
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
}

/**
 * Creates an in-app notification for a specific user.
 */
export async function createNotification(opts: CreateNotificationOptions) {
    return db.notification.create({
        data: {
            orgId: opts.orgId,
            userId: opts.userId,
            title: opts.title,
            message: opts.message,
            type: opts.type || "INFO",
            link: opts.link,
        },
    });
}

/**
 * Sends a notification to ALL users in the organization.
 */
export async function notifyOrg(opts: Omit<CreateNotificationOptions, "userId">) {
    const users = await db.user.findMany({
        where: { orgId: opts.orgId },
        select: { id: true },
    });

    return db.notification.createMany({
        data: users.map((u) => ({
            orgId: opts.orgId,
            userId: u.id,
            title: opts.title,
            message: opts.message,
            type: opts.type || "INFO",
            link: opts.link,
        })),
    });
}
