import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthStore, CommissionStore } from '@poms/admin-data-access';
import { CommissionLowDownPaymentDecision, type CommissionLowDownPaymentContractContext } from '@poms/shared-api-client';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { formatSensitiveAmountProjection, sensitiveProjectionDisplayText } from '../../shared/ui/sensitive-visibility';

@Component({
    selector: 'app-project-commission-low-down-payment',
    imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TextareaModule, ToastModule, SectionCard, WorkspaceFeedback, WorkspaceLoading],
    providers: [CommissionStore, MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<p-toast />
            <section-card data-testid="low-down-payment-management">
                <ng-template #title>低首付款管理层批准</ng-template>
                <p-button label="刷新批准材料" icon="pi pi-refresh" [text]="true" (onClick)="loadManagementReleases()" />
                <ng-template #description>提成池按各合同不含税金额占比分摊。管理层确认特例条件后，发放仍须提交财务审批。</ng-template>
                <div class="mt-4 flex flex-col gap-4">
                    @if (commissionStore.loadingLowDownPayment()) {
                        <app-workspace-loading label="正在读取实际回款与批准材料" />
                    } @else if (managementError()) {
                        <app-workspace-feedback severity="error" summary="批准材料读取失败" [detail]="managementError()">
                            <p-button label="重新读取" [text]="true" (onClick)="loadManagementReleases()" />
                        </app-workspace-feedback>
                    } @else if (commissionStore.lowDownPaymentView(); as view) {
                        @if (view.currentContext; as context) {
                            <p class="text-sm text-surface-600 dark:text-surface-300">当前采用{{ context.receiptJudgmentMode === 'contract-separate' ? '各合同分别判断回款' : '项目累计回款' }}；以下到账金额均为已确认的不含税金额。</p>
                            @if (canApproveLowDownPayment()) {
                                <label for="low-down-decision" class="font-medium">本次批准事项</label>
                                <p-select inputId="low-down-decision" [options]="managementDecisionOptions" [(ngModel)]="managementForm.decision" (ngModelChange)="resetManagementSelection()" optionLabel="label" optionValue="value" class="w-full md:w-96" />
                            }
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-sm">
                                    <thead><tr><th scope="col" class="p-2">合同</th><th scope="col" class="p-2">不含税金额</th><th scope="col" class="p-2">已确认回款</th><th scope="col" class="p-2">批准条件</th></tr></thead>
                                    <tbody>
                                        @for (contract of context.contracts; track contract.contractId) {
                                            <tr>
                                                <td class="p-2"><label class="flex items-center gap-2"><input type="checkbox" [checked]="managementForm.contractIds.includes(contract.contractId)" [disabled]="!managementContractSelectable(contract) || commissionStore.saving()" (change)="toggleManagementContract(contract.contractId, $event)" />{{ contract.contractNo }}</label></td>
                                                <td class="p-2">{{ formatSensitiveAmountProjection(contract.amountTaxExclusiveProjection) }}</td>
                                                <td class="p-2">{{ formatSensitiveAmountProjection(contract.confirmedReceiptsTaxExclusiveProjection) }}</td>
                                                <td class="p-2">{{ !contract.lowDownPayment ? '适用常规制度' : contract.availableDecisions.includes(managementForm.decision) ? '已达到本次回款门槛' : '当前不可批准或已有适用批准' }}</td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                            @if (canApproveLowDownPayment()) {
                                <p class="text-sm text-surface-600 dark:text-surface-300">累计回款达到20%后可确认中档和上限档15%的特例上限，基础档仍为10%；达到50%后可解除低首付款限制。请同时核实公司要求的实际业务条件。</p>
                                <label for="low-down-reason" class="font-medium">批准依据</label>
                                <textarea pTextarea id="low-down-reason" [(ngModel)]="managementForm.reason" [maxlength]="2000" rows="3" placeholder="说明本次已核实的业务条件和批准依据"></textarea>
                                <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="managementForm.conditionsConfirmed" />已核实所选合同及本次业务条件，确认批准</label>
                                <p-button label="确认管理层批准" icon="pi pi-check" [loading]="commissionStore.saving()" [disabled]="!managementForm.contractIds.length || !managementForm.reason.trim() || !managementForm.conditionsConfirmed" (onClick)="approveManagementRelease()" />
                            }
                        } @else {
                            <app-workspace-feedback severity="warn" summary="暂不能办理管理层批准" [detail]="view.blockingReason ?? '请先完善当前冻结合同和回款依据。'" />
                        }
                        @if (view.records.length) {
                            <div class="flex flex-col gap-3" aria-label="管理层批准记录">
                                @for (record of view.records; track record.id) {
                                    <div class="rounded-md border border-surface-200 p-3 dark:border-surface-700">
                                        <div class="font-medium">{{ record.decision === 'release-standard' ? '解除低首付款限制' : '确认15%特例上限' }} · {{ record.approvedAt | date:'yyyy-MM-dd HH:mm' }} · {{ record.currentApplicable ? '当前适用' : '历史记录，当前不适用' }}</div>
                                        <p class="mt-1 text-sm">{{ sensitiveProjectionDisplayText(record.reasonProjection) }}</p>
                                    </div>
                                }
                            </div>
                        } @else { <p class="text-sm text-surface-500">暂无管理层批准记录。</p> }
                    }
                </div>
            </section-card>

`
})
export class ProjectCommissionLowDownPayment implements OnDestroy {
    readonly #route = inject(ActivatedRoute);
    readonly #authStore = inject(AuthStore);
    readonly #messageService = inject(MessageService);
    readonly commissionStore = inject(CommissionStore);
    readonly #params = toSignal((this.#route.parent ?? this.#route).paramMap, { initialValue: (this.#route.parent ?? this.#route).snapshot.paramMap });
    readonly currentProjectId = computed(() => this.#params().get('id') ?? '');
    readonly formatSensitiveAmountProjection = formatSensitiveAmountProjection;
    readonly sensitiveProjectionDisplayText = sensitiveProjectionDisplayText;
    readonly canApproveLowDownPayment = computed(() => this.#authStore.hasAnyPermission(['commission:low-down-payment:approve']));
    readonly managementError = signal<string | null>(null);
    readonly managementDecisionOptions = [
        { label: '确认15%特例上限（回款至少20%）', value: CommissionLowDownPaymentDecision.RaiseFirstCap },
        { label: '解除低首付款限制（回款至少50%）', value: CommissionLowDownPaymentDecision.ReleaseStandard }
    ];
    managementForm = { decision: CommissionLowDownPaymentDecision.RaiseFirstCap, contractIds: [] as string[], reason: '', conditionsConfirmed: false };


    constructor() {
        effect(() => {
            this.currentProjectId();
            untracked(() => { void this.loadManagementReleases(); });
        });
    }
    ngOnDestroy() { this.commissionStore.clear(); }
    resetManagementSelection() {
        this.managementForm.contractIds = [];
        this.managementForm.conditionsConfirmed = false;
    }

    managementContractSelectable(contract: CommissionLowDownPaymentContractContext) {
        return this.canApproveLowDownPayment() && contract.availableDecisions.includes(this.managementForm.decision);
    }

    toggleManagementContract(id: string, event: Event) {
        const selected = new Set(this.managementForm.contractIds);
        if ((event.target as HTMLInputElement).checked) selected.add(id);
        else selected.delete(id);
        this.managementForm.contractIds = [...selected];
        this.managementForm.conditionsConfirmed = false;
    }

    async loadManagementReleases() {
        const id = this.currentProjectId();
        if (!id) return;
        this.resetManagementSelection();
        this.managementError.set(null);
        try {
            await this.commissionStore.loadLowDownPaymentReleases(id);
        } catch (error) {
            if (id === this.currentProjectId()) this.managementError.set(this.getErrorMessage(error));
        }
    }

    async approveManagementRelease() {
        const id = this.currentProjectId();
        const context = this.commissionStore.lowDownPaymentView()?.currentContext;
        if (!id || !context || !this.canApproveLowDownPayment() || this.commissionStore.saving() || !this.managementForm.conditionsConfirmed || !this.managementForm.reason.trim() || !this.managementForm.contractIds.length) return;
        if (this.managementForm.contractIds.some(contractId => !context.contracts.some(contract => contract.contractId === contractId && this.managementContractSelectable(contract)))) return;
        try {
            await this.commissionStore.approveLowDownPaymentRelease(id, {
                freezeVersionId: context.freezeVersionId,
                expectedFreezeVersion: context.expectedFreezeVersion,
                contractIds: [...this.managementForm.contractIds],
                decision: this.managementForm.decision,
                conditionsConfirmed: true,
                reason: this.managementForm.reason.trim()
            });
            if (id !== this.currentProjectId()) return;
            this.managementForm.reason = '';
            this.#messageService.add({ severity: 'success', summary: '管理层批准已记录', detail: '后续发放请继续提交财务审批。' });
            await this.loadManagementReleases();
        } catch (error) {
            this.managementForm.conditionsConfirmed = false;
            this.#messageService.add({ severity: 'error', summary: '批准未完成', detail: this.getErrorMessage(error) });
        }
    }


    getErrorMessage(error: unknown) {
        if (typeof error === 'object' && error !== null) {
            const candidate = error as { error?: { message?: string }; message?: string };
            if (candidate.error?.message) return candidate.error.message;
            if (candidate.message) return candidate.message;
        }
        return '请求未成功，请核实后重新提交';
    }
}
