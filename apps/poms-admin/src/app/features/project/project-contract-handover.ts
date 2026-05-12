import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { formatSensitiveAmountProjection } from '../../shared/ui/sensitive-visibility';
import { contractStatusLabelOrFallback as sharedContractStatusLabel, contractStatusSeverityOrFallback as sharedContractStatusSeverity } from '../../shared/ui/status-presentation';
import { type UiTagSeverity } from './project-presentation';

type ContractHandoverContractItem = ContractHandoverSummaryView['effectiveContractSetSummary']['contracts'][number];

const BASELINE_VALIDATION_STATUS_LABELS = ContractHandoverBaselineValidationStatusLabel as Record<ContractHandoverBaselineValidationStatus, string>;

const BASELINE_VALIDATION_STATUS_SEVERITIES = ContractHandoverBaselineValidationStatusSeverity as Record<ContractHandoverBaselineValidationStatus, UiTagSeverity>;

const CURRENT_BASELINE_STATUS_LABELS = ContractHandoverCurrentBaselineStatusLabel as Record<ContractHandoverCurrentBaselineStatus, string>;

const CURRENT_BASELINE_STATUS_SEVERITIES = ContractHandoverCurrentBaselineStatusSeverity as Record<ContractHandoverCurrentBaselineStatus, UiTagSeverity>;

const REBASELINE_STATUS_LABELS = ContractHandoverRebaselineStatusLabel as Record<ContractHandoverRebaselineStatus, string>;

const REBASELINE_STATUS_SEVERITIES = ContractHandoverRebaselineStatusSeverity as Record<ContractHandoverRebaselineStatus, UiTagSeverity>;

const REBASELINE_BLOCKING_STATUS_LABELS = ContractHandoverRebaselineBlockingStatusLabel as Record<ContractHandoverRebaselineBlockingStatus, string>;

const REBASELINE_BLOCKING_STATUS_SEVERITIES = ContractHandoverRebaselineBlockingStatusSeverity as Record<ContractHandoverRebaselineBlockingStatus, UiTagSeverity>;

const RECEIVABLE_PLAN_STATUS_LABELS = ContractHandoverReceivablePlanInitStatusLabel as Record<ContractHandoverReceivablePlanInitStatus, string>;

const RECEIVABLE_PLAN_STATUS_SEVERITIES = ContractHandoverReceivablePlanInitStatusSeverity as Record<ContractHandoverReceivablePlanInitStatus, UiTagSeverity>;

const HANDOVER_STATUS_LABELS = ProjectHandoverStatusLabel as Record<ProjectHandoverStatus, string>;

const HANDOVER_STATUS_SEVERITIES = ProjectHandoverStatusSeverity as Record<ProjectHandoverStatus, UiTagSeverity>;

const PARTICIPANT_CONFIRMATION_STATUS_LABELS = ProjectHandoverParticipantConfirmationStatusLabel as Record<ProjectHandoverParticipantConfirmationStatus, string>;

const PARTICIPANT_CONFIRMATION_STATUS_SEVERITIES = ProjectHandoverParticipantConfirmationStatusSeverity as Record<ProjectHandoverParticipantConfirmationStatus, UiTagSeverity>;

const RECEIPT_JUDGMENT_STATUS_LABELS = ProjectHandoverReceiptJudgmentFreezeStatusLabel as Record<ProjectHandoverReceiptJudgmentFreezeStatus, string>;

const RECEIPT_JUDGMENT_STATUS_SEVERITIES = ProjectHandoverReceiptJudgmentFreezeStatusSeverity as Record<ProjectHandoverReceiptJudgmentFreezeStatus, UiTagSeverity>;

const BASELINE_SOURCE_LABELS = ContractHandoverCurrentBaselineSourceTypeLabel as Record<ContractHandoverCurrentBaselineSourceType, string>;

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

