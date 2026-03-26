import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore, CommissionStore, ProjectStore } from '@poms/admin-data-access';
import type { RejectApprovalRecordRequest } from '@poms/shared-api-client';
import { CommissionCalculationSummaryStatusEnum, CommissionPayoutStage, CommissionPayoutSummaryStatusEnum, CommissionPayoutTier } from '@poms/shared-api-client';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { SectionCard } from '../../shared/ui/sectioncard';

@Component({
    selector: 'app-project-commission',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, TagModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, TextareaModule, ToastModule],
    providers: [ProjectStore, CommissionStore, MessageService],
    template: `
        <p-toast />
        @if (loading()) {
            <div class="flex items-center justify-center py-20"><i class="pi pi-spin pi-spinner text-4xl text-primary"></i></div>
        } @else if (project()) {
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-3">
                        <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" severity="secondary" (onClick)="goBackToProject()" class="cursor-pointer" />
                        <div>
                            <h1 class="text-xl font-semibold text-surface-950 dark:text-surface-0">提成治理 · {{ project()!.projectName }}</h1>
                            <span class="text-sm text-surface-500 dark:text-surface-400">{{ project()!.projectCode }}</span>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <p-tag [value]="getProjectStageName(project()!.currentStage)" [severity]="getProjectStageSeverity(project()!.currentStage)" />
                        <p-tag [value]="getProjectStatusName(project()!.status)" [severity]="getProjectStatusSeverity(project()!.status)" />
                        <p-button label="刷新" icon="pi pi-refresh" severity="secondary" [outlined]="true" [rounded]="true" (onClick)="reload()" class="cursor-pointer" />
                    </div>
                </div>

                <section-card>
                    <ng-template #title>当前状态</ng-template>
                    <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                            <div class="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800">
                                <div class="text-xs text-surface-400 dark:text-surface-500">当前提成池</div>
                                <div class="text-lg font-semibold text-surface-950 dark:text-surface-0">{{ currentPool() }}</div>
                            </div>
                            <div class="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800">
                                <div class="text-xs text-surface-400 dark:text-surface-500">待审批发放</div>
                                <div class="text-lg font-semibold text-surface-950 dark:text-surface-0">{{ commissionStore.pendingApprovalCount() }}</div>
                            </div>
                            <div class="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800">
                                <div class="text-xs text-surface-400 dark:text-surface-500">已登记发放</div>
                                <div class="text-lg font-semibold text-surface-950 dark:text-surface-0">{{ commissionStore.paidPayoutCount() }}</div>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <p-button label="触发计算" icon="pi pi-calculator" severity="primary" [rounded]="true" (onClick)="openTriggerDialog()" class="cursor-pointer" />
                            <p-button label="创建发放草稿" icon="pi pi-wallet" severity="secondary" [outlined]="true" [rounded]="true" [disabled]="!commissionStore.currentEffectiveCalculation()" (onClick)="openCreatePayoutDialog()" class="cursor-pointer" />
                        </div>
                    </div>
                </section-card>

                <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <section-card class="xl:col-span-2">
                        <ng-template #title>计算结果</ng-template>
                        <p-table [value]="calculations()" class="mt-4" [pt]="{ root: { class: 'border-none!' } }">
                            <ng-template #header>
                                <tr><th>版本</th><th>提成池</th><th>状态</th><th>操作</th></tr>
                            </ng-template>
                            <ng-template #body let-item>
                                <tr>
                                    <td>
                                        <div class="flex flex-col gap-1">
                                            <span class="font-medium text-surface-950 dark:text-surface-0">V{{ item.version }}</span>
                                            <span class="text-xs text-surface-400 dark:text-surface-500">{{ formatRate(item.contributionMarginRate) }}</span>
                                        </div>
                                    </td>
                                    <td>{{ formatAmount(item.commissionPool) }}</td>
                                    <td><p-tag [value]="getCalculationStatusName(item.status)" [severity]="getCalculationStatusSeverity(item.status)" /></td>
                                    <td>
                                        @if (item.status === calculationStatus.Calculated) {
                                            <p-button label="确认生效" size="small" severity="success" [rounded]="true" [loading]="commissionStore.saving()" (onClick)="confirmCalculation(item.id, item.rowVersion)" class="cursor-pointer" />
                                        }
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template #emptymessage><tr><td colspan="4" class="py-8 text-center text-surface-400">暂无计算结果</td></tr></ng-template>
                        </p-table>
                    </section-card>

                    <section-card class="xl:col-span-3">
                        <ng-template #title>发放记录</ng-template>
                        <p-table [value]="payouts()" class="mt-4" [pt]="{ root: { class: 'border-none!' } }">
                            <ng-template #header>
                                <tr><th>阶段</th><th>档位</th><th>理论上限</th><th>状态</th><th style="width: 16rem">操作</th></tr>
                            </ng-template>
                            <ng-template #body let-item>
                                <tr [ngClass]="highlightedPayoutId() === item.id ? 'bg-primary-50/70 dark:bg-primary-950/20' : ''">
                                    <td>{{ getStageLabel(item.stageType) }}</td>
                                    <td>{{ getTierLabel(item.selectedTier) }}</td>
                                    <td>{{ formatAmount(item.theoreticalCapAmount) }}</td>
                                    <td>
                                        <div class="flex flex-col gap-2">
                                            <p-tag [value]="getPayoutStatusName(item.status)" [severity]="getPayoutStatusSeverity(item.status)" />
                                            @if (todoForPayout(item.id)) { <span class="text-[11px] text-primary-600 dark:text-primary-300">你有待处理审批</span> }
                                        </div>
                                    </td>
                                    <td>
                                        <div class="flex flex-wrap gap-2">
                                            @if (item.status === payoutStatus.Draft) {
                                                <p-button label="提交审批" size="small" severity="warn" [rounded]="true" [loading]="commissionStore.saving()" (onClick)="submitPayoutApproval(item.id, item.rowVersion)" class="cursor-pointer" />
                                            }
                                            @if (item.status === payoutStatus.PendingApproval && todoForPayout(item.id)) {
                                                <p-button label="审批通过" size="small" severity="success" [rounded]="true" [loading]="commissionStore.saving()" (onClick)="approvePayout(todoForPayout(item.id)!.sourceId, todoForPayout(item.id)!.rowVersion)" class="cursor-pointer" />
                                                <p-button label="驳回" size="small" severity="danger" [outlined]="true" [rounded]="true" [loading]="commissionStore.saving()" (onClick)="openRejectDialog(todoForPayout(item.id)!.sourceId, todoForPayout(item.id)!.rowVersion)" class="cursor-pointer" />
                                            }
                                            @if (item.status === payoutStatus.Approved) {
                                                <p-button label="登记发放" size="small" severity="primary" [rounded]="true" [loading]="commissionStore.saving()" (onClick)="openRegisterDialog(item.id, item.approvedAmount ?? item.theoreticalCapAmount, item.rowVersion)" class="cursor-pointer" />
                                            }
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template #emptymessage><tr><td colspan="5" class="py-8 text-center text-surface-400">暂无发放记录</td></tr></ng-template>
                        </p-table>
                    </section-card>
                </div>
            </div>

            <p-dialog [(visible)]="triggerDialogVisible" [modal]="true" header="触发提成计算" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2"><label class="font-medium">确认收入（不含税）</label><input pInputText [(ngModel)]="triggerForm.recognizedRevenueTaxExclusive" class="w-full" /></div>
                    <div class="flex flex-col gap-2"><label class="font-medium">确认成本（不含税）</label><input pInputText [(ngModel)]="triggerForm.recognizedCostTaxExclusive" class="w-full" /></div>
                </div>
                <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="triggerDialogVisible = false" /><p-button label="开始计算" icon="pi pi-calculator" [loading]="commissionStore.saving()" (onClick)="triggerCalculation()" /></div></ng-template>
            </p-dialog>

            <p-dialog [(visible)]="createPayoutDialogVisible" [modal]="true" header="创建发放草稿" [style]="{ width: '32rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2"><label class="font-medium">计算版本</label><p-select [(ngModel)]="createPayoutForm.calculationId" [options]="effectiveCalculationOptions()" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2"><label class="font-medium">发放阶段</label><p-select [(ngModel)]="createPayoutForm.stageType" [options]="stageOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
                        <div class="flex flex-col gap-2"><label class="font-medium">审批档位</label><p-select [(ngModel)]="createPayoutForm.selectedTier" [options]="tierOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
                    </div>
                </div>
                <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createPayoutDialogVisible = false" /><p-button label="创建草稿" icon="pi pi-wallet" [loading]="commissionStore.saving()" (onClick)="createPayout()" /></div></ng-template>
            </p-dialog>

            <p-dialog [(visible)]="registerDialogVisible" [modal]="true" header="登记业务发放" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4"><div class="flex flex-col gap-2"><label class="font-medium">登记发放金额</label><input pInputText [(ngModel)]="registerForm.paidRecordAmount" class="w-full" /></div></div>
                <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="registerDialogVisible = false" /><p-button label="登记" icon="pi pi-check-circle" [loading]="commissionStore.saving()" (onClick)="registerPayout()" /></div></ng-template>
            </p-dialog>

            <p-dialog [(visible)]="rejectDialogVisible" [modal]="true" header="驳回发放审批" [style]="{ width: '34rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2"><label class="font-medium">驳回原因</label><input pInputText [(ngModel)]="rejectForm.reason" class="w-full" /></div>
                    <div class="flex flex-col gap-2"><label class="font-medium">补充说明</label><textarea pTextarea [(ngModel)]="rejectForm.comment" [rows]="4" class="w-full"></textarea></div>
                </div>
                <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="rejectDialogVisible = false" /><p-button label="确认驳回" severity="danger" icon="pi pi-times" [loading]="commissionStore.saving()" (onClick)="rejectPayout()" /></div></ng-template>
            </p-dialog>
        } @else {
            <div class="py-20 text-center"><i class="pi pi-exclamation-triangle text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i><p class="text-surface-500 dark:text-surface-400">项目未找到</p><p-button label="返回项目列表" icon="pi pi-arrow-left" [text]="true" (onClick)="goBackToList()" class="mt-4 cursor-pointer" /></div>
        }
    `
})
export class ProjectCommission implements OnInit, OnDestroy {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #messageService = inject(MessageService);
    readonly #authStore = inject(AuthStore);
    readonly projectStore = inject(ProjectStore);
    readonly commissionStore = inject(CommissionStore);

