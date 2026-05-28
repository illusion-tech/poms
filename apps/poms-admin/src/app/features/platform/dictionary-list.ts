import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActiveInactiveStatus, DictionaryDomain, DictionaryStore, type DictionaryItemSummary } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
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

const DICTIONARY_DOMAIN_DESCRIPTIONS: Record<DictionaryDomain, string> = {
    [DictionaryDomain.AttachmentCategory]: '客户、线索、项目和合同附件的业务分类。',
    [DictionaryDomain.SalesFollowUpType]: '销售跟进记录的沟通方式和动作类型。',
    [DictionaryDomain.ExpenseCategory]: '项目成本、费用登记和分析使用的分类。'
};

const DICTIONARY_DOMAIN_ICONS: Record<DictionaryDomain, string> = {
    [DictionaryDomain.AttachmentCategory]: 'pi pi-paperclip',
    [DictionaryDomain.SalesFollowUpType]: 'pi pi-comments',
    [DictionaryDomain.ExpenseCategory]: 'pi pi-wallet'
};

const DICTIONARY_DOMAIN_OPTIONS: DictionaryOption<DictionaryDomain>[] = (Object.values(DictionaryDomain) as DictionaryDomain[]).map((domain) => ({
    label: DICTIONARY_DOMAIN_LABELS[domain],
    value: domain
}));

const DICTIONARY_FILTER_OPTIONS: DictionaryOption<DictionaryFilterValue>[] = [{ label: '全部字典域', value: ALL_FILTER_VALUE }, ...DICTIONARY_DOMAIN_OPTIONS];

const DICTIONARY_STATUS_LABELS: Record<ActiveInactiveStatus, string> = {
    [ActiveInactiveStatus.Active]: '启用',
    [ActiveInactiveStatus.Inactive]: '停用'
};

const DICTIONARY_STATUS_OPTIONS: DictionaryOption<ActiveInactiveStatus>[] = [
    { label: DICTIONARY_STATUS_LABELS[ActiveInactiveStatus.Active], value: ActiveInactiveStatus.Active },
    { label: DICTIONARY_STATUS_LABELS[ActiveInactiveStatus.Inactive], value: ActiveInactiveStatus.Inactive }
];

