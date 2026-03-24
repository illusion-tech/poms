import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractStore, type ContractSummary } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-contract-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, DialogModule, SelectModule, MenuModule],
    providers: [ContractStore],
    template: `
        <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 class="text-surface-950 dark:text-surface-0 text-lg font-medium leading-7">合同管理</h1>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <p-iconfield class="w-full sm:w-[217px]">
                        <p-inputicon class="pi pi-search" />
                        <input pInputText [(ngModel)]="searchValue" (input)="onGlobalFilter(dt, $event)" placeholder="搜索合同" class="w-full! py-2! rounded-xl!" />
                    </p-iconfield>

                    <p-button icon="pi pi-plus" label="新建合同" severity="primary" [rounded]="true" class="w-full sm:w-auto cursor-pointer" (onClick)="showCreateDialog()" />
                </div>
            </div>

            <!-- Table -->
            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="contracts()"
                    [loading]="loading()"
                    [paginator]="true"
                    [rows]="rows"
                    [first]="first"
                    sortMode="multiple"
                    [tableStyle]="{ width: '100%' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last} 共 {totalRecords} 条"
                    [globalFilterFields]="['contractNo', 'status', 'currencyCode']"
                    class="bg-surface-0 dark:bg-surface-800 overflow-hidden"
                    [pt]="{ pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="contractNo" class="flex-1">
                                <span class="flex items-center gap-2">合同编号 <p-sortIcon field="contractNo" /></span>
                            </th>
                            <th pSortableColumn="signedAmount" class="flex-1">
                                <span class="flex items-center gap-2">签约金额 <p-sortIcon field="signedAmount" /></span>
                            </th>
                            <th pSortableColumn="currencyCode" class="flex-1">
                                <span class="flex items-center gap-2">币种 <p-sortIcon field="currencyCode" /></span>
                            </th>
                            <th pSortableColumn="status" class="flex-1">
                                <span class="flex items-center gap-2">状态 <p-sortIcon field="status" /></span>
                            </th>
                            <th pSortableColumn="signedAt" class="flex-1">
                                <span class="flex items-center gap-2">签约日期 <p-sortIcon field="signedAt" /></span>
                            </th>
                            <th pSortableColumn="createdAt" class="flex-1">
                                <span class="flex items-center gap-2">创建时间 <p-sortIcon field="createdAt" /></span>
                            </th>
                            <th style="width: 6rem">操作</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-contract>
                        <tr>
                            <td>
                                <span class="text-primary font-medium cursor-pointer hover:underline" (click)="navigateToDetail(contract)">{{ contract.contractNo }}</span>
                            </td>
                            <td>
                                <span class="text-surface-950 dark:text-surface-0 text-sm font-medium leading-tight">{{ contract.signedAmount | number: '1.2-2' }}</span>
                            </td>
                            <td>
                                <span class="text-surface-500 dark:text-surface-400 text-sm font-normal leading-tight">{{ contract.currencyCode }}</span>
                            </td>
                            <td>
                                <p-tag [value]="getStatusName(contract.status)" [severity]="getStatusSeverity(contract.status)" class="px-2 py-1 rounded-[6px]" />
                            </td>
                            <td>
                                <span class="text-surface-500 dark:text-surface-400 text-sm font-normal leading-tight">{{ contract.signedAt ? (contract.signedAt | date: 'yyyy-MM-dd') : '-' }}</span>
                            </td>
                            <td>
                                <span class="text-surface-500 dark:text-surface-400 text-sm font-normal leading-tight">{{ contract.createdAt | date: 'yyyy-MM-dd' }}</span>
                            </td>
                            <td>
                                <div class="flex items-center gap-1">
                                    <p-button (onClick)="toggleMenu($event, contract)" [rounded]="true" [text]="true" icon="pi pi-ellipsis-h" size="small" severity="secondary" class="cursor-pointer" />
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="7" class="text-center py-8">
                                <i class="pi pi-inbox text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                                <span class="text-surface-500 dark:text-surface-400">暂无合同数据</span>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
                <p-menu #actionMenu [model]="menuItems()" [popup]="true" styleClass="w-48!" appendTo="body" />
            </div>

            <!-- Create Contract Dialog -->
            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建合同" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label for="projectId" class="text-surface-900 dark:text-surface-0 font-medium">关联项目 ID</label>
                        <input pInputText id="projectId" [(ngModel)]="createForm.projectId" class="w-full" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="contractNo" class="text-surface-900 dark:text-surface-0 font-medium">合同编号</label>
                        <input pInputText id="contractNo" [(ngModel)]="createForm.contractNo" class="w-full" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="signedAmount" class="text-surface-900 dark:text-surface-0 font-medium">签约金额</label>
                        <input pInputText id="signedAmount" [(ngModel)]="createForm.signedAmount" class="w-full" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="currencyCode" class="text-surface-900 dark:text-surface-0 font-medium">币种</label>
                        <p-select id="currencyCode" [(ngModel)]="createForm.currencyCode" [options]="currencyOptions" optionLabel="label" optionValue="value" placeholder="选择币种" class="w-full" appendTo="body" />
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" (onClick)="createContract()" [loading]="creating()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class ContractList implements OnInit {
    @ViewChild('dt') dt!: Table;
    @ViewChild('actionMenu') actionMenu!: Menu;

    readonly #contractStore = inject(ContractStore);
    readonly #router = inject(Router);

    readonly contracts = this.#contractStore.contracts;
    readonly loading = this.#contractStore.loading;
    readonly creating = this.#contractStore.saving;

    searchValue = '';
    first = 0;
    rows = 10;
    selectedContract = signal<ContractSummary | null>(null);

    createDialogVisible = false;
    createForm = { projectId: '', contractNo: '', signedAmount: '0', currencyCode: 'CNY' };

    currencyOptions = [
        { label: '人民币 (CNY)', value: 'CNY' },
        { label: '美元 (USD)', value: 'USD' },
        { label: '欧元 (EUR)', value: 'EUR' }
    ];

    menuItems = computed(() => {
        const contract = this.selectedContract();
        if (!contract) return [];
        return [
            {
                label: '查看详情',
                icon: 'pi pi-eye',
                command: () => this.navigateToDetail(contract)
            },
            {
                label: '编辑',
                icon: 'pi pi-pencil',
                command: () => this.navigateToDetail(contract)
            }
        ];
    });

    ngOnInit() {
        void this.#contractStore.loadContracts();
    }

    toggleMenu(event: Event, contract: ContractSummary) {
        this.selectedContract.set(contract);
        this.actionMenu.toggle(event);
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToDetail(contract: ContractSummary) {
        this.#router.navigate(['/contracts', contract.id]);
    }

    showCreateDialog() {
        this.createForm = { projectId: '', contractNo: '', signedAmount: '0', currencyCode: 'CNY' };
        this.createDialogVisible = true;
    }

    async createContract() {
        if (!this.createForm.projectId || !this.createForm.contractNo) return;

        try {
            await this.#contractStore.createContract(this.createForm);
            this.createDialogVisible = false;
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
