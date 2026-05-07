export const EXTERNAL_LOGIN_RETURN_URL_STORAGE_KEY = 'poms_external_login_return_url';

export function sanitizeAuthReturnUrl(value: unknown): string {
    if (typeof value !== 'string') return '/';
    const trimmed = value.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
    return trimmed;
}

export function storeExternalLoginReturnUrl(returnUrl: string): void {
    sessionStorage.setItem(EXTERNAL_LOGIN_RETURN_URL_STORAGE_KEY, sanitizeAuthReturnUrl(returnUrl));
}

export function consumeExternalLoginReturnUrl(): string {
    const returnUrl = sanitizeAuthReturnUrl(sessionStorage.getItem(EXTERNAL_LOGIN_RETURN_URL_STORAGE_KEY));
    sessionStorage.removeItem(EXTERNAL_LOGIN_RETURN_URL_STORAGE_KEY);
    return returnUrl;
}
