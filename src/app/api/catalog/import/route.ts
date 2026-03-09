import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { workSchema, recordingSchema } from "@/lib/schemas";
import { ApiErrors, withErrorHandler } from "@/lib/api/error-handler";
import { db } from "@/lib/infra/db";

/**
 * POST /api/catalog/import
 *
 * Imports a work or recording from external data (Muso/Spotify).
 */
export const POST = withErrorHandler(async (req: Request) => {
  const { role, orgId } = await requireAuth();
  validatePermission(role, "CATALOG_EDIT");

  const body = await req.json();
  // Accepts { type: 'track'|'album'|'work'|'recording', data: {...} }
  const { type, data } = body;
  if (!type || !data) return ApiErrors.BadRequest("Missing type or data");

  if (type === "track" || type === "recording") {
    const parsed = recordingSchema.safeParse(data);
    if (!parsed.success) return ApiErrors.BadRequest("Invalid recording data", parsed.error.flatten());
    const rec = await db.recording.create({
      data: { ...parsed.data, orgId },
    });
    return NextResponse.json({ success: true, id: rec.id, type: "recording" });
  }
  if (type === "work" || type === "album") {
    const parsed = workSchema.safeParse(data);
    if (!parsed.success) return ApiErrors.BadRequest("Invalid work data", parsed.error.flatten());
    const work = await db.work.create({
      data: { ...parsed.data, orgId },
    });
    return NextResponse.json({ success: true, id: work.id, type: "work" });
  }
  return ApiErrors.BadRequest("Unsupported type");
});
