import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { registerWorks, registerFromGaps } from "@/lib/infra/registration-service";
import type { RegistrationMethod } from "@/lib/infra/registration-service";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            workIds,
            gapIds,
            societies = ["ASCAP", "BMI"],
            method = "TUNEREGISTRY",
            publisherName,
            publisherIpi,
            coPublisherSplit = 5,
        } = body;

        if (!workIds?.length && !gapIds?.length) {
            return NextResponse.json(
                { error: "Must provide workIds or gapIds" },
                { status: 400 }
            );
        }

        let result;

        if (gapIds?.length) {
            result = await registerFromGaps({
                orgId: session.user.orgId,
                gapIds,
                societies,
                method: method as RegistrationMethod,
                publisherName,
                publisherIpi,
                coPublisherSplit,
            });
        } else {
            result = await registerWorks({
                orgId: session.user.orgId,
                workIds,
                societies,
                method: method as RegistrationMethod,
                publisherName,
                publisherIpi,
                coPublisherSplit,
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Failed to process registration" },
            { status: 500 }
        );
    }
}
