export type FixtureBackend = 'nest' | 'rust';
export type FixtureAccount = 'admin' | 'viewer' | 'none';
export type FixtureOrgSlot =
    | 'main'
    | 'second'
    | 'child'
    | 'grandchild'
    | 'sibling'
    | 'inactive-parent'
    | 'inactive-child'
    | 'utf16-name'
    | 'utf16-description'
    | 'utf16-code'
    | 'order-overflow'
    | 'max-order'
    | 'negative-order'
    | 'negative-default'
    | 'nullable'
    | 'unicode'
    | 'cascade-root'
    | 'cascade-a'
    | 'cascade-b'
    | 'cascade-c'
    | 'cascade-d'
    | 'cascade-e'
    | 'race-code-a'
    | 'race-code-b'
    | 'race-name-a'
    | 'race-name-b'
    | 'session-cas'
    | 'org-cas'
    | 'ui-root'
    | 'ui-child'
    | 'ui-grandchild'
    | 'ui-target'
    | 'tie-a'
    | 'tie-b'
    | 'tie-c'
    | 'tie-d';
export type FixtureAction =
    | 'prepare'
    | 'session-due'
    | 'session-non-due'
    | 'expire-idle'
    | 'expire-absolute'
    | 'revoke'
    | 'session-bump-version'
    | 'snapshot'
    | 'disable'
    | 'restore'
    | 'permissions-none'
    | 'permissions-and-partial'
    | 'permissions-and-full'
    | 'cleanup'
    | 'org-plan'
    | 'org-adopt'
    | 'org-snapshot'
    | 'org-bump-version'
    | 'org-null-description'
    | 'org-delete-owned-leaf'
    | 'org-set-inactive'
    | 'org-set-active'
    | 'org-max-order'
    | 'org-negative-order'
    | 'org-membership-matrix'
    | 'org-sort-ties';
export interface FixtureRequest {
    formatVersion: 1;
    runId: string;
    backend: FixtureBackend;
    action: FixtureAction;
    account: FixtureAccount;
    sessionToken?: string;
    orgSlot?: FixtureOrgSlot;
    parentSlot?: FixtureOrgSlot;
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
    targetType: 'NavigationTree' | 'PlatformRole' | 'OrgUnit';
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
    org?: { slot: FixtureOrgSlot; initialCode: string; orgId: string | null; parentSlot: FixtureOrgSlot | null; deleted: boolean };
    fixtureFacts?: { memberships?: Record<string, unknown>[]; users?: Record<string, unknown>[]; organizations?: Record<string, unknown>[] };
    orgSnapshot?: { org: Record<string, unknown>; memberships: Record<string, unknown>[]; children: Record<string, unknown>[] };
}
export class FixtureError extends Error {
    readonly code: string;
    constructor(code: string);
}
export function fixtureCredentials(runId: string, account: 'admin' | 'viewer'): Readonly<{ username: string; password: string }>;
export function fixtureRequestIdentity(runId: string): Readonly<{ requestId: string; userAgent: string }>;
export function fixtureCommand(options?: { platform?: string; cwd?: string }): Readonly<{ executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }>;
export function parseFixtureRequest(bytes: Buffer): Readonly<ParsedFixtureRequest>;
