import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import { ApiErrors } from "@/lib/api/error-response";

const leadSchema = z.object({
  email: z.string().email().max(254),
  artistName: z.string().max(120).optional(),
  source: z.enum(["free-audit", "newsletter"]).default("free-audit"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return ApiErrors.BadRequest("Invalid input", parsed.error.flatten().fieldErrors);
    }

    const { email, artistName, source } = parsed.data;

    await db.lead.upsert({
      where: { email_source: { email, source } },
      update: { artistName },
      create: { email, artistName, source },
    });

    logger.info({ email: email.replace(/(.{1,2}).*(@.*)/, "$1***$2"), source }, "Lead captured");

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : "Unknown" }, "Lead capture failed");
    return ApiErrors.Internal();
  }
}
