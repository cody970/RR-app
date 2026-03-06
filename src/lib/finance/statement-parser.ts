/**
 * Statement Parser
 *
 * Parses royalty statements from ASCAP, BMI, The MLC, and SoundExchange CSV formats,
 * normalizing them into StatementLine records with work matching.
 */

import { db } from "@/lib/infra/db";

// ---------- Types ----------

export interface ParsedStatementLine {
    title: string;
    artist?: string;
    isrc?: string;
    iswc?: string;
    uses: number;
    amount: number;
    amountOriginal?: number;
    currency: string;
    society: string;
    territory?: string;
    useType?: string;
    rate?: number;
    workId?: string;
}

export interface ParsedStatement {
    source: string;
    period: string;
    fileType: string;
    lines: ParsedStatementLine[];
    totalAmount: number;
    errors: string[];
}

export type StatementFormat = "ASCAP_CSV" | "BMI_CSV" | "MLC_CSV" | "SOUNDEXCHANGE_CSV";

// ---------- Format Detection ----------

/**
 * Auto-detect the statement format from CSV header row.
 */
export function detectFormat(headerRow: string): StatementFormat | null {
    const h = headerRow.toUpperCase();

    if (h.includes("WORK TITLE") && h.includes("WRITER NAME") && h.includes("DOMESTIC") && h.includes("PERFORMANCES")) {
        return "ASCAP_CSV";
    }
    if (h.includes("SONG TITLE") && (h.includes("WORK#") || h.includes("WORK #")) && h.includes("ROYALTY AMOUNT")) {
        return "BMI_CSV";
    }
    if (h.includes("HFA SONG CODE") && h.includes("STREAMS") && h.includes("AMOUNT")) {
        return "MLC_CSV";
    }
    if (h.includes("FEATURED ARTIST") && h.includes("SOUND RECORDING") && h.includes("PERFORMANCES") && h.includes("ROYALTY")) {
        return "SOUNDEXCHANGE_CSV";
    }

    // Fallback: try more lenient matching
    if (h.includes("ASCAP") || (h.includes("WORK TITLE") && h.includes("ISWC"))) return "ASCAP_CSV";
    if (h.includes("BMI") || (h.includes("SONG TITLE") && h.includes("WRITER"))) return "BMI_CSV";
    if (h.includes("MLC") || h.includes("MECHANICAL")) return "MLC_CSV";
    if (h.includes("SOUNDEXCHANGE") || (h.includes("SOUND RECORDING") && h.includes("ISRC"))) return "SOUNDEXCHANGE_CSV";

    return null;
}

// ---------- CSV Helpers ----------

function parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = parseCSVRow(lines[0]);
    const rows = lines.slice(1).map(parseCSVRow);
    return { headers, rows };
}

function getColumn(headers: string[], row: string[], ...possibleNames: string[]): string {
    for (const name of possibleNames) {
        const idx = headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()));
        if (idx >= 0 && idx < row.length) return row[idx] || "";
    }
    return "";
}

function parseAmount(val: string): number {
    if (!val) return 0;
    const cleaned = val.replace(/[$,\s]/g, "").replace(/\((.+)\)/, "-$1");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function parseInt2(val: string): number {
    if (!val) return 0;
    const num = parseInt(val.replace(/,/g, ""), 10);
    return isNaN(num) ? 0 : num;
}

// ---------- ASCAP Parser ----------

function parseASCAP(content: string): ParsedStatement {
    const { headers, rows } = parseCSV(content);
    const errors: string[] = [];
    const lines: ParsedStatementLine[] = [];
    let totalAmount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const title = getColumn(headers, row, "WORK TITLE", "TITLE");
            const amount = parseAmount(getColumn(headers, row, "DOMESTIC", "AMOUNT", "DOLLARS"));
            const uses = parseInt2(getColumn(headers, row, "PERFORMANCES", "USES", "PLAYS"));

            if (!title && amount === 0) continue;

            const line: ParsedStatementLine = {
                title,
                artist: getColumn(headers, row, "WRITER NAME", "WRITER", "PERFORMER"),
                iswc: getColumn(headers, row, "ISWC") || undefined,
                uses,
                amount,
                currency: "USD",
                society: "ASCAP",
                territory: getColumn(headers, row, "TERRITORY") || undefined,
                useType: "PERFORMANCE",
                rate: uses > 0 ? amount / uses : undefined,
            };

            totalAmount += amount;
            lines.push(line);
        } catch (e) {
            errors.push(`Row ${i + 2}: ${(e as Error).message}`);
        }
    }

    return {
        source: "ASCAP",
        period: detectPeriodFromRows(headers, rows) || "",
        fileType: "ASCAP_CSV",
        lines,
        totalAmount,
        errors,
    };
}

