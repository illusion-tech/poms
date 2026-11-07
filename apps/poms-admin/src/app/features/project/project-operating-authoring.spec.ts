import { TestBed } from '@angular/core/testing';
import type { OperatingPreparation, SourceRef, SourceRow } from '@poms/shared-contracts';
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
