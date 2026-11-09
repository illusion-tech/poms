import { TestBed } from '@angular/core/testing';
import { OperatingPreparationSchema, ProjectOperatingSnapshotSummarySchema, type HistoricalPeriodBaselineSelection, type OperatingPreparation, type SourceRef, type SourceRow } from '@poms/shared-contracts';
import { ProjectOperatingAuthoring, type OperatingAuthorCommand } from './project-operating-authoring';

const ref: SourceRef = { kind: 'ProjectActualCostRecord', id: '00000000-0000-4000-8000-000000000002', rowVersion: 3, payloadHash: 'a'.repeat(64) };
const unknown = { knowledge: 'unknown' as const, value: null, unknownReasonCode: 'source-monetary-layer-missing', evidenceRefs: [], zeroProof: null };
const row: SourceRow = {
    rowKind: 'direct-cost',
    sourceRef: ref,
    sourceMembers: [],
    state: 'unclassified',
    blockingReasonCodes: ['cost-classification-required'],
    currentDecisionRef: null,
    canonicalAccumulationKey: 'expense-record:00000000-0000-4000-8000-000000000003',
    sourceChainKey: 'expense-record:00000000-0000-4000-8000-000000000003',
    containsLabor: 'no',
    allowedRecognitionRoles: ['direct-source'],
    primaryCostRef: null,
    sourceBusinessDate: '2026-10-20',
    sourceEffectiveBusinessDate: '2026-10-20',
    financialProjection: { mode: 'full', displayText: '已授权', fieldPackageKeys: ['operating-finance'], value: { currency: 'CNY', net: unknown, tax: unknown, gross: unknown, rate: null, detailText: null } }
};
const prepared: OperatingPreparation = {
    outputVersion: 'server-derived-v1',
    kind: 'preparation-only',
    officialSnapshotRef: null,
    intent: 'snapshot-create',
    projectId: '00000000-0000-4000-8000-000000000001',
    headVersion: 2,
    projectVersion: 5,
    expectedInputHash: 'b'.repeat(64),
    preparedAt: '2026-11-06T00:00:00Z',
    businessCutoff: '2026-11-06',
    periodKey: null,
    formalEligibility: { status: 'missing-evidence', blockingReasonCodes: ['cost-classification-required'], missingEvidenceRefs: [ref] },
    evaluationStatus: 'not-evaluated',
    sourceRows: [row],
    proposedOriginalCostRef: null,
    selectedBaselinePackageRef: { ...ref, kind: 'OperatingBaselinePackage', id: '00000000-0000-4000-8000-000000000004', rowVersion: 1 },
    periodBaselineSelection: null,
    allowedCommandCodes: [],
    blockingReasonCodes: ['cost-classification-required'],
    proposedAffectedTargets: []
};

describe('ProjectOperatingAuthoring', () => {
    it('renders unknown monetary layers without inventing zero', async () => {
        await TestBed.configureTestingModule({ imports: [ProjectOperatingAuthoring] }).compileComponents();
        const fixture = TestBed.createComponent(ProjectOperatingAuthoring);
        fixture.componentRef.setInput('preparation', prepared);
        fixture.detectChanges();
        const text: string = fixture.nativeElement.textContent;
        expect(text).toContain('未知（source-monetary-layer-missing）');
        expect(text).not.toContain('0.00');
        expect(fixture.componentInstance.canSubmit()).toBe(false);
    });

    it('emits only a complete typed command after an explicit reasoned classification', async () => {
        await TestBed.configureTestingModule({ imports: [ProjectOperatingAuthoring] }).compileComponents();
        const fixture = TestBed.createComponent(ProjectOperatingAuthoring);
        fixture.componentRef.setInput('preparation', prepared);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        const select = document.createElement('select');
        select.add(new Option('排除', 'exclude'));
        select.value = 'exclude';
        select.addEventListener('change', (event) => component.chooseDecision(row, event));
        select.dispatchEvent(new Event('change'));
        const reason = document.createElement('input');
        reason.value = '真实来源尚待净税层确认，本次显式排除并保留待处理事实';
        reason.addEventListener('input', (event) => component.setDecisionReason(row, event));
        reason.dispatchEvent(new Event('input'));
        expect(component.canSubmit()).toBe(true);
        const commands: OperatingAuthorCommand[] = [];
        component.commandRequested.subscribe((command) => commands.push(command));
        component.submit();
        expect(commands).toHaveLength(1);
        const command = commands[0];
        expect(command.kind).toBe('create-snapshot');
        if (command.kind !== 'create-snapshot') throw new Error('Expected snapshot command');
        expect(command.request.expectedInputHash).toBe(prepared.expectedInputHash);
        expect(command.request.costDecisions[0].target.expectedVersion).toBe(3);
        expect(command.request.costDecisions[0].decision).toBe('exclude');
        expect(command.request).not.toHaveProperty('includedCostTotal');
        expect(command.request).not.toHaveProperty('currentActionLevel');
    });

    it('keeps a changed intent and stale versions from submitting', async () => {
        await TestBed.configureTestingModule({ imports: [ProjectOperatingAuthoring] }).compileComponents();
        const fixture = TestBed.createComponent(ProjectOperatingAuthoring);
        fixture.componentRef.setInput('preparation', { ...prepared, intent: 'period-close' });
        fixture.detectChanges();
        const commands: OperatingAuthorCommand[] = [];
        fixture.componentInstance.commandRequested.subscribe((command) => commands.push(command));
        fixture.componentInstance.submit();
        expect(commands).toEqual([]);
        expect(fixture.componentInstance.canSubmit()).toBe(false);
    });
});

