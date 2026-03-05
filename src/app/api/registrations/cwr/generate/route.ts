import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateCwrForDownload } from "@/lib/registration-service";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            workIds,
            publisherName,
            publisherIpi,
            coPublisherSplit = 5,
        } = body;

        if (!workIds?.length) {
            return NextResponse.json(
                { error: "Must provide workIds" },
                { status: 400 }
            );
        }

        const cwrContent = await generateCwrForDownload(
            session.user.orgId,
            workIds,
            publisherName,
            publisherIpi,
            coPublisherSplit
        );

        // Return as downloadable file
        return new Response(cwrContent, {
            headers: {
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="registration_${Date.now()}.cwr"`,
            },
        });
    } catch (error) {
        console.error("CWR generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate CWR file" },
            { status: 500 }
        );
    }
}
