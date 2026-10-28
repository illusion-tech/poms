import type { FixtureJournal } from './fixture-protocol.cjs';

export type BatchFixtureBackend = 'nest' | 'rust';
export type BatchFixtureAccount = 'none' | 'admin' | 'viewer';
export type BatchFixtureAction = 'prepare' | 'cleanup' | 'facts' | 'permissions';

export interface BatchFixtureRequest {
    formatVersion: 1;
    backend: BatchFixtureBackend;
    runId: string;
    action: BatchFixtureAction;
    account: BatchFixtureAccount;
    permissions?: string[];
}

export interface BatchFixtureExtension {
    dictionaryUpdateId: string;
    dictionaryNoopId: string;
    dictionaryInactiveId: string;
    createdCode: string;
    usageCases: unknown[];
    auditEventType: string;
    securityEventType: string;
    targetIds: Record<string, string> | string[];
    /** Original PG column names; only facts includes these run-owned rows. */
    audits?: Record<string, unknown>[];
    securityEvents?: Record<string, unknown>[];
    [key: string]: unknown;
}

export interface BatchFixtureResponse {
    formatVersion: 1;
    backend: BatchFixtureBackend;
    runId: string;
    action: BatchFixtureAction;
    state: string;
    matched: number;
    changed: number;
    fixture: FixtureJournal;
    extension: BatchFixtureExtension;
    cleanup?: Record<string, unknown>;
}

export function invokeBatchFixture(request: BatchFixtureRequest): Promise<BatchFixtureResponse>;
