import { SensitiveFieldProjectionService } from '../../core/sensitive-field-projection/sensitive-field-projection.service';
import { ContractController, ContractLookupController } from './contract.controller';
import { ContractService } from './contract.service';
import { ApprovalService } from '../approval/approval.service';
import { ProjectService } from '../project/project.service';

describe('ContractController', () => {
    const contractId = '30000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';
    const baseDate = new Date('2026-03-22T10:00:00.000Z');

    let controller: ContractController;
    let lookupController: ContractLookupController;
    let contractService: jest.Mocked<ContractService>;
    let approvalService: jest.Mocked<ApprovalService>;
    let projectService: jest.Mocked<ProjectService>;
    let contractTermSnapshotRepository: { findById: jest.Mock };
    let sensitiveFieldProjectionService: { projectStringField: jest.Mock; projectStringFields: jest.Mock };

    beforeEach(() => {
        contractService = {
            findMany: jest.fn(),
            findByNo: jest.fn(),
            findById: jest.fn(),
            createAndSave: jest.fn(),
            updateBasicInfo: jest.fn(),
            activate: jest.fn()
        } as unknown as jest.Mocked<ContractService>;
        approvalService = {
            submitContractReview: jest.fn(),
            findLatestApprovalForTarget: jest.fn()
        } as unknown as jest.Mocked<ApprovalService>;
        projectService = {
            findById: jest.fn().mockResolvedValue(null),
            findByIds: jest.fn().mockResolvedValue([])
        } as unknown as jest.Mocked<ProjectService>;
        contractTermSnapshotRepository = { findById: jest.fn() };
        const projectStringField = jest.fn(async (input) => {
            if (input.rawValue === null) {
                return {
                    fieldPackageKey: input.fieldPackageKey,
                    mode: 'full',
                    value: null,
                    displayText: '-',
                    reasonCode: 'field-package-not-applicable'
                };
            }

            const canRead = input.user?.permissions?.includes('contract:finance:sensitive:read') ?? false;
            return {
                fieldPackageKey: input.fieldPackageKey,
                mode: canRead ? 'full' : 'masked',
                value: canRead ? input.rawValue : null,
                displayText: canRead ? (input.displayTextWhenFull ?? input.rawValue) : '敏感字段已隐藏',
                reasonCode: canRead ? 'allowed' : 'missing-sensitive-read-permission'
            };
        });
        sensitiveFieldProjectionService = {
            projectStringField,
            projectStringFields: jest.fn(async (input) => {
                const projections: Record<string, unknown> = {};
                for (const field of input.fields) {
                    projections[field.key] = await projectStringField({
                        ...input,
                        rawValue: field.rawValue,
                        displayTextWhenFull: field.displayTextWhenFull
                    });
                }
                return projections;
            })
        };

        controller = new ContractController(contractService, approvalService, projectService, contractTermSnapshotRepository as never, sensitiveFieldProjectionService as never);
        lookupController = new ContractLookupController(contractService, projectService, contractTermSnapshotRepository as never, sensitiveFieldProjectionService as never);
    });

    it.each(['CT-2026-001', ' CT-2026-001 ', '合同/一:二+ß', 'C'.repeat(65)])('forwards the exact contract business number %s and keeps UUID identity', async (contractNo) => {
        contractService.findByNo.mockResolvedValue(createContractEntity({ contractNo }) as never);

        const result = await lookupController.getByNo({ contractNo }, makeRequest());

        expect(contractService.findByNo).toHaveBeenCalledWith(contractNo);
        expect(contractService.findByNo).toHaveBeenCalledTimes(1);
        expect(contractService.findById).not.toHaveBeenCalled();
        expect(projectService.findById).toHaveBeenCalledWith(projectId);
        expect(contractTermSnapshotRepository.findById).not.toHaveBeenCalled();
        expect(result).toEqual(expect.objectContaining({ id: contractId, contractNo, currentTermSnapshot: null, signedAt: null, retentionDueDate: null }));
        expect(result).not.toHaveProperty('signedAmount');
    });

    it('preserves the business-number-specific contract 404 before dependent reads', async () => {
        contractService.findByNo.mockResolvedValue(null);

        await expect(lookupController.getByNo({ contractNo: 'unknown-contract' }, makeRequest())).rejects.toMatchObject({
            response: { statusCode: 404, message: 'Contract no unknown-contract not found', error: 'Not Found' }
        });
        expect(projectService.findById).not.toHaveBeenCalled();
        expect(contractTermSnapshotRepository.findById).not.toHaveBeenCalled();
        expect(sensitiveFieldProjectionService.projectStringField).not.toHaveBeenCalled();
    });

    it.each([
        { originalUrl: '/api/contracts:lookup?contractNo=CT%2F1&extra=a+b', url: '/url', path: '/path', expected: '/api/contracts:lookup?contractNo=CT%2F1&extra=a+b' },
        { url: '/api/contracts:lookup?contractNo=CT%2B1', path: '/path', expected: '/api/contracts:lookup?contractNo=CT%2B1' },
        { path: '/contracts:lookup', expected: '/contracts:lookup' },
        { expected: '/contracts:lookup' },
        { originalUrl: '', url: '/url', expected: '' }
    ])('preserves the original URL priority and missing-URL fallback: $expected', async ({ expected, ...requestPaths }) => {
        contractService.findByNo.mockResolvedValue(createContractEntity() as never);

        await lookupController.getByNo({ contractNo: 'HT-2026-001' }, {
            ...requestPaths,
            user: { sub: userId, username: 'reader', permissions: ['project:read'] },
            method: 'GET',
            headers: { 'x-request-id': 'lookup-context' }
        });

        expect(sensitiveFieldProjectionService.projectStringField).toHaveBeenCalledWith(expect.objectContaining({
            requestContext: expect.objectContaining({ path: expected, requestId: 'lookup-context', method: 'GET' })
        }));
    });

    it('uses the real projection service to batch masked contract and snapshot events separately', async () => {
        const recordSecurityEvent = jest.fn().mockResolvedValue(undefined);
        const projection = new SensitiveFieldProjectionService({ recordSecurityEvent } as never);
        const projectedLookup = new ContractLookupController(contractService, projectService, contractTermSnapshotRepository as never, projection);
        const snapshotId = '60000000-0000-4000-8000-000000000001';
        const originalUrl = '/api/contracts:lookup?contractNo=HT%2F2026&extra=a+b';
        contractService.findByNo.mockResolvedValue(createContractEntity({ currentSnapshotId: snapshotId }) as never);
        contractTermSnapshotRepository.findById.mockResolvedValue(createTermSnapshot({ amountTaxExclusive: null, retentionRate: null }));

        const result = await projectedLookup.getByNo({ contractNo: 'HT/2026' }, {
            originalUrl,
            method: 'GET',
            headers: { 'x-request-id': 'lookup-projection' },
            user: { sub: userId, username: 'reader', permissions: ['project:read'] }
        });

        expect(recordSecurityEvent).toHaveBeenCalledTimes(2);
        expect(recordSecurityEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
            eventType: 'sensitive_field.masked', path: originalUrl, method: 'GET', requestId: 'lookup-projection',
            details: expect.objectContaining({ targetType: 'contract', targetId: contractId, fieldKeys: ['field'], hiddenFieldCount: 1 })
        }));
        expect(recordSecurityEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
            eventType: 'sensitive_field.masked', path: originalUrl,
            details: expect.objectContaining({
                targetType: 'ContractSnapshot', targetId: snapshotId,
                fieldKeys: ['amountTaxInclusiveProjection', 'taxRateProjection', 'downPaymentRateProjection', 'paymentTermsProjection'], hiddenFieldCount: 4
            })
        }));
        expect(result.signedAmountProjection.mode).toBe('masked');
        expect(result.currentTermSnapshot?.amountTaxExclusiveProjection).toEqual(expect.objectContaining({ mode: 'full', value: null, reasonCode: 'field-package-not-applicable' }));
        expect(result.currentTermSnapshot).not.toHaveProperty('paymentTerms');
    });

    it('does not audit a fully authorized lookup or null snapshot fields', async () => {
        const recordSecurityEvent = jest.fn().mockResolvedValue(undefined);
        const projection = new SensitiveFieldProjectionService({ recordSecurityEvent } as never);
        const projectedLookup = new ContractLookupController(contractService, projectService, contractTermSnapshotRepository as never, projection);
        contractService.findByNo.mockResolvedValue(createContractEntity({ currentSnapshotId: '60000000-0000-4000-8000-000000000001' }) as never);
        contractTermSnapshotRepository.findById.mockResolvedValue(createTermSnapshot({
            amountTaxInclusive: null, amountTaxExclusive: null, taxRate: null, downPaymentRate: null, retentionRate: null, paymentTerms: null
        }));

        const result = await projectedLookup.getByNo({ contractNo: 'HT-2026-001' }, makeRequest());

        expect(result.signedAmountProjection.mode).toBe('full');
        expect(recordSecurityEvent).not.toHaveBeenCalled();
        await projectedLookup.getByNo({ contractNo: 'HT-2026-001' }, makeRequest(['project:read']));
        expect(recordSecurityEvent).toHaveBeenCalledTimes(1);
        expect(recordSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ details: expect.objectContaining({ targetType: 'contract' }) }));
    });

    it('maps create payload signedAt into Date', async () => {
        const signedAt = '2026-03-20T09:30:00.000Z';
        contractService.createAndSave.mockResolvedValue(
            createContractEntity({
                signedAt: new Date(signedAt)
            })
        );

        await controller.create(
            {
                projectId,
                contractNo: 'HT-2026-001',
                signedAmount: '880000.00',
                signedAt,
                createdBy: userId,
                updatedBy: userId
            },
            makeRequest()
        );

        expect(contractService.createAndSave).toHaveBeenCalledWith(
            expect.objectContaining({
                signedAt: new Date(signedAt)
            })
        );
    });

    it('maps update payload null signedAt into null', async () => {
        contractService.updateBasicInfo.mockResolvedValue(
            createContractEntity({
                signedAt: null
            })
        );

        await controller.updateBasicInfo(
            contractId,
            {
                signedAt: null,
                updatedBy: userId
            },
            makeRequest()
        );

        expect(contractService.updateBasicInfo).toHaveBeenCalledWith(
            contractId,
            expect.objectContaining({
                signedAt: null,
                updatedBy: userId
            })
        );
    });

    it('leaves update payload signedAt undefined when not provided', async () => {
        contractService.updateBasicInfo.mockResolvedValue(createContractEntity());

        await controller.updateBasicInfo(
            contractId,
            {
                updatedBy: userId
            },
            makeRequest()
        );

        expect(contractService.updateBasicInfo).toHaveBeenCalledWith(
            contractId,
            expect.objectContaining({
                signedAt: undefined,
                updatedBy: userId
            })
        );
    });

    it('submits contract review with current user identity', async () => {
        approvalService.submitContractReview.mockResolvedValue({
            targetId: contractId,
            targetType: 'contract',
            resultStatus: 'submitted',
            businessStatusAfter: 'pending-review',
            approvalRecordId: '40000000-0000-4000-8000-000000000001',
            confirmationRecordId: null,
            todoItemIds: ['50000000-0000-4000-8000-000000000001'],
            snapshotId: null
        });

        await controller.submitReview(
            contractId,
            {
                user: { sub: userId, username: 'admin', permissions: ['project:write'] }
            },
            { comment: '请审核合同' }
        );

        expect(approvalService.submitContractReview).toHaveBeenCalledWith(contractId, userId, {
            comment: '请审核合同'
        });
    });

    it('returns current approval summary for contract', async () => {
        approvalService.findLatestApprovalForTarget.mockResolvedValue({
            id: '40000000-0000-4000-8000-000000000001',
            approvalType: 'contract-review',
            businessDomain: 'contract-finance',
            targetObjectType: 'contract',
            targetObjectId: contractId,
            projectId,
            currentStatus: 'pending',
            currentNodeKey: 'contract-review',
            currentNodeName: '合同审核',
            initiatorUserId: userId,
            currentApproverUserId: userId,
            decision: null,
            decisionComment: null,
            targetTitle: 'HT-2026-001',
            targetStatus: 'pending-review',
            submittedAt: baseDate.toISOString(),
            decidedAt: null,
            closedAt: null,
            rowVersion: 1,
            createdAt: baseDate.toISOString(),
            updatedAt: baseDate.toISOString()
        });

        await controller.getCurrentApproval(contractId);

        expect(approvalService.findLatestApprovalForTarget).toHaveBeenCalledWith('contract', contractId);
    });

    it('projects contract list signed amount for callers without sensitive read permission', async () => {
        contractService.findMany.mockResolvedValue([createContractEntity()]);
        projectService.findByIds.mockResolvedValue([{ id: projectId, projectName: 'POMS 项目', customerName: '华南地铁集团' }] as never);

        const result = await controller.list({}, makeRequest(['project:read']));

        expect(result[0]).not.toHaveProperty('signedAmount');
        expect(result[0]?.signedAmountProjection).toEqual(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
    });

    it('projects current term snapshot commercial terms for callers without sensitive read permission', async () => {
        const snapshotId = '60000000-0000-4000-8000-000000000001';
        contractService.findById.mockResolvedValue(createContractEntity({ currentSnapshotId: snapshotId }));
        projectService.findById.mockResolvedValue({ id: projectId, projectName: 'POMS 项目', customerName: '华南地铁集团' } as never);
        contractTermSnapshotRepository.findById.mockResolvedValue(createTermSnapshot({ id: snapshotId }) as never);

        const result = await controller.getById(contractId, makeRequest(['project:read']));

        expect(result.currentTermSnapshot).not.toHaveProperty('taxRate');
        expect(result.currentTermSnapshot).not.toHaveProperty('downPaymentRate');
        expect(result.currentTermSnapshot).not.toHaveProperty('retentionRate');
        expect(result.currentTermSnapshot).not.toHaveProperty('paymentTerms');
        expect(result.currentTermSnapshot?.taxRateProjection).toEqual(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
        expect(result.currentTermSnapshot?.downPaymentRateProjection).toEqual(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
        expect(result.currentTermSnapshot?.retentionRateProjection).toEqual(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
        expect(result.currentTermSnapshot?.paymentTermsProjection).toEqual(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
        expect(sensitiveFieldProjectionService.projectStringFields).toHaveBeenCalledWith(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                user: expect.objectContaining({ permissions: ['project:read'] }),
                targetType: 'ContractSnapshot',
                targetId: snapshotId,
                fields: expect.arrayContaining([
                    expect.objectContaining({
                        key: 'taxRateProjection',
                        rawValue: '0.13'
                    })
                ])
            })
        );
        expect(sensitiveFieldProjectionService.projectStringFields).toHaveBeenCalledWith(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                targetType: 'ContractSnapshot',
                targetId: snapshotId,
                fields: expect.arrayContaining([
                    expect.objectContaining({
                        key: 'paymentTermsProjection',
                        rawValue: '30% 首付，65% 阶段款，5% 质保金'
                    })
                ])
            })
        );
    });

    it('activates contract with current user identity', async () => {
        contractService.activate.mockResolvedValue({
            targetId: contractId,
            targetType: 'contract',
            resultStatus: 'activated',
            businessStatusAfter: 'active',
            approvalRecordId: '40000000-0000-4000-8000-000000000001',
            confirmationRecordId: null,
            todoItemIds: [],
            snapshotId: '60000000-0000-4000-8000-000000000001'
        });

        await controller.activate(
            contractId,
            {
                user: { sub: userId, username: 'admin', permissions: ['project:write'] }
            },
            { comment: '合同已审核通过', expectedVersion: 3 }
        );

        expect(contractService.activate).toHaveBeenCalledWith(contractId, userId, {
            comment: '合同已审核通过',
            expectedVersion: 3
        });
    });

    function createContractEntity(overrides: Record<string, unknown> = {}) {
        return {
            id: contractId,
            projectId,
            contractNo: 'HT-2026-001',
            status: 'draft',
            signedAmount: '880000.00',
            currencyCode: 'CNY',
            currentSnapshotId: null,
            signedAt: null,
            retentionDueDate: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        };
    }

    function createTermSnapshot(overrides: Record<string, unknown> = {}) {
        return {
            id: '60000000-0000-4000-8000-000000000001',
            contractId,
            effectiveAt: baseDate,
            effectiveBy: userId,
            retentionDueDate: '2026-12-31',
            amountTaxInclusive: '880000.00',
            amountTaxExclusive: '778761.06',
            taxRate: '0.13',
            downPaymentRate: '0.30',
            retentionRate: '0.05',
            paymentTerms: '30% 首付，65% 阶段款，5% 质保金',
            sourceReadinessId: null,
            sourceBaselineId: null,
            version: 1,
            snapshotStatus: 'active',
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        };
    }

    function makeRequest(permissions: string[] = ['project:read', 'contract:finance:sensitive:read']) {
        return {
            user: { sub: userId, username: 'admin', permissions },
            originalUrl: '/contracts',
            method: 'GET'
        } as never;
    }
});
