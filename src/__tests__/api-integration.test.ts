import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as calculatePost } from '../app/api/accounting/calculate/route';
import { POST as splitResolvePost } from '../app/api/splits/resolve/route';
import { POST as splitRequestPost } from '../app/api/splits/request/route';
import { PATCH as findingPatch } from '../app/api/findings/[id]/route';
import { PATCH as findingsBulkPatch } from '../app/api/findings/bulk/route';

// Mock dependencies
vi.mock('@/lib/infra/db', () => ({
    db: {
        statement: { findUnique: vi.fn() },
        license: { findUnique: vi.fn() },
        splitSignoff: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
        finding: { update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
        task: { createMany: vi.fn() },
        auditLog: { create: vi.fn() },
        activity: { create: vi.fn() },
        organization: { findUnique: vi.fn() },
        work: { findUnique: vi.fn() },
        splitNegotiation: { update: vi.fn() },
    },
}));

vi.mock('@/lib/auth/get-session', () => ({
    requireAuth: vi.fn(),
}));

vi.mock('@/lib/auth/rbac', () => ({
    validatePermission: vi.fn(),
}));

vi.mock('@/lib/music/split-engine', () => ({
    processStatementLineSplits: vi.fn(),
    processLicenseSplits: vi.fn(),
}));

vi.mock('@/lib/infra/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({ success: true, count: 1, limit: 10 }),
}));

vi.mock('@/lib/infra/redis', () => ({
    redis: {
        multi: vi.fn().mockReturnValue({
            incr: vi.fn(),
            pexpire: vi.fn(),
            exec: vi.fn().mockResolvedValue([[null, 1]]),
        }),
    },
}));

vi.mock('@/lib/email/send-email', () => ({
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/notifications', () => ({
    sendSplitProposalEmail: vi.fn().mockResolvedValue({ success: true }),
    sendSplitProposalSms: vi.fn().mockResolvedValue({ success: true }),
}));

// Helper to create consistent auth mock
function mockAuth(overrides: Record<string, any> = {}) {
    return {
        session: {
            user: {
                id: 'user-123',
                orgId: 'org-123',
                role: 'ADMIN',
                email: 'test@example.com',
            },
        },
        userId: 'user-123',
        orgId: 'org-123',
        role: 'ADMIN',
        ...overrides,
    };
}

