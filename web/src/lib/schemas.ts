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
