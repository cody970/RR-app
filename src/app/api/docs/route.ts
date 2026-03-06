import { getApiDocs } from "@/lib/reports/swagger";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const spec = await getApiDocs();
        return NextResponse.json(spec);
    } catch (error) {
        return new NextResponse("Failed to generate API docs", { status: 500 });
    }
}
