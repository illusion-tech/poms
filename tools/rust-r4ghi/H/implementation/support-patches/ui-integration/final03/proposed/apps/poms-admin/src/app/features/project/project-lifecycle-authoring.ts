import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
    AcceptanceRecordSummary,
    CloseProjectCompletionConditionRequest,
    CloseProjectCompletionConditionResult,
    CreateAcceptanceRecordRequest,
    CreateProjectArchiveRecordRequest,
    CreateProjectCompletionRecordRequest,
    FrozenLifecycleEvidence,
    LifecycleEvidenceRef,
    ProjectArchiveRecordSummary,
    ProjectCompletionRecordList,
    ProjectCompletionRecordSummary,
    ProjectStageTransitionResult,
    ReplaceProjectArchiveRecordRequest,
    StartProjectAcceptanceRequest,
    StartProjectExecutionRequest,
    VoidProjectArchiveRecordRequest
} from '@poms/shared-contracts';
import { SectionCard } from '../../shared/ui/sectioncard';

/** Upload selection carries real R2 summary fields; the server owns the frozen row version. */
export type LifecycleEvidenceSelection = Pick<FrozenLifecycleEvidence, 'attachmentLinkId' | 'attachmentId' | 'checksumSha256' | 'fileName'>;

export interface LifecycleAuthoringContext {
    projectRowVersion: number;
    currentStage: string;
    currentStageRecordId: string | null;
    canWriteLifecycle: boolean;
    canArchive: boolean;
    executionAdmission: Omit<StartProjectExecutionRequest, 'inputVersion' | 'expectedProjectVersion' | 'reason'> | null;
}

/** Root implements these with the existing generated client and R2 upload flow. */
export interface ProjectLifecycleAuthoringApi {
    loadCompletionRecords(projectId: string): Promise<ProjectCompletionRecordList>;
    loadAcceptanceRecords(projectId: string): Promise<AcceptanceRecordSummary[]>;
    loadArchiveRecords(projectId: string): Promise<ProjectArchiveRecordSummary[]>;
    startExecution(projectId: string, body: StartProjectExecutionRequest): Promise<ProjectStageTransitionResult>;
    startAcceptance(projectId: string, body: StartProjectAcceptanceRequest): Promise<ProjectStageTransitionResult>;
    createAcceptance(projectId: string, body: CreateAcceptanceRecordRequest): Promise<AcceptanceRecordSummary>;
    createCompletion(projectId: string, body: CreateProjectCompletionRecordRequest): Promise<ProjectCompletionRecordSummary>;
    createArchive(projectId: string, body: CreateProjectArchiveRecordRequest): Promise<ProjectArchiveRecordSummary>;
    replaceArchive(archiveId: string, body: ReplaceProjectArchiveRecordRequest): Promise<ProjectArchiveRecordSummary>;
    voidArchive(archiveId: string, body: VoidProjectArchiveRecordRequest): Promise<ProjectArchiveRecordSummary>;
    closeCondition(completionRecordId: string, conditionId: string, body: CloseProjectCompletionConditionRequest): Promise<CloseProjectCompletionConditionResult>;
    uploadEvidence(projectId: string, file: File): Promise<LifecycleEvidenceSelection>;
    uploadConditionEvidence(projectId: string, completionRecordId: string, conditionId: string, file: File): Promise<LifecycleEvidenceSelection>;
    openEvidence(evidence: LifecycleEvidenceSelection): Promise<void>;
}
interface ConditionDraft {
    summary: string;
    responsibleUserId: string;
    dueAt: string;
    evidence: LifecycleEvidenceSelection[];
}
interface TaskRow {
    completionRecordId: string;
    completionRowVersion: number;
    completionConditionStatus: string;
    conditionId: string;
    conditionRowVersion: number;
    summary: string;
    dueAt: string;
    status: string;
    evidence: LifecycleEvidenceSelection[];
    closureSummary: string | null;
    closureEvidence: LifecycleEvidenceSelection[];
    canClose: boolean;
}

