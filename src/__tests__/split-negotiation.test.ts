import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/infra/db', () => ({
    db: {
        splitSignoff: { findUnique: vi.fn() },
        splitNegotiation: { create: vi.fn(), update: vi.fn() },
        negotiationMessage: { create: vi.fn() },
    },
}));

vi.mock('@/lib/notifications', () => ({
    sendSplitProposalEmail: vi.fn().mockResolvedValue({ success: true }),
    sendSplitProposalSms: vi.fn().mockResolvedValue({ success: true }),
    sendCounterProposalEmail: vi.fn().mockResolvedValue({ success: true }),
    sendCounterProposalSms: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST, GET } from '@/app/api/splits/negotiate/route';

describe('Split Negotiation API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/splits/negotiate', () => {
        it('should return 400 if token is missing', async () => {
            const request = new Request('http://localhost/api/splits/negotiate');
            const response = await GET(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Token is required');
        });

        it('should return 404 if signoff not found', async () => {
            const { db } = await import('@/lib/infra/db');
            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue(null);

            const request = new Request('http://localhost/api/splits/negotiate?token=invalid-token');
            const response = await GET(request);
            expect(response.status).toBe(404);
            const data = await response.json();
            expect(data.error).toBe('Invalid token');
        });

        it('should return signoff details with negotiation data', async () => {
            const { db } = await import('@/lib/infra/db');
            const mockSignoff = {
                id: 'signoff-123',
                workId: 'work-123',
                writerName: 'Test Writer',
                targetEmail: 'writer@test.com',
                proposedSplit: 50,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 86400000),
                work: {
                    id: 'work-123',
                    title: 'Test Work',
                    iswc: 'T1234567890',
                    writers: [{ writer: { name: 'Test Writer' }, splitPercent: 50 }],
                },
                organization: { id: 'org-123', name: 'Test Org' },
                negotiation: null,
            };

            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue(mockSignoff as any);

            const request = new Request('http://localhost/api/splits/negotiate?token=valid-token');
            const response = await GET(request);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.signoff.writerName).toBe('Test Writer');
            expect(data.work.title).toBe('Test Work');
        });
    });

    describe('POST /api/splits/negotiate', () => {
        it('should return 400 for invalid request data', async () => {
            const request = new Request('http://localhost/api/splits/negotiate', {
                method: 'POST',
                body: JSON.stringify({}),
            });
            const response = await POST(request);
            expect(response.status).toBe(400);
        });

        it('should return 404 if signoff not found', async () => {
            const { db } = await import('@/lib/infra/db');
            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue(null);

            const request = new Request('http://localhost/api/splits/negotiate', {
                method: 'POST',
                body: JSON.stringify({
                    token: 'invalid-token',
                    action: 'MESSAGE',
                    message: 'Test message',
                }),
            });
            const response = await POST(request);
            expect(response.status).toBe(404);
        });

        it('should return 400 if signoff is expired', async () => {
            const { db } = await import('@/lib/infra/db');
            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue({
                id: 'signoff-123',
                expiresAt: new Date(Date.now() - 86400000), // Expired
                status: 'PENDING',
                negotiation: null,
            } as any);

            const request = new Request('http://localhost/api/splits/negotiate', {
                method: 'POST',
                body: JSON.stringify({
                    token: 'expired-token',
                    action: 'MESSAGE',
                    message: 'Test',
                }),
            });
            const response = await POST(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('This link has expired');
        });

        it('should return 400 if signoff already approved', async () => {
            const { db } = await import('@/lib/infra/db');
            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue({
                id: 'signoff-123',
                expiresAt: new Date(Date.now() + 86400000),
                status: 'APPROVED',
                negotiation: null,
            } as any);

            const request = new Request('http://localhost/api/splits/negotiate', {
                method: 'POST',
                body: JSON.stringify({
                    token: 'approved-token',
                    action: 'MESSAGE',
                    message: 'Test',
                }),
            });
            const response = await POST(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('This split has already been approved');
        });

        it('should require counterSplit for COUNTER action', async () => {
            const { db } = await import('@/lib/infra/db');
            const mockSignoff = {
                id: 'signoff-123',
                workId: 'work-123',
                organizationId: 'org-123',
                proposedSplit: 50,
                expiresAt: new Date(Date.now() + 86400000),
                status: 'PENDING',
                negotiation: {
                    id: 'neg-123',
                    currentRound: 1,
                    messages: [],
                },
            };

            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue(mockSignoff as any);

            const request = new Request('http://localhost/api/splits/negotiate', {
                method: 'POST',
                body: JSON.stringify({
                    token: 'valid-token',
                    action: 'COUNTER',
                    // Missing counterSplit
                }),
            });
            const response = await POST(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Counter split value is required');
        });

        it('should require message for MESSAGE action', async () => {
            const { db } = await import('@/lib/infra/db');
            const mockSignoff = {
                id: 'signoff-123',
                workId: 'work-123',
                organizationId: 'org-123',
                proposedSplit: 50,
                expiresAt: new Date(Date.now() + 86400000),
                status: 'PENDING',
                negotiation: {
                    id: 'neg-123',
                    currentRound: 1,
                    messages: [],
                },
            };

            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue(mockSignoff as any);

            const request = new Request('http://localhost/api/splits/negotiate', {
                method: 'POST',
                body: JSON.stringify({
                    token: 'valid-token',
                    action: 'MESSAGE',
                    message: '', // Empty message
                }),
            });
            const response = await POST(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Message is required');
        });
    });
});
