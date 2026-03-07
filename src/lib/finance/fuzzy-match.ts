/**
 * Fuzzy Matching Engine for Statement Line → Catalog Work Matching
 *
 * Implements multiple string similarity algorithms and title normalization
 * to catch common real-world variations: alternate titles, featuring artists,
 * punctuation differences, remix tags, and transliterations.
 */

// ---------- String Similarity Algorithms ----------

/**
 * Jaro similarity between two strings (0-1).
 * Optimized for short strings like song titles.
 */
export function jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    if (matchDistance < 0) return 0.0;

    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matching characters
    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, s2.length);

        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    return (
        (matches / s1.length +
            matches / s2.length +
            (matches - transpositions / 2) / matches) /
        3
    );
}

/**
 * Jaro-Winkler similarity (0-1).
 * Gives bonus weight to common prefixes, which is ideal for song titles
 * that often share the same beginning.
 */
export function jaroWinklerSimilarity(s1: string, s2: string, prefixScale: number = 0.1): number {
    const jaroScore = jaroSimilarity(s1, s2);

    // Find common prefix length (up to 4 characters)
    let prefixLength = 0;
    const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
    for (let i = 0; i < maxPrefix; i++) {
        if (s1[i] === s2[i]) {
            prefixLength++;
        } else {
            break;
        }
    }

    return jaroScore + prefixLength * prefixScale * (1 - jaroScore);
}

/**
 * Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits needed.
 */
export function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    // Use single-row optimization for memory efficiency
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);

    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,      // deletion
                curr[j - 1] + 1,  // insertion
                prev[j - 1] + cost // substitution
            );
        }
        [prev, curr] = [curr, prev];
    }

    return prev[n];
}

/**
 * Normalized Levenshtein similarity (0-1).
 * 1.0 = identical, 0.0 = completely different.
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
    if (s1.length === 0 && s2.length === 0) return 1.0;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    return 1 - levenshteinDistance(s1, s2) / maxLen;
}

// ---------- Title Normalization ----------

/**
 * Patterns to strip from titles before matching.
 * Order matters — more specific patterns first.
 */
const STRIP_PATTERNS: [RegExp, string][] = [
    // Step 1: Normalize unicode punctuation FIRST (before any stripping)
    [/[\u2018\u2019\u0060\u00B4]/g, "'"],  // Smart quotes → straight apostrophe
    [/[\u201C\u201D]/g, '"'],              // Smart double quotes → straight
    [/[\u2013\u2014]/g, "-"],              // En/em dash → hyphen
    [/[\u2026]/g, "..."],                  // Ellipsis → dots
    // Step 2: Strip featuring artist variations
    [/\s*\(?\s*(?:feat\.?|ft\.?|featuring)\s+[^)]*\)?\s*/gi, " "],
    // Step 3: Strip remix/version tags in parentheses or brackets
    [/\s*[\(\[]\s*(?:remix|mix|version|edit|radio\s*edit|clean|explicit|deluxe|remaster(?:ed)?|live|acoustic|instrumental|demo|bonus\s*track|extended|original)\s*(?:by\s+[^\)\]]+)?[\)\]]\s*/gi, " "],
    // Step 4: Strip "The" prefix
    [/^the\s+/i, ""],
    // Step 5: Strip remaining special characters except alphanumeric, spaces, apostrophes, hyphens, ampersands
    [/[^\w\s'&-]/g, ""],
    // Step 6: Collapse multiple spaces
    [/\s+/g, " "],
];

/**
 * Normalize a song title for fuzzy comparison.
 * Strips featuring artists, remix tags, punctuation variations,
 * and common prefixes to produce a canonical form.
 */
export function normalizeTitle(title: string): string {
    if (!title) return "";

    let normalized = title.trim();

    for (const [pattern, replacement] of STRIP_PATTERNS) {
        normalized = normalized.replace(pattern, replacement);
    }

    return normalized.trim().toUpperCase();
}

/**
 * Extract the "featuring" artist from a title, if present.
 */
export function extractFeaturedArtist(title: string): string | null {
    const match = title.match(/\(?\s*(?:feat\.?|ft\.?|featuring)\s+([^)]+)\)?/i);
    return match ? match[1].trim() : null;
}

