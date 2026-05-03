import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttachmentTargetType, AuthStore, BusinessDiscussionTargetObjectType, CustomerAliasType, CustomerStatus, CustomerStore, UpdateCustomerRequestStatusEnum, type CustomerDetailView, type CustomerListView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { BusinessDiscussionPanel } from '../../shared/ui/business-discussion-panel';
import { SalesFollowUpPanel } from '../../shared/ui/sales-follow-up-panel';
import { SalesIntelligencePanel } from '../../shared/ui/sales-intelligence-panel';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';

interface CustomerFilterOption {
    label: string;
    value: string;
}

interface CustomerCreateForm {
    displayName: string;
    legalName: string;
    shortName: string;
    sourceChannel: string;
    remark: string;
}

interface CustomerEditForm extends CustomerCreateForm {
    status: EditableCustomerStatus;
}

interface CustomerAliasForm {
    aliasName: string;
    aliasType: CustomerAliasType;
}

interface FollowUpReminderEntry {
    followUpId: string;
    todoId: string | null;
}

type EditableCustomerStatus = CustomerStatus.Active | CustomerStatus.Inactive;

const ALL_FILTER_VALUE = 'all';

const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
    [CustomerStatus.Active]: '启用',
    [CustomerStatus.Inactive]: '停用',
    [CustomerStatus.Merged]: '已合并'
};

const CUSTOMER_STATUS_OPTIONS: CustomerFilterOption[] = [
    { label: '全部状态', value: ALL_FILTER_VALUE },
    { label: CUSTOMER_STATUS_LABELS[CustomerStatus.Active], value: CustomerStatus.Active },
    { label: CUSTOMER_STATUS_LABELS[CustomerStatus.Inactive], value: CustomerStatus.Inactive },
    { label: CUSTOMER_STATUS_LABELS[CustomerStatus.Merged], value: CustomerStatus.Merged }
];

const EDITABLE_STATUS_OPTIONS: CustomerFilterOption[] = [
    { label: CUSTOMER_STATUS_LABELS[CustomerStatus.Active], value: CustomerStatus.Active },
    { label: CUSTOMER_STATUS_LABELS[CustomerStatus.Inactive], value: CustomerStatus.Inactive }
];

const CUSTOMER_ALIAS_TYPE_OPTIONS = [
    { label: '通用别名', value: CustomerAliasType.Alias },
    { label: '法定名称', value: CustomerAliasType.LegalName },
    { label: '简称', value: CustomerAliasType.ShortName },
    { label: '历史输入', value: CustomerAliasType.LegacyInput },
    { label: '导入名称', value: CustomerAliasType.ImportName }
];

const EMPTY_CREATE_FORM: CustomerCreateForm = {
    displayName: '',
    legalName: '',
    shortName: '',
    sourceChannel: '',
    remark: ''
};

const EMPTY_EDIT_FORM: CustomerEditForm = {
    ...EMPTY_CREATE_FORM,
    status: CustomerStatus.Active
};

const EMPTY_ALIAS_FORM: CustomerAliasForm = {
    aliasName: '',
    aliasType: CustomerAliasType.Alias
};

