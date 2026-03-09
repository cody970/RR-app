import { Queue, Worker, Job } from "bullmq";
import { db } from "@/lib/infra/db";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { logger } from "@/lib/infra/logger";

const connection = { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) };
export const bulkImportQueue = new Queue("bulk-import", { connection });

export async function enqueueBulkImport(filePath: string, orgId: string, userId: string) {
  await bulkImportQueue.add("bulk-import", { filePath, orgId, userId });
}

export const bulkImportWorker = new Worker(
  "bulk-import",
  async (job: Job) => {
    const { filePath, orgId, userId } = job.data;
    logger.info("Starting bulk import", { filePath, orgId, userId });
    const results: any[] = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          // Example: insert as work or recording
          if (row.title && row.iswc) {
            results.push(db.work.create({ data: { title: row.title, iswc: row.iswc, orgId } }));
          } else if (row.title && row.isrc) {
            results.push(db.recording.create({ data: { title: row.title, isrc: row.isrc, orgId } }));
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });
    await Promise.all(results);
    logger.info("Bulk import complete", { filePath, orgId, userId });
    // Optionally: delete file after import
    fs.unlinkSync(filePath);
    return { imported: results.length };
  },
  { connection }
);
