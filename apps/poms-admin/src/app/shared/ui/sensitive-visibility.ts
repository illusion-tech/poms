import type { PermissionKey } from '@poms/shared-contracts';

export const BUSINESS_FINANCE_PERMISSION_KEYS = ['contract:finance:manage'] as const satisfies readonly PermissionKey[];

export const FINANCIAL_SENSITIVE_FIELD_HIDDEN_TEXT = '经营敏感字段已隐藏';
