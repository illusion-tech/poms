import axios, { type AxiosInstance } from 'axios';
import { expectStatus } from './http';
import { E2E_HTTP_AGENT, E2E_HTTPS_AGENT } from './http-transport';
import type { CurrentAuthSessionView, SanitizedUserWithOrgUnits } from './types';

export interface TestCredentials {
    username: string;
    password: string;
}

export interface AuthSession {
    cookieHeader: string;
    client: AxiosInstance;
    profile: SanitizedUserWithOrgUnits;
}

export const ADMIN_CREDENTIALS: TestCredentials = {
    username: 'admin',
    password: 'admin123'
};

export const VIEWER_CREDENTIALS: TestCredentials = {
    username: 'viewer',
    password: 'viewer123'
};

export const APPROVAL_OWNER_CREDENTIALS: TestCredentials = {
    username: 'vp_owner',
    password: 'vp_owner123'
};

export const FINANCE_MANAGER_CREDENTIALS: TestCredentials = {
    username: 'finance_mgr',
    password: 'finance_mgr123'
};

export function createApiClient(cookieHeader?: string): AxiosInstance {
    const csrfToken = cookieHeader ? extractCookieValue(cookieHeader, 'poms_csrf') : null;
    const client = axios.create({
        baseURL: axios.defaults.baseURL,
        validateStatus: () => true,
        proxy: false,
        timeout: 10_000,
        maxRedirects: 0,
        httpAgent: E2E_HTTP_AGENT,
        httpsAgent: E2E_HTTPS_AGENT,
        headers: cookieHeader
            ? {
                  Cookie: cookieHeader,
                  ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
              }
            : undefined
    });
    client.interceptors.response.use(undefined, () => Promise.reject(new Error('E2E API transport failed')));
    return client;
}

export async function createCsrfBootstrapClient(): Promise<AxiosInstance> {
    const anonymousClient = createApiClient();
    const csrfResponse = await anonymousClient.get('/auth/csrf-token');
    expectStatus(csrfResponse, 200);
    return createApiClient(extractCookieHeader(csrfResponse.headers['set-cookie']));
}

export async function loginWithCredentials(credentials: TestCredentials): Promise<AuthSession> {
    const anonymousClient = await createCsrfBootstrapClient();
    const loginResponse = await anonymousClient.post<CurrentAuthSessionView>('/auth/sessions', credentials);
    const session = expectStatus(loginResponse, 200);
    const cookieHeader = extractCookieHeader(loginResponse.headers['set-cookie']);

    const client = createApiClient(cookieHeader);
    const profileResponse = await client.get<SanitizedUserWithOrgUnits>('/auth/profile');
    const profile = expectStatus(profileResponse, 200);

    return {
        cookieHeader,
        client,
        profile: session.user ?? profile
    };
}

function extractCookieHeader(setCookie: unknown): string {
    const cookies = Array.isArray(setCookie) ? setCookie : typeof setCookie === 'string' ? [setCookie] : [];
    const cookieHeader = cookies
        .map((cookie) => cookie.split(';')[0])
        .filter(Boolean)
        .join('; ');
    if (!cookieHeader) {
        throw new Error('Auth session response did not set cookies.');
    }
    return cookieHeader;
}

function extractCookieValue(cookieHeader: string, name: string): string | null {
    const prefix = `${name}=`;
    const pair = cookieHeader
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(prefix));
    return pair ? decodeURIComponent(pair.slice(prefix.length)) : null;
}

export function loginAsAdmin(): Promise<AuthSession> {
    return loginWithCredentials(ADMIN_CREDENTIALS);
}

export function loginAsViewer(): Promise<AuthSession> {
    return loginWithCredentials(VIEWER_CREDENTIALS);
}

export function loginAsApprovalOwner(): Promise<AuthSession> {
    return loginWithCredentials(APPROVAL_OWNER_CREDENTIALS);
}

export function loginAsFinanceManager(): Promise<AuthSession> {
    return loginWithCredentials(FINANCE_MANAGER_CREDENTIALS);
}
