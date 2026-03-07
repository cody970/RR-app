/**
 * CWR (Common Works Registration) File Parser
 *
 * Parses fixed-width CWR text files used by CISAC/PRO societies.
 * Supports CWR v2.1 and v2.2 record types:
 *   - HDR: Header (file metadata)
 *   - NWR: New Work Registration
 *   - REV: Revised Registration
 *   - SPU: Publisher Control (interested party)
 *   - SWR: Writer Control (interested party)
 *   - TRL: Trailer
 */

export interface CwrRecord {
    workTitle: string;
    iswc: string | null;
    society: string;
    territory: string | null;
    publisherName: string | null;
    publisherIpi: string | null;
    writerName: string | null;
    writerIpi: string | null;
    shares: number | null;
    recordType: string;
    rawRecord: string;
}

// Map of society numeric codes to names
const SOCIETY_CODES: Record<string, string> = {
    "010": "ASCAP",
    "021": "BMI",
    "034": "SESAC",
    "052": "PRS",
    "058": "GEMA",
    "074": "SACEM",
    "089": "JASRAC",
    "101": "APRA",
    "079": "SGAE",
};

function cleanField(raw: string): string {
    return raw.trim().replace(/\0/g, "");
}

function parseNWR(line: string): Partial<CwrRecord> {
    // CWR v2.1 NWR record layout (fixed-width):
    // Pos 0-2:   Record Type (3)
    // Pos 3-5:   Transaction Seq (3)
    // Pos 6-13:  Record Seq (8)
    // Pos 14-73: Work Title (60)
    // Pos 74-84: ISWC (11)
    const title = cleanField(line.substring(14, 74));
    const rawIswc = cleanField(line.substring(74, 85));
    const iswc = rawIswc && rawIswc.length >= 10 ? rawIswc : null;

    return {
        workTitle: title,
        iswc,
        recordType: "NWR",
    };
}

function parseSPU(line: string): Partial<CwrRecord> {
    // SPU record layout:
    // Pos 0-2:   Record Type (3)
    // Pos 3-5:   Transaction Seq (3)
    // Pos 6-13:  Record Seq (8)
    // Pos 14-22: Publisher IP# (9)
    // Pos 23-67: Publisher Name (45)
    // Pos 68-76: IPI Name# (9)
    // Pos 77-79: PR Society (3)
    // Pos 80-84: PR Share (5, implied 3 decimal)
    const publisherIpi = cleanField(line.substring(14, 23));
    const publisherName = cleanField(line.substring(23, 68));
    const writerIpi = cleanField(line.substring(68, 77));
    const societyCode = cleanField(line.substring(77, 80));
    const rawShare = cleanField(line.substring(80, 85));

    const shares = rawShare ? parseFloat(rawShare) / 100 : null;
    const society = SOCIETY_CODES[societyCode] || societyCode || "UNKNOWN";

    return {
        publisherName: publisherName || null,
        publisherIpi: publisherIpi || null,
        writerIpi: writerIpi || null,
        shares,
        society,
        recordType: "SPU",
    };
}

function parseSWR(line: string): Partial<CwrRecord> {
    // SWR record layout:
    // Pos 0-2:   Record Type (3)
    // Pos 3-5:   Transaction Seq (3)
    // Pos 6-13:  Record Seq (8)
    // Pos 14-22: Writer IP# (9)
    // Pos 23-67: Writer Last Name (45)
    // Pos 68-97: Writer First Name (30)
    const writerIpi = cleanField(line.substring(14, 23));
    const lastName = cleanField(line.substring(23, 68));
    const firstName = cleanField(line.substring(68, 98));

    const writerName = firstName ? `${firstName} ${lastName}` : lastName;

    return {
        writerName: writerName || null,
        writerIpi: writerIpi || null,
        recordType: "SWR",
    };
}

/**
 * Parse a CWR file content string into structured records.
 * Groups NWR + SPU + SWR records into complete registration records.
 */
export function parseCwrFile(content: string): CwrRecord[] {
    const lines = content.split(/\r?\n/).filter(l => l.length > 10);
    const results: CwrRecord[] = [];

    let currentWork: Partial<CwrRecord> | null = null;

    for (const line of lines) {
        const recordType = line.substring(0, 3);

        switch (recordType) {
            case "NWR":
            case "REV": {
                // Flush previous work
                if (currentWork?.workTitle) {
                    results.push({
                        workTitle: currentWork.workTitle,
                        iswc: currentWork.iswc || null,
                        society: currentWork.society || "UNKNOWN",
                        territory: currentWork.territory || null,
                        publisherName: currentWork.publisherName || null,
                        publisherIpi: currentWork.publisherIpi || null,
                        writerName: currentWork.writerName || null,
                        writerIpi: currentWork.writerIpi || null,
                        shares: currentWork.shares || null,
                        recordType: currentWork.recordType || "NWR",
                        rawRecord: currentWork.rawRecord || "",
                    });
                }
                const nwr = parseNWR(line);
                currentWork = { ...nwr, rawRecord: line, territory: null, society: "UNKNOWN" };
                break;
            }
            case "SPU": {
                if (currentWork) {
                    const spu = parseSPU(line);
                    currentWork = Object.assign({}, currentWork, spu);
                }
                break;
            }
            case "SWR": {
                if (currentWork) {
                    const swr = parseSWR(line);
                    currentWork = Object.assign({}, currentWork, swr);
                }
                break;
            }
            // HDR, TRL, and other record types are ignored
        }
    }

    // Flush last work
    if (currentWork?.workTitle) {
        results.push({
            workTitle: currentWork.workTitle,
            iswc: currentWork.iswc || null,
            society: currentWork.society || "UNKNOWN",
            territory: currentWork.territory || null,
            publisherName: currentWork.publisherName || null,
            publisherIpi: currentWork.publisherIpi || null,
            writerName: currentWork.writerName || null,
            writerIpi: currentWork.writerIpi || null,
            shares: currentWork.shares || null,
            recordType: currentWork.recordType || "NWR",
            rawRecord: currentWork.rawRecord || "",
        });
    }

    return results;
}
