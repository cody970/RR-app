import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";
import RegistrationsClient from "./registrations-client";

export default async function RegistrationsPage() {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.orgId;

    if (!orgId) return null;

    // Fetch registrations with works
    const registrations = await db.registration.findMany({
        where: { work: { orgId } },
        include: { work: true },
        orderBy: { updatedAt: "desc" },
    });

    // Fetch works for the wizard
    const works = await db.work.findMany({
        where: { orgId },
        include: {
            writers: { include: { writer: true } },
        },
        orderBy: { title: "asc" },
    });

    // Fetch recent batches
    const batches = await db.registrationBatch.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
    });

    // Compute summary stats
    const totalRegistered = registrations.filter(
        r => r.status === "REGISTERED" || r.status === "ACCEPTED" || r.status === "COMPLETE"
    ).length;
    const totalPending = registrations.filter(
        r => r.status === "PENDING" || r.status === "SUBMITTED"
    ).length;
    const totalGenerated = registrations.filter(r => r.status === "CWR_GENERATED").length;

    // Society breakdown
    const bySociety = registrations.reduce<Record<string, number>>((acc, r) => {
        acc[r.society] = (acc[r.society] || 0) + 1;
        return acc;
    }, {});

    return (
        <RegistrationsClient
            registrations={JSON.parse(JSON.stringify(registrations))}
            works={JSON.parse(JSON.stringify(works))}
            batches={JSON.parse(JSON.stringify(batches))}
            totalRegistered={totalRegistered}
            totalPending={totalPending}
            totalGenerated={totalGenerated}
            bySociety={bySociety}
        />
    );
}
