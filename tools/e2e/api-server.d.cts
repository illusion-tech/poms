import type { ApiTarget, OwnedHandle } from './runtime.cjs';
export interface ApiOptions {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    logPath?: string;
    runId?: string;
    timeoutMs?: number;
}
export interface ApiPlan {
    readonly target: ApiTarget;
    readonly suite: 'foundation' | 'nest-full';
    readonly managedEnvironment?: { childEnv: Record<string, string>; host: string; port: number; envFile: string; database: string };
}
export interface ApiServer {
    readonly target: ApiTarget;
    readonly handle: OwnedHandle | null;
    stop(): Promise<void>;
}
export function resolveApiPlan(options?: ApiOptions): ApiPlan;
export function startApiServer(options?: ApiOptions): Promise<ApiServer>;
export function startManagedBackend(options?: ApiOptions): Promise<ApiServer>;
