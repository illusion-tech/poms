import type { PermissionKey, SensitiveFieldPackageKey, SensitiveProjectionMode, SensitiveStringFieldProjection, UserPayload } from '@poms/shared-contracts';
import { Injectable } from '@nestjs/common';
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

@Injectable()
export class SensitiveFieldProjectionService {
    constructor(private readonly runtimeAuditService: RuntimeAuditService) {}

    async projectStringField(input: ProjectSensitiveStringFieldInput): Promise<SensitiveStringFieldProjection> {
        if (input.rawValue === null) {
            return {
                fieldPackageKey: input.fieldPackageKey,
                mode: 'full',
                value: null,
                displayText: input.displayTextWhenFull ?? '-',
                reasonCode: 'field-package-not-applicable'
            };
        }

        const userPermissions = (input.user?.permissions ?? []) as PermissionKey[];
        if (canReadFullSensitiveFieldPackage(userPermissions, input.fieldPackageKey)) {
            const value = input.rawValue;
            return {
                fieldPackageKey: input.fieldPackageKey,
                mode: 'full',
                value,
                displayText: input.displayTextWhenFull ?? value ?? '-',
                reasonCode: 'allowed'
            };
        }

        const mode = input.modeWhenUnauthorized ?? 'masked';
        const projection: SensitiveStringFieldProjection = {
            fieldPackageKey: input.fieldPackageKey,
            mode,
            value: null,
            displayText: mode === 'denied' ? (input.deniedDisplayText ?? DEFAULT_SENSITIVE_FIELD_DENIED_TEXT) : (input.maskedDisplayText ?? DEFAULT_SENSITIVE_FIELD_MASKED_TEXT),
            reasonCode: 'missing-sensitive-read-permission'
        };

        await this.#recordSensitiveProjectionEvent(input, mode);

        return projection;
    }

    async #recordSensitiveProjectionEvent(input: ProjectSensitiveStringFieldInput, mode: Extract<SensitiveProjectionMode, 'masked' | 'denied'>): Promise<void> {
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
                reasonCode: 'missing-sensitive-read-permission',
                requiredPermission
            }
        });
    }
}
