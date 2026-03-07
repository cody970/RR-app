import { describe, it, expect, vi } from "vitest";

/**
 * Statement Parser Tests
 *
 * Tests the pure functions: detectFormat, parseStatement (all 4 society parsers),
 * CSV parsing, period detection, and edge cases.
 *
 * DB-dependent functions (matchStatementLines, importStatement) are excluded
 * since they require Prisma mocking — those are integration-tested separately.
 */

// Mock Prisma before importing statement-parser (which imports db at top level)
vi.mock("@/lib/infra/db", () => ({
    db: {
        work: { findMany: vi.fn().mockResolvedValue([]) },
        recording: { findMany: vi.fn().mockResolvedValue([]) },
        statement: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
        statementLine: { deleteMany: vi.fn(), groupBy: vi.fn().mockResolvedValue([]) },
        royaltyPeriod: { upsert: vi.fn(), findUnique: vi.fn() },
    },
}));

// We import the public API; internal helpers are tested indirectly
import {
    detectFormat,
    parseStatement,
    type ParsedStatement,
    type StatementFormat,
} from "../lib/finance/statement-parser";

// ============================================================
// detectFormat
// ============================================================

describe("detectFormat", () => {
    it("should detect ASCAP format from header", () => {
        const header = "Work Title,Writer Name,ISWC,Domestic,Performances,Territory";
        expect(detectFormat(header)).toBe("ASCAP_CSV");
    });

    it("should detect BMI format from header", () => {
        const header = "Song Title,Work#,Writer,ISWC,Royalty Amount,Uses";
        expect(detectFormat(header)).toBe("BMI_CSV");
    });

    it("should detect BMI format with 'Work #' (space)", () => {
        const header = "Song Title,Work #,Writer,ISWC,Royalty Amount,Uses";
        expect(detectFormat(header)).toBe("BMI_CSV");
    });

    it("should detect MLC format from header", () => {
        const header = "HFA Song Code,Song Title,ISRC,Streams,Amount";
        expect(detectFormat(header)).toBe("MLC_CSV");
    });

    it("should detect SoundExchange format from header", () => {
        const header = "Featured Artist,Sound Recording,ISRC,Performances,Royalty";
        expect(detectFormat(header)).toBe("SOUNDEXCHANGE_CSV");
    });

    it("should detect ASCAP via fallback (keyword)", () => {
        const header = "ASCAP Statement,Title,Amount";
        expect(detectFormat(header)).toBe("ASCAP_CSV");
    });

    it("should detect BMI via fallback (keyword)", () => {
        const header = "BMI Quarterly,Title,Amount";
        expect(detectFormat(header)).toBe("BMI_CSV");
    });

    it("should detect MLC via fallback (keyword)", () => {
        const header = "MLC Distribution,Title,Amount";
        expect(detectFormat(header)).toBe("MLC_CSV");
    });

    it("should detect SoundExchange via fallback (keyword)", () => {
        const header = "SoundExchange Report,Title,Amount";
        expect(detectFormat(header)).toBe("SOUNDEXCHANGE_CSV");
    });

    it("should detect ASCAP via fallback (ISWC + Work Title)", () => {
        const header = "Work Title,ISWC,Amount";
        expect(detectFormat(header)).toBe("ASCAP_CSV");
    });

    it("should detect BMI via fallback (Song Title + Writer)", () => {
        const header = "Song Title,Writer,Amount";
        expect(detectFormat(header)).toBe("BMI_CSV");
    });

    it("should detect MLC via fallback (Mechanical)", () => {
        const header = "Mechanical Royalty,Title,Amount";
        expect(detectFormat(header)).toBe("MLC_CSV");
    });

    it("should detect SoundExchange via fallback (Sound Recording + ISRC)", () => {
        const header = "Sound Recording,ISRC,Amount";
        expect(detectFormat(header)).toBe("SOUNDEXCHANGE_CSV");
    });

    it("should return null for unrecognized format", () => {
        expect(detectFormat("Column A,Column B,Column C")).toBeNull();
    });

    it("should return null for empty string", () => {
        expect(detectFormat("")).toBeNull();
    });

    it("should be case-insensitive", () => {
        const header = "work title,writer name,iswc,domestic,performances";
        expect(detectFormat(header)).toBe("ASCAP_CSV");
    });
});