// Synthetic UI fixtures parsed by the actual canonical273 schemas. They are not
// producer/period/DOM delivery evidence and contain no private runtime data.
const historicalSelection: HistoricalPeriodBaselineSelection = {
    policyVersion: 'historical-adoption-chain272-v1', publicationMode: 'new-period-package',
    periodKey: '2026-W44', businessCutoff: '2026-11-01', selectionHash: 'c'.repeat(64),
    originalAdoptedCostRef: { ...ref, kind: 'ProjectTechnicalCostPackage', id: '00000000-0000-4000-8000-000000000010', rowVersion: 1 },
    selectedAdoptedCostRef: { ...ref, kind: 'ProjectTechnicalCostPackage', id: '00000000-0000-4000-8000-000000000011', rowVersion: 2 },
    handoverBasisRef: null, handoverRebaselineRef: null,
    adoptionSourceRefs: [{ ...ref, kind: 'ContractTermSnapshot', id: '00000000-0000-4000-8000-000000000012', rowVersion: 4 }],
    technicalLineageRefs: [{ ...ref, kind: 'ProjectTechnicalCostPackage', id: '00000000-0000-4000-8000-000000000013', rowVersion: 1 }]
};
function periodPreparation(): OperatingPreparation {
    return OperatingPreparationSchema.parse({ ...prepared, intent: 'period-close', periodKey: historicalSelection.periodKey,
        businessCutoff: historicalSelection.businessCutoff, selectedBaselinePackageRef: null, periodBaselineSelection: historicalSelection,
        formalEligibility: { status: 'eligible', blockingReasonCodes: [], missingEvidenceRefs: [] },
        sourceRows: [], blockingReasonCodes: [], allowedCommandCodes: ['period-close'] });
}
async function periodFixture(value: OperatingPreparation) {
    await TestBed.configureTestingModule({ imports: [ProjectOperatingAuthoring] }).compileComponents();
    const fixture = TestBed.createComponent(ProjectOperatingAuthoring);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const intent = host.querySelector('select');
    if (!intent) throw new Error('Missing actual authoring task select');
    intent.value = 'period-close'; intent.dispatchEvent(new Event('change')); fixture.detectChanges();
    const period = host.querySelector<HTMLInputElement>('input[aria-label="期间 YYYY-MM 或 YYYY-Www"]');
    if (!period) throw new Error('Missing actual period control');
    period.value = historicalSelection.periodKey; period.dispatchEvent(new Event('input'));
    fixture.componentRef.setInput('preparation', value); fixture.detectChanges();
    return fixture;
}
function excludeCost(fixture: Awaited<ReturnType<typeof periodFixture>>, source: SourceRow) {
    const host: HTMLElement = fixture.nativeElement;
    const decision = host.querySelector<HTMLSelectElement>('select[aria-label="成本分类"]');
    if (!decision) throw new Error('Missing actual cost classification control');
    decision.value = 'exclude'; decision.dispatchEvent(new Event('change')); fixture.detectChanges();
    const reason = host.querySelector<HTMLInputElement>('tbody input');
    if (!reason || !source) throw new Error('Missing classification reason');
    reason.value = '按本次真实来源核对结果显式排除，保留后续处理依据'; reason.dispatchEvent(new Event('input')); fixture.detectChanges();
}
describe('273 server-selected historical first close', () => {
    it('displays only server budget/ref proof and clicks a required explicit-null period command', async () => {
        const value = periodPreparation(); const fixture = await periodFixture(value);
        const host: HTMLElement = fixture.nativeElement;
        const proof = host.querySelector('[aria-label="本期期末预算选择"]');
        expect(proof?.textContent).toContain(historicalSelection.selectedAdoptedCostRef.id);
        expect(proof?.textContent).toContain(historicalSelection.originalAdoptedCostRef.id);
        expect(proof?.textContent).toContain(historicalSelection.selectionHash);
        expect(proof?.querySelectorAll('input, select, textarea').length).toBe(0);
        const commands: OperatingAuthorCommand[] = []; fixture.componentInstance.commandRequested.subscribe(c => commands.push(c));
        const submit = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === '冻结服务端经营快照');
        expect(submit?.disabled).toBe(false); submit?.click();
        expect(commands).toHaveLength(1);
        const command = commands[0]; if (command.kind !== 'close-period') throw new Error('Expected canonical period command');
        expect(Object.hasOwn(command.request, 'baselinePackageRef')).toBe(true);
        expect(command.request.baselinePackageRef).toBeNull();
        expect(command.request.expectedInputHash).toBe(value.expectedInputHash);
        expect(command.request.periodKey).toBe(value.periodKey);
        expect(command.request).not.toHaveProperty('selectionHash');
        expect(command.request).not.toHaveProperty('businessCutoff');
    });

    it.each(['historical-adoption-chain-ambiguous', 'historical-adoption-evidence-missing', 'tax-rate-missing', 'stage-evidence-missing', 'currency-unproven-or-multiple'])('keeps %s blocked after a visible server selection', async reason => {
        const value = periodPreparation();
        const fixture = await periodFixture({ ...value, blockingReasonCodes: [reason], allowedCommandCodes: [], formalEligibility: { status: 'missing-evidence', blockingReasonCodes: [reason], missingEvidenceRefs: [] } });
        const commands: OperatingAuthorCommand[] = []; fixture.componentInstance.commandRequested.subscribe(c => commands.push(c)); fixture.componentInstance.submit();
        expect(fixture.componentInstance.canSubmit()).toBe(false); expect(commands).toEqual([]);
    });

    it('requires a real selection and a matching server period/cutoff', async () => {
        const fixture = await periodFixture({ ...periodPreparation(), periodBaselineSelection: null });
        expect(fixture.componentInstance.canSubmit()).toBe(false);
        fixture.componentRef.setInput('preparation', { ...periodPreparation(), periodBaselineSelection: { ...historicalSelection, periodKey: '2026-W43' } }); fixture.detectChanges();
        expect(fixture.componentInstance.canSubmit()).toBe(false);
        fixture.componentRef.setInput('preparation', { ...periodPreparation(), periodBaselineSelection: { ...historicalSelection, businessCutoff: '2026-10-31' } }); fixture.detectChanges();
        expect(fixture.componentInstance.canSubmit()).toBe(false);
    });

    it('requires server allowed command or an exact complete same-command classification', async () => {
        const value = periodPreparation();
        const fixture = await periodFixture({ ...value, allowedCommandCodes: [] });
        expect(fixture.componentInstance.canSubmit()).toBe(false);
        const classification = OperatingPreparationSchema.parse({ ...value, sourceRows: [row], allowedCommandCodes: [], blockingReasonCodes: ['source-not-ready', 'cost-classification-required'], formalEligibility: prepared.formalEligibility });
        fixture.componentRef.setInput('preparation', classification); fixture.detectChanges();
        expect(fixture.componentInstance.canSubmit()).toBe(false);
        excludeCost(fixture, row);
        expect(fixture.componentInstance.canSubmit()).toBe(true);
        const commands: OperatingAuthorCommand[] = []; fixture.componentInstance.commandRequested.subscribe(c => commands.push(c)); fixture.componentInstance.submit();
        const command = commands[0]; if (command.kind !== 'close-period') throw new Error('Expected period command');
        expect(command.request.baselinePackageRef).toBeNull(); expect(command.request.costDecisions[0].target.expectedVersion).toBe(row.sourceRef.rowVersion);
        fixture.componentRef.setInput('preparation', { ...classification, sourceRows: [{ ...row, sourceRef: { ...row.sourceRef, rowVersion: 4 } }] }); fixture.detectChanges();
        expect(fixture.componentInstance.canSubmit()).toBe(false);
    });

    it('does not let source-not-ready hide an unclassified tax or another missing source', async () => {
        const value = periodPreparation();
        const fixture = await periodFixture({ ...value, sourceRows: [row], allowedCommandCodes: [], blockingReasonCodes: ['source-not-ready'], formalEligibility: { status: 'missing-evidence', blockingReasonCodes: ['source-not-ready'], missingEvidenceRefs: [ref] } });
        excludeCost(fixture, row); expect(fixture.componentInstance.canSubmit()).toBe(false);
        fixture.componentRef.setInput('preparation', { ...value, sourceRows: [row, { ...row, rowKind: 'tax-evidence', state: 'pending', sourceRef: { ...ref, id: '00000000-0000-4000-8000-000000000014' }, blockingReasonCodes: ['tax-evidence-missing'] }], allowedCommandCodes: [], blockingReasonCodes: ['source-not-ready', 'cost-classification-required'], formalEligibility: prepared.formalEligibility }); fixture.detectChanges();
        expect(fixture.componentInstance.canSubmit()).toBe(false);
    });

    it('never borrows a live baseline for a first period close', async () => {
        const fixture = await periodFixture({ ...periodPreparation(), selectedBaselinePackageRef: prepared.selectedBaselinePackageRef });
        expect(fixture.componentInstance.canSubmit()).toBe(false);
    });

    it('keeps realtime dependent on the true non-null baseline reference', async () => {
        await TestBed.configureTestingModule({ imports: [ProjectOperatingAuthoring] }).compileComponents();
        const fixture = TestBed.createComponent(ProjectOperatingAuthoring);
        fixture.componentRef.setInput('preparation', { ...periodPreparation(), intent: 'snapshot-create', periodKey: null, periodBaselineSelection: null, allowedCommandCodes: ['snapshot-create'] }); fixture.detectChanges();
        expect(fixture.componentInstance.canSubmit()).toBe(false);
        fixture.componentRef.setInput('preparation', { ...prepared, sourceRows: [], blockingReasonCodes: [], formalEligibility: { status: 'eligible', blockingReasonCodes: [], missingEvidenceRefs: [] }, allowedCommandCodes: ['snapshot-create'] }); fixture.detectChanges();
        const commands: OperatingAuthorCommand[] = []; fixture.componentInstance.commandRequested.subscribe(c => commands.push(c)); fixture.componentInstance.submit();
        const command = commands[0]; if (command.kind !== 'create-snapshot') throw new Error('Expected realtime command');
        expect(command.request.baselinePackageRef?.id).toBe(prepared.selectedBaselinePackageRef?.id);
    });

    it('shows the original immutable budget on an existing-period restatement', async () => {
        const stageIds = { first: ref.id, second: ref.id, final: ref.id, retention: ref.id };
        const original = ProjectOperatingSnapshotSummarySchema.parse({ outputVersion: 'server-derived-v1', id: ref.id, projectId: prepared.projectId, rowVersion: 1, capturedRowVersion: 1, headVersion: 1, producerVersion: 1, certification: 'verified', sourceHash: 'a'.repeat(64), sourceContextId: ref.id, sourcePayloadHash: 'b'.repeat(64), containsLabor: 'no', financialProjection: { mode: 'masked', displayText: '未授权', fieldPackageKeys: ['operating-finance'], value: null }, sourceRows: [], createdAt: prepared.preparedAt, updatedAt: prepared.preparedAt, snapshotMode: 'period-end', snapshotAt: prepared.preparedAt, sourceWindowStart: null, sourceWindowEnd: historicalSelection.businessCutoff, knowledgeCutoff: prepared.preparedAt, businessTimezone: 'Asia/Hong_Kong', status: 'active', supersedesId: null, baselinePackageRef: historicalSelection.originalAdoptedCostRef, periodEndSnapshotRef: { ...ref, kind: 'PeriodClosingSnapshot' }, restatementRef: null, currentActionLevel: 'review', formalEligibility: { status: 'eligible', blockingReasonCodes: [], missingEvidenceRefs: [] }, evaluationStatus: 'evaluated', evaluationRefs: { maturityEvaluationId: ref.id, signalEvaluationId: ref.id, signalRowVersion: 1, bindingIds: stageIds, summarySnapshotIds: stageIds, evaluationHash: 'd'.repeat(64), policyVersion: 'r4h-operating-v1' } });
        const fixture = await periodFixture({ ...periodPreparation(), intent: 'restatement', selectedBaselinePackageRef: original.baselinePackageRef, periodBaselineSelection: null });
        fixture.componentInstance.intent.set('restatement'); fixture.componentRef.setInput('originalSnapshot', original); fixture.detectChanges();
        const host: HTMLElement = fixture.nativeElement;
        expect(host.querySelector('[aria-label="原期间冻结预算"]')?.textContent).toContain(original.baselinePackageRef.id);
        expect(host.querySelector('[aria-label="本期期末预算选择"]')).toBeNull();
    });
});