// ---------- BMI Parser ----------

function parseBMI(content: string): ParsedStatement {
    const { headers, rows } = parseCSV(content);
    const errors: string[] = [];
    const lines: ParsedStatementLine[] = [];
    let totalAmount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const title = getColumn(headers, row, "SONG TITLE", "TITLE");
            const amount = parseAmount(getColumn(headers, row, "ROYALTY AMOUNT", "AMOUNT", "DOLLARS"));
            const uses = parseInt2(getColumn(headers, row, "USES", "PERFORMANCES", "PLAYS"));

            if (!title && amount === 0) continue;

            const line: ParsedStatementLine = {
                title,
                artist: getColumn(headers, row, "WRITER", "WRITER NAME", "PERFORMER"),
                iswc: getColumn(headers, row, "ISWC") || undefined,
                uses,
                amount,
                currency: "USD",
                society: "BMI",
                territory: getColumn(headers, row, "TERRITORY") || undefined,
                useType: "PERFORMANCE",
                rate: uses > 0 ? amount / uses : undefined,
            };

            totalAmount += amount;
            lines.push(line);
        } catch (e) {
            errors.push(`Row ${i + 2}: ${(e as Error).message}`);
        }
    }

    return {
        source: "BMI",
        period: detectPeriodFromRows(headers, rows) || "",
        fileType: "BMI_CSV",
        lines,
        totalAmount,
        errors,
    };
}

// ---------- MLC Parser ----------

function parseMLC(content: string): ParsedStatement {
    const { headers, rows } = parseCSV(content);
    const errors: string[] = [];
    const lines: ParsedStatementLine[] = [];
    let totalAmount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const title = getColumn(headers, row, "SONG TITLE", "TITLE", "SONG NAME");
            const amount = parseAmount(getColumn(headers, row, "AMOUNT", "ROYALTY", "DOLLARS"));
            const uses = parseInt2(getColumn(headers, row, "STREAMS", "USES", "PLAYS"));
            const isrc = getColumn(headers, row, "ISRC") || undefined;

            if (!title && amount === 0) continue;

            const line: ParsedStatementLine = {
                title,
                artist: getColumn(headers, row, "ARTIST", "PERFORMER", "WRITER"),
                isrc,
                iswc: getColumn(headers, row, "ISWC") || undefined,
                uses,
                amount,
                currency: "USD",
                society: "MLC",
                territory: "US",
                useType: "MECHANICAL",
                rate: uses > 0 ? amount / uses : undefined,
            };

            totalAmount += amount;
            lines.push(line);
        } catch (e) {
            errors.push(`Row ${i + 2}: ${(e as Error).message}`);
        }
    }

    return {
        source: "MLC",
        period: detectPeriodFromRows(headers, rows) || "",
        fileType: "MLC_CSV",
        lines,
        totalAmount,
        errors,
    };
}

// ---------- SoundExchange Parser ----------

function parseSoundExchange(content: string): ParsedStatement {
    const { headers, rows } = parseCSV(content);
    const errors: string[] = [];
    const lines: ParsedStatementLine[] = [];
    let totalAmount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const title = getColumn(headers, row, "SOUND RECORDING", "TITLE", "TRACK TITLE");
            const amount = parseAmount(getColumn(headers, row, "ROYALTY", "AMOUNT", "DOLLARS"));
            const uses = parseInt2(getColumn(headers, row, "PERFORMANCES", "PLAYS", "STREAMS"));
            const isrc = getColumn(headers, row, "ISRC") || undefined;

            if (!title && amount === 0) continue;

            const line: ParsedStatementLine = {
                title,
                artist: getColumn(headers, row, "FEATURED ARTIST", "ARTIST", "PERFORMER"),
                isrc,
                uses,
                amount,
                currency: "USD",
                society: "SOUNDEXCHANGE",
                territory: "US",
                useType: "DIGITAL",
                rate: uses > 0 ? amount / uses : undefined,
            };

            totalAmount += amount;
            lines.push(line);
        } catch (e) {
            errors.push(`Row ${i + 2}: ${(e as Error).message}`);
        }
    }

    return {
        source: "SOUNDEXCHANGE",
        period: detectPeriodFromRows(headers, rows) || "",
        fileType: "SOUNDEXCHANGE_CSV",
        lines,
        totalAmount,
        errors,
    };
}

