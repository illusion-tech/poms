export type ApiMode = 'managed-nest' | 'managed-rust' | 'external';
export interface ApiTarget {
    readonly mode: ApiMode;
    readonly managed: boolean;
    readonly host: string;
    readonly port: number;
    readonly origin: string;
    readonly apiBaseUrl: string;
    readonly readinessUrl: string;
}
export interface ReadyResponse {
    status: number;
    headers: Record<string, string | string[] | undefined>;
    bodyText: string;
}
export interface OwnedHandle {
    readonly runId: string;
    readonly pid: number;
    readonly serverPid: number | null;
    readonly startIdentity: string;
    readonly url: string;
    readonly logPath: string;
    readonly kind: string;
}
export interface OwnedOptions {
    kind: 'nest' | 'rust' | 'admin' | 'fixture';
    executable: string;
    args?: string[];
    cwd: string;
    env: Record<string, string>;
    host: string;
    port: number;
    readyUrl: string;
    timeoutMs?: number;
    requestTimeoutMs?: number;
    validateReady?: (response: ReadyResponse) => boolean;
    logPath?: string;
    runId?: string;
}
export function resolveTarget(options: { mode?: ApiMode; baseUrl?: string; host?: string; port?: number | string }): ApiTarget;
export function validateApiReady(response: ReadyResponse): boolean;
export function assertPortAvailable(options: { host: string; port: number }): Promise<void>;
export function waitForReadiness(options: { url: string; timeoutMs?: number; requestTimeoutMs?: number; validateReady?: (response: ReadyResponse) => boolean; isAlive?: () => boolean }): Promise<ReadyResponse>;
export function startOwned(options: OwnedOptions): Promise<OwnedHandle>;
export function stopOwned(handle: OwnedHandle, options?: { graceMs?: number; killMs?: number }): Promise<void>;
export function runOwnedCommand(options: { executable: string; args?: string[]; cwd: string; env: Record<string, string>; logPath?: string; runId?: string; timeoutMs?: number }): Promise<{ code: 0; logPath: string }>;
