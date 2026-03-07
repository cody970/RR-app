import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-auth";
import { db } from "@/lib/infra/db";
import { z } from "zod";

// Zod schemas for validated input
const workDataSchema = z.object({
    iswc: z.string().min(1),
    title: z.string().min(1).max(500),
});

const recordingDataSchema = z.object({
    isrc: z.string().regex(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/, "Invalid ISRC format"),
    title: z.string().min(1).max(500),
});

const ingestSchema = z.object({
    type: z.enum(["WORK", "RECORDING"]),
    data: z.unknown(), // Will be validated based on type
});

export async function POST(req: Request) {
    const authHeader = req.headers.get("Authorization");
    const key = authHeader?.replace("Bearer ", "");

    const organization = await validateApiKey(key || null);
    if (!organization) {
        return new NextResponse("Unauthorized: Invalid API Key", { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const parsed = ingestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request format", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { type, data } = parsed.data;
        const orgId = organization.id;

        switch (type) {
            case "WORK": {
                const workData = workDataSchema.safeParse(data);
                if (!workData.success) {
                    return NextResponse.json(
                        { error: "Invalid WORK data", details: workData.error.flatten() },
                        { status: 400 }
                    );
                }

                const work = await db.work.upsert({
                    where: { iswc_orgId: { iswc: workData.data.iswc, orgId } },
                    update: { title: workData.data.title },
                    create: {
                        title: workData.data.title,
                        iswc: workData.data.iswc,
                        orgId
                    }
                });
                return NextResponse.json({ status: "success", id: work.id });
            }

            case "RECORDING": {
                const recordingData = recordingDataSchema.safeParse(data);
                if (!recordingData.success) {
                    return NextResponse.json(
                        { error: "Invalid RECORDING data", details: recordingData.error.flatten() },
                        { status: 400 }
                    );
                }

                const recording = await db.recording.upsert({
                    where: { isrc_orgId: { isrc: recordingData.data.isrc, orgId } },
                    update: { title: recordingData.data.title },
                    create: {
                        title: recordingData.data.title,
                        isrc: recordingData.data.isrc,
                        orgId
                    }
                });
                return NextResponse.json({ status: "success", id: recording.id });
            }

            default:
                return new NextResponse(`Unsupported ingestion type: ${type}`, { status: 400 });
        }

    } catch (e) {
        console.error("Ingestion error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}