import { expect, type APIResponse, type Page } from '@playwright/test';

export interface UiCredentials {
    username: string;
    password: string;
}

export const ADMIN_CREDENTIALS: UiCredentials = {
    username: 'admin',
    password: 'admin123'
};

export const VIEWER_CREDENTIALS: UiCredentials = {
    username: 'viewer',
    password: 'viewer123'
};

export const SALES_CREDENTIALS: UiCredentials = {
    username: 'sales_rep',
    password: 'sales_rep123'
};

export interface CsrfTokenView {
    token: string;
    cookieName: string;
    headerName: string;
    expiresAt: string;
}

export interface CurrentAuthSessionView {
    authenticated: boolean;
    user: unknown | null;
}

export interface SanitizedUserWithOrgUnits {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
}

export async function fetchCsrfToken(page: Page): Promise<CsrfTokenView> {
    const response = await page.request.get('/api/auth/csrf-token');
    expect(response.status()).toBe(200);
    await syncResponseCookiesToBrowserContext(page, response);
    const token = (await response.json()) as CsrfTokenView;
    expect(token.token).toBeTruthy();
    expect(token.headerName).toBe('X-CSRF-Token');
    return token;
}

export async function csrfHeaders(page: Page): Promise<Record<string, string>> {
    const csrf = await fetchCsrfToken(page);
    return { [csrf.headerName]: csrf.token };
}

export async function loginForApi(page: Page, credentials: UiCredentials): Promise<void> {
    const csrf = await fetchCsrfToken(page);
    const response = await page.request.post('/api/auth/sessions', {
        data: credentials,
        headers: {
            [csrf.headerName]: csrf.token
        }
    });
    expect(response.status()).toBe(200);
    await syncResponseCookiesToBrowserContext(page, response);
    await fetchCsrfToken(page);
}

export async function getCurrentProfile(page: Page): Promise<SanitizedUserWithOrgUnits> {
    const response = await page.request.get('/api/auth/profile');
    expect(response.status()).toBe(200);
    return (await response.json()) as SanitizedUserWithOrgUnits;
}

async function openLoginPage(page: Page): Promise<void> {
    const loginHeading = page.getByRole('heading', { name: '登录' });

    for (let attempt = 0; attempt < 2; attempt += 1) {
        await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

        try {
            await expect(loginHeading).toBeVisible({ timeout: 10_000 });
            return;
        } catch (error) {
            const bootstrapLoaderVisible = await page.locator('app-root .loader-container').isVisible();
            if (!bootstrapLoaderVisible || attempt === 1) {
                throw error;
            }

            await page.waitForTimeout(1_000);
        }
    }
}

async function ensureLoginCompleted(page: Page): Promise<void> {
    try {
        await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
        await expectAuthenticatedSession(page);
        return;
    } catch (error) {
        const sessionResponse = await page.request.get('/api/auth/session');
        if (sessionResponse.status() !== 200) {
            throw error;
        }

        const session = (await sessionResponse.json()) as CurrentAuthSessionView;
        if (!session.authenticated || !session.user) {
            throw error;
        }
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await expectAuthenticatedSession(page);
    }
}

export async function login(page: Page, credentials: UiCredentials): Promise<void> {
    await openLoginPage(page);

    await page.getByLabel('用户名').fill(credentials.username);
    await page.getByLabel('密码').fill(credentials.password);
    await page.getByRole('button', { name: '登录' }).click();
    await ensureLoginCompleted(page);
}

async function expectAuthenticatedSession(page: Page): Promise<void> {
    await expect
        .poll(
            async () => {
                const response = await page.request.get('/api/auth/session');
                if (response.status() !== 200) {
                    return false;
                }
                const session = (await response.json()) as CurrentAuthSessionView;
                return Boolean(session.authenticated && session.user);
            },
            { timeout: 10_000 }
        )
        .toBe(true);
}

async function syncResponseCookiesToBrowserContext(page: Page, response: APIResponse): Promise<void> {
    const setCookieHeaders = response
        .headersArray()
        .filter((header) => header.name.toLowerCase() === 'set-cookie')
        .map((header) => header.value);
    if (setCookieHeaders.length === 0) {
        return;
    }

    const responseOrigin = new URL(response.url()).origin;
    const cookies = setCookieHeaders.map((header) => toBrowserContextCookie(responseOrigin, header)).filter((cookie) => cookie !== null);
    if (cookies.length > 0) {
        await page.context().addCookies(cookies);
    }
}

function toBrowserContextCookie(
    responseOrigin: string,
    setCookieHeader: string
): {
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
} | null {
    const [nameValue, ...attributes] = setCookieHeader.split(';').map((part) => part.trim());
    const separatorIndex = nameValue.indexOf('=');
    if (separatorIndex <= 0) {
        return null;
    }

    const lowerAttributes = attributes.map((attribute) => attribute.toLowerCase());
    const pathAttribute = attributes.find((attribute) => attribute.toLowerCase().startsWith('path='));
    const sameSiteAttribute = attributes.find((attribute) => attribute.toLowerCase().startsWith('samesite='));

    return {
        name: nameValue.slice(0, separatorIndex),
        value: nameValue.slice(separatorIndex + 1),
        domain: new URL(responseOrigin).hostname,
        path: pathAttribute ? pathAttribute.slice('path='.length) : '/',
        httpOnly: lowerAttributes.includes('httponly'),
        secure: lowerAttributes.includes('secure'),
        sameSite: parseSameSite(sameSiteAttribute)
    };
}

function parseSameSite(attribute: string | undefined): 'Strict' | 'Lax' | 'None' {
    const value = attribute?.split('=')[1]?.toLowerCase();
    if (value === 'strict') return 'Strict';
    if (value === 'none') return 'None';
    return 'Lax';
}
