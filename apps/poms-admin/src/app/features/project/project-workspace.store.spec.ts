import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
    CommissionApi,
    CommissionRoleAssignmentsApi,
    ContractReadinessApi,
    CreateProjectBidCommercialProcessRequestBidModeEnum,
    CreateProjectBidCommercialProcessRequestCurrentStageEnum,
    CreateProjectBidCommercialProcessRequestDecisionEnum,
    CreateProjectBidCommercialProcessRequestResultStatusEnum,
    CreateProjectPricingMarginReviewRequestDecisionEnum,
    CreateProjectPricingMarginReviewRequestGrossMarginBandEnum,
    CreateProjectPricingMarginReviewRequestPricingPathEnum,
    ProjectApi,
    ProjectCostApi,
    ProjectHandoverApi,
    ProjectStage,
    ProjectStatus,
    ProjectWorkspaceStore,
    type BusinessAccountingFeedbackView,
    type CommissionFinalSettlementView,
    type CommissionRoleAssignmentDetailView,
    type CommissionRoleAssignmentSummary,
    type CommissionRuleExplanationView,
    type ContractHandoverSummaryView,
    type ContractReadinessDetail,
    type ProjectHandoverDetailView,
    type ProjectBidCommercialWorkspaceView,
    type ProjectBusinessOutcomeOverviewView,
    type ProjectPricingMarginWorkspaceView,
    type ProjectUnifiedAccountingView,
    type ProjectTechnicalCostWorkspaceView,
    type ProjectVarianceRiskExplanationView,
    type ProjectWorkspaceGuidanceView
} from '@poms/admin-data-access';
import { of, throwError } from 'rxjs';

function sensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'operating-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function contractSensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'contract-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

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
        currentStage: ProjectStage.Handover,
        status: ProjectStatus.Active,
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
    const technicalCostWorkspace: ProjectTechnicalCostWorkspaceView = {
        projectId: 'project-1',
        currentStage: ProjectStage.ScopeConfirmation,
        status: ProjectStatus.Active,
        currentPackage: {
            id: 'technical-package-1',
            projectId: 'project-1',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            technicalFeasibilityDecision: 'conditional',
            technicalConclusionSummary: '范围可实施，但接口风险需要跟踪。',
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
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:00:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        scopeItems: [],
        riskItems: [],
        costItems: [],
        blockingReasons: ['技术与成本版本包尚未允许进入下一阶段。'],
        nextStep: '先关闭阻塞风险或更新版本包，再进入商务收口。',
        ownerLabel: '技术支持 / 售前',
        allowedActions: ['view-technical-cost-workspace'],
        generatedAt: '2026-04-24T08:05:00.000Z'
    };
    const bidCommercialWorkspace: ProjectBidCommercialWorkspaceView = {
        projectId: 'project-1',
        currentStage: ProjectStage.CommercialClosure,
        status: ProjectStatus.Active,
        currentProcess: {
            id: 'bid-process-1',
            projectId: 'project-1',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            bidMode: 'public-tender',
            currentStage: 'submitted',
            decision: 'participate',
            resultStatus: 'pending',
            processSummary: '公开招标已提交，等待客户确认结果。',
            decisionSummary: '销售和商务决定参与本次公开招标。',
            resultSummary: null,
            ownerRole: '销售负责人',
            blockerCount: 1,
            effectiveAt: '2026-04-24T08:10:00.000Z',
            createdAt: '2026-04-24T08:10:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:10:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        materialItems: [],
        timelineItems: [],
        blockingReasons: ['客户招标结果尚未确认。'],
        nextStep: '等待客户确认竞标结果，再进入报价与毛利评审。',
        ownerLabel: '销售负责人 / 商务负责人',
        allowedActions: ['view-bid-commercial-workspace'],
        generatedAt: '2026-04-24T08:15:00.000Z'
    };
    const pricingMarginWorkspace: ProjectPricingMarginWorkspaceView = {
        projectId: 'project-1',
        currentStage: ProjectStage.CommercialClosure,
        status: ProjectStatus.Active,
        currentReview: {
            id: 'pricing-review-1',
            projectId: 'project-1',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            technicalCostPackageId: 'technical-package-1',
            bidCommercialProcessId: 'bid-process-1',
            commercialReleaseBaselineId: 'commercial-baseline-1',
            pricingPath: 'bid',
            quoteVersion: 'Q-2026-001',
            currencyCode: 'CNY',
            quoteAmountTaxInclusive: '250000.00',
            quoteAmountTaxExclusive: '235849.06',
            taxRate: '0.0600',
            taxConditionSummary: '按 6% 增值税测算。',
            paymentTermsSummary: '首付款 30%，验收后 70%。',
            grossMarginRate: '0.3200',
            grossMarginBand: 'target',
            grossMarginSummary: '毛利达到目标区间。',
            decision: 'released',
            decisionSummary: '报价与毛利已放行，可进入签约承接。',
            approvalScenarioKey: 'pricing-margin-review',
            summaryPackageKey: 'pricing-margin-summary',
            summarySnapshotId: 'pricing-summary-1',
            projectionLevel: 'pricing-margin',
            exportPolicy: 'internal',
            readyForContracting: true,
            ownerRole: '商务负责人',
            blockerCount: 0,
            effectiveAt: '2026-04-24T08:20:00.000Z',
            createdAt: '2026-04-24T08:20:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:20:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        technicalCostPackage: technicalCostWorkspace.currentPackage,
        bidCommercialProcess: bidCommercialWorkspace.currentProcess,
        conditionItems: [],
        blockingReasons: [],
        nextStep: '进入签约就绪承接。',
        readyForContracting: true,
        ownerLabel: '商务负责人',
        allowedActions: ['view-pricing-margin-workspace'],
        generatedAt: '2026-04-24T08:25:00.000Z'
    };
    const bidCommercialProcess = bidCommercialWorkspace.currentProcess;
    const pricingMarginReview = pricingMarginWorkspace.currentReview;
    if (!bidCommercialProcess || !pricingMarginReview) {
        throw new Error('Project workspace store fixtures must include current bid and pricing records.');
    }
    const bidCommercialProcessHistory = [
        bidCommercialProcess,
        {
            ...bidCommercialProcess,
            id: 'bid-process-0',
            version: 1,
            isCurrent: false,
            supersedesId: null,
            status: 'superseded' as const,
            processSummary: '旧版竞标过程。',
            rowVersion: 1
        }
    ];
    const pricingMarginReviewHistory = [
        pricingMarginReview,
        {
            ...pricingMarginReview,
            id: 'pricing-review-0',
            version: 1,
            isCurrent: false,
            supersedesId: null,
            status: 'superseded' as const,
            quoteVersion: 'Q-2026-000',
            decisionSummary: '旧版报价评审。',
            rowVersion: 1
        }
    ];
    let projectApiMock: {
        projectControllerGetWorkspaceGuidance: jest.Mock;
        projectControllerGetProjectTechnicalCostWorkspace: jest.Mock;
        projectControllerGetProjectBidCommercialWorkspace: jest.Mock;
        projectControllerListProjectBidCommercialProcesses: jest.Mock;
        projectControllerGetProjectPricingMarginWorkspace: jest.Mock;
        projectControllerListProjectPricingMarginReviews: jest.Mock;
        projectControllerCreateProjectBidCommercialProcess: jest.Mock;
        projectControllerCreateProjectPricingMarginReview: jest.Mock;
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
            projectControllerGetWorkspaceGuidance: jest.fn(),
            projectControllerGetProjectTechnicalCostWorkspace: jest.fn(),
            projectControllerGetProjectBidCommercialWorkspace: jest.fn(),
            projectControllerListProjectBidCommercialProcesses: jest.fn(),
            projectControllerGetProjectPricingMarginWorkspace: jest.fn(),
            projectControllerListProjectPricingMarginReviews: jest.fn(),
            projectControllerCreateProjectBidCommercialProcess: jest.fn(),
            projectControllerCreateProjectPricingMarginReview: jest.fn()
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

    it('loads technical cost workspace into shared state', async () => {
        projectApiMock.projectControllerGetProjectTechnicalCostWorkspace.mockReturnValue(of(technicalCostWorkspace));

        await expect(store.loadTechnicalCostWorkspace('project-1')).resolves.toEqual(technicalCostWorkspace);

        expect(projectApiMock.projectControllerGetProjectTechnicalCostWorkspace).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.technicalCostWorkspace()).toEqual(technicalCostWorkspace);
        expect(store.hasTechnicalCostWorkspace()).toBe(true);
        expect(store.technicalCostError()).toBeNull();
    });

    it('maps missing technical cost workspace responses to a user-readable message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectApiMock.projectControllerGetProjectTechnicalCostWorkspace.mockReturnValue(throwError(() => notFound));

        await expect(store.loadTechnicalCostWorkspace('project-empty')).rejects.toBe(notFound);

        expect(store.technicalCostWorkspace()).toBeNull();
        expect(store.hasTechnicalCostWorkspace()).toBe(false);
        expect(store.technicalCostError()).toBe('当前项目还没有形成技术与成本工作区，请先补齐签约前技术与成本版本包。');
    });

    it('loads bid commercial workspace into shared state', async () => {
        projectApiMock.projectControllerGetProjectBidCommercialWorkspace.mockReturnValue(of(bidCommercialWorkspace));

        await expect(store.loadBidCommercialWorkspace('project-1')).resolves.toEqual(bidCommercialWorkspace);

        expect(projectApiMock.projectControllerGetProjectBidCommercialWorkspace).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.bidCommercialWorkspace()).toEqual(bidCommercialWorkspace);
        expect(store.hasBidCommercialWorkspace()).toBe(true);
        expect(store.bidCommercialError()).toBeNull();
    });

    it('maps missing bid commercial workspace responses to a user-readable message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectApiMock.projectControllerGetProjectBidCommercialWorkspace.mockReturnValue(throwError(() => notFound));

        await expect(store.loadBidCommercialWorkspace('project-empty')).rejects.toBe(notFound);

        expect(store.bidCommercialWorkspace()).toBeNull();
        expect(store.hasBidCommercialWorkspace()).toBe(false);
        expect(store.bidCommercialError()).toBe('当前项目还没有形成招投标 / 商务竞标工作区，请先补齐竞标形态、材料和结果事实。');
    });

    it('loads bid commercial process history into shared state', async () => {
        projectApiMock.projectControllerListProjectBidCommercialProcesses.mockReturnValue(of(bidCommercialProcessHistory));

        await expect(store.loadBidCommercialProcessHistory('project-1')).resolves.toEqual(bidCommercialProcessHistory);

        expect(projectApiMock.projectControllerListProjectBidCommercialProcesses).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.bidCommercialProcessHistory()).toEqual(bidCommercialProcessHistory);
        expect(store.hasBidCommercialProcessHistory()).toBe(true);
        expect(store.bidCommercialHistoryError()).toBeNull();
    });

    it('maps missing bid commercial history responses to a user-readable message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectApiMock.projectControllerListProjectBidCommercialProcesses.mockReturnValue(throwError(() => notFound));

        await expect(store.loadBidCommercialProcessHistory('project-empty')).rejects.toBe(notFound);

        expect(store.bidCommercialProcessHistory()).toEqual([]);
        expect(store.hasBidCommercialProcessHistory()).toBe(false);
        expect(store.bidCommercialHistoryError()).toBe('当前项目还没有形成招投标 / 商务竞标工作区，请先补齐竞标形态、材料和结果事实。');
    });

    it('creates a bid commercial process and refreshes the workspace projection and history', async () => {
        const request = {
            bidMode: CreateProjectBidCommercialProcessRequestBidModeEnum.PublicTender,
            currentStage: CreateProjectBidCommercialProcessRequestCurrentStageEnum.Submitted,
            decision: CreateProjectBidCommercialProcessRequestDecisionEnum.Participate,
            resultStatus: CreateProjectBidCommercialProcessRequestResultStatusEnum.Pending,
            processSummary: '公开招标已提交。',
            materialItems: [],
            timelineItems: []
        };

        projectApiMock.projectControllerCreateProjectBidCommercialProcess.mockReturnValue(of(bidCommercialWorkspace.currentProcess));
        projectApiMock.projectControllerGetProjectBidCommercialWorkspace.mockReturnValue(of(bidCommercialWorkspace));
        projectApiMock.projectControllerListProjectBidCommercialProcesses.mockReturnValue(of(bidCommercialProcessHistory));

        await expect(store.createBidCommercialProcess('project-1', request)).resolves.toEqual(bidCommercialWorkspace.currentProcess);

        expect(projectApiMock.projectControllerCreateProjectBidCommercialProcess).toHaveBeenCalledWith({
            projectId: 'project-1',
            createProjectBidCommercialProcessRequest: request
        });
        expect(projectApiMock.projectControllerGetProjectBidCommercialWorkspace).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(projectApiMock.projectControllerListProjectBidCommercialProcesses).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.bidCommercialWorkspace()).toEqual(bidCommercialWorkspace);
        expect(store.bidCommercialProcessHistory()).toEqual(bidCommercialProcessHistory);
        expect(store.savingBidCommercial()).toBe(false);
        expect(store.bidCommercialError()).toBeNull();
    });

    it('loads pricing margin workspace into shared state', async () => {
        projectApiMock.projectControllerGetProjectPricingMarginWorkspace.mockReturnValue(of(pricingMarginWorkspace));

        await expect(store.loadPricingMarginWorkspace('project-1')).resolves.toEqual(pricingMarginWorkspace);

        expect(projectApiMock.projectControllerGetProjectPricingMarginWorkspace).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.pricingMarginWorkspace()).toEqual(pricingMarginWorkspace);
        expect(store.hasPricingMarginWorkspace()).toBe(true);
        expect(store.pricingMarginError()).toBeNull();
    });

    it('maps missing pricing margin workspace responses to a user-readable message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectApiMock.projectControllerGetProjectPricingMarginWorkspace.mockReturnValue(throwError(() => notFound));

        await expect(store.loadPricingMarginWorkspace('project-empty')).rejects.toBe(notFound);

        expect(store.pricingMarginWorkspace()).toBeNull();
        expect(store.hasPricingMarginWorkspace()).toBe(false);
        expect(store.pricingMarginError()).toBe('当前项目还没有形成报价与毛利评审工作区，请先补齐报价、成本版本、税务和回款条件。');
    });

    it('loads pricing margin review history into shared state', async () => {
        projectApiMock.projectControllerListProjectPricingMarginReviews.mockReturnValue(of(pricingMarginReviewHistory));

        await expect(store.loadPricingMarginReviewHistory('project-1')).resolves.toEqual(pricingMarginReviewHistory);

        expect(projectApiMock.projectControllerListProjectPricingMarginReviews).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.pricingMarginReviewHistory()).toEqual(pricingMarginReviewHistory);
        expect(store.hasPricingMarginReviewHistory()).toBe(true);
        expect(store.pricingMarginHistoryError()).toBeNull();
    });

    it('maps missing pricing margin history responses to a user-readable message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectApiMock.projectControllerListProjectPricingMarginReviews.mockReturnValue(throwError(() => notFound));

        await expect(store.loadPricingMarginReviewHistory('project-empty')).rejects.toBe(notFound);

        expect(store.pricingMarginReviewHistory()).toEqual([]);
        expect(store.hasPricingMarginReviewHistory()).toBe(false);
        expect(store.pricingMarginHistoryError()).toBe('当前项目还没有形成报价与毛利评审工作区，请先补齐报价、成本版本、税务和回款条件。');
    });

    it('creates a pricing margin review and refreshes the workspace projection and history', async () => {
        const request = {
            technicalCostPackageId: 'technical-package-1',
            bidCommercialProcessId: 'bid-process-1',
            pricingPath: CreateProjectPricingMarginReviewRequestPricingPathEnum.Bid,
            quoteVersion: 'Q-2026-001',
            currencyCode: 'CNY',
            quoteAmountTaxInclusive: '250000.00',
            quoteAmountTaxExclusive: '235849.06',
            taxRate: '0.0600',
            taxConditionSummary: '按 6% 增值税测算。',
            paymentTermsSummary: '首付款 30%，验收后 70%。',
            grossMarginBand: CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Target,
            grossMarginSummary: '毛利达到目标区间。',
            decision: CreateProjectPricingMarginReviewRequestDecisionEnum.Released,
            decisionSummary: '报价与毛利已放行。',
            conditionItems: []
        };

        projectApiMock.projectControllerCreateProjectPricingMarginReview.mockReturnValue(of(pricingMarginWorkspace.currentReview));
        projectApiMock.projectControllerGetProjectPricingMarginWorkspace.mockReturnValue(of(pricingMarginWorkspace));
        projectApiMock.projectControllerListProjectPricingMarginReviews.mockReturnValue(of(pricingMarginReviewHistory));

        await expect(store.createPricingMarginReview('project-1', request)).resolves.toEqual(pricingMarginWorkspace.currentReview);

        expect(projectApiMock.projectControllerCreateProjectPricingMarginReview).toHaveBeenCalledWith({
            projectId: 'project-1',
            createProjectPricingMarginReviewRequest: request
        });
        expect(projectApiMock.projectControllerGetProjectPricingMarginWorkspace).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(projectApiMock.projectControllerListProjectPricingMarginReviews).toHaveBeenCalledWith({
            projectId: 'project-1'
        });
        expect(store.pricingMarginWorkspace()).toEqual(pricingMarginWorkspace);
        expect(store.pricingMarginReviewHistory()).toEqual(pricingMarginReviewHistory);
        expect(store.savingPricingMargin()).toBe(false);
        expect(store.pricingMarginError()).toBeNull();
    });

    it('loads contract handover and project handover detail into shared state', async () => {
        const contractHandoverSummary = {
            projectId: 'project-1',
            projectNo: 'PRJ-001',
            projectName: '合同承接项目',
            effectiveContractSetSummary: {
                activeContractCount: 1,
                activeContractIds: ['contract-1'],
                contractNos: ['HT-001'],
                totalSignedAmountProjection: contractSensitiveProjection('200000.00'),
                currencyCodes: ['CNY'],
                earliestSignedAt: '2026-04-20T08:00:00.000Z',
                latestSignedAt: '2026-04-20T08:00:00.000Z',
                contracts: [
                    {
                        id: 'contract-1',
                        contractNo: 'HT-001',
                        status: 'active',
                        signedAmountProjection: contractSensitiveProjection('200000.00'),
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
            projectNo: 'PRJ-001',
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
            effectiveContractSetSummaryProjection: sensitiveProjection('200000.00'),
            receivableConfirmedAmountSummaryProjection: sensitiveProjection('80000.00'),
            includedCostTotalSummaryProjection: sensitiveProjection('120000.00'),
            currentEffectiveBaselineCostSummaryProjection: sensitiveProjection('105000.00'),
            grossMarginAmountProjection: sensitiveProjection('80000.00'),
            grossMarginRateProjection: sensitiveProjection('0.400000'),
            taxImpactSummaryProjection: sensitiveProjection('Tax package is pending closeout'),
            allocationStabilitySummary: 'Allocation basis shifted after restatement',
            unmappedCostSummary: 'Unmapped delivery cost detected',
            dataMaturityLevel: 'INSUFFICIENT',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: ['reviewOperatingSignalEvaluation']
        };
        const accounting: ProjectUnifiedAccountingView = {
            projectId: 'project-1',
            snapshotId: 'snapshot-1',
            originalBaselineCostSummaryProjection: sensitiveProjection('100000.00'),
            currentEffectiveBaselineCostSummaryProjection: sensitiveProjection('105000.00'),
            includedCostTotalSummaryProjection: sensitiveProjection('120000.00'),
            receivableConfirmedAmountSummaryProjection: sensitiveProjection('80000.00'),
            taxImpactSummaryProjection: sensitiveProjection('Tax package is pending closeout'),
            taxImpactPendingAmountProjection: sensitiveProjection('1200.00'),
            allocationStabilitySummary: 'Allocation basis shifted after restatement',
            unmappedCostSummary: 'Unmapped delivery cost detected',
            dataMaturityLevel: 'INSUFFICIENT',
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

        projectCostApiMock.projectCostControllerGetProjectVarianceRiskExplanation.mockReturnValue(throwError(() => notFound));

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

        projectCostApiMock.projectCostControllerGetBusinessAccountingFeedback.mockReturnValue(throwError(() => forbidden));

        await expect(store.loadCommissionGateOverview('project-1')).rejects.toBe(forbidden);

        expect(store.commissionGateOverview()).toBeNull();
        expect(store.hasCommissionGateOverview()).toBe(false);
        expect(store.commissionGateError()).toBe('你没有权限查看当前工作区。');
    });

    it('loads freeze binding summary, detail and handover detail into shared state', async () => {
        const projectHandoverDetail = {
            handoverId: 'handover-1',
            projectId: 'project-1',
            projectNo: 'PRJ-001',
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
                totalSignedAmountProjection: contractSensitiveProjection('200000.00'),
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
            projectNo: 'PRJ-001',
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
                totalSignedAmountProjection: contractSensitiveProjection('200000.00'),
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
        projectHandoverApiMock.projectHandoverControllerGetProjectHandoverDetailByProject.mockReturnValue(throwError(() => forbidden));

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
            retentionDueDate: '2026-05-20',
            retentionDueStatus: 'pending' as const,
            retentionRequirementSummary: '等待质保金到账',
            retentionReceiptSummary: null,
            departureExceptionSummary: null,
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummaryProjection: sensitiveProjection('税务影响待闭合'),
            taxImpactPendingAmountProjection: sensitiveProjection('1200.00'),
            dataMaturityLevel: 'MATURE',
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

        commissionApiMock.commissionControllerGetCommissionRuleExplanation.mockReturnValue(throwError(() => notFound));

        await expect(store.loadCommissionRuleExplanation('project-404')).rejects.toBe(notFound);

        expect(store.commissionRuleExplanation()).toBeNull();
        expect(store.hasCommissionRuleExplanation()).toBe(false);
        expect(store.commissionRuleExplanationError()).toBe('当前项目还没有形成可读取的规则解释快照，先完成最终结算收口链和规则解释快照生成。');
    });

    it('clears all workspace state when clear is called', async () => {
        const overview: ProjectBusinessOutcomeOverviewView = {
            projectId: 'project-1',
            effectiveContractSetSummaryProjection: sensitiveProjection('200000.00'),
            receivableConfirmedAmountSummaryProjection: sensitiveProjection('80000.00'),
            includedCostTotalSummaryProjection: sensitiveProjection('120000.00'),
            currentEffectiveBaselineCostSummaryProjection: sensitiveProjection('105000.00'),
            grossMarginAmountProjection: sensitiveProjection('80000.00'),
            grossMarginRateProjection: sensitiveProjection('0.400000'),
            taxImpactSummaryProjection: sensitiveProjection('Tax package is pending closeout'),
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: 'INSUFFICIENT',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: []
        };
        const accounting: ProjectUnifiedAccountingView = {
            projectId: 'project-1',
            snapshotId: 'snapshot-1',
            originalBaselineCostSummaryProjection: sensitiveProjection('100000.00'),
            currentEffectiveBaselineCostSummaryProjection: sensitiveProjection('105000.00'),
            includedCostTotalSummaryProjection: sensitiveProjection('120000.00'),
            receivableConfirmedAmountSummaryProjection: sensitiveProjection('80000.00'),
            taxImpactSummaryProjection: sensitiveProjection('Tax package is pending closeout'),
            taxImpactPendingAmountProjection: sensitiveProjection('1200.00'),
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: 'INSUFFICIENT',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: []
        };
        const varianceRisk: ProjectVarianceRiskExplanationView = {
            projectId: 'project-1',
            signalEvaluationId: 'signal-1',
            varianceSourceSummaryProjection: sensitiveProjection('Gross margin deviates from baseline expectation'),
            riskLevel: 'ATTENTION',
            taxImpactSummaryProjection: sensitiveProjection('Tax package is pending closeout'),
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: 'INSUFFICIENT',
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
            taxImpactSummaryProjection: sensitiveProjection('Tax package is pending closeout'),
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: 'INSUFFICIENT',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            nextActionSummaryProjection: sensitiveProjection('Review commission settlement package'),
            downstreamConsumerSummaryProjection: sensitiveProjection('Commission payout workflow'),
            allowedActions: ['reviewCommissionGateBinding']
        };
        const finalSettlement: CommissionFinalSettlementView = {
            projectId: 'project-1',
            finalSettlementStatus: 'pending-final-settlement',
            nonRetentionSettlementStatus: 'settled',
            retentionSettlementStatus: 'waiting-retention',
            retentionDueDate: '2026-05-20',
            retentionDueStatus: 'pending' as const,
            retentionRequirementSummary: '等待质保金到账',
            retentionReceiptSummary: null,
            departureExceptionSummary: null,
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummaryProjection: sensitiveProjection('税务影响待闭合'),
            taxImpactPendingAmountProjection: sensitiveProjection('1200.00'),
            dataMaturityLevel: 'MATURE',
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
            nextActionSummaryProjection: sensitiveProjection('请财务确认质保金到账后再复核'),
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummaryProjection: sensitiveProjection('税务影响待闭合'),
            taxImpactPendingAmountProjection: sensitiveProjection('1200.00'),
            dataMaturityLevel: 'MATURE',
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
        expect(store.bidCommercialWorkspace()).toBeNull();
        expect(store.pricingMarginWorkspace()).toBeNull();
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
        expect(store.bidCommercialError()).toBeNull();
        expect(store.pricingMarginError()).toBeNull();
        expect(store.guidanceError()).toBeNull();
    });
});
