import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "../lib/infra/rate-limit";
import { redis } from "../lib/infra/redis";

// Mock retry to execute immediately without retries
vi.mock("../lib/infra/retry", () => ({
    withRetry: vi.fn(async (fn: () => Promise<any>) => fn()),
    DistributedLock: vi.fn(),
}));

// Mock logger
vi.mock("../lib/infra/logger-async", () => ({
    asyncLogger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

// Mock the redis client
vi.mock("../lib/infra/redis", () => {
    const mockExec = vi.fn();
    return {
        redis: {
            multi: vi.fn(() => ({
                incr: vi.fn().mockReturnThis(),
                pexpire: vi.fn().mockReturnThis(),
                exec: mockExec,
            })),
            pttl: vi.fn().mockResolvedValue(30000),
        },
        __mockExec: mockExec,
    };
});

describe("Rate Limiting Utility", () => {
    const options = {
        key: "test-key",
        limit: 2,
        windowMs: 60000,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should allow request if count is below limit", async () => {
        const pipeline = (redis.multi as any)();
        pipeline.exec.mockResolvedValue([[null, 1], [null, 1]]);

        const result = await checkRateLimit(options);
        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
        expect(redis.multi).toHaveBeenCalled();
    });

    it("should allow request at the exact limit", async () => {
        const pipeline = (redis.multi as any)();
        pipeline.exec.mockResolvedValue([[null, 2], [null, 1]]);

        const result = await checkRateLimit(options);
        expect(result.success).toBe(true);
        expect(result.count).toBe(2);
    });

    it("should block request if count exceeds limit", async () => {
        const pipeline = (redis.multi as any)();
        pipeline.exec.mockResolvedValue([[null, 3], [null, 1]]);

        const result = await checkRateLimit(options);
        expect(result.success).toBe(false);
        expect(result.count).toBe(3);
    });

    it("should handle null pipeline results gracefully", async () => {
        const pipeline = (redis.multi as any)();
        pipeline.exec.mockResolvedValue(null);

        // withRetry mock executes immediately, the function throws,
        // and the outer catch block fails open
        const result = await checkRateLimit(options);
        expect(result.success).toBe(true);
        expect(result.count).toBe(0);
    });
});