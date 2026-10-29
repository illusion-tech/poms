// Mechanical original K section. See source-map.json; not a full R4 page.
import { input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    AttachmentDownloadPackageStatus,
    ContractHandoverBaselineValidationStatus,
    ContractHandoverCurrentBaselineSourceType,
    ContractHandoverCurrentBaselineStatus,
    ContractHandoverRebaselineBlockingStatus,
    ContractHandoverRebaselineStatus,
    ContractHandoverReceivablePlanInitStatus,
    ProjectHandoverStatus,
    ProjectHandoverAttachmentChecklistItemStatus,
    ProjectHandoverParticipantConfirmationStatus,
    ProjectHandoverReceiptJudgmentFreezeStatus,
    type AttachmentDownloadPackageSummary,
    type ContractHandoverSummaryView,
    type ProjectHandoverAttachmentChecklistItem,
    ProjectWorkspaceStore
} from '@poms/admin-data-access';
import {
    ContractHandoverBaselineValidationStatusLabel,
    ContractHandoverBaselineValidationStatusSeverity,
    ContractHandoverCurrentBaselineSourceTypeLabel,
    ContractHandoverCurrentBaselineStatusLabel,
    ContractHandoverCurrentBaselineStatusSeverity,
    ContractHandoverRebaselineBlockingStatusLabel,
    ContractHandoverRebaselineBlockingStatusSeverity,
    ContractHandoverRebaselineStatusLabel,
    ContractHandoverRebaselineStatusSeverity,
    ContractHandoverReceivablePlanInitStatusLabel,
    ContractHandoverReceivablePlanInitStatusSeverity,
    ProjectHandoverParticipantConfirmationStatusLabel,
    ProjectHandoverParticipantConfirmationStatusSeverity,
    ProjectHandoverReceiptJudgmentFreezeStatusLabel,
    ProjectHandoverReceiptJudgmentFreezeStatusSeverity,
    ProjectHandoverStatusLabel,
    ProjectHandoverStatusSeverity
} from '@poms/shared-contracts';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../../apps/poms-admin/src/app/shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../../apps/poms-admin/src/app/shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../../apps/poms-admin/src/app/shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../../apps/poms-admin/src/app/shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../../apps/poms-admin/src/app/shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../../apps/poms-admin/src/app/shared/ui/workspace-loading';
import { formatSensitiveAmountProjection } from '../../../apps/poms-admin/src/app/shared/ui/sensitive-visibility';
import { contractStatusLabelOrFallback as sharedContractStatusLabel, contractStatusSeverityOrFallback as sharedContractStatusSeverity } from '../../../apps/poms-admin/src/app/shared/ui/status-presentation';
import { type UiTagSeverity } from '../../../apps/poms-admin/src/app/features/project/project-presentation';

const ATTACHMENT_CHECKLIST_STATUS_LABELS: Record<ProjectHandoverAttachmentChecklistItemStatus, string> = {
    [ProjectHandoverAttachmentChecklistItemStatus.Included]: '已纳入',
    [ProjectHandoverAttachmentChecklistItemStatus.Missing]: '缺失',
    [ProjectHandoverAttachmentChecklistItemStatus.Excluded]: '已排除',
    [ProjectHandoverAttachmentChecklistItemStatus.SensitiveExcluded]: '敏感排除',
    [ProjectHandoverAttachmentChecklistItemStatus.StaleVersion]: '版本过期'
};

const ATTACHMENT_CHECKLIST_STATUS_SEVERITIES: Record<ProjectHandoverAttachmentChecklistItemStatus, UiTagSeverity> = {
    [ProjectHandoverAttachmentChecklistItemStatus.Included]: 'success',
    [ProjectHandoverAttachmentChecklistItemStatus.Missing]: 'danger',
    [ProjectHandoverAttachmentChecklistItemStatus.Excluded]: 'secondary',
    [ProjectHandoverAttachmentChecklistItemStatus.SensitiveExcluded]: 'warn',
    [ProjectHandoverAttachmentChecklistItemStatus.StaleVersion]: 'warn'
};

const DOWNLOAD_PACKAGE_STATUS_LABELS: Record<AttachmentDownloadPackageStatus, string> = {
    [AttachmentDownloadPackageStatus.Pending]: '待生成',
    [AttachmentDownloadPackageStatus.Running]: '生成中',
    [AttachmentDownloadPackageStatus.Ready]: '可下载',
    [AttachmentDownloadPackageStatus.Failed]: '失败',
    [AttachmentDownloadPackageStatus.Expired]: '已过期',
    [AttachmentDownloadPackageStatus.Cancelled]: '已取消'
};