// ============================================================
// parseStatement — ASCAP
// ============================================================

describe("parseStatement — ASCAP", () => {
    const ascapCSV = [
        "Work Title,Writer Name,ISWC,Domestic,Performances,Territory,Period",
        '"Midnight Dreams","John Smith","T-123456789-0","$1,234.56","10,000","US","2024-Q1"',
        '"Summer Breeze","Jane Doe","T-987654321-0","$567.89","5,000","US","2024-Q1"',
    ].join("\n");

    it("should parse ASCAP CSV correctly", () => {
        const result = parseStatement(ascapCSV);
        expect(result.source).toBe("ASCAP");
        expect(result.fileType).toBe("ASCAP_CSV");
        expect(result.lines).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
    });

    it("should extract title and writer", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].title).toBe("Midnight Dreams");
        expect(result.lines[0].artist).toBe("John Smith");
    });

    it("should parse dollar amounts with commas", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].amount).toBe(1234.56);
    });

    it("should parse uses with commas", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].uses).toBe(10000);
    });

    it("should extract ISWC", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].iswc).toBe("T-123456789-0");
    });

    it("should set currency to USD", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].currency).toBe("USD");
    });

    it("should set society to ASCAP", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].society).toBe("ASCAP");
    });

    it("should set useType to PERFORMANCE", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].useType).toBe("PERFORMANCE");
    });

    it("should calculate rate (amount / uses)", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].rate).toBeCloseTo(1234.56 / 10000, 4);
    });

    it("should calculate totalAmount", () => {
        const result = parseStatement(ascapCSV);
        expect(result.totalAmount).toBeCloseTo(1234.56 + 567.89, 2);
    });

    it("should detect period from rows", () => {
        const result = parseStatement(ascapCSV);
        expect(result.period).toBe("2024-Q1");
    });

    it("should extract territory", () => {
        const result = parseStatement(ascapCSV);
        expect(result.lines[0].territory).toBe("US");
    });
});

// ============================================================
// parseStatement — BMI
// ============================================================

describe("parseStatement — BMI", () => {
    const bmiCSV = [
        "Song Title,Work#,Writer,ISWC,Royalty Amount,Uses,Territory,Period",
        '"Ocean Waves","BMI-001","Alice Brown","T-111111111-0","$890.12","7,500","UK","2024 Q2"',
        '"City Lights","BMI-002","Bob Green","","$45.67","300","US","2024 Q2"',
    ].join("\n");

    it("should parse BMI CSV correctly", () => {
        const result = parseStatement(bmiCSV);
        expect(result.source).toBe("BMI");
        expect(result.fileType).toBe("BMI_CSV");
        expect(result.lines).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
    });

    it("should extract title and writer", () => {
        const result = parseStatement(bmiCSV);
        expect(result.lines[0].title).toBe("Ocean Waves");
        expect(result.lines[0].artist).toBe("Alice Brown");
    });

    it("should parse amounts correctly", () => {
        const result = parseStatement(bmiCSV);
        expect(result.lines[0].amount).toBe(890.12);
        expect(result.lines[1].amount).toBe(45.67);
    });

    it("should handle missing ISWC", () => {
        const result = parseStatement(bmiCSV);
        expect(result.lines[0].iswc).toBe("T-111111111-0");
        expect(result.lines[1].iswc).toBeUndefined();
    });

    it("should set society to BMI", () => {
        const result = parseStatement(bmiCSV);
        expect(result.lines[0].society).toBe("BMI");
    });

    it("should detect period with space format (2024 Q2)", () => {
        const result = parseStatement(bmiCSV);
        expect(result.period).toBe("2024-Q2");
    });

    it("should calculate totalAmount", () => {
        const result = parseStatement(bmiCSV);
        expect(result.totalAmount).toBeCloseTo(890.12 + 45.67, 2);
    });
});

