export type FixtureBackend = 'nest' | 'rust';
export type FixtureAccount = 'admin' | 'viewer' | 'none';
export type FixtureUserSlot = `u${string}` | 'admin' | 'viewer';
export type FixtureReferenceSlot = 'admin' | 'viewer' | 'alpha' | 'inactive';
export type FixtureAction =
    | 'prepare'
    | 'cleanup'
    | 'facts'
    | 'snapshot'
    | 'session-due'
    | 'session-non-due'
    | 'session-bump-version'
    | 'expire-idle'
    | 'expire-absolute'
    | 'revoke'
    | 'user-plan'
    | 'user-adopt'
    | 'user-snapshot'
    | 'user-set-active'
    | 'user-set-inactive'
    | 'user-bump-version'
    | 'user-profile-null'
    | 'user-profile-values'
    | 'user-profile-verified'
    | 'user-profile-unverified'
    | 'user-nullable-null-no-version'
    | 'user-nullable-values-no-version'
    | 'user-membership-matrix'
    | 'user-role-matrix'
    | 'user-null-last-login'
    | 'user-created-at'
    | 'user-membership-without-active-primary'
    | 'role-set-active'
    | 'role-set-inactive'
    | 'role-delete-owned'
    | 'role-duplicate-names'
    | 'org-set-values'
    | 'org-delete-owned'
    | 'disable'
    | 'restore'
    | 'permissions-none'
    | 'permissions-default'
    | 'permissions-lead-write'
    | 'permissions-lead-assign'
    | 'permissions-project-write'
    | 'permissions-users-manage'
    | 'permissions-orgs-manage';
export interface FixtureRequest {
    formatVersion: 1;
    runId: string;
    backend: FixtureBackend;
    action: FixtureAction;
    account: FixtureAccount;
    sessionToken?: string;
    userSlot?: FixtureUserSlot;
    roleSlot?: FixtureReferenceSlot;
    orgSlot?: FixtureReferenceSlot;
    timeCase?: 'micro-low' | 'micro-high' | 'tie-first' | 'tie-second';
}
export interface FixtureUser {
    slot: FixtureUserSlot;
    username: string;
    userId: string | null;
}
export interface FixtureJournal {
    formatVersion: 1;
    runId: string;
    backend: FixtureBackend;
    state: 'planned' | 'prepared' | 'cleaned';
    accounts: { account: 'admin' | 'viewer'; userId: string; username: string; roleId: string; orgId: string }[];
    users: FixtureUser[];
    roles: { slot: FixtureReferenceSlot; id: string; key: string }[];
    orgs: { slot: FixtureReferenceSlot; id: string; key: string }[];
}
export interface FixtureAuditSnapshot {
    id: string;
    eventType: string;
    targetType: string;
    targetId: string;
    operatorId: string;
    requestId: string | null;
    result: string;
    reason: string | null;
    beforeSnapshot: Record<string, unknown> | null;
    afterSnapshot: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
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
    fixture?: FixtureJournal;
    user?: FixtureUser;
    facts?: Record<string, Record<string, unknown>[]>;
    cleanup?: Record<string, unknown>;
    snapshot?: {
        session: { id: string; rowVersion: number; status: string; lastSeenAt: string; idleExpiresAt: string; absoluteExpiresAt: string; updatedAt: string; revokedAt: string | null; revokedReason: string | null };
        audits: FixtureAuditSnapshot[];
        securityEvents: Record<string, unknown>[];
    };
}
export class FixtureError extends Error {
    readonly code: string;
    constructor(code: string);
}
export function fixtureCredentials(runId: string, account: 'admin' | 'viewer'): Readonly<{ username: string; password: string }>;
export function fixtureRequestIdentity(runId: string): Readonly<{ requestId: string; userAgent: string }>;
export function userFixtureSpec(runId: string, slot: FixtureUserSlot): Readonly<{ slot: FixtureUserSlot; username: string; displayName: string }>;
export function fixtureCommand(options?: { platform?: string; cwd?: string }): Readonly<{ executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }>;
export function parseFixtureRequest(bytes: Buffer): Readonly<Omit<FixtureRequest, 'sessionToken'> & { sessionHash?: string }>;
