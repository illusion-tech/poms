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

/** Decimal rounding for display only; no money or rate passes through Number. */
function exactDecimalDisplay(value: string, shift: 0 | 2, minimumFractionDigits: 2, maximumFractionDigits: 2 | 4): string | null {
    const match = /^([+-]?)([0-9]+)(?:\.([0-9]+))?$/.exec(value.trim());
    if (!match) return null;
    const whole = match[2];
    const digits = whole + (match[3] ?? '');
    const point = whole.length + shift;
    const shifted = digits.padEnd(point, '0');
    const integer = shifted.slice(0, point);
    const fraction = shifted.slice(point);
    const kept = fraction.slice(0, maximumFractionDigits).padEnd(maximumFractionDigits, '0');
    let minor = BigInt(integer + kept);
    // Intl.NumberFormat's existing halfExpand display rule, implemented exactly.
    if ((fraction[maximumFractionDigits] ?? '0') >= '5') minor += 1n;
    const rounded = minor.toString().padStart(maximumFractionDigits + 1, '0');
    const roundedInteger = rounded.slice(0, -maximumFractionDigits);
    let roundedFraction = rounded.slice(-maximumFractionDigits);
    while (roundedFraction.length > minimumFractionDigits && roundedFraction.endsWith('0')) roundedFraction = roundedFraction.slice(0, -1);
    const grouped = roundedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${match[1] === '-' ? '-' : ''}${grouped}.${roundedFraction}`;
}

export function formatSensitiveAmountProjection(projection: SensitiveStringFieldProjectionView | null | undefined, currencyCode?: string | null): string {
    if (!isSensitiveProjectionFull(projection)) {
        return sensitiveProjectionDisplayText(projection);
    }
    const value = projection?.value ?? '';
    const amount = exactDecimalDisplay(value, 0, 2, 4) ?? value;
    return `${amount} ${currencyCode ?? ''}`.trim();
}

export function formatSensitiveRatioProjection(projection: SensitiveStringFieldProjectionView | null | undefined): string {
    if (!isSensitiveProjectionFull(projection)) {
        return sensitiveProjectionDisplayText(projection);
    }
    const value = projection?.value ?? '';
    const percent = exactDecimalDisplay(value, 2, 2, 2);
    return percent === null ? value : `${percent}%`;
}