    readonly project = this.projectStore.selectedProject;
    readonly calculations = this.commissionStore.calculations;
    readonly payouts = this.commissionStore.payouts;
    readonly loading = computed(() => this.projectStore.loading() || this.commissionStore.loadingCalculations() || this.commissionStore.loadingPayouts());
    readonly currentPool = computed(() => (this.commissionStore.currentEffectiveCalculation() ? this.formatAmount(this.commissionStore.currentEffectiveCalculation()!.commissionPool) : '--'));
    readonly calculationStatus = CommissionCalculationSummaryStatusEnum;
    readonly payoutStatus = CommissionPayoutSummaryStatusEnum;
    readonly stageOptions = [{ label: '首期发放', value: CommissionPayoutStage.First }, { label: '二期发放', value: CommissionPayoutStage.Second }, { label: '最终发放', value: CommissionPayoutStage.Final }];
    readonly tierOptions = [{ label: '基础档', value: CommissionPayoutTier.Basic }, { label: '中档', value: CommissionPayoutTier.Mid }, { label: '上限档', value: CommissionPayoutTier.Premium }];
    readonly payoutTodoMap = computed(() => new Map(this.#authStore.myTodos().filter((todo) => todo.targetObjectType === 'CommissionPayout' && todo.status === 'open').map((todo) => [todo.targetObjectId, todo])));
    readonly effectiveCalculationOptions = computed(() => this.calculations().filter((item) => item.status === this.calculationStatus.Effective).map((item) => ({ label: `V${item.version} · 提成池 ${this.formatAmount(item.commissionPool)}`, value: item.id })));

    readonly highlightedPayoutId = signal<string | null>(null);
    triggerDialogVisible = false;
    createPayoutDialogVisible = false;
    registerDialogVisible = false;
    rejectDialogVisible = false;
    triggerForm = { recognizedRevenueTaxExclusive: '', recognizedCostTaxExclusive: '' };
    createPayoutForm = { calculationId: '', stageType: CommissionPayoutStage.First, selectedTier: CommissionPayoutTier.Basic };
    registerForm = { payoutId: '', expectedVersion: undefined as number | undefined, paidRecordAmount: '' };
    rejectForm = { approvalRecordId: '', expectedVersion: undefined as number | undefined, reason: '', comment: '' };

    ngOnInit() {
        const projectId = this.projectId();
        const payoutId = this.#route.snapshot.queryParamMap.get('payoutId');
        if (payoutId) this.highlightedPayoutId.set(payoutId);
        if (projectId) void Promise.all([this.projectStore.loadProject(projectId), this.commissionStore.reload(projectId)]);
    }

    ngOnDestroy() {
        this.projectStore.clearSelectedProject();
        this.commissionStore.clear();
    }

    projectId() { return this.#route.snapshot.paramMap.get('id'); }
    todoForPayout(payoutId: string) { return this.payoutTodoMap().get(payoutId) ?? null; }
    goBackToProject() { const id = this.projectId(); if (id) this.#router.navigate(['/projects', id]); }
    goBackToList() { this.#router.navigate(['/projects']); }
    async reload() { const id = this.projectId(); if (id) await Promise.all([this.projectStore.loadProject(id), this.commissionStore.reload(id)]); }

    openTriggerDialog() { this.triggerForm = { recognizedRevenueTaxExclusive: '', recognizedCostTaxExclusive: '' }; this.triggerDialogVisible = true; }
    async triggerCalculation() {
        const id = this.projectId();
        if (!id) return;
        if (!this.triggerForm.recognizedRevenueTaxExclusive.trim() || !this.triggerForm.recognizedCostTaxExclusive.trim()) return this.#messageService.add({ severity: 'warn', summary: '请填写必填项' });
        try {
            const calculation = await this.commissionStore.triggerCalculation(id, { recognizedRevenueTaxExclusive: this.triggerForm.recognizedRevenueTaxExclusive.trim(), recognizedCostTaxExclusive: this.triggerForm.recognizedCostTaxExclusive.trim() });
            this.triggerDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '计算完成', detail: `已生成提成计算版本 V${calculation.version}` });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '计算失败', detail: this.getErrorMessage(error) });
        }
    }

    async confirmCalculation(calcId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.confirmCalculation(id, calcId, { expectedVersion });
            this.#messageService.add({ severity: 'success', summary: '已生效', detail: '当前提成计算版本已确认生效' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '生效失败', detail: this.getErrorMessage(error) });
        }
    }

