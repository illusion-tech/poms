export type FixtureBackend = 'nest' | 'rust';
export type FixtureAccount = 'admin' | 'viewer' | 'none';
export type FixtureRoleSlot = 'main' | 'second' | 'utf16-name' | 'utf16-description' | 'utf16-key' | 'order-overflow' | 'duplicate' | 'race' | 'unicode' | 'unknown-system' | 'ui' | 'session-cas' | 'role-cas' | 'permission-race';
export type FixtureAction = 'prepare' | 'session-due' | 'session-non-due' | 'expire-idle' | 'expire-absolute' | 'revoke' | 'snapshot' | 'disable' | 'restore' | 'permissions-none' | 'permissions-and-partial' | 'permissions-and-full' | 'cleanup' | 'role-plan' | 'role-adopt' | 'role-snapshot' | 'role-bind-viewer' | 'role-insert-historical' | 'role-set-system';
export interface FixtureRequest {
    formatVersion: 1;
    runId: string;
    backend: FixtureBackend;
    action: FixtureAction;
    account: FixtureAccount;
    sessionToken?: string;
    roleSlot?: FixtureRoleSlot;
}
export interface ParsedFixtureRequest extends Omit<FixtureRequest, 'sessionToken'> {
    readonly sessionHash?: string;
}
export interface NavigationSummarySnapshot {
    targetId: 'platform-navigation';
    nodeCount: number;
    routeCount: number;
    hiddenCount: number;
    disabledCount: number;
    treeChecksum: string;
    navigationKeys: string[];
    routeLinks: string[];
}
export interface FixtureSessionSnapshot {
    id: string;
    rowVersion: number;
    status: 'active' | 'expired' | 'revoked';
    lastSeenAt: string;
    idleExpiresAt: string;
    absoluteExpiresAt: string;
    updatedAt: string;
    revokedAt: string | null;
    revokedReason: string | null;
}
export interface FixtureAuditSnapshot {
    id: string;
    eventType: string;
    targetType: 'NavigationTree' | 'PlatformRole';
    targetId: string;
    operatorId: string;
    requestId: string | null;
    result: 'success' | 'rejected';
    reason: string | null;
    beforeSnapshot: Record<string, unknown> | null;
    afterSnapshot: NavigationSummarySnapshot | Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    occurredAt: string;
}
export interface FixtureSecuritySnapshot {
    id: string;
    eventType: string;
    actorId: string | null;
    principal: string | null;
    requestId: string | null;
    path: string;
    method: string | null;
    permissionKey: string | null;
    result: 'blocked' | 'failed' | 'expired';
    details: Record<string, unknown> | null;
    occurredAt: string;
}
export interface FixtureResponse {
    formatVersion: 1;
    runId: string;
    backend: FixtureBackend;
    action: FixtureAction;
    matched: number;
    changed: number;
    state: string;
    /** Present only for snapshot; audit/event lists cover both run-owned accounts. */
    snapshot?: { session: FixtureSessionSnapshot; audits: FixtureAuditSnapshot[]; securityEvents: FixtureSecuritySnapshot[] };
    role?: {slot: FixtureRoleSlot; roleKey: string; roleId: string | null};
    roleSnapshot?: {role: Record<string, unknown>; permissions: Record<string, unknown>[]; users: Record<string, unknown>[]};
}
export class FixtureError extends Error {
    readonly code: string;
    constructor(code: string);
}
export function fixtureCredentials(runId: string, account: 'admin' | 'viewer'): Readonly<{ username: string; password: string }>;
export function fixtureRequestIdentity(runId: string): Readonly<{ requestId: string; userAgent: string }>;
export function fixtureCommand(options?: { platform?: string; cwd?: string }): Readonly<{ executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }>;
export function parseFixtureRequest(bytes: Buffer): Readonly<ParsedFixtureRequest>;
