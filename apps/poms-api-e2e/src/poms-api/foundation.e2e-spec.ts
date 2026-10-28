import { randomUUID } from 'node:crypto';
import type { AxiosResponse, Method } from 'axios';
import { createApiClient } from '../support/api-client';
import type { CurrentAuthSessionView } from '../support/types';

jest.setTimeout(120_000);
const runId = randomUUID();
// R2D binds anonymous security events to the same guarded fixture journal.
// Earlier foundation suites retain their original request identity.
const fixtureRunId = process.env['POMS_E2E_FIXTURE_RUN_ID'];
if (fixtureRunId && (process.env['POMS_E2E_ENV_PROFILE'] !== 'r2d' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(fixtureRunId))) {
    throw new Error('Foundation fixture identity requires the exact R2D profile and canonical run UUID');
}
let sequence = 0;
let credentials: { username: string; password: string };
let created: FoundationSession[] = [];

class FoundationSession {
    private readonly cookies = new Map<string, string>();

    hasSession(): boolean {
        return this.cookies.has('poms_session');
    }
    cookie(name: string): string | undefined {
        return this.cookies.get(name);
    }
    copyCookies(other: FoundationSession): void {
        for (const [key, value] of other.cookies) this.cookies.set(key, value);
    }
    unknownSession(): void {
        this.cookies.set('poms_session', 'public-unknown-r1d-session');
    }

    async request<T = unknown>(method: Method, url: string, data?: unknown, extra: Record<string, string> = {}): Promise<AxiosResponse<T>> {
        const headers: Record<string, string> = {
            'x-request-id': fixtureRunId ? `r2d:${fixtureRunId}` : `r1d-api:${runId}:${++sequence}`,
            'user-agent': fixtureRunId ? `poms-r2d-fixture/${fixtureRunId}` : 'poms-r1d-foundation'
        };
        if (this.cookies.size) headers['Cookie'] = [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) && this.cookies.has('poms_csrf')) headers['X-CSRF-Token'] = this.cookies.get('poms_csrf') as string;
        Object.assign(headers, extra);
        const response = await createApiClient().request<T>({ method, url, data, headers, ...(typeof data === 'string' ? { transformRequest: [() => data] } : {}) });
        for (const cookie of response.headers['set-cookie'] ?? []) {
            const pair = cookie.split(';', 1)[0];
            const equal = pair.indexOf('=');
            if (equal < 1) continue;
            const name = pair.slice(0, equal),
                value = pair.slice(equal + 1);
            if (value) this.cookies.set(name, value);
            else this.cookies.delete(name);
        }
        return response;
    }
}

function csrfCookies(response: AxiosResponse): string[] {
    return response.headers['set-cookie'] ?? [];
}

async function login(): Promise<{ client: FoundationSession; response: AxiosResponse<CurrentAuthSessionView> }> {
    const client = new FoundationSession();
    created.push(client);
    expect((await client.request('GET', '/auth/csrf-token')).status).toBe(200);
    const response = await client.request<CurrentAuthSessionView>('POST', '/auth/sessions', credentials);
    expect(response.status).toBe(200);
    return { client, response };
}

beforeAll(() => {
    const username = process.env['POMS_E2E_USERNAME'],
        password = process.env['POMS_E2E_PASSWORD'];
    if (!username || !password) throw new Error('Foundation requires explicit synthetic POMS_E2E_USERNAME and POMS_E2E_PASSWORD');
    credentials = { username, password };
});
beforeEach(() => {
    created = [];
});
afterEach(async () => {
    // Revoke only sessions this test created through HTTP. No SQL/seed/reset is
    // available in this suite; external lifecycle is never stopped here.
    for (const client of created) if (client.hasSession()) expect((await client.request('POST', '/auth/session:logout', {})).status).toBe(200);
});

