import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';

@Component({
    selector: 'app-contract-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, TagModule, ButtonModule, InputTextModule, SelectModule, DialogModule],
    providers: [ContractStore],
    template: `
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
                            <span class="text-sm text-surface-500 dark:text-surface-400">ID: {{ contract()!.id }}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <p-tag [value]="getStatusName(contract()!.status)" [severity]="getStatusSeverity(contract()!.status)" />
                        <p-button label="编辑" icon="pi pi-pencil" severity="primary" [rounded]="true" (onClick)="showEditDialog()" class="cursor-pointer" />
                    </div>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <!-- Basic Info -->
                    <section-card>
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
                                <span class="text-xs text-surface-500 dark:text-surface-400">签约日期</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.signedAt ? (contract()!.signedAt | date: 'yyyy-MM-dd') : '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">币种</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ contract()!.currencyCode }}</span>
                            </div>
                        </div>
                    </section-card>

                    <!-- Audit Info -->
                    <section-card>
                        <ng-template #title>审计追踪</ng-template>
                        <div class="grid grid-cols-2 gap-4 mt-4">
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

    readonly contract = this.#contractStore.selectedContract;
    readonly loading = this.#contractStore.loading;
    readonly saving = this.#contractStore.saving;
    editDialogVisible = false;
    editForm = { signedAmount: '', currencyCode: '' };

    currencyOptions = [
        { label: '人民币 (CNY)', value: 'CNY' },
        { label: '美元 (USD)', value: 'USD' },
        { label: '欧元 (EUR)', value: 'EUR' }
    ];

    ngOnInit() {
        const id = this.#route.snapshot.paramMap.get('id');
        if (id) {
            void this.#contractStore.loadContract(id);
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
        } catch {
            return;
        }
    }

    getStatusName(status: string): string {
        const map: Record<string, string> = {
            draft: '草稿',
            pending_review: '待审核',
            active: '已生效',
            terminated: '已终止',
            completed: '已完成'
        };
        return map[status] ?? status;
    }

    getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            draft: 'secondary',
            pending_review: 'warn',
            active: 'success',
            terminated: 'danger',
            completed: 'contrast'
        };
        return map[status];
    }
}