// ============================================================
// parseStatement — MLC
// ============================================================

describe("parseStatement — MLC", () => {
    const mlcCSV = [
        "HFA Song Code,Song Title,ISRC,ISWC,Artist,Streams,Amount,Period",
        '"HFA-001","Neon Lights","USRC17607839","T-222222222-0","Charlie Davis","50,000","$200.00","2024/01"',
        '"HFA-002","Rainy Day","USRC17607840","","Diana Evans","100,000","$400.00","2024/01"',
    ].join("\n");

    it("should parse MLC CSV correctly", () => {
        const result = parseStatement(mlcCSV);
        expect(result.source).toBe("MLC");
        expect(result.fileType).toBe("MLC_CSV");
        expect(result.lines).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
    });

    it("should extract ISRC", () => {
        const result = parseStatement(mlcCSV);
        expect(result.lines[0].isrc).toBe("USRC17607839");
        expect(result.lines[1].isrc).toBe("USRC17607840");
    });

    it("should extract ISWC when present", () => {
        const result = parseStatement(mlcCSV);
        expect(result.lines[0].iswc).toBe("T-222222222-0");
        expect(result.lines[1].iswc).toBeUndefined();
    });

    it("should set territory to US", () => {
        const result = parseStatement(mlcCSV);
        expect(result.lines[0].territory).toBe("US");
    });

    it("should set useType to MECHANICAL", () => {
        const result = parseStatement(mlcCSV);
        expect(result.lines[0].useType).toBe("MECHANICAL");
    });

    it("should parse streams as uses", () => {
        const result = parseStatement(mlcCSV);
        expect(result.lines[0].uses).toBe(50000);
        expect(result.lines[1].uses).toBe(100000);
    });

    it("should calculate rate for mechanical royalties", () => {
        const result = parseStatement(mlcCSV);
        expect(result.lines[0].rate).toBeCloseTo(200 / 50000, 6);
    });

    it("should detect period from month format (2024/01 → Q1)", () => {
        const result = parseStatement(mlcCSV);
        expect(result.period).toBe("2024-Q1");
    });
});

// ============================================================
// parseStatement — SoundExchange
// ============================================================

describe("parseStatement — SoundExchange", () => {
    const seCSV = [
        "Featured Artist,Sound Recording,ISRC,Performances,Royalty,Period",
        '"The Weeknd","Blinding Lights","USRC17607841","1,000,000","$2,500.00","2024-Q3"',
        '"Drake","God\'s Plan","USRC17607842","500,000","$1,250.00","2024-Q3"',
    ].join("\n");

    it("should parse SoundExchange CSV correctly", () => {
        const result = parseStatement(seCSV);
        expect(result.source).toBe("SOUNDEXCHANGE");
        expect(result.fileType).toBe("SOUNDEXCHANGE_CSV");
        expect(result.lines).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
    });

    it("should extract featured artist", () => {
        const result = parseStatement(seCSV);
        expect(result.lines[0].artist).toBe("The Weeknd");
        expect(result.lines[1].artist).toBe("Drake");
    });

    it("should extract sound recording title", () => {
        const result = parseStatement(seCSV);
        expect(result.lines[0].title).toBe("Blinding Lights");
    });

    it("should extract ISRC", () => {
        const result = parseStatement(seCSV);
        expect(result.lines[0].isrc).toBe("USRC17607841");
    });

    it("should set territory to US", () => {
        const result = parseStatement(seCSV);
        expect(result.lines[0].territory).toBe("US");
    });

    it("should set useType to DIGITAL", () => {
        const result = parseStatement(seCSV);
        expect(result.lines[0].useType).toBe("DIGITAL");
    });

    it("should parse large performance numbers", () => {
        const result = parseStatement(seCSV);
        expect(result.lines[0].uses).toBe(1000000);
    });

    it("should calculate totalAmount", () => {
        const result = parseStatement(seCSV);
        expect(result.totalAmount).toBeCloseTo(2500 + 1250, 2);
    });

    it("should detect period", () => {
        const result = parseStatement(seCSV);
        expect(result.period).toBe("2024-Q3");
    });
});