/**
 * Extract remix/version info from a title, if present.
 */
export function extractVersionInfo(title: string): string | null {
    const match = title.match(/[\(\[]\s*((?:remix|mix|version|edit|radio\s*edit|clean|explicit|deluxe|remaster(?:ed)?|live|acoustic|instrumental|demo|extended|original)(?:\s+by\s+[^\)\]]+)?)\s*[\)\]]/i);
    return match ? match[1].trim() : null;
}

// ---------- Composite Matching ----------

/**
 * Match confidence levels for different match types.
 */
export const MATCH_CONFIDENCE = {
    EXACT_ISWC: 100,
    EXACT_ISRC: 95,
    EXACT_TITLE: 90,
    NORMALIZED_TITLE: 85,
    FUZZY_HIGH: 80,
    FUZZY_MEDIUM: 75,
    FUZZY_LOW: 70,
    CONTAINS: 65,
} as const;

export type MatchMethod =
    | "EXACT_ISWC"
    | "EXACT_ISRC"
    | "EXACT_TITLE"
    | "NORMALIZED_TITLE"
    | "FUZZY_HIGH"
    | "FUZZY_MEDIUM"
    | "FUZZY_LOW"
    | "CONTAINS"
    | "USER_CORRECTED"
    | "USER_REJECTED"
    | "NONE";

export interface FuzzyMatchResult {
    workId: string;
    matchMethod: MatchMethod;
    matchConfidence: number;
    similarity: number;
    matchedTitle: string;
}

/**
 * Configuration for fuzzy matching thresholds.
 */
export interface FuzzyMatchConfig {
    /** Minimum Jaro-Winkler similarity for a fuzzy match (0-1). Default: 0.85 */
    minSimilarity: number;
    /** High confidence threshold. Default: 0.92 */
    highConfidenceThreshold: number;
    /** Medium confidence threshold. Default: 0.85 */
    mediumConfidenceThreshold: number;
    /** Whether to use contains matching as fallback. Default: true */
    useContainsMatch: boolean;
    /** Maximum number of fuzzy match candidates to evaluate per line. Default: 5 */
    maxCandidates: number;
}

export const DEFAULT_FUZZY_CONFIG: FuzzyMatchConfig = {
    minSimilarity: 0.85,
    highConfidenceThreshold: 0.92,
    mediumConfidenceThreshold: 0.85,
    useContainsMatch: true,
    maxCandidates: 5,
};

/**
 * Find the best fuzzy match for a title against a catalog of works.
 *
 * Uses a multi-stage approach:
 * 1. Normalized exact match (after stripping feat., remix tags, etc.)
 * 2. Jaro-Winkler similarity scoring
 * 3. Levenshtein similarity as tiebreaker
 * 4. Contains match as last resort
 *
 * Returns null if no match meets the minimum threshold.
 */