@Component({
    selector: 'app-customer-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, TagModule, TextareaModule, AttachmentPanel, BusinessDiscussionPanel, SalesFollowUpPanel, SalesIntelligencePanel, WorkspaceFeedback],
    providers: [CustomerStore],
    template: `
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">客户主数据</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">客户管理</h1>
                        <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">客户身份作为线索和项目的统一入口，业务对象保留创建时名称快照。</p>
                    </div>

                    <p-button label="新建客户" icon="pi pi-plus" severity="primary" styleClass="w-full sm:w-auto rounded-md!" (onClick)="showCreateDialog()" />
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">全部客户</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ customers().length }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">启用客户</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ activeCustomerCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">停用客户</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ inactiveCustomerCount() }}</div>
                    </div>
                </div>
            </section>

            @if (pageError()) {
                <app-workspace-feedback severity="error" summary="客户暂时无法处理" [detail]="pageError()" />
            }

            <section class="overflow-hidden rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900">
                <p-table
                    #dt
                    [value]="visibleCustomers()"
                    [loading]="loading()"
                    [rowHover]="true"
                    [showGridlines]="true"
                    [paginator]="true"
                    [rows]="rows"
                    [first]="first"
                    dataKey="id"
                    sortMode="multiple"
                    responsiveLayout="scroll"
                    [globalFilterFields]="['customerNo', 'displayName', 'legalName', 'shortName', 'ownerName', 'ownerOrgName', 'status']"
                    [tableStyle]="{ width: '100%', 'min-width': '74rem' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 个客户"
                    [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #caption>
                        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div class="flex flex-col gap-3 md:flex-row md:items-center">
                                <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (click)="clearFilters(dt)"></button>

                                <p-iconfield class="w-full md:w-80">
                                    <p-inputicon class="pi pi-search" />
                                    <input pInputText [ngModel]="searchValue()" (ngModelChange)="searchValue.set($event)" (input)="onGlobalFilter(dt, $event)" placeholder="搜索客户、编号、主责" class="w-full! rounded-md! py-2!" />
                                </p-iconfield>

                                <p-select
                                    [ngModel]="statusFilter()"
                                    (ngModelChange)="setStatusFilter($event)"
                                    [options]="statusOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    ariaLabel="按状态筛选"
                                    styleClass="w-full md:w-40 rounded-md!"
                                />
                            </div>

                            <div class="text-sm text-surface-500 dark:text-surface-400">当前筛出 {{ visibleCustomers().length }} 个客户</div>
                        </div>
                    </ng-template>

                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="displayName" class="min-w-72">
                                <span class="flex items-center gap-2">客户 <p-sortIcon field="displayName" /></span>
                            </th>
                            <th pSortableColumn="status" class="min-w-32">
                                <span class="flex items-center gap-2">状态 <p-sortIcon field="status" /></span>
                            </th>
                            <th class="min-w-48">主责</th>
                            <th class="min-w-52">关联业务</th>
                            <th pSortableColumn="updatedAt" class="min-w-44">
                                <span class="flex items-center gap-2">最近更新 <p-sortIcon field="updatedAt" /></span>
                            </th>
                            <th class="min-w-48">操作</th>
                        </tr>
                    </ng-template>

                    <ng-template #body let-customer>
                        <tr>
                            <td>
                                <button type="button" class="max-w-80 text-left text-sm font-semibold leading-5 text-primary hover:underline" (click)="openDetail(customer)">
                                    {{ customer.displayName }}
                                </button>
                                <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ customer.customerNo }}</div>
                                <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ displayText(customer.legalName || customer.shortName, '未维护法定名称/简称') }}</div>
                            </td>
                            <td><p-tag [value]="statusLabel(customer.status)" [severity]="statusSeverity(customer.status)" styleClass="rounded-[6px]" /></td>
                            <td>
                                <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ displayText(customer.ownerName, '未指定') }}</div>
                                <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ displayText(customer.ownerOrgName, '未归属组织') }}</div>
                            </td>
                            <td>
                                <div class="flex flex-wrap gap-2">
                                    <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-200">线索 {{ customer.leadCount }}</span>
                                    <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-200">项目 {{ customer.projectCount }}</span>
                                    <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-200">合同 {{ customer.contractCount }}</span>
                                </div>
                            </td>
                            <td>{{ customer.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                            <td>
                                <div class="flex flex-wrap gap-2">
                                    <p-button label="详情" icon="pi pi-eye" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="openDetail(customer)" />
                                    <p-button label="编辑" icon="pi pi-pencil" size="small" severity="primary" [outlined]="true" styleClass="rounded-md!" (onClick)="showEditDialog(customer)" />
                                </div>
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="6" class="px-6 py-12 text-center text-surface-500 dark:text-surface-400">{{ loading() ? '正在读取客户列表' : '暂无匹配客户' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建客户" [style]="{ width: 'min(34rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetCreateDialog()">
                <ng-container *ngTemplateOutlet="customerForm; context: { form: createForm(), mode: 'create' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="createDialogVisible = false" />
                        <p-button label="创建客户" [loading]="saving()" [disabled]="!isCreateFormValid()" styleClass="rounded-md!" (onClick)="createCustomer()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑客户" [style]="{ width: 'min(34rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetEditDialog()">
                <ng-container *ngTemplateOutlet="customerForm; context: { form: editForm(), mode: 'edit' }" />
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" [loading]="saving()" [disabled]="!isEditFormValid()" styleClass="rounded-md!" (onClick)="updateCustomer()" />
                    </div>
                </ng-template>
            </p-dialog>

            <ng-template #customerForm let-form="form" let-mode="mode">
                <div class="flex flex-col gap-4 py-2">
                    @if (formError()) {
                        <app-workspace-feedback severity="error" summary="客户信息没有保存" [detail]="formError()" />
                    }

                    <div class="flex flex-col gap-2">
                        <label for="displayName" class="text-sm font-medium text-surface-900 dark:text-surface-0">显示名称</label>
                        <input pInputText id="displayName" [ngModel]="form.displayName" (ngModelChange)="updateFormField(mode, 'displayName', $event)" class="w-full rounded-md!" />
                        @if (formAttempted() && !form.displayName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写客户显示名称。</span>
                        }
                    </div>

                    @if (mode === 'edit') {
                        <div class="flex flex-col gap-2">
                            <label for="customerStatus" class="text-sm font-medium text-surface-900 dark:text-surface-0">状态</label>
                            <p-select
                                inputId="customerStatus"
                                [ngModel]="editForm().status"
                                (ngModelChange)="updateStatusField($event)"
                                [options]="editableStatusOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                styleClass="w-full rounded-md!"
                            />
                        </div>
                    }

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="legalName" class="text-sm font-medium text-surface-900 dark:text-surface-0">法定名称</label>
                            <input pInputText id="legalName" [ngModel]="form.legalName" (ngModelChange)="updateFormField(mode, 'legalName', $event)" class="w-full rounded-md!" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="shortName" class="text-sm font-medium text-surface-900 dark:text-surface-0">简称</label>
                            <input pInputText id="shortName" [ngModel]="form.shortName" (ngModelChange)="updateFormField(mode, 'shortName', $event)" class="w-full rounded-md!" />
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="sourceChannel" class="text-sm font-medium text-surface-900 dark:text-surface-0">来源渠道</label>
                        <input pInputText id="sourceChannel" [ngModel]="form.sourceChannel" (ngModelChange)="updateFormField(mode, 'sourceChannel', $event)" class="w-full rounded-md!" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="remark" class="text-sm font-medium text-surface-900 dark:text-surface-0">备注</label>
                        <textarea pTextarea id="remark" rows="4" [ngModel]="form.remark" (ngModelChange)="updateFormField(mode, 'remark', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                </div>
            </ng-template>

            <p-dialog [(visible)]="detailDialogVisible" [modal]="true" header="客户详情" [style]="{ width: 'min(44rem, 94vw)' }" (onHide)="clearDetail()">
                @if (loadingDetail()) {
                    <app-workspace-feedback severity="info" summary="正在读取客户详情" detail="请稍候。" />
                } @else if (selectedCustomer(); as customer) {
                    <div class="flex flex-col gap-4">
                        <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400">{{ customer.customerNo }}</div>
                                    <h2 class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ customer.displayName }}</h2>
                                    <p class="mt-1 text-sm text-surface-600 dark:text-surface-300">{{ displayText(customer.legalName || customer.shortName, '未维护法定名称/简称') }}</p>
                                </div>
                                <p-tag [value]="statusLabel(customer.status)" [severity]="statusSeverity(customer.status)" styleClass="rounded-[6px]" />
                            </div>
                        </div>

                        <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">线索</dt>
                                <dd class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ customer.leadCount }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">项目</dt>
                                <dd class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ customer.projectCount }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">合同</dt>
                                <dd class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ customer.contractCount }}</dd>
                            </div>
                        </dl>

                        <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                            <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h3 class="text-base font-semibold text-surface-950 dark:text-surface-0">客户别名</h3>
                                <div class="flex gap-2">
                                    <input pInputText [ngModel]="aliasForm().aliasName" (ngModelChange)="updateAliasName($event)" placeholder="新增别名" class="w-44 rounded-md!" />
                                    <p-select [ngModel]="aliasForm().aliasType" (ngModelChange)="updateAliasType($event)" [options]="aliasTypeOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-36 rounded-md!" />
                                    <p-button icon="pi pi-plus" label="添加" [loading]="saving()" [disabled]="!aliasForm().aliasName.trim()" styleClass="rounded-md!" (onClick)="createAlias(customer)" />
                                </div>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                @for (alias of aliases(); track alias.id) {
                                    <span class="rounded-[6px] border border-surface-200 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:text-surface-200">{{ alias.aliasName }}</span>
                                } @empty {
                                    <span class="text-sm text-surface-500 dark:text-surface-400">暂无别名</span>
                                }
                            </div>
                        </div>

                        @if (followUpReminderEntry()) {
                            <app-workspace-feedback severity="info" summary="从销售跟进待办进入" detail="请在下方客户销售跟进中登记本次处理结果，系统会据此关闭或刷新提醒。" />
                        }

                        <app-sales-intelligence-panel
                            [customerId]="customer.id"
                            [canWrite]="canWriteCustomerFollowUp()"
                            title="客户销售情报"
                            description="维护业务必要联系人，并作为线索和项目决策链的联系人来源。"
                        />

                        <app-business-discussion-panel
                            [customerId]="customer.id"
                            [targetObjectType]="customerDiscussionTargetType"
                            [targetObjectId]="customer.id"
                            [targetTitle]="customer.displayName"
                            [canWrite]="canWriteCustomerFollowUp()"
                            title="客户业务讨论"
                            description="沉淀客户长期信息、跨线索判断和协同结论。"
                        />

                        <app-sales-follow-up-panel
                            [customerId]="customer.id"
                            [canWrite]="canWriteCustomerFollowUp()"
                            title="客户销售跟进"
                            description="沉淀客户级沟通、长期采购信息、合作机会和下一步动作。"
                            createContextDetail="本次记录会挂到当前客户，用于跨线索和跨项目查看客户销售过程。"
                        />

                        <app-attachment-panel
                            [targetType]="customerAttachmentTargetType"
                            [targetId]="customer.id"
                            [canWrite]="canWriteCustomerAttachment()"
                            title="客户附件"
                            description="保存客户资质、开票资料、采购制度、框架协议和长期合作资料。"
                        />
                    </div>
                }
            </p-dialog>
        </div>
    `
})
export class CustomerList implements OnInit {
    readonly #customerStore = inject(CustomerStore);
    readonly #authStore = inject(AuthStore);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);

