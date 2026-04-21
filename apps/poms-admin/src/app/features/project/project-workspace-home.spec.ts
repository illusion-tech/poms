import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectStore, ProjectWorkspaceStore, type ProjectDetailView, type ProjectWorkspaceGuidanceView } from '@poms/admin-data-access';
import { ProjectWorkspaceHome } from './project-workspace-home';

function createProject(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectCode: 'P-2026-001',
        projectName: '华南地铁运营平台',
        customerId: null,
        customerName: '华南地铁集团',
        status: 'active',
        currentStage: 'handover',
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        plannedSignAt: null,
        closedAt: null,
        closedReason: null,
        rowVersion: 3,
        createdAt: '2026-04-19T10:00:00.000Z',
        createdBy: 'system',
        updatedAt: '2026-04-20T10:00:00.000Z',
        updatedBy: 'admin',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        stageSummary: {
            currentStage: 'handover',
            status: 'active',
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            blockingReasons: []
        },
        currentBidSummary: {
            bidProcessId: null,
            bidStatus: 'not_configured',
            resultStatus: null,
            summary: null
        },
        currentContractSummary: {
            activeContractCount: 1,
            latestContractId: 'contract-1',
            latestContractNo: 'HT-2026-001',
            latestContractStatus: 'active',
            signedAmount: '123456.78',
            currencyCode: 'CNY',
            signedAt: '2026-04-18T00:00:00.000Z',
            currentSnapshotId: 'snapshot-1'
        },
        currentApprovalSummary: {
            summarySnapshotId: 'summary-1',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project',
            exportPolicy: 'internal',
            generatedAt: '2026-04-20T08:00:00.000Z'
        },
        currentConfirmationSummary: {
            confirmationRecordId: null,
            status: 'not_configured',
            requiredCount: 0,
            confirmedCount: 0,
            pendingCount: 0,
            confirmedAt: null
        },
        summarySnapshotId: 'summary-1',
        projectionLevel: 'project',
        exportPolicy: 'internal',
        allowedActions: ['view-project-workspace'],
        generatedAt: '2026-04-20T08:00:00.000Z',
        ...overrides
    };
}

function createGuidance(overrides: Partial<ProjectWorkspaceGuidanceView> = {}): ProjectWorkspaceGuidanceView {
    return {
        projectId: 'project-1',
        currentStage: 'handover',
        status: 'active',
        currentStageLabel: '项目移交',
        statusLabel: '正常推进',
        headline: '后端确认的工作区总览',
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
                key: 'operating-overview',
                label: '经营总览',
                description: '查看收入、成本、回款和经营口径。',
                route: '/projects/project-1/workspace/operating-overview',
                enabled: true,
                disabledReason: null,
                actionKey: 'contract:finance:manage'
            },
            {
                key: 'commission-operations',
                label: '提成操作',
                description: '处理提成规则、计算、发放和调整。',
                route: null,
                enabled: false,
                disabledReason: '后端判定当前不能处理提成操作。',
                actionKey: 'manage-project-commission'
            }
        ],
        generatedAt: '2026-04-20T08:00:00.000Z',
        ...overrides
    };
}

describe('ProjectWorkspaceHome', () => {
    let fixture: ComponentFixture<ProjectWorkspaceHome>;
    let projectSignal: ReturnType<typeof signal<ProjectDetailView | null>>;
    let guidanceSignal: ReturnType<typeof signal<ProjectWorkspaceGuidanceView | null>>;
    let guidanceErrorSignal: ReturnType<typeof signal<string | null>>;

    async function setup(guidance: ProjectWorkspaceGuidanceView | null = createGuidance()) {
        projectSignal = signal<ProjectDetailView | null>(createProject());
        guidanceSignal = signal<ProjectWorkspaceGuidanceView | null>(guidance);
        guidanceErrorSignal = signal<string | null>(null);

        await TestBed.configureTestingModule({
            imports: [ProjectWorkspaceHome],
            providers: [
                provideRouter([]),
                {
                    provide: ProjectStore,
                    useValue: {
                        selectedProject: projectSignal
                    }
                },
                {
                    provide: ProjectWorkspaceStore,
                    useValue: {
                        guidance: guidanceSignal,
                        guidanceError: guidanceErrorSignal
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectWorkspaceHome);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('renders workspace home from backend guidance only', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('后端确认的工作区总览');
        expect(text).toContain('先完成移交和经营快照确认');
        expect(text).toContain('缺少回款确认');
        expect(text).toContain('请财务补齐回款确认后再继续');
        expect(text).toContain('财务负责人');
        expect(text).toContain('工作区总览');
        expect(text).toContain('经营总览');
        expect(text).toContain('提成操作');
        expect(text).toContain('后端判定当前不能处理提成操作。');
        expect(text).not.toContain('已落地入口');
        expect(text).not.toContain('本轮边界');
        expect(text).not.toContain('暂不覆盖');
        expect(text).not.toContain('generated client');
    });

    it('does not create a link when backend marks an entry disabled or route is absent', async () => {
        await setup();

        const commissionLink = fixture.nativeElement.querySelector('a[href="/projects/project-1/commission/operations"]');
        const operatingLink = fixture.nativeElement.querySelector('a[href="/projects/project-1/workspace/operating-overview"]');

        expect(operatingLink).not.toBeNull();
        expect(commissionLink).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('暂不可进入');
    });

    it('shows guidance read error when the guidance view is unavailable', async () => {
        await setup(null);
        guidanceErrorSignal.set('当前项目还没有形成工作区引导。');
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('正在整理工作区');
        expect(text).toContain('当前项目还没有形成工作区引导。');
    });
});
