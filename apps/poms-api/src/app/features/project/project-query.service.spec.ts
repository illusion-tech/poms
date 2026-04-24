import { ProjectQueryService } from './project-query.service';

describe('ProjectQueryService', () => {
    let service: ProjectQueryService;
    let projectRepository: {
        findById: jest.Mock;
        findMany: jest.Mock;
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
    };
    let approvalSummarySnapshotRepository: { findActiveByTarget: jest.Mock };

    beforeEach(() => {
        projectRepository = {
            findById: jest.fn(),
            findMany: jest.fn(),
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
            findLatestRecordedProjectArchiveRecordByProjectId: jest.fn()
        };
        projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId.mockResolvedValue(null);
        projectRepository.findLatestRecordedProjectArchiveRecordByProjectId.mockResolvedValue(null);
        approvalSummarySnapshotRepository = { findActiveByTarget: jest.fn() };

        service = new ProjectQueryService(projectRepository as never, approvalSummarySnapshotRepository as never);
    });

    it('builds project list views with business names and latest milestone time', async () => {
        projectRepository.findMany.mockResolvedValue([
            {
                id: '20000000-0000-4000-8000-000000000001',
                projectCode: 'PRJ-2026-001',
                projectName: 'POMS 首期项目主链路样例',
                customerName: '华南地铁集团',
                currentStage: 'contracting',
                status: 'active',
                ownerOrgId: '10000000-0000-4000-8000-000000000001',
                ownerUserId: '00000000-0000-4000-8000-000000000001',
                closedAt: null,
                createdAt: new Date('2026-04-01T00:00:00.000Z')
            }
        ]);
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }
        ]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([
            { id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }
        ]);
        projectRepository.findLatestSignedContractAtByProjectIds.mockResolvedValue(
            new Map([['20000000-0000-4000-8000-000000000001', new Date('2026-04-18T08:00:00.000Z')]])
        );

        await expect(service.listProjects({ keyword: 'POMS' })).resolves.toEqual([
            {
                id: '20000000-0000-4000-8000-000000000001',
                projectCode: 'PRJ-2026-001',
                projectName: 'POMS 首期项目主链路样例',
                customerName: '华南地铁集团',
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
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerId: null,
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
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }
        ]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([
            { id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }
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

        expect(approvalSummarySnapshotRepository.findActiveByTarget).toHaveBeenCalledWith(
            'Project',
            '20000000-0000-4000-8000-000000000001',
            'project-detail',
            'project-detail'
        );
        expect(result.ownerName).toBe('销售人员');
        expect(result.ownerOrgName).toBe('华南销售一部');
        expect(result.currentContractSummary).toEqual({
            activeContractCount: 1,
            latestContractId: '30000000-0000-4000-8000-000000000001',
            latestContractNo: 'CT-2026-001',
            latestContractStatus: 'active',
            signedAmount: '12345.67',
            currencyCode: 'CNY',
            signedAt: '2026-04-18T08:00:00.000Z',
            currentSnapshotId: '31000000-0000-4000-8000-000000000001'
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
        expect(result.allowedActions).toEqual(['view-project-workspace', 'edit-project-basic-info', 'manage-project-commission']);
    });

    it('keeps write and commission actions hidden for closed read-only project detail', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000002',
            projectCode: 'PRJ-2026-002',
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
            projectCode: 'PRJ-2026-003',
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
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }
        ]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([
            { id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }
        ]);
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
            projectCode: 'PRJ-2026-006',
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
            permissions: ['project:read']
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
                })
            ])
        );
    });

    it('keeps blocked pre-signing workspace guidance readable without inventing a missing workspace', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000004',
            projectCode: 'PRJ-2026-004',
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
                })
            ])
        );
    });

    it('builds project timeline from authoritative project, contract, handover and close facts', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000005',
            projectCode: 'PRJ-2026-005',
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
        expect(projectRepository.findPlatformUsersByIds).toHaveBeenCalledWith([
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002',
            '00000000-0000-4000-8000-000000000003',
            '00000000-0000-4000-8000-000000000004'
        ]);
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
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000003', displayName: '项目经理' }
        ]);

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
            id: '20000000-0000-4000-8000-000000000011'
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
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000003', displayName: '项目经理' }
        ]);

        await expect(service.listProjectArchiveRecords('20000000-0000-4000-8000-000000000011')).resolves.toEqual([
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
                createdAt: '2026-04-22T10:00:00.000Z',
                createdBy: '00000000-0000-4000-8000-000000000003',
                updatedAt: '2026-04-22T10:00:00.000Z',
                updatedBy: '00000000-0000-4000-8000-000000000003',
                rowVersion: 1
            }
        ]);
        expect(projectRepository.findProjectArchiveRecordsByProjectId).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000011');
        expect(projectRepository.findPlatformUsersByIds).toHaveBeenCalledWith(['00000000-0000-4000-8000-000000000003']);
    });

    it('projects latest accepted acceptance record into project timeline', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000008',
            projectCode: 'PRJ-2026-008',
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
            projectCode: 'PRJ-2026-010',
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
            projectCode: 'PRJ-2026-012',
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

        await expect(service.getProjectTimeline('20000000-0000-4000-8000-000000000006')).rejects.toThrow(
            'Project 20000000-0000-4000-8000-000000000006 not found'
        );
    });
});
