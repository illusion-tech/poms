export interface BrowserPlan {
    readonly cwd: string;
    readonly apiMode: 'managed-nest' | 'managed-rust' | 'external';
    readonly apiOrigin: string;
    readonly apiReadinessUrl: string;
    readonly apiManaged: boolean;
    readonly adminOrigin: string;
    readonly adminManaged: boolean;
    readonly adminHost: string;
    readonly adminPort: number;
    readonly suite: 'auth' | 'legacy' | 'stage' | 'navigation' | 'roles' | 'organizations' | 'users';
    readonly apiSuite: 'foundation' | 'nest-full';
    readonly stageBackend: 'nest' | 'rust' | null;
    readonly timeoutMs: number;
    readonly database: string;
    readonly testMatch: readonly string[];
}
export interface BrowserOptions {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    platform?: string;
}
export function mergeNoProxy(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export function resolveBrowserPlan(options?: BrowserOptions): BrowserPlan;
export function startBrowserServers(options?: BrowserOptions): Promise<{ readonly plan: BrowserPlan; stop(): Promise<void> }>;
export function validateAdminReady(response: { status: number; bodyText: string }): boolean;