describe('shared Nest/Rust seven-operation foundation', () => {
    it('returns the canonical root response', async () => {
        const response = await new FoundationSession().request('GET', '');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'Hello API' });
    });
    it('reports unauthenticated liveness without a database member', async () => {
        const response = await new FoundationSession().request<Record<string, unknown>>('GET', '/health');
        expect(response.status).toBe(200);
        expect(response.data['service']).toBe('poms-api');
        expect(response.data['status']).toBe('live');
        const checks = response.data['checks'] as Record<string, unknown>;
        expect(Object.hasOwn(checks, 'database')).toBe(false);
        expect(checks['process']).toEqual({ status: 'pass', message: 'API process is running.', durationMs: 0 });
    });
    it('reports real database readiness', async () => {
        const response = await new FoundationSession().request<{ service: string; status: string; checks: { database: { status: string }; process: { status: string } } }>('GET', '/health/readiness');
        expect(response.status).toBe(200);
        expect(response.data.service).toBe('poms-api');
        expect(response.data.status).toBe('ready');
        expect(response.data.checks.database.status).toBe('pass');
        expect(response.data.checks.process.status).toBe('pass');
    });
    it('returns the public anonymous session view without authentication cookies', async () => {
        const response = await new FoundationSession().request('GET', '/auth/session');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ authenticated: false, status: null, user: null, permissions: [], expiresAt: null, csrf: { cookieName: 'poms_csrf', headerName: 'X-CSRF-Token' } });
        expect(csrfCookies(response).length).toBe(0);
    });
    it('bootstraps a matching readable CSRF cookie and token', async () => {
        const client = new FoundationSession();
        const response = await client.request<{ token: string; expiresAt: string }>('GET', '/auth/csrf-token');
        expect(response.status).toBe(200);
        expect(/^[A-Za-z0-9_-]{43}$/.test(response.data.token)).toBe(true);
        expect(response.data.token === client.cookie('poms_csrf')).toBe(true);
        expect(Number.isFinite(Date.parse(response.data.expiresAt))).toBe(true);
        expect(csrfCookies(response).length).toBe(1);
        expect(csrfCookies(response)[0].includes('; HttpOnly')).toBe(false);
        expect(csrfCookies(response)[0].includes('; Path=/api; SameSite=Lax')).toBe(true);
    });
    it('requires CSRF even for public password login', async () => {
        const response = await new FoundationSession().request<{ code: string }>('POST', '/auth/sessions', credentials);
        expect(response.status).toBe(403);
        expect(response.data.code).toBe('csrf_failed');
        expect(csrfCookies(response).length).toBe(0);
    });
    it('rejects wrong credentials after CSRF bootstrap', async () => {
        const client = new FoundationSession();
        await client.request('GET', '/auth/csrf-token');
        const response = await client.request<{ code: string }>('POST', '/auth/sessions', { username: credentials.username, password: `public-wrong-${randomUUID()}` });
        expect(response.status).toBe(401);
        expect(response.data.code).toBe('invalid_credentials');
        expect(client.hasSession()).toBe(false);
    });
    it('logs in through the existing password operation without using R2 profile', async () => {
        const { client, response } = await login();
        expect(response.data.authenticated).toBe(true);
        expect(response.data.status).toBe('active');
        expect(response.data.user?.username).toBe(credentials.username);
        expect(Array.isArray(response.data.permissions)).toBe(true);
        expect(client.hasSession()).toBe(true);
        const cookies = csrfCookies(response);
        expect(cookies.length).toBe(2);
        expect(cookies.some((cookie) => cookie.startsWith('poms_session=') && cookie.includes('; HttpOnly'))).toBe(true);
        expect(cookies.some((cookie) => cookie.startsWith('poms_csrf=') && !cookie.includes('; HttpOnly'))).toBe(true);
    });
    it('restores the current session and rotates its CSRF binding', async () => {
        const { client } = await login();
        const restored = await client.request<CurrentAuthSessionView>('GET', '/auth/session');
        expect(restored.status).toBe(200);
        expect(restored.data.authenticated).toBe(true);
        expect(restored.data.user?.username).toBe(credentials.username);
        const oldCsrf = client.cookie('poms_csrf');
        const stale = new FoundationSession();
        stale.copyCookies(client);
        const refreshed = await client.request<{ token: string }>('GET', '/auth/csrf-token');
        expect(refreshed.status).toBe(200);
        expect(refreshed.data.token === client.cookie('poms_csrf')).toBe(true);
        expect(refreshed.data.token !== oldCsrf).toBe(true);
        const rejected = await stale.request<{ code: string }>('POST', '/auth/session:logout', {});
        expect(rejected.status).toBe(403);
        expect(rejected.data.code).toBe('csrf_failed');
    });
    it('revokes logout, clears cookies and rejects replay of the revoked session', async () => {
        const { client } = await login();
        const replay = new FoundationSession();
        replay.copyCookies(client);
        const response = await client.request('POST', '/auth/session:logout', {});
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ authenticated: false, resultStatus: 'logged-out', revoked: true });
        expect(client.hasSession()).toBe(false);
        expect(csrfCookies(response).length).toBe(2);
        expect(csrfCookies(response).every((cookie) => cookie.includes('Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'))).toBe(true);
        const denied = await replay.request<{ code: string }>('POST', '/auth/session:logout', {});
        expect(denied.status).toBe(401);
        expect(denied.data.code).toBe('session_revoked');
        expect(csrfCookies(denied).length).toBe(0);
    });
    it('checks the protected session before CSRF and logout DTO validation', async () => {
        const response = await new FoundationSession().request<{ code: string }>('POST', '/auth/session:logout', { extra: true });
        expect(response.status).toBe(401);
        expect(response.data.code).toBe('session_missing');
    });
    it('clears controller cookies when a supplied session does not exist', async () => {
        const client = new FoundationSession();
        client.unknownSession();
        const response = await client.request<{ code: string }>('GET', '/auth/session');
        expect(response.status).toBe(401);
        expect(response.data.code).toBe('session_missing');
        expect(csrfCookies(response).length).toBe(2);
        expect(client.hasSession()).toBe(false);
    });
    it('rejects malformed JSON before authentication and CSRF guards', async () => {
        const response = await new FoundationSession().request<{ statusCode: number }>('POST', '/auth/sessions', '{', { 'Content-Type': 'application/json' });
        expect(response.status).toBe(400);
        expect(response.data.statusCode).toBe(400);
    });
});
