import axios, { type AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type { LoginResponse, SanitizedUserWithOrgUnits } from './types';

export interface TestCredentials {
    username: string;
    password: string;
}

export interface AuthSession {
    accessToken: string;
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

export function createApiClient(accessToken?: string): AxiosInstance {
    return axios.create({
        baseURL: axios.defaults.baseURL,
        validateStatus: () => true,
        proxy: false,
        headers: accessToken
            ? {
                  Authorization: `Bearer ${accessToken}`
              }
            : undefined
    });
}

export async function loginWithCredentials(credentials: TestCredentials): Promise<AuthSession> {
    const anonymousClient = createApiClient();
    const loginResponse = await anonymousClient.post<LoginResponse>('/auth/login', credentials);
    const login = expectStatus(loginResponse, 200);

    const client = createApiClient(login.accessToken);
    const profileResponse = await client.get<SanitizedUserWithOrgUnits>('/auth/profile');
    const profile = expectStatus(profileResponse, 200);

    return {
        accessToken: login.accessToken,
        client,
        profile
    };
}

export function loginAsAdmin(): Promise<AuthSession> {
    return loginWithCredentials(ADMIN_CREDENTIALS);
}

export function loginAsViewer(): Promise<AuthSession> {
    return loginWithCredentials(VIEWER_CREDENTIALS);
}
