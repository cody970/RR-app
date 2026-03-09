import { z } from "zod";

export const ISRC_REGEX = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;
export const ISWC_REGEX = /^T\d{9}\d$/;

export const workSchema = z.object({
    title: z.string().min(1),
    iswc: z.string().regex(ISWC_REGEX).optional().or(z.literal("")),
});

export const recordingSchema = z.object({
    title: z.string().min(1),
    isrc: z.string().regex(ISRC_REGEX).optional().or(z.literal("")),
});

export const writerSchema = z.object({
    name: z.string().min(1),
    ipiCae: z.string().optional().or(z.literal("")),
});

export const csvIngestSchema = z.object({
    templateType: z.enum(["Works", "Recordings", "Writers"]),
    data: z.array(z.record(z.string(), z.any())),
});

export const auditRunSchema = z.object({
    // Currently empty as it just triggers a run, but could include filters
});

export const recoverySchema = z.object({
    findingId: z.string(),
    amount: z.number().positive(),
    status: z.enum(["RECOVERED", "DISPUTED", "IGNORED"]),
});

export const musoEnrichSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("enrich-isrc"),
        isrc: z.string().regex(ISRC_REGEX, "Invalid ISRC format"),
    }),
    z.object({
        action: z.literal("bulk-enrich"),
        isrcs: z.array(z.string().regex(ISRC_REGEX)).min(1).max(100),
    }),
    z.object({
        action: z.literal("track-lookup"),
        isrc: z.string().regex(ISRC_REGEX, "Invalid ISRC format"),
    }),
    z.object({
        action: z.literal("album-lookup"),
        upc: z.string().min(10).max(14),
    }),
    z.object({
        action: z.literal("find-writer-ipi"),
        writerName: z.string().min(1).max(200),
    }),
    z.object({
        action: z.literal("search"),
        query: z.string().min(1).max(200),
        type: z.enum(["profile", "album", "track", "organization"]).optional(),
        limit: z.number().int().min(1).max(50).optional(),
    }),
    z.object({
        action: z.literal("profile-credits"),
        profileId: z.string().min(1),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
    }),
]);
