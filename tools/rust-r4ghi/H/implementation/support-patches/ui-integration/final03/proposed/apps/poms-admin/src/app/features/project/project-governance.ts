import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AttachmentStore, AuthStore, PlatformStore } from '@poms/admin-data-access';
import {
    OperatingEvaluationNotReadyErrorSchema, ProjectStageLabel, type BusinessAccountingFeedbackView,
    type CommissionGateBindingHistoryView, type OperatingCommandResult, type OperatingPreparation,
    type OperatingSignalEvaluationView, type ProjectDetailView, type ProjectOperatingSnapshotSummary,
    type ProjectUnifiedAccountingView
} from '@poms/shared-contracts';
import { ProjectRoleAssignmentAuthoring } from '../commission/project-role-assignment-authoring';
import { ProjectCreatorFirstAssignment } from './project-creator-first-assignment';
import { ProjectGovernanceApi } from './project-governance-api';
import { lifecycleContext } from './project-governance-facts';
import { ProjectLifecycleAuthoring } from './project-lifecycle-authoring';
import { ProjectOperatingAuthoring, type OperatingAuthorCommand, type OperatingPreparationQuery } from './project-operating-authoring';
import { ProjectOperatingReview, type OperatingSignalReviewSubmission, type OperatingGateReviewSubmission } from './project-operating-review';
import { ProjectReceiptBasisAuthoring } from './project-receipt-basis-authoring';

type Panel = 'anchor' | 'operating' | 'review' | 'lifecycle' | 'roles' | 'receipts';
const defaultQuery: OperatingPreparationQuery = { view: 'preparation', intent: 'snapshot-create', snapshotMode: 'realtime', periodKey: null, restatesSnapshotId: null, periodEndSnapshotId: null, correctionSourceRefs: null };

