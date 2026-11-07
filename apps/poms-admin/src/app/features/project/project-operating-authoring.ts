import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type {
    ActivateOperatingBaselinePackageRequest,
    CostDecisionInput,
    CreateOperatingRestatementRequest,
    CreatePeriodClosingSnapshotRequest,
    CreateProjectOperatingSnapshotRequest,
    ExpectedRef,
    OperatingCommandResult,
    OperatingPreparation,
    SourceRow,
    ProjectOperatingSnapshotSummary,
    SourceRef
} from '@poms/shared-contracts';

type OperatingSourceRow = SourceRow;

export type OperatingAuthorCommand =
    | { kind: 'activate-baseline'; request: ActivateOperatingBaselinePackageRequest }
    | { kind: 'create-snapshot'; request: CreateProjectOperatingSnapshotRequest }
    | { kind: 'close-period'; request: CreatePeriodClosingSnapshotRequest }
    | { kind: 'restate'; request: CreateOperatingRestatementRequest };

export interface OperatingPreparationQuery {
    view: 'preparation';
    intent: 'baseline-activation' | 'snapshot-create' | 'period-close' | 'restatement';
    snapshotMode: 'realtime' | 'period-end';
    periodKey: string | null;
    restatesSnapshotId: string | null;
    periodEndSnapshotId: string | null;
    correctionSourceRefs: string | null;
}

