import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerStore, UpdateCustomerRequestStatusEnum, type CustomerListView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';
import { AdminMetricGrid, type AdminMetricItem } from '../../shared/ui/admin-metric-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { CustomerFormDialog, EMPTY_CUSTOMER_FORM_VALUE, type CustomerFormValue } from './customer-form-dialog';
import { customerSearchText, customerStatusLabel, customerStatusSeverity, displayText, optionalText, toCustomerFormValue } from './customer-view-model';

@Component({
    selector: 'app-customer-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, ToolbarModule, AdminMetricGrid, WorkspaceFeedback, Tooltip, CustomerFormDialog],
    providers: [CustomerStore],
    template: `
        <div class="flex flex-col gap-5">
            <app-admin-metric-grid [items]="customerMetricItems()" [columns]="3" />

            @if (pageError()) {
                <app-workspace-feedback severity="error" summary="客户暂时无法处理" [detail]="pageError()" />
            }

            <div class="card">
                <p-toolbar class="p-component p-toolbar mb-4">
                    <ng-template #start>
                        <p-button icon="pi pi-plus" class="mr-2" severity="secondary" text ariaLabel="新建客户" pTooltip="新建客户" tooltipPosition="top" (onClick)="showCreateDialog()" />
                    </ng-template>

                    <ng-template #center>
                        <p-iconfield>
                            <p-inputicon>
                                <i class="pi pi-search"></i>
                            </p-inputicon>
                            <input pInputText [ngModel]="searchValue()" (ngModelChange)="searchValue.set($event)" (input)="onGlobalFilter(dt, $event)" placeholder="搜索客户、编号、主责" />
                        </p-iconfield>
                    </ng-template>

                    <ng-template #end>
                        <span class="text-sm text-surface-500 dark:text-surface-400">当前筛出 {{ visibleCustomers().length }} 个客户</span>
                    </ng-template>
                </p-toolbar>

                <p-table
                    #dt
                    [value]="visibleCustomers()"
                    [loading]="loading()"
                    [rowHover]="true"
                    [paginator]="true"
                    [rows]="rows"
                    [first]="first"
                    dataKey="id"
                    sortMode="multiple"
                    responsiveLayout="scroll"
                    [globalFilterFields]="['customerNo', 'displayName', 'legalName', 'shortName', 'ownerName', 'ownerOrgName', 'status']"
                    [tableStyle]="{ width: '100%', 'min-width': '64rem' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 个客户"
                    [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="displayName" class="w-[36%] min-w-72">
                                <span class="flex items-center gap-2">客户 <p-sortIcon field="displayName" /></span>
                            </th>
                            <th pSortableColumn="status" class="w-[24%] min-w-52">
                                <span class="flex items-center gap-2">状态/业务 <p-sortIcon field="status" /></span>
                            </th>
                            <th pSortableColumn="updatedAt" class="w-[24%] min-w-56">
                                <span class="flex items-center gap-2">责任/更新 <p-sortIcon field="updatedAt" /></span>
                            </th>
                            <th class="w-20 min-w-20">操作</th>
                        </tr>
                    </ng-template>

                    <ng-template #body let-customer>
                        <tr>
                            <td>
                                <button type="button" class="text-left text-sm font-semibold leading-5 text-primary hover:underline" (click)="openWorkspace(customer)">
                                    {{ customer.displayName }}
                                </button>
                                <div class="mt-2 flex flex-col gap-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                    <span>{{ customer.customerNo }}</span>
                                    <span class="text-surface-700 dark:text-surface-200">{{ displayText(customer.legalName || customer.shortName, '未维护法定名称/简称') }}</span>
                                </div>
                            </td>
                            <td>
                                <div class="mb-2">
                                    <p-tag [value]="statusLabel(customer.status)" [severity]="statusSeverity(customer.status)" class="rounded-[6px]" />
                                </div>
                                <div class="flex flex-wrap gap-1.5">
                                    <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-200">线索 {{ customer.leadCount }}</span>
                                    <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-200">项目 {{ customer.projectCount }}</span>
                                    <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-200">合同 {{ customer.contractCount }}</span>
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-col gap-1 text-sm leading-5">
                                    <span class="font-medium text-surface-900 dark:text-surface-0">{{ displayText(customer.ownerName, '未指定') }}</span>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ displayText(customer.ownerOrgName, '未归属组织') }}</span>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ customer.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-wrap justify-start gap-2">
                                    <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" ariaLabel="编辑客户" pTooltip="编辑客户" tooltipPosition="top" styleClass="rounded-md!" (onClick)="showEditDialog(customer)" />
                                </div>
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="4" class="px-6 py-12 text-center text-surface-500 dark:text-surface-400">{{ loading() ? '正在读取客户列表' : '暂无匹配客户' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <app-customer-form-dialog
                [visible]="createDialogVisible"
                mode="create"
                [initialValue]="createFormInitial()"
                [saving]="saving()"
                [error]="formError()"
                (visibleChange)="createDialogVisible = $event"
                (save)="createCustomer($event)"
            />

            <app-customer-form-dialog
                [visible]="editDialogVisible"
                mode="edit"
                [initialValue]="editFormInitial()"
                [saving]="saving()"
                [error]="formError()"
                (visibleChange)="editDialogVisible = $event"
                (save)="updateCustomer($event)"
            />
        </div>
    `
})
export class CustomerList implements OnInit {
    @ViewChild('dt') dt!: Table;