const DOWNLOAD_PACKAGE_STATUS_SEVERITIES: Record<AttachmentDownloadPackageStatus, UiTagSeverity> = {
    [AttachmentDownloadPackageStatus.Pending]: 'info',
    [AttachmentDownloadPackageStatus.Running]: 'info',
    [AttachmentDownloadPackageStatus.Ready]: 'success',
    [AttachmentDownloadPackageStatus.Failed]: 'danger',
    [AttachmentDownloadPackageStatus.Expired]: 'secondary',
    [AttachmentDownloadPackageStatus.Cancelled]: 'secondary'
};

@Component({ selector: 'app-k-original-section', standalone: true, imports: [ButtonModule, SectionCard, TableModule, TagModule, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading], changeDetection: ChangeDetectionStrategy.Eager, template: `<section-card>
                    <ng-template #title>附件移交清单</ng-template>
                    <ng-template #description>清单由后端扫描项目、来源线索、合同和跟进附件生成，前端只选择本次下载包的纳入项。</ng-template>

                    @if (!handoverId()) {
                        <app-workspace-feedback class="mt-4 block" severity="info" summary="暂无项目移交记录" detail="完成移交前置事实后，系统会生成可读取的项目移交记录。" />
                    } @else {
                        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div class="flex flex-wrap gap-2">
                                <p-button icon="pi pi-refresh" label="刷新扫描" size="small" severity="secondary" [outlined]="true" [loading]="refreshingHandoverAttachments()" (onClick)="refreshHandoverAttachmentChecklist()" />
                                <p-button icon="pi pi-file-export" label="创建下载包" size="small" [disabled]="selectedHandoverAttachmentCount() === 0" [loading]="creatingHandoverAttachmentPackage()" (onClick)="createHandoverAttachmentDownloadPackage()" />
                                @if (handoverAttachmentDownloadPackage(); as downloadPackage) {
                                    <p-button icon="pi pi-download" label="下载包" size="small" severity="success" [outlined]="true" [disabled]="!canDownloadHandoverAttachmentPackage(downloadPackage)" [loading]="downloadingHandoverAttachmentPackage()" (onClick)="downloadHandoverAttachmentPackage(downloadPackage)" />
                                }
                            </div>
                            <span class="text-sm text-surface-500">已选择 {{ selectedHandoverAttachmentCount() }} 项</span>
                        </div>

                        @if (handoverAttachmentError()) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="附件移交清单暂不可用" [detail]="handoverAttachmentError()" />
                        }

                        @if (loadingHandoverAttachments()) {
                            <app-workspace-loading class="mt-4 block" label="正在读取附件移交清单" />
                        } @else if (handoverAttachmentChecklist()) {
                            <app-workspace-fact-grid class="mt-4 block" [items]="handoverAttachmentCountItems()" [columns]="4" />

                            @if (handoverAttachmentDownloadPackage(); as downloadPackage) {
                                <div class="mt-4 rounded-md border border-surface-200 p-3 text-sm dark:border-surface-700">
                                    <div class="flex flex-wrap items-center justify-between gap-2">
                                        <div class="font-semibold text-surface-950 dark:text-surface-0">最近下载包</div>
                                        <p-tag [value]="downloadPackageStatusLabel(downloadPackage.status)" [severity]="downloadPackageStatusSeverity(downloadPackage.status)" class="rounded-[6px]!" />
                                    </div>
                                    <div class="mt-2 grid gap-2 text-surface-600 md:grid-cols-3 dark:text-surface-300">
                                        <span>纳入 {{ downloadPackage.manifestSummary.includedCount }} 项</span>
                                        <span>排除 {{ downloadPackage.manifestSummary.excludedCount }} 项</span>
                                        <span>过期 {{ formatDateTime(downloadPackage.expiresAt) }}</span>
                                    </div>
                                    @if (downloadPackage.failedReason) {
                                        <div class="mt-2 text-red-600">{{ downloadPackage.failedReason }}</div>
                                    }
                                </div>
                            }

                            <p-table class="mt-4 block p-datatable-sm" [value]="handoverAttachmentItems()" [rowHover]="true" [paginator]="handoverAttachmentItems().length > 8" [rows]="8" [scrollable]="true" [tableStyle]="{ 'min-width': '58rem' }">
                                <ng-template #header pTemplate="header">
                                    <tr>
                                        <th class="w-16">纳入</th>
                                        <th>附件</th>
                                        <th>分类</th>
                                        <th>安全级别</th>
                                        <th>状态</th>
                                        <th>来源</th>
                                        <th>说明</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body pTemplate="body" let-item>
                                    <tr>
                                        <td>
                                            <input type="checkbox" class="h-4 w-4 rounded border-surface-300 text-primary" [checked]="isHandoverAttachmentSelected(item)" [disabled]="!canSelectHandoverAttachment(item)" (change)="toggleHandoverAttachmentSelection(item, $event)" />
                                        </td>
                                        <td>
                                            <div class="font-medium text-surface-950 dark:text-surface-0">{{ item.displayName }}</div>
                                            @if (item.staleVersion) {
                                                <div class="text-xs text-amber-600">当前版本已不是最新移交版本</div>
                                            }
                                        </td>
                                        <td>{{ item.category ?? '未分类' }}</td>
                                        <td>{{ item.securityLevel ?? '未标记' }}</td>
                                        <td>
                                            <p-tag [value]="handoverAttachmentStatusLabel(item.status)" [severity]="handoverAttachmentStatusSeverity(item.status)" class="rounded-[6px]!" />
                                        </td>
                                        <td>{{ handoverAttachmentSourceText(item) }}</td>
                                        <td>{{ item.exclusionReason ?? item.selectionReason ?? '无' }}</td>
                                    </tr>
                                </ng-template>
                                <ng-template #emptymessage pTemplate="emptymessage">
                                    <tr>
                                        <td colspan="7">当前没有可展示的附件移交清单。</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    }
                </section-card>` })