@Component({
    selector: 'app-project-lifecycle-authoring',
    standalone: true,
    imports: [FormsModule, SectionCard],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section-card>
            <ng-template #title>{{ ownTasksOnly() || records()?.scopeKind === 'own-condition-only' ? '本人的完成条件任务' : '执行、验收与完成' }}</ng-template>
            <ng-template #description>阶段推进引用真实来源。条件关闭保留原有条件完成结论，全部闭合后才可归档。</ng-template>
            @if (busy()) {
                <p role="status" class="my-2">正在读取或保存当前事实…</p>
            }
            @if (error()) {
                <p role="alert" class="my-2 text-red-600">{{ error() }}</p>
            }
            @if (notice()) {
                <p role="status" class="my-2 text-green-700">{{ notice() }}</p>
            }
            <button type="button" class="my-3 underline" [disabled]="busy()" (click)="reload()">重新核对当前事实</button>
            @if (isFullView()) {
                @if (context(); as c) {
                    <p>当前阶段：{{ stageLabel(c.currentStage) }} · 项目版本 {{ c.projectRowVersion }}</p>
                    @if (!c.currentStageRecordId && ['execution', 'acceptance', 'completed', 'conditional-completed'].includes(c.currentStage)) {
                        <p role="alert" class="my-2 text-amber-700">历史项目尚无本批真实阶段准入链，不能以当前阶段文字继续推进。</p>
                    }
                    @if (c.currentStage === 'handover' && c.canWriteLifecycle) {
                        @if (c.executionAdmission) {
                            <form class="my-4 grid gap-3" (ngSubmit)="startExecution()">
                                <label>进入执行的确认说明 <textarea name="execution-reason" [(ngModel)]="executionReason" required maxlength="1000"></textarea></label>
                                <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy()">核对当前移交与角色冻结并进入执行</button>
                            </form>
                        } @else {
                            <p class="my-3 text-amber-700">尚缺真实移交确认、本人职责或有效角色冻结，请先完成前置材料。</p>
                        }
                    }
                    @if (c.currentStage === 'execution' && c.canWriteLifecycle && c.currentStageRecordId) {
                        <form class="my-4 grid gap-3" (ngSubmit)="startAcceptance()">
                            <label>交付就绪说明 <textarea name="readiness-summary" [(ngModel)]="readinessSummary" required maxlength="2000"></textarea></label>
                            <label>交付证据说明 <textarea name="delivery-evidence-summary" [(ngModel)]="evidenceSummary" required maxlength="2000"></textarea></label>
                            <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || evidence().length === 0">固定交付证据并进入验收</button>
                        </form>
                    }
                    @if (c.currentStage === 'acceptance' && c.canWriteLifecycle && c.currentStageRecordId) {
                        <form class="my-4 grid gap-3 rounded border border-surface-200 p-3" (ngSubmit)="createAcceptance()">
                            <h3 class="font-semibold">记录本次验收</h3>
                            <label
                                >验收类型
                                <select name="acceptance-type" [(ngModel)]="acceptanceType">
                                    <option value="stage-outcome">阶段成果</option>
                                    <option value="stage-acceptance">阶段验收</option>
                                    <option value="final-acceptance">最终验收</option>
                                </select></label
                            >
                            <label
                                >验收结论
                                <select name="acceptance-result" [(ngModel)]="acceptanceResult">
                                    <option value="accepted">通过</option>
                                    <option value="conditional">有条件通过</option>
                                    <option value="rejected">拒绝</option>
                                </select></label
                            >
                            <label>验收范围 <textarea name="scope-summary" [(ngModel)]="scopeSummary" required maxlength="2000"></textarea></label>
                            <label>验收证据说明 <textarea name="acceptance-evidence-summary" [(ngModel)]="evidenceSummary" required maxlength="2000"></textarea></label>
                            @if (acceptanceResult === 'conditional') {
                                <label>验收条件摘要 <textarea name="conditional-summary" [(ngModel)]="conditionalSummary" required maxlength="2000"></textarea></label>
                            }
                            <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || evidence().length === 0">确认并固定本次验收结论</button>
                        </form>
                        <form class="my-4 grid gap-3 rounded border border-surface-200 p-3" (ngSubmit)="createCompletion()">
                            <h3 class="font-semibold">依据最终验收确认完成</h3>
                            <label
                                >最终验收来源
                                <select name="completion-acceptance" [(ngModel)]="selectedAcceptanceId">
                                    <option value="">请选择</option>
                                    @for (a of finalAcceptances(); track a.id) {
                                        <option [value]="a.id">{{ resultLabel(a.acceptanceResult) }} · {{ a.confirmedAt }}</option>
                                    }
                                </select></label
                            >
                            @if (selectedAcceptance(); as a) {
                                <p>完成结论：{{ a.acceptanceResult === 'accepted' ? '完成' : '有条件完成' }}。阶段验收与拒绝结论不能完成项目。</p>
                                <label>业务完成时间 <input name="completed-at" type="datetime-local" [(ngModel)]="completedAt" required /></label>
                                <label>完成结论说明 <textarea name="completion-summary" [(ngModel)]="completionSummary" required maxlength="2000"></textarea></label>
                                <label>完成证据说明 <textarea name="completion-evidence-summary" [(ngModel)]="evidenceSummary" required maxlength="2000"></textarea></label>
                                @if (a.acceptanceResult === 'conditional') {
                                    @for (condition of conditionDrafts; track $index; let i = $index) {
                                        <fieldset class="grid gap-2 rounded border border-surface-200 p-3">
                                            <legend>待闭合条件 {{ i + 1 }}</legend>
                                            <label>具体条件 <textarea [name]="'condition-summary-' + i" [(ngModel)]="condition.summary" required maxlength="2000"></textarea></label>
                                            <label
                                                >真实责任人
                                                <select [name]="'condition-owner-' + i" [(ngModel)]="condition.responsibleUserId" required>
                                                    <option value="">请选择</option>
                                                    @for (owner of conditionOwners(); track owner.id) {
                                                        <option [value]="owner.id">{{ owner.displayName }}</option>
                                                    }
                                                </select></label
                                            >
                                            <label>完成期限 <input [name]="'condition-due-' + i" type="datetime-local" [(ngModel)]="condition.dueAt" required /></label>
                                            <label>此条件的证据 <input type="file" [disabled]="busy()" (change)="upload($event, i)" /></label>
                                            @for (file of condition.evidence; track file.attachmentLinkId) {
                                                <p>{{ file.fileName }}</p>
                                            }
                                            <button type="button" class="justify-self-start underline" [disabled]="busy() || conditionDrafts.length === 1" (click)="removeCondition(i)">移除此条件</button>
                                        </fieldset>
                                    }
                                    <button type="button" class="justify-self-start rounded border px-3 py-2" [disabled]="busy()" (click)="addCondition()">增加完成条件</button>
                                }
                                <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || evidence().length === 0">确认最终完成结论</button>
                            }
                        </form>
                    }
                    @if (c.canWriteLifecycle && ['execution', 'acceptance'].includes(c.currentStage)) {
                        <fieldset class="my-4 rounded border border-surface-200 p-3">
                            <legend>本次阶段、验收或完成的真实证据</legend>
                            <label>上传已完成的交付或验收材料 <input type="file" [disabled]="busy()" (change)="upload($event)" /></label>
                            @for (file of evidence(); track file.attachmentLinkId) {
                                <p class="my-2">
                                    <button type="button" class="underline" (click)="open(file)">{{ file.fileName }}</button> · 已上传，提交时由服务器固定证据版本
                                    <button type="button" class="ml-2 underline" [disabled]="busy()" (click)="removeEvidence(file.attachmentLinkId)">移除本次选择</button>
                                </p>
                            } @empty {
                                <p class="my-2 text-amber-700">尚未选定真实附件证据，不能提交。</p>
                            }
                        </fieldset>
                    }
                } @else {
                    <p class="my-3 text-amber-700">等待当前项目的真实阶段与权限材料。</p>
                }
                @for (a of acceptances(); track a.id) {
                    <article class="my-3 rounded border border-surface-200 p-3">
                        <strong>{{ a.acceptanceType === 'final-acceptance' ? '最终验收' : '阶段验收' }} · {{ resultLabel(a.acceptanceResult) }}</strong>
                        <p>{{ a.scopeSummary }}</p>
                        <p>{{ a.evidenceSummary }}</p>
                        @if (a.conditionalSummary) {
                            <p>条件：{{ a.conditionalSummary }}</p>
                        }
                        @if (a.sourceQualification === 'legacy-unverified') {
                            <p class="text-amber-700">历史来源未认证</p>
                        }
                    </article>
                }
                @for (completion of fullCompletions(); track completion.id) {
                    <article class="my-3 rounded border border-surface-200 p-3">
                        <strong>{{ completion.completionResult === 'completed' ? '已完成' : '有条件完成' }}</strong>
                        <p>{{ completion.completionSummary }}</p>
                        <p>条件状态：{{ conditionStatusLabel(completion.conditionStatus) }}</p>
                    </article>
                }
            }
            @for (task of tasks(); track task.conditionId) {
                <article class="my-4 grid gap-2 rounded border border-surface-200 p-3">
                    <h3 class="font-semibold">{{ task.summary }}</h3>
                    <p>期限 {{ task.dueAt }} · {{ task.status === 'closed' ? '已闭合' : task.canClose ? '待本人闭合' : '待责任人闭合' }} · 全部条件 {{ conditionStatusLabel(task.completionConditionStatus) }}</p>
                    @for (file of task.evidence; track file.attachmentLinkId) {
                        <button type="button" class="justify-self-start underline" (click)="open(file)">{{ file.fileName }}</button>
                    }
                    @if (task.status === 'pending' && task.canClose) {
                        <form class="grid gap-3" (ngSubmit)="close(task)">
                            <label>本人闭合说明 <textarea [name]="'closure-summary-' + task.conditionId" [(ngModel)]="closureSummaries[task.conditionId]" required maxlength="2000"></textarea></label>
                            @if (!ownTasksOnly() || canUploadOwnConditionEvidence()) {
                                <label>上传本人闭合证据 <input type="file" [disabled]="busy()" (change)="uploadClosure($event, task)" /></label>
                            }
                            @for (file of closureFiles[task.conditionId] ?? []; track file.attachmentLinkId) {
                                <p>{{ file.fileName }}</p>
                            }
                            <label><input type="checkbox" [name]="'reuse-evidence-' + task.conditionId" [(ngModel)]="reuseTaskEvidence[task.conditionId]" /> 同时提交本条件原有证据</label>
                            <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy()">以本人身份闭合此条件</button>
                        </form>
                    }
                    @if (task.closureSummary) {
                        <p>本人闭合记录：{{ task.closureSummary }}</p>
                        @for (file of task.closureEvidence; track file.attachmentLinkId) {
                            <button type="button" class="justify-self-start underline" (click)="open(file)">{{ file.fileName }}</button>
                        }
                    }
                </article>
            } @empty {
                @if (!busy() && !error() && !isFullView()) {
                    <p class="my-3">当前没有本人完成条件任务。</p>
                }
            }
            @if (isFullView()) {
                @if (hasPendingConditions()) {
                    <p role="alert" class="my-3 text-amber-700">仍有待闭合条件，不能归档；原有条件完成结论保持不变。</p>
                }
                @if (context()?.canArchive && !hasPendingConditions()) {
                    <form class="my-4 grid gap-3" (ngSubmit)="saveArchive()">
                        <h3 class="font-semibold">{{ currentArchive() ? '替代当前归档事实' : '登记终态归档' }}</h3>
                        <label>归档时间 <input name="archived-at" type="datetime-local" [(ngModel)]="archivedAt" required /></label>
                        <label>归档结论 <textarea name="archive-summary" [(ngModel)]="archiveSummary" required maxlength="2000"></textarea></label>
                        <label>归档依据 <textarea name="archive-evidence-summary" [(ngModel)]="archiveEvidenceSummary" required maxlength="2000"></textarea></label>
                        @if (currentArchive()) {
                            <label>替代原因 <textarea name="replacement-reason" [(ngModel)]="replacementReason" required maxlength="1000"></textarea></label>
                        }
                        <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy()">{{ currentArchive() ? '固定替代归档记录' : '固定归档事实' }}</button>
                    </form>
                    @if (currentArchive(); as archive) {
                        <form class="my-4 grid gap-3" (ngSubmit)="voidArchive()">
                            <label>撤销归档原因 <textarea name="void-archive-reason" [(ngModel)]="voidReason" required maxlength="1000"></textarea></label
                            ><button type="submit" class="justify-self-start rounded border px-3 py-2" [disabled]="busy() || !archive.allowedActions.includes('void-project-archive-record')">撤销当前归档事实</button>
                        </form>
                    }
                }
                @for (archive of archives(); track archive.id) {
                    <article class="my-3 rounded border border-surface-200 p-3">
                        <strong>{{ archive.status === 'recorded' ? '当前归档' : archive.status === 'voided' ? '已撤销归档' : '已被替代' }}</strong>
                        <p>{{ archive.archiveSummary }}</p>
                        <p>{{ archive.archivedAt }}</p>
                        @if (archive.sourceQualification === 'legacy-unverified') {
                            <p class="text-amber-700">沿用历史终态来源，本次归档不认证上游生命周期。</p>
                        }
                    </article>
                }
            }
        </section-card>
    `,
    styles: `
        label {
            display: grid;
            gap: 0.35rem;
        }
        input,
        select,
        textarea {
            border: 1px solid var(--p-surface-300);
            border-radius: 0.375rem;
            padding: 0.55rem;
            max-width: 100%;
        }
        input[type='checkbox'] {
            width: 1.25rem;
            height: 1.25rem;
        }
        button {
            min-height: 2.75rem;
        }
    `
})
export class ProjectLifecycleAuthoring {
    readonly projectId = input.required<string>();
    readonly api = input.required<ProjectLifecycleAuthoringApi>();
    readonly context = input<LifecycleAuthoringContext | null>(null);
    readonly ownTasksOnly = input(false);
    /** Enable only when a real condition-scoped upload adapter is available. */
    readonly canUploadOwnConditionEvidence = input(false);
    readonly canCloseOwnConditions = input(false);
    readonly actorUserId = input<string | null>(null);
    readonly conditionOwners = input<readonly { id: string; displayName: string }[]>([]);
    readonly changed = output<void>();
    readonly records = signal<ProjectCompletionRecordList | null>(null);
    readonly acceptances = signal<AcceptanceRecordSummary[]>([]);
    readonly archives = signal<ProjectArchiveRecordSummary[]>([]);
    readonly evidence = signal<LifecycleEvidenceSelection[]>([]);
    readonly busy = signal(false);
    readonly error = signal('');
    readonly notice = signal('');
    readonly isFullView = computed(() => !this.ownTasksOnly() && this.records()?.scopeKind === 'full-project');
    readonly fullCompletions = computed(() => {
        const r = this.records();
        return r?.scopeKind === 'full-project' ? r.items : [];
    });
    readonly finalAcceptances = computed(() => this.acceptances().filter((a) => a.acceptanceType === 'final-acceptance' && a.status === 'confirmed' && a.acceptanceResult !== 'rejected' && a.sourceQualification === 'verified-producer'));
    readonly currentArchive = computed(() => this.archives().find((a) => a.status === 'recorded') ?? null);
    readonly hasPendingConditions = computed(() => this.fullCompletions().some((c) => c.completionResult === 'conditional-completed' && c.conditionStatus !== 'closed'));
    readonly tasks = computed<TaskRow[]>(() => {
        const records = this.records();
        if (!records) return [];
        if (records.scopeKind === 'own-condition-only')
            return records.items.flatMap((parent) =>
                parent.ownTasks.map((task) => ({
                    completionRecordId: parent.completionRecordId,
                    completionRowVersion: parent.completionRowVersion,
                    completionConditionStatus: parent.conditionStatus,
                    conditionId: task.conditionId,
                    conditionRowVersion: task.conditionRowVersion,
                    summary: task.summary,
                    dueAt: task.dueAt,
                    status: task.status,
                    evidence: task.evidenceRefs,
                    closureSummary: task.closure?.closureSummary ?? null,
                    closureEvidence: task.closure?.evidenceRefs ?? [],
                    canClose: this.canCloseOwnConditions() && task.status === 'pending'
                }))
            );
        return records.items.flatMap((parent) =>
            parent.conditions
                .filter((c) => !this.ownTasksOnly() || c.responsibleUserId === this.actorUserId())
                .map((c) => ({
                    completionRecordId: parent.id,
                    completionRowVersion: parent.rowVersion,
                    completionConditionStatus: parent.conditionStatus,
                    conditionId: c.id,
                    conditionRowVersion: c.rowVersion,
                    summary: c.summary,
                    dueAt: c.dueAt,
                    status: c.status,
                    evidence: c.evidenceRefs,
                    closureSummary: c.closureSummary,
                    closureEvidence: c.closureEvidenceRefs,
                    canClose: c.allowedActions.includes('close-completion-condition')
                }))
        );
    });
    executionReason = '';
    readinessSummary = '';
    evidenceSummary = '';
    acceptanceType: CreateAcceptanceRecordRequest['acceptanceType'] = 'final-acceptance';
    acceptanceResult: CreateAcceptanceRecordRequest['acceptanceResult'] = 'accepted';
    scopeSummary = '';
    conditionalSummary = '';
    selectedAcceptanceId = '';
    completedAt = '';
    completionSummary = '';
    conditionDrafts: ConditionDraft[] = [this.blankCondition()];
    closureSummaries: Record<string, string> = {};
    closureFiles: Record<string, LifecycleEvidenceSelection[]> = {};
    reuseTaskEvidence: Record<string, boolean> = {};
    archivedAt = '';
    archiveSummary = '';
    archiveEvidenceSummary = '';
    replacementReason = '';
    voidReason = '';
    private epoch = 0;

    constructor() {
        effect(() => {
            this.projectId();
            this.api();
            this.ownTasksOnly();
            this.evidence.set([]);
            this.conditionDrafts = [this.blankCondition()];
            this.closureFiles = {};
            this.closureSummaries = {};
            this.reuseTaskEvidence = {};
            this.selectedAcceptanceId = '';
            this.notice.set('');
            void this.reload();
        });
    }
    selectedAcceptance(): AcceptanceRecordSummary | undefined {
        return this.finalAcceptances().find((a) => a.id === this.selectedAcceptanceId);
    }
    stageLabel(stage: string): string {
        return (
            ({ assessment: '评估', handover: '移交', execution: '执行', acceptance: '验收', completed: '完成', 'conditional-completed': '有条件完成', 'closed-lost': '未中标关闭', 'closed-terminated': '终止关闭' } as Record<string, string>)[stage] ??
            stage
        );
    }
    resultLabel(result: string): string {
        return ({ accepted: '通过', conditional: '有条件通过', rejected: '拒绝' } as Record<string, string>)[result] ?? result;
    }
    conditionStatusLabel(status: string): string {
        return ({ pending: '待闭合', closed: '全部闭合', 'not-applicable': '无需条件', 'legacy-unverified': '历史状态待核实' } as Record<string, string>)[status] ?? status;
    }
    private blankCondition(): ConditionDraft {
        return { summary: '', responsibleUserId: '', dueAt: '', evidence: [] };
    }
    addCondition(): void {
        this.conditionDrafts = [...this.conditionDrafts, this.blankCondition()];
    }
    removeCondition(index: number): void {
        this.conditionDrafts = this.conditionDrafts.filter((_, i) => i !== index);
    }
    removeEvidence(linkId: string): void {
        this.evidence.update((files) => files.filter((f) => f.attachmentLinkId !== linkId));
    }
    private refs(files: readonly LifecycleEvidenceSelection[]): LifecycleEvidenceRef[] {
        return [...new Set(files.map((f) => f.attachmentLinkId))].map((attachmentLinkId) => ({ attachmentLinkId }));
    }
    private iso(value: string): string {
        const date = new Date(value);
        if (!value || !Number.isFinite(date.getTime())) throw new Error('请填写有效的业务时间。');
        return date.toISOString();
    }
    private writableContext(stage?: string): LifecycleAuthoringContext {
        const context = this.context();
        if (!this.isFullView() || !context?.canWriteLifecycle || (stage && context.currentStage !== stage)) throw new Error('当前真实阶段或责任范围不允许此操作。');
        return context;
    }
    async reload(): Promise<void> {
        const epoch = ++this.epoch;
        const projectId = this.projectId();
        this.busy.set(true);
        this.error.set('');
        this.records.set(null);
        this.acceptances.set([]);
        this.archives.set([]);
        try {
            // This is intentionally the first request, including a direct task route.
            const records = await this.api().loadCompletionRecords(projectId);
            if (epoch !== this.epoch) return;
            this.records.set(records);
            if (records.scopeKind === 'full-project' && !this.ownTasksOnly()) {
                const [acceptances, archives] = await Promise.all([this.api().loadAcceptanceRecords(projectId), this.api().loadArchiveRecords(projectId)]);
                if (epoch !== this.epoch) return;
                this.acceptances.set(acceptances);
                this.archives.set(archives);
            }
        } catch (error) {
            if (epoch === this.epoch) this.error.set(this.errorText(error));
        } finally {
            if (epoch === this.epoch) this.busy.set(false);
        }
    }
    async startExecution(): Promise<void> {
        await this.run(async () => {
            const c = this.writableContext('handover');
            if (!c.executionAdmission || !this.executionReason.trim()) throw new Error('请核对真实执行准入材料并填写确认说明。');
            await this.api().startExecution(this.projectId(), { ...c.executionAdmission, inputVersion: 'server-derived-v1', expectedProjectVersion: c.projectRowVersion, reason: this.executionReason.trim() });
        }, '已依据当前移交与角色冻结进入执行。');
    }
    async startAcceptance(): Promise<void> {
        await this.run(async () => {
            const c = this.writableContext('execution');
            if (!c.currentStageRecordId) throw new Error('缺少真实执行准入。');
            await this.api().startAcceptance(this.projectId(), {
                inputVersion: 'server-derived-v1',
                expectedProjectVersion: c.projectRowVersion,
                executionStageRecordId: c.currentStageRecordId,
                readinessSummary: this.readinessSummary.trim(),
                evidenceSummary: this.evidenceSummary.trim(),
                evidenceRefs: this.refs(this.evidence())
            });
        }, '已固定真实交付证据并进入验收。');
    }
    async createAcceptance(): Promise<void> {
        await this.run(async () => {
            const c = this.writableContext('acceptance');
            if (!c.currentStageRecordId) throw new Error('缺少真实验收准入。');
            await this.api().createAcceptance(this.projectId(), {
                inputVersion: 'server-derived-v1',
                expectedProjectVersion: c.projectRowVersion,
                acceptanceStageRecordId: c.currentStageRecordId,
                acceptanceType: this.acceptanceType,
                acceptanceResult: this.acceptanceResult,
                scopeSummary: this.scopeSummary.trim(),
                evidenceSummary: this.evidenceSummary.trim(),
                evidenceRefs: this.refs(this.evidence()),
                ...(this.acceptanceResult === 'conditional' ? { conditionalSummary: this.conditionalSummary.trim() } : {})
            });
        }, '已固定验收原始结论，项目尚未自动完成。');
    }
    async createCompletion(): Promise<void> {
        await this.run(async () => {
            const c = this.writableContext('acceptance');
            const a = this.finalAcceptances().find((item) => item.id === this.selectedAcceptanceId);
            if (!a) throw new Error('请选择真实最终验收来源。');
            const completionConditions =
                a.acceptanceResult === 'conditional'
                    ? this.conditionDrafts.map((condition) => ({ summary: condition.summary.trim(), responsibleUserId: condition.responsibleUserId, dueAt: this.iso(condition.dueAt), evidenceRefs: this.refs(condition.evidence) }))
                    : [];
            await this.api().createCompletion(this.projectId(), {
                inputVersion: 'server-derived-v1',
                expectedProjectVersion: c.projectRowVersion,
                acceptanceRecordId: a.id,
                expectedAcceptanceVersion: a.rowVersion,
                completionResult: a.acceptanceResult === 'accepted' ? 'completed' : 'conditional-completed',
                completedAt: this.iso(this.completedAt),
                completionSummary: this.completionSummary.trim(),
                evidenceSummary: this.evidenceSummary.trim(),
                evidenceRefs: this.refs(this.evidence()),
                ...(completionConditions.length ? { completionConditions } : {})
            });
        }, '已记录最终完成结论及真实条件。');
    }
    async close(task: TaskRow): Promise<void> {
        await this.run(async () => {
            const files = [...(this.closureFiles[task.conditionId] ?? []), ...(this.reuseTaskEvidence[task.conditionId] ? task.evidence : [])];
            const closureSummary = this.closureSummaries[task.conditionId]?.trim();
            if (!task.canClose || !closureSummary || files.length === 0) throw new Error('本人闭合需要说明和真实证据。');
            await this.api().closeCondition(task.completionRecordId, task.conditionId, {
                inputVersion: 'server-derived-v1',
                expectedCompletionVersion: task.completionRowVersion,
                expectedConditionVersion: task.conditionRowVersion,
                closureSummary,
                evidenceRefs: this.refs(files)
            });
        }, '已记录本人闭合；全体条件状态由服务器重新计算。');
    }
    async saveArchive(): Promise<void> {
        await this.run(async () => {
            const c = this.context();
            if (!this.isFullView() || !c?.canArchive || this.hasPendingConditions()) throw new Error('当前终态或条件尚不允许归档。');
            const common = { inputVersion: 'server-derived-v1' as const, archivedAt: this.iso(this.archivedAt), archiveSummary: this.archiveSummary.trim(), evidenceSummary: this.archiveEvidenceSummary.trim() };
            const archive = this.currentArchive();
            if (archive) await this.api().replaceArchive(archive.id, { ...common, expectedVersion: archive.rowVersion, replacementReason: this.replacementReason.trim() });
            else await this.api().createArchive(this.projectId(), { ...common, expectedProjectVersion: c.projectRowVersion });
        }, '已固定归档事实，项目阶段保持终态。');
    }
    async voidArchive(): Promise<void> {
        await this.run(async () => {
            const archive = this.currentArchive();
            if (!archive || !this.voidReason.trim()) throw new Error('请选择当前归档并说明撤销原因。');
            await this.api().voidArchive(archive.id, { inputVersion: 'server-derived-v1', expectedVersion: archive.rowVersion, reason: this.voidReason.trim() });
        }, '已撤销归档事实，项目仍保持原终态。');
    }
    async upload(event: Event, conditionIndex?: number): Promise<void> {
        const input = event.target;
        const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
        if (!file || this.busy()) return;
        const epoch = this.epoch;
        const projectId = this.projectId();
        await this.run(
            async () => {
                const evidence = await this.api().uploadEvidence(projectId, file);
                if (epoch !== this.epoch) return;
                if (conditionIndex === undefined) this.evidence.update((files) => [...files.filter((f) => f.attachmentId !== evidence.attachmentId), evidence]);
                else {
                    const condition = this.conditionDrafts[conditionIndex];
                    if (condition) condition.evidence = [...condition.evidence.filter((f) => f.attachmentId !== evidence.attachmentId), evidence];
                }
            },
            '真实证据已上传并挂载本项目。',
            false
        );
    }
    async uploadClosure(event: Event, task: TaskRow): Promise<void> {
        const conditionId = task.conditionId;
        if (this.ownTasksOnly() && !this.canUploadOwnConditionEvidence()) {
            this.error.set('当前本人任务尚未接通条件范围的新证据上传，请等待服务支持后重新打开。');
            return;
        }
        const input = event.target;
        const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
        if (!file || this.busy()) return;
        const epoch = this.epoch;
        const projectId = this.projectId();
        await this.run(
            async () => {
                const evidence = await this.api().uploadConditionEvidence(projectId, task.completionRecordId, task.conditionId, file);
                if (epoch !== this.epoch) return;
                this.closureFiles[conditionId] = [...(this.closureFiles[conditionId] ?? []), evidence];
            },
            '本人闭合证据已上传。',
            false
        );
    }
    async open(evidence: LifecycleEvidenceSelection): Promise<void> {
        try {
            await this.api().openEvidence(evidence);
        } catch (error) {
            this.error.set(this.errorText(error));
        }
    }
    private async run(operation: () => Promise<void>, notice: string, reload = true): Promise<void> {
        if (this.busy()) return;
        const epoch = this.epoch;
        this.busy.set(true);
        this.error.set('');
        this.notice.set('');
        try {
            await operation();
            if (epoch !== this.epoch) return;
            this.notice.set(notice);
            if (reload) {
                this.changed.emit();
                await this.reload();
            }
        } catch (error) {
            if (epoch === this.epoch) this.error.set(this.errorText(error));
        } finally {
            if (epoch === this.epoch) this.busy.set(false);
        }
    }
    private errorText(error: unknown): string {
        const value = error as { status?: number; message?: string };
        if (value.status === 403) return '当前责任范围不允许此操作或读取此附件。';
        if (value.status === 404) return '当前项目、本人任务或证据不可访问。';
        if (value.status === 409) return '来源或版本已变化，请重新核对当前事实。';
        return value.message ?? '操作未完成，请核对真实来源后重试。';
    }
}
