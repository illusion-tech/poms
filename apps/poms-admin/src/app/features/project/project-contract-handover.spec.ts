import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import {
    AttachmentSecurityLevel,
    CommercialDiffLevel,
    CommercialDiffReviewStatus,
    ContractHandoverBaselineValidationStatus,
    ContractHandoverCurrentBaselineSourceType,
    ContractHandoverCurrentBaselineStatus,
    ContractHandoverRebaselineBlockingStatus,
    ContractHandoverRebaselineStatus,
    ContractHandoverReceivablePlanInitStatus,
    ContractReadinessGuardDecision,
    ContractReadinessStatus,
    ContractStatus,
    type ContractHandoverSummaryView,
    ProjectHandoverStatus,
    ProjectHandoverAttachmentChecklistItemStatus,
    type ProjectHandoverDetailView,
    type ProjectHandoverAttachmentChecklistView,
    ProjectHandoverParticipantConfirmationStatus,
    ProjectHandoverReceiptJudgmentSourceType,
    ProjectHandoverReceiptJudgmentFreezeStatus,
    ProjectWorkspaceStore
} from '@poms/admin-data-access';
import { ProjectContractHandover } from './project-contract-handover';

function sensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'contract-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function createContractHandoverSummary(): ContractHandoverSummaryView {
    return {
        projectId: 'project-1',
        projectNo: 'PRJ-001',
        projectName: '合同承接项目',
        effectiveContractSetSummary: {
            activeContractCount: 1,
            activeContractIds: ['contract-1'],
            contractNos: ['HT-001'],
            totalSignedAmountProjection: sensitiveProjection('200000.00'),
            currencyCodes: ['CNY'],
            earliestSignedAt: '2026-04-20T08:00:00.000Z',
            latestSignedAt: '2026-04-20T08:00:00.000Z',
            contracts: [
                {
                    id: 'contract-1',
                    contractNo: 'HT-001',
                    status: ContractStatus.Active,
                    signedAmountProjection: sensitiveProjection('200000.00'),
                    currencyCode: 'CNY',
                    currentSnapshotId: 'snapshot-1',
                    signedAt: '2026-04-20T08:00:00.000Z'
                }
            ]
        },
        contractBaselineValidationSummary: {
            status: ContractHandoverBaselineValidationStatus.Ready,
            readinessPackageId: 'readiness-1',
            sourceBaselineId: 'baseline-1',
            latestDiffResultId: 'diff-1',
            diffLevel: CommercialDiffLevel.Prompt,
            reviewStatus: CommercialDiffReviewStatus.Approved,
            packageStatus: ContractReadinessStatus.Ready,
            guardDecision: ContractReadinessGuardDecision.Allowed,
            initializedContractSnapshotId: 'snapshot-1',
            contractSnapshotInitializedAt: '2026-04-20T09:00:00.000Z',
            blockingReasonSummary: null,
            missingPrerequisiteCount: 0
        },
        currentHandoverBaselineSummary: {
            status: ContractHandoverCurrentBaselineStatus.Available,
            baselineSnapshotId: 'handover-baseline-1',
            sourceType: ContractHandoverCurrentBaselineSourceType.ContractReadiness,
            sourceId: 'readiness-1',
            summary: '合同承接基线已稳定'
        },
        latestHandoverRebaselineSummary: {
            status: ContractHandoverRebaselineStatus.None,
            rebaselineRecordId: null,
            effectiveBaselineAfterId: null,
            handledAt: null,
            blockingStatus: ContractHandoverRebaselineBlockingStatus.None,
            impactItemCount: 0,
            impactSummary: null
        },
        receivablePlanInitSummary: {
            status: ContractHandoverReceivablePlanInitStatus.Initialized,
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
}

function createProjectHandoverDetail(summary: ContractHandoverSummaryView): ProjectHandoverDetailView {
    return {
        handoverId: 'handover-1',
        projectId: 'project-1',
        projectNo: 'PRJ-001',
        projectName: '合同承接项目',
        handoverStatus: ProjectHandoverStatus.Draft,
        confirmedAt: null,
        confirmedBy: null,
        comment: null,
        rowVersion: 1,
        effectiveContractSetSummary: summary.effectiveContractSetSummary,
        contractSummarySnapshotId: 'contract-summary-1',
        currentHandoverBaselineSummary: summary.currentHandoverBaselineSummary,
        participantConfirmationSummary: {
            status: ProjectHandoverParticipantConfirmationStatus.Pending,
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
            status: ProjectHandoverReceiptJudgmentFreezeStatus.Frozen,
            receiptJudgmentMode: 'confirmed-receipt',
            sourceType: ProjectHandoverReceiptJudgmentSourceType.ProjectHandover,
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
}

function createAttachmentChecklist(): ProjectHandoverAttachmentChecklistView {
    return {
        handoverId: 'handover-1',
        projectId: 'project-1',
        generatedAt: '2026-04-20T10:30:00.000Z',
        counts: {
            total: 2,
            included: 1,
            missing: 0,
            excluded: 0,
            sensitiveExcluded: 1,
            staleVersion: 0,
            downloadable: 1
        },
        items: [
            {
                selectionId: 'selection-1',
                handoverId: 'handover-1',
                projectId: 'project-1',
                attachmentId: 'attachment-1',
                versionGroupId: 'version-group-1',
                displayName: '需求确认.pdf',
                category: '需求文档',
                securityLevel: AttachmentSecurityLevel.Normal,
                status: ProjectHandoverAttachmentChecklistItemStatus.Included,
                selectionReason: '最终版附件',
                exclusionReason: null,
                downloadEligible: true,
                staleVersion: false,
                sourceRefs: [
                    {
                        sourceType: 'project',
                        sourceId: 'project-1',
                        relationType: 'handover',
                        label: 'PRJ-001'
                    }
                ],
                rowVersion: 1,
                updatedAt: '2026-04-20T10:30:00.000Z'
            },
            {
                selectionId: null,
                handoverId: 'handover-1',
                projectId: 'project-1',
                attachmentId: 'attachment-2',
                versionGroupId: 'version-group-2',
                displayName: '内部报价.xlsx',
                category: '报价文件',
                securityLevel: AttachmentSecurityLevel.Sensitive,
                status: ProjectHandoverAttachmentChecklistItemStatus.SensitiveExcluded,
                selectionReason: null,
                exclusionReason: '敏感附件默认排除',
                downloadEligible: false,
                staleVersion: false,
                sourceRefs: [],
                rowVersion: null,
                updatedAt: null
            }
        ]
    } as ProjectHandoverAttachmentChecklistView;
}

describe('ProjectContractHandover', () => {
    let fixture: ComponentFixture<ProjectContractHandover>;
    let contractHandoverSummarySignal: ReturnType<typeof signal<ContractHandoverSummaryView | null>>;
    let projectHandoverDetailSignal: ReturnType<typeof signal<ProjectHandoverDetailView | null>>;
    let handoverAttachmentChecklistSignal: ReturnType<typeof signal<ProjectHandoverAttachmentChecklistView | null>>;
    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let loadingAttachmentsSignal: ReturnType<typeof signal<boolean>>;
    let savingPackageSignal: ReturnType<typeof signal<boolean>>;
    let handoverAttachmentErrorSignal: ReturnType<typeof signal<string | null>>;
    let errorSignal: ReturnType<typeof signal<string | null>>;
    let workspaceStoreMock: {
        contractHandoverSummary: ReturnType<typeof signal<ContractHandoverSummaryView | null>>;
        projectHandoverDetail: ReturnType<typeof signal<ProjectHandoverDetailView | null>>;
        loadingContractHandover: ReturnType<typeof signal<boolean>>;
        contractHandoverError: ReturnType<typeof signal<string | null>>;
        handoverAttachmentChecklist: ReturnType<typeof signal<ProjectHandoverAttachmentChecklistView | null>>;
        handoverAttachmentDownloadPackage: ReturnType<typeof signal<null>>;
        loadingHandoverAttachments: ReturnType<typeof signal<boolean>>;
        refreshingHandoverAttachments: ReturnType<typeof signal<boolean>>;
        creatingHandoverAttachmentPackage: ReturnType<typeof signal<boolean>>;
        downloadingHandoverAttachmentPackage: ReturnType<typeof signal<boolean>>;
        handoverAttachmentError: ReturnType<typeof signal<string | null>>;
        loadContractHandover: jest.Mock;
        loadHandoverAttachmentChecklist: jest.Mock;
        refreshHandoverAttachmentChecklist: jest.Mock;
        createHandoverAttachmentDownloadPackage: jest.Mock;
        downloadHandoverAttachmentPackage: jest.Mock;
        loadHandoverAttachmentDownloadPackage: jest.Mock;
    };

    async function setup(summary: ContractHandoverSummaryView | null = createContractHandoverSummary(), error: string | null = null) {
        contractHandoverSummarySignal = signal<ContractHandoverSummaryView | null>(summary);
        projectHandoverDetailSignal = signal<ProjectHandoverDetailView | null>(summary ? createProjectHandoverDetail(summary) : null);
        handoverAttachmentChecklistSignal = signal<ProjectHandoverAttachmentChecklistView | null>(summary ? createAttachmentChecklist() : null);
        loadingSignal = signal(false);
        loadingAttachmentsSignal = signal(false);
        savingPackageSignal = signal(false);
        errorSignal = signal(error);
        handoverAttachmentErrorSignal = signal(null);
        workspaceStoreMock = {
            contractHandoverSummary: contractHandoverSummarySignal,
            projectHandoverDetail: projectHandoverDetailSignal,
            loadingContractHandover: loadingSignal,
            contractHandoverError: errorSignal,
            handoverAttachmentChecklist: handoverAttachmentChecklistSignal,
            handoverAttachmentDownloadPackage: signal(null),
            loadingHandoverAttachments: loadingAttachmentsSignal,
            refreshingHandoverAttachments: signal(false),
            creatingHandoverAttachmentPackage: savingPackageSignal,
            downloadingHandoverAttachmentPackage: signal(false),
            handoverAttachmentError: handoverAttachmentErrorSignal,
            loadContractHandover: jest.fn().mockResolvedValue(undefined),
            loadHandoverAttachmentChecklist: jest.fn().mockResolvedValue(handoverAttachmentChecklistSignal()),
            refreshHandoverAttachmentChecklist: jest.fn().mockResolvedValue(handoverAttachmentChecklistSignal()),
            createHandoverAttachmentDownloadPackage: jest.fn().mockResolvedValue(null),
            downloadHandoverAttachmentPackage: jest.fn().mockResolvedValue({ blob: new Blob(['zip']), fileName: 'handover.zip' }),
            loadHandoverAttachmentDownloadPackage: jest.fn().mockResolvedValue(null)
        };

        await TestBed.configureTestingModule({
            imports: [ProjectContractHandover],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({})
                        },
                        parent: {
                            snapshot: {
                                paramMap: convertToParamMap({ id: 'project-1' })
                            }
                        }
                    }
                },
                {
                    provide: ProjectWorkspaceStore,
                    useValue: workspaceStoreMock
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectContractHandover);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads and renders contract handover facts from existing views', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(workspaceStoreMock.loadContractHandover).toHaveBeenCalledWith('project-1');
        expect(workspaceStoreMock.loadHandoverAttachmentChecklist).toHaveBeenCalledWith('handover-1');
        expect(text).toContain('承接判断');
        expect(text).toContain('HT-001');
        expect(text).toContain('合同承接基线已稳定');
        expect(text).toContain('回款计划已初始化');
        expect(text).toContain('仍有一名参与人待确认');
        expect(text).toContain('附件移交清单');
        expect(text).toContain('需求确认.pdf');
        expect(text).toContain('敏感排除');
    });

    it('creates a handover attachment package from selected eligible items', async () => {
        await setup();

        await fixture.componentInstance.createHandoverAttachmentDownloadPackage();

        expect(workspaceStoreMock.createHandoverAttachmentDownloadPackage).toHaveBeenCalledWith({
            handoverId: 'handover-1',
            selectionIds: ['selection-1'],
            expectedSelectionVersions: [
                {
                    selectionId: 'selection-1',
                    rowVersion: 1
                }
            ],
            note: '由项目移交页面创建'
        });
    });

    it('renders contract set amount from backend projection', async () => {
        const summary = createContractHandoverSummary();
        summary.effectiveContractSetSummary.totalSignedAmountProjection = sensitiveProjection(null);
        summary.effectiveContractSetSummary.contracts[0].signedAmountProjection = sensitiveProjection(null);

        await setup(summary);

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('经营敏感字段已隐藏');
        expect(text).not.toContain('200,000.00 CNY');
    });

    it('shows user-readable error feedback when the handover view is unavailable', async () => {
        await setup(null, '当前项目还没有形成合同承接视图');

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('合同承接暂不可用');
        expect(text).toContain('当前项目还没有形成合同承接视图');
        expect(text).toContain('返回工作区总览');
    });
});