/** One anchor request selects the exact scope branch before any panel request. */
@Component({
    selector: 'app-project-governance', standalone: true,
    imports: [RouterLink, ProjectCreatorFirstAssignment, ProjectOperatingAuthoring, ProjectOperatingReview, ProjectLifecycleAuthoring, ProjectRoleAssignmentAuthoring, ProjectReceiptBasisAuthoring],
    providers: [AttachmentStore, PlatformStore, ProjectGovernanceApi], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="mx-auto grid max-w-7xl gap-4 p-4">
            <h1 class="text-2xl font-semibold">项目经营与交付办理</h1>
            @if (loading()) { <p role="status">正在核对项目责任范围…</p> }
            @if (error()) { <p role="alert" class="rounded border border-red-300 p-3">{{ error() }}</p> }
            <div class="flex flex-wrap gap-3">
                <button type="button" class="rounded border px-3 py-2" [disabled]="loading() || busy()" (click)="reload()">重新读取项目范围</button>
                <a class="rounded border px-3 py-2" [routerLink]="['/projects', projectId(), 'condition-tasks']">本人的条件任务</a>
            </div>
            @if (anchor(); as detail) {
                @switch (detail.scopeKind) {
                    @case ('creator-first-assignment-only') { <app-project-creator-first-assignment [anchor]="detail" (changed)="reload()" /> }
                    @case ('legacy-owner-anchor-only') {
                        <section class="rounded border p-4" aria-label="历史项目基础锚点">
                            <h2 class="text-lg font-semibold">{{ detail.projectNo }} · {{ detail.projectName }}</h2>
                            <p>当前阶段 {{ stageLabel[detail.currentStage] }} · 基础版本 {{ detail.rowVersion }}</p>
                            <p>{{ detail.explanation }}</p>
                        </section>
                    }
                    @case ('full-project') {
                        <section class="rounded border p-4" aria-label="项目基本责任范围">
                            <h2 class="text-lg font-semibold">{{ detail.projectNo }} · {{ detail.projectName }}</h2>
                            <p>当前阶段 {{ stageLabel[detail.currentStage] }} · 项目版本 {{ detail.projectRowVersion }}</p>
                            <p>项目主责 {{ detail.ownerName ?? '未指定' }} · {{ detail.ownerOrgName ?? '待核对组织' }}</p>
                        </section>
                        <nav class="flex flex-wrap gap-2" aria-label="项目办理事项">
                            <button type="button" class="rounded border px-3 py-2" [attr.aria-pressed]="panel() === 'lifecycle'" [disabled]="busy()" (click)="openPanel('lifecycle')">执行、验收与完成</button>
                            @if (canRole()) { <button type="button" class="rounded border px-3 py-2" [attr.aria-pressed]="panel() === 'roles'" [disabled]="busy()" (click)="openPanel('roles')">提成角色职责</button> }
                            @if (canFinance()) {
                                <button type="button" class="rounded border px-3 py-2" [attr.aria-pressed]="panel() === 'operating'" [disabled]="busy()" (click)="openPanel('operating')">经营核算编制</button>
                                <button type="button" class="rounded border px-3 py-2" [attr.aria-pressed]="panel() === 'review'" [disabled]="busy()" (click)="openPanel('review')">经营与提成门禁复核</button>
                                <button type="button" class="rounded border px-3 py-2" [attr.aria-pressed]="panel() === 'receipts'" [disabled]="busy()" (click)="openPanel('receipts')">回款净税依据</button>
                            }
                        </nav>
                        @switch (panel()) {
                            @case ('anchor') { <p>请选择办理事项。各项依据按当前责任范围分别读取。</p> }
                            @case ('operating') {
                                @if (snapshots().length) {
                                    <label>重述时对照的已冻结口径
                                        <select class="ml-2 rounded border p-2" [value]="originalSnapshot()?.id ?? ''" [disabled]="busy()" (change)="chooseOriginal($event)">
                                            @for (snapshot of snapshots(); track snapshot.id) { <option [value]="snapshot.id">{{ snapshot.snapshotMode === 'period-end' ? '期末累计' : snapshot.snapshotMode === 'restated' ? '重述口径' : '实时口径' }} · {{ snapshot.snapshotAt }}</option> }
                                        </select>
                                    </label>
                                }
                                <app-project-operating-authoring [preparation]="preparation()" [busy]="busy()" [error]="panelError() || null" [lastResult]="lastResult()" [originalSnapshot]="originalSnapshot()"
                                    (prepareRequested)="prepare($event)" (commandRequested)="command($event)" />
                            }
                            @case ('review') {
                                <app-project-operating-review [evaluation]="evaluation()" [feedback]="feedback()" [accounting]="accounting()" [gate]="gate()" [busy]="busy()" [error]="panelError()"
                                    (reloadRequested)="loadReview()" (gateSelected)="selectBinding($event)" (signalReviewSubmitted)="reviewSignal($event)" (gateReviewSubmitted)="reviewBinding($event)" />
                            }
                            @case ('lifecycle') {
                                @if (lifecycleApi(); as api) {
                                    @if (!detail.executionAdmissionContext && detail.currentStage === 'handover') { <p role="status">当前执行准入尚未就绪，请核对真实移交、角色冻结与本人责任范围后重新读取。</p> }
                                    <app-project-lifecycle-authoring [projectId]="detail.id" [api]="api" [context]="lifecycleContext()" [actorUserId]="actorId()"
                                        [conditionOwners]="conditionOwners()" [canCloseOwnConditions]="canWrite()" (changed)="refreshAfterLifecycle()" />
                                }
                            }
                            @case ('roles') { @if (roleApi(); as api) { <app-project-role-assignment-authoring [projectId]="detail.id" [api]="api" [canCreate]="canRole()" (changed)="refreshAfterLifecycle()" /> } }
                            @case ('receipts') { <app-project-receipt-basis-authoring [projectId]="detail.id" (changed)="receiptChanged()" /> }
                        }
                        @if (panelError() && panel() !== 'review' && panel() !== 'operating') { <p role="alert">{{ panelError() }}</p> }
                    }
                }
            }
        </main>
    `
})
export class ProjectGovernance {
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthStore);
    private readonly platform = inject(PlatformStore);
    private readonly api = inject(ProjectGovernanceApi);
    private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
    readonly projectId = computed(() => this.params().get('id') ?? '');
    readonly actorId = computed(() => this.auth.currentUser()?.id ?? null);
    readonly stageLabel = ProjectStageLabel;
    readonly anchor = signal<ProjectDetailView | null>(null);
    readonly fullProject = computed(() => { const value = this.anchor(); return value?.scopeKind === 'full-project' ? value : null; });
    readonly loading = signal(false);
    readonly busy = signal(false);
    readonly error = signal('');
    readonly panelError = signal('');
    readonly panel = signal<Panel>('anchor');
    readonly canWrite = computed(() => !!this.fullProject() && this.auth.hasAnyPermission(['project:write']));
    readonly canFinance = computed(() => !!this.fullProject() && this.auth.hasAnyPermission(['contract:finance:manage']));
    readonly canRole = computed(() => !!this.fullProject()?.allowedActions.includes('manage-project-commission') && this.auth.hasAnyPermission(['commission:assignments:manage']));
    readonly preparation = signal<OperatingPreparation | null>(null);
    readonly originalSnapshot = signal<ProjectOperatingSnapshotSummary | null>(null);
    readonly snapshots = signal<ProjectOperatingSnapshotSummary[]>([]);
    readonly lastResult = signal<OperatingCommandResult | null>(null);
    readonly evaluation = signal<OperatingSignalEvaluationView | null>(null);
    readonly feedback = signal<BusinessAccountingFeedbackView | null>(null);
    readonly accounting = signal<ProjectUnifiedAccountingView | null>(null);
    readonly gate = signal<CommissionGateBindingHistoryView | null>(null);
    readonly lifecycleApi = computed(() => this.fullProject() ? this.api.lifecycleApi(this.projectId(), false, this.actorId()) : null);
    readonly roleApi = computed(() => this.canRole() ? this.api.roleApi(this.projectId()) : null);
    readonly lifecycleContext = computed(() => { const project = this.fullProject(); return project ? lifecycleContext(project, this.canWrite()) : null; });
    readonly conditionOwners = computed(() => this.platform.ownerUsers().filter((user) => user.isActive).map((user) => ({ id: user.id, displayName: user.displayName })));
    private epoch = 0;
    constructor() { effect(() => { const id = this.projectId(); void this.loadAnchor(id); }); }
    reload() { void this.loadAnchor(this.projectId()); }
    private resetFacts() {
        this.preparation.set(null); this.originalSnapshot.set(null); this.snapshots.set([]); this.lastResult.set(null);
        this.evaluation.set(null); this.feedback.set(null); this.accounting.set(null); this.gate.set(null);
    }
    private async loadAnchor(projectId: string) {
        const epoch = ++this.epoch;
        this.anchor.set(null); this.loading.set(true); this.busy.set(false); this.error.set(''); this.panelError.set(''); this.panel.set('anchor'); this.resetFacts();
        try {
            if (!projectId) throw new Error('缺少实际项目。');
            const anchor = await this.api.loadAnchor(projectId);
            if (epoch === this.epoch) this.anchor.set(anchor);
        } catch (error) { if (epoch === this.epoch) this.error.set(this.errorText(error)); }
        finally { if (epoch === this.epoch) this.loading.set(false); }
    }
    async openPanel(panel: Panel) {
        if (!this.fullProject() || this.busy() || (['operating', 'review', 'receipts'].includes(panel) && !this.canFinance()) || (panel === 'roles' && !this.canRole())) return;
        this.panel.set(panel); this.panelError.set('');
        if (panel === 'operating') await this.prepare(defaultQuery);
        if (panel === 'review') await this.loadReview();
        if (panel === 'lifecycle') await this.loadLifecycleContext();
    }
    async prepare(query: OperatingPreparationQuery) {
        if (!this.canFinance() || this.busy()) return;
        const epoch = this.epoch; this.busy.set(true); this.panelError.set(''); this.preparation.set(null);
        try {
            const result = await this.api.prepare(this.projectId(), query);
            if (epoch !== this.epoch) return;
            this.preparation.set(result.preparation);
            const currentRef = result.preparation.officialSnapshotRef;
            if (currentRef && !this.originalSnapshot()) this.rememberSnapshot(await this.api.snapshot(currentRef.id), true);
        } catch (error) { if (epoch === this.epoch) this.panelError.set(this.errorText(error)); }
        finally { if (epoch === this.epoch) this.busy.set(false); }
    }
    private rememberSnapshot(snapshot: ProjectOperatingSnapshotSummary, select = false) {
        this.snapshots.update((items) => [snapshot, ...items.filter((item) => item.id !== snapshot.id)]);
        if (select) this.originalSnapshot.set(snapshot);
    }
    chooseOriginal(event: Event) {
        const select = event.target; if (!(select instanceof HTMLSelectElement)) return;
        this.originalSnapshot.set(this.snapshots().find((snapshot) => snapshot.id === select.value) ?? null);
        this.preparation.set(null);
    }
    async command(command: OperatingAuthorCommand) {
        if (!this.canFinance() || this.busy() || !this.preparation()) return;
        const epoch = this.epoch; this.busy.set(true); this.panelError.set('');
        try {
            const result = await this.api.command(command);
            if (epoch !== this.epoch) return;
            this.lastResult.set(result); this.preparation.set(null);
            if (result.snapshotId) this.rememberSnapshot(await this.api.snapshot(result.snapshotId), true);
        } catch (error) { if (epoch === this.epoch) { this.preparation.set(null); this.panelError.set(this.errorText(error)); } }
        finally { if (epoch === this.epoch) this.busy.set(false); }
    }
    async loadReview() {
        if (!this.canFinance() || this.busy()) return;
        const epoch = this.epoch; this.busy.set(true); this.panelError.set(''); this.evaluation.set(null); this.feedback.set(null); this.accounting.set(null); this.gate.set(null);
        try {
            const [accounting, feedback] = await Promise.all([this.api.accounting(this.projectId()), this.api.feedback(this.projectId())]);
            const evaluation = await this.api.evaluation(feedback.signalEvaluationId);
            if (epoch !== this.epoch) return;
            this.accounting.set(accounting); this.feedback.set(feedback); this.evaluation.set(evaluation);
        } catch (error) { if (epoch === this.epoch) this.panelError.set(this.errorText(error)); }
        finally { if (epoch === this.epoch) this.busy.set(false); }
    }
    async selectBinding(id: string) {
        if (!this.feedback()?.stageBindings.some((binding) => binding.bindingId === id) || this.busy()) return;
        const epoch = this.epoch; this.busy.set(true); this.panelError.set(''); this.gate.set(null);
        try { const gate = await this.api.binding(id); if (epoch === this.epoch) this.gate.set(gate); }
        catch (error) { if (epoch === this.epoch) this.panelError.set(this.errorText(error)); }
        finally { if (epoch === this.epoch) this.busy.set(false); }
    }
    async reviewSignal(submission: OperatingSignalReviewSubmission) {
        if (!this.canFinance() || this.busy() || this.evaluation()?.signalEvaluationId !== submission.evaluationId || !this.feedback()?.allowedActions.includes('reviewOperatingSignalEvaluation')) return;
        this.busy.set(true); this.panelError.set('');
        try { await this.api.reviewSignal(this.projectId(), submission.evaluationId, submission.request); }
        catch (error) { this.evaluation.set(null); this.panelError.set(this.errorText(error)); }
        finally { this.busy.set(false); }
        if (!this.panelError()) await this.loadReview();
    }
    async reviewBinding(submission: OperatingGateReviewSubmission) {
        if (!this.canFinance() || this.busy() || this.gate()?.bindingId !== submission.bindingId || !this.gate()?.allowedActions.includes('reviewCommissionGateBinding')) return;
        this.busy.set(true); this.panelError.set('');
        try { await this.api.reviewBinding(this.projectId(), submission.bindingId, submission.request); }
        catch (error) { this.gate.set(null); this.panelError.set(this.errorText(error)); }
        finally { this.busy.set(false); }
        if (!this.panelError()) await this.loadReview();
    }
    private async loadLifecycleContext() {
        const epoch = this.epoch; this.panelError.set('');
        try {
            // EO admission comes directly from the current detail. Role GET keeps
            // its own permission and is called only by the separate Role panel.
            if (this.canWrite()) await this.platform.loadOwnerReferenceData();
        } catch (error) { if (epoch === this.epoch) this.panelError.set(this.errorText(error)); }
    }
    refreshAfterLifecycle() { this.reload(); }
    receiptChanged() { this.preparation.set(null); this.evaluation.set(null); this.feedback.set(null); this.accounting.set(null); this.gate.set(null); }
    private errorText(error: unknown) {
        if (error instanceof HttpErrorResponse) {
            const notReady = OperatingEvaluationNotReadyErrorSchema.safeParse(error.error);
            if (error.status === 409 && notReady.success) return '尚无当前正式经营评估，请先通过真实来源编制经营快照。';
            if (error.status === 409) return '来源或版本已经变化，请重新读取后核对；本次操作未自动重试。';
            if (error.status === 403 || error.status === 404) return '当前责任范围无法读取或办理此项目事项。';
            return `请求未完成（HTTP ${error.status}），请重新读取依据。`;
        }
        return error instanceof Error ? error.message : '读取或办理未完成，请重新核对真实来源。';
    }
}
