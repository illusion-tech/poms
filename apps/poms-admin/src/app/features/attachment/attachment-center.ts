import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
    ActiveInactiveStatus,
    AttachmentCenterStore,
    AttachmentTargetType,
    DictionaryDomain,
    DictionaryStore,
    type AttachmentCenterRecord
} from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';

type AttachmentCenterTargetFilter = AttachmentTargetType | 'all';

interface FilterOption<T extends string> {
    label: string;
    value: T;
}

const ALL_FILTER_VALUE = 'all';

const TARGET_TYPE_LABELS: Record<AttachmentTargetType, string> = {
    [AttachmentTargetType.Customer]: '客户',
    [AttachmentTargetType.Lead]: '线索',
    [AttachmentTargetType.Project]: '项目',
    [AttachmentTargetType.Contract]: '合同',
    [AttachmentTargetType.SalesFollowUp]: '销售跟进',
    [AttachmentTargetType.ProjectHandover]: '项目移交'
};

const TARGET_TYPE_SEVERITY: Record<AttachmentTargetType, 'secondary' | 'info' | 'success' | 'warn'> = {
    [AttachmentTargetType.Customer]: 'secondary',
    [AttachmentTargetType.Lead]: 'info',
    [AttachmentTargetType.Project]: 'success',
    [AttachmentTargetType.Contract]: 'warn',
    [AttachmentTargetType.SalesFollowUp]: 'secondary',
    [AttachmentTargetType.ProjectHandover]: 'warn'
};

const TARGET_TYPE_OPTIONS: FilterOption<AttachmentCenterTargetFilter>[] = [
    { label: '全部业务对象', value: ALL_FILTER_VALUE },
    { label: '客户', value: AttachmentTargetType.Customer },
    { label: '线索', value: AttachmentTargetType.Lead },
    { label: '项目', value: AttachmentTargetType.Project },
    { label: '合同', value: AttachmentTargetType.Contract }
];

