import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";

export async function POST(req: Request) {
    const authHeader = req.headers.get("Authorization");
    const key = authHeader?.replace("Bearer ", "");

    const organization = await validateApiKey(key || null);
    if (!organization) {
        return new NextResponse("Unauthorized: Invalid API Key", { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, data } = body;

        if (!type || !data) {
            return new NextResponse("Missing type or data", { status: 400 });
        }

        const orgId = organization.id;

        switch (type.toUpperCase()) {
            case "WORK":
                const work = await db.work.upsert({
                    where: { iswc_orgId: { iswc: data.iswc, orgId } },
                    update: { title: data.title },
                    create: {
                        title: data.title,
                        iswc: data.iswc,
                        orgId
                    }
                });
                return NextResponse.json({ status: "success", id: work.id });

            case "RECORDING":
                const recording = await db.recording.upsert({
                    where: { isrc_orgId: { isrc: data.isrc, orgId } },
                    update: { title: data.title },
                    create: {
                        title: data.title,
                        isrc: data.isrc,
                        orgId
                    }
                });
                return NextResponse.json({ status: "success", id: recording.id });

            default:
                return new NextResponse(`Unsupported ingestion type: ${type}`, { status: 400 });
        }

    } catch (e) {
        console.error("Ingestion error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