// ============================================================
// parseStatement — Format Override
// ============================================================

describe("parseStatement — format override", () => {
    it("should use overrideFormat when provided", () => {
        // This CSV has BMI-like data but we force ASCAP parsing
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Test Song","Test Writer","$100.00","500"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.source).toBe("ASCAP");
        expect(result.lines).toHaveLength(1);
    });
});

// ============================================================
// parseStatement — Edge Cases
// ============================================================

describe("parseStatement — edge cases", () => {
    it("should return UNKNOWN for unrecognized format", () => {
        const result = parseStatement("Column A,Column B\nval1,val2");
        expect(result.source).toBe("UNKNOWN");
        expect(result.fileType).toBe("UNKNOWN");
        expect(result.lines).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain("Unable to detect");
    });

    it("should handle empty content", () => {
        const result = parseStatement("");
        expect(result.source).toBe("UNKNOWN");
        expect(result.lines).toHaveLength(0);
    });

    it("should skip rows with no title and zero amount", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"","","$0.00","0"',
            '"Real Song","Writer","$50.00","100"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0].title).toBe("Real Song");
    });

    it("should handle negative amounts (parentheses notation)", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Refund Song","Writer","($50.00)","100"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0].amount).toBe(-50);
    });

    it("should handle CSV with Windows line endings (\\r\\n)", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Song A","Writer A","$100.00","500"',
        ].join("\r\n");
        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0].title).toBe("Song A");
    });

    it("should handle quoted fields with commas inside", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Song With, Comma","Writer, Jr.","$100.00","500"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0].title).toBe("Song With, Comma");
        expect(result.lines[0].artist).toBe("Writer, Jr.");
    });

    it("should handle rows with missing columns gracefully", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Short Row"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        // Should not crash; line may be skipped or have defaults
        expect(result.errors).toHaveLength(0);
    });

    it("should set rate to undefined when uses is 0", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Zero Uses","Writer","$100.00","0"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0].rate).toBeUndefined();
    });

    it("should handle header-only CSV", () => {
        const csv = "Work Title,Writer Name,Domestic,Performances";
        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines).toHaveLength(0);
        expect(result.totalAmount).toBe(0);
    });

    it("should handle multiple periods in rows (uses first found)", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances,Period",
            '"Song A","Writer","$100.00","500","2023-Q4"',
            '"Song B","Writer","$200.00","1000","2024-Q1"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        // detectPeriodFromRows checks first 5 rows, returns first match
        expect(result.period).toBe("2023-Q4");
    });

    it("should handle period with month format (YYYY/MM)", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances,Period",
            '"Song A","Writer","$100.00","500","2024/06"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.period).toBe("2024-Q2");
    });

    it("should handle period with dash format (YYYY-MM)", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances,Period",
            '"Song A","Writer","$100.00","500","2024-09"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.period).toBe("2024-Q3");
    });
});

// ============================================================
// parseStatement — Amount Parsing Edge Cases
// ============================================================

describe("parseStatement — amount parsing", () => {
    it("should handle amounts without dollar sign", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Song","Writer","100.50","500"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines[0].amount).toBe(100.50);
    });

    it("should handle amounts with spaces", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Song","Writer"," $100.50 ","500"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines[0].amount).toBe(100.50);
    });

    it("should handle zero amounts with title present", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Song With Zero","Writer","$0.00","500"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        // Title is present so line should be included even with $0
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0].amount).toBe(0);
    });

    it("should handle large amounts", () => {
        const csv = [
            "Work Title,Writer Name,Domestic,Performances",
            '"Hit Song","Writer","$1,234,567.89","10,000,000"',
        ].join("\n");

        const result = parseStatement(csv, "ASCAP_CSV");
        expect(result.lines[0].amount).toBe(1234567.89);
        expect(result.lines[0].uses).toBe(10000000);
    });
});

