import { SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS, SensitiveStringFieldProjectionSchema, type PermissionKey, type UserPayload } from '@poms/shared-contracts';
import { canReadFullSensitiveFieldPackage, requiredPermissionForSensitiveFieldPackage } from './sensitive-field-projection.policy';
import { SensitiveFieldProjectionService } from './sensitive-field-projection.service';

describe('Sensitive field projection', () => {
    const userId = '00000000-0000-4000-8000-000000000010';
    const targetId = '00000000-0000-4000-8000-000000000020';
    let runtimeAuditService: { recordSecurityEvent: jest.Mock };
    let service: SensitiveFieldProjectionService;

    beforeEach(() => {
        runtimeAuditService = {
            recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
        };
        service = new SensitiveFieldProjectionService(runtimeAuditService as never);
    });

    function buildUser(permissions: PermissionKey[]): Pick<UserPayload, 'sub' | 'username' | 'permissions'> {
        return {
            sub: userId,
            username: 'finance-user',
            permissions
        };
    }

    it('keeps field package to permission mapping strict', () => {
        expect(requiredPermissionForSensitiveFieldPackage('contract-finance')).toBe('contract:finance:sensitive:read');
        expect(SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS['commission-compensation']).toBe('commission:amount:sensitive:read');
        expect(canReadFullSensitiveFieldPackage(['contract:finance:sensitive:read'], 'contract-finance')).toBe(true);
        expect(canReadFullSensitiveFieldPackage(['contract:finance:manage'], 'contract-finance')).toBe(false);
    });

    it('accepts full scalar projections and rejects leaked masked values', () => {
        expect(
            SensitiveStringFieldProjectionSchema.parse({
                fieldPackageKey: 'contract-finance',
                mode: 'full',
                value: '1200000.00',
                displayText: '1,200,000.00 CNY',
                reasonCode: 'allowed'
            })
        ).toEqual(
            expect.objectContaining({
                value: '1200000.00',
                mode: 'full'
            })
        );

        expect(() =>
            SensitiveStringFieldProjectionSchema.parse({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: '1200000.00',
                displayText: '敏感字段已隐藏',
                reasonCode: 'missing-sensitive-read-permission'
            })
        ).toThrow();
    });

    it('returns full value without recording security events when the user has the package permission', async () => {
        const projection = await service.projectStringField({
            fieldPackageKey: 'contract-finance',
            rawValue: '1200000.00',
            displayTextWhenFull: '1,200,000.00 CNY',
            user: buildUser(['contract:finance:sensitive:read']),
            targetType: 'Contract',
            targetId,
            requestContext: {
                requestId: 'req-sensitive-full',
                path: '/contracts',
                method: 'GET'
            }
        });

        expect(projection).toEqual({
            fieldPackageKey: 'contract-finance',
            mode: 'full',
            value: '1200000.00',
            displayText: '1,200,000.00 CNY',
            reasonCode: 'allowed'
        });
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('masks values and records a sensitive field security event when permission is missing', async () => {
        const projection = await service.projectStringField({
            fieldPackageKey: 'contract-finance',
            rawValue: '1200000.00',
            displayTextWhenFull: '1,200,000.00 CNY',
            user: buildUser(['project:read']),
            targetType: 'Contract',
            targetId,
            requestContext: {
                requestId: 'req-sensitive-masked',
                path: '/contracts',
                method: 'GET',
                ip: '127.0.0.1',
                userAgent: 'jest'
            }
        });

        expect(projection).toEqual({
            fieldPackageKey: 'contract-finance',
            mode: 'masked',
            value: null,
            displayText: '敏感字段已隐藏',
            reasonCode: 'missing-sensitive-read-permission'
        });
        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'sensitive_field.masked',
                severity: 'info',
                actorId: userId,
                principal: 'finance-user',
                permissionKey: 'contract:finance:sensitive:read',
                result: 'blocked',
                details: expect.objectContaining({
                    fieldPackageKey: 'contract-finance',
                    projectionMode: 'masked',
                    targetType: 'Contract',
                    targetId,
                    reasonCode: 'missing-sensitive-read-permission'
                })
            })
        );
    });

    it('batches masked sensitive field events for grouped projections', async () => {
        const projections = await service.projectStringFields({
            fieldPackageKey: 'contract-finance',
            fields: [
                {
                    key: 'amountTaxInclusiveProjection',
                    rawValue: '1200000.00'
                },
                {
                    key: 'taxRateProjection',
                    rawValue: '0.13'
                },
                {
                    key: 'retentionRateProjection',
                    rawValue: null
                }
            ],
            user: buildUser(['project:read']),
            targetType: 'ContractSnapshot',
            targetId,
            requestContext: {
                requestId: 'req-sensitive-batch',
                path: '/contracts/contract-id',
                method: 'GET'
            }
        });

        expect(projections.amountTaxInclusiveProjection).toEqual(
            expect.objectContaining({
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
        expect(projections.taxRateProjection).toEqual(
            expect.objectContaining({
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
        expect(projections.retentionRateProjection).toEqual(
            expect.objectContaining({
                mode: 'full',
                value: null,
                reasonCode: 'field-package-not-applicable'
            })
        );
        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledTimes(1);
        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'sensitive_field.masked',
                severity: 'info',
                permissionKey: 'contract:finance:sensitive:read',
                details: expect.objectContaining({
                    fieldPackageKey: 'contract-finance',
                    projectionMode: 'masked',
                    targetType: 'ContractSnapshot',
                    targetId,
                    targetCount: 1,
                    sampleTargetIds: [targetId],
                    fieldKeys: ['amountTaxInclusiveProjection', 'taxRateProjection'],
                    hiddenFieldCount: 2,
                    auditAggregationMode: 'sensitive-field-batch'
                })
            })
        );
    });

    it('does not record batch events when all grouped fields are not applicable', async () => {
        const projections = await service.projectStringFields({
            fieldPackageKey: 'contract-finance',
            fields: [
                {
                    key: 'amountTaxInclusiveProjection',
                    rawValue: null
                },
                {
                    key: 'taxRateProjection',
                    rawValue: null
                }
            ],
            user: buildUser(['project:read']),
            targetType: 'ContractSnapshot',
            targetId,
            requestContext: {
                path: '/contracts/contract-id'
            }
        });

        expect(projections.amountTaxInclusiveProjection).toEqual(
            expect.objectContaining({
                mode: 'full',
                value: null,
                reasonCode: 'field-package-not-applicable'
            })
        );
        expect(projections.taxRateProjection).toEqual(
            expect.objectContaining({
                mode: 'full',
                value: null,
                reasonCode: 'field-package-not-applicable'
            })
        );
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('denies values and records warning severity when the caller asks for denied projection', async () => {
        const projection = await service.projectStringField({
            fieldPackageKey: 'commission-compensation',
            rawValue: '80000.00',
            user: buildUser(['project:read']),
            targetType: 'CommissionPayout',
            targetId,
            requestContext: {
                path: '/projects/project-id/commission/operations'
            },
            modeWhenUnauthorized: 'denied'
        });

        expect(projection).toEqual({
            fieldPackageKey: 'commission-compensation',
            mode: 'denied',
            value: null,
            displayText: '敏感字段不可见',
            reasonCode: 'missing-sensitive-read-permission'
        });
        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'sensitive_field.denied',
                severity: 'warning',
                permissionKey: 'commission:amount:sensitive:read',
                method: 'QUERY',
                details: expect.objectContaining({
                    fieldPackageKey: 'commission-compensation',
                    projectionMode: 'denied'
                })
            })
        );
    });
});
