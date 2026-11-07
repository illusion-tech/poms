import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '@poms/admin-data-access';
import { TechnicalScopeItemTypeLabel, PreSigningRiskLevelLabel, PreSigningRiskStatusLabel } from '@poms/shared-contracts';
import {
    ApprovalApi,
    ContractApi,
    ContractReadinessApi,
    ProjectApi,
    ProjectHandoverApi,
    ProjectHandoverResponsibilityRole,
    ProjectReceiptJudgmentMode,
    ConfirmProjectHandoverParticipantConfirmationInputParticipantStatusEnum,
    CommercialBaselineReviewDecision,
    type ApprovalRecordSummary,
    type ContractCommercialTerms,
    type ContractDetailView,
    type ContractReadinessDetail,
    type ContractDiffReviewHistoryView,
    type CommercialReleaseBaselineSummary,
    type ContractHandoverSummaryView,
    type ProjectHandoverDetailView
} from '@poms/admin-data-access';
import { SectionCard } from '../../shared/ui/sectioncard';
import { HandoverRouteEpoch, handoverParticipants, type HandoverDutySelection } from './project-handover-flow';

@Component({
    selector: 'app-project-handover-actions',
    standalone: true,
    imports: [FormsModule, RouterLink, SectionCard],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section-card>
            <ng-template #title>移交准备与确认</ng-template>
            <ng-template #description>每位参与人确认本人职责。移交事实确认后，正式执行准入仍等待提成角色冻结。</ng-template>
            @if (error()) {
                <p role="alert" class="my-3 text-red-600">{{ error() }}</p>
            }
            @if (acknowledgement()) {
                <p role="status" class="my-3 text-green-700">{{ acknowledgement() }}</p>
            }
            <button type="button" class="my-3 underline" [disabled]="busy()" (click)="reload()">重新核对当前材料</button>
            @if (detail(); as current) {
                <p>材料版本：{{ current.version ?? '未准备' }} · 已确认 {{ current.participantConfirmationSummary.confirmedCount }}/{{ current.participantConfirmationSummary.requiredCount }} 人</p>
                @if (current.receiptJudgmentModeSummary.receiptJudgmentMode; as mode) {
                    <p class="my-2">回款判断：{{ mode === 'project-aggregate' ? '项目汇总判断' : '合同分别判断' }} · {{ current.receiptJudgmentModeSummary.status === 'frozen' ? '已冻结' : '本次准备选定，待最终确认冻结' }}</p>
                }
                @if (current.sourceChanged) {
                    <p role="alert" class="text-amber-700">来源已经变化，须重新准备或完成再基线化。</p>
                }
                @if (current.frozenMaterials; as materials) {
                    <section class="my-4 rounded border border-surface-200 p-4" aria-label="本次确认的冻结范围和风险">
                        <h3 class="font-semibold">本次确认材料：范围、边界与风险</h3>
                        <p class="my-2 text-sm">以下内容来自本次材料版本的冻结副本，与本人确认、摘要和审计引用一致。成本仅列版本依据。</p>
                        @for (material of materials.contracts; track material.contractId) {
                            <article class="my-3 rounded border border-surface-200 p-3">
                                <h4 class="font-semibold">合同 {{ contractLabel(material.contractId) }}</h4>
                                <p class="my-2 break-all text-sm">条款快照 {{ material.contractTermSnapshotId }} · 技术成本基线版本 {{ material.technicalCostVersion }}（{{ material.technicalCostPackageId }}）</p>
                                <h5 class="mt-3 font-medium">交付范围与边界</h5>
                                @for (scope of material.scopeItems; track scope.id) {
                                    <div class="my-2">
                                        <strong>{{ scopeTypeLabel(scope.scopeType) }} · {{ scope.label }}</strong>
                                        <p class="whitespace-pre-wrap">{{ scope.description }}</p>
                                    </div>
                                } @empty {
                                    <p>此来源未登记结构化范围项。</p>
                                }
                                <h5 class="mt-3 font-medium">风险交底</h5>
                                @for (risk of material.riskItems; track risk.id) {
                                    <div class="my-3 rounded bg-surface-50 p-3 dark:bg-surface-900">
                                        <strong>{{ risk.riskCategory }} · {{ riskLevelLabel(risk.riskLevel) }} · {{ riskStatusLabel(risk.riskStatus) }}</strong>
                                        <p class="whitespace-pre-wrap">{{ risk.riskDescription }}</p>
                                        <p class="whitespace-pre-wrap">影响范围：{{ risk.impactScope }}</p>
                                        <p class="whitespace-pre-wrap">应对措施：{{ risk.mitigationPlan }}</p>
                                        <p>承担角色：{{ risk.ownerRole }}</p>
                                        @if (risk.blocksNextStage) {
                                            <p>此风险被来源登记为阶段阻断项。</p>
                                        }
                                    </div>
                                } @empty {
                                    <p>此来源未登记结构化风险项。</p>
                                }
                            </article>
                        }
                    </section>
                } @else {
                    <p class="my-3 text-amber-700">尚无可核对的冻结范围与风险材料，请先完成真实移交准备。</p>
                }
                @for (participant of current.participantConfirmationSummary.participants; track participant.participantId) {
                    <div class="my-2 rounded border border-surface-200 p-3">
                        <strong>{{ participant.participantDisplayName ?? '移交参与人' }}</strong> · {{ participant.participantStatus }}
                        @for (duty of participant.responsibilities; track duty.roleKey) {
                            <p>{{ dutyLabel(duty.roleKey) }}：{{ duty.responsibilitySummary }}</p>
                        }
                    </div>
                }
                @if (current.allowedActions.includes('confirm-project-handover-participant')) {
                    <label class="mt-3 block">本人确认意见 <input class="ml-2 rounded border p-2" [(ngModel)]="comment" maxlength="1000" /></label>
                    <button type="button" class="my-3 rounded bg-primary px-4 py-2 text-white" [disabled]="busy()" (click)="confirmOwn()">确认本人全部已指派职责</button>
                }
                @if (current.allowedActions.includes('confirm-project-handover')) {
                    <button type="button" class="my-3 rounded bg-primary px-4 py-2 text-white" [disabled]="busy()" (click)="finalize()">正式确认本次移交事实</button>
                }
                @if (current.handoverStatus === 'confirmed') {
                    <p class="my-3 text-amber-700">移交事实已确认。{{ current.executionAdmission.blockingReasons.join('；') }}</p>
                }
            }
            @if (summary()?.availableParticipants; as people) {
                <form class="mt-4 flex flex-col gap-3" (ngSubmit)="prepare()">
                    <h3 class="font-semibold">发起新版本准备</h3>
                    @for (duty of duties; track duty.roleKey) {
                        <div class="grid gap-2 md:grid-cols-3">
                            <label [for]="'handover-duty-' + duty.roleKey">{{ dutyLabel(duty.roleKey) }}</label>
                            <select class="rounded border p-2" [id]="'handover-duty-' + duty.roleKey" [name]="duty.roleKey" [(ngModel)]="duty.userId" required>
                                <option value="">请选择实际承担人</option>
                                @for (person of people; track person.id) {
                                    <option [value]="person.id">{{ person.displayName }}</option>
                                }
                            </select>
                            <input
                                class="rounded border p-2"
                                [attr.aria-label]="dutyLabel(duty.roleKey) + '责任说明'"
                                [name]="duty.roleKey + '-summary'"
                                [(ngModel)]="duty.responsibilitySummary"
                                required
                                maxlength="1000"
                                placeholder="本次正式交接的责任"
                            />
                        </div>
                    }
                    <label><input type="checkbox" name="financeRequired" [(ngModel)]="financeRequired" /> 本次需要财务参与确认</label>
                    @if (financeRequired) {
                        <label
                            >财务承担人
                            <select name="financeUser" [(ngModel)]="financeUser" required>
                                <option value="">请选择人员</option>
                                @for (person of people; track person.id) {
                                    <option [value]="person.id">{{ person.displayName }}</option>
                                }
                            </select></label
                        >
                        <label>财务责任说明 <input name="financeResponsibility" [(ngModel)]="financeResponsibility" maxlength="1000" required /></label>
                    }
                    <label
                        >回款判断模式
                        <select name="receiptMode" [(ngModel)]="receiptMode" required>
                            <option value="">请明确选择</option>
                            <option value="project-aggregate">项目汇总判断</option>
                            <option value="contract-separate">合同分别判断</option>
                        </select></label
                    >
                    <button type="submit" class="self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || !summary()?.allowedActions?.includes('prepare-project-handover')">生成材料、待办与本人确认任务</button>
                </form>
            }
        </section-card>
        @if (canManageContracts()) {
            <section-card>
                <ng-template #title>受控合同变更与再基线化</ng-template>
                <ng-template #description>旧生效合同持续有效；新条款须经真实审核后原子生效。历史到账事实保留且只计一次。</ng-template>
                <label class="my-3 block"
                    >选择合同
                    <select [(ngModel)]="selectedContractId" [disabled]="busy()" (ngModelChange)="loadContract()">
                        <option value="">请选择</option>
                        @for (contract of summary()?.effectiveContractSetSummary?.contracts ?? []; track contract.id) {
                            <option [value]="contract.id">{{ contract.contractNo }}</option>
                        }
                    </select></label
                >
                @if (contract(); as selected) {
                    <p>当前合同版本 {{ selected.rowVersion }} · 变更状态 {{ readiness()?.amendmentStatus ?? '未发起' }}</p>
                    <a [routerLink]="['/contracts', selected.id]" class="underline">查看合同与审核材料</a>
                    @if (terms; as draft) {
                        <form class="my-4 grid gap-3 md:grid-cols-2" (ngSubmit)="createAmendment()">
                            <label>变更原因 <input name="amendmentReason" [(ngModel)]="amendmentReason" required maxlength="1000" /></label>
                            <label>合同含税金额 <input name="inclusive" [(ngModel)]="draft.amountTaxInclusive" required inputmode="decimal" /></label>
                            <label>未税金额 <input name="exclusive" [(ngModel)]="draft.amountTaxExclusive" required inputmode="decimal" /></label>
                            <label>税率（0–1） <input name="taxRate" [(ngModel)]="draft.taxRate" required inputmode="decimal" /></label>
                            <label>首款比例（0–1） <input name="downPayment" [(ngModel)]="draft.downPaymentRate" required inputmode="decimal" /></label>
                            <label>质保金比例（0–1） <input name="retention" [(ngModel)]="draft.retentionRate" required inputmode="decimal" /></label>
                            <label>质保金日期 <input name="retentionDate" type="date" [(ngModel)]="draft.retentionDueDate" /></label>
                            <label>付款条款 <textarea name="paymentTerms" [(ngModel)]="draft.paymentTerms" required maxlength="1000"></textarea></label>
                            @for (node of draft.receivablePlanSeeds; track node.nodeKey; let i = $index) {
                                <fieldset class="rounded border p-3">
                                    <legend>{{ node.label }}</legend>
                                    <label>节点名称 <input [name]="'node-label-' + i" [(ngModel)]="node.label" required maxlength="128" /></label>
                                    <label>金额 <input [name]="'node-amount-' + i" [(ngModel)]="node.plannedAmount" required inputmode="decimal" /></label>
                                    <label>日期 <input [name]="'node-date-' + i" type="date" [(ngModel)]="node.plannedDate" required /></label>
                                    <label><input [name]="'node-retention-' + i" type="checkbox" [(ngModel)]="node.isRetentionNode" /> 质保金节点</label>
                                    <button type="button" class="m-2 underline" [disabled]="busy()" (click)="removePlanNode(i)">移除此回款节点</button>
                                </fieldset>
                            }
                            <button type="button" class="rounded border p-2" [disabled]="busy()" (click)="addPlanNode()">增加回款节点</button>
                            <button type="submit" class="rounded border px-3 py-2" [disabled]="busy()">建立变更就绪包</button>
                            <fieldset class="rounded border p-3 md:col-span-2">
                                <legend>金额或重大条款变化需要重新商业放行</legend>
                                <label>新商业参考编号 <input name="commercialBaselineCode" [(ngModel)]="commercialBaselineCode" maxlength="64" /></label>
                                <button type="button" class="m-2 rounded border p-2" [disabled]="busy() || !commercialBaselineCode.trim()" (click)="createReference()">以本次条款建立新的商业参考</button>
                                @if (pendingReference(); as reference) {
                                    <p>已建立 {{ reference.baselineCode }}。请先点击“建立变更就绪包”保留进度，再前往项目主线完成真实商业重审；旧生效合同保持有效。</p>
                                }
                            </fieldset>
                        </form>
                    } @else {
                        <p class="text-amber-700">当前无可见的结构化条款。请先核对读取权限和合同来源。</p>
                    }
                    @if (readiness(); as ready) {
                        <p>{{ ready.blockingReasonSummary ?? '来源已满足当前准备条件。' }}</p>
                        @if (ready.contractAmendmentId) {
                            @if (ready.reviewStatus === 'pending-review' && ready.diffLevel === 'review-required') {
                                @for (item of diffHistory()?.diffItems ?? []; track item.id) {
                                    <label class="my-2 block"
                                        ><input type="checkbox" [checked]="reviewedFields.has(item.fieldKey)" (change)="toggleReviewed(item.fieldKey)" /> {{ item.fieldLabel }}：{{ item.oldValueSummary ?? '受控字段' }} →
                                        {{ item.newValueSummary ?? '受控字段' }}</label
                                    >
                                }
                                <button type="button" class="m-2 rounded border p-2" [disabled]="busy() || !allDiffFieldsReviewed() || !comment.trim()" (click)="reviewDiff()">记录已逐项核对的本次差异</button>
                            }
                            @if (ready.diffLevel === 'reapproval-required') {
                                <p role="alert">本次变化需要新的正式商业基线，不能在移交页直接绕过重审。</p>
                                <a [routerLink]="['/projects', projectId(), 'workspace']" class="underline">前往项目主线核对放行来源</a>
                            }
                            @if (ready.allowedActions.includes('initialize-contract-snapshot')) {
                                <button type="button" class="m-2 rounded border p-2" [disabled]="busy()" (click)="prepareTerms()">准备精确变更版本</button>
                            }
                            @if (ready.currentPreparation?.status === 'prepared' && ready.amendmentStatus === 'draft') {
                                <button type="button" class="m-2 rounded border p-2" [disabled]="busy()" (click)="submitReview()">提交正式合同变更审核</button>
                            }
                            @if (isApprover()) {
                                <button type="button" class="m-2 rounded border p-2" [disabled]="busy()" (click)="decide(true)">批准本次变更</button
                                ><button type="button" class="m-2 rounded border p-2" [disabled]="busy() || !comment.trim()" (click)="decide(false)">拒绝本次变更（须填写意见）</button>
                            }
                            <label>审核或操作意见 <input [(ngModel)]="comment" maxlength="1000" /></label>
                            @if (ready.amendmentStatus === 'approved' && approval()?.currentStatus === 'approved') {
                                <button type="button" class="m-2 rounded border p-2" [disabled]="busy()" (click)="activate()">生效新快照与完整回款计划</button>
                            }
                            @if (ready.amendmentStatus === 'effective' && detail()?.sourceChanged) {
                                <p>确认本次变化影响的原承接项（条款及回款项必须包含）：</p>
                                @for (item of detail()?.handoverBasisItems ?? []; track item.id) {
                                    <label class="my-2 block"><input type="checkbox" [checked]="affected.has(item.id)" (change)="toggleAffected(item.id)" /> {{ itemLabel(item.summary) }}</label>
                                }
                                <button type="button" class="m-2 rounded border p-2" [disabled]="busy() || affected.size === 0 || !amendmentReason.trim()" (click)="rebaseline()">再基线化并重新发起各人确认</button>
                            }
                        }
                    }
                }
            </section-card>
        }
    `
})
export class ProjectHandoverActions implements OnChanges {
    readonly projectId = input.required<string>();
    readonly changed = output<void>();
    readonly #api = inject(ProjectHandoverApi);
    readonly #contracts = inject(ContractApi);
    readonly #readiness = inject(ContractReadinessApi);
    readonly #approvals = inject(ApprovalApi);
    readonly #projects = inject(ProjectApi);
    readonly #auth = inject(AuthStore);
    readonly #epoch = new HandoverRouteEpoch();
    #loadVersion = 0;
    #contractLoadVersion = 0;
    readonly summary = signal<ContractHandoverSummaryView | null>(null);
    readonly detail = signal<ProjectHandoverDetailView | null>(null);
    readonly contract = signal<ContractDetailView | null>(null);
    readonly readiness = signal<ContractReadinessDetail | null>(null);
    readonly approval = signal<ApprovalRecordSummary | null>(null);
    readonly diffHistory = signal<ContractDiffReviewHistoryView | null>(null);
    reviewedFields = new Set<string>();
    readonly pendingReference = signal<CommercialReleaseBaselineSummary | null>(null);
    #referenceContractId = '';
    commercialBaselineCode = '';
    readonly busy = signal(false);
    readonly error = signal('');
    readonly acknowledgement = signal('');
    readonly canManageContracts = computed(() => this.#auth.hasAnyPermission(['project:write']));
    readonly isApprover = computed(() => this.approval()?.currentStatus === 'pending' && this.approval()?.currentApproverUserId === this.#auth.currentUser()?.id);
    duties: HandoverDutySelection[] = this.emptyDuties();
    financeRequired = false;
    financeUser = '';
    financeResponsibility = '';
    receiptMode: '' | ProjectReceiptJudgmentMode = '';
    comment = '';
    selectedContractId = '';
    amendmentReason = '';
    terms: ContractCommercialTerms | null = null;
    affected = new Set<string>();
    constructor() {
        inject(DestroyRef).onDestroy(() => this.#epoch.enter(''));
    }
    ngOnChanges(): void {
        this.#epoch.enter(this.projectId());
        this.summary.set(null);
        this.detail.set(null);
        this.contract.set(null);
        this.readiness.set(null);
        this.approval.set(null);
        this.diffHistory.set(null);
        this.reviewedFields = new Set();
        this.pendingReference.set(null);
        this.#referenceContractId = '';
        this.commercialBaselineCode = '';
        this.duties = this.emptyDuties();
        this.terms = null;
        this.selectedContractId = '';
        this.comment = '';
        this.amendmentReason = '';
        this.affected = new Set();
        this.receiptMode = '';
        this.financeRequired = false;
        this.financeUser = '';
        this.financeResponsibility = '';
        this.busy.set(false);
        this.error.set('');
        this.acknowledgement.set('');
        void this.reload();
    }
    private emptyDuties(): HandoverDutySelection[] {
        return [ProjectHandoverResponsibilityRole.SalesOwner, ProjectHandoverResponsibilityRole.BusinessAdmin, ProjectHandoverResponsibilityRole.TechnicalSupport, ProjectHandoverResponsibilityRole.ExecutionOwner].map((roleKey) => ({
            roleKey,
            userId: '',
            responsibilitySummary: ''
        }));
    }
    dutyLabel(role: string): string {
        return ({ 'sales-owner': '销售主责', 'business-admin': '商务行政', 'technical-support': '技术/售前', 'execution-owner': '执行负责人', finance: '财务' } as Record<string, string>)[role] ?? '参与职责';
    }
    contractLabel(id: string): string {
        return this.detail()?.effectiveContractSetSummary.contracts.find((contract) => contract.id === id)?.contractNo ?? id;
    }
    scopeTypeLabel(value: string): string {
        return (TechnicalScopeItemTypeLabel as Record<string, string>)[value] ?? value;
    }
    riskLevelLabel(value: string): string {
        return (PreSigningRiskLevelLabel as Record<string, string>)[value] ?? value;
    }
    riskStatusLabel(value: string): string {
        return (PreSigningRiskStatusLabel as Record<string, string>)[value] ?? value;
    }
    async reload(): Promise<void> {
        const ticket = this.#epoch.ticket();
        const serial = ++this.#loadVersion;
        try {
            const [summary, detail, project] = await Promise.all([
                firstValueFrom(this.#api.projectHandoverControllerGetContractHandoverSummary({ projectId: ticket.projectId })),
                firstValueFrom(this.#api.projectHandoverControllerGetProjectHandoverDetailByProject({ projectId: ticket.projectId })),
                firstValueFrom(this.#projects.projectControllerGetById({ id: ticket.projectId }))
            ]);
            if (!this.#epoch.accepts(ticket) || serial !== this.#loadVersion) return;
            this.summary.set(summary);
            this.detail.set(detail);
            const sales = this.duties.find((duty) => duty.roleKey === 'sales-owner');
            if (project.scopeKind === 'full-project' && sales && !sales.userId) sales.userId = project.ownerUserId ?? '';
        } catch (error) {
            if (this.#epoch.accepts(ticket) && serial === this.#loadVersion) this.error.set(this.message(error));
        }
    }
    private async run(action: () => Promise<unknown>, message: string): Promise<void> {
        if (this.busy()) return;
        const ticket = this.#epoch.ticket();
        const contractId = this.selectedContractId;
        this.busy.set(true);
        this.error.set('');
        this.acknowledgement.set('');
        try {
            await action();
            if (!this.#epoch.accepts(ticket) || contractId !== this.selectedContractId) return;
            this.acknowledgement.set(message);
            await this.reload();
            if (this.selectedContractId) await this.loadContract();
            if (this.#epoch.accepts(ticket) && contractId === this.selectedContractId) this.changed.emit();
        } catch (error) {
            if (this.#epoch.accepts(ticket) && contractId === this.selectedContractId) this.error.set(this.message(error));
        } finally {
            if (this.#epoch.accepts(ticket)) this.busy.set(false);
        }
    }
    async prepare(): Promise<void> {
        const summary = this.summary();
        const detail = this.detail();
        if (!summary || !this.receiptMode) {
            this.error.set('请核对材料并明确选择回款模式。');
            return;
        }
        let participants;
        try {
            participants = handoverParticipants([...this.duties, ...(this.financeRequired ? [{ roleKey: ProjectHandoverResponsibilityRole.Finance, userId: this.financeUser, responsibilitySummary: this.financeResponsibility }] : [])]);
        } catch (error) {
            this.error.set(this.message(error));
            return;
        }
        const executionOwnerUserId = this.duties.find((duty) => duty.roleKey === 'execution-owner')?.userId ?? '';
        const request = {
            executionOwnerUserId,
            participants,
            financeConfirmationRequired: this.financeRequired,
            receiptJudgmentMode: this.receiptMode,
            expectedProjectVersion: summary.projectRowVersion,
            expectedSourceHash: summary.sourcePayloadHash,
            ...(detail?.version ? { expectedCurrentHandoverVersion: detail.version } : {}),
            comment: this.comment.trim()
        };
        await this.run(() => firstValueFrom(this.#api.projectHandoverControllerPrepareProjectHandover({ projectId: summary.projectId, prepareProjectHandoverRequest: request })), '移交材料与各人确认任务已生成。');
    }
    async confirmOwn(): Promise<void> {
        const h = this.detail();
        if (!h?.handoverId || !h.summarySnapshotId || !h.handoverBasisSnapshotId || !h.participantConfirmationSummary.rowVersion) return;
        const { handoverId, summarySnapshotId, handoverBasisSnapshotId } = h;
        const expectedConfirmationVersion = h.participantConfirmationSummary.rowVersion;
        await this.run(
            () =>
                firstValueFrom(
                    this.#api.projectHandoverControllerConfirmProjectHandoverParticipant({
                        id: handoverId,
                        confirmProjectHandoverParticipantRequest: {
                            summarySnapshotId,
                            handoverBasisSnapshotId,
                            expectedConfirmationVersion,
                            comment: this.comment.trim()
                        }
                    })
                ),
            '本人职责已确认。'
        );
    }
    async finalize(): Promise<void> {
        const h = this.detail();
        if (!h?.handoverId || !h.summarySnapshotId || !h.handoverBasisSnapshotId || !h.sourcePayloadHash || !h.contractSummarySnapshotId || !h.rowVersion) return;
        const { handoverId, contractSummarySnapshotId, summarySnapshotId, handoverBasisSnapshotId, sourcePayloadHash, rowVersion } = h;
        const participantConfirmations = h.participantConfirmationSummary.participants.flatMap((p) =>
            p.responsibilities.map((duty) => ({ participantId: p.participantId, participantRoleKey: duty.roleKey, participantStatus: ConfirmProjectHandoverParticipantConfirmationInputParticipantStatusEnum.Confirmed }))
        );
        await this.run(
            () =>
                firstValueFrom(
                    this.#api.projectHandoverControllerConfirmProjectHandover({
                        id: handoverId,
                        confirmProjectHandoverRequest: {
                            participantConfirmations,
                            contractSummarySnapshotId,
                            summarySnapshotId,
                            handoverBasisSnapshotId,
                            sourcePayloadHash,
                            expectedVersion: rowVersion,
                            comment: this.comment.trim()
                        }
                    })
                ),
            '移交事实已正式确认；执行准入仍等待提成角色冻结。'
        );
    }
    async loadContract(): Promise<void> {
        const ticket = this.#epoch.ticket();
        const contractId = this.selectedContractId;
        const serial = ++this.#contractLoadVersion;
        if (this.#referenceContractId !== contractId) {
            this.pendingReference.set(null);
            this.commercialBaselineCode = '';
        }
        this.contract.set(null);
        this.readiness.set(null);
        this.approval.set(null);
        this.diffHistory.set(null);
        this.reviewedFields = new Set();
        this.terms = null;
        this.affected = new Set();
        if (!contractId) return;
        try {
            const [contract, ready, approval] = await Promise.all([
                firstValueFrom(this.#contracts.contractControllerGetById({ id: contractId })),
                firstValueFrom(this.#readiness.contractReadinessControllerGetCurrentContractReadiness({ projectId: ticket.projectId, contractId })),
                firstValueFrom(this.#contracts.contractControllerGetCurrentApproval({ id: contractId })).catch((error: { status?: number }) => {
                    if (error.status === 404) return null;
                    throw error;
                })
            ]);
            const history = await firstValueFrom(this.#readiness.contractReadinessControllerGetDiffHistory({ id: ready.sourceBaselineId, contractId }));
            if (!this.#epoch.accepts(ticket) || serial !== this.#contractLoadVersion || contractId !== this.selectedContractId) return;
            this.contract.set(contract);
            this.readiness.set(ready);
            this.approval.set(approval);
            this.diffHistory.set(history);
            const pending = this.pendingReference()?.contractTerms?.find((item) => item.contractId === contractId);
            this.terms = pending ? structuredClone(pending) : ready.candidateTerms ? structuredClone(ready.candidateTerms) : null;
        } catch (error) {
            if (this.#epoch.accepts(ticket) && serial === this.#contractLoadVersion) this.error.set(this.message(error));
        }
    }
    async createAmendment(): Promise<void> {
        const c = this.contract();
        const ready = this.readiness();
        const terms = this.terms;
        if (!c?.currentSnapshotId || !ready || !terms || !this.amendmentReason.trim()) return;
        const sourceSnapshotId = c.currentSnapshotId;
        const candidateTerms = structuredClone(terms);
        candidateTerms.retentionDueDate = candidateTerms.retentionDueDate?.trim() || null;
        candidateTerms.receivablePlanSeeds.forEach((node, index) => (node.sortOrder = index));
        const projectId = this.projectId();
        const sourceBaselineId = this.pendingReference()?.id ?? ready.sourceBaselineId;
        await this.run(
            () =>
                firstValueFrom(
                    this.#readiness.contractReadinessControllerCreateContractReadinessPackage({
                        createContractReadinessPackageRequest: {
                            projectId,
                            contractId: c.id,
                            sourceBaselineId,
                            candidateTerms,
                            amendment: { sourceSnapshotId, expectedContractVersion: c.rowVersion, reason: this.amendmentReason.trim() }
                        }
                    })
                ),
            '正式变更就绪包已建立，请核对差异和审核要求。'
        );
    }
    async createReference(): Promise<void> {
        const c = this.contract();
        const ready = this.readiness();
        const terms = this.terms;
        if (!c || !ready || !terms || !this.commercialBaselineCode.trim()) return;
        const ticket = this.#epoch.ticket();
        const candidate = structuredClone(terms);
        candidate.retentionDueDate = candidate.retentionDueDate?.trim() || null;
        candidate.receivablePlanSeeds.forEach((node, index) => (node.sortOrder = index));
        const code = this.commercialBaselineCode.trim();
        await this.run(async () => {
            const source = await firstValueFrom(this.#readiness.contractReadinessControllerGetCommercialReleaseBaseline({ id: ready.sourceBaselineId }));
            if (!this.#epoch.accepts(ticket) || this.selectedContractId !== c.id) return;
            if (source.financialProjection.mode !== 'full' || !source.contractTerms) throw new Error('须具有真实商业来源的完整读取权限。');
            const references = source.contractTerms.filter((item) => item.contractId !== c.id);
            references.push(candidate);
            const result = await firstValueFrom(
                this.#readiness.contractReadinessControllerCreateCommercialReleaseBaseline({
                    createCommercialReleaseBaselineRequest: {
                        projectId: ticket.projectId,
                        baselineCode: code,
                        contractTerms: references,
                        amountTaxInclusive: source.amountTaxInclusive,
                        amountTaxExclusive: source.amountTaxExclusive,
                        taxRate: source.taxRate,
                        downPaymentRate: source.downPaymentRate,
                        retentionRate: source.retentionRate,
                        paymentTerms: source.paymentTerms,
                        paymentTermsSummary: source.paymentTermsSummary,
                        grossMarginSummary: source.grossMarginSummary
                    }
                })
            );
            if (this.#epoch.accepts(ticket) && this.selectedContractId === c.id) {
                this.#referenceContractId = c.id;
                this.pendingReference.set(result);
            }
        }, '新商业参考已建立，尚未商业放行；请建立变更就绪包并到主线完成真实重审。');
    }
    addPlanNode(): void {
        if (!this.terms) return;
        let number = this.terms.receivablePlanSeeds.length + 1;
        while (this.terms.receivablePlanSeeds.some((node) => node.nodeKey === `milestone-${number}`)) number++;
        this.terms.receivablePlanSeeds.push({ nodeKey: `milestone-${number}`, label: '阶段回款', plannedAmount: '', plannedDate: '', isRetentionNode: false, sortOrder: this.terms.receivablePlanSeeds.length, note: null });
    }
    removePlanNode(index: number): void {
        this.terms?.receivablePlanSeeds.splice(index, 1);
    }
    itemLabel(label: string): string {
        let result = label;
        for (const contract of this.detail()?.effectiveContractSetSummary.contracts ?? []) result = result.replaceAll(contract.id, () => contract.contractNo);
        return result;
    }
    toggleReviewed(key: string): void {
        const next = new Set(this.reviewedFields);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        this.reviewedFields = next;
    }
    allDiffFieldsReviewed(): boolean {
        const history = this.diffHistory();
        return !!history && history.diffItems.length > 0 && history.diffItems.every((item) => this.reviewedFields.has(item.fieldKey));
    }
    async reviewDiff(): Promise<void> {
        const r = this.readiness();
        const c = this.contract();
        const history = this.diffHistory();
        if (!r || !c || !history || !this.allDiffFieldsReviewed() || !this.comment.trim()) return;
        await this.run(
            () =>
                firstValueFrom(
                    this.#readiness.contractReadinessControllerReviewDiff({
                        id: r.sourceBaselineId,
                        reviewCommercialReleaseBaselineDiffRequest: {
                            contractId: c.id,
                            diffResultId: r.latestDiffResultId,
                            diffDecision: CommercialBaselineReviewDecision.Approved,
                            reviewedFieldKeys: [...this.reviewedFields],
                            comment: this.comment.trim(),
                            expectedVersion: history.baseline.rowVersion
                        }
                    })
                ),
            '本次差异已记录真实复核。'
        );
    }
    async prepareTerms(): Promise<void> {
        const r = this.readiness();
        if (!r?.contractAmendmentId || !r.contractId) return;
        const { contractId, contractAmendmentId } = r;
        await this.run(
            () =>
                firstValueFrom(
                    this.#readiness.contractReadinessControllerInitializeContractSnapshot({
                        id: r.id,
                        initializeContractSnapshotFromReadinessPackageRequest: { contractId, contractAmendmentId, expectedVersion: r.rowVersion }
                    })
                ),
            '精确变更版本已准备。'
        );
    }
    async submitReview(): Promise<void> {
        const r = this.readiness();
        const c = this.contract();
        if (!r?.contractAmendmentId || !r.currentPreparation || !c) return;
        const { currentPreparation, contractAmendmentId } = r;
        await this.run(
            () =>
                firstValueFrom(
                    this.#contracts.contractControllerSubmitReview({ id: c.id, submitContractReviewRequest: { preparationId: currentPreparation.preparationId, contractAmendmentId, expectedVersion: c.rowVersion } })
                ),
            '已提交正式变更审核，旧合同仍有效。'
        );
    }
    async decide(approve: boolean): Promise<void> {
        const a = this.approval();
        if (!a || !this.isApprover()) return;
        await this.run(
            () =>
                firstValueFrom(
                    approve
                        ? this.#approvals.approvalControllerApproveRecord({ id: a.id, approveRecordRequest: { expectedVersion: a.rowVersion, comment: this.comment.trim() || undefined } })
                        : this.#approvals.approvalControllerRejectRecord({ id: a.id, rejectApprovalRecordRequest: { expectedVersion: a.rowVersion, reason: this.comment.trim() } })
                ),
            approve ? '变更已批准，尚未生效。' : '变更已拒绝，旧有效事实保持。'
        );
    }
    async activate(): Promise<void> {
        const r = this.readiness();
        const c = this.contract();
        const a = this.approval();
        if (!r?.contractAmendmentId || !c || !a) return;
        const contractAmendmentId = r.contractAmendmentId;
        await this.run(
            () => firstValueFrom(this.#contracts.contractControllerActivate({ id: c.id, activateContractRequest: { contractAmendmentId, approvalRecordId: a.id, expectedVersion: c.rowVersion } })),
            '新快照与完整计划已原子生效；历史到账未复制。'
        );
    }
    toggleAffected(id: string): void {
        const next = new Set(this.affected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        this.affected = next;
    }
    async rebaseline(): Promise<void> {
        const h = this.detail();
        const r = this.readiness();
        const c = this.contract();
        if (!h?.handoverId || !h.handoverBasisSnapshotId || !h.sourcePayloadHash || !h.rowVersion || !r?.contractAmendmentId || !c?.currentSnapshotId || !this.amendmentReason.trim()) return;
        const { handoverId, handoverBasisSnapshotId, sourcePayloadHash, rowVersion } = h;
        const contractAmendmentId = r.contractAmendmentId;
        const effectiveBaselineAfterId = c.currentSnapshotId;
        await this.run(
            () =>
                firstValueFrom(
                    this.#api.projectHandoverControllerRebaselineContractHandover({
                        rebaselineContractHandoverRequest: {
                            sourceHandoverId: handoverId,
                            handoverBasisSnapshotId,
                            sourcePayloadHash,
                            expectedVersion: rowVersion,
                            contractAmendmentId,
                            effectiveBaselineAfterId,
                            rebaselineReason: this.amendmentReason.trim(),
                            affectedHandoverItemIds: [...this.affected]
                        }
                    })
                ),
            '新承接材料已生效，所有参与人须重新确认。'
        );
    }
    private message(error: unknown): string {
        const value = error as { error?: { message?: string | string[] }; message?: string };
        const message = value?.error?.message ?? value?.message;
        return Array.isArray(message) ? message.join('；') : (message ?? '操作未完成，请刷新当前材料后重试。');
    }
}
