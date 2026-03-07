import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { parseStatement, importStatement } from "@/lib/finance/statement-parser";
import { runDiscrepancyChecks } from "@/lib/music/discrepancy-engine";
import { z } from "zod";
import crypto from "crypto";

/**
 * Email Webhook Endpoint for Automated Statement Ingestion
 *
 * Receives forwarded emails from services like SendGrid, Mailgun, or Postmark
 * that contain royalty statement CSV attachments. Automatically parses and imports them.
 *
 * Flow:
 * 1. Email service forwards statement emails to this webhook
 * 2. We verify the webhook signature
 * 3. Extract CSV attachments
 * 4. Match the sender/recipient to an organization's ingestion source
 * 5. Parse and import the statement
 * 6. Run discrepancy checks
 */

const webhookPayloadSchema = z.object({
    /** Sender email address */
    from: z.string().email(),
    /** Recipient email (the org's unique ingestion address) */
    to: z.string().email(),
    /** Email subject */
    subject: z.string().optional(),
    /** Attachments as base64-encoded files */
    attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(), // base64
        contentType: z.string(),
        size: z.number().optional(),
    })).optional(),
    /** Raw text body (some societies send inline CSV) */
    textBody: z.string().optional(),
    /** Timestamp for verification */
    timestamp: z.string().optional(),
    /** Signature for verification */
    signature: z.string().optional(),
});

/**
 * Verify webhook signature (supports multiple providers).
 */
function verifyWebhookSignature(
    payload: string,
    signature: string | undefined,
    secret: string | undefined
): boolean {
    if (!secret || !signature) return !secret; // If no secret configured, skip verification
    const expected = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}

export async function POST(req: Request) {
    const rawBody = await req.text();

    // Verify webhook signature if configured
    const webhookSecret = process.env.INGEST_WEBHOOK_SECRET;
    const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-signature");

    if (webhookSecret && !verifyWebhookSignature(rawBody, signature || undefined, webhookSecret)) {
        console.error("[Ingest Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = webhookPayloadSchema.safeParse(body);
    if (!parsed.success) {
        console.error("[Ingest Webhook] Invalid payload:", parsed.error.flatten());
        return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { from, to, subject, attachments, textBody } = parsed.data;

    try {
        // Look up the organization by their unique ingestion email address
        const ingestionSource = await db.ingestionSource.findFirst({
            where: {
                ingestEmail: to.toLowerCase(),
                enabled: true,
            },
            include: { organization: true },
        });

        if (!ingestionSource) {
            // Try matching by sender email (for known society senders)
            const sourceByFrom = await db.ingestionSource.findFirst({
                where: {
                    senderFilter: { contains: from.toLowerCase() },
                    enabled: true,
                },
                include: { organization: true },
            });

            if (!sourceByFrom) {
                console.warn(`[Ingest Webhook] No ingestion source found for to=${to}, from=${from}`);
                return NextResponse.json({ error: "No matching ingestion source" }, { status: 404 });
            }

            return await processIngestion(sourceByFrom, from, subject, attachments, textBody);
        }

        return await processIngestion(ingestionSource, from, subject, attachments, textBody);
    } catch (error) {
        console.error("[Ingest Webhook] Processing error:", error);
        return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
    }
}

async function processIngestion(
    source: { id: string; orgId: string; name: string; organization: { id: string } },
    from: string,
    subject: string | undefined,
    attachments: Array<{ filename: string; content: string; contentType: string; size?: number }> | undefined,
    textBody: string | undefined
) {
    const orgId = source.orgId;
    const results: Array<{
        filename: string;
        status: "imported" | "skipped" | "error";
        matched?: number;
        unmatched?: number;
        error?: string;
    }> = [];

    // Process CSV attachments
    const csvAttachments = (attachments || []).filter(
        a => a.contentType.includes("csv") ||
            a.contentType.includes("text/plain") ||
            a.filename.toLowerCase().endsWith(".csv")
    );

    if (csvAttachments.length === 0 && textBody) {
        // Some societies send CSV data inline in the email body
        const firstLine = textBody.split("\n")[0] || "";
        if (firstLine.includes(",") && (
            firstLine.toUpperCase().includes("TITLE") ||
            firstLine.toUpperCase().includes("AMOUNT") ||
            firstLine.toUpperCase().includes("ROYALTY")
        )) {
            csvAttachments.push({
                filename: `inline-${new Date().toISOString().split("T")[0]}.csv`,
                content: Buffer.from(textBody).toString("base64"),
                contentType: "text/csv",
            });
        }
    }

    if (csvAttachments.length === 0) {
        // Log the attempt but don't error — email might be a notification, not a statement
        await db.ingestionLog.create({
            data: {
                sourceId: source.id,
                orgId,
                senderEmail: from,
                subject: subject || "(no subject)",
                status: "SKIPPED",
                message: "No CSV attachments found in email",
            },
        });

        return NextResponse.json({
            status: "skipped",
            message: "No CSV attachments found",
        });
    }

    for (const attachment of csvAttachments) {
        try {
            // Decode base64 content
            const csvContent = Buffer.from(attachment.content, "base64").toString("utf-8");

            // Parse the statement
            const parsed = parseStatement(csvContent);

            if (parsed.source === "UNKNOWN") {
                results.push({
                    filename: attachment.filename,
                    status: "skipped",
                    error: "Could not detect statement format",
                });
                continue;
            }

            // Import the statement
            const importResult = await importStatement(parsed, orgId, attachment.filename);

            // Run discrepancy checks
            try {
                await runDiscrepancyChecks(importResult.statementId, orgId);
            } catch (e) {
                console.error(`[Ingest Webhook] Discrepancy check error for ${attachment.filename}:`, e);
            }

            results.push({
                filename: attachment.filename,
                status: "imported",
                matched: importResult.matched,
                unmatched: importResult.unmatched,
            });
        } catch (e) {
            console.error(`[Ingest Webhook] Error processing ${attachment.filename}:`, e);
            results.push({
                filename: attachment.filename,
                status: "error",
                error: e instanceof Error ? e.message : "Unknown error",
            });
        }
    }

    // Log the ingestion
    const imported = results.filter(r => r.status === "imported").length;
    await db.ingestionLog.create({
        data: {
            sourceId: source.id,
            orgId,
            senderEmail: from,
            subject: subject || "(no subject)",
            status: imported > 0 ? "SUCCESS" : "FAILED",
            message: `Processed ${results.length} files: ${imported} imported, ${results.filter(r => r.status === "skipped").length} skipped, ${results.filter(r => r.status === "error").length} errors`,
            filesProcessed: results.length,
        },
    });

    return NextResponse.json({
        status: "processed",
        results,
        totalImported: imported,
    });
}