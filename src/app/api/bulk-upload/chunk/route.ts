import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { ApiErrors, withErrorHandler } from "@/lib/api/error-handler";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * POST /api/bulk-upload/chunk
 * Receives a chunk of a large file and writes it to disk.
 * Expects headers: x-upload-id, x-chunk-index, x-chunks-total
 */
export const POST = withErrorHandler(async (req: Request) => {
  const { role } = await requireAuth();
  validatePermission(role, "CATALOG_EDIT");

  const uploadId = req.headers.get("x-upload-id");
  const chunkIndex = req.headers.get("x-chunk-index");
  const chunksTotal = req.headers.get("x-chunks-total");

  if (!uploadId || !chunkIndex || !chunksTotal) {
    return ApiErrors.BadRequest("Missing upload headers");
  }

  const chunkPath = path.join(UPLOAD_DIR, `${uploadId}.${chunkIndex}`);
  const arrayBuffer = await req.arrayBuffer();
  fs.writeFileSync(chunkPath, Buffer.from(arrayBuffer));

  return NextResponse.json({ success: true });
});