describe('API Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/accounting/calculate', () => {
        it('should calculate splits for a statement', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { validatePermission } = await import('@/lib/auth/rbac');
            const { processStatementLineSplits } = await import('@/lib/music/split-engine');
            const { db } = await import('@/lib/infra/db');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth());
            vi.mocked(validatePermission).mockReturnValue(undefined);
            vi.mocked(db.statement.findUnique).mockResolvedValue({
                id: 'stmt-123',
                orgId: 'org-123',
                lines: [
                    { id: 'line-1', workId: 'work-123' },
                    { id: 'line-2', workId: 'work-456' }
                ]
            } as any);
            vi.mocked(processStatementLineSplits).mockResolvedValue(2);

            const request = new Request('http://localhost/api/accounting/calculate', {
                method: 'POST',
                body: JSON.stringify({
                    source: 'STATEMENT',
                    sourceId: 'stmt-123'
                })
            });

            const response = await calculatePost(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.ledgersCreated).toBeGreaterThanOrEqual(0);
        });

        it('should validate required fields', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            vi.mocked(requireAuth).mockResolvedValue(mockAuth());

            const request = new Request('http://localhost/api/accounting/calculate', {
                method: 'POST',
                body: JSON.stringify({})
            });

            const response = await calculatePost(request);
            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/splits/resolve', () => {
        it('should approve a split request with valid token', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { db } = await import('@/lib/infra/db');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth());
            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue({
                id: 'signoff-123',
                token: 'valid-token',
                targetEmail: 'test@example.com',
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 86400000),
                work: { title: 'Test Song' }
            } as any);
            vi.mocked(db.splitSignoff.update).mockResolvedValue({
                id: 'signoff-123',
                status: 'APPROVED'
            } as any);

            const request = new Request('http://localhost/api/splits/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    token: 'valid-token',
                    action: 'APPROVE'
                })
            });

            const response = await splitResolvePost(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should require dispute reason when disputing', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { db } = await import('@/lib/infra/db');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth());
            vi.mocked(db.splitSignoff.findUnique).mockResolvedValue({
                id: 'signoff-123',
                token: 'valid-token',
                targetEmail: 'test@example.com',
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 86400000)
            } as any);

            const request = new Request('http://localhost/api/splits/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    token: 'valid-token',
                    action: 'DISPUTE'
                })
            });

            const response = await splitResolvePost(request);
            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/splits/request', () => {
        it('should create a split request', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { db } = await import('@/lib/infra/db');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth());
            vi.mocked(db.organization.findUnique).mockResolvedValue({
                id: 'org-123',
                name: 'Test Organization',
            } as any);
            vi.mocked(db.work.findUnique).mockResolvedValue({
                id: 'work-123',
                title: 'Test Work',
            } as any);
            vi.mocked(db.splitSignoff.create).mockResolvedValue({
                id: 'signoff-123',
                token: 'new-token'
            } as any);

            const request = new Request('http://localhost/api/splits/request', {
                method: 'POST',
                body: JSON.stringify({
                    workId: 'work-123',
                    targetEmail: 'writer@example.com',
                    writerName: 'John Doe',
                    proposedSplit: 50
                })
            });

            const response = await splitRequestPost(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.signoff).toBeDefined();
        });

        it('should validate required fields', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            vi.mocked(requireAuth).mockResolvedValue(mockAuth());

            const request = new Request('http://localhost/api/splits/request', {
                method: 'POST',
                body: JSON.stringify({})
            });

            const response = await splitRequestPost(request);
            expect(response.status).toBe(400);
        });
    });

    describe('PATCH /api/findings/[id]', () => {
        it('should update finding status', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { validatePermission } = await import('@/lib/auth/rbac');
            const { db } = await import('@/lib/infra/db');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth());
            vi.mocked(validatePermission).mockReturnValue(undefined);
            vi.mocked(db.finding.update).mockResolvedValue({
                id: 'finding-123',
                status: 'CONFIRMED'
            } as any);
            vi.mocked(db.auditLog.create).mockResolvedValue({} as any);
            vi.mocked(db.activity.create).mockResolvedValue({} as any);

            const request = new Request('http://localhost/api/findings/finding-123', {
                method: 'PATCH',
                body: JSON.stringify({
                    status: 'CONFIRMED'
                })
            });

            const response = await findingPatch(request, {
                params: Promise.resolve({ id: 'finding-123' })
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.status).toBe('CONFIRMED');
        });

        it('should enforce RBAC permissions', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { validatePermission } = await import('@/lib/auth/rbac');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth({ role: 'VIEWER' }));
            vi.mocked(validatePermission).mockImplementation(() => {
                throw new Error('Forbidden');
            });

            const request = new Request('http://localhost/api/findings/finding-123', {
                method: 'PATCH',
                body: JSON.stringify({ status: 'CONFIRMED' })
            });

            const response = await findingPatch(request, {
                params: Promise.resolve({ id: 'finding-123' })
            });
            expect(response.status).toBe(403);
        });
    });

    describe('PATCH /api/findings/bulk', () => {
        it('should update multiple findings', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { db } = await import('@/lib/infra/db');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth({ role: 'OWNER' }));
            vi.mocked(db.finding.updateMany).mockResolvedValue({ count: 5 });

            const request = new Request('http://localhost/api/findings/bulk', {
                method: 'PATCH',
                body: JSON.stringify({
                    ids: ['f1', 'f2', 'f3', 'f4', 'f5'],
                    action: 'updateStatus',
                    status: 'INVESTIGATING'
                })
            });

            const response = await findingsBulkPatch(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.updated).toBe(5);
        });

        it('should enforce OWNER/ADMIN role for bulk actions', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth({ role: 'VIEWER' }));

            const request = new Request('http://localhost/api/findings/bulk', {
                method: 'PATCH',
                body: JSON.stringify({
                    ids: ['f1', 'f2', 'f3'],
                    action: 'updateStatus',
                    status: 'INVESTIGATING'
                })
            });

            const response = await findingsBulkPatch(request);
            expect(response.status).toBe(403);
        });

        it('should create tasks for multiple findings', async () => {
            const { requireAuth } = await import('@/lib/auth/get-session');
            const { db } = await import('@/lib/infra/db');

            vi.mocked(requireAuth).mockResolvedValue(mockAuth());
            vi.mocked(db.finding.findMany).mockResolvedValue([
                { id: 'f1' },
                { id: 'f2' },
                { id: 'f3' }
            ] as any);
            vi.mocked(db.task.createMany).mockResolvedValue({ count: 3 });

            const request = new Request('http://localhost/api/findings/bulk', {
                method: 'PATCH',
                body: JSON.stringify({
                    ids: ['f1', 'f2', 'f3'],
                    action: 'createTasks'
                })
            });

            const response = await findingsBulkPatch(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.created).toBe(3);
        });
    });
});