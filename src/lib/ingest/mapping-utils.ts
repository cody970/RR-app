import { IndustrySource, industryTemplates, TemplateType } from "../reports/templates";

/**
 * Normalizes a header string for better matching.
 */
function normalize(header: string): string {
    return header.toLowerCase().trim().replace(/[\s_-]+/g, "");
}

/**
 * Attempts to automatically map CSV headers to internal keys.
 */
export function autoMapHeaders(headers: string[], targetType: TemplateType): Record<string, string> {
    const mapping: Record<string, string> = {};
    const internalKeys = getInternalKeysForType(targetType);

    headers.forEach(header => {
        const normalized = normalize(header);

        // Exact or near-exact match
        const match = internalKeys.find(key => normalize(key) === normalized);
        if (match) {
            mapping[header] = match;
            return;
        }

        // Fuzzy matches for common industry terms
        if (normalized.includes("isrc")) mapping[header] = "ISRC";
        else if (normalized.includes("iswc")) mapping[header] = "ISWC";
        else if (normalized.includes("title") || normalized.includes("song") || normalized.includes("track")) mapping[header] = "Title";
        else if (normalized.includes("artist") || normalized.includes("writer")) mapping[header] = "Artist";
        else if (normalized.includes("amount") || normalized.includes("dollars") || normalized.includes("revenue")) mapping[header] = "Amount";
        else if (normalized.includes("period") || normalized.includes("quarter") || normalized.includes("date")) mapping[header] = "Period";
        else if (normalized.includes("source") || normalized.includes("dsp") || normalized.includes("platform")) mapping[header] = "Source";
    });

    return mapping;
}

function getInternalKeysForType(type: TemplateType): string[] {
    switch (type) {
        case "Works": return ["Title", "ISWC"];
        case "Recordings": return ["Title", "ISRC", "DurationSec", "WorkISWC"];
        case "Writers": return ["Name", "IPI", "Role", "SplitPercent", "WorkTitle"];
        case "Statement Lines": return ["ISRC", "Title", "Artist", "Uses", "Amount", "Source", "Period"];
        case "DSP Report": return ["ISRC", "Title", "Artist", "Streams", "Revenue", "Source", "Period", "Territory"];
        default: return [];
    }
}

/**
 * Applies a template or custom mapping to a row of data.
 */
export function applyMapping(row: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
    const mappedRow: Record<string, any> = {};

    Object.entries(mapping).forEach(([sourceHeader, targetKey]) => {
        if (row[sourceHeader] !== undefined) {
            mappedRow[targetKey] = row[sourceHeader];
        }
    });

    return mappedRow;
}
