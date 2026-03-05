import { z } from "zod";

export const TemplateTypes = [
    "Works",
    "Recordings",
    "Writers",
    "Statement Lines",
    "DSP Report",
    "CWR File",
] as const;

export type TemplateType = typeof TemplateTypes[number];

// Normalization Helper
const cleanString = (val: unknown) => typeof val === "string" ? val.trim() : val;
const upperString = (val: unknown) => typeof val === "string" ? val.trim().toUpperCase() : val;

export const fileSchemas = {
    Works: z.object({
        Title: z.preprocess(cleanString, z.string().min(1, "Title is mandatory for works")),
        ISWC: z.preprocess(upperString, z.string().regex(/^T-\d{9}-\d$/, "Invalid ISWC format (Expected T-000000000-0)").optional().or(z.literal(""))),
    }),
    Recordings: z.object({
        Title: z.preprocess(cleanString, z.string().min(1, "Recording title is mandatory")),
        ISRC: z.preprocess(upperString, z.string().regex(/^[A-Z]{2}-?[A-Z0-9]{3}-?[0-9]{2}-?[0-9]{5}$/, "Invalid ISRC format").optional().or(z.literal(""))),
        DurationSec: z.coerce.number().min(0, "Duration cannot be negative").optional(),
        WorkISWC: z.preprocess(upperString, z.string().optional().or(z.literal(""))),
    }),
    Writers: z.object({
        Name: z.preprocess(cleanString, z.string().min(1, "Writer name is required")),
        IPI: z.preprocess(cleanString, z.string().regex(/^\d{9,11}$/, "IPI must be 9-11 digits").optional().or(z.literal(""))),
        Role: z.preprocess(upperString, z.string().optional()),
        SplitPercent: z.coerce.number().min(0, "Split cannot be negative").max(100, "Split cannot exceed 100%"),
        WorkTitle: z.preprocess(cleanString, z.string().min(1, "WorkTitle link is required")),
    }),
    "Statement Lines": z.object({
        ISRC: z.preprocess(upperString, z.string().min(1, "ISRC is required for statement matching")),
        Title: z.preprocess(cleanString, z.string().optional()),
        Artist: z.preprocess(cleanString, z.string().optional()),
        Uses: z.coerce.number().min(1, "Uses must be at least 1"),
        Amount: z.coerce.number().min(0, "Financial amount cannot be negative"),
        Source: z.preprocess(cleanString, z.string().min(1, "Reporting source is required")),
        Period: z.preprocess(cleanString, z.string().min(1, "Statement period is required")),
    }),
    "DSP Report": z.object({
        ISRC: z.preprocess(upperString, z.string().min(1, "ISRC is required")),
        Title: z.preprocess(cleanString, z.string().optional()),
        Artist: z.preprocess(cleanString, z.string().optional()),
        Streams: z.coerce.number().min(0, "Streams cannot be negative"),
        Revenue: z.coerce.number().min(0, "Revenue cannot be negative"),
        Source: z.preprocess(cleanString, z.string().min(1, "DSP source is required (e.g., Spotify)")),
        Period: z.preprocess(cleanString, z.string().min(1, "Report period is required")),
        Territory: z.preprocess(upperString, z.string().optional().or(z.literal(""))),
    }),
    "CWR File": z.object({
        // CWR is not CSV — this schema is a placeholder for the parser output
        workTitle: z.string().min(1),
        iswc: z.string().nullable().optional(),
        society: z.string().min(1),
    }),
};

export function getTemplateHeaders(type: TemplateType): string[] {
    if (type === "CWR File") return ["Fixed-width CWR format — no CSV template"];
    return Object.keys(fileSchemas[type].shape);
}