export function findBestFuzzyMatch(
    searchTitle: string,
    catalogTitles: Map<string, string>, // normalizedTitle -> workId
    rawTitles: Map<string, string>,     // originalTitle (uppercase) -> workId
    config: FuzzyMatchConfig = DEFAULT_FUZZY_CONFIG
): FuzzyMatchResult | null {
    if (!searchTitle) return null;

    const normalizedSearch = normalizeTitle(searchTitle);
    if (!normalizedSearch) return null;

    // Stage 1: Normalized exact match
    const normalizedExact = catalogTitles.get(normalizedSearch);
    if (normalizedExact) {
        return {
            workId: normalizedExact,
            matchMethod: "NORMALIZED_TITLE",
            matchConfidence: MATCH_CONFIDENCE.NORMALIZED_TITLE,
            similarity: 1.0,
            matchedTitle: normalizedSearch,
        };
    }

    // Stage 2: Fuzzy similarity scoring
    let bestMatch: FuzzyMatchResult | null = null;
    let bestScore = 0;

    // Score all catalog titles and keep top candidates
    const candidates: { title: string; workId: string; score: number }[] = [];

    for (const [catalogTitle, workId] of catalogTitles) {
        // Quick length-based pre-filter: skip if lengths differ by more than 50%
        const lenRatio = Math.min(normalizedSearch.length, catalogTitle.length) /
            Math.max(normalizedSearch.length, catalogTitle.length);
        if (lenRatio < 0.5) continue;

        const jwScore = jaroWinklerSimilarity(normalizedSearch, catalogTitle);
        if (jwScore >= config.minSimilarity * 0.9) { // Slightly lower threshold for candidates
            candidates.push({ title: catalogTitle, workId, score: jwScore });
        }
    }

    // Sort by score descending and take top N
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, config.maxCandidates);

    for (const candidate of topCandidates) {
        // Compute both similarity metrics for the top candidates
        const jwScore = candidate.score;
        const levScore = levenshteinSimilarity(normalizedSearch, candidate.title);

        // Combined score: weighted average (JW is better for transpositions, Lev for insertions/deletions)
        const combinedScore = jwScore * 0.6 + levScore * 0.4;

        if (combinedScore > bestScore && combinedScore >= config.minSimilarity) {
            bestScore = combinedScore;

            let matchMethod: MatchMethod;
            let matchConfidence: number;

            if (combinedScore >= config.highConfidenceThreshold) {
                matchMethod = "FUZZY_HIGH";
                matchConfidence = MATCH_CONFIDENCE.FUZZY_HIGH;
            } else if (combinedScore >= config.mediumConfidenceThreshold) {
                matchMethod = "FUZZY_MEDIUM";
                matchConfidence = MATCH_CONFIDENCE.FUZZY_MEDIUM;
            } else {
                matchMethod = "FUZZY_LOW";
                matchConfidence = MATCH_CONFIDENCE.FUZZY_LOW;
            }

            bestMatch = {
                workId: candidate.workId,
                matchMethod,
                matchConfidence,
                similarity: combinedScore,
                matchedTitle: candidate.title,
            };
        }
    }

    if (bestMatch) return bestMatch;

    // Stage 3: Contains match (substring) as last resort
    if (config.useContainsMatch) {
        const searchUpper = searchTitle.toUpperCase().trim();
        for (const [rawTitle, workId] of rawTitles) {
            if (rawTitle.includes(searchUpper) || searchUpper.includes(rawTitle)) {
                // Only accept contains match if the length difference isn't too extreme
                const lenRatio = Math.min(searchUpper.length, rawTitle.length) /
                    Math.max(searchUpper.length, rawTitle.length);
                if (lenRatio >= 0.5) {
                    return {
                        workId,
                        matchMethod: "CONTAINS",
                        matchConfidence: MATCH_CONFIDENCE.CONTAINS,
                        similarity: lenRatio,
                        matchedTitle: rawTitle,
                    };
                }
            }
        }
    }

    return null;
}

/**
 * Batch fuzzy match: match multiple search titles against a catalog.
 * Pre-builds normalized lookup maps for efficiency.
 */
export function batchFuzzyMatch(
    searchTitles: { index: number; title: string }[],
    catalogWorks: { id: string; title: string }[],
    config: FuzzyMatchConfig = DEFAULT_FUZZY_CONFIG
): Map<number, FuzzyMatchResult> {
    // Build normalized catalog maps
    const normalizedCatalog = new Map<string, string>();
    const rawCatalog = new Map<string, string>();

    for (const work of catalogWorks) {
        const normalized = normalizeTitle(work.title);
        if (normalized) normalizedCatalog.set(normalized, work.id);
        rawCatalog.set(work.title.toUpperCase().trim(), work.id);
    }

    // Match each search title
    const results = new Map<number, FuzzyMatchResult>();

    for (const { index, title } of searchTitles) {
        const match = findBestFuzzyMatch(title, normalizedCatalog, rawCatalog, config);
        if (match) {
            results.set(index, match);
        }
    }

    return results;
}