export class KOriginalSection implements OnInit {
    readonly handoverId = input('');

readonly #workspaceStore = inject(ProjectWorkspaceStore);

readonly handoverAttachmentChecklist = this.#workspaceStore.handoverAttachmentChecklist;

readonly handoverAttachmentDownloadPackage = this.#workspaceStore.handoverAttachmentDownloadPackage;

readonly loadingHandoverAttachments = this.#workspaceStore.loadingHandoverAttachments;

readonly refreshingHandoverAttachments = this.#workspaceStore.refreshingHandoverAttachments;

readonly creatingHandoverAttachmentPackage = this.#workspaceStore.creatingHandoverAttachmentPackage;

readonly downloadingHandoverAttachmentPackage = this.#workspaceStore.downloadingHandoverAttachmentPackage;

readonly handoverAttachmentError = this.#workspaceStore.handoverAttachmentError;

readonly selectedHandoverAttachmentSelectionIds = signal<Set<string>>(new Set());

readonly selectedHandoverAttachmentCount = computed(() => this.selectedHandoverAttachmentSelectionIds().size);

async refreshHandoverAttachmentChecklist(): Promise<void> {
        const handoverId = this.handoverId();
        if (!handoverId) {
            return;
        }

        try {
            const checklist = await this.#workspaceStore.refreshHandoverAttachmentChecklist(handoverId);
            this.syncSelectedHandoverAttachments(checklist.items);
        } catch {
            // Error is surfaced through the store signal.
        }
    }

async createHandoverAttachmentDownloadPackage(): Promise<void> {
        const handoverId = this.handoverId();
        if (!handoverId) {
            return;
        }

        const selectionIds = Array.from(this.selectedHandoverAttachmentSelectionIds());
        if (selectionIds.length === 0) {
            return;
        }

        const expectedSelectionVersions = this.handoverAttachmentItems()
            .filter((item) => item.selectionId && selectionIds.includes(item.selectionId) && item.rowVersion !== null)
            .map((item) => ({
                selectionId: item.selectionId as string,
                rowVersion: item.rowVersion as number
            }));

        await this.#workspaceStore.createHandoverAttachmentDownloadPackage({
            handoverId,
            selectionIds,
            expectedSelectionVersions,
            note: '由项目移交页面创建'
        });
    }

