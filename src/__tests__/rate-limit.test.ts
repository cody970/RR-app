import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "../lib/infra/rate-limit";
import { redis } from "../lib/infra/redis";

// Mock the redis client
vi.mock("../lib/infra/redis", () => ({
    redis: {
        incr: vi.fn(),
        pexpire: vi.fn(),
    },
}));

describe("Rate Limiting Utility", () => {
    const options = {
        key: "test-key",
        limit: 2,
        windowMs: 60000,
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should allow request if count is below limit", async () => {
        vi.mocked(redis.incr).mockResolvedValue(1);

        const result = await checkRateLimit(options);
        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
        expect(redis.pexpire).toHaveBeenCalledWith("test-key", 60000);
    });

    it("should block request if count exceeds limit", async () => {
        vi.mocked(redis.incr).mockResolvedValue(3);

        const result = await checkRateLimit(options);
        expect(result.success).toBe(false);
        expect(result.count).toBe(3);
        expect(redis.pexpire).not.toHaveBeenCalled();
    });
});