// ---------- Period Detection ----------

function detectPeriodFromRows(headers: string[], rows: string[][]): string | null {
    // Try to find a period column
    for (const row of rows.slice(0, 5)) {
        const period = getColumn(headers, row, "PERIOD", "STATEMENT PERIOD", "QUARTER", "PAYMENT PERIOD");
        if (period) {
            // Try to normalize to YYYY-Q#
            const quarterMatch = period.match(/(\d{4})\s*[-/]?\s*Q(\d)/i);
            if (quarterMatch) return `${quarterMatch[1]}-Q${quarterMatch[2]}`;

            const monthMatch = period.match(/(\d{4})\s*[-/]\s*(\d{1,2})/);
            if (monthMatch) {
                const q = Math.ceil(parseInt(monthMatch[2], 10) / 3);
                return `${monthMatch[1]}-Q${q}`;
            }

            return period;
        }
    }
    return null;
}

// ---------- Main Parser ----------

/**
 * Parse a CSV statement file into normalized data.
 * Auto-detects format from header row.
 */
export function parseStatement(content: string, overrideFormat?: StatementFormat): ParsedStatement {
    const firstLine = content.split(/\r?\n/)[0] || "";
    const format = overrideFormat || detectFormat(firstLine);

    if (!format) {
        return {
            source: "UNKNOWN",
            period: "",
            fileType: "UNKNOWN",
            lines: [],
            totalAmount: 0,
            errors: ["Unable to detect statement format. Ensure the CSV has standard column headers."],
        };
    }

    switch (format) {
        case "ASCAP_CSV": return parseASCAP(content);
        case "BMI_CSV": return parseBMI(content);
        case "MLC_CSV": return parseMLC(content);
        case "SOUNDEXCHANGE_CSV": return parseSoundExchange(content);
    }
}

/**
 * Match parsed statement lines to catalog works by title or ISWC/ISRC.
 */
export async function matchStatementLines(
    lines: ParsedStatementLine[],
    orgId: string
): Promise<ParsedStatementLine[]> {
    // Fetch all works for matching
    const works = await db.work.findMany({
        where: { orgId },
        select: { id: true, title: true, iswc: true },
    });

    const recordings = await db.recording.findMany({
        where: { orgId },
        select: { id: true, title: true, isrc: true, workId: true },
    });

    // Build lookup maps
    const workByIswc = new Map<string, string>();
    const workByTitle = new Map<string, string>();
    const workByIsrc = new Map<string, string>();

    for (const w of works) {
        if (w.iswc) workByIswc.set(w.iswc.toUpperCase(), w.id);
        workByTitle.set(w.title.toUpperCase().trim(), w.id);
    }

    for (const r of recordings) {
        if (r.isrc) workByIsrc.set(r.isrc.toUpperCase(), r.workId || r.id);
    }

    // Match each line
    return lines.map(line => {
        let workId: string | undefined;

        // 1. Try ISWC match
        if (line.iswc) {
            workId = workByIswc.get(line.iswc.toUpperCase());
        }

        // 2. Try ISRC match
        if (!workId && line.isrc) {
            workId = workByIsrc.get(line.isrc.toUpperCase());
        }

        // 3. Try exact title match
        if (!workId && line.title) {
            workId = workByTitle.get(line.title.toUpperCase().trim());
        }

        // 4. Try fuzzy title match (contains)
        if (!workId && line.title) {
            const searchTitle = line.title.toUpperCase().trim();
            for (const [title, id] of workByTitle) {
                if (title.includes(searchTitle) || searchTitle.includes(title)) {
                    workId = id;
                    break;
                }
            }
        }

        return { ...line, workId };
    });
}

/**
 * Import a parsed statement to the database.
 * Creates Statement + StatementLine records, then triggers period aggregation.
 */
