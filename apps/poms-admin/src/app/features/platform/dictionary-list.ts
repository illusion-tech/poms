import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    ActiveInactiveStatus,
    DictionaryDomain,
    DictionaryStore,
    type DictionaryItemSummary
} from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

type DictionaryFilterValue = DictionaryDomain | 'all';
type StatusFilterValue = ActiveInactiveStatus | 'all';

interface DictionaryOption<T extends string> {
    label: string;
    value: T;
}

interface DictionaryCreateForm {
    domain: DictionaryDomain;
    code: string;
    name: string;
    description: string;
    sortOrder: number;
}

interface DictionaryEditForm {
    id: string;
    domain: DictionaryDomain;
    code: string;
    name: string;
    description: string;
    status: ActiveInactiveStatus;
    sortOrder: number;
    expectedVersion: number;
}

const ALL_FILTER_VALUE = 'all';
const DEFAULT_SORT_ORDER = 100;
const DICTIONARY_CODE_PATTERN = /^[a-z][a-z0-9-]*$/;

const DICTIONARY_DOMAIN_LABELS: Record<DictionaryDomain, string> = {
    [DictionaryDomain.AttachmentCategory]: '附件分类',
    [DictionaryDomain.SalesFollowUpType]: '销售跟进方式',
    [DictionaryDomain.ExpenseCategory]: '费用分类'
};

const DICTIONARY_DOMAIN_OPTIONS: DictionaryOption<DictionaryDomain>[] = (Object.values(DictionaryDomain) as DictionaryDomain[]).map((domain) => ({
    label: DICTIONARY_DOMAIN_LABELS[domain],
    value: domain
}));

const DICTIONARY_FILTER_OPTIONS: DictionaryOption<DictionaryFilterValue>[] = [
    { label: '全部字典域', value: ALL_FILTER_VALUE },
    ...DICTIONARY_DOMAIN_OPTIONS
];

const DICTIONARY_STATUS_LABELS: Record<ActiveInactiveStatus, string> = {
    [ActiveInactiveStatus.Active]: '启用',
    [ActiveInactiveStatus.Inactive]: '停用'
};

const DICTIONARY_STATUS_OPTIONS: DictionaryOption<ActiveInactiveStatus>[] = [
    { label: DICTIONARY_STATUS_LABELS[ActiveInactiveStatus.Active], value: ActiveInactiveStatus.Active },
    { label: DICTIONARY_STATUS_LABELS[ActiveInactiveStatus.Inactive], value: ActiveInactiveStatus.Inactive }
];

const STATUS_FILTER_OPTIONS: DictionaryOption<StatusFilterValue>[] = [
    { label: '全部状态', value: ALL_FILTER_VALUE },
    ...DICTIONARY_STATUS_OPTIONS
];

const EMPTY_CREATE_FORM: DictionaryCreateForm = {
    domain: DictionaryDomain.AttachmentCategory,
    code: '',
    name: '',
    description: '',
    sortOrder: DEFAULT_SORT_ORDER
};

const EMPTY_EDIT_FORM: DictionaryEditForm = {
    id: '',
    domain: DictionaryDomain.AttachmentCategory,
    code: '',
    name: '',
    description: '',
    status: ActiveInactiveStatus.Active,
    sortOrder: DEFAULT_SORT_ORDER,
    expectedVersion: 0
};