/** Root mounts this author surface and supplies the generated API adapters. */
@Component({
    selector: 'app-project-operating-authoring',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="rounded-xl border border-surface p-4" aria-label="经营核算编制">
            <h2 class="text-lg font-semibold">经营核算编制</h2>
            <p class="mt-1 text-sm text-muted-color">先核对真实来源，再冻结累计经营口径。期末按项目开始至所选期间末累计。</p>
            @if (busy()) {
                <p role="status" class="mt-3">正在读取或保存，请稍候…</p>
            }
            @if (error(); as message) {
                <div role="alert" class="mt-3 rounded border border-red-300 p-3">
                    <p>{{ message }}</p>
                    <button type="button" class="mt-2 underline" [disabled]="busy()" (click)="reload()">重新读取来源和版本</button>
                </div>
            }
            <div class="mt-4 flex flex-wrap gap-3">
                <label
                    >编制任务
                    <select class="ml-2 rounded border p-2" [value]="intent()" [disabled]="busy()" (change)="changeIntent($event)">
                        <option value="baseline-activation">采用正式估算基线</option>
                        <option value="snapshot-create">实时经营快照</option>
                        <option value="period-close">期末累计冻结</option>
                        <option value="restatement">重述已冻结口径</option>
                    </select>
                </label>
                @if (intent() === 'period-close') {
                    <label
                        >已结束期间
                        <input class="ml-2 rounded border p-2" aria-label="期间 YYYY-MM 或 YYYY-Www" placeholder="2026-10 / 2026-W44" [value]="periodKey()" (input)="setPeriod($event)" />
                    </label>
                }
                <button type="button" class="rounded border px-3 py-2" [disabled]="busy()" (click)="reload()">读取编制依据</button>
            </div>
            @if (preparation(); as prepared) {
                <p class="mt-3 text-sm">项目版本 {{ prepared.projectVersion }} · 经营版本 {{ prepared.headVersion }} · 截止 {{ prepared.businessCutoff }}</p>
                <p class="mt-1 break-all font-mono text-xs">输入指纹 {{ prepared.expectedInputHash }}</p>
                @if (prepared.blockingReasonCodes.length) {
                    <div class="mt-3 rounded bg-amber-50 p-3 text-slate-900" role="status">
                        <p>需要处理的依据：</p>
                        <ul class="list-inside list-disc">
                            @for (code of prepared.blockingReasonCodes; track code) {
                                <li>{{ code }}</li>
                            }
                        </ul>
                        <p class="mt-2 text-sm">缺失回款净税依据请进入回款确认；缺失成本、阶段或税务依据请进入对应真实来源办理。</p>
                    </div>
                }
                @if (!prepared.officialSnapshotRef) {
                    <p class="mt-3">尚无正式经营快照。本页显示编制依据，未形成正式经营结论。</p>
                }
                <div class="mt-4 overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <caption class="sr-only">
                            真实经营来源、版本、资格和纳入口径
                        </caption>
                        <thead>
                            <tr>
                                <th class="p-2">来源与版本</th>
                                <th class="p-2">资格</th>
                                <th class="p-2">服务端金额投影</th>
                                <th class="p-2">本次分类</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (row of prepared.sourceRows; track row.sourceRef.kind + ':' + row.sourceRef.id) {
                                <tr class="border-t align-top">
                                    <td class="p-2">
                                        <p>{{ row.sourceRef.kind }} · v{{ row.sourceRef.rowVersion }}</p>
                                        <code class="break-all text-xs">{{ row.sourceRef.id }}</code>
                                        @if (row.sourceBusinessDate) {
                                            <p>{{ row.sourceBusinessDate }}</p>
                                        }
                                    </td>
                                    <td class="p-2">
                                        <p>{{ row.state }}</p>
                                        @for (code of row.blockingReasonCodes; track code) {
                                            <p class="text-xs">{{ code }}</p>
                                        }
                                    </td>
                                    <td class="p-2">
                                        @if (row.financialProjection.value; as values) {
                                            <p>未税 {{ amountLabel(values.net) }} · 税 {{ amountLabel(values.tax) }} · 含税 {{ amountLabel(values.gross) }}</p>
                                        } @else {
                                            <p>{{ row.financialProjection.displayText }}</p>
                                        }
                                    </td>
                                    <td class="p-2">
                                        @if (classifiable(row)) {
                                            <select class="rounded border p-1" aria-label="成本分类" [value]="decisions()[row.sourceRef.id]?.decision ?? ''" (change)="chooseDecision(row, $event)">
                                                <option value="">沿用已冻结分类 / 请选择</option>
                                                <option value="include">纳入真实主成本</option>
                                                <option value="exclude">排除并保留依据</option>
                                            </select>
                                            @if (decisions()[row.sourceRef.id]; as decision) {
                                                <label class="mt-2 block">原因 <input class="w-full rounded border p-1" [value]="decision.reasonText" (input)="setDecisionReason(row, $event)" /></label>
                                                <label class="mt-2 block"
                                                    >真实证据
                                                    <select class="w-full rounded border p-1" multiple aria-label="分类证据" (change)="setEvidence(row, $event)">
                                                        @for (evidence of evidenceRows(); track evidence.sourceRef.id) {
                                                            <option [value]="evidence.sourceRef.id">{{ evidence.sourceRef.kind }} · {{ evidence.sourceRef.id }}</option>
                                                        }
                                                    </select>
                                                </label>
                                            }
                                        } @else {
                                            <span>只读来源</span>
                                        }
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <label class="mt-4 block"
                    >采用或重述理由
                    <textarea class="mt-1 w-full rounded border p-2" rows="2" maxlength="2000" [value]="reason()" (input)="setReason($event)"></textarea>
                </label>
                @if (intent() === 'restatement') {
                    <label class="mt-2 block"
                        >重述类型
                        <select class="rounded border p-2" [value]="correctionMode()" (change)="setCorrectionMode($event)">
                            <option value="late-facts">真实迟到事实</option>
                            <option value="source-correction">受控来源纠正</option>
                        </select></label
                    >
                    <p class="mt-2 text-sm">原快照 {{ originalSnapshot()?.id ?? '请选择正式历史快照' }}。来源纠正由现有人工成本、完整分摊、阶段归属、税务表单提供封闭纠正请求。</p>
                    @if (correctionMode() === 'source-correction' && !correctionRefs().length) {
                        <p class="mt-1 text-sm">请先在真实来源表单选择原纠正来源，再重新读取完整影响集。</p>
                    }
                    <p class="mt-2">服务端确认的影响口径：</p>
                    <ul class="list-inside list-disc">
                        @for (target of prepared.proposedAffectedTargets; track target.restatesSnapshotRef.id) {
                            <li>
                                <a class="underline" [href]="'/projects/' + target.projectId + '/workspace/operating-overview'">项目 {{ target.projectId }}</a> · 经营版本 {{ target.expectedVersion }} · 原快照 {{ target.restatesSnapshotRef.id }} ·
                                {{ target.periodEndSnapshotRef ? '期末累计口径' : '实时口径' }}
                            </li>
                        }
                    </ul>
                    @if (originalSnapshot(); as original) {
                        <details class="mt-3">
                            <summary>对照原始不可变快照与当前来源变化</summary>
                            <p class="break-all font-mono text-xs">原来源指纹 {{ original.sourceHash }}</p>
                            <ul class="list-inside list-disc">
                                @for (source of lateDiffRows(); track source.sourceRef.id) {
                                    <li>{{ source.sourceRef.kind }} · {{ source.sourceRef.id }} · v{{ source.sourceRef.rowVersion }} · {{ source.financialProjection.displayText }}</li>
                                }
                            </ul>
                        </details>
                    }
                }
                <button type="button" class="mt-3 rounded bg-primary px-4 py-2 text-primary-contrast" [disabled]="busy() || !canSubmit()" (click)="submit()">
                    {{ intent() === 'baseline-activation' ? '采用正式基线' : intent() === 'restatement' ? '原子重述全部影响口径' : '冻结服务端经营快照' }}
                </button>
            }
            @if (lastResult(); as result) {
                <div class="mt-4 rounded border p-3" role="status">
                    <p>已保存 {{ result.targetType }} · {{ result.targetId }}</p>
                    <p class="break-all font-mono text-xs">来源指纹 {{ result.sourceHash }}</p>
                    @if (result.evaluationRefs; as refs) {
                        <p>四阶段分别绑定：首次 {{ refs.bindingIds.first }}、二次 {{ refs.bindingIds.second }}、最终 {{ refs.bindingIds.final }}、质保 {{ refs.bindingIds.retention }}</p>
                    }
                </div>
            }
        </section>
    `
})
export class ProjectOperatingAuthoring {
    readonly preparation = input<OperatingPreparation | null>(null);
    readonly busy = input(false);
    readonly error = input<string | null>(null);
    readonly lastResult = input<OperatingCommandResult | null>(null);
    readonly originalSnapshot = input<ProjectOperatingSnapshotSummary | null>(null);
    /** A fully typed request prepared by the existing real E/F source forms. */
    readonly restatementRequest = input<CreateOperatingRestatementRequest | null>(null);
    readonly prepareRequested = output<OperatingPreparationQuery>();
    readonly commandRequested = output<OperatingAuthorCommand>();
    readonly intent = signal<OperatingPreparationQuery['intent']>('snapshot-create');
    readonly periodKey = signal('');
    readonly reason = signal('');
    readonly decisions = signal<Record<string, CostDecisionInput>>({});
    readonly selectionAnchor = signal<OperatingPreparation | null>(null);
    readonly requestedCorrectionSignature = signal('[]');
    readonly correctionMode = signal<'late-facts' | 'source-correction'>('late-facts');
    readonly correctionRefs = computed(() => {
        const request = this.restatementRequest();
        if (!request) return [];
        const refs: ExpectedRef[] = [
            ...request.laborCorrections.map((item) => item.supersededCostRef),
            ...request.allocationCorrections.map((item) => item.basisRef),
            ...request.stageCorrections.flatMap((item) => [item.costRef, item.stageAttributionRef]),
            ...request.taxCorrections.map((item) => item.taxTreatmentRef)
        ];
        for (const decision of request.costDecisions) { const row = this.preparation()?.sourceRows.find((row) => row.sourceRef.id === decision.target.id); if (row?.currentDecisionRef && !row.blockingReasonCodes.includes('classification-source-changed')) refs.push(expected(row.currentDecisionRef)); }
        return refs.filter((ref, index) => refs.findIndex((other) => other.kind === ref.kind && other.id === ref.id) === index).sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
    });
    readonly lateDiffRows = computed(
        () =>
            this.preparation()?.sourceRows.filter(
                (row) =>
                    !this.originalSnapshot()?.sourceRows.some(
                        (old) => old.sourceRef.kind === row.sourceRef.kind && old.sourceRef.id === row.sourceRef.id && old.sourceRef.rowVersion === row.sourceRef.rowVersion && old.sourceRef.payloadHash === row.sourceRef.payloadHash
                    )
            ) ?? []
    );
    readonly evidenceRows = computed(() => this.preparation()?.sourceRows.filter((row) => row.rowKind === 'stage-evidence' && row.state === 'ready') ?? []);
    readonly canSubmit = computed(() => {
        const prepared = this.preparation();
        if (!prepared || this.busy() || prepared.intent !== this.intent() || prepared === this.selectionAnchor()) return false;
        if (this.intent() === 'period-close' && prepared.periodKey !== this.periodKey().trim()) return false;
        if (this.intent() === 'baseline-activation') return !!prepared.proposedOriginalCostRef && !!this.reason().trim() && prepared.allowedCommandCodes.includes('baseline-activation');
        if (this.intent() === 'restatement')
            return (
                !!this.originalSnapshot() &&
                !!this.reason().trim() &&
                prepared.proposedAffectedTargets.some((target) => target.projectId === prepared.projectId && target.restatesSnapshotRef.id === this.originalSnapshot()?.id) &&
                (this.correctionMode() === 'late-facts' || (this.correctionRefs().length > 0 && JSON.stringify(this.correctionRefs()) === this.requestedCorrectionSignature()))
            );
        if (!prepared.selectedBaselinePackageRef) return false;
        if (prepared.blockingReasonCodes.some((code) => !['cost-classification-required', 'source-not-ready'].includes(code))) return false;
        const decisions = this.decisions();
        return prepared.sourceRows
            .filter((row) => this.classifiable(row) && !row.currentDecisionRef)
            .every((row) => !!decisions[row.sourceRef.id]?.reasonText.trim() && (decisions[row.sourceRef.id].decision === 'exclude' || decisions[row.sourceRef.id].evidenceRefs.length > 0));
    });

    classifiable(row: OperatingSourceRow): boolean {
        return this.intent() !== 'baseline-activation' && (!row.currentDecisionRef || this.intent() === 'restatement') && (row.rowKind === 'direct-cost' || row.rowKind === 'allocation-share') && !row.blockingReasonCodes.includes('outside-business-cutoff');
    }
    amountLabel(value: { knowledge: string; value: string | null; unknownReasonCode: string | null }): string {
        return value.knowledge === 'known' && value.value !== null ? value.value : `未知（${value.unknownReasonCode ?? '依据缺失'}）`;
    }
    changeIntent(event: Event): void {
        if (!(event.target instanceof HTMLSelectElement)) return;
        const value = event.target.value;
        if (value === 'baseline-activation' || value === 'snapshot-create' || value === 'period-close' || value === 'restatement') {
            this.selectionAnchor.set(this.preparation());
            this.intent.set(value);
            this.decisions.set({});
        }
    }
    setPeriod(event: Event): void {
        if (event.target instanceof HTMLInputElement) { this.selectionAnchor.set(this.preparation()); this.periodKey.set(event.target.value); }
    }
    setReason(event: Event): void {
        if (event.target instanceof HTMLTextAreaElement) this.reason.set(event.target.value);
    }
    setCorrectionMode(event: Event): void {
        if (event.target instanceof HTMLSelectElement && (event.target.value === 'late-facts' || event.target.value === 'source-correction')) { this.selectionAnchor.set(this.preparation()); this.correctionMode.set(event.target.value); }
    }
    reload(): void {
        this.selectionAnchor.set(this.preparation());
        this.decisions.set({});
        if (this.intent() === 'restatement' && this.correctionMode() === 'source-correction' && !this.correctionRefs().length) return;
        this.requestedCorrectionSignature.set(this.intent() === 'restatement' && this.correctionMode() === 'source-correction' ? JSON.stringify(this.correctionRefs()) : '[]');
        this.prepareRequested.emit({
            view: 'preparation',
            intent: this.intent(),
            snapshotMode: this.intent() === 'period-close' ? 'period-end' : 'realtime',
            periodKey: this.intent() === 'period-close' ? this.periodKey().trim() : null,
            restatesSnapshotId: this.originalSnapshot()?.id ?? null,
            periodEndSnapshotId: this.originalSnapshot()?.periodEndSnapshotRef?.id ?? null,
            correctionSourceRefs: this.intent() === 'restatement' && this.correctionMode() === 'source-correction' ? JSON.stringify(this.correctionRefs()) : null
        });
    }
    chooseDecision(row: OperatingSourceRow, event: Event): void {
        if (!(event.target instanceof HTMLSelectElement)) return;
        const value = event.target.value;
        if (value !== 'include' && value !== 'exclude') {
            this.decisions.update((items) => {
                const next = { ...items };
                delete next[row.sourceRef.id];
                return next;
            });
            return;
        }
        const direct = row.rowKind === 'direct-cost';
        const reasonCode: CostDecisionInput['reasonCode'] =
            value === 'exclude'
                ? 'other-evidenced'
                : row.containsLabor === 'yes'
                  ? 'executed-labor'
                  : row.canonicalAccumulationKey?.startsWith('payment-record:')
                    ? 'actual-payment'
                    : row.canonicalAccumulationKey?.startsWith('payable-record:')
                      ? 'approved-commitment-exception'
                      : 'actual-expense';
        this.decisions.update((items) => ({
            ...items,
            [row.sourceRef.id]: {
                target: expected(row.sourceRef),
                expectedVersion: row.currentDecisionRef?.rowVersion ?? 0,
                decision: value,
                recognitionRole: direct ? 'direct-source' : 'allocation-share',
                reasonCode,
                reasonText: '',
                primaryCostRef: null,
                supportingSourceRefs: [],
                evidenceRefs: []
            }
        }));
    }
    setDecisionReason(row: OperatingSourceRow, event: Event): void {
        if (!(event.target instanceof HTMLInputElement)) return;
        const text = event.target.value;
        this.decisions.update((items) => {
            const current = items[row.sourceRef.id];
            return current ? { ...items, [row.sourceRef.id]: { ...current, reasonText: text } } : items;
        });
    }
    setEvidence(row: OperatingSourceRow, event: Event): void {
        if (!(event.target instanceof HTMLSelectElement)) return;
        const ids = new Set(Array.from(event.target.selectedOptions, (option) => option.value));
        const evidenceRefs = this.evidenceRows()
            .filter((item) => ids.has(item.sourceRef.id))
            .map((item) => expected(item.sourceRef));
        this.decisions.update((items) => {
            const current = items[row.sourceRef.id];
            return current ? { ...items, [row.sourceRef.id]: { ...current, evidenceRefs } } : items;
        });
    }
    submit(): void {
        const prepared = this.preparation();
        if (!prepared || !this.canSubmit()) return;
        const common = {
            inputVersion: 'server-derived-v1' as const,
            projectId: prepared.projectId,
            expectedVersion: prepared.headVersion,
            expectedProjectVersion: prepared.projectVersion,
            expectedInputHash: prepared.expectedInputHash,
            assertions: null
        };
        if (this.intent() === 'baseline-activation' && prepared.proposedOriginalCostRef) {
            const adopted = prepared.sourceRows.filter((row) => row.sourceRef.kind === 'ProjectTechnicalCostPackage' && row.state === 'ready' && row.sourceRef.id !== prepared.proposedOriginalCostRef?.id);
            this.commandRequested.emit({
                kind: 'activate-baseline',
                request: {
                    ...common,
                    expectedCurrentPackageRef: prepared.selectedBaselinePackageRef ? expected(prepared.selectedBaselinePackageRef) : null,
                    originalAdoptedCostRef: expected(prepared.proposedOriginalCostRef),
                    selectedHandoverBasisRef: this.uniqueRef('ProjectHandoverBasisSnapshot'),
                    handoverRebaselineRef: this.uniqueRef('ContractHandoverRebaselineRecord'),
                    approvedChangeRefs: adopted.map((row) => expected(row.sourceRef)),
                    reason: this.reason().trim()
                }
            });
        } else if (this.intent() === 'restatement') {
            const request = this.restatementRequest();
            const original = this.originalSnapshot();
            const primary = prepared.proposedAffectedTargets.find((target) => target.projectId === prepared.projectId && target.restatesSnapshotRef.id === original?.id);
            if (!primary || !original) return;
            const affectedTargets = prepared.proposedAffectedTargets
                .filter((target) => target.projectId !== primary.projectId || target.restatesSnapshotRef.id !== primary.restatesSnapshotRef.id)
                .map((target) => ({ ...target, costDecisions: request?.affectedTargets.find((old) => old.projectId === target.projectId && old.restatesSnapshotRef.id === target.restatesSnapshotRef.id)?.costDecisions ?? target.costDecisions }));
            const corrections = this.correctionMode() === 'source-correction' ? request : null;
            this.commandRequested.emit({
                kind: 'restate',
                request: {
                    ...common,
                    scope: primary.periodEndSnapshotRef ? 'period' : 'live',
                    periodEndSnapshotRef: primary.periodEndSnapshotRef,
                    restatesSnapshotRef: primary.restatesSnapshotRef,
                    restatementReason: this.reason().trim(),
                    restatementSummary: this.reason().trim(),
                    costDecisions: Object.values(this.decisions()).length ? Object.values(this.decisions()) : (request?.costDecisions ?? []),
                    laborCorrections: corrections?.laborCorrections ?? [],
                    allocationCorrections: corrections?.allocationCorrections ?? [],
                    stageCorrections: corrections?.stageCorrections ?? [],
                    taxCorrections: corrections?.taxCorrections ?? [],
                    acknowledgedChangedSourceRefs: request?.acknowledgedChangedSourceRefs ?? [],
                    affectedTargets
                }
            });
        } else if (prepared.selectedBaselinePackageRef) {
            const costDecisions = Object.values(this.decisions());
            if (this.intent() === 'period-close')
                this.commandRequested.emit({ kind: 'close-period', request: { ...common, baselinePackageRef: expected(prepared.selectedBaselinePackageRef), periodKey: this.periodKey().trim(), expectedPeriodSnapshotRef: null, costDecisions } });
            else this.commandRequested.emit({ kind: 'create-snapshot', request: { ...common, baselinePackageRef: expected(prepared.selectedBaselinePackageRef), snapshotMode: 'realtime', periodKey: null, costDecisions } });
        }
    }
    private uniqueRef(kind: string): ExpectedRef | null {
        const rows = this.preparation()?.sourceRows.filter((row) => row.sourceRef.kind === kind && row.state === 'ready') ?? [];
        return rows.length === 1 ? expected(rows[0].sourceRef) : null;
    }
}

function expected(ref: SourceRef): ExpectedRef {
    return { kind: ref.kind, id: ref.id, expectedVersion: ref.rowVersion, payloadHash: ref.payloadHash };
}