@Component({
    selector: 'app-attachment-center',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, TagModule, WorkspaceFeedback],
    providers: [AttachmentCenterStore, DictionaryStore],
    template: `
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">业务管理</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">附件中心</h1>
                        <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">按当前可读客户、线索、项目和合同汇总附件证据，保留业务对象上下文。</p>
                    </div>

                    <p-button label="刷新" icon="pi pi-refresh" severity="secondary" [outlined]="true" styleClass="w-full rounded-md! sm:w-auto" [loading]="store.loading()" (onClick)="reload()" />
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">附件数量</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ filteredRecords().length }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">业务对象</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ filteredTargetCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">最终版</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ finalCount() }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">可预览</div>
                        <div class="mt-2 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ previewableCount() }}</div>
                    </div>
                </div>
            </section>

            @if (pageError()) {
                <app-workspace-feedback severity="error" summary="附件中心没有读取成功" [detail]="pageError()" />
            }

            @if (store.errors().length) {
                <app-workspace-feedback severity="warn" summary="部分范围读取失败" [detail]="store.errors().join(' ')" />
            }

            <section class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(18rem,1fr)_12rem_12rem_12rem_10rem_10rem]">
                <p-iconfield>
                    <p-inputicon class="pi pi-search" />
                    <input pInputText class="w-full rounded-md!" [ngModel]="keyword()" (ngModelChange)="keyword.set($event)" placeholder="搜索文件名、业务对象、上传人" />
                </p-iconfield>
                <p-select [ngModel]="targetTypeFilter()" (ngModelChange)="targetTypeFilter.set($event)" [options]="targetTypeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                <p-select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" [options]="categoryFilterOptions()" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                <p-select [ngModel]="uploaderFilter()" (ngModelChange)="uploaderFilter.set($event)" [options]="uploaderFilterOptions()" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                <input type="date" class="h-10 rounded-md border border-surface-300 bg-surface-0 px-3 text-sm text-surface-900 outline-none focus:border-primary dark:border-surface-700 dark:bg-surface-900 dark:text-surface-0" [ngModel]="uploadedFrom()" (ngModelChange)="uploadedFrom.set($event)" />
                <input type="date" class="h-10 rounded-md border border-surface-300 bg-surface-0 px-3 text-sm text-surface-900 outline-none focus:border-primary dark:border-surface-700 dark:bg-surface-900 dark:text-surface-0" [ngModel]="uploadedTo()" (ngModelChange)="uploadedTo.set($event)" />
            </section>

            <p-table
                class="rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900"
                [value]="filteredRecords()"
                [loading]="store.loading()"
                [paginator]="true"
                [rows]="10"
                sortMode="multiple"
                dataKey="id"
                tableStyleClass="min-w-[72rem]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                currentPageReportTemplate="当前 {first} - {last} / 共 {totalRecords} 个附件"
            >
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="attachment.displayName">文件 <p-sortIcon field="attachment.displayName" /></th>
                        <th pSortableColumn="targetName">业务对象 <p-sortIcon field="targetName" /></th>
                        <th>分类</th>
                        <th pSortableColumn="attachment.uploadedByName">上传人 <p-sortIcon field="attachment.uploadedByName" /></th>
                        <th pSortableColumn="attachment.uploadedAt">上传时间 <p-sortIcon field="attachment.uploadedAt" /></th>
                        <th>版本</th>
                        <th>操作</th>
                    </tr>
                </ng-template>
                <ng-template #body let-record>
                    <tr>
                        <td>
                            <div class="flex min-w-0 items-center gap-3">
                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-surface-200 bg-surface-50 text-surface-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
                                    <i class="pi" [ngClass]="fileIcon(record)"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="truncate font-medium text-surface-950 dark:text-surface-0">{{ record.attachment.displayName }}</div>
                                    <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ record.attachment.extension | uppercase }} · {{ formatSize(record.attachment.sizeBytes) }}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="flex flex-col gap-1">
                                <div class="flex items-center gap-2">
                                    <p-tag [value]="targetTypeLabel(record.targetType)" [severity]="targetTypeSeverity(record.targetType)" class="rounded-[6px]" />
                                    <span class="font-medium text-surface-900 dark:text-surface-0">{{ record.targetName }}</span>
                                </div>
                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ record.targetNo }}</span>
                            </div>
                        </td>
                        <td>{{ categoryLabel(record.attachment.category) }}</td>
                        <td>{{ record.attachment.uploadedByName || '未知上传人' }}</td>
                        <td>{{ record.attachment.uploadedAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                        <td>
                            <div class="flex flex-wrap gap-2">
                                <p-tag [value]="'v' + record.attachment.versionNo" severity="info" class="rounded-[6px]" />
                                @if (record.attachment.isFinal) {
                                    <p-tag value="最终版" severity="warn" class="rounded-[6px]" />
                                }
                                @if (record.attachment.previewSupported) {
                                    <p-tag value="可预览" severity="success" class="rounded-[6px]" />
                                }
                            </div>
                        </td>
                        <td>
                            <p-button icon="pi pi-arrow-right" label="查看来源" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="navigateToSource(record)" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="7" class="py-8 text-center text-surface-500 dark:text-surface-400">
                            {{ store.loading() ? '正在读取附件...' : '当前筛选条件下没有附件。' }}
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `
})
export class AttachmentCenter implements OnInit {
    readonly store = inject(AttachmentCenterStore);
    readonly dictionaryStore = inject(DictionaryStore);
    readonly #router = inject(Router);

    readonly keyword = signal('');
    readonly targetTypeFilter = signal<AttachmentCenterTargetFilter>(ALL_FILTER_VALUE);
    readonly categoryFilter = signal<string>(ALL_FILTER_VALUE);
    readonly uploaderFilter = signal<string>(ALL_FILTER_VALUE);
    readonly uploadedFrom = signal('');
    readonly uploadedTo = signal('');
    readonly pageError = signal<string | null>(null);

    readonly targetTypeOptions = TARGET_TYPE_OPTIONS;

    readonly categoryLookup = computed(() => new Map(this.dictionaryStore.items().map((item) => [item.code, item.name])));
    readonly categoryFilterOptions = computed<FilterOption<string>[]>(() => [
        { label: '全部分类', value: ALL_FILTER_VALUE },
        ...this.dictionaryStore.activeItems().map((item) => ({ label: item.name, value: item.code }))
    ]);

