import { TestBed } from '@angular/core/testing';
import { FullProjectDetailViewSchema, type FullProjectDetailView, type FrozenLifecycleEvidence, type ProjectCompletionRecordList } from '@poms/shared-contracts';
import { lifecycleContext } from './project-governance-facts';
import { ProjectLifecycleAuthoring, type ProjectLifecycleAuthoringApi } from './project-lifecycle-authoring';

const projectId = '10000000-0000-4000-8000-000000000001';
const completionId = '20000000-0000-4000-8000-000000000001';
const conditionId = '30000000-0000-4000-8000-000000000001';
const actorId = '40000000-0000-4000-8000-000000000001';
const evidence: FrozenLifecycleEvidence = { attachmentLinkId: '50000000-0000-4000-8000-000000000001', attachmentId: '60000000-0000-4000-8000-000000000001', attachmentRowVersion: 2, checksumSha256: 'a'.repeat(64), fileName: '本条件证据.pdf' };
const ownRecords = (): ProjectCompletionRecordList => ({
    scopeKind: 'own-condition-only',
    projectId,
    items: [
        {
            completionRecordId: completionId,
            completionRowVersion: 4,
            conditionStatus: 'pending',
            ownTasks: [{ conditionId, conditionRowVersion: 2, summary: '本人真实条件', responsibleUserId: actorId, dueAt: '2026-11-07T01:00:00.000Z', status: 'pending', evidenceRefs: [evidence], closure: null }]
        }
    ]
});

function apiFixture() {
    const unexpected = jest.fn(async () => {
        throw new Error('Unexpected full-scope request');
    });
    const api: ProjectLifecycleAuthoringApi = {
        loadCompletionRecords: jest.fn(async () => ownRecords()),
        loadAcceptanceRecords: unexpected,
        loadArchiveRecords: unexpected,
        startExecution: unexpected,
        startAcceptance: unexpected,
        createAcceptance: unexpected,
        createCompletion: unexpected,
        createArchive: unexpected,
        replaceArchive: unexpected,
        voidArchive: unexpected,
        closeCondition: jest.fn(async () => ({
            scopeKind: 'own-condition-only' as const,
            targetId: completionId,
            conditionId,
            conditionStatus: 'closed',
            completionConditionStatus: 'pending' as const,
            completionRowVersion: 5,
            conditionRowVersion: 3,
            closureRecordId: '70000000-0000-4000-8000-000000000001',
            closedAt: '2026-11-06T01:00:00.000Z',
            closedBy: actorId,
            sourcePayloadHash: 'b'.repeat(64),
            closureEvidenceRefs: [evidence]
        })),
        uploadEvidence: unexpected,
        uploadConditionEvidence: unexpected,
        openEvidence: jest.fn(async () => undefined)
    };
    return { api, unexpected };
}