export async function importStatement(
    parsed: ParsedStatement,
    orgId: string,
    fileName?: string
): Promise<{ statementId: string; matched: number; unmatched: number }> {
    // Match lines to works
    const matchedLines = await matchStatementLines(parsed.lines, orgId);

    const matched = matchedLines.filter(l => l.workId).length;
    const unmatched = matchedLines.filter(l => !l.workId).length;

    // Create statement record
    const statement = await db.statement.create({
        data: {
            source: parsed.source,
            period: parsed.period || "Unknown",
            fileName,
            fileType: parsed.fileType,
            totalAmount: parsed.totalAmount,
            lineCount: matchedLines.length,
            status: "PROCESSED",
            orgId,
            lines: {
                create: matchedLines.map(l => ({
                    title: l.title,
                    artist: l.artist,
                    isrc: l.isrc,
                    iswc: l.iswc,
                    uses: l.uses,
                    amount: l.amount,
                    amountOriginal: l.amountOriginal,
                    currency: l.currency,
                    society: l.society,
                    territory: l.territory,
                    useType: l.useType,
                    rate: l.rate,
                    workId: l.workId,
                })),
            },
        },
    });

    // Aggregate into RoyaltyPeriod snapshots
    if (parsed.period) {
        await aggregateRoyaltyPeriods(orgId, parsed.period, matchedLines);
    }

    return { statementId: statement.id, matched, unmatched };
}

/**
 * Aggregate statement lines into RoyaltyPeriod snapshots.
 */
async function aggregateRoyaltyPeriods(
    orgId: string,
    period: string,
    lines: ParsedStatementLine[]
): Promise<void> {
    // Group by workId + society
    const groups = new Map<string, { totalAmount: number; totalUses: number; useType?: string }>();

    for (const line of lines) {
        if (!line.workId) continue;
        const key = `${line.workId}:${line.society}`;
        const existing = groups.get(key) || { totalAmount: 0, totalUses: 0, useType: line.useType };
        existing.totalAmount += line.amount;
        existing.totalUses += line.uses;
        groups.set(key, existing);
    }

    // Also aggregate at org level per society (workId = null)
    const societyTotals = new Map<string, { totalAmount: number; totalUses: number; useType?: string }>();
    for (const line of lines) {
        const key = line.society;
        const existing = societyTotals.get(key) || { totalAmount: 0, totalUses: 0, useType: line.useType };
        existing.totalAmount += line.amount;
        existing.totalUses += line.uses;
        societyTotals.set(key, existing);
    }

    // Upsert per-work periods
    for (const [key, data] of groups) {
        const [workId, society] = key.split(":");
        const avgRate = data.totalUses > 0 ? data.totalAmount / data.totalUses : null;

        // Find previous period for trend
        const prevPeriod = getPreviousPeriod(period);
        const prev = await db.royaltyPeriod.findUnique({
            where: { orgId_workId_society_period: { orgId, workId, society, period: prevPeriod } },
        });

        const changePercent = prev?.totalAmount
            ? ((data.totalAmount - prev.totalAmount) / prev.totalAmount) * 100
            : null;

        await db.royaltyPeriod.upsert({
            where: { orgId_workId_society_period: { orgId, workId, society, period } },
            create: {
                orgId, workId, society, period,
                totalAmount: data.totalAmount,
                totalUses: data.totalUses,
                avgRate,
                useType: data.useType,
                previousAmount: prev?.totalAmount,
                changePercent,
            },
            update: {
                totalAmount: { increment: data.totalAmount },
                totalUses: { increment: data.totalUses },
                avgRate,
                previousAmount: prev?.totalAmount,
                changePercent,
            },
        });
    }

    // Upsert org-level society totals (workId = null)
    for (const [society, data] of societyTotals) {
        const avgRate = data.totalUses > 0 ? data.totalAmount / data.totalUses : null;
        const prevPeriod = getPreviousPeriod(period);

        // For org-level, workId is empty string (can't be null in unique constraint)
        const prev = await db.royaltyPeriod.findUnique({
            where: { orgId_workId_society_period: { orgId, workId: "", society, period: prevPeriod } },
        });

        const changePercent = prev?.totalAmount
            ? ((data.totalAmount - prev.totalAmount) / prev.totalAmount) * 100
            : null;

        await db.royaltyPeriod.upsert({
            where: { orgId_workId_society_period: { orgId, workId: "", society, period } },
            create: {
                orgId, workId: null, society, period,
                totalAmount: data.totalAmount,
                totalUses: data.totalUses,
                avgRate,
                useType: data.useType,
                previousAmount: prev?.totalAmount,
                changePercent,
            },
            update: {
                totalAmount: { increment: data.totalAmount },
                totalUses: { increment: data.totalUses },
                avgRate,
                previousAmount: prev?.totalAmount,
                changePercent,
            },
        });
    }
}

function getPreviousPeriod(period: string): string {
    const match = period.match(/^(\d{4})-Q(\d)$/);
    if (!match) return "";
    let year = parseInt(match[1], 10);
    let quarter = parseInt(match[2], 10);
    quarter--;
    if (quarter === 0) { quarter = 4; year--; }
    return `${year}-Q${quarter}`;
}
