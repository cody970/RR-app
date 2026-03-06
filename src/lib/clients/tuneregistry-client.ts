/**
 * TuneRegistry API Client
 *
 * Integrates with TuneRegistry's Enterprise API for automated
 * registration of works and recordings with PROs:
 * - ASCAP, BMI, SESAC (performing rights)
 * - SoundExchange (digital performance royalties)
 * - The MLC (mechanical licensing)
 * - HFA (Harry Fox Agency)
 *
 * API Docs: https://www.tuneregistry.com/enterprise
 * Requires: TUNEREGISTRY_API_KEY and TUNEREGISTRY_PUBLISHER_ID env vars
 */

const TUNEREGISTRY_BASE_URL =
    process.env.TUNEREGISTRY_API_URL || "https://api.tuneregistry.com/v1";

function getHeaders(): Record<string, string> {
    const apiKey = process.env.TUNEREGISTRY_API_KEY;
    if (!apiKey) throw new Error("Missing TUNEREGISTRY_API_KEY environment variable");

    return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "RoyaltyRadar/1.0.0",
    };
}

// ---------- Type Definitions ----------

export interface TuneRegistryWork {
    title: string;
    iswc?: string;
    alternateTitles?: string[];
    writers: TuneRegistryWriter[];
    publishers: TuneRegistryPublisher[];
}

export interface TuneRegistryWriter {
    firstName: string;
    lastName: string;
    ipiNameNumber?: string;
    ipiBaseNumber?: string;
    role: "C" | "A" | "CA" | "AR" | "AD" | "SA" | "SE" | "E" | "ES" | "TR"; // CWR writer roles
    prAffiliation?: string; // ASCAP, BMI, SESAC
    prShare: number; // 0-100
    mrShare?: number; // mechanical rights share
}

export interface TuneRegistryPublisher {
    name: string;
    ipiNameNumber?: string;
    role: "E" | "AM" | "SE" | "ES"; // Original, Admin, Sub, E/S
    prAffiliation?: string;
    prShare: number;
    mrShare?: number;
}

export interface TuneRegistryRecording {
    title: string;
    isrc?: string;
    duration?: number; // in seconds
    artist: string;
    label?: string;
    releaseDate?: string; // ISO 8601
    workId?: string; // TuneRegistry work ID to link
}

export interface RegistrationSubmission {
    id: string;
    status: "PENDING" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "ERROR";
    society: string;
    workTitle: string;
    submittedAt: string;
    acknowledgedAt?: string;
    confirmationId?: string;
    errors?: string[];
}

export interface RegistrationResponse {
    success: boolean;
    submissionId: string;
    status: string;
    message?: string;
}

// ---------- API Functions ----------

/**
 * Submit a work for registration across one or more PROs.
 */
export async function submitWorkRegistration(
    work: TuneRegistryWork,
    societies: string[] = ["ASCAP", "BMI"]
): Promise<RegistrationResponse> {
    try {
        const publisherId = process.env.TUNEREGISTRY_PUBLISHER_ID;
        if (!publisherId) throw new Error("Missing TUNEREGISTRY_PUBLISHER_ID");

        const res = await fetch(`${TUNEREGISTRY_BASE_URL}/registrations/works`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                publisherId,
                work,
                targetSocieties: societies,
                format: "CWR", // Use CWR format for submission
                version: "2.2",
            }),
        });

        if (!res.ok) {
            const error = await res.text();
            return {
                success: false,
                submissionId: "",
                status: "ERROR",
                message: `TuneRegistry API error: ${res.status} - ${error}`,
            };
        }

        const data = await res.json();
        return {
            success: true,
            submissionId: data.submissionId || data.id,
            status: data.status || "SUBMITTED",
            message: data.message,
        };
    } catch (e) {
        return {
            success: false,
            submissionId: "",
            status: "ERROR",
            message: e instanceof Error ? e.message : String(e),
        };
    }
}

/**
 * Submit a recording for registration (SoundExchange, The MLC).
 */
export async function submitRecordingRegistration(
    recording: TuneRegistryRecording,
    societies: string[] = ["SoundExchange", "MLC"]
): Promise<RegistrationResponse> {
    try {
        const publisherId = process.env.TUNEREGISTRY_PUBLISHER_ID;
        if (!publisherId) throw new Error("Missing TUNEREGISTRY_PUBLISHER_ID");

        const res = await fetch(`${TUNEREGISTRY_BASE_URL}/registrations/recordings`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                publisherId,
                recording,
                targetSocieties: societies,
            }),
        });

        if (!res.ok) {
            const error = await res.text();
            return {
                success: false,
                submissionId: "",
                status: "ERROR",
                message: `TuneRegistry API error: ${res.status} - ${error}`,
            };
        }

        const data = await res.json();
        return {
            success: true,
            submissionId: data.submissionId || data.id,
            status: data.status || "SUBMITTED",
        };
    } catch (e) {
        return {
            success: false,
            submissionId: "",
            status: "ERROR",
            message: e instanceof Error ? e.message : String(e),
        };
    }
}

/**
 * Batch submit multiple works for registration.
 */
export async function batchSubmitWorks(
    works: TuneRegistryWork[],
    societies: string[] = ["ASCAP", "BMI"]
): Promise<RegistrationResponse[]> {
    const results: RegistrationResponse[] = [];
    for (const work of works) {
        const result = await submitWorkRegistration(work, societies);
        results.push(result);
        // Respectful rate limiting
        await new Promise((r) => setTimeout(r, 500));
    }
    return results;
}

/**
 * Check the status of a previous registration submission.
 */
export async function checkSubmissionStatus(
    submissionId: string
): Promise<RegistrationSubmission | null> {
    try {
        const res = await fetch(
            `${TUNEREGISTRY_BASE_URL}/registrations/${submissionId}/status`,
            { headers: getHeaders() }
        );
        if (!res.ok) return null;
        return (await res.json()) as RegistrationSubmission;
    } catch {
        return null;
    }
}

/**
 * Get all registration submissions for a publisher.
 */
export async function listSubmissions(
    options: { status?: string; society?: string; limit?: number } = {}
): Promise<RegistrationSubmission[]> {
    try {
        const publisherId = process.env.TUNEREGISTRY_PUBLISHER_ID;
        if (!publisherId) throw new Error("Missing TUNEREGISTRY_PUBLISHER_ID");

        const params = new URLSearchParams({ publisherId });
        if (options.status) params.set("status", options.status);
        if (options.society) params.set("society", options.society);
        if (options.limit) params.set("limit", String(options.limit));

        const res = await fetch(
            `${TUNEREGISTRY_BASE_URL}/registrations?${params}`,
            { headers: getHeaders() }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data.submissions || [];
    } catch {
        return [];
    }
}

/**
 * Convert a RoyaltyRadar gap record into a TuneRegistry work submission.
 * Maps internal data structures to TuneRegistry's expected format.
 */
export function convertGapToRegistration(gap: {
    title: string;
    iswc?: string | null;
    artistName?: string | null;
    society: string;
}): TuneRegistryWork {
    // Parse artist name into first/last
    const nameParts = (gap.artistName || "Unknown").split(" ");
    const lastName = nameParts.pop() || "Unknown";
    const firstName = nameParts.join(" ") || "";

    return {
        title: gap.title,
        iswc: gap.iswc || undefined,
        writers: [
            {
                firstName,
                lastName,
                role: "CA", // Composer/Author
                prShare: 100,
            },
        ],
        publishers: [],
    };
}