    readonly uploaderFilterOptions = computed<FilterOption<string>[]>(() => {
        const names = [...new Set(this.store.records().map((record) => record.attachment.uploadedByName).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        return [{ label: '全部上传人', value: ALL_FILTER_VALUE }, ...names.map((name) => ({ label: name, value: name }))];
    });

    readonly filteredRecords = computed(() => {
        const keyword = this.keyword().trim().toLowerCase();
        const targetType = this.targetTypeFilter();
        const category = this.categoryFilter();
        const uploader = this.uploaderFilter();
        const uploadedFrom = this.uploadedFrom();
        const uploadedTo = this.uploadedTo();

        return this.store.records().filter((record) => {
            if (targetType !== ALL_FILTER_VALUE && record.targetType !== targetType) return false;
            if (category !== ALL_FILTER_VALUE && record.attachment.category !== category) return false;
            if (uploader !== ALL_FILTER_VALUE && record.attachment.uploadedByName !== uploader) return false;

            const uploadedDate = record.attachment.uploadedAt.slice(0, 10);
            if (uploadedFrom && uploadedDate < uploadedFrom) return false;
            if (uploadedTo && uploadedDate > uploadedTo) return false;

            if (!keyword) return true;

            return [
                record.attachment.displayName,
                record.attachment.originalName,
                record.attachment.uploadedByName ?? '',
                record.targetName,
                record.targetNo,
                this.categoryLabel(record.attachment.category)
            ]
                .join(' ')
                .toLowerCase()
                .includes(keyword);
        });
    });

    readonly filteredTargetCount = computed(() => new Set(this.filteredRecords().map((record) => `${record.targetType}:${record.targetId}`)).size);
    readonly finalCount = computed(() => this.filteredRecords().filter((record) => record.attachment.isFinal).length);
    readonly previewableCount = computed(() => this.filteredRecords().filter((record) => record.attachment.previewSupported).length);

    ngOnInit(): void {
        void this.loadCategoryOptions();
        void this.reload();
    }

    async reload(): Promise<void> {
        this.pageError.set(null);
        try {
            await this.store.loadRecords();
        } catch {
            this.pageError.set('附件中心没有读取成功，请稍后重试。');
        }
    }

    async loadCategoryOptions(): Promise<void> {
        try {
            await this.dictionaryStore.loadItems({
                domain: DictionaryDomain.AttachmentCategory,
                status: ActiveInactiveStatus.Active
            });
        } catch {
            this.pageError.set('附件分类没有读取成功，请稍后重试。');
        }
    }

    navigateToSource(record: AttachmentCenterRecord): void {
        void this.#router.navigate(record.routeCommands, record.routeQueryParams ? { queryParams: record.routeQueryParams } : undefined);
    }

    targetTypeLabel(targetType: AttachmentTargetType): string {
        return TARGET_TYPE_LABELS[targetType];
    }

    targetTypeSeverity(targetType: AttachmentTargetType): 'secondary' | 'info' | 'success' | 'warn' {
        return TARGET_TYPE_SEVERITY[targetType];
    }

    categoryLabel(category: string): string {
        return this.categoryLookup().get(category) ?? category;
    }

    fileIcon(record: AttachmentCenterRecord): string {
        const attachment = record.attachment;
        if (attachment.mimeType.startsWith('image/')) return 'pi-image';
        if (attachment.mimeType === 'application/pdf') return 'pi-file-pdf';
        if (['xls', 'xlsx', 'csv'].includes(attachment.extension.toLowerCase())) return 'pi-file-excel';
        if (['zip', 'rar', '7z'].includes(attachment.extension.toLowerCase())) return 'pi-box';
        return 'pi-file';
    }

    formatSize(sizeBytes: number): string {
        if (sizeBytes < 1024) return `${sizeBytes} B`;

        const units = ['KB', 'MB', 'GB'];
        let value = sizeBytes / 1024;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
    }
}
