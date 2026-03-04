export function normalizeTitle(title: string | null | undefined): string {
    if (!title) return "";
    let normalized = title.toLowerCase();

    // Strip feat, ft, remix tags
    normalized = normalized.replace(/\((feat|ft|remix|radio edit)[^)]*\)/g, "");
    normalized = normalized.replace(/\[(feat|ft|remix|radio edit)[^\]]*\]/g, "");

    // Strip punctuation & whitespace collapse
    normalized = normalized.replace(/[^\w\s]/gi, "");
    normalized = normalized.replace(/\s+/g, " ").trim();

    return normalized;
}

/**
 * Levenshtein edit distance between two strings.
 * Returns the minimum number of single-character edits (insertions,
 * deletions, substitutions) required to change one word into the other.
 */
export function levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // Edge cases
    if (m === 0) return n;
    if (n === 0) return m;

    // Use two rows instead of full matrix for O(min(m,n)) space
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array(n + 1);

    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,      // deletion
                curr[j - 1] + 1,   // insertion
                prev[j - 1] + cost // substitution
            );
        }
        [prev, curr] = [curr, prev];
    }

    return prev[n];
}

/**
 * Fuzzy similarity score between two music titles (0–100).
 * - 100 = exact match after normalization
 * - 80  = one string contains the other
 * - Otherwise: Levenshtein-based score scaled to max length
 */
export function similarity(s1: string | null | undefined, s2: string | null | undefined): number {
    if (!s1 || !s2) return 0;
    const n1 = normalizeTitle(s1);
    const n2 = normalizeTitle(s2);

    if (!n1 || !n2) return 0;
    if (n1 === n2) return 100;

    const containsScore = (n1.includes(n2) || n2.includes(n1)) ? 80 : 0;
    const distance = levenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    const levenshteinScore = Math.round((1 - distance / maxLen) * 100);

    return Math.max(containsScore, levenshteinScore, 0);
}

export function isValidISWC(iswc: string): boolean {
    return /^T-\d{9}-\d$/.test(iswc);
}

export function isValidISRC(isrc: string): boolean {
    return /^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/.test(isrc.toUpperCase());
}
