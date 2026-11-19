import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormField, disabled, form, maxLength, required } from '@angular/forms/signals';
import {
    SourceRefSchema,
    type BusinessAccountingFeedbackView,
    type CommissionGateBindingHistoryView,
    type ManualOperatingMaterialityReview,
    type OperatingGateReviewDecision,
    type OperatingSignalEvaluationView,
    type ProjectUnifiedAccountingView,
    type ReviewCommissionGateBindingRequest,
    type ReviewOperatingSignalEvaluationRequest,
    type SourceRef
} from '@poms/shared-contracts';
import { sensitiveProjectionDisplayText } from '../../shared/ui/sensitive-visibility';

export interface OperatingSignalReviewSubmission {
    evaluationId: string;
    request: ReviewOperatingSignalEvaluationRequest;
}

export interface OperatingGateReviewSubmission {
    bindingId: string;
    request: ReviewCommissionGateBindingRequest;
}

@Component({
    selector: 'app-project-operating-review',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section aria-labelledby="operating-review-title" class="flex flex-col gap-4">
            <h2 id="operating-review-title" class="text-xl font-semibold">经营与提成阶段复核</h2>
            @if (error()) {
                <p role="alert">{{ error() }}。若来源已变化，请重新读取当前评价与阶段绑定。</p>
            }
            @if (!coherent()) {
                <p role="status">当前评价尚未就绪、已变化或资料不完整。请先读取准备视图并核实真实来源。</p>
                <button type="button" (click)="reloadRequested.emit()" [disabled]="busy()">重新读取</button>
            } @else if (evaluation(); as current) {
                <dl class="grid grid-cols-2 gap-2">
                    <dt>系统风险 / 当前风险</dt>
                    <dd>{{ riskLabel(current.systemRiskLevel) }} / {{ riskLabel(current.riskLevel) }}</dd>
                    <dt>成熟度 / 当前动作</dt>
                    <dd>{{ current.dataMaturityLevel }} / {{ current.currentActionLevel }}</dd>
                    <dt>毛利比例用途</dt>
                    <dd>{{ ratioUseLabel(current.metricKnowledge.grossMarginRateUse) }}</dd>
                    <dt>来源 / 评价版本</dt>
                    <dd class="break-all">{{ current.rowVersion }} · {{ current.evaluationContext.sourceHash }} · {{ current.evaluationContext.evaluationHash }}</dd>
                </dl>
                <p>未知值须继续核实。阶段复核确认只表示复核职责已履行，提成发放仍须独立业务授权。</p>
                <ul class="flex flex-col gap-2">
                    @for (reason of current.reasonItems; track reason.reasonId) {
                        <li>
                            <strong>{{ reason.code }}</strong
                            >：{{ projectedText(reason.detailProjection) }}
                        </li>
                    }
                </ul>
                @if (manualIssue()) {
                    <form (submit)="submitSignal($event)" class="flex flex-col gap-3" aria-label="质性重大性复核">
                        <h3 class="font-semibold">质性事项判断</h3>
                        <p>只判断服务器列出的当前质性事项；合同、金额、成熟度与硬阻断由服务器冻结。</p>
                        <label
                            >冻结依据
                            <select [formField]="signalForm.evidenceKey">
                                <option value="">请选择本次评价中的真实依据</option>
                                @for (evidence of evidenceOptions(); track evidence.key) {
                                    <option [value]="evidence.key">{{ evidence.ref.kind }} · {{ evidence.ref.id }} · v{{ evidence.ref.rowVersion }}</option>
                                }
                            </select>
                        </label>
                        <label
                            >质性结论
                            <select [formField]="signalForm.riskDecision">
                                <option value="normal">未确认质性风险</option>
                                <option value="attention">关注</option>
                                <option value="risk">风险</option>
                            </select>
                        </label>
                        <label>依据与理由<textarea [formField]="signalForm.rationale" rows="3"></textarea></label>
                        <button type="submit" [disabled]="!canSubmitSignal()">提交质性复核</button>
                    </form>
                }
                <div class="grid gap-3 sm:grid-cols-2" aria-label="四个独立提成阶段">
                    @for (stage of feedback()?.stageBindings ?? []; track stage.gateStageType) {
                        <article class="rounded border p-3">
                            <h3>{{ stageLabel(stage.gateStageType) }}</h3>
                            <p>系统 {{ stage.systemBindingAction }} · 当前 {{ stage.bindingAction }} · {{ stage.reviewState }}</p>
                            <p>{{ projectedText(stage.nextActionSummaryProjection) }}</p>
                            <button type="button" (click)="gateSelected.emit(stage.bindingId)" [disabled]="busy()">读取本阶段复核依据</button>
                        </article>
                    }
                </div>
                @if (gate(); as selected) {
                    @if (gateCoherent()) {
                        <form (submit)="submitGate($event)" class="flex flex-col gap-3" aria-label="提成阶段复核">
                            <h3 class="font-semibold">{{ stageLabel(selected.gateStageType) }}复核</h3>
                            <p>绑定 {{ selected.bindingId }} · v{{ selected.rowVersion }} · 摘要 {{ selected.summarySnapshotId }}</p>
                            <label
                                >处理动作
                                <select [formField]="gateForm.reviewAction">
                                    <option value="acknowledge">确认已核阅，保留当前动作</option>
                                    <option value="tighten-review">提高至需要复核</option>
                                    <option value="tighten-block">提高至阻断</option>
                                </select>
                            </label>
                            <label>复核说明<textarea [formField]="gateForm.comment" rows="2"></textarea></label>
                            <p>提交状态断言：{{ expectedGateDecision() }}；服务器将核对全部阻断原因并重新判定。</p>
                            <button type="submit" [disabled]="!canSubmitGate()">提交本阶段复核</button>
                        </form>
                    } @else {
                        <p role="status">所选阶段与当前评价或摘要版本不一致，请重新读取。</p>
                    }
                }
            }
            @if (localError()) {
                <p role="alert">{{ localError() }}</p>
            }
        </section>
    `
})
export class ProjectOperatingReview {
    readonly evaluation = input<OperatingSignalEvaluationView | null>(null);
    readonly feedback = input<BusinessAccountingFeedbackView | null>(null);
    readonly accounting = input<ProjectUnifiedAccountingView | null>(null);
    readonly gate = input<CommissionGateBindingHistoryView | null>(null);
    readonly busy = input(false);
    readonly error = input('');
    readonly signalReviewSubmitted = output<OperatingSignalReviewSubmission>();
    readonly gateReviewSubmitted = output<OperatingGateReviewSubmission>();
    readonly gateSelected = output<string>();
    readonly reloadRequested = output<void>();
    readonly localError = signal('');
    readonly projectedText = sensitiveProjectionDisplayText;
    readonly #requestKeys = new Map<string, string>();

    readonly coherent = computed(() => {
        const current = this.evaluation();
        const feedback = this.feedback();
        if (!current || !feedback || current.reviewState === 'stale' || feedback.reviewState === 'stale') return false;
        const identity = current.evaluationContext;
        if (identity.certification !== 'verified' || identity.evaluationStatus === 'stale' || current.projectId !== feedback.projectId) return false;
        if (!this.sameContext(identity, feedback.evaluationContext)) return false;
        const accounting = this.accounting();
        if (accounting && !this.sameContext(identity, accounting.evaluationContext)) return false;
        return (
            feedback.stageBindings.length === 4 &&
            new Set(feedback.stageBindings.map((stage) => stage.gateStageType)).size === 4 &&
            feedback.stageBindings.every((stage) => stage.evaluationHash === identity.evaluationHash && stage.reviewState !== 'stale')
        );
    });

    readonly manualIssue = computed(() => this.evaluation()?.reasonItems.find((reason) => reason.code === 'qualitative-materiality-unassessed'));
    readonly signalReviewAllowed = computed(() => this.coherent() && !!this.manualIssue() && !!this.feedback()?.allowedActions.includes('reviewOperatingSignalEvaluation'));
    readonly evidenceOptions = computed(() => {
        const issue = this.manualIssue();
        if (!issue || issue.evidenceProjection.mode !== 'full' || !issue.evidenceProjection.value) return [];
        try {
            const raw: unknown = JSON.parse(issue.evidenceProjection.value);
            if (!Array.isArray(raw)) return [];
            const refs: { key: string; ref: SourceRef }[] = [];
            for (const candidate of raw) {
                const parsed = SourceRefSchema.safeParse(candidate);
                if (!parsed.success) return [];
                const ref = parsed.data;
                const key = `${ref.kind}:${ref.id}:${ref.rowVersion}:${ref.payloadHash}`;
                if (!refs.some((entry) => entry.key === key)) refs.push({ key, ref });
            }
            return refs;
        } catch {
            return [];
        }
    });

    readonly signalModel = signal<{ evidenceKey: string; riskDecision: ManualOperatingMaterialityReview['riskDecision']; rationale: string }>({ evidenceKey: '', riskDecision: 'attention', rationale: '' });
    readonly signalForm = form(this.signalModel, (path) => {
        required(path.evidenceKey);
        required(path.rationale);
        maxLength(path.rationale, 2000);
        disabled(path, () => this.busy() || !this.signalReviewAllowed());
    });
    readonly gateModel = signal<{ reviewAction: ReviewCommissionGateBindingRequest['reviewAction']; comment: string }>({ reviewAction: 'acknowledge', comment: '' });
    readonly gateForm = form(this.gateModel, (path) => {
        maxLength(path.comment, 1000);
        disabled(path, () => this.busy() || !this.gateCoherent());
    });

    readonly gateCoherent = computed(() => {
        const selected = this.gate();
        const current = this.evaluation();
        if (!this.coherent() || !selected || !current || selected.reviewState === 'stale' || !selected.summarySnapshotId || selected.summaryPackageKey !== 'project-operating-commission-gate-v1') return false;
        const returned = this.feedback()?.stageBindings.find((stage) => stage.bindingId === selected.bindingId);
        return (
            !!returned &&
            returned.rowVersion === selected.rowVersion &&
            returned.summarySnapshotId === selected.summarySnapshotId &&
            selected.allowedActions.includes('reviewCommissionGateBinding') &&
            this.sameContext(current.evaluationContext, selected.evaluationContext)
        );
    });
    readonly expectedGateDecision = computed<OperatingGateReviewDecision>(() => {
        const gate = this.gate();
        const current = this.evaluation();
        if (!gate || !current) return 'review-required';
        if (gate.bindingAction === 'block' || this.gateModel().reviewAction === 'tighten-block') return 'blocked';
        if (current.riskLevel === 'unknown' || current.evaluationContext.evaluationStatus !== 'complete' || this.manualIssue()) return 'review-required';
        return 'confirmed';
    });
    readonly canSubmitSignal = computed(
        () => this.signalReviewAllowed() && !this.busy() && this.signalForm().valid() && this.signalModel().rationale.trim().length > 0 && this.evidenceOptions().some((evidence) => evidence.key === this.signalModel().evidenceKey)
    );
    readonly canSubmitGate = computed(() => this.gateCoherent() && !this.busy() && this.gateForm().valid());

    submitSignal(event: Event): void {
        event.preventDefault();
        const current = this.evaluation();
        const issue = this.manualIssue();
        const source = this.evidenceOptions().find((item) => item.key === this.signalModel().evidenceKey);
        if (!this.canSubmitSignal() || !current || !issue || !source) {
            this.localError.set('请选择当前冻结依据并填写质性理由。');
            return;
        }
        const request: ReviewOperatingSignalEvaluationRequest = {
            inputVersion: 'server-derived-v1',
            reviewDecision: 'manual-confirmed',
            resolvedDataMaturityLevel: current.dataMaturityLevel,
            costActionRecommendation: current.costActionRecommendation,
            referencedBaselineVersion: current.referencedBaselineVersion,
            referencedSnapshotVersion: current.referencedSnapshotVersion,
            expectedVersion: current.rowVersion,
            expectedSourceHash: current.evaluationContext.sourceHash,
            expectedEvaluationHash: current.evaluationContext.evaluationHash,
            requestKey: '',
            manualMaterialityReview: { policyVersion: 'r4h-operating-v1', issueCodes: [issue.code], riskDecision: this.signalModel().riskDecision, evidenceRefs: [source.ref], rationale: this.signalModel().rationale.trim() }
        };
        request.requestKey = this.requestKey(current.signalEvaluationId, request);
        this.localError.set('');
        this.signalReviewSubmitted.emit({ evaluationId: current.signalEvaluationId, request });
    }

    submitGate(event: Event): void {
        event.preventDefault();
        const selected = this.gate();
        if (!this.canSubmitGate() || !selected || !selected.summarySnapshotId) {
            this.localError.set('请先重新读取当前阶段与摘要。');
            return;
        }
        const request: ReviewCommissionGateBindingRequest = {
            inputVersion: 'server-derived-v1',
            bindingAction: selected.bindingAction,
            gateReviewDecision: this.expectedGateDecision(),
            baselineSelectionSource: selected.baselineSelectionSource,
            summaryPackageKey: 'project-operating-commission-gate-v1',
            summarySnapshotId: selected.summarySnapshotId,
            referencedBaselineVersion: selected.referencedBaselineVersion,
            referencedSnapshotVersion: selected.referencedSnapshotVersion,
            expectedVersion: selected.rowVersion,
            expectedSourceHash: selected.evaluationContext.sourceHash,
            expectedEvaluationHash: selected.evaluationContext.evaluationHash,
            requestKey: '',
            reviewAction: this.gateModel().reviewAction,
            blockingReasonCodes: [...new Set(selected.reasonItems.filter((reason) => reason.stageActions[selected.gateStageType] === 'block').map((reason) => reason.code))],
            ...(this.gateModel().comment.trim() ? { comment: this.gateModel().comment.trim() } : {})
        };
        request.requestKey = this.requestKey(selected.bindingId, request);
        this.localError.set('');
        this.gateReviewSubmitted.emit({ bindingId: selected.bindingId, request });
    }

    private requestKey(target: string, request: ReviewOperatingSignalEvaluationRequest | ReviewCommissionGateBindingRequest): string {
        const identity = JSON.stringify({ target, request });
        const existing = this.#requestKeys.get(identity);
        if (existing) return existing;
        const key = globalThis.crypto.randomUUID();
        this.#requestKeys.set(identity, key);
        return key;
    }

    private sameContext(a: OperatingSignalEvaluationView['evaluationContext'], b: OperatingSignalEvaluationView['evaluationContext']): boolean {
        return (
            a.projectId === b.projectId &&
            a.snapshotId === b.snapshotId &&
            a.sourceHash === b.sourceHash &&
            a.evaluationHash === b.evaluationHash &&
            a.policyHash === b.policyHash &&
            a.signalEvaluationId === b.signalEvaluationId &&
            a.rowVersion === b.rowVersion &&
            a.snapshotRowVersion === b.snapshotRowVersion &&
            a.policyVersion === b.policyVersion &&
            a.producerVersion === b.producerVersion &&
            a.signalReviewRecordId === b.signalReviewRecordId
        );
    }

    riskLabel(level: OperatingSignalEvaluationView['riskLevel']): string {
        return { normal: '正常', unknown: '未知，须核实', attention: '关注', risk: '风险' }[level];
    }
    ratioUseLabel(use: OperatingSignalEvaluationView['metricKnowledge']['grossMarginRateUse']): string {
        return { unavailable: '不可用', 'observation-only': '仅作观察，不能据此确认风险或发放', 'business-judgment': '可供经营判断' }[use];
    }
    stageLabel(stage: CommissionGateBindingHistoryView['gateStageType']): string {
        return { first: '首次', second: '二次', final: '最终', retention: '质保' }[stage];
    }
}
