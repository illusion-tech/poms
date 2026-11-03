type HeaderValue = string | string[] | undefined;

export type RuntimeAuditRequestLike = {
    headers?: Record<string, HeaderValue>;
    method?: string;
    originalUrl?: string;
    url?: string;
    path?: string;
    ip?: string;
};

function getHeader(request: RuntimeAuditRequestLike | undefined, headerName: string): string | null {
    const rawValue = request?.headers?.[headerName] ?? request?.headers?.[headerName.toLowerCase()];
    if (Array.isArray(rawValue)) {
        return rawValue[0] ?? null;
    }
    return rawValue ?? null;
}

export function getRequestId(request: RuntimeAuditRequestLike | undefined): string | null {
    return getHeader(request, 'x-request-id') ?? getHeader(request, 'x-correlation-id');
}

export function getRequestMethod(request: RuntimeAuditRequestLike | undefined): string | null {
    return request?.method?.toUpperCase() ?? null;
}

export function getRequestPath(request: RuntimeAuditRequestLike | undefined): string {
    return request?.originalUrl ?? request?.url ?? request?.path ?? 'unknown';
}

export function getRequestIp(request: RuntimeAuditRequestLike | undefined): string | null {
    const forwardedFor = getHeader(request, 'x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() ?? null;
    }
    return request?.ip ?? null;
}

export function getRequestUserAgent(request: RuntimeAuditRequestLike | undefined): string | null {
    return getHeader(request, 'user-agent');
}
