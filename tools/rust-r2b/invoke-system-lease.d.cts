export type SystemLeaseStep =
    | 'admin-reject-minimum' | 'viewer-reject-minimum'
    | 'admin-edit' | 'viewer-edit'
    | 'admin-deactivate' | 'admin-activate' | 'viewer-deactivate' | 'viewer-activate'
    | 'admin-retain-all' | 'viewer-minimum-only' | 'viewer-readd-original';
export interface SystemLease {
    readonly ready: { formatVersion: 1; runId: string; backend: 'nest' | 'rust'; leaseId: string; actorId: string; roles: { key: string; id: string }[] };
    assertAlive(): void;
    before(step: SystemLeaseStep): Promise<{ expectedStatus: 200 | 409; roleId: string; request: { method: 'PATCH' | 'POST' | 'PUT'; path: string; body: object } }>;
    after(step: SystemLeaseStep): Promise<{ auditId: string }>;
    release(): Promise<{ restored: true; completed: number }>;
}
export declare function acquireSystemLease(request: { formatVersion: 1; runId: string; backend: 'nest' | 'rust' }): Promise<SystemLease>;
