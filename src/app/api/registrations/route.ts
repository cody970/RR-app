import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/infra/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const registrations = await db.registration.findMany({
            where: {
                work: {
                    orgId: session.user.orgId
                }
            },
            include: {
                work: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(registrations);
    } catch (error) {
        console.error("Error fetching registrations:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