async downloadHandoverAttachmentPackage(downloadPackage: AttachmentDownloadPackageSummary): Promise<void> {
        if (!this.canDownloadHandoverAttachmentPackage(downloadPackage)) {
            return;
        }

        const result = await this.#workspaceStore.downloadHandoverAttachmentPackage(downloadPackage.id);
        const url = URL.createObjectURL(result.blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = result.fileName || downloadPackage.fileName || 'handover-attachments.zip';
        anchor.click();
        URL.revokeObjectURL(url);

        await this.#workspaceStore.loadHandoverAttachmentDownloadPackage(downloadPackage.id).catch(() => undefined);
    }

private async loadHandoverAttachmentChecklist(): Promise<void> {
        const handoverId = this.handoverId();
        if (!handoverId) {
            this.selectedHandoverAttachmentSelectionIds.set(new Set());
            return;
        }

        const checklist = await this.#workspaceStore.loadHandoverAttachmentChecklist(handoverId);
        this.syncSelectedHandoverAttachments(checklist.items);
    }

handoverAttachmentItems(): ProjectHandoverAttachmentChecklistItem[] {
        return this.handoverAttachmentChecklist()?.items ?? [];
    }

handoverAttachmentCountItems(): WorkspaceFactGridItem[] {
        const counts = this.handoverAttachmentChecklist()?.counts;
        if (!counts) {
            return [];
        }

        return [
            {
                label: '清单总数',
                value: counts.total,
                emphasis: true
            },
            {
                label: '已纳入',
                value: counts.included,
                severity: 'success'
            },
            {
                label: '敏感排除',
                value: counts.sensitiveExcluded,
                severity: counts.sensitiveExcluded > 0 ? 'warn' : 'secondary'
            },
            {
                label: '可下载',
                value: counts.downloadable,
                emphasis: true
            },
            {
                label: '缺失',
                value: counts.missing,
                severity: counts.missing > 0 ? 'danger' : 'secondary'
            },
            {
                label: '版本过期',
                value: counts.staleVersion,
                severity: counts.staleVersion > 0 ? 'warn' : 'secondary'
            },
            {
                label: '已排除',
                value: counts.excluded,
                severity: 'secondary'
            },
            {
                label: '生成时间',
                value: this.formatDateTime(this.handoverAttachmentChecklist()?.generatedAt ?? null)
            }
        ];
    }

canSelectHandoverAttachment(item: ProjectHandoverAttachmentChecklistItem): boolean {
        return item.status === ProjectHandoverAttachmentChecklistItemStatus.Included && item.downloadEligible && item.selectionId !== null && item.rowVersion !== null;
    }

isHandoverAttachmentSelected(item: ProjectHandoverAttachmentChecklistItem): boolean {
        return item.selectionId !== null && this.selectedHandoverAttachmentSelectionIds().has(item.selectionId);
    }

toggleHandoverAttachmentSelection(item: ProjectHandoverAttachmentChecklistItem, event: Event): void {
        if (!item.selectionId || !this.canSelectHandoverAttachment(item)) {
            return;
        }

        const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
        const next = new Set(this.selectedHandoverAttachmentSelectionIds());
        if (checked) {
            next.add(item.selectionId);
        } else {
            next.delete(item.selectionId);
        }
        this.selectedHandoverAttachmentSelectionIds.set(next);
    }

handoverAttachmentStatusLabel(status: ProjectHandoverAttachmentChecklistItemStatus): string {
        return ATTACHMENT_CHECKLIST_STATUS_LABELS[status];
    }

handoverAttachmentStatusSeverity(status: ProjectHandoverAttachmentChecklistItemStatus): UiTagSeverity {
        return ATTACHMENT_CHECKLIST_STATUS_SEVERITIES[status];
    }

downloadPackageStatusLabel(status: AttachmentDownloadPackageStatus): string {
        return DOWNLOAD_PACKAGE_STATUS_LABELS[status];
    }

downloadPackageStatusSeverity(status: AttachmentDownloadPackageStatus): UiTagSeverity {
        return DOWNLOAD_PACKAGE_STATUS_SEVERITIES[status];
    }

canDownloadHandoverAttachmentPackage(downloadPackage: AttachmentDownloadPackageSummary): boolean {
        return downloadPackage.status === AttachmentDownloadPackageStatus.Ready && new Date(downloadPackage.expiresAt).getTime() > Date.now();
    }

handoverAttachmentSourceText(item: ProjectHandoverAttachmentChecklistItem): string {
        if (item.sourceRefs.length === 0) {
            return '来源待确认';
        }

        return item.sourceRefs
            .map((source) => `${this.handoverAttachmentSourceTypeLabel(source.sourceType)}${source.label ? ` ${source.label}` : ''}`)
            .join('、');
    }

formatDateTime(value: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

private syncSelectedHandoverAttachments(items: ProjectHandoverAttachmentChecklistItem[]): void {
        const selectedIds = items.filter((item) => this.canSelectHandoverAttachment(item)).map((item) => item.selectionId as string);
        this.selectedHandoverAttachmentSelectionIds.set(new Set(selectedIds));
    }

private handoverAttachmentSourceTypeLabel(sourceType: string): string {
        switch (sourceType) {
            case 'customer':
                return '客户';
            case 'lead':
                return '线索';
            case 'project':
                return '项目';
            case 'contract':
                return '合同';
            case 'sales-follow-up':
                return '销售跟进';
            case 'project-handover':
                return '项目移交';
            default:
                return sourceType;
        }
    }

    ngOnInit(): void { void this.loadHandoverAttachmentChecklist().catch(() => {
            this.selectedHandoverAttachmentSelectionIds.set(new Set());
        }); }
}
