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

export async function login(page: Page, credentials: UiCredentials): Promise<void> {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible();

    await page.getByLabel('用户名').fill(credentials.username);
    await page.getByLabel('密码').fill(credentials.password);
    await page.getByRole('button', { name: '登录' }).click();
}