    readonly #customerStore = inject(CustomerStore);
    readonly #router = inject(Router);

    readonly customers = this.#customerStore.customers;
    readonly loading = this.#customerStore.loading;
    readonly saving = this.#customerStore.saving;
    readonly activeCustomerCount = this.#customerStore.activeCustomerCount;
    readonly inactiveCustomerCount = this.#customerStore.inactiveCustomerCount;

    readonly pageError = signal<string | null>(null);
    readonly formError = signal<string | null>(null);
    readonly searchValue = signal('');
    readonly createFormInitial = signal<CustomerFormValue>({ ...EMPTY_CUSTOMER_FORM_VALUE });
    readonly editFormInitial = signal<CustomerFormValue>({ ...EMPTY_CUSTOMER_FORM_VALUE });
    readonly editingCustomerId = signal<string | null>(null);

    readonly rows = 10;
    first = 0;
    createDialogVisible = false;
    editDialogVisible = false;

    readonly customerMetricItems = computed<AdminMetricItem[]>(() => [
        { label: '全部客户', value: this.customers().length },
        { label: '启用客户', value: this.activeCustomerCount() },
        { label: '停用客户', value: this.inactiveCustomerCount() }
    ]);

    readonly visibleCustomers = computed(() => {
        const keyword = this.searchValue().trim().toLowerCase();
        if (!keyword) {
            return this.customers();
        }

        return this.customers().filter((customer) => customerSearchText(customer).includes(keyword));
    });

    ngOnInit() {
        void this.loadCustomers();
    }

    async loadCustomers() {
        this.pageError.set(null);
        try {
            await this.#customerStore.loadCustomers();
        } catch {
            this.pageError.set('客户列表没有读取成功，请稍后重试。');
        }
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
        this.first = 0;
    }

    showCreateDialog() {
        this.formError.set(null);
        this.createFormInitial.set({ ...EMPTY_CUSTOMER_FORM_VALUE });
        this.createDialogVisible = true;
    }

    showEditDialog(customer: CustomerListView) {
        this.formError.set(null);
        this.editingCustomerId.set(customer.id);
        this.editFormInitial.set(toCustomerFormValue(customer));
        this.editDialogVisible = true;
        void this.#customerStore
            .loadCustomer(customer.id)
            .then((detail) => {
                if (this.editingCustomerId() === detail.id) {
                    this.editFormInitial.set(toCustomerFormValue(detail));
                }
            })
            .catch(() => {
                this.pageError.set('客户详情没有读取成功，请稍后重试。');
            });
    }

    openWorkspace(customer: CustomerListView) {
        void this.#router.navigate(['/customers', customer.id]);
    }

    async createCustomer(form: CustomerFormValue) {
        try {
            const customer = await this.#customerStore.createCustomer({
                displayName: form.displayName.trim(),
                legalName: optionalText(form.legalName),
                shortName: optionalText(form.shortName),
                sourceChannel: optionalText(form.sourceChannel),
                remark: optionalText(form.remark)
            });
            this.createDialogVisible = false;
            void this.#router.navigate(['/customers', customer.id]);
        } catch {
            this.formError.set('请检查名称是否重复或稍后重试。');
        }
    }

    async updateCustomer(form: CustomerFormValue) {
        const customerId = this.editingCustomerId();
        if (!customerId) {
            return;
        }

        try {
            await this.#customerStore.updateCustomer(customerId, {
                displayName: form.displayName.trim(),
                legalName: optionalText(form.legalName),
                shortName: optionalText(form.shortName),
                status: form.status === EMPTY_CUSTOMER_FORM_VALUE.status ? UpdateCustomerRequestStatusEnum.Active : UpdateCustomerRequestStatusEnum.Inactive,
                sourceChannel: optionalText(form.sourceChannel),
                remark: optionalText(form.remark)
            });
            this.editDialogVisible = false;
            this.editingCustomerId.set(null);
        } catch {
            this.formError.set('请稍后重试。');
        }
    }

    statusLabel = customerStatusLabel;
    statusSeverity = customerStatusSeverity;
    displayText = displayText;
}
