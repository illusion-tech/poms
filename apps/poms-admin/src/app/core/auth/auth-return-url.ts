export function sanitizeAuthReturnUrl(value: unknown): string {
    if (typeof value !== 'string') return '/';
    const trimmed = value.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
    return trimmed;
}
