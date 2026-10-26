export type FixtureBackend = 'nest' | 'rust';
export type FixtureAccount = 'admin' | 'viewer' | 'none';
export type FixtureAction = 'prepare' | 'expire-idle' | 'expire-absolute' | 'revoke' | 'disable' | 'restore' | 'permission' | 'cleanup';
export interface FixtureRequest {
    formatVersion: 1;
    runId: string;
    backend: FixtureBackend;
    action: FixtureAction;
    account: FixtureAccount;
    sessionToken?: string;
}
export interface ParsedFixtureRequest extends Omit<FixtureRequest, 'sessionToken'> {
    readonly sessionHash?: string;
}
export class FixtureError extends Error {
    readonly code: string;
    constructor(code: string);
}
export function fixtureCredentials(runId: string, account: 'admin' | 'viewer'): Readonly<{ username: string; password: string }>;
export function fixtureCommand(options?: { platform?: string; cwd?: string }): Readonly<{ executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }>;
export function parseFixtureRequest(bytes: Buffer): Readonly<ParsedFixtureRequest>;