@Component({
    selector: 'app-dictionary-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        SelectModule,
        TagModule,
        TextareaModule,
        ToastModule
    ],
    providers: [DictionaryStore, MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">平台配置</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">业务字典</h1>
                        <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">维护附件分类、销售跟进方式和费用分类等可运营选项。停用后历史记录仍可读取，新写入不可继续使用。</p>
                    </div>

                    <p-button label="新增字典项" icon="pi pi-plus" severity="primary" styleClass="w-full sm:w-auto rounded-md!" (onClick)="showCreateDialog()" />
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">当前结果</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ items().length }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">启用项</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-emerald-700 dark:text-emerald-300">{{ activeCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">停用项</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-amber-700 dark:text-amber-300">{{ inactiveCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">系统项</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ systemCount() }}</div>
                    </div>
                </div>
            </section>

            @if (pageError()) {
                <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ pageError() }}</div>
            }

            <section class="overflow-hidden rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900">
                <p-table
                    [value]="items()"
                    [loading]="store.loading()"
                    [rowHover]="true"
                    [showGridlines]="true"
                    [paginator]="true"
                    [rows]="10"
                    dataKey="id"
                    responsiveLayout="scroll"
                    [tableStyle]="{ width: '100%', 'min-width': '82rem' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 个字典项"
                    [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #caption>
                        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div class="flex flex-col gap-3 md:flex-row md:items-center">
                                <p-select
                                    [ngModel]="domainFilter()"
                                    (ngModelChange)="setDomainFilter($event)"
                                    [options]="domainFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    ariaLabel="按字典域筛选"
                                    styleClass="w-full md:w-48 rounded-md!"
                                />

                                <p-select
                                    [ngModel]="statusFilter()"
                                    (ngModelChange)="setStatusFilter($event)"
                                    [options]="statusFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    ariaLabel="按状态筛选"
                                    styleClass="w-full md:w-36 rounded-md!"
                                />

                                <p-iconfield class="w-full md:w-80">
                                    <p-inputicon class="pi pi-search" />
                                    <input pInputText [ngModel]="keyword()" (ngModelChange)="keyword.set($event)" (keydown.enter)="reload()" placeholder="搜索 code、名称或说明" class="w-full! rounded-md! py-2!" />
                                </p-iconfield>

                                <p-button label="查询" icon="pi pi-search" severity="primary" [outlined]="true" styleClass="rounded-md!" (onClick)="reload()" />
                                <p-button label="重置" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="resetFilters()" />
                            </div>

                            <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                        </div>
                    </ng-template>

                    <ng-template #header>
                        <tr>
                            <th class="min-w-56">字典域</th>
                            <th class="min-w-48">Code</th>
                            <th class="min-w-56">名称</th>
                            <th class="min-w-64">说明</th>
                            <th class="min-w-32">状态</th>
                            <th class="min-w-28">排序</th>
                            <th class="min-w-28">引用</th>
                            <th class="min-w-28">版本</th>
                            <th class="min-w-44">操作</th>
                        </tr>
                    </ng-template>

                    <ng-template #body let-item>
                        <tr>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ domainLabel(item.domain) }}</span>
                                    <span class="text-xs font-mono text-surface-500">{{ item.domain }}</span>
                                </div>
                            </td>
                            <td>
                                <span class="text-xs font-mono text-surface-700 dark:text-surface-200">{{ item.code }}</span>
                            </td>
                            <td>
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ item.name }}</span>
                                    @if (item.isSystem) {
                                        <p-tag value="系统项" severity="contrast" styleClass="rounded-[6px]" />
                                    }
                                </div>
                            </td>
                            <td>
                                <span class="text-sm text-surface-600 dark:text-surface-300">{{ item.description || '—' }}</span>
                            </td>
                            <td>
                                <p-tag [value]="statusLabel(item.status)" [severity]="statusSeverity(item.status)" styleClass="rounded-[6px]" />
                            </td>
                            <td>{{ item.sortOrder }}</td>
                            <td>
                                <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-200">{{ item.usageCount }} 条</span>
                            </td>
                            <td>
                                <span class="text-xs font-mono text-surface-600 dark:text-surface-300">v{{ item.rowVersion }}</span>
                            </td>
                            <td>
                                <div class="flex flex-wrap gap-2">
                                    <p-button icon="pi pi-pencil" label="编辑" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showEditDialog(item)" />
                                    <p-button
                                        [icon]="item.status === ActiveInactiveStatus.Active ? 'pi pi-ban' : 'pi pi-check-circle'"
                                        [label]="item.status === ActiveInactiveStatus.Active ? '停用' : '启用'"
                                        size="small"
                                        [severity]="item.status === ActiveInactiveStatus.Active ? 'warn' : 'success'"
                                        [outlined]="true"
                                        styleClass="rounded-md!"
                                        [disabled]="store.saving()"
                                        (onClick)="toggleStatus(item)"
                                    />
                                </div>
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="9" class="px-6 py-12 text-center text-surface-500 dark:text-surface-400">{{ store.loading() ? '正在读取业务字典' : '暂无匹配字典项' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新增字典项" [style]="{ width: 'min(34rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetCreateDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (formError()) {
                        <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ formError() }}</div>
                    }

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryCreateDomain" class="text-sm font-medium text-surface-900 dark:text-surface-0">字典域 *</label>
                        <p-select inputId="dictionaryCreateDomain" [ngModel]="createForm().domain" (ngModelChange)="updateCreateDomain($event)" [options]="domainOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full rounded-md!" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryCreateCode" class="text-sm font-medium text-surface-900 dark:text-surface-0">Code *</label>
                        <input pInputText id="dictionaryCreateCode" [ngModel]="createForm().code" (ngModelChange)="updateCreateText('code', $event)" placeholder="如 customer-visit" class="w-full rounded-md!" />
                        <span class="text-xs text-surface-500 dark:text-surface-400">仅允许小写字母、数字和连字符，且必须以字母开头。</span>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryCreateName" class="text-sm font-medium text-surface-900 dark:text-surface-0">名称 *</label>
                        <input pInputText id="dictionaryCreateName" [ngModel]="createForm().name" (ngModelChange)="updateCreateText('name', $event)" class="w-full rounded-md!" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryCreateDescription" class="text-sm font-medium text-surface-900 dark:text-surface-0">说明</label>
                        <textarea pTextarea id="dictionaryCreateDescription" rows="3" [ngModel]="createForm().description" (ngModelChange)="updateCreateText('description', $event)" class="w-full rounded-md!"></textarea>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryCreateSortOrder" class="text-sm font-medium text-surface-900 dark:text-surface-0">排序</label>
                        <input pInputText id="dictionaryCreateSortOrder" type="number" [ngModel]="createForm().sortOrder" (ngModelChange)="updateCreateSortOrder($event)" class="w-full rounded-md!" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="store.saving()" [disabled]="!canCreate()" styleClass="rounded-md!" (onClick)="createItem()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑字典项" [style]="{ width: 'min(34rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetEditDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (formError()) {
                        <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ formError() }}</div>
                    }

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">字典域</div>
                            <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ domainLabel(editForm().domain) }}</div>
                        </div>
                        <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">Code</div>
                            <div class="mt-1 text-sm font-mono text-surface-950 dark:text-surface-0">{{ editForm().code }}</div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryEditName" class="text-sm font-medium text-surface-900 dark:text-surface-0">名称 *</label>
                        <input pInputText id="dictionaryEditName" [ngModel]="editForm().name" (ngModelChange)="updateEditText('name', $event)" class="w-full rounded-md!" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryEditDescription" class="text-sm font-medium text-surface-900 dark:text-surface-0">说明</label>
                        <textarea pTextarea id="dictionaryEditDescription" rows="3" [ngModel]="editForm().description" (ngModelChange)="updateEditText('description', $event)" class="w-full rounded-md!"></textarea>
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="dictionaryEditStatus" class="text-sm font-medium text-surface-900 dark:text-surface-0">状态</label>
                            <p-select inputId="dictionaryEditStatus" [ngModel]="editForm().status" (ngModelChange)="updateEditStatus($event)" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full rounded-md!" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="dictionaryEditSortOrder" class="text-sm font-medium text-surface-900 dark:text-surface-0">排序</label>
                            <input pInputText id="dictionaryEditSortOrder" type="number" [ngModel]="editForm().sortOrder" (ngModelChange)="updateEditSortOrder($event)" class="w-full rounded-md!" />
                        </div>
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" [loading]="store.saving()" [disabled]="!canUpdate()" styleClass="rounded-md!" (onClick)="updateItem()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class DictionaryList {
    readonly store = inject(DictionaryStore);
    readonly #messageService = inject(MessageService);
    readonly ActiveInactiveStatus = ActiveInactiveStatus;

    readonly domainFilterOptions = DICTIONARY_FILTER_OPTIONS;
    readonly domainOptions = DICTIONARY_DOMAIN_OPTIONS;
    readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
    readonly statusOptions = DICTIONARY_STATUS_OPTIONS;

    readonly domainFilter = signal<DictionaryFilterValue>(ALL_FILTER_VALUE);
    readonly statusFilter = signal<StatusFilterValue>(ALL_FILTER_VALUE);
    readonly keyword = signal('');
    readonly pageError = signal<string | null>(null);
    readonly formError = signal<string | null>(null);
    readonly createForm = signal<DictionaryCreateForm>({ ...EMPTY_CREATE_FORM });
    readonly editForm = signal<DictionaryEditForm>({ ...EMPTY_EDIT_FORM });

    createDialogVisible = false;
    editDialogVisible = false;

    readonly items = this.store.items;
    readonly activeCount = computed(() => this.items().filter((item) => item.status === ActiveInactiveStatus.Active).length);
    readonly inactiveCount = computed(() => this.items().filter((item) => item.status === ActiveInactiveStatus.Inactive).length);
    readonly systemCount = computed(() => this.items().filter((item) => item.isSystem).length);

    constructor() {
        void this.reload();
    }

    async reload(): Promise<void> {
        this.pageError.set(null);
        const domain = this.domainFilter();
        const status = this.statusFilter();
        try {
            await this.store.loadItems({
                domain: domain === ALL_FILTER_VALUE ? undefined : domain,
                status: status === ALL_FILTER_VALUE ? undefined : status,
                keyword: this.keyword().trim() || undefined
            });
        } catch {
            this.pageError.set('业务字典没有读取成功，请确认权限或稍后重试。');
        }
    }

    resetFilters(): void {
        this.domainFilter.set(ALL_FILTER_VALUE);
        this.statusFilter.set(ALL_FILTER_VALUE);
        this.keyword.set('');
        void this.reload();
    }

    setDomainFilter(value: DictionaryFilterValue | null | undefined): void {
        this.domainFilter.set(value ?? ALL_FILTER_VALUE);
        void this.reload();
    }

    setStatusFilter(value: StatusFilterValue | null | undefined): void {
        this.statusFilter.set(value ?? ALL_FILTER_VALUE);
        void this.reload();
    }

    showCreateDialog(): void {
        this.createForm.set({ ...EMPTY_CREATE_FORM });
        this.formError.set(null);
        this.createDialogVisible = true;
    }

    resetCreateDialog(): void {
        this.formError.set(null);
    }

    updateCreateDomain(value: DictionaryDomain | null | undefined): void {
        this.createForm.update((form) => ({ ...form, domain: value ?? DictionaryDomain.AttachmentCategory }));
        this.formError.set(null);
    }

    updateCreateText(field: 'code' | 'name' | 'description', value: string): void {
        this.createForm.update((form) => ({ ...form, [field]: value }));
        this.formError.set(null);
    }

    updateCreateSortOrder(value: string | number | null | undefined): void {
        this.createForm.update((form) => ({ ...form, sortOrder: this.toSortOrder(value) }));
        this.formError.set(null);
    }

    canCreate(): boolean {
        const form = this.createForm();
        return Boolean(form.domain && DICTIONARY_CODE_PATTERN.test(form.code.trim()) && form.name.trim());
    }

    async createItem(): Promise<void> {
        if (!this.canCreate()) {
            this.formError.set('请填写字典域、合法 code 和名称。');
            return;
        }

        const form = this.createForm();
        try {
            await this.store.createItem({
                domain: form.domain,
                code: form.code.trim(),
                name: form.name.trim(),
                description: this.optionalText(form.description),
                sortOrder: this.toSortOrder(form.sortOrder)
            });
            this.createDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '创建成功', detail: `字典项 ${form.name.trim()} 已创建` });
            await this.reload();
        } catch {
            this.formError.set('字典项没有创建成功，请确认 code 未重复且权限有效。');
        }
    }

    showEditDialog(item: DictionaryItemSummary): void {
        this.editForm.set({
            id: item.id,
            domain: item.domain,
            code: item.code,
            name: item.name,
            description: item.description ?? '',
            status: item.status,
            sortOrder: item.sortOrder,
            expectedVersion: item.rowVersion
        });
        this.formError.set(null);
        this.editDialogVisible = true;
    }

    resetEditDialog(): void {
        this.formError.set(null);
    }

    updateEditText(field: 'name' | 'description', value: string): void {
        this.editForm.update((form) => ({ ...form, [field]: value }));
        this.formError.set(null);
    }

    updateEditStatus(value: ActiveInactiveStatus | null | undefined): void {
        this.editForm.update((form) => ({ ...form, status: value ?? ActiveInactiveStatus.Active }));
        this.formError.set(null);
    }

    updateEditSortOrder(value: string | number | null | undefined): void {
        this.editForm.update((form) => ({ ...form, sortOrder: this.toSortOrder(value) }));
        this.formError.set(null);
    }

    canUpdate(): boolean {
        const form = this.editForm();
        return Boolean(form.id && form.name.trim());
    }

    async updateItem(): Promise<void> {
        if (!this.canUpdate()) {
            this.formError.set('请填写字典项名称。');
            return;
        }

        const form = this.editForm();
        try {
            await this.store.updateItem(form.id, {
                name: form.name.trim(),
                description: this.optionalText(form.description),
                status: form.status,
                sortOrder: this.toSortOrder(form.sortOrder),
                expectedVersion: form.expectedVersion
            });
            this.editDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '保存成功', detail: `字典项 ${form.name.trim()} 已更新` });
            await this.reload();
        } catch {
            this.formError.set('字典项没有保存成功，请刷新后重试。');
        }
    }

    async toggleStatus(item: DictionaryItemSummary): Promise<void> {
        const nextStatus = item.status === ActiveInactiveStatus.Active ? ActiveInactiveStatus.Inactive : ActiveInactiveStatus.Active;
        try {
            await this.store.updateItem(item.id, {
                status: nextStatus,
                expectedVersion: item.rowVersion
            });
            this.#messageService.add({ severity: 'success', summary: '状态已更新', detail: `${item.name} 已${nextStatus === ActiveInactiveStatus.Active ? '启用' : '停用'}` });
            await this.reload();
        } catch {
            this.pageError.set('字典项状态没有更新成功，请刷新后重试。');
        }
    }

    domainLabel(domain: DictionaryDomain): string {
        return DICTIONARY_DOMAIN_LABELS[domain] ?? domain;
    }

    statusLabel(status: ActiveInactiveStatus): string {
        return DICTIONARY_STATUS_LABELS[status] ?? status;
    }

    statusSeverity(status: ActiveInactiveStatus): 'success' | 'warn' {
        return status === ActiveInactiveStatus.Active ? 'success' : 'warn';
    }

    private optionalText(value: string): string | null {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }

    private toSortOrder(value: string | number | null | undefined): number {
        const numeric = Number(value ?? DEFAULT_SORT_ORDER);
        return Number.isFinite(numeric) ? numeric : DEFAULT_SORT_ORDER;
    }
}
