import type { PermissionKey, SensitiveFieldPackageKey, SensitiveProjectionMode, SensitiveStringFieldProjection, UserPayload } from '@poms/shared-contracts';
import { Inject, Injectable } from '@nestjs/common';
import { RuntimeAuditService } from '../runtime-audit/runtime-audit.service';
import { canReadFullSensitiveFieldPackage, requiredPermissionForSensitiveFieldPackage } from './sensitive-field-projection.policy';

export const DEFAULT_SENSITIVE_FIELD_MASKED_TEXT = '敏感字段已隐藏';
export const DEFAULT_SENSITIVE_FIELD_DENIED_TEXT = '敏感字段不可见';

export type SensitiveFieldProjectionRequestContext = {
    requestId?: string | null;
    path: string;
    method?: string | null;
    ip?: string | null;
    userAgent?: string | null;
};

export type ProjectSensitiveStringFieldInput = {
    fieldPackageKey: SensitiveFieldPackageKey;
    rawValue: string | null;
    displayTextWhenFull?: string | null;
    user: Pick<UserPayload, 'sub' | 'username' | 'permissions'> | null;
    targetType: string;
    targetId: string;
    requestContext: SensitiveFieldProjectionRequestContext;
    modeWhenUnauthorized?: Extract<SensitiveProjectionMode, 'masked' | 'denied'>;
    maskedDisplayText?: string;
    deniedDisplayText?: string;
};

export type ProjectSensitiveStringFieldBatchItem<TKey extends string = string> = {
    key: TKey;
    rawValue: string | null;
    displayTextWhenFull?: string | null;
    maskedDisplayText?: string;
    deniedDisplayText?: string;
};

export type ProjectSensitiveStringFieldsInput<TKey extends string = string> = {
    fieldPackageKey: SensitiveFieldPackageKey;
    fields: readonly ProjectSensitiveStringFieldBatchItem<TKey>[];
    user: Pick<UserPayload, 'sub' | 'username' | 'permissions'> | null;
    targetType: string;
    targetId: string;
    requestContext: SensitiveFieldProjectionRequestContext;
    modeWhenUnauthorized?: Extract<SensitiveProjectionMode, 'masked' | 'denied'>;
    maskedDisplayText?: string;
    deniedDisplayText?: string;
};

@Injectable()
export class SensitiveFieldProjectionService {
    constructor(@Inject(RuntimeAuditService) private readonly runtimeAuditService: RuntimeAuditService) {}

    async projectStringField(input: ProjectSensitiveStringFieldInput): Promise<SensitiveStringFieldProjection> {
        const projections = await this.projectStringFields({
            fieldPackageKey: input.fieldPackageKey,
            fields: [
                {
                    key: 'field',
                    rawValue: input.rawValue,
                    displayTextWhenFull: input.displayTextWhenFull,
                    maskedDisplayText: input.maskedDisplayText,
                    deniedDisplayText: input.deniedDisplayText
                }
            ],
            user: input.user,
            targetType: input.targetType,
            targetId: input.targetId,
            requestContext: input.requestContext,
            modeWhenUnauthorized: input.modeWhenUnauthorized,
            maskedDisplayText: input.maskedDisplayText,
            deniedDisplayText: input.deniedDisplayText
        });

        return projections.field;
    }

    async projectStringFields<TKey extends string>(input: ProjectSensitiveStringFieldsInput<TKey>): Promise<Record<TKey, SensitiveStringFieldProjection>> {
        const userPermissions = (input.user?.permissions ?? []) as PermissionKey[];
        const projections = {} as Record<TKey, SensitiveStringFieldProjection>;

        if (canReadFullSensitiveFieldPackage(userPermissions, input.fieldPackageKey)) {
            for (const field of input.fields) {
                const value = field.rawValue;
                projections[field.key] = {
                    fieldPackageKey: input.fieldPackageKey,
                    mode: 'full',
                    value,
                    displayText: field.displayTextWhenFull ?? value ?? '-',
                    reasonCode: value === null ? 'field-package-not-applicable' : 'allowed'
                };
            }
            return projections;
        }

        const mode = input.modeWhenUnauthorized ?? 'masked';
        const hiddenFieldKeys: TKey[] = [];

        for (const field of input.fields) {
            if (field.rawValue === null) {
                projections[field.key] = {
                    fieldPackageKey: input.fieldPackageKey,
                    mode: 'full',
                    value: null,
                    displayText: field.displayTextWhenFull ?? '-',
                    reasonCode: 'field-package-not-applicable'
                };
                continue;
            }

            projections[field.key] = {
                fieldPackageKey: input.fieldPackageKey,
                mode,
                value: null,
                displayText: mode === 'denied' ? (field.deniedDisplayText ?? input.deniedDisplayText ?? DEFAULT_SENSITIVE_FIELD_DENIED_TEXT) : (field.maskedDisplayText ?? input.maskedDisplayText ?? DEFAULT_SENSITIVE_FIELD_MASKED_TEXT),
                reasonCode: 'missing-sensitive-read-permission'
            };
            hiddenFieldKeys.push(field.key);
        }

        if (hiddenFieldKeys.length > 0) {
            await this.#recordSensitiveProjectionEvent(input, mode, hiddenFieldKeys);
        }

        return projections;
    }

    async #recordSensitiveProjectionEvent<TKey extends string>(input: ProjectSensitiveStringFieldsInput<TKey>, mode: Extract<SensitiveProjectionMode, 'masked' | 'denied'>, hiddenFieldKeys: readonly TKey[]): Promise<void> {
        const requiredPermission = requiredPermissionForSensitiveFieldPackage(input.fieldPackageKey);
        await this.runtimeAuditService.recordSecurityEvent({
            eventType: mode === 'denied' ? 'sensitive_field.denied' : 'sensitive_field.masked',
            severity: mode === 'denied' ? 'warning' : 'info',
            actorId: input.user?.sub ?? null,
            principal: input.user?.username ?? null,
            requestId: input.requestContext.requestId ?? null,
            path: input.requestContext.path,
            method: input.requestContext.method ?? 'QUERY',
            permissionKey: requiredPermission,
            result: 'blocked',
            ip: input.requestContext.ip ?? null,
            userAgent: input.requestContext.userAgent ?? null,
            details: {
                fieldPackageKey: input.fieldPackageKey,
                projectionMode: mode,
                targetType: input.targetType,
                targetId: input.targetId,
                targetCount: 1,
                sampleTargetIds: [input.targetId],
                fieldKeys: hiddenFieldKeys,
                hiddenFieldCount: hiddenFieldKeys.length,
                reasonCode: 'missing-sensitive-read-permission',
                requiredPermission,
                auditAggregationMode: 'sensitive-field-batch'
            }
        });
    }
}