    readonly customers = this.#customerStore.customers;
    readonly selectedCustomer = this.#customerStore.selectedCustomer;
    readonly aliases = this.#customerStore.aliases;
    readonly loading = this.#customerStore.loading;
    readonly loadingDetail = this.#customerStore.loadingDetail;
    readonly saving = this.#customerStore.saving;
    readonly activeCustomerCount = this.#customerStore.activeCustomerCount;
    readonly inactiveCustomerCount = this.#customerStore.inactiveCustomerCount;

    readonly searchValue = signal('');
    readonly statusFilter = signal(ALL_FILTER_VALUE);
    readonly createForm = signal<CustomerCreateForm>({ ...EMPTY_CREATE_FORM });
    readonly editForm = signal<CustomerEditForm>({ ...EMPTY_EDIT_FORM });
    readonly aliasForm = signal<CustomerAliasForm>({ ...EMPTY_ALIAS_FORM });
    readonly formAttempted = signal(false);
    readonly formError = signal<string | null>(null);
    readonly pageError = signal<string | null>(null);
    readonly followUpReminderEntry = signal<FollowUpReminderEntry | null>(null);
    readonly queryOpenedCustomerId = signal<string | null>(null);

    readonly rows = 10;
    first = 0;
    createDialogVisible = false;
    editDialogVisible = false;
    detailDialogVisible = false;

