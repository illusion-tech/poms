import {
    getRequestId,
    getRequestIp,
    getRequestMethod,
    getRequestPath,
    getRequestUserAgent,
    type RuntimeAuditRequestLike
} from '../runtime-audit/runtime-audit-request.utils';
import type { SensitiveFieldProjectionRequestContext } from './sensitive-field-projection.service';

export function buildSensitiveFieldProjectionRequestContext(
    request: RuntimeAuditRequestLike | undefined,
    fallbackPath = 'unknown'
): SensitiveFieldProjectionRequestContext {
    const path = getRequestPath(request);
    return {
        requestId: getRequestId(request),
        path: path === 'unknown' ? fallbackPath : path,
        method: getRequestMethod(request),
        ip: getRequestIp(request),
        userAgent: getRequestUserAgent(request)
    };
}