    openCreatePayoutDialog() {
        const effective = this.commissionStore.currentEffectiveCalculation();
        this.createPayoutForm = { calculationId: effective?.id ?? '', stageType: CommissionPayoutStage.First, selectedTier: CommissionPayoutTier.Basic };
        this.createPayoutDialogVisible = true;
    }

    async createPayout() {
        const id = this.projectId();
        if (!id) return;
        if (!this.createPayoutForm.calculationId) return this.#messageService.add({ severity: 'warn', summary: '请选择计算版本' });
        try {
            await this.commissionStore.createPayout(id, this.createPayoutForm);
            this.createPayoutDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '草稿已创建' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '创建失败', detail: this.getErrorMessage(error) });
        }
    }

    async submitPayoutApproval(payoutId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.submitPayoutApproval(id, payoutId, { expectedVersion });
            this.#messageService.add({ severity: 'success', summary: '提交成功', detail: '发放审批已进入统一待办' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '提交失败', detail: this.getErrorMessage(error) });
        }
    }

    async approvePayout(approvalRecordId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.approvePayoutApproval(id, approvalRecordId, expectedVersion);
            this.#messageService.add({ severity: 'success', summary: '审批通过', detail: '当前可继续登记业务发放' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '审批失败', detail: this.getErrorMessage(error) });
        }
    }

    openRejectDialog(approvalRecordId: string, expectedVersion: number) { this.rejectForm = { approvalRecordId, expectedVersion, reason: '', comment: '' }; this.rejectDialogVisible = true; }
    async rejectPayout() {
        const id = this.projectId();
        if (!id) return;
        if (!this.rejectForm.reason.trim()) return this.#messageService.add({ severity: 'warn', summary: '请填写驳回原因' });
        const request: RejectApprovalRecordRequest = { reason: this.rejectForm.reason.trim(), expectedVersion: this.rejectForm.expectedVersion, ...(this.rejectForm.comment.trim() ? { comment: this.rejectForm.comment.trim() } : {}) };
        try {
            await this.commissionStore.rejectPayoutApproval(id, this.rejectForm.approvalRecordId, request);
            this.rejectDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '已驳回', detail: '发放审批已退回草稿' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '驳回失败', detail: this.getErrorMessage(error) });
        }
    }

    openRegisterDialog(payoutId: string, defaultAmount: string, expectedVersion: number) { this.registerForm = { payoutId, expectedVersion, paidRecordAmount: defaultAmount }; this.registerDialogVisible = true; }
    async registerPayout() {
        const id = this.projectId();
        if (!id) return;
        if (!this.registerForm.paidRecordAmount.trim()) return this.#messageService.add({ severity: 'warn', summary: '请填写发放金额' });
        try {
            await this.commissionStore.registerPayout(id, this.registerForm.payoutId, { paidRecordAmount: this.registerForm.paidRecordAmount.trim(), expectedVersion: this.registerForm.expectedVersion });
            this.registerDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '登记成功' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '登记失败', detail: this.getErrorMessage(error) });
        }
    }

    formatAmount(value: string | null | undefined) { if (value === null || value === undefined || value === '') return '--'; const parsed = Number(value); return Number.isFinite(parsed) ? parsed.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value; }
    formatRate(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(2)}%` : value; }
    getCalculationStatusName(status: CommissionCalculationSummaryStatusEnum) { return { pending: '待计算', calculated: '已计算', effective: '已生效', superseded: '已替代' }[status]; }
    getCalculationStatusSeverity(status: CommissionCalculationSummaryStatusEnum) { return { pending: 'secondary', calculated: 'info', effective: 'success', superseded: 'contrast' }[status] as 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'; }
    getPayoutStatusName(status: CommissionPayoutSummaryStatusEnum) { return { draft: '草稿', 'pending-approval': '待审批', approved: '已批准', paid: '已发放', reversed: '已冲销' }[status]; }
    getPayoutStatusSeverity(status: CommissionPayoutSummaryStatusEnum) { return { draft: 'secondary', 'pending-approval': 'warn', approved: 'success', paid: 'info', reversed: 'danger' }[status] as 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'; }
    getStageLabel(stage: CommissionPayoutStage) { return { first: '首期发放', second: '二期发放', final: '最终发放' }[stage]; }
    getTierLabel(tier: CommissionPayoutTier) { return { basic: '基础档', mid: '中档', premium: '上限档' }[tier]; }
    getProjectStatusName(status: string) { return { active: '进行中', closed_won: '已签约', closed_lost: '已丢单', draft: '草稿', suspended: '已暂停' }[status] ?? status; }
    getProjectStatusSeverity(status: string) { return { active: 'info', closed_won: 'success', closed_lost: 'danger', draft: 'secondary', suspended: 'warn' }[status] as 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined; }
    getProjectStageName(stage: string) { return { lead: '线索', opportunity: '商机', proposal: '方案', negotiation: '谈判', contracting: '签约中', execution: '执行中', closed: '已关闭' }[stage] ?? stage; }
    getProjectStageSeverity(stage: string) { return { lead: 'secondary', opportunity: 'info', proposal: 'info', negotiation: 'warn', contracting: 'warn', execution: 'success', closed: 'contrast' }[stage] as 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined; }
    getErrorMessage(error: unknown) {
        if (typeof error === 'object' && error !== null) {
            const candidate = error as { error?: { message?: string }; message?: string };
            if (candidate.error?.message) return candidate.error.message;
            if (candidate.message) return candidate.message;
        }
        return '请求未成功，请稍后重试';
    }
}