    readonly statusOptions = CUSTOMER_STATUS_OPTIONS;
    readonly editableStatusOptions = EDITABLE_STATUS_OPTIONS;
    readonly aliasTypeOptions = CUSTOMER_ALIAS_TYPE_OPTIONS;
    readonly customerAttachmentTargetType = AttachmentTargetType.Customer;
    readonly customerDiscussionTargetType = BusinessDiscussionTargetObjectType.Customer;

    readonly visibleCustomers = computed(() => {
        const keyword = this.normalize(this.searchValue());
        const selectedStatus = this.statusFilter();

        return this.customers().filter((customer) => {
            if (selectedStatus !== ALL_FILTER_VALUE && customer.status !== selectedStatus) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            return this.customerSearchText(customer).includes(keyword);
        });
    });

    readonly isCreateFormValid = computed(() => Boolean(this.createForm().displayName.trim()));
    readonly isEditFormValid = computed(() => Boolean(this.editForm().displayName.trim()));
    readonly canWriteCustomerFollowUp = computed(() => this.#authStore.hasAnyPermission(['customer:write'] as const));
    readonly canWriteCustomerAttachment = computed(() => this.#authStore.hasAnyPermission(['customer:write'] as const));

    ngOnInit() {
        this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
            const customerId = params.get('customerId');
            const followUpId = params.get('followUpId');
            this.queryOpenedCustomerId.set(customerId);
            this.followUpReminderEntry.set(followUpId ? { followUpId, todoId: params.get('todoId') } : null);
            if (customerId) {
                void this.openDetailById(customerId);
            }
        });
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

    clearFilters(table: Table) {
        this.searchValue.set('');
        this.statusFilter.set(ALL_FILTER_VALUE);
        this.first = 0;
        table.clear();
    }

    setStatusFilter(value: string) {
        this.statusFilter.set(value);
        this.first = 0;
    }

    showCreateDialog() {
        this.createForm.set({ ...EMPTY_CREATE_FORM });
        this.formAttempted.set(false);
        this.formError.set(null);
        this.createDialogVisible = true;
    }

    showEditDialog(customer: CustomerListView | CustomerDetailView) {
        this.editForm.set({
            displayName: customer.displayName,
            legalName: customer.legalName ?? '',
            shortName: customer.shortName ?? '',
            sourceChannel: customer.sourceChannel ?? '',
            remark: customer.remark ?? '',
            status: customer.status === CustomerStatus.Inactive ? CustomerStatus.Inactive : CustomerStatus.Active
        });
        this.formAttempted.set(false);
        this.formError.set(null);
        this.editDialogVisible = true;
        if (!this.selectedCustomer() || this.selectedCustomer()?.id !== customer.id) {
            void this.#customerStore.loadCustomer(customer.id);
        }
    }

    resetCreateDialog() {
        this.formAttempted.set(false);
        this.formError.set(null);
    }

    resetEditDialog() {
        this.formAttempted.set(false);
        this.formError.set(null);
    }

    updateFormField(mode: 'create' | 'edit', field: keyof CustomerCreateForm, value: string) {
        if (mode === 'create') {
            this.createForm.update((form) => ({ ...form, [field]: value }));
        } else {
            this.editForm.update((form) => ({ ...form, [field]: value }));
        }
        this.formError.set(null);
    }

    updateStatusField(value: EditableCustomerStatus) {
        this.editForm.update((form) => ({ ...form, status: value }));
        this.formError.set(null);
    }

    async createCustomer() {
        this.formAttempted.set(true);
        if (!this.isCreateFormValid()) {
            return;
        }

        const form = this.createForm();
        try {
            await this.#customerStore.createCustomer({
                displayName: form.displayName.trim(),
                legalName: this.optionalText(form.legalName),
                shortName: this.optionalText(form.shortName),
                sourceChannel: this.optionalText(form.sourceChannel),
                remark: this.optionalText(form.remark)
            });
            this.createDialogVisible = false;
        } catch {
            this.formError.set('客户没有创建成功，请检查名称是否重复或稍后重试。');
        }
    }

    async updateCustomer() {
        this.formAttempted.set(true);
        if (!this.isEditFormValid()) {
            return;
        }

        const customer = this.selectedCustomer();
        if (!customer) {
            return;
        }

        const form = this.editForm();
        try {
            await this.#customerStore.updateCustomer(customer.id, {
                displayName: form.displayName.trim(),
                legalName: this.optionalText(form.legalName),
                shortName: this.optionalText(form.shortName),
                status: form.status === CustomerStatus.Active ? UpdateCustomerRequestStatusEnum.Active : UpdateCustomerRequestStatusEnum.Inactive,
                sourceChannel: this.optionalText(form.sourceChannel),
                remark: this.optionalText(form.remark)
            });
            this.editDialogVisible = false;
        } catch {
            this.formError.set('客户信息没有保存成功，请稍后重试。');
        }
    }

    async openDetail(customer: CustomerListView) {
        this.followUpReminderEntry.set(null);
        this.queryOpenedCustomerId.set(null);
        await this.openDetailById(customer.id);
    }

    async openDetailById(customerId: string) {
        this.detailDialogVisible = true;
        this.pageError.set(null);
        this.aliasForm.set({ ...EMPTY_ALIAS_FORM });
        try {
            await this.#customerStore.loadCustomer(customerId);
        } catch {
            this.pageError.set('客户详情没有读取成功，请稍后重试。');
        }
    }

    clearDetail() {
        this.#customerStore.clearSelectedCustomer();
        this.aliasForm.set({ ...EMPTY_ALIAS_FORM });
        this.clearFollowUpReminderQuery();
    }

    clearFollowUpReminderQuery() {
        if (!this.followUpReminderEntry() && !this.queryOpenedCustomerId()) {
            return;
        }

        this.followUpReminderEntry.set(null);
        this.queryOpenedCustomerId.set(null);
        void this.#router.navigate([], {
            relativeTo: this.#route,
            queryParams: {
                customerId: null,
                followUpId: null,
                todoId: null
            },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    updateAliasName(value: string) {
        this.aliasForm.update((form) => ({ ...form, aliasName: value }));
    }

    updateAliasType(value: CustomerAliasForm['aliasType']) {
        this.aliasForm.update((form) => ({ ...form, aliasType: value }));
    }

    async createAlias(customer: CustomerDetailView) {
        const form = this.aliasForm();
        if (!form.aliasName.trim()) {
            return;
        }

        try {
            await this.#customerStore.createAlias(customer.id, {
                aliasName: form.aliasName.trim(),
                aliasType: this.toAliasType(form.aliasType)
            });
            this.aliasForm.set({ ...EMPTY_ALIAS_FORM });
        } catch {
            this.pageError.set('客户别名没有添加成功，请检查是否重复。');
        }
    }

    statusLabel(status: CustomerStatus): string {
        return CUSTOMER_STATUS_LABELS[status] ?? status;
    }

    statusSeverity(status: CustomerStatus): 'success' | 'secondary' | 'warn' {
        if (status === CustomerStatus.Active) {
            return 'success';
        }
        if (status === CustomerStatus.Inactive) {
            return 'secondary';
        }
        return 'warn';
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    private customerSearchText(customer: CustomerListView): string {
        return this.normalize([customer.customerNo, customer.displayName, customer.legalName, customer.shortName, customer.ownerName, customer.ownerOrgName, this.statusLabel(customer.status)].join(' '));
    }

    private optionalText(value: string): string | null {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }

    private toAliasType(value: CustomerAliasForm['aliasType']): CustomerAliasType {
        return value;
    }
}
