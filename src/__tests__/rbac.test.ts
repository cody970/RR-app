import { describe, it, expect } from "vitest";
import { hasPermission, validatePermission } from "../lib/auth/rbac";

describe("RBAC Logic", () => {
    describe("hasPermission", () => {
        it("should grant OWNER all permissions", () => {
            expect(hasPermission("OWNER", "ORG_MANAGE")).toBe(true);
            expect(hasPermission("OWNER", "AUDIT_RUN")).toBe(true);
            expect(hasPermission("OWNER", "TEAM_MANAGE")).toBe(true);
        });

        it("should grant ADMIN team and audit permissions", () => {
            expect(hasPermission("ADMIN", "TEAM_MANAGE")).toBe(true);
            expect(hasPermission("ADMIN", "AUDIT_RUN")).toBe(true);
            expect(hasPermission("ADMIN", "ORG_MANAGE")).toBe(false);
        });

        it("should grant VIEWER only read permissions", () => {
            expect(hasPermission("VIEWER", "VIEW_ANALYTICS")).toBe(true);
            expect(hasPermission("VIEWER", "CATALOG_EDIT")).toBe(false);
            expect(hasPermission("VIEWER", "AUDIT_RUN")).toBe(false);
        });

        it("should return false for unknown roles", () => {
            expect(hasPermission("GUEST" as any, "VIEW_ANALYTICS")).toBe(false);
        });
    });

    describe("validatePermission", () => {
        it("should not throw if user has permission", () => {
            expect(() => validatePermission("OWNER", "ORG_MANAGE")).not.toThrow();
        });

        it("should throw if user lacks permission", () => {
            expect(() => validatePermission("VIEWER", "ORG_MANAGE")).toThrow(/Forbidden/);
        });
    });
});
