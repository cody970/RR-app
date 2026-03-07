/**
 * Role-Based Access Control (RBAC) Utility
 */

export type Role = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export const PERMISSIONS = {
    AUDIT_RUN: ["OWNER", "ADMIN", "EDITOR"],
    CATALOG_EDIT: ["OWNER", "ADMIN", "EDITOR"],
    TASK_MANAGE: ["OWNER", "ADMIN", "EDITOR"],
    TEAM_MANAGE: ["OWNER", "ADMIN"],
    EXPORT_DATA: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
    VIEW_ANALYTICS: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
    ORG_MANAGE: ["OWNER"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Checks if a role has a specific permission.
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
    if (!role) return false;
    const allowedRoles = PERMISSIONS[permission] as readonly string[];
    return allowedRoles.includes(role);
}

/**
 * Throws an error if the role does not have permission.
 * Used in API routes.
 */
export function validatePermission(role: string | undefined, permission: Permission) {
    if (!hasPermission(role, permission)) {
        throw new Error(`Forbidden: Role ${role} does not have ${permission} permission`);
    }
}
