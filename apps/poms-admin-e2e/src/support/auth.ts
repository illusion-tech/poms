import { expect, type Page } from '@playwright/test';

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
        return;
    } catch (error) {
        const hasToken = await page.evaluate(() => Boolean(localStorage.getItem('poms_access_token')));
        if (!hasToken) {
            throw error;
        }

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    }
}

export async function login(page: Page, credentials: UiCredentials): Promise<void> {
    await openLoginPage(page);

    await page.getByLabel('用户名').fill(credentials.username);
    await page.getByLabel('密码').fill(credentials.password);
    await page.getByRole('button', { name: '登录' }).click();
    await ensureLoginCompleted(page);
}