const STATUS_FILTER_OPTIONS: DictionaryOption<StatusFilterValue>[] = [{ label: '全部状态', value: ALL_FILTER_VALUE }, ...DICTIONARY_STATUS_OPTIONS];

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
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, TagModule, TextareaModule, TooltipModule, ToastModule],
    providers: [DictionaryStore, MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col gap-5">
            <section class="border-b border-surface-200 pb-5 dark:border-surface-700">
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

            <section class="rounded-[8px] border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900">
                <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div class="flex flex-col gap-3 md:flex-row md:items-center">
                        <p-iconfield class="w-full md:w-96">
                            <p-inputicon class="pi pi-search" />
                            <input pInputText [ngModel]="keyword()" (ngModelChange)="keyword.set($event)" (keydown.enter)="reload()" placeholder="搜索 code、名称或说明" class="w-full! rounded-md! py-2!" />
                        </p-iconfield>

                        <p-button label="查询" icon="pi pi-search" severity="primary" [outlined]="true" class="rounded-md!" (onClick)="reload()" />
                        <p-button label="重置" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (onClick)="resetFilters()" />
                    </div>

                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" class="rounded-md!" [loading]="store.loading()" (onClick)="reload()" />
                        <p-button label="新增字典项" icon="pi pi-plus" severity="primary" class="w-full sm:w-auto rounded-md!" (onClick)="showCreateDialog()" />
                    </div>
                </div>
            </section>

            <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
                @for (card of domainCards(); track card.domain) {
                    <article class="flex min-h-[29rem] flex-col rounded-[8px] border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900">
                        <header class="flex items-start justify-between gap-4">
                            <div class="flex min-w-0 gap-3">
                                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-surface-200 bg-surface-50 text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
                                    <i [class]="domainIcon(card.domain)"></i>
                                </div>
                                <div class="min-w-0">
                                    <h2 class="m-0 text-base font-semibold leading-6 text-surface-950 dark:text-surface-0">{{ card.label }}</h2>
                                    <p class="mt-1 text-sm leading-5 text-surface-500 dark:text-surface-400">{{ domainDescription(card.domain) }}</p>
                                    <div class="mt-2 font-mono text-xs text-surface-400 dark:text-surface-500">{{ card.domain }}</div>
                                </div>
                            </div>

                            <p-button icon="pi pi-plus" label="新增" size="small" severity="primary" [outlined]="true" class="rounded-md!" (onClick)="showCreateDialog(card.domain)" />
                        </header>

                        <div class="mt-4 flex flex-wrap items-center gap-2">
                            <p-tag [value]="'启用 ' + card.activeCount" severity="success" class="rounded-[6px]" />
                            <p-tag [value]="'停用 ' + card.inactiveCount" severity="warn" class="rounded-[6px]" />
                            <p-tag [value]="'系统项 ' + card.systemCount" severity="contrast" class="rounded-[6px]" />
                            @if (card.inactiveCount) {
                                <p-button
                                    [label]="card.showInactive ? '隐藏停用项' : '显示停用项'"
                                    [icon]="card.showInactive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                                    size="small"
                                    severity="secondary"
                                    [text]="true"
                                    class="rounded-md!"
                                    (onClick)="toggleInactiveVisibility(card.domain)"
                                />
                            }
                        </div>

                        <div class="mt-4 flex flex-1 flex-col rounded-[8px] border border-surface-100 dark:border-surface-800">
                            @if (store.loading()) {
                                <div class="p-5 text-sm text-surface-500 dark:text-surface-400">正在读取业务字典。</div>
                            } @else if (card.visibleItems.length) {
                                @for (item of card.visibleItems; track item.id) {
                                    <div class="flex items-start gap-3 border-t border-surface-100 p-3 first:border-t-0 dark:border-surface-800">
                                        <div class="min-w-0 flex-1">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <h3 class="m-0 min-w-0 truncate text-sm font-semibold leading-6 text-surface-950 dark:text-surface-0">{{ item.name }}</h3>
                                                <p-tag [value]="statusLabel(item.status)" [severity]="statusSeverity(item.status)" class="rounded-[6px]" />
                                                @if (item.isSystem) {
                                                    <p-tag value="系统项" severity="contrast" class="rounded-[6px]" />
                                                }
                                            </div>
                                            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                                <span class="font-mono text-surface-700 dark:text-surface-200">{{ item.code }}</span>
                                                <span>排序 {{ item.sortOrder }}</span>
                                                <span>引用 {{ item.usageCount }} 条</span>
                                                <span class="font-mono">v{{ item.rowVersion }}</span>
                                            </div>
                                            @if (item.description) {
                                                <p class="mt-2 text-sm leading-6 text-surface-600 dark:text-surface-300">{{ item.description }}</p>
                                            }
                                        </div>

                                        <div class="grid shrink-0 grid-cols-2 gap-1.5">
                                            <p-button
                                                icon="pi pi-pencil"
                                                size="small"
                                                severity="secondary"
                                                [text]="true"
                                                [rounded]="true"
                                                ariaLabel="编辑字典项"
                                                pTooltip="编辑"
                                                tooltipPosition="left"
                                                class="h-8! w-8! p-0!"
                                                (onClick)="showEditDialog(item)"
                                            />
                                            <p-button
                                                [icon]="item.status === ActiveInactiveStatus.Active ? 'pi pi-ban' : 'pi pi-check-circle'"
                                                size="small"
                                                [severity]="item.status === ActiveInactiveStatus.Active ? 'warn' : 'success'"
                                                [text]="true"
                                                [rounded]="true"
                                                [attr.aria-label]="item.status === ActiveInactiveStatus.Active ? '停用字典项' : '启用字典项'"
                                                [pTooltip]="item.status === ActiveInactiveStatus.Active ? '停用' : '启用'"
                                                tooltipPosition="left"
                                                class="h-8! w-8! p-0!"
                                                [disabled]="store.saving()"
                                                (onClick)="toggleStatus(item)"
                                            />
                                        </div>
                                    </div>
                                }
                            } @else {
                                <div class="flex flex-1 items-center justify-center p-5 text-center text-sm text-surface-500 dark:text-surface-400">
                                    {{ card.totalCount ? '当前停用项已隐藏。' : '暂无匹配字典项。' }}
                                </div>
                            }
                        </div>
                    </article>
                }
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新增字典项" [style]="{ width: 'min(34rem, 92vw)' }" class="p-fluid" (onHide)="resetCreateDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (formError()) {
                        <div class="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{{ formError() }}</div>
                    }

                    <div class="flex flex-col gap-2">
                        <label for="dictionaryCreateDomain" class="text-sm font-medium text-surface-900 dark:text-surface-0">字典域 *</label>
                        <p-select
                            inputId="dictionaryCreateDomain"
                            [ngModel]="createForm().domain"
                            (ngModelChange)="updateCreateDomain($event)"
                            [options]="domainOptions"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            class="w-full rounded-md!"
                        />
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
                        <p-button label="取消" severity="secondary" [outlined]="true" class="rounded-md!" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="store.saving()" [disabled]="!canCreate()" class="rounded-md!" (onClick)="createItem()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑字典项" [style]="{ width: 'min(34rem, 92vw)' }" class="p-fluid" (onHide)="resetEditDialog()">
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
                            <p-select
                                inputId="dictionaryEditStatus"
                                [ngModel]="editForm().status"
                                (ngModelChange)="updateEditStatus($event)"
                                [options]="statusOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                class="w-full rounded-md!"
                            />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="dictionaryEditSortOrder" class="text-sm font-medium text-surface-900 dark:text-surface-0">排序</label>
                            <input pInputText id="dictionaryEditSortOrder" type="number" [ngModel]="editForm().sortOrder" (ngModelChange)="updateEditSortOrder($event)" class="w-full rounded-md!" />
                        </div>
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" class="rounded-md!" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" [loading]="store.saving()" [disabled]="!canUpdate()" class="rounded-md!" (onClick)="updateItem()" />
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
    readonly showInactiveDomains = signal<ReadonlySet<DictionaryDomain>>(new Set());

    createDialogVisible = false;
    editDialogVisible = false;

    readonly items = this.store.items;
    readonly activeCount = computed(() => this.items().filter((item) => item.status === ActiveInactiveStatus.Active).length);
    readonly inactiveCount = computed(() => this.items().filter((item) => item.status === ActiveInactiveStatus.Inactive).length);
    readonly systemCount = computed(() => this.items().filter((item) => item.isSystem).length);
    readonly domainCards = computed(() =>
        this.domainOptions.map((option) => {
            const showInactive = this.showInactiveDomains().has(option.value);
            const domainItems = this.items()
                .filter((item) => item.domain === option.value)
                .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN') || left.code.localeCompare(right.code));

            return {
                domain: option.value,
                label: option.label,
                activeCount: domainItems.filter((item) => item.status === ActiveInactiveStatus.Active).length,
                inactiveCount: domainItems.filter((item) => item.status === ActiveInactiveStatus.Inactive).length,
                systemCount: domainItems.filter((item) => item.isSystem).length,
                totalCount: domainItems.length,
                showInactive,
                visibleItems: domainItems.filter((item) => item.status === ActiveInactiveStatus.Active || showInactive)
            };
        })
    );

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

    showCreateDialog(domain: DictionaryDomain = DictionaryDomain.AttachmentCategory): void {
        this.createForm.set({ ...EMPTY_CREATE_FORM, domain });
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

    toggleInactiveVisibility(domain: DictionaryDomain): void {
        this.showInactiveDomains.update((current) => {
            const next = new Set(current);
            if (next.has(domain)) {
                next.delete(domain);
            } else {
                next.add(domain);
            }
            return next;
        });
    }

    domainLabel(domain: DictionaryDomain): string {
        return DICTIONARY_DOMAIN_LABELS[domain] ?? domain;
    }

    domainDescription(domain: DictionaryDomain): string {
        return DICTIONARY_DOMAIN_DESCRIPTIONS[domain] ?? '业务字典配置项。';
    }

    domainIcon(domain: DictionaryDomain): string {
        return DICTIONARY_DOMAIN_ICONS[domain] ?? 'pi pi-list';
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
