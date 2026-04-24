import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
    CommissionApi,
    CommissionRoleAssignmentsApi,
    ContractReadinessApi,
    ProjectApi,
    ProjectCostApi,
    ProjectHandoverApi,
    ProjectWorkspaceStore,
    type BusinessAccountingFeedbackView,
    type CommissionFinalSettlementView,
    type CommissionRoleAssignmentDetailView,
    type CommissionRoleAssignmentSummary,
    type CommissionRuleExplanationView,
    type ContractHandoverSummaryView,
    type ContractReadinessDetail,
    type ProjectHandoverDetailView,
    type ProjectBusinessOutcomeOverviewView,
    type ProjectUnifiedAccountingView,
    type ProjectVarianceRiskExplanationView,
    type ProjectWorkspaceGuidanceView
} from '@poms/admin-data-access';
import { of, throwError } from 'rxjs';

describe('ProjectWorkspaceStore', () => {
    let store: ProjectWorkspaceStore;
    const freezeVersionSummary = {
        id: 'freeze-1',
        projectId: 'project-1',
        version: 3,
        rowVersion: 1,
        isCurrent: true,
        status: 'frozen' as const,
        participantsJson: [
            {
                userId: 'user-1',
                displayName: 'Alice',
                roleType: 'project-owner',
                weight: 100
            }
        ],
        sourceHandoverId: null,
        sourceHandoverRebaselineRecordId: null,
        contractSummarySnapshotId: null,
        handoverSummarySnapshotId: null,
        effectiveHandoverBaselineSnapshotId: null,
        frozenAt: '2026-04-18T10:00:00.000Z',
        createdAt: '2026-04-18T10:00:00.000Z',
        updatedAt: '2026-04-18T10:00:00.000Z'
    };
    const currentRoleAssignmentSummary = freezeVersionSummary as CommissionRoleAssignmentSummary;
    const roleAssignmentDetail: CommissionRoleAssignmentDetailView = {
        roleAssignmentId: 'freeze-1',
        projectId: 'project-1',
        freezeVersionSummary: currentRoleAssignmentSummary,
        sourceHandoverId: 'handover-1',
        contractSummarySnapshotId: 'contract-summary-1',
        handoverSummarySnapshotId: 'handover-summary-1',
        effectiveHandoverBaselineSummary: {
            status: 'available',
            baselineSnapshotId: 'handover-baseline-1',
            sourceType: 'contract-readiness',
            sourceId: 'readiness-1',
            summary: '合同承接基线已稳定'
        },
        receiptJudgmentModeSummary: {
            status: 'frozen',
            receiptJudgmentMode: 'confirmed-receipt',
            sourceType: 'project-handover',
            sourceId: 'handover-1',
            summary: '按移交确认冻结回款判断口径'
        },
        summaryPackageKey: 'commission-freeze-binding',
        summarySnapshotId: 'freeze-summary-1',
        projectionLevel: 'commission-freeze',
        exportPolicy: 'internal',
        allowedActions: ['freeze-commission-role-assignment'],
        generatedAt: '2026-04-20T10:20:00.000Z'
    };
    const workspaceGuidance: ProjectWorkspaceGuidanceView = {
        projectId: 'project-1',
        currentStage: 'handover',
        status: 'active',
        currentStageLabel: '项目移交',
        statusLabel: '正常推进',
        headline: '后端返回的工作区引导',
        currentFocus: '先完成移交和经营快照确认',
        currentGap: '缺少回款确认',
        nextStep: '请财务补齐回款确认后再继续',
        ownerLabel: '财务负责人',
        blockingReasons: ['缺少回款确认'],
        basisSummary: {
            summarySnapshotId: 'summary-1',
            projectionLevel: 'workspace-guidance',
            exportPolicy: 'internal',
            generatedAt: '2026-04-20T08:00:00.000Z'
        },
        recommendedEntries: [
            {
                key: 'workspace-home',
                label: '工作区总览',
                description: '查看当前阶段、缺口和下一步。',
                route: '/projects/project-1/workspace',
                enabled: true,
                disabledReason: null,
                actionKey: 'view-project-workspace'
            },
            {
                key: 'commission-operations',
                label: '提成操作',
                description: '处理提成规则、计算、发放和调整。',
                route: null,
                enabled: false,
                disabledReason: '需要完整的提成治理操作权限。',
                actionKey: 'manage-project-commission'
            }
        ],
        generatedAt: '2026-04-20T08:00:00.000Z'
    };
    const contractReadiness = {
        id: 'readiness-1',
        projectId: 'project-1',
        sourceBaselineId: 'baseline-source-1',
        commercialReleaseBaselineId: 'commercial-baseline-1',
        latestDiffResultId: 'diff-1',
        diffLevel: 'prompt',
        reviewStatus: 'not-required',
        packageStatus: 'conditional',
        guardDecision: 'review-required',
        currentEffectiveDecisionSummary: '合同前置事实基本齐备，仍需复核付款条件。',
        blockingReasonSummary: '付款条件调整需要复核。',
        missingPrerequisiteCount: 1,
        initializedContractSnapshotId: null,
        initializedReceivablePlanVersionId: null,
        contractSnapshotInitializedAt: null,
        receivablePlanInitializedAt: null,
        isCurrent: true,
        rowVersion: 2,
        createdAt: '2026-04-20T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-20T09:00:00.000Z',
        updatedBy: 'user-1',
        allowedActions: ['review-commercial-release-baseline-diff'],
        items: [
            {
                id: 'item-1',
                itemType: 'blocking-reason',
                itemKey: 'payment-term-review',
                label: '付款条件复核',
                summary: '合同付款条件相对商业放行基线发生调整。',
                status: 'blocked',
                responsibleRole: '财务负责人',
                navigationHint: '复核商业放行差异',
                sortOrder: 10
            }
        ]
    } as ContractReadinessDetail;
    let projectApiMock: {
        projectControllerGetWorkspaceGuidance: jest.Mock;
    };
    let projectCostApiMock: {
        projectCostControllerGetProjectBusinessOutcomeOverview: jest.Mock;
        projectCostControllerGetProjectUnifiedAccounting: jest.Mock;
        projectCostControllerGetProjectVarianceRiskExplanation: jest.Mock;
        projectCostControllerGetBusinessAccountingFeedback: jest.Mock;
    };
    let projectHandoverApiMock: {
        projectHandoverControllerGetContractHandoverSummary: jest.Mock;
        projectHandoverControllerGetProjectHandoverDetailByProject: jest.Mock;
    };
    let contractReadinessApiMock: {
        contractReadinessControllerGetCurrentContractReadiness: jest.Mock;
    };
    let commissionApiMock: {
        commissionControllerGetCurrentRoleAssignment: jest.Mock;
        commissionControllerGetCommissionFinalSettlement: jest.Mock;
        commissionControllerGetCommissionRuleExplanation: jest.Mock;
    };
    let commissionRoleAssignmentsApiMock: {
        commissionRoleAssignmentControllerGetRoleAssignmentDetail: jest.Mock;
    };

    beforeEach(() => {
        projectApiMock = {
            projectControllerGetWorkspaceGuidance: jest.fn()
        };
        projectCostApiMock = {
            projectCostControllerGetProjectBusinessOutcomeOverview: jest.fn(),
            projectCostControllerGetProjectUnifiedAccounting: jest.fn(),
            projectCostControllerGetProjectVarianceRiskExplanation: jest.fn(),
            projectCostControllerGetBusinessAccountingFeedback: jest.fn()
        };
        projectHandoverApiMock = {
            projectHandoverControllerGetContractHandoverSummary: jest.fn(),
            projectHandoverControllerGetProjectHandoverDetailByProject: jest.fn()
        };
        contractReadinessApiMock = {
            contractReadinessControllerGetCurrentContractReadiness: jest.fn()
        };
        commissionApiMock = {
            commissionControllerGetCurrentRoleAssignment: jest.fn(),
            commissionControllerGetCommissionFinalSettlement: jest.fn(),
            commissionControllerGetCommissionRuleExplanation: jest.fn()
        };
        commissionRoleAssignmentsApiMock = {
            commissionRoleAssignmentControllerGetRoleAssignmentDetail: jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectWorkspaceStore,
                {
                    provide: ProjectApi,
                    useValue: projectApiMock
                },
                {
                    provide: ProjectCostApi,
                    useValue: projectCostApiMock
                },
                {
                    provide: ProjectHandoverApi,
                    useValue: projectHandoverApiMock
                },
                {
                    provide: ContractReadinessApi,
                    useValue: contractReadinessApiMock
                },
                {
                    provide: CommissionApi,
                    useValue: commissionApiMock
                },
                {
                    provide: CommissionRoleAssignmentsApi,
                    useValue: commissionRoleAssignmentsApiMock
                }
            ]
        });

        store = TestBed.inject(ProjectWorkspaceStore);
    });

    it('loads workspace guidance into shared state', async () => {
        projectApiMock.projectControllerGetWorkspaceGuidance.mockReturnValue(of(workspaceGuidance));

        await expect(store.loadGuidance('project-1')).resolves.toEqual(workspaceGuidance);

        expect(projectApiMock.projectControllerGetWorkspaceGuidance).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.guidance()).toEqual(workspaceGuidance);
        expect(store.hasGuidance()).toBe(true);
        expect(store.guidanceError()).toBeNull();
    });

    it('maps 404 guidance responses to a user-readable blocker message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectApiMock.projectControllerGetWorkspaceGuidance.mockReturnValue(throwError(() => notFound));

        await expect(store.loadGuidance('project-404')).rejects.toBe(notFound);

        expect(store.guidance()).toBeNull();
        expect(store.hasGuidance()).toBe(false);
        expect(store.guidanceError()).toBe('当前项目还没有形成工作区引导，请先确认项目是否存在并具备查看权限。');
    });

    it('loads current contract readiness for pre-signing overview', async () => {
        contractReadinessApiMock.contractReadinessControllerGetCurrentContractReadiness.mockReturnValue(of(contractReadiness));

        await expect(store.loadPreSigningOverview('project-1')).resolves.toEqual(contractReadiness);

        expect(contractReadinessApiMock.contractReadinessControllerGetCurrentContractReadiness).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.contractReadiness()).toEqual(contractReadiness);
        expect(store.hasContractReadiness()).toBe(true);
        expect(store.preSigningError()).toBeNull();
    });

    it('treats missing current contract readiness as an empty pre-signing gap', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        contractReadinessApiMock.contractReadinessControllerGetCurrentContractReadiness.mockReturnValue(throwError(() => notFound));

        await expect(store.loadPreSigningOverview('project-empty')).resolves.toBeNull();

        expect(store.contractReadiness()).toBeNull();
        expect(store.hasContractReadiness()).toBe(false);
        expect(store.preSigningError()).toBeNull();
    });

    it('loads contract handover and project handover detail into shared state', async () => {
        const contractHandoverSummary = {
            projectId: 'project-1',
            projectCode: 'PRJ-001',
            projectName: '合同承接项目',
            effectiveContractSetSummary: {
                activeContractCount: 1,
                activeContractIds: ['contract-1'],
                contractNos: ['HT-001'],
                totalSignedAmount: '200000.00',
                currencyCodes: ['CNY'],
                earliestSignedAt: '2026-04-20T08:00:00.000Z',
                latestSignedAt: '2026-04-20T08:00:00.000Z',
                contracts: [
                    {
                        id: 'contract-1',
                        contractNo: 'HT-001',
                        status: 'active',
                        signedAmount: '200000.00',
                        currencyCode: 'CNY',
                        currentSnapshotId: 'snapshot-1',
                        signedAt: '2026-04-20T08:00:00.000Z'
                    }
                ]
            },
            contractBaselineValidationSummary: {
                status: 'ready',
                readinessPackageId: 'readiness-1',
                sourceBaselineId: 'baseline-1',
                latestDiffResultId: 'diff-1',
                diffLevel: 'no-diff',
                reviewStatus: 'approved',
                packageStatus: 'ready',
                guardDecision: 'pass',
                initializedContractSnapshotId: 'snapshot-1',
                contractSnapshotInitializedAt: '2026-04-20T09:00:00.000Z',
                blockingReasonSummary: null,
                missingPrerequisiteCount: 0
            },
            currentHandoverBaselineSummary: {
                status: 'available',
                baselineSnapshotId: 'handover-baseline-1',
                sourceType: 'contract-readiness',
                sourceId: 'readiness-1',
                summary: '合同承接基线已稳定'
            },
            latestHandoverRebaselineSummary: {
                status: 'none',
                rebaselineRecordId: null,
                effectiveBaselineAfterId: null,
                handledAt: null,
                blockingStatus: 'none',
                impactItemCount: 0,
                impactSummary: null
            },
            receivablePlanInitSummary: {
                status: 'initialized',
                initializedReceivablePlanVersionId: 'receivable-1',
                receivablePlanInitializedAt: '2026-04-20T10:00:00.000Z',
                summary: '回款计划已初始化'
            },
            contractSummarySnapshotId: 'contract-summary-1',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            allowedActions: ['generate-contract-handover-summary-snapshot'],
            blockingReasons: [],
            generatedAt: '2026-04-20T10:10:00.000Z'
        } as ContractHandoverSummaryView;
        const projectHandoverDetail = {
            handoverId: 'handover-1',
            projectId: 'project-1',
            projectCode: 'PRJ-001',
            projectName: '合同承接项目',
            handoverStatus: 'draft',
            confirmedAt: null,
            confirmedBy: null,
            comment: null,
            rowVersion: 1,
            effectiveContractSetSummary: contractHandoverSummary.effectiveContractSetSummary,
            contractSummarySnapshotId: 'contract-summary-1',
            currentHandoverBaselineSummary: contractHandoverSummary.currentHandoverBaselineSummary,
            participantConfirmationSummary: {
                status: 'pending',
                confirmationRecordId: 'confirmation-1',
                requiredCount: 2,
                confirmedCount: 1,
                pendingCount: 1,
                closedCount: 0,
                submittedAt: '2026-04-20T10:00:00.000Z',
                confirmedAt: null,
                closedAt: null,
                rowVersion: 1,
                participants: []
            },
            receiptJudgmentModeSummary: {
                status: 'frozen',
                receiptJudgmentMode: 'confirmed-receipt',
                sourceType: 'project-handover',
                sourceId: 'handover-1',
                summary: '按移交确认冻结回款判断口径'
            },
            summaryPackageKey: 'contract-handover-summary',
            summarySnapshotId: 'handover-summary-1',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            allowedActions: [],
            blockingReasons: ['仍有一名参与人待确认'],
            generatedAt: '2026-04-20T10:10:00.000Z'
        } as ProjectHandoverDetailView;

        projectHandoverApiMock.projectHandoverControllerGetContractHandoverSummary.mockReturnValue(of(contractHandoverSummary));
        projectHandoverApiMock.projectHandoverControllerGetProjectHandoverDetailByProject.mockReturnValue(of(projectHandoverDetail));

        await expect(store.loadContractHandover('project-1')).resolves.toEqual({
            contractHandoverSummary,
            projectHandoverDetail
        });

        expect(projectHandoverApiMock.projectHandoverControllerGetContractHandoverSummary).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(projectHandoverApiMock.projectHandoverControllerGetProjectHandoverDetailByProject).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.contractHandoverSummary()).toEqual(contractHandoverSummary);
        expect(store.projectHandoverDetail()).toEqual(projectHandoverDetail);
        expect(store.hasContractHandover()).toBe(true);
        expect(store.contractHandoverError()).toBeNull();
    });

    it('loads operating overview and unified accounting into shared state', async () => {
        const overview: ProjectBusinessOutcomeOverviewView = {
            projectId: 'project-1',
            effectiveContractSetSummary: '200000.00',
            receivableConfirmedAmountSummary: '80000.00',
            includedCostTotalSummary: '120000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            grossMarginSummary: '毛利正常',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: 'Allocation basis shifted after restatement',
            unmappedCostSummary: 'Unmapped delivery cost detected',
            dataMaturityLevel: '数据不足',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: ['reviewOperatingSignalEvaluation']
        };
        const accounting: ProjectUnifiedAccountingView = {
            projectId: 'project-1',
            snapshotId: 'snapshot-1',
            originalBaselineCostSummary: '100000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            includedCostTotalSummary: '120000.00',
            receivableConfirmedAmountSummary: '80000.00',
            taxImpactSummary: 'Tax package is pending closeout',
            taxImpactPendingAmount: '1200.00',
            allocationStabilitySummary: 'Allocation basis shifted after restatement',
            unmappedCostSummary: 'Unmapped delivery cost detected',
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: ['reviewOperatingSignalEvaluation']
        };

        projectCostApiMock.projectCostControllerGetProjectBusinessOutcomeOverview.mockReturnValue(of(overview));
        projectCostApiMock.projectCostControllerGetProjectUnifiedAccounting.mockReturnValue(of(accounting));

        await expect(store.loadOperatingOverview('project-1')).resolves.toEqual({ overview, accounting });

        expect(store.businessOutcomeOverview()).toEqual(overview);
        expect(store.unifiedAccounting()).toEqual(accounting);
        expect(store.hasOperatingOverview()).toBe(true);
        expect(store.operatingOverviewError()).toBeNull();
    });

    it('maps 404 variance responses to a governance-friendly blocker message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectCostApiMock.projectCostControllerGetProjectVarianceRiskExplanation.mockReturnValue(
            throwError(() => notFound)
        );

        await expect(store.loadVarianceRisk('project-404')).rejects.toBe(notFound);

        expect(store.varianceRiskExplanation()).toBeNull();
        expect(store.hasVarianceRisk()).toBe(false);
        expect(store.varianceRiskError()).toBe('当前项目还没有形成可解释的偏差与风险结果，先完成经营信号评价闭环。');
    });

    it('maps 403 commission gate responses to a permission message', async () => {
        const forbidden = new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden'
        });

        projectCostApiMock.projectCostControllerGetBusinessAccountingFeedback.mockReturnValue(
            throwError(() => forbidden)
        );

        await expect(store.loadCommissionGateOverview('project-1')).rejects.toBe(forbidden);

        expect(store.commissionGateOverview()).toBeNull();
        expect(store.hasCommissionGateOverview()).toBe(false);
        expect(store.commissionGateError()).toBe('你没有权限查看当前工作区。');
    });

    it('loads freeze binding summary, detail and handover detail into shared state', async () => {
        const projectHandoverDetail = {
            handoverId: 'handover-1',
            projectId: 'project-1',
            projectCode: 'PRJ-001',
            projectName: '冻结责任边界项目',
            handoverStatus: 'confirmed',
            confirmedAt: '2026-04-20T10:00:00.000Z',
            confirmedBy: 'user-1',
            comment: null,
            rowVersion: 1,
            effectiveContractSetSummary: {
                activeContractCount: 1,
                activeContractIds: ['contract-1'],
                contractNos: ['HT-001'],
                totalSignedAmount: '200000.00',
                currencyCodes: ['CNY'],
                earliestSignedAt: '2026-04-20T08:00:00.000Z',
                latestSignedAt: '2026-04-20T08:00:00.000Z',
                contracts: []
            },
            contractSummarySnapshotId: 'contract-summary-1',
            currentHandoverBaselineSummary: roleAssignmentDetail.effectiveHandoverBaselineSummary,
            participantConfirmationSummary: {
                status: 'confirmed',
                confirmationRecordId: 'confirmation-1',
                requiredCount: 2,
                confirmedCount: 2,
                pendingCount: 0,
                closedCount: 0,
                submittedAt: '2026-04-20T09:50:00.000Z',
                confirmedAt: '2026-04-20T10:00:00.000Z',
                closedAt: null,
                rowVersion: 1,
                participants: []
            },
            receiptJudgmentModeSummary: roleAssignmentDetail.receiptJudgmentModeSummary,
            summaryPackageKey: 'project-handover-summary',
            summarySnapshotId: 'handover-summary-1',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            allowedActions: [],
            blockingReasons: [],
            generatedAt: '2026-04-20T10:10:00.000Z'
        } as ProjectHandoverDetailView;

        commissionApiMock.commissionControllerGetCurrentRoleAssignment.mockReturnValue(of(currentRoleAssignmentSummary));
        commissionRoleAssignmentsApiMock.commissionRoleAssignmentControllerGetRoleAssignmentDetail.mockReturnValue(of(roleAssignmentDetail));
        projectHandoverApiMock.projectHandoverControllerGetProjectHandoverDetailByProject.mockReturnValue(of(projectHandoverDetail));

        await expect(store.loadCommissionFreezeBinding('project-1')).resolves.toEqual({
            currentRoleAssignment: currentRoleAssignmentSummary,
            roleAssignmentDetail,
            projectHandoverDetail
        });

        expect(commissionApiMock.commissionControllerGetCurrentRoleAssignment).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(commissionRoleAssignmentsApiMock.commissionRoleAssignmentControllerGetRoleAssignmentDetail).toHaveBeenCalledWith({
            id: 'freeze-1'
        });
        expect(store.commissionFreezeBindingSummary()).toEqual(currentRoleAssignmentSummary);
        expect(store.commissionFreezeBindingDetail()).toEqual(roleAssignmentDetail);
        expect(store.projectHandoverDetail()).toEqual(projectHandoverDetail);
        expect(store.hasCommissionFreezeBinding()).toBe(true);
        expect(store.commissionFreezeBindingError()).toBeNull();
    });

    it('keeps freeze binding readable when current role assignment is still missing', async () => {
        const projectHandoverDetail = {
            handoverId: 'handover-1',
            projectId: 'project-1',
            projectCode: 'PRJ-001',
            projectName: '冻结责任边界项目',
            handoverStatus: 'draft',
            confirmedAt: null,
            confirmedBy: null,
            comment: null,
            rowVersion: 1,
            effectiveContractSetSummary: {
                activeContractCount: 1,
                activeContractIds: ['contract-1'],
                contractNos: ['HT-001'],
                totalSignedAmount: '200000.00',
                currencyCodes: ['CNY'],
                earliestSignedAt: '2026-04-20T08:00:00.000Z',
                latestSignedAt: '2026-04-20T08:00:00.000Z',
                contracts: []
            },
            contractSummarySnapshotId: 'contract-summary-1',
            currentHandoverBaselineSummary: roleAssignmentDetail.effectiveHandoverBaselineSummary,
            participantConfirmationSummary: {
                status: 'pending',
                confirmationRecordId: 'confirmation-1',
                requiredCount: 2,
                confirmedCount: 1,
                pendingCount: 1,
                closedCount: 0,
                submittedAt: '2026-04-20T09:50:00.000Z',
                confirmedAt: null,
                closedAt: null,
                rowVersion: 1,
                participants: []
            },
            receiptJudgmentModeSummary: roleAssignmentDetail.receiptJudgmentModeSummary,
            summaryPackageKey: 'project-handover-summary',
            summarySnapshotId: 'handover-summary-1',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            allowedActions: [],
            blockingReasons: ['仍有一名参与人待确认'],
            generatedAt: '2026-04-20T10:10:00.000Z'
        } as ProjectHandoverDetailView;

        commissionApiMock.commissionControllerGetCurrentRoleAssignment.mockReturnValue(of(null));
        projectHandoverApiMock.projectHandoverControllerGetProjectHandoverDetailByProject.mockReturnValue(of(projectHandoverDetail));

        await expect(store.loadCommissionFreezeBinding('project-1')).resolves.toEqual({
            currentRoleAssignment: null,
            roleAssignmentDetail: null,
            projectHandoverDetail
        });

        expect(commissionRoleAssignmentsApiMock.commissionRoleAssignmentControllerGetRoleAssignmentDetail).not.toHaveBeenCalled();
        expect(store.commissionFreezeBindingSummary()).toBeNull();
        expect(store.commissionFreezeBindingDetail()).toBeNull();
        expect(store.projectHandoverDetail()).toEqual(projectHandoverDetail);
        expect(store.hasCommissionFreezeBinding()).toBe(true);
        expect(store.commissionFreezeBindingError()).toBeNull();
    });

    it('maps 403 freeze binding responses to a permission message', async () => {
        const forbidden = new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden'
        });

        commissionApiMock.commissionControllerGetCurrentRoleAssignment.mockReturnValue(throwError(() => forbidden));
        projectHandoverApiMock.projectHandoverControllerGetProjectHandoverDetailByProject.mockReturnValue(
            throwError(() => forbidden)
        );

        await expect(store.loadCommissionFreezeBinding('project-1')).rejects.toBe(forbidden);

        expect(store.commissionFreezeBindingSummary()).toBeNull();
        expect(store.commissionFreezeBindingDetail()).toBeNull();
        expect(store.hasCommissionFreezeBinding()).toBe(false);
        expect(store.commissionFreezeBindingError()).toBe('你没有权限查看当前工作区。');
    });

    it('loads commission final settlement into shared state', async () => {
        const finalSettlement: CommissionFinalSettlementView = {
            projectId: 'project-1',
            finalSettlementStatus: 'pending-final-settlement',
            nonRetentionSettlementStatus: 'settled',
            retentionSettlementStatus: 'waiting-retention',
            retentionRequirementSummary: '等待质保金到账',
            retentionReceiptSummary: null,
            departureExceptionSummary: null,
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummary: '税务影响待闭合',
            taxImpactPendingAmount: '1200.00',
            dataMaturityLevel: 'stable',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'BLOCK',
            referencedBaselineVersion: 'baseline-v3',
            referencedSnapshotVersion: 'snapshot-v5',
            summaryPackageKey: 'commission-final-settlement',
            summarySnapshotId: 'snapshot-package-1',
            projectionLevel: 'final-settlement',
            exportPolicy: 'controlled',
            allowedActions: []
        };

        commissionApiMock.commissionControllerGetCommissionFinalSettlement.mockReturnValue(of(finalSettlement));

        await expect(store.loadCommissionFinalSettlement('project-1')).resolves.toEqual(finalSettlement);

        expect(store.commissionFinalSettlement()).toEqual(finalSettlement);
        expect(store.hasCommissionFinalSettlement()).toBe(true);
        expect(store.commissionFinalSettlementError()).toBeNull();
    });

    it('maps 404 rule explanation responses to a governance-friendly blocker message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        commissionApiMock.commissionControllerGetCommissionRuleExplanation.mockReturnValue(
            throwError(() => notFound)
        );

        await expect(store.loadCommissionRuleExplanation('project-404')).rejects.toBe(notFound);

        expect(store.commissionRuleExplanation()).toBeNull();
        expect(store.hasCommissionRuleExplanation()).toBe(false);
        expect(store.commissionRuleExplanationError()).toBe(
            '当前项目还没有形成可读取的规则解释快照，先完成最终结算收口链和规则解释快照生成。'
        );
    });

    it('clears all workspace state when clear is called', async () => {
        const overview: ProjectBusinessOutcomeOverviewView = {
            projectId: 'project-1',
            effectiveContractSetSummary: '200000.00',
            receivableConfirmedAmountSummary: '80000.00',
            includedCostTotalSummary: '120000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            grossMarginSummary: '毛利正常',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: []
        };
        const accounting: ProjectUnifiedAccountingView = {
            projectId: 'project-1',
            snapshotId: 'snapshot-1',
            originalBaselineCostSummary: '100000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            includedCostTotalSummary: '120000.00',
            receivableConfirmedAmountSummary: '80000.00',
            taxImpactSummary: 'Tax package is pending closeout',
            taxImpactPendingAmount: '1200.00',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: []
        };
        const varianceRisk: ProjectVarianceRiskExplanationView = {
            projectId: 'project-1',
            signalEvaluationId: 'signal-1',
            varianceSourceSummary: 'Gross margin deviates from baseline expectation',
            riskLevel: 'ATTENTION',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            recommendedActionSummary: 'Review accounting and payout input before release',
            allowedActions: ['reviewOperatingSignalEvaluation']
        };
        const gateOverview: BusinessAccountingFeedbackView = {
            projectId: 'project-1',
            signalLevel: 'ATTENTION',
            currentActionLevel: 'REVIEW',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            nextActionSummary: 'Review commission settlement package',
            downstreamConsumerSummary: 'Commission payout workflow',
            allowedActions: ['reviewCommissionGateBinding']
        };
        const finalSettlement: CommissionFinalSettlementView = {
            projectId: 'project-1',
            finalSettlementStatus: 'pending-final-settlement',
            nonRetentionSettlementStatus: 'settled',
            retentionSettlementStatus: 'waiting-retention',
            retentionRequirementSummary: '等待质保金到账',
            retentionReceiptSummary: null,
            departureExceptionSummary: null,
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummary: '税务影响待闭合',
            taxImpactPendingAmount: '1200.00',
            dataMaturityLevel: 'stable',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'BLOCK',
            referencedBaselineVersion: 'baseline-v3',
            referencedSnapshotVersion: 'snapshot-v5',
            summaryPackageKey: 'commission-final-settlement',
            summarySnapshotId: 'snapshot-package-1',
            projectionLevel: 'final-settlement',
            exportPolicy: 'controlled',
            allowedActions: []
        };
        const ruleExplanation: CommissionRuleExplanationView = {
            projectId: 'project-1',
            currentStageStatus: 'blocked-retention',
            gateDecisionCode: 'BLOCK_RETENTION',
            blockingReasonCategory: 'retention',
            blockingReasonCode: 'RETENTION_RECEIPT_PENDING',
            blockingReasonSummary: '质保金尚未到账',
            gateDecisionSummary: '当前暂不能进入质保金结算',
            nextActionSummary: '请财务确认质保金到账后再复核',
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummary: '税务影响待闭合',
            taxImpactPendingAmount: '1200.00',
            dataMaturityLevel: 'stable',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'BLOCK',
            referencedBaselineVersion: 'baseline-v3',
            referencedSnapshotVersion: 'snapshot-v5',
            summaryPackageKey: 'commission-final-settlement',
            summarySnapshotId: 'snapshot-package-1',
            projectionLevel: 'final-settlement',
            exportPolicy: 'controlled',
            allowedActions: []
        };

        projectCostApiMock.projectCostControllerGetProjectBusinessOutcomeOverview.mockReturnValue(of(overview));
        projectCostApiMock.projectCostControllerGetProjectUnifiedAccounting.mockReturnValue(of(accounting));
        projectCostApiMock.projectCostControllerGetProjectVarianceRiskExplanation.mockReturnValue(of(varianceRisk));
        projectCostApiMock.projectCostControllerGetBusinessAccountingFeedback.mockReturnValue(of(gateOverview));
        commissionApiMock.commissionControllerGetCommissionFinalSettlement.mockReturnValue(of(finalSettlement));
        commissionApiMock.commissionControllerGetCommissionRuleExplanation.mockReturnValue(of(ruleExplanation));
        projectApiMock.projectControllerGetWorkspaceGuidance.mockReturnValue(of(workspaceGuidance));
        contractReadinessApiMock.contractReadinessControllerGetCurrentContractReadiness.mockReturnValue(of(contractReadiness));

        await store.loadGuidance('project-1');
        await store.loadPreSigningOverview('project-1');
        await store.loadOperatingOverview('project-1');
        await store.loadVarianceRisk('project-1');
        await store.loadCommissionGateOverview('project-1');
        await store.loadCommissionFinalSettlement('project-1');
        await store.loadCommissionRuleExplanation('project-1');

        store.clear();

        expect(store.guidance()).toBeNull();
        expect(store.contractHandoverSummary()).toBeNull();
        expect(store.projectHandoverDetail()).toBeNull();
        expect(store.contractReadiness()).toBeNull();
        expect(store.businessOutcomeOverview()).toBeNull();
        expect(store.unifiedAccounting()).toBeNull();
        expect(store.varianceRiskExplanation()).toBeNull();
        expect(store.commissionGateOverview()).toBeNull();
        expect(store.commissionFreezeBindingSummary()).toBeNull();
        expect(store.commissionFreezeBindingDetail()).toBeNull();
        expect(store.commissionFinalSettlement()).toBeNull();
        expect(store.commissionRuleExplanation()).toBeNull();
        expect(store.operatingOverviewError()).toBeNull();
        expect(store.varianceRiskError()).toBeNull();
        expect(store.commissionGateError()).toBeNull();
        expect(store.commissionFreezeBindingError()).toBeNull();
        expect(store.commissionFinalSettlementError()).toBeNull();
        expect(store.commissionRuleExplanationError()).toBeNull();
        expect(store.contractHandoverError()).toBeNull();
        expect(store.preSigningError()).toBeNull();
        expect(store.guidanceError()).toBeNull();
    });
});
