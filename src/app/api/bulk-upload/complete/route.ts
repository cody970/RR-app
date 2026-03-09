import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/get-session";
import { validatePermission } from "@/lib/auth/rbac";
import { ApiErrors, withErrorHandler } from "@/lib/api/error-handler";
import fs from "fs";
import path from "path";
import { enqueueBulkImport } from "@/jobs/bulk-import-worker";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * POST /api/bulk-upload/complete
 * Assembles all chunks for a given uploadId into a single file and triggers background processing.
 * Expects JSON body: { uploadId, chunksTotal, filename }
 */
export const POST = withErrorHandler(async (req: Request) => {
  const { role, orgId, userId } = await requireAuth();
  validatePermission(role, "CATALOG_EDIT");

  const { uploadId, chunksTotal, filename } = await req.json();
  if (!uploadId || !chunksTotal || !filename) {
    return ApiErrors.BadRequest("Missing uploadId, chunksTotal, or filename");
  }

  const finalPath = path.join(UPLOAD_DIR, `${uploadId}-${filename}`);
  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < chunksTotal; i++) {
    const chunkPath = path.join(UPLOAD_DIR, `${uploadId}.${i}`);
    if (!fs.existsSync(chunkPath)) {
      return ApiErrors.BadRequest(`Missing chunk ${i}`);
    }
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
    fs.unlinkSync(chunkPath); // Remove chunk after appending
  }
  writeStream.end();

  // Enqueue background job to process finalPath
  await enqueueBulkImport(finalPath, orgId, userId);
  return NextResponse.json({ success: true, file: finalPath });
});
