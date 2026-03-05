import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichMetadata } from '@/lib/enrichment';

// Mock the global fetch
global.fetch = vi.fn();

describe('Enrichment engine (MusicBrainz)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should enrich a work successfully', async () => {
        const mockResponse = {
            works: [
                {
                    id: 'mbid-123',
                    title: 'Test Song',
                    iswcs: ['T-123456789-Z'],
                    score: 95
                }
            ]
        };

        // Setup mock return
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await enrichMetadata('Test Song');
        expect(result).not.toBeNull();
        expect(result.found).toBe(true);
        expect(result.provider).toBe('MusicBrainz');
        expect(result.externalIswc).toBe('T-123456789-Z');
        expect(result.matchScore).toBe(95);
    });

    it('should handle work not found', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ works: [] })
        });

        const result = await enrichMetadata('Unknown Mystery Song');
        expect(result.found).toBe(false);
        expect(result.matchScore).toBe(0);
    });

    it('should enrich a recording successfully via ISRC fallback', async () => {
        const mockResponse = {
            recordings: [
                {
                    id: 'mbid-rec-123',
                    title: 'Test Recording Live',
                    isrcs: [{ id: 'USRC12345678' }],
                    score: 99
                }
            ]
        };

        // If currentId is an ISRC, it fetches only recordings
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await enrichMetadata('Test Recording Live', 'USRC12345678');
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result.found).toBe(true);
        expect(result.externalIsrc).toBe('USRC12345678');
        expect(result.matchScore).toBe(99);
    });

    it('should handle API errors gracefully', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable'
        });

        const result = await enrichMetadata('Any Song');
        expect(result.found).toBe(false);
        expect(result.matchScore).toBe(0);
    });
});
