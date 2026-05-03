import { ProjectQueryService } from './project-query.service';

describe('ProjectQueryService', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';

    let service: ProjectQueryService;
    let projectRepository: {
        findById: jest.Mock;
        findMany: jest.Mock;
        findLeadsByIds: jest.Mock;
        findPlatformUsersByIds: jest.Mock;
        findOrgUnitsByIds: jest.Mock;
        findLatestSignedContractAtByProjectIds: jest.Mock;
        findContractsByProjectId: jest.Mock;
        findLatestConfirmedHandoverByProjectId: jest.Mock;
        findAcceptanceRecordsByProjectId: jest.Mock;
        findLatestAcceptedAcceptanceRecordByProjectId: jest.Mock;
        findProjectCompletionRecordsByProjectId: jest.Mock;
        findLatestConfirmedProjectCompletionRecordByProjectId: jest.Mock;
        findProjectArchiveRecordsByProjectId: jest.Mock;
        findLatestRecordedProjectArchiveRecordByProjectId: jest.Mock;
        findProjectBidCommercialProcessesByProjectId: jest.Mock;
        findCurrentProjectBidCommercialProcessByProjectId: jest.Mock;
        findProjectBidCommercialProcessById: jest.Mock;
        findProjectBidCommercialMaterialItemsByProcessIds: jest.Mock;
        findProjectBidCommercialTimelineItemsByProcessIds: jest.Mock;
        findProjectPricingMarginReviewsByProjectId: jest.Mock;
        findCurrentProjectPricingMarginReviewByProjectId: jest.Mock;
        findProjectPricingMarginConditionItemsByReviewIds: jest.Mock;
        findProjectTechnicalCostPackagesByProjectId: jest.Mock;
        findProjectTechnicalCostPackageById: jest.Mock;
        findCurrentProjectTechnicalCostPackageByProjectId: jest.Mock;
        findProjectTechnicalScopeItemsByPackageIds: jest.Mock;
        findProjectTechnicalRiskItemsByPackageIds: jest.Mock;
        findProjectTechnicalCostItemsByPackageIds: jest.Mock;
    };
    let approvalSummarySnapshotRepository: { findActiveByTarget: jest.Mock };
    let sensitiveFieldProjectionService: { projectStringField: jest.Mock };

    beforeEach(() => {
        projectRepository = {
            findById: jest.fn(),
            findMany: jest.fn(),
            findLeadsByIds: jest.fn(),
            findPlatformUsersByIds: jest.fn(),
            findOrgUnitsByIds: jest.fn(),
            findLatestSignedContractAtByProjectIds: jest.fn(),
            findContractsByProjectId: jest.fn(),
            findLatestConfirmedHandoverByProjectId: jest.fn(),
            findAcceptanceRecordsByProjectId: jest.fn(),
            findLatestAcceptedAcceptanceRecordByProjectId: jest.fn(),
            findProjectCompletionRecordsByProjectId: jest.fn(),
            findLatestConfirmedProjectCompletionRecordByProjectId: jest.fn(),
            findProjectArchiveRecordsByProjectId: jest.fn(),
            findLatestRecordedProjectArchiveRecordByProjectId: jest.fn(),
            findProjectBidCommercialProcessesByProjectId: jest.fn(),
            findCurrentProjectBidCommercialProcessByProjectId: jest.fn(),
            findProjectBidCommercialProcessById: jest.fn(),
            findProjectBidCommercialMaterialItemsByProcessIds: jest.fn(),
            findProjectBidCommercialTimelineItemsByProcessIds: jest.fn(),
            findProjectPricingMarginReviewsByProjectId: jest.fn(),
            findCurrentProjectPricingMarginReviewByProjectId: jest.fn(),
            findProjectPricingMarginConditionItemsByReviewIds: jest.fn(),
            findProjectTechnicalCostPackagesByProjectId: jest.fn(),
            findProjectTechnicalCostPackageById: jest.fn(),
            findCurrentProjectTechnicalCostPackageByProjectId: jest.fn(),
            findProjectTechnicalScopeItemsByPackageIds: jest.fn(),
            findProjectTechnicalRiskItemsByPackageIds: jest.fn(),
            findProjectTechnicalCostItemsByPackageIds: jest.fn()
        };
        projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId.mockResolvedValue(null);
        projectRepository.findLatestRecordedProjectArchiveRecordByProjectId.mockResolvedValue(null);
        projectRepository.findCurrentProjectBidCommercialProcessByProjectId.mockResolvedValue(null);
        projectRepository.findCurrentProjectTechnicalCostPackageByProjectId.mockResolvedValue(null);
        projectRepository.findCurrentProjectPricingMarginReviewByProjectId.mockResolvedValue(null);
        approvalSummarySnapshotRepository = { findActiveByTarget: jest.fn() };
        sensitiveFieldProjectionService = {
            projectStringField: jest.fn(async (input) => {
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
            })
        };

        service = new ProjectQueryService(projectRepository as never, approvalSummarySnapshotRepository as never, sensitiveFieldProjectionService as never);
    });

    it('builds project list views with business names and latest milestone time', async () => {
        projectRepository.findMany.mockResolvedValue([
            {
                id: '20000000-0000-4000-8000-000000000001',
                projectNo: 'PRJ-2026-001',
                projectName: 'POMS 首期项目主链路样例',
                customerId,
                customerName: '华南地铁集团',
                customerProjectNo: null,
                currentStage: 'contracting',
                status: 'active',
                ownerOrgId: '10000000-0000-4000-8000-000000000001',
                ownerUserId: '00000000-0000-4000-8000-000000000001',
                closedAt: null,
                createdAt: new Date('2026-04-01T00:00:00.000Z')
            }
        ]);
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }]);
        projectRepository.findLatestSignedContractAtByProjectIds.mockResolvedValue(new Map([['20000000-0000-4000-8000-000000000001', new Date('2026-04-18T08:00:00.000Z')]]));

        await expect(service.listProjects({ keyword: 'POMS' })).resolves.toEqual([
            {
                id: '20000000-0000-4000-8000-000000000001',
                projectNo: 'PRJ-2026-001',
                projectName: 'POMS 首期项目主链路样例',
                customerId,
                customerName: '华南地铁集团',
                customerProjectNo: null,
                currentStage: 'contracting',
                status: 'active',
                ownerOrgName: '华南销售一部',
                ownerName: '销售人员',
                latestMilestoneAt: '2026-04-18T08:00:00.000Z',
                createdAt: '2026-04-01T00:00:00.000Z'
            }
        ]);
    });

    it('builds project detail view with owner, contract summary, snapshot metadata and allowed actions', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000001',
            projectNo: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            sourceLeadId: '50000000-0000-4000-8000-000000000001',
            customerId,
            customerName: '华南地铁集团',
            currentStage: 'execution',
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: '00000000-0000-4000-8000-000000000001',
            plannedSignAt: new Date('2026-04-20T00:00:00.000Z'),
            closedAt: null,
            closedReason: null,
            rowVersion: 2,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000001',
            updatedAt: new Date('2026-04-18T08:00:00.000Z'),
            updatedBy: '00000000-0000-4000-8000-000000000002'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }]);
        projectRepository.findLeadsByIds.mockResolvedValue([
            {
                id: '50000000-0000-4000-8000-000000000001',
                leadNo: 'LEAD-2026-001',
                leadName: '华南地铁线索',
                customerId,
                customerName: '华南地铁集团',
                status: 'converted'
            }
        ]);
        projectRepository.findContractsByProjectId.mockResolvedValue([
            {
                id: '30000000-0000-4000-8000-000000000001',
                contractNo: 'CT-2026-001',
                status: 'active',
                signedAmount: '12345.67',
                currencyCode: 'CNY',
                signedAt: new Date('2026-04-18T08:00:00.000Z'),
                currentSnapshotId: '31000000-0000-4000-8000-000000000001'
            }
        ]);
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue({
            id: '37000000-0000-4000-8000-000000000001',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project-detail',
            exportPolicy: 'controlled',
            generatedAt: new Date('2026-04-18T09:00:00.000Z')
        });

        const result = await service.getProjectDetail('20000000-0000-4000-8000-000000000001', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read', 'project:write', 'commission:payouts:manage']
        });

        expect(approvalSummarySnapshotRepository.findActiveByTarget).toHaveBeenCalledWith('project', '20000000-0000-4000-8000-000000000001', 'project-detail', 'project-detail');
        expect(result.ownerName).toBe('销售人员');
        expect(result.ownerOrgName).toBe('华南销售一部');
        expect(result.sourceLeadSummary).toEqual({
            id: '50000000-0000-4000-8000-000000000001',
            leadNo: 'LEAD-2026-001',
            leadName: '华南地铁线索',
            customerId,
            customerName: '华南地铁集团',
            status: 'converted'
        });
        expect(result.currentContractSummary).toEqual({
            activeContractCount: 1,
            latestContractId: '30000000-0000-4000-8000-000000000001',
            latestContractNo: 'CT-2026-001',
            latestContractStatus: 'active',
            signedAmountProjection: expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            }),
            currencyCode: 'CNY',
            signedAt: '2026-04-18T08:00:00.000Z',
            currentSnapshotId: '31000000-0000-4000-8000-000000000001'
        });
        expect(result.currentBidSummary).toEqual({
            bidProcessId: null,
            bidStatus: 'not_configured',
            resultStatus: null,
            tenderNo: null,
            bidPackageNo: null,
            summary: null
        });
        expect(result.currentApprovalSummary).toEqual({
            summarySnapshotId: '37000000-0000-4000-8000-000000000001',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project-detail',
            exportPolicy: 'controlled',
            generatedAt: '2026-04-18T09:00:00.000Z'
        });
        expect(result.currentConfirmationSummary).toEqual({
            confirmationRecordId: null,
            status: 'not_configured',
            requiredCount: 0,
            confirmedCount: 0,
            pendingCount: 0,
            confirmedAt: null
        });
        expect(result.summarySnapshotId).toBe('37000000-0000-4000-8000-000000000001');
        expect(result.allowedActions).toEqual(['view-project-workspace', 'edit-project-basic-info', 'reassign-project-owner', 'manage-project-commission']);
    });

    it('builds project detail bid summary from the current bid commercial process', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000011',
            projectNo: 'PRJ-2026-011',
            projectName: '投标中项目',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'assessment',
            status: 'active',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-04-20T00:00:00.000Z'),
            updatedBy: null
        });
        projectRepository.findContractsByProjectId.mockResolvedValue([]);
        projectRepository.findCurrentProjectBidCommercialProcessByProjectId.mockResolvedValue({
            id: '6f2820b4-9665-4f22-8000-000000000011',
            currentStage: 'submitted',
            resultStatus: 'pending',
            processSummary: '投标材料已提交，等待商务评审结果'
        });
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(null);

        const result = await service.getProjectDetail('20000000-0000-4000-8000-000000000011', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read']
        });

        expect(projectRepository.findCurrentProjectBidCommercialProcessByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000011');
        expect(result.currentBidSummary).toEqual({
            bidProcessId: '6f2820b4-9665-4f22-8000-000000000011',
            bidStatus: 'submitted',
            resultStatus: 'pending',
            tenderNo: null,
            bidPackageNo: null,
            summary: '投标材料已提交，等待商务评审结果'
        });
    });

    it('keeps write and commission actions hidden for closed read-only project detail', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000002',
            projectNo: 'PRJ-2026-002',
            projectName: '已关闭项目',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'closed-terminated',
            status: 'closed',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: new Date('2026-04-20T00:00:00.000Z'),
            closedReason: '客户终止',
            rowVersion: 3,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-04-20T00:00:00.000Z'),
            updatedBy: null
        });
        projectRepository.findContractsByProjectId.mockResolvedValue([]);
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(null);

        const result = await service.getProjectDetail('20000000-0000-4000-8000-000000000002', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'viewer',
            permissions: ['project:read']
        });

        expect(result.allowedActions).toEqual(['view-project-workspace']);
        expect(result.stageSummary.blockingReasons).toEqual(['project-closed']);
        expect(result.currentContractSummary.activeContractCount).toBe(0);
        expect(result.currentApprovalSummary).toEqual({
            summarySnapshotId: null,
            summaryPackageKey: null,
            projectionLevel: null,
            exportPolicy: null,
            generatedAt: null
        });
        expect(result.currentConfirmationSummary.status).toBe('not_configured');
        expect(result.summarySnapshotId).toBeNull();
    });

    it('builds project workspace guidance with business labels, owner hint, snapshot basis and entry guards', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000003',
            projectNo: 'PRJ-2026-003',
            projectName: '执行中项目',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'execution',
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: '00000000-0000-4000-8000-000000000001',
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-04-18T08:00:00.000Z'),
            updatedBy: null
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }]);
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue({
            id: '37000000-0000-4000-8000-000000000003',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project-detail',
            exportPolicy: 'controlled',
            generatedAt: new Date('2026-04-18T09:00:00.000Z')
        });

        const result = await service.getProjectWorkspaceGuidance('20000000-0000-4000-8000-000000000003', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read', 'contract:finance:manage', 'commission:payouts:manage']
        });

        expect(result.currentStageLabel).toBe('正式执行');
        expect(result.statusLabel).toBe('进行中');
        expect(result.headline).toBe('围绕经营、回款、成本和提成条件持续推进');
        expect(result.ownerLabel).toBe('销售人员 / 华南销售一部');
        expect(result.blockingReasons).toEqual([]);
        expect(result.basisSummary).toEqual({
            summarySnapshotId: '37000000-0000-4000-8000-000000000003',
            projectionLevel: 'project-detail',
            exportPolicy: 'controlled',
            generatedAt: '2026-04-18T09:00:00.000Z'
        });
        expect(result.recommendedEntries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'operating-overview',
                    route: '/projects/20000000-0000-4000-8000-000000000003/workspace/operating-overview',
                    enabled: true,
                    disabledReason: null
                }),
                expect.objectContaining({
                    key: 'commission-freeze-binding',
                    enabled: false,
                    disabledReason: '需要项目查看和提成角色冻结权限。'
                }),
                expect.objectContaining({
                    key: 'commission-final-settlement',
                    enabled: false,
                    disabledReason: '项目进入验收或完成阶段后再查看最终结算。'
                }),
                expect.objectContaining({
                    key: 'commission-rule-explanation',
                    enabled: true,
                    disabledReason: null
                })
            ])
        );
        expect(result.generatedAt).toEqual(expect.any(String));
    });

    it('enables handover workspace guidance entry when project is in handover stage', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000006',
            projectNo: 'PRJ-2026-006',
            projectName: '移交中项目',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'handover',
            status: 'active',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-04-18T08:00:00.000Z'),
            updatedBy: null
        });
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(null);

        const result = await service.getProjectWorkspaceGuidance('20000000-0000-4000-8000-000000000006', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read', 'commission:assignments:manage']
        });

        expect(result.currentStageLabel).toBe('项目移交');
        expect(result.recommendedEntries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'handover-workspace',
                    label: '合同承接',
                    route: '/projects/20000000-0000-4000-8000-000000000006/workspace/contract-handover',
                    enabled: true,
                    disabledReason: null,
                    actionKey: 'view-project-workspace'
                }),
                expect.objectContaining({
                    key: 'commission-freeze-binding',
                    route: '/projects/20000000-0000-4000-8000-000000000006/commission/freeze-binding',
                    enabled: true,
                    disabledReason: null,
                    actionKey: 'commission:assignments:manage'
                })
            ])
        );
    });

    it('keeps blocked pre-signing workspace guidance readable without inventing a missing workspace', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000004',
            projectNo: 'PRJ-2026-004',
            projectName: '阻塞中项目',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'assessment',
            status: 'blocked',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-04-18T08:00:00.000Z'),
            updatedBy: null
        });
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(null);

        const result = await service.getProjectWorkspaceGuidance('20000000-0000-4000-8000-000000000004', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read']
        });

        expect(result.headline).toBe('立项评估存在阻断，先处理卡点。');
        expect(result.currentGap).toBe('项目已标记为阻塞，需要先明确阻断原因和解除责任。');
        expect(result.ownerLabel).toBe('项目负责人');
        expect(result.basisSummary.summarySnapshotId).toBeNull();
        expect(result.recommendedEntries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'pre-signing-workspace',
                    route: '/projects/20000000-0000-4000-8000-000000000004/workspace/pre-signing',
                    enabled: true,
                    disabledReason: null,
                    actionKey: 'view-project-workspace'
                }),
                expect.objectContaining({
                    key: 'technical-cost-workspace',
                    route: '/projects/20000000-0000-4000-8000-000000000004/workspace/technical-cost',
                    enabled: true,
                    disabledReason: null,
                    actionKey: 'view-project-workspace'
                }),
                expect.objectContaining({
                    key: 'bid-commercial-workspace',
                    route: '/projects/20000000-0000-4000-8000-000000000004/workspace/bid-commercial',
                    enabled: true,
                    disabledReason: null,
                    actionKey: 'view-project-workspace'
                })
            ])
        );
    });

    it('builds project timeline from authoritative project, contract, handover and close facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000005',
            projectNo: 'PRJ-2026-005',
            projectName: '已关闭项目',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'closed-terminated',
            status: 'closed',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: new Date('2026-04-20T10:00:00.000Z'),
            closedReason: '客户终止',
            rowVersion: 4,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000001',
            updatedAt: new Date('2026-04-20T10:00:00.000Z'),
            updatedBy: '00000000-0000-4000-8000-000000000004'
        });
        projectRepository.findContractsByProjectId.mockResolvedValue([
            {
                id: '30000000-0000-4000-8000-000000000002',
                contractNo: 'CT-2026-002',
                signedAt: new Date('2026-04-12T08:00:00.000Z'),
                createdBy: '00000000-0000-4000-8000-000000000002',
                updatedBy: '00000000-0000-4000-8000-000000000002'
            },
            {
                id: '30000000-0000-4000-8000-000000000001',
                contractNo: 'CT-2026-001',
                signedAt: new Date('2026-04-10T08:00:00.000Z'),
                createdBy: '00000000-0000-4000-8000-000000000002',
                updatedBy: null
            }
        ]);
        projectRepository.findLatestConfirmedHandoverByProjectId.mockResolvedValue({
            id: '34000000-0000-4000-8000-000000000001',
            confirmedAt: new Date('2026-04-15T09:00:00.000Z'),
            confirmedBy: '00000000-0000-4000-8000-000000000003'
        });
        projectRepository.findLatestAcceptedAcceptanceRecordByProjectId.mockResolvedValue(null);
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' },
            { id: '00000000-0000-4000-8000-000000000002', displayName: '商务人员' },
            { id: '00000000-0000-4000-8000-000000000003', displayName: '项目经理' },
            { id: '00000000-0000-4000-8000-000000000004', displayName: '管理人员' }
        ]);

        const result = await service.getProjectTimeline('20000000-0000-4000-8000-000000000005');

        expect(projectRepository.findLatestConfirmedHandoverByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000005');
        expect(projectRepository.findPlatformUsersByIds).toHaveBeenCalledWith(['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004']);
        expect(result.projectId).toBe('20000000-0000-4000-8000-000000000005');
        expect(result.generatedAt).toEqual(expect.any(String));
        expect(result.events).toEqual([
            {
                eventKey: 'project-created',
                stage: 'assessment',
                stageLabel: '立项评估',
                eventType: 'stage-entered',
                occurredAt: '2026-04-01T00:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000001',
                actorName: '销售人员',
                resultLabel: '项目创建',
                sourceType: 'project',
                sourceId: '20000000-0000-4000-8000-000000000005',
                evidenceLabel: 'PRJ-2026-005',
                isAuthoritative: true
            },
            {
                eventKey: 'contract-signed:30000000-0000-4000-8000-000000000001',
                stage: 'contracting',
                stageLabel: '签约中',
                eventType: 'stage-completed',
                occurredAt: '2026-04-10T08:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000002',
                actorName: '商务人员',
                resultLabel: '合同签约完成',
                sourceType: 'contract',
                sourceId: '30000000-0000-4000-8000-000000000001',
                evidenceLabel: 'CT-2026-001',
                isAuthoritative: true
            },
            {
                eventKey: 'project-handover-confirmed:34000000-0000-4000-8000-000000000001',
                stage: 'handover',
                stageLabel: '项目移交',
                eventType: 'stage-completed',
                occurredAt: '2026-04-15T09:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000003',
                actorName: '项目经理',
                resultLabel: '项目移交完成',
                sourceType: 'project-handover',
                sourceId: '34000000-0000-4000-8000-000000000001',
                evidenceLabel: '移交确认',
                isAuthoritative: true
            },
            {
                eventKey: 'project-closed',
                stage: 'closed-terminated',
                stageLabel: '已终止',
                eventType: 'stage-completed',
                occurredAt: '2026-04-20T10:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000004',
                actorName: '管理人员',
                resultLabel: '项目关闭：客户终止',
                sourceType: 'project',
                sourceId: '20000000-0000-4000-8000-000000000005',
                evidenceLabel: '客户终止',
                isAuthoritative: true
            }
        ]);
    });

    it('lists acceptance records as project-scoped authoritative facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000007'
        });
        projectRepository.findAcceptanceRecordsByProjectId.mockResolvedValue([
            {
                id: '36000000-0000-4000-8000-000000000001',
                projectId: '20000000-0000-4000-8000-000000000007',
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                status: 'confirmed',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: null,
                confirmationRecordId: null,
                confirmedAt: new Date('2026-04-18T09:30:00.000Z'),
                confirmedBy: '00000000-0000-4000-8000-000000000003',
                createdAt: new Date('2026-04-18T09:30:00.000Z'),
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: new Date('2026-04-18T09:30:00.000Z'),
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);

        await expect(service.listAcceptanceRecords('20000000-0000-4000-8000-000000000007')).resolves.toEqual([
            {
                id: '36000000-0000-4000-8000-000000000001',
                projectId: '20000000-0000-4000-8000-000000000007',
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                status: 'confirmed',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: null,
                confirmationRecordId: null,
                confirmedAt: '2026-04-18T09:30:00.000Z',
                confirmedBy: '00000000-0000-4000-8000-000000000003',
                createdAt: '2026-04-18T09:30:00.000Z',
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: '2026-04-18T09:30:00.000Z',
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);
        expect(projectRepository.findAcceptanceRecordsByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000007');
    });

    it('lists completion records as project-scoped authoritative facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000009'
        });
        projectRepository.findProjectCompletionRecordsByProjectId.mockResolvedValue([
            {
                id: '37000000-0000-4000-8000-000000000001',
                projectId: '20000000-0000-4000-8000-000000000009',
                acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
                completionResult: 'completed',
                status: 'confirmed',
                completedAt: new Date('2026-04-20T10:00:00.000Z'),
                completedBy: '00000000-0000-4000-8000-000000000003',
                completionSummary: '项目交付完成',
                evidenceSummary: '完成确认单',
                createdAt: new Date('2026-04-20T10:00:00.000Z'),
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: new Date('2026-04-20T10:00:00.000Z'),
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000003', displayName: '项目经理' }]);

        await expect(service.listProjectCompletionRecords('20000000-0000-4000-8000-000000000009')).resolves.toEqual([
            {
                id: '37000000-0000-4000-8000-000000000001',
                projectId: '20000000-0000-4000-8000-000000000009',
                acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
                completionResult: 'completed',
                status: 'confirmed',
                completedAt: '2026-04-20T10:00:00.000Z',
                completedBy: '00000000-0000-4000-8000-000000000003',
                completedByName: '项目经理',
                completionSummary: '项目交付完成',
                evidenceSummary: '完成确认单',
                createdAt: '2026-04-20T10:00:00.000Z',
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: '2026-04-20T10:00:00.000Z',
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);
        expect(projectRepository.findProjectCompletionRecordsByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000009');
        expect(projectRepository.findPlatformUsersByIds).toHaveBeenCalledWith(['00000000-0000-4000-8000-000000000003']);
    });

    it('lists archive records as project-scoped authoritative facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000011',
            currentStage: 'completed',
            status: 'completed'
        });
        projectRepository.findProjectArchiveRecordsByProjectId.mockResolvedValue([
            {
                id: '38000000-0000-4000-8000-000000000001',
                projectId: '20000000-0000-4000-8000-000000000011',
                archiveAnchorStage: 'completed',
                archiveAnchorSourceType: 'project-completion-record',
                archiveAnchorSourceId: '37000000-0000-4000-8000-000000000001',
                status: 'recorded',
                archivedAt: new Date('2026-04-22T10:00:00.000Z'),
                archivedBy: '00000000-0000-4000-8000-000000000003',
                archiveSummary: '项目资料归档完成',
                evidenceSummary: '归档清单与交付包',
                createdAt: new Date('2026-04-22T10:00:00.000Z'),
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: new Date('2026-04-22T10:00:00.000Z'),
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000003', displayName: '项目经理' }]);

        await expect(
            service.listProjectArchiveRecords('20000000-0000-4000-8000-000000000011', {
                sub: '00000000-0000-4000-8000-000000000001',
                username: 'admin',
                permissions: ['project:read', 'project:write']
            })
        ).resolves.toEqual([
            {
                id: '38000000-0000-4000-8000-000000000001',
                projectId: '20000000-0000-4000-8000-000000000011',
                archiveAnchorStage: 'completed',
                archiveAnchorSourceType: 'project-completion-record',
                archiveAnchorSourceId: '37000000-0000-4000-8000-000000000001',
                status: 'recorded',
                archivedAt: '2026-04-22T10:00:00.000Z',
                archivedBy: '00000000-0000-4000-8000-000000000003',
                archivedByName: '项目经理',
                archiveSummary: '项目资料归档完成',
                evidenceSummary: '归档清单与交付包',
                supersedesArchiveRecordId: null,
                replacementReason: null,
                voidedAt: null,
                voidedBy: null,
                voidedByName: null,
                voidReason: null,
                createdAt: '2026-04-22T10:00:00.000Z',
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: '2026-04-22T10:00:00.000Z',
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1,
                allowedActions: ['replace-project-archive-record', 'void-project-archive-record']
            }
        ]);
        expect(projectRepository.findProjectArchiveRecordsByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000011');
        expect(projectRepository.findPlatformUsersByIds).toHaveBeenCalledWith(['00000000-0000-4000-8000-000000000003']);
    });

    it('does not expose archive record actions for non-current records or users without write permission', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000011',
            currentStage: 'completed',
            status: 'completed'
        });
        projectRepository.findProjectArchiveRecordsByProjectId.mockResolvedValue([
            {
                id: '38000000-0000-4000-8000-000000000002',
                projectId: '20000000-0000-4000-8000-000000000011',
                archiveAnchorStage: 'completed',
                archiveAnchorSourceType: 'project-completion-record',
                archiveAnchorSourceId: '37000000-0000-4000-8000-000000000001',
                status: 'superseded',
                archivedAt: new Date('2026-04-22T10:00:00.000Z'),
                archivedBy: null,
                archiveSummary: '旧归档记录',
                evidenceSummary: '旧归档清单',
                createdAt: new Date('2026-04-22T10:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-04-23T10:00:00.000Z'),
                updatedBy: null,
                rowVersion: 2
            }
        ]);
        projectRepository.findPlatformUsersByIds.mockResolvedValue([]);

        const result = await service.listProjectArchiveRecords('20000000-0000-4000-8000-000000000011', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'viewer',
            permissions: ['project:read']
        });

        expect(result[0]?.allowedActions).toEqual([]);
    });

    it('lists bid commercial processes as project-scoped versioned facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000012'
        });
        projectRepository.findProjectBidCommercialProcessesByProjectId.mockResolvedValue([
            createBidCommercialProcess({
                id: '3a000000-0000-4000-8000-000000000002',
                projectId: '20000000-0000-4000-8000-000000000012',
                version: 2,
                supersedesId: '3a000000-0000-4000-8000-000000000001'
            })
        ]);

        await expect(service.listProjectBidCommercialProcesses('20000000-0000-4000-8000-000000000012')).resolves.toEqual([
            expect.objectContaining({
                id: '3a000000-0000-4000-8000-000000000002',
                projectId: '20000000-0000-4000-8000-000000000012',
                version: 2,
                supersedesId: '3a000000-0000-4000-8000-000000000001',
                bidMode: 'public-tender',
                currentStage: 'preparation',
                decision: 'participate',
                resultStatus: 'pending',
                effectiveAt: '2026-04-24T08:00:00.000Z'
            })
        ]);
        expect(projectRepository.findProjectBidCommercialProcessesByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000012');
    });

    it('returns an actionable bid commercial workspace when no current process exists', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000013',
            currentStage: 'commercial-closure',
            status: 'active',
            ownerOrgId: null,
            ownerUserId: null
        });
        projectRepository.findCurrentProjectBidCommercialProcessByProjectId.mockResolvedValue(null);

        const result = await service.getProjectBidCommercialWorkspace('20000000-0000-4000-8000-000000000013', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales',
            permissions: ['project:read', 'project:write']
        });

        expect(result.currentProcess).toBeNull();
        expect(result.materialItems).toEqual([]);
        expect(result.timelineItems).toEqual([]);
        expect(result.blockingReasons).toEqual(['尚未形成招投标 / 商务竞标过程记录。']);
        expect(result.nextStep).toBe('明确是否需要投标、邀标、比选、商务竞标或直接商务报价路径。');
        expect(result.allowedActions).toEqual(['view-bid-commercial-workspace', 'create-bid-commercial-process']);
    });

    it('projects current bid commercial process details into the workspace view', async () => {
        const processId = '3a000000-0000-4000-8000-000000000003';
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000014',
            currentStage: 'commercial-closure',
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: '00000000-0000-4000-8000-000000000001'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }]);
        projectRepository.findCurrentProjectBidCommercialProcessByProjectId.mockResolvedValue(
            createBidCommercialProcess({
                id: processId,
                projectId: '20000000-0000-4000-8000-000000000014',
                ownerRole: '商务负责人'
            })
        );
        projectRepository.findProjectBidCommercialMaterialItemsByProcessIds.mockResolvedValue([
            {
                id: '3b000000-0000-4000-8000-000000000001',
                processId,
                materialKey: 'bid-bond',
                label: '投标保证金确认',
                materialStatus: 'in-progress',
                responsibleRole: '商务负责人',
                dueAt: new Date('2026-04-26T08:00:00.000Z'),
                blocksNextStep: true,
                navigationHint: '/projects/current/workspace/bid-commercial',
                sortOrder: 1
            }
        ]);
        projectRepository.findProjectBidCommercialTimelineItemsByProcessIds.mockResolvedValue([
            {
                id: '3c000000-0000-4000-8000-000000000001',
                processId,
                eventKey: 'tender-announced',
                label: '招标公告',
                summary: '客户已发布招标公告。',
                timelineStatus: 'done',
                occurredAt: new Date('2026-04-24T02:00:00.000Z'),
                dueAt: null,
                responsibleRole: null,
                sortOrder: 1
            }
        ]);

        const result = await service.getProjectBidCommercialWorkspace('20000000-0000-4000-8000-000000000014', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales',
            permissions: ['project:read', 'project:write']
        });

        expect(projectRepository.findProjectBidCommercialMaterialItemsByProcessIds).toHaveBeenCalledWith([processId]);
        expect(projectRepository.findProjectBidCommercialTimelineItemsByProcessIds).toHaveBeenCalledWith([processId]);
        expect(result.currentProcess).toEqual(expect.objectContaining({ id: processId, ownerRole: '商务负责人' }));
        expect(result.materialItems).toEqual([
            expect.objectContaining({
                materialKey: 'bid-bond',
                materialStatus: 'in-progress',
                dueAt: '2026-04-26T08:00:00.000Z'
            })
        ]);
        expect(result.timelineItems).toEqual([
            expect.objectContaining({
                eventKey: 'tender-announced',
                occurredAt: '2026-04-24T02:00:00.000Z'
            })
        ]);
        expect(result.blockingReasons).toEqual(['投标保证金确认：材料仍在处理中']);
        expect(result.ownerLabel).toBe('销售人员 / 华南销售一部');
        expect(result.allowedActions).toEqual(['view-bid-commercial-workspace', 'create-bid-commercial-process']);
    });

    it('lists pricing margin reviews as project-scoped versioned facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000016'
        });
        projectRepository.findProjectPricingMarginReviewsByProjectId.mockResolvedValue([
            createPricingMarginReview({
                id: '3d000000-0000-4000-8000-000000000002',
                projectId: '20000000-0000-4000-8000-000000000016',
                version: 2,
                supersedesId: '3d000000-0000-4000-8000-000000000001'
            })
        ]);

        await expect(service.listProjectPricingMarginReviews('20000000-0000-4000-8000-000000000016')).resolves.toEqual([
            expect.objectContaining({
                id: '3d000000-0000-4000-8000-000000000002',
                projectId: '20000000-0000-4000-8000-000000000016',
                version: 2,
                supersedesId: '3d000000-0000-4000-8000-000000000001',
                technicalCostPackageId: '39000000-0000-4000-8000-000000000003',
                pricingPath: 'direct-commercial',
                quoteVersion: 'Q-2026-001',
                decision: 'pending',
                effectiveAt: '2026-04-24T08:00:00.000Z'
            })
        ]);
        expect(projectRepository.findProjectPricingMarginReviewsByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000016');
    });

    it('returns an actionable pricing margin workspace when no current review exists', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000017',
            currentStage: 'commercial-closure',
            status: 'active',
            ownerOrgId: null,
            ownerUserId: null
        });
        projectRepository.findCurrentProjectPricingMarginReviewByProjectId.mockResolvedValue(null);
        projectRepository.findCurrentProjectTechnicalCostPackageByProjectId.mockResolvedValue(
            createTechnicalCostPackage({
                id: '39000000-0000-4000-8000-000000000004',
                projectId: '20000000-0000-4000-8000-000000000017',
                allowNextStage: true,
                taxReviewStatus: 'reviewed',
                blockerCount: 0
            })
        );

        const result = await service.getProjectPricingMarginWorkspace('20000000-0000-4000-8000-000000000017', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales',
            permissions: ['project:read', 'project:write']
        });

        expect(result.currentReview).toBeNull();
        expect(result.technicalCostPackage).toEqual(expect.objectContaining({ id: '39000000-0000-4000-8000-000000000004' }));
        expect(result.bidCommercialProcess).toBeNull();
        expect(result.conditionItems).toEqual([]);
        expect(result.blockingReasons).toEqual(['尚未形成报价与毛利评审记录。']);
        expect(result.nextStep).toBe('基于当前技术成本和商务路径，形成报价、税务条件、回款条件与毛利评审结论。');
        expect(result.readyForContracting).toBe(false);
        expect(result.allowedActions).toEqual(['view-pricing-margin-workspace', 'create-pricing-margin-review']);
    });

    it('projects current pricing margin review into the workspace view', async () => {
        const reviewId = '3d000000-0000-4000-8000-000000000003';
        const packageId = '39000000-0000-4000-8000-000000000005';
        const processId = '3a000000-0000-4000-8000-000000000005';
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000018',
            currentStage: 'commercial-closure',
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: '00000000-0000-4000-8000-000000000001'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }]);
        projectRepository.findCurrentProjectPricingMarginReviewByProjectId.mockResolvedValue(
            createPricingMarginReview({
                id: reviewId,
                projectId: '20000000-0000-4000-8000-000000000018',
                technicalCostPackageId: packageId,
                bidCommercialProcessId: processId,
                pricingPath: 'bid',
                decision: 'conditional-release',
                readyForContracting: false,
                blockerCount: 1,
                ownerRole: '销售 / 财务'
            })
        );
        projectRepository.findProjectPricingMarginConditionItemsByReviewIds.mockResolvedValue([
            {
                id: '3e000000-0000-4000-8000-000000000001',
                reviewId,
                conditionKey: 'down-payment-risk',
                conditionType: 'payment',
                label: '首付款条件确认',
                conditionSummary: '首付款比例低于标准，需要财务确认。',
                conditionStatus: 'open',
                requiredForContracting: true,
                responsibleRole: '财务',
                dueAt: new Date('2026-04-27T08:00:00.000Z'),
                resolutionSummary: null,
                sortOrder: 1
            }
        ]);
        projectRepository.findProjectTechnicalCostPackageById.mockResolvedValue(
            createTechnicalCostPackage({
                id: packageId,
                projectId: '20000000-0000-4000-8000-000000000018'
            })
        );
        projectRepository.findProjectBidCommercialProcessById.mockResolvedValue(
            createBidCommercialProcess({
                id: processId,
                projectId: '20000000-0000-4000-8000-000000000018',
                resultStatus: 'won'
            })
        );

        const result = await service.getProjectPricingMarginWorkspace('20000000-0000-4000-8000-000000000018', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales',
            permissions: ['project:read', 'project:write']
        });

        expect(projectRepository.findProjectPricingMarginConditionItemsByReviewIds).toHaveBeenCalledWith([reviewId]);
        expect(projectRepository.findProjectTechnicalCostPackageById).toHaveBeenCalledWith(packageId);
        expect(projectRepository.findProjectBidCommercialProcessById).toHaveBeenCalledWith(processId);
        expect(result.currentReview).toEqual(expect.objectContaining({ id: reviewId, decision: 'conditional-release' }));
        expect(result.technicalCostPackage).toEqual(expect.objectContaining({ id: packageId }));
        expect(result.bidCommercialProcess).toEqual(expect.objectContaining({ id: processId, resultStatus: 'won' }));
        expect(result.conditionItems).toEqual([
            expect.objectContaining({
                conditionKey: 'down-payment-risk',
                conditionStatus: 'open',
                dueAt: '2026-04-27T08:00:00.000Z'
            })
        ]);
        expect(result.blockingReasons).toEqual(['首付款条件确认：首付款比例低于标准，需要财务确认。']);
        expect(result.nextStep).toBe('先处理报价结论、升级审批或条件放行阻断，再进入签约就绪。');
        expect(result.readyForContracting).toBe(false);
        expect(result.ownerLabel).toBe('销售人员 / 华南销售一部');
        expect(result.allowedActions).toEqual(['view-pricing-margin-workspace', 'create-pricing-margin-review']);
    });

    it('lists technical cost packages as project-scoped versioned facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000013'
        });
        projectRepository.findProjectTechnicalCostPackagesByProjectId.mockResolvedValue([
            {
                id: '39000000-0000-4000-8000-000000000002',
                projectId: '20000000-0000-4000-8000-000000000013',
                version: 2,
                isCurrent: true,
                supersedesId: '39000000-0000-4000-8000-000000000001',
                status: 'effective',
                technicalFeasibilityDecision: 'conditional',
                technicalConclusionSummary: '范围可实施，但集成风险需跟踪。',
                allowNextStage: false,
                currencyCode: 'CNY',
                totalEstimatedAmountExcludingTax: '15000.00',
                totalTaxCostAmount: '900.00',
                totalEstimatedAmountIncludingTax: '15900.00',
                taxAssumptionSummary: '按 6% 增值税估算。',
                taxReviewStatus: 'pending',
                highestRiskLevel: 'R3',
                blockerCount: 2,
                effectiveAt: new Date('2026-04-24T08:00:00.000Z'),
                createdAt: new Date('2026-04-24T08:00:00.000Z'),
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: new Date('2026-04-24T08:00:00.000Z'),
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);

        await expect(service.listProjectTechnicalCostPackages('20000000-0000-4000-8000-000000000013')).resolves.toEqual([
            {
                id: '39000000-0000-4000-8000-000000000002',
                projectId: '20000000-0000-4000-8000-000000000013',
                version: 2,
                isCurrent: true,
                supersedesId: '39000000-0000-4000-8000-000000000001',
                status: 'effective',
                technicalFeasibilityDecision: 'conditional',
                technicalConclusionSummary: '范围可实施，但集成风险需跟踪。',
                allowNextStage: false,
                currencyCode: 'CNY',
                totalEstimatedAmountExcludingTax: '15000.00',
                totalTaxCostAmount: '900.00',
                totalEstimatedAmountIncludingTax: '15900.00',
                taxAssumptionSummary: '按 6% 增值税估算。',
                taxReviewStatus: 'pending',
                highestRiskLevel: 'R3',
                blockerCount: 2,
                effectiveAt: '2026-04-24T08:00:00.000Z',
                createdAt: '2026-04-24T08:00:00.000Z',
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: '2026-04-24T08:00:00.000Z',
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);
        expect(projectRepository.findProjectTechnicalCostPackagesByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000013');
    });

    it('returns an actionable technical cost workspace when no current package exists', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000014',
            currentStage: 'scope-confirmation',
            status: 'active',
            ownerOrgId: null,
            ownerUserId: null
        });

        const result = await service.getProjectTechnicalCostWorkspace('20000000-0000-4000-8000-000000000014', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read', 'project:write']
        });

        expect(result.currentPackage).toBeNull();
        expect(result.scopeItems).toEqual([]);
        expect(result.riskItems).toEqual([]);
        expect(result.costItems).toEqual([]);
        expect(result.blockingReasons).toEqual(['尚未形成技术与成本测算版本包。']);
        expect(result.nextStep).toBe('补齐技术可行性、范围边界、风险项和成本税务估算。');
        expect(result.ownerLabel).toBe('技术支持 / 售前');
        expect(result.allowedActions).toEqual(['view-technical-cost-workspace', 'create-technical-cost-package']);
    });

    it('projects current technical cost package details into the workspace view', async () => {
        const packageId = '39000000-0000-4000-8000-000000000003';
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000015',
            currentStage: 'scope-confirmation',
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: '00000000-0000-4000-8000-000000000001'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }]);
        projectRepository.findCurrentProjectTechnicalCostPackageByProjectId.mockResolvedValue({
            id: packageId,
            projectId: '20000000-0000-4000-8000-000000000015',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            technicalFeasibilityDecision: 'conditional',
            technicalConclusionSummary: '可实施但需关闭接口风险。',
            allowNextStage: false,
            currencyCode: 'CNY',
            totalEstimatedAmountExcludingTax: '15000.00',
            totalTaxCostAmount: '900.00',
            totalEstimatedAmountIncludingTax: '15900.00',
            taxAssumptionSummary: '按 6% 增值税估算。',
            taxReviewStatus: 'pending',
            highestRiskLevel: 'R3',
            blockerCount: 2,
            effectiveAt: new Date('2026-04-24T08:00:00.000Z'),
            createdAt: new Date('2026-04-24T08:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000003',
            updatedAt: new Date('2026-04-24T08:00:00.000Z'),
            updatedBy: '00000000-0000-4000-8000-000000000003',
            rowVersion: 1
        });
        projectRepository.findProjectTechnicalScopeItemsByPackageIds.mockResolvedValue([
            {
                id: '39100000-0000-4000-8000-000000000001',
                packageId,
                scopeType: 'in-scope',
                label: '核心接口联调',
                description: '覆盖签约前必须确认的接口范围。',
                sortOrder: 1
            }
        ]);
        projectRepository.findProjectTechnicalRiskItemsByPackageIds.mockResolvedValue([
            {
                id: '39200000-0000-4000-8000-000000000001',
                packageId,
                riskCategory: '集成风险',
                riskLevel: 'R3',
                riskDescription: '客户接口文档尚未冻结。',
                impactScope: '影响报价边界。',
                mitigationPlan: '推动接口清单冻结。',
                ownerRole: '售前技术负责人',
                riskStatus: 'open',
                blocksNextStage: true,
                sortOrder: 1
            }
        ]);
        projectRepository.findProjectTechnicalCostItemsByPackageIds.mockResolvedValue([
            {
                id: '39300000-0000-4000-8000-000000000001',
                packageId,
                costCategory: '人力',
                costSubcategory: '售前支持',
                costDescription: '售前技术方案与接口联调评估。',
                estimationBasis: '2 人 5 天。',
                quantity: '10.0000',
                unit: 'person-day',
                unitPrice: '1500.0000',
                amountExcludingTax: '15000.00',
                taxCostAmount: '900.00',
                amountIncludingTax: '15900.00',
                currencyCode: 'CNY',
                confidenceLevel: 'medium',
                highUncertainty: true,
                responsibleRole: '售前技术负责人',
                sortOrder: 1
            }
        ]);

        const result = await service.getProjectTechnicalCostWorkspace('20000000-0000-4000-8000-000000000015', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read', 'project:write']
        });

        expect(projectRepository.findProjectTechnicalScopeItemsByPackageIds).toHaveBeenCalledWith([packageId]);
        expect(projectRepository.findProjectTechnicalRiskItemsByPackageIds).toHaveBeenCalledWith([packageId]);
        expect(projectRepository.findProjectTechnicalCostItemsByPackageIds).toHaveBeenCalledWith([packageId]);
        expect(result.currentPackage).toEqual(
            expect.objectContaining({
                id: packageId,
                totalEstimatedAmountIncludingTax: '15900.00',
                blockerCount: 2
            })
        );
        expect(result.scopeItems).toEqual([
            expect.objectContaining({
                scopeType: 'in-scope',
                label: '核心接口联调'
            })
        ]);
        expect(result.riskItems).toEqual([
            expect.objectContaining({
                riskLevel: 'R3',
                blocksNextStage: true
            })
        ]);
        expect(result.costItems).toEqual([
            expect.objectContaining({
                costCategory: '人力',
                amountIncludingTax: '15900.00'
            })
        ]);
        expect(result.blockingReasons).toEqual(['技术与成本版本包尚未允许进入下一阶段。', '集成风险：客户接口文档尚未冻结。', '税务成本假设仍待复核。']);
        expect(result.nextStep).toBe('先完成税务成本复核，再判断是否进入商务收口。');
        expect(result.ownerLabel).toBe('销售人员 / 华南销售一部');
        expect(result.allowedActions).toEqual(['view-technical-cost-workspace', 'create-technical-cost-package']);
    });

    it('projects latest accepted acceptance record into project timeline', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000008',
            projectNo: 'PRJ-2026-008',
            currentStage: 'acceptance',
            status: 'active',
            closedAt: null,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000001',
            updatedBy: '00000000-0000-4000-8000-000000000001'
        });
        projectRepository.findContractsByProjectId.mockResolvedValue([]);
        projectRepository.findLatestConfirmedHandoverByProjectId.mockResolvedValue(null);
        projectRepository.findLatestAcceptedAcceptanceRecordByProjectId.mockResolvedValue({
            id: '36000000-0000-4000-8000-000000000002',
            projectId: '20000000-0000-4000-8000-000000000008',
            acceptanceType: 'final-acceptance',
            acceptanceResult: 'accepted',
            status: 'confirmed',
            scopeSummary: '最终验收范围',
            evidenceSummary: '最终验收单',
            confirmedAt: new Date('2026-04-19T10:00:00.000Z'),
            confirmedBy: '00000000-0000-4000-8000-000000000003'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' },
            { id: '00000000-0000-4000-8000-000000000003', displayName: '业务确认人' }
        ]);

        const result = await service.getProjectTimeline('20000000-0000-4000-8000-000000000008');

        expect(result.events).toEqual([
            expect.objectContaining({
                eventKey: 'project-created',
                stage: 'assessment'
            }),
            {
                eventKey: 'acceptance-confirmed:36000000-0000-4000-8000-000000000002',
                stage: 'acceptance',
                stageLabel: '验收确认',
                eventType: 'stage-completed',
                occurredAt: '2026-04-19T10:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000003',
                actorName: '业务确认人',
                resultLabel: '最终验收已通过',
                sourceType: 'acceptance-record',
                sourceId: '36000000-0000-4000-8000-000000000002',
                evidenceLabel: '最终验收单',
                isAuthoritative: true
            }
        ]);
    });

    it('projects latest confirmed completion record into project timeline', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000010',
            projectNo: 'PRJ-2026-010',
            currentStage: 'completed',
            status: 'completed',
            closedAt: null,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000001',
            updatedBy: '00000000-0000-4000-8000-000000000003'
        });
        projectRepository.findContractsByProjectId.mockResolvedValue([]);
        projectRepository.findLatestConfirmedHandoverByProjectId.mockResolvedValue(null);
        projectRepository.findLatestAcceptedAcceptanceRecordByProjectId.mockResolvedValue(null);
        projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId.mockResolvedValue({
            id: '37000000-0000-4000-8000-000000000002',
            projectId: '20000000-0000-4000-8000-000000000010',
            acceptanceRecordId: '36000000-0000-4000-8000-000000000002',
            completionResult: 'completed',
            status: 'confirmed',
            completedAt: new Date('2026-04-20T10:00:00.000Z'),
            completedBy: '00000000-0000-4000-8000-000000000003',
            completionSummary: '项目交付完成',
            evidenceSummary: '完成确认单'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' },
            { id: '00000000-0000-4000-8000-000000000003', displayName: '项目经理' }
        ]);

        const result = await service.getProjectTimeline('20000000-0000-4000-8000-000000000010');

        expect(projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000010');
        expect(result.events).toEqual([
            expect.objectContaining({
                eventKey: 'project-created',
                stage: 'assessment'
            }),
            {
                eventKey: 'project-completed:37000000-0000-4000-8000-000000000002',
                stage: 'completed',
                stageLabel: '已完成',
                eventType: 'stage-completed',
                occurredAt: '2026-04-20T10:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000003',
                actorName: '项目经理',
                resultLabel: '项目已完成',
                sourceType: 'project-completion-record',
                sourceId: '37000000-0000-4000-8000-000000000002',
                evidenceLabel: '完成确认单',
                isAuthoritative: true
            }
        ]);
    });

    it('projects latest archive record into project timeline as terminal milestone', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000012',
            projectNo: 'PRJ-2026-012',
            currentStage: 'completed',
            status: 'completed',
            closedAt: null,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000001',
            updatedBy: '00000000-0000-4000-8000-000000000003'
        });
        projectRepository.findContractsByProjectId.mockResolvedValue([]);
        projectRepository.findLatestConfirmedHandoverByProjectId.mockResolvedValue(null);
        projectRepository.findLatestAcceptedAcceptanceRecordByProjectId.mockResolvedValue(null);
        projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId.mockResolvedValue({
            id: '37000000-0000-4000-8000-000000000003',
            projectId: '20000000-0000-4000-8000-000000000012',
            acceptanceRecordId: '36000000-0000-4000-8000-000000000003',
            completionResult: 'completed',
            status: 'confirmed',
            completedAt: new Date('2026-04-20T10:00:00.000Z'),
            completedBy: '00000000-0000-4000-8000-000000000003',
            completionSummary: '项目交付完成',
            evidenceSummary: '完成确认单'
        });
        projectRepository.findLatestRecordedProjectArchiveRecordByProjectId.mockResolvedValue({
            id: '38000000-0000-4000-8000-000000000002',
            projectId: '20000000-0000-4000-8000-000000000012',
            archiveAnchorStage: 'completed',
            archiveAnchorSourceType: 'project-completion-record',
            archiveAnchorSourceId: '37000000-0000-4000-8000-000000000003',
            status: 'recorded',
            archivedAt: new Date('2026-04-22T10:00:00.000Z'),
            archivedBy: '00000000-0000-4000-8000-000000000004',
            archiveSummary: '项目资料归档完成',
            evidenceSummary: '归档清单与交付包'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' },
            { id: '00000000-0000-4000-8000-000000000003', displayName: '项目经理' },
            { id: '00000000-0000-4000-8000-000000000004', displayName: '档案管理员' }
        ]);

        const result = await service.getProjectTimeline('20000000-0000-4000-8000-000000000012');

        expect(projectRepository.findLatestRecordedProjectArchiveRecordByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000012');
        expect(result.events).toEqual([
            expect.objectContaining({
                eventKey: 'project-created',
                stage: 'assessment'
            }),
            {
                eventKey: 'project-completed:37000000-0000-4000-8000-000000000003',
                stage: 'completed',
                stageLabel: '已完成',
                eventType: 'stage-completed',
                occurredAt: '2026-04-20T10:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000003',
                actorName: '项目经理',
                resultLabel: '项目已完成',
                sourceType: 'project-completion-record',
                sourceId: '37000000-0000-4000-8000-000000000003',
                evidenceLabel: '完成确认单',
                isAuthoritative: true
            },
            {
                eventKey: 'project-archived:38000000-0000-4000-8000-000000000002',
                stage: 'completed',
                stageLabel: '已完成',
                eventType: 'milestone',
                occurredAt: '2026-04-22T10:00:00.000Z',
                actorUserId: '00000000-0000-4000-8000-000000000004',
                actorName: '档案管理员',
                resultLabel: '项目归档：项目资料归档完成',
                sourceType: 'project-archive-record',
                sourceId: '38000000-0000-4000-8000-000000000002',
                evidenceLabel: '归档清单与交付包',
                isAuthoritative: true
            }
        ]);
    });

    it('rejects project timeline when project does not exist', async () => {
        projectRepository.findById.mockResolvedValue(null);

        await expect(service.getProjectTimeline('20000000-0000-4000-8000-000000000006')).rejects.toThrow('Project 20000000-0000-4000-8000-000000000006 not found');
    });

    function createTechnicalCostPackage(overrides: Record<string, unknown> = {}) {
        return {
            id: '39000000-0000-4000-8000-000000000003',
            projectId: '20000000-0000-4000-8000-000000000001',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            technicalFeasibilityDecision: 'conditional',
            technicalConclusionSummary: '范围可实施，但集成风险需跟踪。',
            allowNextStage: true,
            currencyCode: 'CNY',
            totalEstimatedAmountExcludingTax: '15000.00',
            totalTaxCostAmount: '900.00',
            totalEstimatedAmountIncludingTax: '15900.00',
            taxAssumptionSummary: '按 6% 增值税估算。',
            taxReviewStatus: 'reviewed',
            highestRiskLevel: 'R3',
            blockerCount: 0,
            effectiveAt: new Date('2026-04-24T08:00:00.000Z'),
            createdAt: new Date('2026-04-24T08:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000003',
            updatedAt: new Date('2026-04-24T08:00:00.000Z'),
            updatedBy: '00000000-0000-4000-8000-000000000003',
            rowVersion: 1,
            ...overrides
        };
    }

    function createPricingMarginReview(overrides: Record<string, unknown> = {}) {
        return {
            id: '3d000000-0000-4000-8000-000000000001',
            projectId: '20000000-0000-4000-8000-000000000001',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            technicalCostPackageId: '39000000-0000-4000-8000-000000000003',
            bidCommercialProcessId: null,
            commercialReleaseBaselineId: null,
            pricingPath: 'direct-commercial',
            quoteVersion: 'Q-2026-001',
            currencyCode: 'CNY',
            quoteAmountTaxInclusive: '11300.00',
            quoteAmountTaxExclusive: '10000.00',
            taxRate: '0.13000000',
            taxConditionSummary: '按 13% 增值税报价。',
            paymentTermsSummary: '首付款 30%，验收后 60%，质保金 10%。',
            grossMarginRate: '0.28000000',
            grossMarginBand: 'watch',
            grossMarginSummary: '毛利率处于关注区间。',
            decision: 'pending',
            decisionSummary: '待完成报价评审。',
            approvalScenarioKey: null,
            summaryPackageKey: null,
            summarySnapshotId: null,
            projectionLevel: null,
            exportPolicy: null,
            readyForContracting: false,
            ownerRole: '销售 / 财务',
            blockerCount: 1,
            effectiveAt: new Date('2026-04-24T08:00:00.000Z'),
            createdAt: new Date('2026-04-24T08:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000003',
            updatedAt: new Date('2026-04-24T08:00:00.000Z'),
            updatedBy: '00000000-0000-4000-8000-000000000003',
            rowVersion: 1,
            ...overrides
        };
    }

    function createBidCommercialProcess(overrides: Record<string, unknown> = {}) {
        return {
            id: '3a000000-0000-4000-8000-000000000001',
            projectId: '20000000-0000-4000-8000-000000000001',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            bidMode: 'public-tender',
            currentStage: 'preparation',
            decision: 'participate',
            resultStatus: 'pending',
            processSummary: '公开招标资料准备中。',
            decisionSummary: '客户要求正式投标，决定参与。',
            resultSummary: null,
            ownerRole: '商务负责人',
            blockerCount: 0,
            effectiveAt: new Date('2026-04-24T08:00:00.000Z'),
            createdAt: new Date('2026-04-24T08:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000003',
            updatedAt: new Date('2026-04-24T08:00:00.000Z'),
            updatedBy: '00000000-0000-4000-8000-000000000003',
            rowVersion: 1,
            ...overrides
        };
    }
});