// ============================================================
// Cross-society consistency
// ============================================================

describe("parseStatement — cross-society consistency", () => {
    it("all parsers should produce consistent ParsedStatementLine shape", () => {
        const ascap = parseStatement(
            'Work Title,Writer Name,Domestic,Performances\n"Song","Writer","$100","500"',
            "ASCAP_CSV"
        );
        const bmi = parseStatement(
            'Song Title,Work#,Writer,Royalty Amount,Uses\n"Song","W1","Writer","$100","500"',
            "BMI_CSV"
        );
        const mlc = parseStatement(
            'HFA Song Code,Song Title,ISRC,Streams,Amount\n"H1","Song","ISRC1","500","$100"',
            "MLC_CSV"
        );
        const se = parseStatement(
            'Featured Artist,Sound Recording,ISRC,Performances,Royalty\n"Artist","Song","ISRC1","500","$100"',
            "SOUNDEXCHANGE_CSV"
        );

        for (const result of [ascap, bmi, mlc, se]) {
            expect(result.lines).toHaveLength(1);
            const line = result.lines[0];

            // All lines should have these required fields
            expect(typeof line.title).toBe("string");
            expect(typeof line.uses).toBe("number");
            expect(typeof line.amount).toBe("number");
            expect(typeof line.currency).toBe("string");
            expect(typeof line.society).toBe("string");
            expect(line.currency).toBe("USD");
        }
    });

    it("each parser should set correct society name", () => {
        const societies: Record<StatementFormat, string> = {
            ASCAP_CSV: "ASCAP",
            BMI_CSV: "BMI",
            MLC_CSV: "MLC",
            SOUNDEXCHANGE_CSV: "SOUNDEXCHANGE",
        };

        const csvs: Record<StatementFormat, string> = {
            ASCAP_CSV: 'Work Title,Writer Name,Domestic,Performances\n"S","W","$1","1"',
            BMI_CSV: 'Song Title,Work#,Writer,Royalty Amount,Uses\n"S","W1","W","$1","1"',
            MLC_CSV: 'HFA Song Code,Song Title,ISRC,Streams,Amount\n"H","S","I","1","$1"',
            SOUNDEXCHANGE_CSV: 'Featured Artist,Sound Recording,ISRC,Performances,Royalty\n"A","S","I","1","$1"',
        };

        for (const [format, expectedSociety] of Object.entries(societies)) {
            const result = parseStatement(csvs[format as StatementFormat], format as StatementFormat);
            expect(result.source).toBe(expectedSociety);
            expect(result.lines[0].society).toBe(expectedSociety);
        }
    });

    it("each parser should set correct useType", () => {
        const useTypes: Record<StatementFormat, string> = {
            ASCAP_CSV: "PERFORMANCE",
            BMI_CSV: "PERFORMANCE",
            MLC_CSV: "MECHANICAL",
            SOUNDEXCHANGE_CSV: "DIGITAL",
        };

        const csvs: Record<StatementFormat, string> = {
            ASCAP_CSV: 'Work Title,Writer Name,Domestic,Performances\n"S","W","$1","1"',
            BMI_CSV: 'Song Title,Work#,Writer,Royalty Amount,Uses\n"S","W1","W","$1","1"',
            MLC_CSV: 'HFA Song Code,Song Title,ISRC,Streams,Amount\n"H","S","I","1","$1"',
            SOUNDEXCHANGE_CSV: 'Featured Artist,Sound Recording,ISRC,Performances,Royalty\n"A","S","I","1","$1"',
        };

        for (const [format, expectedType] of Object.entries(useTypes)) {
            const result = parseStatement(csvs[format as StatementFormat], format as StatementFormat);
            expect(result.lines[0].useType).toBe(expectedType);
        }
    });
});