describe('ProjectLifecycleAuthoring own tasks', () => {
    it('starts directly with the completion union and never preloads full project panels', async () => {
        await TestBed.configureTestingModule({ imports: [ProjectLifecycleAuthoring] }).compileComponents();
        const { api, unexpected } = apiFixture();
        const fixture = TestBed.createComponent(ProjectLifecycleAuthoring);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.componentRef.setInput('api', api);
        fixture.componentRef.setInput('ownTasksOnly', true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(api.loadCompletionRecords).toHaveBeenCalledWith(projectId);
        expect(unexpected).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('本人真实条件');
        expect(fixture.nativeElement.textContent).not.toContain('记录本次验收');
    });

    it('closes through both route IDs and both returned versions with only own evidence', async () => {
        await TestBed.configureTestingModule({ imports: [ProjectLifecycleAuthoring] }).compileComponents();
        const { api, unexpected } = apiFixture();
        const fixture = TestBed.createComponent(ProjectLifecycleAuthoring);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.componentRef.setInput('api', api);
        fixture.componentRef.setInput('canCloseOwnConditions', true);
        fixture.detectChanges();
        await fixture.whenStable();
        const component = fixture.componentInstance;
        component.closureSummaries[conditionId] = '本人提交本条件闭合说明';
        component.reuseTaskEvidence[conditionId] = true;
        await component.close(component.tasks()[0]);
        expect(api.closeCondition).toHaveBeenCalledWith(completionId, conditionId, {
            inputVersion: 'server-derived-v1',
            expectedCompletionVersion: 4,
            expectedConditionVersion: 2,
            closureSummary: '本人提交本条件闭合说明',
            evidenceRefs: [{ attachmentLinkId: evidence.attachmentLinkId }]
        });
        expect(unexpected).not.toHaveBeenCalled();
    });
});

function fullProject(status: FullProjectDetailView['status'], currentStage: FullProjectDetailView['currentStage']): FullProjectDetailView {
    const instant = '2026-11-18T00:00:00.000Z';
    return FullProjectDetailViewSchema.parse({ scopeKind: 'full-project', projectRowVersion: 3, currentStageRecordId: null, executionAdmissionContext: null,
        id: projectId, projectNo: 'UNIT-LIFECYCLE', projectName: '单元测试归档项目', sourceLeadId: null, customerId: null, customerName: null, customerProjectNo: null,
        status, currentStage, ownerOrgId: '00000000-0000-4000-8000-000000003001', ownerUserId: actorId,
        plannedSignAt: null, closedAt: status === 'closed' ? instant : null, closedReason: status === 'closed' ? '项目终态' : null, rowVersion: 3, createdAt: instant, createdBy: null, updatedAt: instant, updatedBy: null,
        ownerName: '单元经办人', ownerOrgName: '单元组织', sourceLeadSummary: null,
        stageSummary: { currentStage, status, plannedSignAt: null, closedAt: status === 'closed' ? instant : null, closedReason: status === 'closed' ? '项目终态' : null, blockingReasons: [] },
        currentBidSummary: { tenderNo: null, bidPackageNo: null, bidProcessId: null, bidStatus: 'not_configured', resultStatus: null, summary: null },
        currentContractSummary: { activeContractCount: 0, latestContractId: null, latestContractNo: null, latestContractStatus: null,
            signedAmountProjection: { fieldPackageKey: 'contract-finance', mode: 'masked', value: null, displayText: '已隐藏', reasonCode: 'missing-sensitive-read-permission' },
            currencyCode: null, signedAt: null, currentSnapshotId: null },
        currentApprovalSummary: { summarySnapshotId: null, summaryPackageKey: null, projectionLevel: null, exportPolicy: null, generatedAt: null },
        currentConfirmationSummary: { confirmationRecordId: null, status: 'not_configured', requiredCount: 0, confirmedCount: 0, pendingCount: 0, confirmedAt: null },
        summarySnapshotId: null, projectionLevel: null, exportPolicy: null, allowedActions: [], generatedAt: instant });
}

describe('ProjectLifecycleAuthoring terminal archive entry', () => {
    const cases: [FullProjectDetailView['status'], FullProjectDetailView['currentStage'], boolean][] = [
        ['closed', 'closed-lost', true],
        ['closed', 'closed-terminated', true],
        ['completed', 'completed', true],
        ['completed', 'conditional-completed', true],
        ['active', 'execution', false],
        ['active', 'acceptance', false]
    ];
    it.each(cases)('shows archive only for authorized terminal state %s/%s', async (status, stage, expected) => {
        await TestBed.configureTestingModule({ imports: [ProjectLifecycleAuthoring] }).compileComponents();
        const { api } = apiFixture();
        const fullApi: ProjectLifecycleAuthoringApi = {
            ...api,
            loadCompletionRecords: jest.fn(async () => ({ scopeKind: 'full-project', projectId, items: [] })),
            loadAcceptanceRecords: jest.fn(async () => []),
            loadArchiveRecords: jest.fn(async () => [])
        };
        const fixture = TestBed.createComponent(ProjectLifecycleAuthoring);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.componentRef.setInput('api', fullApi);
        fixture.componentRef.setInput('context', lifecycleContext(fullProject(status, stage), true));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent.includes('登记终态归档')).toBe(expected);
        expect(lifecycleContext(fullProject(status, stage), false).canArchive).toBe(false);
    });
});