@Component({
    selector: 'app-project-contract-handover',
    standalone: true,
    imports: [CommonModule, ButtonModule, SectionCard, TableModule, TagModule, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取合同承接" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="合同承接暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (summary() && handover()) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="承接判断" caption="先确认合同是否已稳定，再判断是否可以进入正式移交。" [items]="handoverCommandItems()" />

                <section-card>
                    <ng-template #title>当前有效合同集合</ng-template>
                    <ng-template #description>合同集合是进入移交确认的上游事实，不在前端重新计算口径。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="contractSetItems()" [columns]="3" />

                    <p-table class="mt-4 block p-datatable-sm" [value]="contractItems()" [rowHover]="true" [paginator]="contractItems().length > 5" [rows]="5" [scrollable]="true" [tableStyle]="{ 'min-width': '48rem' }">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>合同编号</th>
                                <th>状态</th>
                                <th>签约金额</th>
                                <th>签约时间</th>
                                <th>当前快照</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-contract>
                            <tr>
                                <td class="font-medium text-surface-950 dark:text-surface-0">{{ contract.contractNo }}</td>
                                <td>
                                    <p-tag [value]="contractStatusLabel(contract.status)" [severity]="contractStatusSeverity(contract.status)" class="rounded-[6px]!" />
                                </td>
                                <td>{{ formatSensitiveAmountProjection(contract.signedAmountProjection, contract.currencyCode) }}</td>
                                <td>{{ formatDateTime(contract.signedAt) }}</td>
                                <td>{{ contract.currentSnapshotId ?? '待确认' }}</td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="5">当前没有有效合同集合记录。</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </section-card>

                <section-card>
                    <ng-template #title>承接基线与前置项</ng-template>
                    <ng-template #description>这里展示当前承接口径是否稳定，以及缺失项是否会阻断进入移交。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="baselineItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>再基线化与回款计划</ng-template>
                    <ng-template #description>合同变更后必须明确当前移交前有效基线，不能沿用过期承接口径。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="rebaselineItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>正式移交状态</ng-template>
                    <ng-template #description>移交确认、参与人确认和回款判断口径共同决定是否能进入执行主线。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="projectHandoverItems()" [columns]="3" />

                    @if (handoverBlockers().length > 0) {
                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前阻断项" [detail]="handoverBlockersText()" />
                    }

                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="查看提成阶段解释" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>附件移交清单</ng-template>
                    <ng-template #description>清单由后端扫描项目、来源线索、合同和跟进附件生成，前端只选择本次下载包的纳入项。</ng-template>

                    @if (!handover()?.handoverId) {
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
                                <ng-template pTemplate="header">
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
                                <ng-template pTemplate="body" let-item>
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
                                <ng-template pTemplate="emptymessage">
                                    <tr>
                                        <td colspan="7">当前没有可展示的附件移交清单。</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    }
                </section-card>
            </div>
        }
    `
})
export class ProjectContractHandover implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly summary = this.#workspaceStore.contractHandoverSummary;
    readonly handover = this.#workspaceStore.projectHandoverDetail;
    readonly loading = this.#workspaceStore.loadingContractHandover;
    readonly error = this.#workspaceStore.contractHandoverError;
    readonly handoverAttachmentChecklist = this.#workspaceStore.handoverAttachmentChecklist;
    readonly handoverAttachmentDownloadPackage = this.#workspaceStore.handoverAttachmentDownloadPackage;
    readonly loadingHandoverAttachments = this.#workspaceStore.loadingHandoverAttachments;
    readonly refreshingHandoverAttachments = this.#workspaceStore.refreshingHandoverAttachments;
    readonly creatingHandoverAttachmentPackage = this.#workspaceStore.creatingHandoverAttachmentPackage;
    readonly downloadingHandoverAttachmentPackage = this.#workspaceStore.downloadingHandoverAttachmentPackage;
    readonly handoverAttachmentError = this.#workspaceStore.handoverAttachmentError;
    readonly formatSensitiveAmountProjection = formatSensitiveAmountProjection;
    readonly selectedHandoverAttachmentSelectionIds = signal<Set<string>>(new Set());
    readonly selectedHandoverAttachmentCount = computed(() => this.selectedHandoverAttachmentSelectionIds().size);

    readonly handoverCommandItems = computed<WorkspaceCommandPanelItem[]>(() => {
        const summary = this.summary();
        const handover = this.handover();
        if (!summary || !handover) {
            return [];
        }

        return [
            {
                label: '合同集合',
                value: `${summary.effectiveContractSetSummary.activeContractCount} 份有效合同`,
                icon: 'pi pi-file'
            },
            {
                label: '承接基线',
                value: this.currentBaselineStatusLabel(summary.currentHandoverBaselineSummary.status),
                icon: 'pi pi-sitemap'
            },
            {
                label: '再基线化',
                value: this.rebaselineStatusLabel(summary.latestHandoverRebaselineSummary.status),
                icon: 'pi pi-refresh'
            },
            {
                label: '移交确认',
                value: this.handoverStatusLabel(handover.handoverStatus),
                icon: 'pi pi-verified'
            },
            {
                label: '当前缺口',
                value: this.blockingSummary(),
                icon: 'pi pi-exclamation-circle'
            }
        ];
    });

    readonly handoverBlockers = computed(() => {
        const summary = this.summary();
        const handover = this.handover();
        return [...(summary?.blockingReasons ?? []), ...(handover?.blockingReasons ?? [])];
    });

    private async loadContractHandoverWorkspace(projectId: string): Promise<void> {
        try {
            await this.#workspaceStore.loadContractHandover(projectId);
            await this.loadHandoverAttachmentChecklist();
        } catch {
            this.selectedHandoverAttachmentSelectionIds.set(new Set());
        }
    }

    async refreshHandoverAttachmentChecklist(): Promise<void> {
        const handoverId = this.handover()?.handoverId;
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
        const handoverId = this.handover()?.handoverId;
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
        const handoverId = this.handover()?.handoverId;
        if (!handoverId) {
            this.selectedHandoverAttachmentSelectionIds.set(new Set());
            return;
        }

        const checklist = await this.#workspaceStore.loadHandoverAttachmentChecklist(handoverId);
        this.syncSelectedHandoverAttachments(checklist.items);
    }

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.loadContractHandoverWorkspace(projectId);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    contractItems(): ContractHandoverContractItem[] {
        return this.summary()?.effectiveContractSetSummary.contracts ?? [];
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

    contractSetItems(): WorkspaceFactGridItem[] {
        const current = this.summary();
        if (!current) {
            return [];
        }

        const contractSet = current.effectiveContractSetSummary;
        return [
            {
                label: '有效合同数量',
                value: contractSet.activeContractCount,
                emphasis: true
            },
            {
                label: '有效合同额',
                value: this.formatSensitiveAmountProjection(contractSet.totalSignedAmountProjection, contractSet.currencyCodes.join(' / ')),
                emphasis: true
            },
            {
                label: '合同编号',
                value: contractSet.contractNos.length > 0 ? contractSet.contractNos.join('、') : '待确认'
            },
            {
                label: '最早签约',
                value: this.formatDateTime(contractSet.earliestSignedAt)
            },
            {
                label: '最新签约',
                value: this.formatDateTime(contractSet.latestSignedAt)
            },
            {
                label: '摘要快照',
                value: current.contractSummarySnapshotId ?? '待生成'
            }
        ];
    }

    baselineItems(): WorkspaceFactGridItem[] {
        const current = this.summary();
        if (!current) {
            return [];
        }

        const validation = current.contractBaselineValidationSummary;
        const baseline = current.currentHandoverBaselineSummary;
        return [
            {
                label: '基线校验',
                value: this.baselineValidationStatusLabel(validation.status),
                severity: this.baselineValidationSeverity(validation.status),
                detail: validation.blockingReasonSummary ?? `缺失前置项 ${validation.missingPrerequisiteCount} 项`
            },
            {
                label: '合同快照初始化',
                value: validation.initializedContractSnapshotId ?? '待确认',
                detail: this.formatDateTime(validation.contractSnapshotInitializedAt)
            },
            {
                label: '商业放行包',
                value: validation.readinessPackageId ?? '待确认',
                detail: validation.guardDecision ?? validation.packageStatus ?? '待确认'
            },
            {
                label: '当前承接基线',
                value: this.currentBaselineStatusLabel(baseline.status),
                severity: this.currentBaselineSeverity(baseline.status),
                detail: baseline.summary
            },
            {
                label: '基线快照',
                value: baseline.baselineSnapshotId ?? '待确认',
                detail: this.sourceTypeLabel(baseline.sourceType)
            },
            {
                label: '来源记录',
                value: baseline.sourceId ?? '待确认'
            }
        ];
    }

    rebaselineItems(): WorkspaceFactGridItem[] {
        const current = this.summary();
        if (!current) {
            return [];
        }

        const rebaseline = current.latestHandoverRebaselineSummary;
        const receivable = current.receivablePlanInitSummary;
        return [
            {
                label: '再基线化状态',
                value: this.rebaselineStatusLabel(rebaseline.status),
                severity: this.rebaselineStatusSeverity(rebaseline.status),
                detail: rebaseline.rebaselineRecordId ?? '当前没有再基线化记录'
            },
            {
                label: '阻断状态',
                value: this.rebaselineBlockingStatusLabel(rebaseline.blockingStatus),
                severity: this.rebaselineBlockingSeverity(rebaseline.blockingStatus),
                detail: rebaseline.impactSummary ?? `影响项 ${rebaseline.impactItemCount} 项`
            },
            {
                label: '生效后基线',
                value: rebaseline.effectiveBaselineAfterId ?? '待确认',
                detail: this.formatDateTime(rebaseline.handledAt)
            },
            {
                label: '回款计划',
                value: this.receivablePlanStatusLabel(receivable.status),
                severity: this.receivablePlanStatusSeverity(receivable.status),
                detail: receivable.summary
            },
            {
                label: '回款计划版本',
                value: receivable.initializedReceivablePlanVersionId ?? '待确认'
            },
            {
                label: '初始化时间',
                value: this.formatDateTime(receivable.receivablePlanInitializedAt)
            }
        ];
    }

    projectHandoverItems(): WorkspaceFactGridItem[] {
        const current = this.handover();
        if (!current) {
            return [];
        }

        const participant = current.participantConfirmationSummary;
        const receipt = current.receiptJudgmentModeSummary;
        return [
            {
                label: '移交状态',
                value: this.handoverStatusLabel(current.handoverStatus),
                severity: this.handoverStatusSeverity(current.handoverStatus),
                detail: current.confirmedAt ? `确认时间 ${this.formatDateTime(current.confirmedAt)}` : '尚未完成移交确认'
            },
            {
                label: '确认人',
                value: current.confirmedBy ?? '待确认',
                detail: current.comment ?? null
            },
            {
                label: '参与人确认',
                value: this.participantStatusLabel(participant.status),
                severity: this.participantStatusSeverity(participant.status),
                detail: `${participant.confirmedCount}/${participant.requiredCount} 已确认，${participant.pendingCount} 待确认`
            },
            {
                label: '回款判断口径',
                value: this.receiptJudgmentStatusLabel(receipt.status),
                severity: this.receiptJudgmentStatusSeverity(receipt.status),
                detail: receipt.summary
            },
            {
                label: '移交摘要快照',
                value: current.summarySnapshotId ?? '待生成',
                detail: current.summaryPackageKey ?? '待确认'
            },
            {
                label: '投影与导出',
                value: current.projectionLevel ?? '待确认',
                detail: current.exportPolicy ?? '待确认'
            }
        ];
    }

    handoverBlockersText(): string {
        const blockers = this.handoverBlockers();
        return blockers.length > 0 ? blockers.join('；') : '当前没有阻断项。';
    }

    blockingSummary(): string {
        const blockers = this.handoverBlockers();
        return blockers.length > 0 ? `${blockers.length} 项阻断` : '当前没有阻断';
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

    contractStatusLabel(status: string): string {
        return sharedContractStatusLabel(status);
    }

    contractStatusSeverity(status: string): UiTagSeverity {
        return sharedContractStatusSeverity(status);
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

    baselineValidationStatusLabel(status: ContractHandoverBaselineValidationStatus): string {
        return BASELINE_VALIDATION_STATUS_LABELS[status];
    }

    baselineValidationSeverity(status: ContractHandoverBaselineValidationStatus): UiTagSeverity {
        return BASELINE_VALIDATION_STATUS_SEVERITIES[status];
    }

    currentBaselineStatusLabel(status: ContractHandoverCurrentBaselineStatus): string {
        return CURRENT_BASELINE_STATUS_LABELS[status];
    }

    currentBaselineSeverity(status: ContractHandoverCurrentBaselineStatus): UiTagSeverity {
        return CURRENT_BASELINE_STATUS_SEVERITIES[status];
    }

    rebaselineStatusLabel(status: ContractHandoverRebaselineStatus): string {
        return REBASELINE_STATUS_LABELS[status];
    }

    rebaselineStatusSeverity(status: ContractHandoverRebaselineStatus): UiTagSeverity {
        return REBASELINE_STATUS_SEVERITIES[status];
    }

    rebaselineBlockingStatusLabel(status: ContractHandoverRebaselineBlockingStatus): string {
        return REBASELINE_BLOCKING_STATUS_LABELS[status];
    }

    rebaselineBlockingSeverity(status: ContractHandoverRebaselineBlockingStatus): UiTagSeverity {
        return REBASELINE_BLOCKING_STATUS_SEVERITIES[status];
    }

    receivablePlanStatusLabel(status: ContractHandoverReceivablePlanInitStatus): string {
        return RECEIVABLE_PLAN_STATUS_LABELS[status];
    }

    receivablePlanStatusSeverity(status: ContractHandoverReceivablePlanInitStatus): UiTagSeverity {
        return RECEIVABLE_PLAN_STATUS_SEVERITIES[status];
    }

    handoverStatusLabel(status: ProjectHandoverStatus): string {
        return HANDOVER_STATUS_LABELS[status];
    }

    handoverStatusSeverity(status: ProjectHandoverStatus): UiTagSeverity {
        return HANDOVER_STATUS_SEVERITIES[status];
    }

    participantStatusLabel(status: ProjectHandoverParticipantConfirmationStatus): string {
        return PARTICIPANT_CONFIRMATION_STATUS_LABELS[status];
    }

    participantStatusSeverity(status: ProjectHandoverParticipantConfirmationStatus): UiTagSeverity {
        return PARTICIPANT_CONFIRMATION_STATUS_SEVERITIES[status];
    }

    receiptJudgmentStatusLabel(status: ProjectHandoverReceiptJudgmentFreezeStatus): string {
        return RECEIPT_JUDGMENT_STATUS_LABELS[status];
    }

    receiptJudgmentStatusSeverity(status: ProjectHandoverReceiptJudgmentFreezeStatus): UiTagSeverity {
        return RECEIPT_JUDGMENT_STATUS_SEVERITIES[status];
    }

    sourceTypeLabel(sourceType: ContractHandoverCurrentBaselineSourceType): string {
        return BASELINE_SOURCE_LABELS[sourceType];
    }
}
