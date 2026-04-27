import type { PermissionKey } from '@poms/shared-contracts';

export const BUSINESS_FINANCE_PERMISSION_KEYS = ['contract:finance:manage'] as const satisfies readonly PermissionKey[];

export const FINANCIAL_SENSITIVE_FIELD_HIDDEN_TEXT = '经营敏感字段已隐藏';

export const SENSITIVE_PROJECTION_MODE = {
    full: 'full',
    summary: 'summary',
    masked: 'masked',
    denied: 'denied'
} as const;

export type SensitiveProjectionModeValue = (typeof SENSITIVE_PROJECTION_MODE)[keyof typeof SENSITIVE_PROJECTION_MODE];

export interface SensitiveStringFieldProjectionView {
    mode: SensitiveProjectionModeValue | string;
    value: string | null;
    displayText: string;
}

export function isSensitiveProjectionFull(projection: SensitiveStringFieldProjectionView | null | undefined): boolean {
    return projection?.mode === SENSITIVE_PROJECTION_MODE.full && typeof projection.value === 'string' && projection.value.trim().length > 0;
}

export function sensitiveProjectionDisplayText(projection: SensitiveStringFieldProjectionView | null | undefined, fallback = FINANCIAL_SENSITIVE_FIELD_HIDDEN_TEXT): string {
    const text = projection?.displayText?.trim();
    return text && text.length > 0 ? text : fallback;
}

export function formatSensitiveAmountProjection(projection: SensitiveStringFieldProjectionView | null | undefined, currencyCode?: string | null): string {
    if (!isSensitiveProjectionFull(projection)) {
        return sensitiveProjectionDisplayText(projection);
    }

    const value = projection?.value ?? '';
    const parsed = Number(value);
    const amount = Number.isFinite(parsed)
        ? parsed.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4
          })
        : value;

    return `${amount} ${currencyCode ?? ''}`.trim();
}
