import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore, ContractStore, type ContractStatus } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { SectionCard } from '../../shared/ui/sectioncard';

@Component({
    selector: 'app-contract-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, TagModule, ButtonModule, InputTextModule, SelectModule, DialogModule, TextareaModule, ToastModule],
    providers: [ContractStore, MessageService],
    template: `
        <p-toast />
        @if (loading()) {
            <div class="flex items-center justify-center py-20">
                <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        } @else if (contract()) {
            <div class="flex flex-col gap-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div class="flex items-center gap-3">
                        <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" severity="secondary" (onClick)="goBack()" class="cursor-pointer" />
                        <div>
                            <h1 class="text-xl font-semibold text-surface-950 dark:text-surface-0">合同 {{ contract()!.contractNo }}</h1>
                            <span class="text-sm text-surface-500 dark:text-surface-400">项目 {{ contract()!.projectId }} / 版本 {{ contract()!.rowVersion }}</span>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center justify-end gap-2">
                        <p-tag [value]="getStatusName(contract()!.status)" [severity]="getStatusSeverity(contract()!.status)" />
                        @if (approvalStatusLabel()) {
                            <p-tag [value]="approvalStatusLabel()!" [severity]="approvalStatusSeverity()" />
                        }
                        @if (canEditContract()) {
                            <p-button label="编辑" icon="pi pi-pencil" severity="primary" [rounded]="true" (onClick)="showEditDialog()" class="cursor-pointer" />
                        }
                    </div>
                </div>

                <section-card>
                    <ng-template #title>当前操作</ng-template>
                    <ng-template #action>
                        @if (loadingApproval()) {
                            <span class="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-2">
                                <i class="pi pi-spin pi-spinner"></i>
                                正在同步审批状态
                            </span>
                        }
                    </ng-template>
                    <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div class="flex-1 space-y-2">
                            <p class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ actionHeadline() }}</p>
                            <p class="text-sm text-surface-500 dark:text-surface-400">{{ actionDescription() }}</p>
                            @if (currentApproval()) {
                                <div class="flex flex-wrap items-center gap-2 pt-1">
                                    <span class="text-xs text-surface-400 dark:text-surface-500">审批节点：{{ currentApproval()!.currentNodeName ?? currentApproval()!.currentNodeKey }}</span>
                                    @if (currentApproval()!.currentApproverUserId) {
                                        <span class="text-xs text-surface-400 dark:text-surface-500">当前处理人：{{ currentApproval()!.currentApproverUserId }}</span>
                                    }
                                </div>
                            }
                        </div>
                        <div class="flex flex-wrap gap-2">
                            @if (canSubmitReview()) {
                                <p-button label="提交审核" icon="pi pi-send" severity="warn" [rounded]="true" (onClick)="openSubmitReviewDialog()" class="cursor-pointer" />
                            }
                            @if (canApprove()) {
                                <p-button label="审批通过" icon="pi pi-check" severity="success" [rounded]="true" (onClick)="openApproveDialog()" class="cursor-pointer" />
                            }
                            @if (canReject()) {
                                <p-button label="驳回" icon="pi pi-times" severity="danger" [rounded]="true" (onClick)="openRejectDialog()" class="cursor-pointer" />
                            }
                            @if (canActivate()) {
                                <p-button label="确认生效" icon="pi pi-verified" severity="primary" [rounded]="true" (onClick)="openActivateDialog()" class="cursor-pointer" />
                            }
                        </div>
                    </div>
                </section-card>

                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <!-- Basic Info -->
                    <section-card class="xl:col-span-2">
                        <ng-template #title>合同信息</ng-template>
                        <div class="grid grid-cols-2 gap-4 mt-4">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">合同编号</span>
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ contract()!.contractNo }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">关联项目</span>
                                <span class="text-sm font-medium text-primary cursor-pointer hover:underline" (click)="navigateToProject()">{{ contract()!.projectId }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">签约金额</span>
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ contract()!.signedAmount | number: '1.2-2' }} {{ contract()!.currencyCode }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">合同状态</span>
                                <p-tag [value]="getStatusName(contract()!.status)" [severity]="getStatusSeverity(contract()!.status)" />
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">当前快照</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0 break-all">{{ contract()!.currentSnapshotId ?? '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">签约日期</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.signedAt ? (contract()!.signedAt | date: 'yyyy-MM-dd') : '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">币种</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.currencyCode }}</span>
                            </div>
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>审批摘要</ng-template>
                        @if (loadingApproval()) {
                            <div class="flex items-center justify-center py-10">
                                <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
                            </div>
                        } @else if (currentApproval()) {
                            <div class="flex flex-col gap-4 mt-4">
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">审批状态</span>
                                    <p-tag [value]="getApprovalStatusName(currentApproval()!.currentStatus)" [severity]="getApprovalStatusSeverity(currentApproval()!.currentStatus)" />
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">审批节点</span>
                                    <span class="text-sm text-surface-950 dark:text-surface-0">{{ currentApproval()!.currentNodeName ?? currentApproval()!.currentNodeKey }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">发起人</span>
                                    <span class="text-sm text-surface-950 dark:text-surface-0 break-all">{{ currentApproval()!.initiatorUserId }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">当前审批人</span>
                                    <span class="text-sm text-surface-950 dark:text-surface-0 break-all">{{ currentApproval()!.currentApproverUserId ?? '-' }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">提交时间</span>
                                    <span class="text-sm text-surface-950 dark:text-surface-0">{{ currentApproval()!.submittedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">业务状态</span>
                                    <span class="text-sm text-surface-950 dark:text-surface-0">{{ getStatusName(currentApproval()!.targetStatus ?? contract()!.status) }}</span>
                                </div>
                                @if (currentApproval()!.decisionComment) {
                                    <div class="flex flex-col gap-1">
                                        <span class="text-xs text-surface-500 dark:text-surface-400">审批意见</span>
                                        <div class="rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm text-surface-700 dark:text-surface-200 whitespace-pre-wrap">
                                            {{ currentApproval()!.decisionComment }}
                                        </div>
                                    </div>
                                }
                            </div>
                        } @else {
                            <div class="py-10 text-center">
                                <i class="pi pi-inbox text-3xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                                <p class="text-sm text-surface-500 dark:text-surface-400">当前没有关联审批记录</p>
                            </div>
                        }
                    </section-card>

                    <!-- Audit Info -->
                    <section-card class="xl:col-span-3">
                        <ng-template #title>审计追踪</ng-template>
                        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-4">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">创建时间</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.createdAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">创建人</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.createdBy ?? '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">最后更新</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">更新人</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.updatedBy ?? '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">版本号</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.rowVersion }}</span>
                            </div>
                        </div>
                    </section-card>
                </div>
            </div>

            <!-- Edit Dialog -->
            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑合同" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">签约金额</label>
                        <input pInputText [(ngModel)]="editForm.signedAmount" class="w-full" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">币种</label>
                        <p-select [(ngModel)]="editForm.currencyCode" [options]="currencyOptions" optionLabel="label" optionValue="value" class="w-full" appendTo="body" />
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" (onClick)="saveContract()" [loading]="saving()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="submitReviewDialogVisible" [modal]="true" header="提交合同审核" [style]="{ width: '34rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200">
                        提交后合同将进入待审核状态，普通编辑会被锁定，审批动作将通过统一待办流转。
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">提交说明</label>
                        <textarea pTextarea [(ngModel)]="submitReviewForm.comment" [rows]="4" class="w-full" placeholder="可填写本次提交审核的背景说明"></textarea>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="submitReviewDialogVisible = false" />
                        <p-button label="提交审核" icon="pi pi-send" severity="warn" (onClick)="submitReview()" [loading]="saving()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="approveDialogVisible" [modal]="true" header="审批通过" [style]="{ width: '34rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
                        审批通过后，合同仍保持待审核业务状态，需由业务侧执行“确认生效”完成正式生效。
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">审批意见</label>
                        <textarea pTextarea [(ngModel)]="approveForm.comment" [rows]="4" class="w-full" placeholder="可填写审批通过说明"></textarea>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="approveDialogVisible = false" />
                        <p-button label="确认通过" icon="pi pi-check" severity="success" (onClick)="approveApproval()" [loading]="saving()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="rejectDialogVisible" [modal]="true" header="驳回审批" [style]="{ width: '34rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">驳回原因</label>
                        <input pInputText [(ngModel)]="rejectForm.reason" class="w-full" placeholder="请输入驳回原因" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">补充说明</label>
                        <textarea pTextarea [(ngModel)]="rejectForm.comment" [rows]="4" class="w-full" placeholder="可补充需要申请人修正的内容"></textarea>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="rejectDialogVisible = false" />
                        <p-button label="确认驳回" icon="pi pi-times" severity="danger" (onClick)="rejectApproval()" [loading]="saving()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="activateDialogVisible" [modal]="true" header="确认合同生效" [style]="{ width: '34rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-200">
                        生效后将生成当前有效合同快照标识，合同进入正式生效状态。
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">生效说明</label>
                        <textarea pTextarea [(ngModel)]="activateForm.comment" [rows]="4" class="w-full" placeholder="可填写生效确认说明"></textarea>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="activateDialogVisible = false" />
                        <p-button label="确认生效" icon="pi pi-verified" severity="primary" (onClick)="activateContract()" [loading]="saving()" />
                    </div>
                </ng-template>
            </p-dialog>
        } @else {
            <div class="py-20 text-center">
                <i class="pi pi-exclamation-triangle text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                <p class="text-surface-500 dark:text-surface-400">合同未找到</p>
                <p-button label="返回列表" icon="pi pi-arrow-left" [text]="true" (onClick)="goBack()" class="mt-4 cursor-pointer" />
            </div>
        }
    `
})
export class ContractDetail implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #contractStore = inject(ContractStore);
    readonly #authStore = inject(AuthStore);
    readonly #messageService = inject(MessageService);

    readonly contract = this.#contractStore.selectedContract;
    readonly currentApproval = this.#contractStore.currentApproval;
    readonly loading = this.#contractStore.loading;
    readonly loadingApproval = this.#contractStore.loadingApproval;
    readonly saving = this.#contractStore.saving;
    readonly currentUser = computed(() => this.#authStore.currentUser());
    readonly isCurrentApprover = computed(() => this.currentApproval()?.currentApproverUserId === this.currentUser()?.id);
    readonly canEditContract = computed(() => this.contract()?.status === 'draft');
    readonly canSubmitReview = computed(() => this.contract()?.status === 'draft');
    readonly canApprove = computed(() => this.contract()?.status === 'pending-review' && this.currentApproval()?.currentStatus === 'pending' && this.isCurrentApprover());
    readonly canReject = computed(() => this.contract()?.status === 'pending-review' && this.currentApproval()?.currentStatus === 'pending' && this.isCurrentApprover());
    readonly canActivate = computed(() => this.contract()?.status === 'pending-review' && this.currentApproval()?.currentStatus === 'approved');
    readonly approvalStatusLabel = computed(() => {
        const status = this.currentApproval()?.currentStatus;
        return status ? this.getApprovalStatusName(status) : null;
    });
    readonly approvalStatusSeverity = computed(() => {
        const status = this.currentApproval()?.currentStatus;
        return status ? this.getApprovalStatusSeverity(status) : undefined;
    });
    readonly actionHeadline = computed(() => {
        if (this.canSubmitReview()) return '合同草稿已准备就绪，可提交进入审核流程';
        if (this.canApprove()) return '你是当前审批人，可以直接处理这条合同审核';
        if (this.canReject()) return '你可以驳回当前审批，合同将退回草稿';
        if (this.canActivate()) return '审批已通过，下一步应确认合同正式生效';
        if (this.contract()?.status === 'pending-review' && this.currentApproval()?.currentStatus === 'pending') return '合同正在审批流转中，等待当前审批人处理';
        if (this.contract()?.status === 'active') return '合同已正式生效，可作为后续台账与联动依据';
        return '当前没有可执行的命令动作';
    });
    readonly actionDescription = computed(() => {
        if (this.canSubmitReview()) return '提交审核后将生成审批记录与统一待办，详情页进入审批追踪状态。';
        if (this.canApprove()) return '审批通过后仍需业务侧执行“确认生效”，以避免审批状态和业务状态混用。';
        if (this.canReject()) return '驳回将关闭当前待办，并把合同状态退回草稿，便于业务侧继续修订。';
        if (this.canActivate()) return '生效后会生成快照标识，并将合同业务状态切换为已生效。';
        if (this.contract()?.status === 'pending-review' && this.currentApproval()?.currentStatus === 'pending') return '审批入口保留在业务页面，统一待办仅作为聚合入口。';
        if (this.contract()?.status === 'active') return '当前合同已完成审核与生效闭环，后续可以继续接回款、发票等切片。';
        return '请结合当前合同状态与审批摘要继续推进。';
    });

    editDialogVisible = false;
    submitReviewDialogVisible = false;
    approveDialogVisible = false;
    rejectDialogVisible = false;
    activateDialogVisible = false;
    editForm = { signedAmount: '', currencyCode: '' };
    submitReviewForm = { comment: '' };
    approveForm = { comment: '' };
    rejectForm = { reason: '', comment: '' };
    activateForm = { comment: '' };

    currencyOptions = [
        { label: '人民币 (CNY)', value: 'CNY' },
        { label: '美元 (USD)', value: 'USD' },
        { label: '欧元 (EUR)', value: 'EUR' }
    ];

    ngOnInit() {
        const id = this.#route.snapshot.paramMap.get('id');
        if (id) {
            void Promise.all([this.#contractStore.loadContract(id), this.#contractStore.loadCurrentApproval(id)]);
        }
    }

    goBack() {
        this.#router.navigate(['/contracts']);
    }

    navigateToProject() {
        const c = this.contract();
        if (c) this.#router.navigate(['/projects', c.projectId]);
    }

    showEditDialog() {
        const c = this.contract();
        if (!c) return;
        this.editForm = { signedAmount: c.signedAmount, currencyCode: c.currencyCode };
        this.editDialogVisible = true;
    }

    async saveContract() {
        const c = this.contract();
        if (!c) return;

        try {
            await this.#contractStore.updateContract(c.id, {
                signedAmount: this.editForm.signedAmount,
                currencyCode: this.editForm.currencyCode
            });
            this.editDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '保存成功', detail: '合同基础信息已更新', life: 3000 });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '保存失败', detail: this.getErrorMessage(error), life: 4000 });
            return;
        }
    }

    openSubmitReviewDialog() {
        this.submitReviewForm = { comment: '' };
        this.submitReviewDialogVisible = true;
    }

    async submitReview() {
        const c = this.contract();
        if (!c) return;

        try {
            await this.#contractStore.submitReview(c.id, {
                comment: this.submitReviewForm.comment || undefined,
                expectedVersion: c.rowVersion
            });
            this.submitReviewDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '提交成功', detail: '合同已进入审核流程', life: 3000 });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '提交失败', detail: this.getErrorMessage(error), life: 4000 });
        }
    }

    openApproveDialog() {
        this.approveForm = { comment: '' };
        this.approveDialogVisible = true;
    }

    async approveApproval() {
        const approval = this.currentApproval();
        if (!approval) return;

        try {
            await this.#contractStore.approveRecord(approval.id, approval.rowVersion, this.approveForm.comment || undefined);
            this.approveDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '审批完成', detail: '合同审核已通过，待业务确认生效', life: 3000 });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '审批失败', detail: this.getErrorMessage(error), life: 4000 });
        }
    }

    openRejectDialog() {
        this.rejectForm = { reason: '', comment: '' };
        this.rejectDialogVisible = true;
    }

    async rejectApproval() {
        const approval = this.currentApproval();
        if (!approval || !this.rejectForm.reason.trim()) return;

        try {
            await this.#contractStore.rejectRecord(approval.id, this.rejectForm.reason.trim(), approval.rowVersion, this.rejectForm.comment || undefined);
            this.rejectDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '已驳回', detail: '合同已退回草稿，待业务修订后重新提交', life: 3000 });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '驳回失败', detail: this.getErrorMessage(error), life: 4000 });
        }
    }

    openActivateDialog() {
        this.activateForm = { comment: '' };
        this.activateDialogVisible = true;
    }

    async activateContract() {
        const c = this.contract();
        if (!c) return;

        try {
            await this.#contractStore.activateContract(c.id, {
                comment: this.activateForm.comment || undefined,
                expectedVersion: c.rowVersion
            });
            this.activateDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '生效成功', detail: '合同已切换为正式生效状态', life: 3000 });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '生效失败', detail: this.getErrorMessage(error), life: 4000 });
        }
    }

    getStatusName(status: ContractStatus): string {
        const map: Record<ContractStatus, string> = {
            draft: '草稿',
            'pending-review': '待审核',
            active: '已生效',
            terminated: '已终止',
            completed: '已完成'
        };
        return map[status];
    }

    getStatusSeverity(status: ContractStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<ContractStatus, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            draft: 'secondary',
            'pending-review': 'warn',
            active: 'success',
            terminated: 'danger',
            completed: 'contrast'
        };
        return map[status];
    }

    getApprovalStatusName(status: string): string {
        const map: Record<string, string> = {
            pending: '审批中',
            approved: '已通过',
            rejected: '已驳回',
            canceled: '已取消',
            closed: '已关闭',
            draft: '草稿'
        };
        return map[status] ?? status;
    }

    getApprovalStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            draft: 'secondary',
            pending: 'warn',
            approved: 'success',
            rejected: 'danger',
            canceled: 'contrast',
            closed: 'contrast'
        };
        return map[status];
    }

    getErrorMessage(error: unknown): string {
        if (typeof error === 'object' && error !== null) {
            const candidate = error as {
                error?: { message?: string };
                message?: string;
            };
            if (candidate.error?.message) {
                return candidate.error.message;
            }
            if (candidate.message) {
                return candidate.message;
            }
        }

        return '请求未成功，请稍后重试';
    }
}
