import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, type OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
    ExternalDepartmentMappingReviewState,
    ExternalDepartmentMappingStatus,
    type ExternalDepartmentMappingSummary,
    ExternalOrgProvider,
    ExternalOrgSourceStatus,
    ExternalOrgSyncStore,
    type ExternalOrgSourceSummary,
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderConnectionDiagnosticStatus,
    IdentityProviderConnectionTestCapability,
    IdentityProviderConnectionTestStatus,
    IdentityProviderStore,
    type IdentityProviderConfigSummary,
    type IdentityProviderConnectionTestResult,
    OrgSyncDiffAction,
    type OrgSyncDiffItemSummary,
    OrgSyncDiffItemStatus,
    type OrgSyncRunSummary,
    OrgSyncRunStatus,
    PlatformStore,
    type PlatformOrgUnitSummary
} from '@poms/admin-data-access';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { AdminTableCard } from '../../shared/ui/admin-table-card';

interface SelectOption<T> {
    label: string;
    value: T;
    disabled?: boolean;
}

interface ExternalOrgSourceForm {
    provider: ExternalOrgProvider;
    externalTenantId: string;
    displayName: string;
    providerConfigId: string | null;
    authoritativeOrgUnitId: string | null;
    externalRootDepartmentId: string;
    syncScopesText: string;
}

interface ProviderConfigDiagnosticEntry {
    rootDepartmentId: string;
    result: IdentityProviderConnectionTestResult;
}

type SourceWizardStep = 'platform' | 'connection' | 'scope' | 'review';
type SyncRunWorkbenchView = 'preview' | 'history';
type MappingReviewStateFilter = ExternalDepartmentMappingReviewState | 'all';

interface SourceWizardStepOption {
    key: SourceWizardStep;
    label: string;
    icon: string;
}

function apiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
        const body = error.error as { message?: unknown } | string | null;
        if (typeof body === 'string' && body.trim()) return body;
        if (body && typeof body === 'object') {
            const message = body.message;
            if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).join('；') || fallback;
            if (typeof message === 'string' && message.trim()) return message;
        }
        return fallback;
    }
    const message = error instanceof Error ? error.message.trim() : '';
    return message || fallback;
}

@Component({
    selector: 'app-external-org-sync-workbench',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, ButtonModule, CheckboxModule, ConfirmDialogModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule, TextareaModule, ToastModule, TooltipModule, AdminTableCard],
    providers: [ExternalOrgSyncStore, IdentityProviderStore, ConfirmationService, MessageService],
    template: `
        <p-toast />
        <p-confirmDialog />
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 class="text-2xl font-semibold text-surface-950 dark:text-surface-0">外部组织同步</h1>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                        <p-tag value="组织架构" severity="secondary" />
                        <p-tag [value]="'同步源 ' + syncStore.sources().length" severity="info" />
                        <p-tag [value]="'映射 ' + syncStore.mappings().length" severity="success" />
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <p-button icon="pi pi-refresh" severity="secondary" [text]="true" pTooltip="刷新" tooltipPosition="top" ariaLabel="刷新同步源" [loading]="syncStore.loadingSources()" (onClick)="refresh()" />
                    <p-button icon="pi pi-plus" label="新建同步源" severity="secondary" (onClick)="openCreateSourceDialog()" />
                    <p-button icon="pi pi-play" label="生成预览" [disabled]="!canCreatePreview()" [loading]="syncStore.creatingRun()" pTooltip="根据当前同步源生成差异预览" tooltipPosition="top" (onClick)="createPreviewRun()" />
                </div>
            </section>

            <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
                <app-admin-table-card>
                    <div adminToolbarStart class="flex items-center gap-2">
                        <i class="pi pi-database text-primary"></i>
                        <span class="font-medium text-surface-950 dark:text-surface-0">同步源</span>
                    </div>
                    <p-table [value]="syncStore.sources()" dataKey="id" [rowHover]="true" responsiveLayout="scroll" [tableStyle]="{ width: '100%', 'min-width': '28rem' }" [pt]="{ root: { class: 'border-none!' } }">
                        <ng-template #header>
                            <tr>
                                <th>名称</th>
                                <th>状态</th>
                                <th style="width: 10rem">操作</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-source>
                            <tr [ngClass]="{ 'bg-primary-50 dark:bg-primary-900': source.id === syncStore.selectedSourceId() }">
                                <td>
                                    <button type="button" class="flex w-full flex-col items-start gap-1 text-left" (click)="selectSource(source)" [attr.aria-label]="'选择同步源 ' + source.displayName">
                                        <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ source.displayName }}</span>
                                        <span class="text-xs text-surface-500">{{ providerLabel(source.provider) }} · {{ rootDepartmentLabel(source.externalRootDepartmentId) }}</span>
                                    </button>
                                </td>
                                <td>
                                    <p-tag [value]="sourceStatusLabel(source.status)" [severity]="sourceStatusSeverity(source.status)" />
                                </td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        <p-button
                                            icon="pi pi-pencil"
                                            [rounded]="true"
                                            [text]="true"
                                            severity="secondary"
                                            size="small"
                                            [pTooltip]="source.status === externalOrgSourceStatus.Archived ? '已归档，不能编辑' : '编辑'"
                                            tooltipPosition="top"
                                            ariaLabel="编辑同步源"
                                            [disabled]="source.status === externalOrgSourceStatus.Archived"
                                            (onClick)="openEditSourceDialog(source)"
                                        />
                                        <p-button
                                            [icon]="source.status === externalOrgSourceStatus.Active ? 'pi pi-pause' : 'pi pi-check'"
                                            [rounded]="true"
                                            [text]="true"
                                            size="small"
                                            [severity]="source.status === externalOrgSourceStatus.Active ? 'warn' : 'success'"
                                            [pTooltip]="source.status === externalOrgSourceStatus.Active ? '暂停' : '启用'"
                                            tooltipPosition="top"
                                            [ariaLabel]="source.status === externalOrgSourceStatus.Active ? '暂停同步源' : '启用同步源'"
                                            [disabled]="source.status === externalOrgSourceStatus.Archived || syncStore.savingSource()"
                                            (onClick)="toggleSourceStatus(source)"
                                        />
                                        <p-button
                                            icon="pi pi-archive"
                                            [rounded]="true"
                                            [text]="true"
                                            severity="danger"
                                            size="small"
                                            [pTooltip]="archiveSourceTooltip(source)"
                                            tooltipPosition="top"
                                            ariaLabel="归档同步源"
                                            [disabled]="!canArchiveSource(source) || syncStore.savingSource()"
                                            (onClick)="confirmArchiveSource(source)"
                                        />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="3" class="py-8 text-center text-surface-400">{{ syncStore.loadingSources() ? '加载中...' : '暂无同步源' }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </app-admin-table-card>

                <div class="flex min-w-0 flex-col gap-5">
                    <section class="card rounded-[8px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
                        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div class="text-sm font-medium text-surface-500">当前同步源</div>
                                <div class="mt-1 text-xl font-semibold text-surface-950 dark:text-surface-0">{{ syncStore.selectedSource()?.displayName ?? '未选择' }}</div>
                            </div>
                            @if (syncStore.selectedSource(); as source) {
                                <div class="flex flex-wrap items-center gap-2">
                                    <p-tag [value]="providerLabel(source.provider)" severity="info" />
                                    <p-tag [value]="sourceStatusLabel(source.status)" [severity]="sourceStatusSeverity(source.status)" />
                                    <p-tag [value]="'v' + source.rowVersion" severity="secondary" />
                                </div>
                            }
                        </div>
                        @if (syncStore.selectedSource(); as source) {
                            <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-800">
                                    <div class="text-xs text-surface-500">租户</div>
                                    <div class="mt-2 truncate text-sm font-medium text-surface-950 dark:text-surface-0">{{ source.externalTenantId ?? '—' }}</div>
                                </div>
                                <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-800">
                                    <div class="text-xs text-surface-500">根部门</div>
                                    <div class="mt-2 truncate text-sm font-medium text-surface-950 dark:text-surface-0">{{ rootDepartmentLabel(source.externalRootDepartmentId) }}</div>
                                </div>
                                <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-800">
                                    <div class="text-xs text-surface-500">权威组织</div>
                                    <div class="mt-2 truncate text-sm font-medium text-surface-950 dark:text-surface-0">{{ orgUnitName(source.authoritativeOrgUnitId) }}</div>
                                </div>
                                <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-800">
                                    <div class="text-xs text-surface-500">范围</div>
                                    <div class="mt-2 truncate text-sm font-medium text-surface-950 dark:text-surface-0">{{ source.syncScopes.join(', ') || '—' }}</div>
                                </div>
                            </div>
                        } @else {
                            <div class="mt-5 rounded-[8px] border border-dashed border-surface-300 px-4 py-8 text-center text-sm text-surface-500 dark:border-surface-700">请选择或新建同步源</div>
                        }
                    </section>

                    <app-admin-table-card>
                        <div adminToolbarStart class="flex items-center gap-2">
                            <i class="pi pi-sitemap text-primary"></i>
                            <span class="font-medium text-surface-950 dark:text-surface-0">外部部门映射</span>
                        </div>
                        <div adminToolbarEnd class="flex flex-wrap items-center gap-2">
                            <p-select
                                [ngModel]="mappingReviewStateFilter()"
                                (ngModelChange)="mappingReviewStateFilter.set($event)"
                                [options]="mappingReviewStateFilterOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                class="w-36 rounded-md!"
                            />
                            <span class="p-input-icon-left">
                                <i class="pi pi-search"></i>
                                <input pInputText [ngModel]="mappingSearchText()" (ngModelChange)="mappingSearchText.set($event)" placeholder="搜索外部部门或组织" class="w-56" />
                            </span>
                            <span class="text-sm text-surface-500">共 {{ filteredMappings().length }} / {{ syncStore.mappings().length }} 条</span>
                        </div>
                        <p-table
                            [value]="filteredMappings()"
                            [paginator]="true"
                            [rows]="8"
                            dataKey="id"
                            [rowHover]="true"
                            responsiveLayout="scroll"
                            [tableStyle]="{ width: '100%', 'min-width': '84rem' }"
                            [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>外部部门</th>
                                    <th>上级外部部门</th>
                                    <th>POMS 组织</th>
                                    <th>处理状态</th>
                                    <th>冲突/失效原因</th>
                                    <th>最近发现</th>
                                    <th style="width: 13rem">操作</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-mapping>
                                <tr>
                                    <td>
                                        <div class="flex flex-col gap-1">
                                            <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ mapping.externalDepartmentName }}</span>
                                            <span class="font-mono text-xs text-surface-400">{{ mapping.externalDepartmentId }}</span>
                                        </div>
                                    </td>
                                    <td class="font-mono text-xs text-surface-500">{{ mapping.externalParentDepartmentId ?? '—' }}</td>
                                    <td class="text-sm text-surface-700 dark:text-surface-200">{{ orgUnitName(mapping.orgUnitId) }}</td>
                                    <td><p-tag [value]="mappingReviewStateLabel(mapping.reviewState)" [severity]="mappingReviewStateSeverity(mapping.reviewState)" /></td>
                                    <td class="max-w-96 text-sm text-surface-500">
                                        <div class="line-clamp-2">{{ mapping.conflictReason ?? '—' }}</div>
                                        @if (mapping.lastConflictRunId) {
                                            <button type="button" class="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary" (click)="openMappingConflictRun(mapping)">
                                                <i class="pi pi-list-check"></i>
                                                查看来源差异
                                            </button>
                                        }
                                    </td>
                                    <td class="text-sm text-surface-500">{{ formatDateTime(mapping.lastSeenAt) }}</td>
                                    <td>
                                        <div class="flex items-center gap-1">
                                            <p-button
                                                icon="pi pi-link"
                                                [rounded]="true"
                                                [text]="true"
                                                size="small"
                                                severity="secondary"
                                                [pTooltip]="canEditMappings() ? '映射到 POMS 组织' : '已归档，不能处理映射'"
                                                tooltipPosition="top"
                                                ariaLabel="映射到 POMS 组织"
                                                [disabled]="!canEditMappings() || isMappingSaving(mapping)"
                                                [loading]="isMappingSaving(mapping)"
                                                (onClick)="openMappingDialog(mapping)"
                                            />
                                            <p-button
                                                icon="pi pi-unlink"
                                                [rounded]="true"
                                                [text]="true"
                                                size="small"
                                                severity="warn"
                                                pTooltip="解除映射"
                                                tooltipPosition="top"
                                                ariaLabel="解除映射"
                                                [disabled]="!canUnmapMapping(mapping)"
                                                [loading]="isMappingSaving(mapping)"
                                                (onClick)="confirmUnmapMapping(mapping)"
                                            />
                                            @if (mapping.reviewState === externalDepartmentMappingReviewState.Ignored) {
                                                <p-button
                                                    icon="pi pi-refresh"
                                                    [rounded]="true"
                                                    [text]="true"
                                                    size="small"
                                                    severity="success"
                                                    pTooltip="恢复处理"
                                                    tooltipPosition="top"
                                                    ariaLabel="恢复处理"
                                                    [disabled]="!canRestoreMapping(mapping)"
                                                    [loading]="isMappingSaving(mapping)"
                                                    (onClick)="confirmRestoreMapping(mapping)"
                                                />
                                            } @else {
                                                <p-button
                                                    icon="pi pi-eye-slash"
                                                    [rounded]="true"
                                                    [text]="true"
                                                    size="small"
                                                    severity="secondary"
                                                    pTooltip="忽略该外部部门"
                                                    tooltipPosition="top"
                                                    ariaLabel="忽略该外部部门"
                                                    [disabled]="!canIgnoreMapping(mapping)"
                                                    [loading]="isMappingSaving(mapping)"
                                                    (onClick)="confirmIgnoreMapping(mapping)"
                                                />
                                            }
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template #emptymessage>
                                <tr>
                                    <td colspan="7" class="py-8 text-center text-surface-400">{{ mappingEmptyMessage() }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </app-admin-table-card>
                </div>
            </div>

            <app-admin-table-card>
                <div adminToolbarStart class="flex items-center gap-2">
                    <i class="pi pi-list-check text-primary"></i>
                    <span class="font-medium text-surface-950 dark:text-surface-0">{{ syncRunView() === 'preview' ? '同步预览' : '运行历史' }}</span>
                    @if (syncStore.previewStale()) {
                        <p-tag value="映射已变更" severity="warn" />
                    }
                    @if (syncRunView() === 'preview') {
                        @if (syncStore.activeRun(); as run) {
                            <p-tag [value]="runStatusLabel(run.status)" [severity]="runStatusSeverity(run.status)" />
                        }
                    }
                </div>
                <div adminToolbarEnd class="flex flex-wrap items-center gap-2">
                    <div class="inline-flex rounded-md border border-surface-200 bg-surface-0 p-1 dark:border-surface-700 dark:bg-surface-900">
                        <button
                            type="button"
                            class="rounded px-3 py-1.5 text-sm font-medium"
                            [ngClass]="syncRunView() === 'preview' ? 'bg-primary text-primary-contrast' : 'text-surface-600 hover:text-surface-950 dark:text-surface-300 dark:hover:text-surface-0'"
                            (click)="setSyncRunView('preview')"
                        >
                            当前预览
                        </button>
                        <button
                            type="button"
                            class="rounded px-3 py-1.5 text-sm font-medium"
                            [ngClass]="syncRunView() === 'history' ? 'bg-primary text-primary-contrast' : 'text-surface-600 hover:text-surface-950 dark:text-surface-300 dark:hover:text-surface-0'"
                            (click)="setSyncRunView('history')"
                        >
                            运行历史
                        </button>
                    </div>
                    @if (syncRunView() === 'preview') {
                        @if (syncStore.activeRun(); as run) {
                            <span class="hidden text-sm text-surface-500 md:inline">差异 {{ syncStore.diffItems().length }} 条</span>
                            <p-button icon="pi pi-check" label="应用选中" [disabled]="!canApplyRun()" [loading]="syncStore.applyingRun()" (onClick)="applySelectedDiffItems(run.id)" />
                        }
                    } @else if (syncRunView() === 'history') {
                        <p-button icon="pi pi-refresh" label="刷新历史" [text]="true" [loading]="syncStore.loadingRunHistory()" (onClick)="refreshRunHistory()" />
                    }
                </div>
                @if (syncRunView() === 'preview') {
                    @if (syncStore.previewStale()) {
                        <div class="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                            部门映射已经变更，当前预览可能不是最新结果。请重新生成预览后再应用差异。
                        </div>
                    }
                    @if (syncStore.activeRun(); as run) {
                        @if (run.status === orgSyncRunStatus.Failed) {
                            <div class="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                                <div class="flex items-center gap-2 font-medium">
                                    <i class="pi pi-exclamation-triangle"></i>
                                    <span>预览失败</span>
                                </div>
                                <p class="mt-2 leading-6">{{ previewFailureDetail(run) }}</p>
                                <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-red-700 dark:text-red-300">
                                    <span>开始 {{ formatDateTime(run.startedAt) }}</span>
                                    <span>结束 {{ formatDateTime(run.finishedAt) }}</span>
                                    <button type="button" class="font-medium text-red-900 underline underline-offset-2 dark:text-red-100" (click)="openRunDetail(run)">查看诊断</button>
                                </div>
                            </div>
                        } @else if (run.status === orgSyncRunStatus.Previewed && run.totalItemCount === 0) {
                            <div class="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                                预览已完成，当前没有需要处理的组织差异。
                            </div>
                        }
                    }
                    <p-table
                        [value]="syncStore.diffItems()"
                        [paginator]="true"
                        [rows]="10"
                        dataKey="id"
                        [rowHover]="true"
                        responsiveLayout="scroll"
                        [tableStyle]="{ width: '100%', 'min-width': '72rem' }"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #header>
                            <tr>
                                <th style="width: 4rem">
                                    <p-checkbox [binary]="true" [ngModel]="allSelectableDiffItemsSelected()" (ngModelChange)="toggleAllDiffItems($event)" inputId="selectAllOrgSyncDiffItems" />
                                </th>
                                <th>动作</th>
                                <th>外部部门</th>
                                <th>目标组织</th>
                                <th>状态</th>
                                <th>错误</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-item>
                            <tr>
                                <td>
                                    <p-checkbox [binary]="true" [ngModel]="isDiffItemSelected(item.id)" (ngModelChange)="toggleDiffItem(item.id, $event)" [disabled]="!isSelectableDiffItem(item)" [inputId]="'diffItem' + item.id" />
                                </td>
                                <td><p-tag [value]="diffActionLabel(item.action)" [severity]="diffActionSeverity(item.action)" /></td>
                                <td>
                                    <div class="flex flex-col gap-1">
                                        <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ candidateName(item) }}</span>
                                        <span class="font-mono text-xs text-surface-400">{{ item.externalDepartmentId }}</span>
                                    </div>
                                </td>
                                <td class="text-sm text-surface-700 dark:text-surface-200">{{ orgUnitName(item.orgUnitId) }}</td>
                                <td><p-tag [value]="diffStatusLabel(item.status)" [severity]="diffStatusSeverity(item.status)" /></td>
                                <td class="max-w-80 truncate text-sm text-surface-500">{{ item.errorMessage ?? '—' }}</td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="6" class="py-8 text-center text-surface-400">{{ previewEmptyMessage() }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                } @else {
                    <p-table
                        [value]="syncStore.runHistory()"
                        [paginator]="true"
                        [rows]="8"
                        dataKey="id"
                        [rowHover]="true"
                        responsiveLayout="scroll"
                        [tableStyle]="{ width: '100%', 'min-width': '64rem' }"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #header>
                            <tr>
                                <th>状态</th>
                                <th>开始时间</th>
                                <th>耗时</th>
                                <th>差异</th>
                                <th>失败</th>
                                <th>错误摘要</th>
                                <th>操作</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-run>
                            <tr>
                                <td><p-tag [value]="runStatusLabel(run.status)" [severity]="runStatusSeverity(run.status)" /></td>
                                <td class="text-sm text-surface-700 dark:text-surface-200">{{ formatDateTime(run.startedAt) }}</td>
                                <td class="text-sm text-surface-500">{{ runDurationLabel(run) }}</td>
                                <td class="text-sm text-surface-700 dark:text-surface-200">{{ runDiffCountLabel(run) }}</td>
                                <td class="text-sm text-surface-700 dark:text-surface-200">{{ run.failedItemCount }}</td>
                                <td class="max-w-96 truncate text-sm text-surface-500">{{ run.diagnosticSummary?.message ?? run.errorSummary ?? '—' }}</td>
                                <td>
                                    <p-button icon="pi pi-eye" label="详情" [text]="true" [loading]="isRunDetailLoading(run)" (onClick)="openRunDetail(run)" />
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="7" class="py-8 text-center text-surface-400">{{ runHistoryEmptyMessage() }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                }
            </app-admin-table-card>

            <p-dialog [(visible)]="runDetailDialogVisible" (onHide)="closeRunDetailDialog()" [modal]="true" header="同步运行详情" [style]="{ width: 'min(56rem, calc(100vw - 2rem))' }">
                @if (syncStore.selectedRunDetail(); as run) {
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-wrap items-center gap-2">
                            <p-tag [value]="runStatusLabel(run.status)" [severity]="runStatusSeverity(run.status)" />
                            <span class="text-sm text-surface-500">开始 {{ formatDateTime(run.startedAt) }}</span>
                            <span class="text-sm text-surface-500">结束 {{ formatDateTime(run.finishedAt) }}</span>
                            <span class="text-sm text-surface-500">耗时 {{ runDurationLabel(run) }}</span>
                        </div>

                        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div class="rounded-md border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500">差异</div>
                                <div class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ run.totalItemCount }}</div>
                            </div>
                            <div class="rounded-md border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500">批准</div>
                                <div class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ run.approvedItemCount }}</div>
                            </div>
                            <div class="rounded-md border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500">跳过</div>
                                <div class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ run.skippedItemCount }}</div>
                            </div>
                            <div class="rounded-md border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500">失败</div>
                                <div class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ run.failedItemCount }}</div>
                            </div>
                        </div>

                        @if (run.diagnosticSummary; as diagnostic) {
                            <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <div class="font-medium">{{ diagnostic.message }}</div>
                                    <p-button icon="pi pi-copy" label="复制诊断" size="small" [outlined]="true" severity="danger" (onClick)="copyRunDiagnostics(run)" />
                                </div>
                                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                                    @if (diagnostic.adapterStatus) {
                                        <span>Adapter {{ diagnostic.adapterStatus }}</span>
                                    }
                                    @if (diagnostic.providerCode) {
                                        <span>Code {{ diagnostic.providerCode }}</span>
                                    }
                                    @if (diagnostic.httpStatus) {
                                        <span>HTTP {{ diagnostic.httpStatus }}</span>
                                    }
                                </div>
                                @if (diagnostic.nextActions.length > 0) {
                                    <ul class="mt-3 list-disc space-y-1 pl-5">
                                        @for (action of diagnostic.nextActions; track action) {
                                            <li>{{ action }}</li>
                                        }
                                    </ul>
                                }
                            </div>
                        } @else if (run.errorSummary) {
                            <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <span>{{ run.errorSummary }}</span>
                                    <p-button icon="pi pi-copy" label="复制诊断" size="small" [outlined]="true" severity="danger" (onClick)="copyRunDiagnostics(run)" />
                                </div>
                            </div>
                        }

                        <p-table [value]="syncStore.selectedRunDiffItems()" [paginator]="true" [rows]="6" dataKey="id" responsiveLayout="scroll" [tableStyle]="{ width: '100%', 'min-width': '48rem' }">
                            <ng-template #header>
                                <tr>
                                    <th>动作</th>
                                    <th>外部部门</th>
                                    <th>目标组织</th>
                                    <th>状态</th>
                                    <th>错误</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-item>
                                <tr>
                                    <td><p-tag [value]="diffActionLabel(item.action)" [severity]="diffActionSeverity(item.action)" /></td>
                                    <td>
                                        <div class="flex flex-col gap-1">
                                            <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ candidateName(item) }}</span>
                                            <span class="font-mono text-xs text-surface-400">{{ item.externalDepartmentId }}</span>
                                        </div>
                                    </td>
                                    <td class="text-sm text-surface-700 dark:text-surface-200">{{ orgUnitName(item.orgUnitId) }}</td>
                                    <td><p-tag [value]="diffStatusLabel(item.status)" [severity]="diffStatusSeverity(item.status)" /></td>
                                    <td class="max-w-80 truncate text-sm text-surface-500">{{ item.errorMessage ?? '—' }}</td>
                                </tr>
                            </ng-template>
                            <ng-template #emptymessage>
                                <tr>
                                    <td colspan="5" class="py-6 text-center text-surface-400">{{ syncStore.loadingRunDetail() ? '加载中...' : '暂无差异项' }}</td>
                                </tr>
                            </ng-template>
                        </p-table>

                        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <div class="mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">请求摘要</div>
                                <pre class="max-h-48 overflow-auto rounded-md bg-surface-100 p-3 text-xs text-surface-700 dark:bg-surface-900 dark:text-surface-200">{{ formatJson(run.requestSnapshot) }}</pre>
                            </div>
                            <div>
                                <div class="mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">结果摘要</div>
                                <pre class="max-h-48 overflow-auto rounded-md bg-surface-100 p-3 text-xs text-surface-700 dark:bg-surface-900 dark:text-surface-200">{{ formatJson(run.resultSummary) }}</pre>
                            </div>
                        </div>
                    </div>
                } @else {
                    <div class="py-8 text-center text-surface-400">{{ syncStore.loadingRunDetail() ? '加载中...' : '暂无运行详情' }}</div>
                }
            </p-dialog>

            <p-dialog [(visible)]="mappingDialogVisible" (onHide)="closeMappingDialog()" [modal]="true" header="处理部门映射" [style]="{ width: 'min(34rem, calc(100vw - 2rem))' }" styleClass="p-fluid">
                @if (selectedMapping(); as mapping) {
                    <div class="flex flex-col gap-4 py-2">
                        <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500">外部部门</div>
                            <div class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ mapping.externalDepartmentName }}</div>
                            <div class="mt-1 font-mono text-xs text-surface-500">{{ mapping.externalDepartmentId }}</div>
                        </div>
                        @if (mapping.conflictReason) {
                            <div class="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                                {{ mapping.conflictReason }}
                            </div>
                        }
                        <div class="flex flex-col gap-2">
                            <label for="externalDepartmentMappingTarget" class="font-medium">映射到 POMS 组织 *</label>
                            <p-select
                                inputId="externalDepartmentMappingTarget"
                                [(ngModel)]="mappingTargetOrgUnitId"
                                [options]="mappingOrgUnitOptions()"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                placeholder="选择启用组织"
                                class="w-full rounded-md!"
                            />
                        </div>
                    </div>
                } @else {
                    <div class="py-8 text-center text-surface-400">未选择部门映射</div>
                }
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="closeMappingDialog()" />
                        <p-button icon="pi pi-link" label="保存映射" [disabled]="!canSaveMappingDialog()" [loading]="isSelectedMappingSaving()" (onClick)="saveMappingDialog()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog
                [(visible)]="sourceDialogVisible"
                (onHide)="closeSourceDialog()"
                [modal]="true"
                [header]="editingSourceId() ? '编辑同步源' : '新建同步源'"
                [style]="{ width: editingSourceId() ? '34rem' : '58rem', maxWidth: 'calc(100vw - 2rem)' }"
                styleClass="p-fluid"
            >
                @if (editingSourceId()) {
                    <div class="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
                        <div class="flex flex-col gap-2 md:col-span-2">
                            <label for="externalOrgProvider" class="font-medium">外部平台</label>
                            <p-select inputId="externalOrgProvider" [(ngModel)]="sourceForm.provider" [options]="providerOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" [disabled]="true" />
                        </div>
                        <div class="flex flex-col gap-2 md:col-span-2">
                            <label for="externalOrgDisplayName" class="font-medium">名称 *</label>
                            <input id="externalOrgDisplayName" pInputText [(ngModel)]="sourceForm.displayName" placeholder="如 飞书通讯录" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="externalOrgTenantId" class="font-medium">外部租户</label>
                            <input id="externalOrgTenantId" pInputText [(ngModel)]="sourceForm.externalTenantId" placeholder="tenant key" class="w-full" [disabled]="true" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="externalOrgRootDepartmentId" class="font-medium">根部门</label>
                            <input id="externalOrgRootDepartmentId" pInputText [ngModel]="sourceForm.externalRootDepartmentId" (ngModelChange)="updateExternalRootDepartmentId($event)" placeholder="0" class="w-full" />
                        </div>
                        <ng-container *ngTemplateOutlet="providerConfigField"></ng-container>
                        <ng-container *ngTemplateOutlet="syncScopeFields"></ng-container>
                    </div>
                } @else {
                    <div class="grid grid-cols-1 gap-5 py-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
                        <nav class="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="同步源配置步骤">
                            @for (step of sourceWizardSteps; track step.key) {
                                <button
                                    type="button"
                                    class="flex min-w-28 items-center gap-2 rounded-[8px] border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                    [ngClass]="wizardStepButtonClass(step.key)"
                                    [disabled]="!canSelectWizardStep(step.key)"
                                    (click)="goToWizardStep(step.key)"
                                >
                                    <i [class]="step.icon"></i>
                                    <span class="font-medium">{{ step.label }}</span>
                                </button>
                            }
                        </nav>

                        <div class="min-w-0">
                            @switch (sourceWizardStep()) {
                                @case ('platform') {
                                    <div class="grid grid-cols-1 gap-4">
                                        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            @for (option of providerOptions; track option.value) {
                                                <button
                                                    type="button"
                                                    class="rounded-[8px] border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                                    [ngClass]="sourceForm.provider === option.value ? 'border-primary bg-primary-50 text-primary dark:bg-primary-950/30' : 'border-surface-200 hover:border-primary dark:border-surface-700'"
                                                    [disabled]="option.value !== externalOrgProvider.Feishu"
                                                    (click)="selectWizardProvider(option.value)"
                                                >
                                                    <div class="flex items-center justify-between gap-3">
                                                        <span class="font-medium">{{ option.label }}</span>
                                                        <p-tag [value]="option.value === externalOrgProvider.Feishu ? '可用' : '暂未支持'" [severity]="option.value === externalOrgProvider.Feishu ? 'success' : 'secondary'" />
                                                    </div>
                                                </button>
                                            }
                                        </div>
                                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div class="flex flex-col gap-2">
                                                <label for="externalOrgWizardDisplayName" class="font-medium">名称 *</label>
                                                <input id="externalOrgWizardDisplayName" pInputText [(ngModel)]="sourceForm.displayName" placeholder="如 飞书通讯录" class="w-full" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="externalOrgWizardTenantId" class="font-medium">外部租户</label>
                                                <input id="externalOrgWizardTenantId" pInputText [(ngModel)]="sourceForm.externalTenantId" placeholder="tenant key" class="w-full" />
                                            </div>
                                        </div>
                                    </div>
                                }
                                @case ('connection') {
                                    <div class="grid grid-cols-1 gap-4">
                                        @if (!hasUsableProviderConfig()) {
                                            <div class="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                                                <div>当前没有可用于组织同步的飞书企业协同接入。</div>
                                                <a routerLink="/platform/identity-providers" class="mt-1 inline-flex items-center gap-1 font-medium text-primary">
                                                    <i class="pi pi-arrow-right text-xs"></i>
                                                    前往企业协同接入
                                                </a>
                                            </div>
                                        }
                                        <ng-container *ngTemplateOutlet="providerConfigField"></ng-container>
                                    </div>
                                }
                                @case ('scope') {
                                    <div class="grid grid-cols-1 gap-4">
                                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div class="flex flex-col gap-2">
                                                <label for="externalOrgWizardRootDepartmentId" class="font-medium">根部门</label>
                                                <input id="externalOrgWizardRootDepartmentId" pInputText [ngModel]="sourceForm.externalRootDepartmentId" (ngModelChange)="updateExternalRootDepartmentId($event)" placeholder="0" class="w-full" />
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <label for="externalOrgWizardAuthoritativeUnit" class="font-medium">权威组织</label>
                                                <p-select
                                                    inputId="externalOrgWizardAuthoritativeUnit"
                                                    [(ngModel)]="sourceForm.authoritativeOrgUnitId"
                                                    [options]="orgUnitOptions()"
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    appendTo="body"
                                                    placeholder="不限制"
                                                    class="w-full rounded-md!"
                                                />
                                            </div>
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <label for="externalOrgWizardSyncScopes" class="font-medium">同步范围</label>
                                            <textarea id="externalOrgWizardSyncScopes" pTextarea [(ngModel)]="sourceForm.syncScopesText" rows="5" placeholder="每行一个 scope" class="w-full"></textarea>
                                        </div>
                                    </div>
                                }
                                @case ('review') {
                                    <div class="grid grid-cols-1 gap-4">
                                        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                                <div class="text-xs text-surface-500">同步源</div>
                                                <div class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ sourceForm.displayName || '—' }}</div>
                                                <div class="mt-1 text-sm text-surface-500">{{ providerLabel(sourceForm.provider) }} · {{ sourceForm.externalTenantId || '默认租户' }}</div>
                                            </div>
                                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                                <div class="text-xs text-surface-500">接入配置</div>
                                                <div class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ selectedProviderConfigName() }}</div>
                                                <div class="mt-1 text-sm text-surface-500">{{ selectedProviderConfigDiagnostic()?.message ?? '未完成组织同步可用性检查' }}</div>
                                            </div>
                                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                                <div class="text-xs text-surface-500">根部门</div>
                                                <div class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ rootDepartmentLabel(sourceForm.externalRootDepartmentId) }}</div>
                                                <div class="mt-1 text-sm text-surface-500">权威组织 {{ orgUnitName(sourceForm.authoritativeOrgUnitId) }}</div>
                                            </div>
                                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                                <div class="text-xs text-surface-500">同步范围</div>
                                                <div class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ wizardScopeCount() }} 项</div>
                                                <div class="mt-1 truncate text-sm text-surface-500">{{ wizardScopesPreview() }}</div>
                                            </div>
                                        </div>
                                        @if (wizardPreviewIssue(); as issue) {
                                            <div class="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                                                <div>{{ issue }}</div>
                                                @if (shouldShowWizardProviderConfigLink()) {
                                                    <a routerLink="/platform/identity-providers" class="mt-1 inline-flex items-center gap-1 font-medium text-primary">
                                                        <i class="pi pi-arrow-right text-xs"></i>
                                                        前往企业协同接入
                                                    </a>
                                                }
                                            </div>
                                        }
                                    </div>
                                }
                            }
                        </div>
                    </div>
                }

                <ng-template #providerConfigField>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="externalOrgProviderConfig" class="font-medium">接入配置</label>
                        <p-select
                            inputId="externalOrgProviderConfig"
                            [ngModel]="sourceForm.providerConfigId"
                            (ngModelChange)="updateProviderConfigId($event)"
                            [options]="providerConfigOptions()"
                            optionLabel="label"
                            optionValue="value"
                            optionDisabled="disabled"
                            appendTo="body"
                            placeholder="选择企业协同接入"
                            class="w-full rounded-md!"
                        />
                        @if (selectedProviderConfigIssue(); as issue) {
                            <div class="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                                <div>{{ issue }}</div>
                                <a routerLink="/platform/identity-providers" class="mt-1 inline-flex items-center gap-1 font-medium text-primary">
                                    <i class="pi pi-arrow-right text-xs"></i>
                                    前往企业协同接入
                                </a>
                            </div>
                        }
                        @if (isTestingSelectedProviderConfig()) {
                            <div class="rounded-[8px] border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">正在检查飞书组织同步可用性...</div>
                        }
                        @if (selectedProviderConfigDiagnostic(); as diagnostic) {
                            <div
                                class="rounded-[8px] border px-3 py-2 text-sm"
                                [ngClass]="
                                    diagnostic.status === identityProviderConnectionTestStatus.Success
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
                                        : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
                                "
                            >
                                <div class="font-medium">{{ diagnostic.message }}</div>
                                <div class="mt-2 grid grid-cols-1 gap-1">
                                    @for (check of diagnostic.checks; track check.key) {
                                        <div class="flex items-start justify-between gap-2 rounded bg-white/70 px-2 py-1 dark:bg-surface-900/60">
                                            <span class="min-w-0">{{ check.label }}：{{ check.message }}</span>
                                            <p-tag [value]="diagnosticStatusLabel(check.status)" [severity]="diagnosticStatusSeverity(check.status)" />
                                        </div>
                                    }
                                </div>
                                @if (diagnostic.nextActions.length) {
                                    <div class="mt-2 text-xs">{{ diagnostic.nextActions[0] }}</div>
                                }
                                <a routerLink="/platform/identity-providers" class="mt-2 inline-flex items-center gap-1 font-medium text-primary">
                                    <i class="pi pi-arrow-right text-xs"></i>
                                    前往企业协同接入
                                </a>
                            </div>
                        }
                    </div>
                </ng-template>

                <ng-template #syncScopeFields>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="externalOrgAuthoritativeUnit" class="font-medium">权威组织</label>
                        <p-select
                            inputId="externalOrgAuthoritativeUnit"
                            [(ngModel)]="sourceForm.authoritativeOrgUnitId"
                            [options]="orgUnitOptions()"
                            optionLabel="label"
                            optionValue="value"
                            appendTo="body"
                            placeholder="不限制"
                            class="w-full rounded-md!"
                        />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="externalOrgSyncScopes" class="font-medium">同步范围</label>
                        <textarea id="externalOrgSyncScopes" pTextarea [(ngModel)]="sourceForm.syncScopesText" rows="3" placeholder="每行一个 scope" class="w-full"></textarea>
                    </div>
                </ng-template>

                <ng-template #footer>
                    <div class="flex flex-wrap justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="closeSourceDialog()" />
                        @if (editingSourceId()) {
                            <p-button icon="pi pi-save" label="保存" [loading]="syncStore.savingSource()" (onClick)="saveSource()" />
                        } @else {
                            @if (sourceWizardStep() !== 'platform') {
                                <p-button icon="pi pi-arrow-left" label="上一步" severity="secondary" [outlined]="true" (onClick)="goToPreviousWizardStep()" />
                            }
                            @if (sourceWizardStep() !== 'review') {
                                <p-button icon="pi pi-arrow-right" label="下一步" iconPos="right" [disabled]="!canGoToNextWizardStep()" (onClick)="goToNextWizardStep()" />
                            } @else {
                                <p-button icon="pi pi-save" label="保存草稿" severity="secondary" [outlined]="true" [loading]="syncStore.savingSource()" [disabled]="!canSaveDraftFromWizard()" (onClick)="saveSource()" />
                                <p-button icon="pi pi-play" label="保存并生成预览" [loading]="syncStore.savingSource() || syncStore.creatingRun()" [disabled]="!canSaveAndPreviewWizard()" (onClick)="saveSource({ activateAfterCreate: true, previewAfterActivate: true })" />
                            }
                        }
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class ExternalOrgSyncWorkbench implements OnDestroy {
    readonly syncStore = inject(ExternalOrgSyncStore);
    readonly identityProviderStore = inject(IdentityProviderStore);
    readonly platformStore = inject(PlatformStore);
    readonly #messageService = inject(MessageService);
    readonly #confirmationService = inject(ConfirmationService);

    readonly externalOrgSourceStatus = ExternalOrgSourceStatus;
    readonly externalOrgProvider = ExternalOrgProvider;
    readonly orgSyncRunStatus = OrgSyncRunStatus;
    readonly externalDepartmentMappingReviewState = ExternalDepartmentMappingReviewState;
    readonly identityProviderConnectionTestStatus = IdentityProviderConnectionTestStatus;
    readonly sourceWizardSteps: SourceWizardStepOption[] = [
        { key: 'platform', label: '平台', icon: 'pi pi-building' },
        { key: 'connection', label: '接入', icon: 'pi pi-link' },
        { key: 'scope', label: '范围', icon: 'pi pi-sliders-h' },
        { key: 'review', label: '预览', icon: 'pi pi-play' }
    ];
    readonly providerOptions: SelectOption<ExternalOrgProvider>[] = [
        { label: '飞书', value: ExternalOrgProvider.Feishu },
        { label: '钉钉', value: ExternalOrgProvider.Dingtalk },
        { label: '企业微信', value: ExternalOrgProvider.Wecom }
    ];
    readonly mappingReviewStateFilterOptions: SelectOption<MappingReviewStateFilter>[] = [
        { label: '全部状态', value: 'all' },
        { label: '待映射', value: ExternalDepartmentMappingReviewState.Unmapped },
        { label: '已映射', value: ExternalDepartmentMappingReviewState.Mapped },
        { label: '冲突', value: ExternalDepartmentMappingReviewState.Conflict },
        { label: '已忽略', value: ExternalDepartmentMappingReviewState.Ignored },
        { label: '失效', value: ExternalDepartmentMappingReviewState.Stale }
    ];
    readonly orgUnitOptions = computed<SelectOption<string | null>[]>(() => [
        { label: '不限制', value: null },
        ...this.platformStore.orgUnits().map((unit) => ({
            label: this.indentedOrgUnitLabel(unit),
            value: unit.id
        }))
    ]);
    readonly mappingOrgUnitOptions = computed<SelectOption<string>[]>(() =>
        this.platformStore
            .orgUnits()
            .filter((unit) => unit.isActive)
            .map((unit) => ({
                label: this.indentedOrgUnitLabel(unit),
                value: unit.id
            }))
    );
    readonly mappingReviewStateFilter = signal<MappingReviewStateFilter>('all');
    readonly mappingSearchText = signal('');
    readonly filteredMappings = computed(() => {
        const reviewState = this.mappingReviewStateFilter();
        const search = this.mappingSearchText().trim().toLocaleLowerCase();
        return this.syncStore.mappings().filter((mapping) => {
            if (reviewState !== 'all' && mapping.reviewState !== reviewState) return false;
            if (!search) return true;
            return [mapping.externalDepartmentName, mapping.externalDepartmentId, mapping.externalParentDepartmentId, mapping.conflictReason, this.orgUnitName(mapping.orgUnitId)]
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                .some((value) => value.toLocaleLowerCase().includes(search));
        });
    });

    sourceDialogVisible = false;
    mappingDialogVisible = false;
    readonly editingSourceId = signal<string | null>(null);
    readonly sourceWizardStep = signal<SourceWizardStep>('platform');
    readonly syncRunView = signal<SyncRunWorkbenchView>('preview');
    readonly selectedDiffItemIds = signal<Set<string>>(new Set());
    readonly selectedMapping = signal<ExternalDepartmentMappingSummary | null>(null);
    readonly providerConfigDiagnostics = signal<Record<string, ProviderConfigDiagnosticEntry>>({});
    runDetailDialogVisible = false;
    mappingTargetOrgUnitId: string | null = null;
    sourceForm: ExternalOrgSourceForm = this.createEmptySourceForm();
    private rootDepartmentDiagnosticTimer: ReturnType<typeof setTimeout> | null = null;
    private providerConfigDiagnosticRequestId = 0;

    constructor() {
        void this.refresh();
        void this.platformStore.loadOrgUnits();
        void this.identityProviderStore.loadConfigs({ provider: IdentityProvider.Feishu });
    }

    ngOnDestroy(): void {
        this.clearRootDepartmentDiagnosticTimer();
    }

    async refresh(): Promise<void> {
        try {
            await this.syncStore.loadSources();
        } catch {
            this.#messageService.add({ severity: 'error', summary: '加载失败', detail: '同步源加载失败' });
        }
    }

    async selectSource(source: ExternalOrgSourceSummary): Promise<void> {
        await this.syncStore.selectSource(source.id);
        this.selectedDiffItemIds.set(new Set());
        this.closeRunDetailDialog();
        this.closeMappingDialog();
    }

    setSyncRunView(view: SyncRunWorkbenchView): void {
        this.syncRunView.set(view);
    }

    async refreshRunHistory(): Promise<void> {
        const source = this.syncStore.selectedSource();
        if (!source) return;
        try {
            await this.syncStore.loadRunHistory(source.id);
        } catch {
            this.#messageService.add({ severity: 'error', summary: '刷新失败', detail: '同步运行历史加载失败' });
        }
    }

    async openRunDetail(run: OrgSyncRunSummary): Promise<void> {
        this.runDetailDialogVisible = true;
        try {
            await this.syncStore.loadRunDetail(run.id);
        } catch {
            this.#messageService.add({ severity: 'error', summary: '加载失败', detail: '同步运行详情加载失败' });
            this.closeRunDetailDialog();
        }
    }

    closeRunDetailDialog(): void {
        this.runDetailDialogVisible = false;
        this.syncStore.clearRunDetail();
    }

    isRunDetailLoading(run: OrgSyncRunSummary): boolean {
        return this.syncStore.loadingRunDetailId() === run.id;
    }

    canEditMappings(): boolean {
        const source = this.syncStore.selectedSource();
        return !!source && source.status !== ExternalOrgSourceStatus.Archived;
    }

    isMappingSaving(mapping: ExternalDepartmentMappingSummary): boolean {
        return this.syncStore.savingMappingId() === mapping.id;
    }

    isSelectedMappingSaving(): boolean {
        const mapping = this.selectedMapping();
        return !!mapping && this.isMappingSaving(mapping);
    }

    canUnmapMapping(mapping: ExternalDepartmentMappingSummary): boolean {
        if (!this.canEditMappings() || this.isMappingSaving(mapping) || mapping.reviewState === ExternalDepartmentMappingReviewState.Ignored) return false;
        return Boolean(mapping.orgUnitId) || mapping.status !== ExternalDepartmentMappingStatus.Unmapped || mapping.reviewState !== ExternalDepartmentMappingReviewState.Unmapped;
    }

    canIgnoreMapping(mapping: ExternalDepartmentMappingSummary): boolean {
        return this.canEditMappings() && !this.isMappingSaving(mapping) && mapping.reviewState !== ExternalDepartmentMappingReviewState.Ignored;
    }

    canRestoreMapping(mapping: ExternalDepartmentMappingSummary): boolean {
        return this.canEditMappings() && !this.isMappingSaving(mapping) && mapping.reviewState === ExternalDepartmentMappingReviewState.Ignored;
    }

    openMappingDialog(mapping: ExternalDepartmentMappingSummary): void {
        if (!this.canEditMappings()) {
            this.#messageService.add({ severity: 'warn', summary: '不能处理映射', detail: '已归档的同步源不可编辑。' });
            return;
        }
        this.selectedMapping.set(mapping);
        this.mappingTargetOrgUnitId = mapping.orgUnitId;
        this.mappingDialogVisible = true;
    }

    closeMappingDialog(): void {
        this.mappingDialogVisible = false;
        this.selectedMapping.set(null);
        this.mappingTargetOrgUnitId = null;
    }

    canSaveMappingDialog(): boolean {
        const mapping = this.selectedMapping();
        return !!mapping && !!this.mappingTargetOrgUnitId && this.canEditMappings() && !this.isMappingSaving(mapping);
    }

    async saveMappingDialog(): Promise<void> {
        const mapping = this.selectedMapping();
        const orgUnitId = this.mappingTargetOrgUnitId;
        if (!mapping || !orgUnitId || !this.canSaveMappingDialog()) return;
        try {
            await this.syncStore.mapMapping(mapping.id, {
                orgUnitId,
                expectedVersion: mapping.rowVersion
            });
            this.closeMappingDialog();
            this.#messageService.add({ severity: 'success', summary: '映射已保存', detail: '已更新外部部门与 POMS 组织的映射关系' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '映射失败', detail: apiErrorMessage(error, '请刷新后重试') });
        }
    }

    confirmUnmapMapping(mapping: ExternalDepartmentMappingSummary): void {
        if (!this.canUnmapMapping(mapping)) return;
        this.#confirmationService.confirm({
            header: '解除部门映射',
            message: `将解除「${mapping.externalDepartmentName}」与当前 POMS 组织的关系。`,
            icon: 'pi pi-unlink',
            acceptLabel: '解除',
            rejectLabel: '取消',
            acceptButtonStyleClass: 'p-button-warning',
            accept: () => {
                void this.unmapMapping(mapping);
            }
        });
    }

    async unmapMapping(mapping: ExternalDepartmentMappingSummary): Promise<void> {
        if (!this.canUnmapMapping(mapping)) return;
        try {
            await this.syncStore.unmapMapping(mapping.id, { expectedVersion: mapping.rowVersion });
            this.#messageService.add({ severity: 'success', summary: '已解除映射', detail: '请重新生成预览确认后续差异' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '解除失败', detail: apiErrorMessage(error, '请刷新后重试') });
        }
    }

    confirmIgnoreMapping(mapping: ExternalDepartmentMappingSummary): void {
        if (!this.canIgnoreMapping(mapping)) return;
        this.#confirmationService.confirm({
            header: '忽略外部部门',
            message: `忽略后「${mapping.externalDepartmentName}」不会再作为待处理映射显示，已有关联会被清除。`,
            icon: 'pi pi-eye-slash',
            acceptLabel: '忽略',
            rejectLabel: '取消',
            acceptButtonStyleClass: 'p-button-secondary',
            accept: () => {
                void this.ignoreMapping(mapping);
            }
        });
    }

    async ignoreMapping(mapping: ExternalDepartmentMappingSummary): Promise<void> {
        if (!this.canIgnoreMapping(mapping)) return;
        try {
            await this.syncStore.ignoreMapping(mapping.id, { expectedVersion: mapping.rowVersion });
            this.#messageService.add({ severity: 'success', summary: '已忽略', detail: '请重新生成预览确认后续差异' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '忽略失败', detail: apiErrorMessage(error, '请刷新后重试') });
        }
    }

    confirmRestoreMapping(mapping: ExternalDepartmentMappingSummary): void {
        if (!this.canRestoreMapping(mapping)) return;
        this.#confirmationService.confirm({
            header: '恢复外部部门',
            message: `恢复后「${mapping.externalDepartmentName}」会重新进入待映射处理。`,
            icon: 'pi pi-refresh',
            acceptLabel: '恢复',
            rejectLabel: '取消',
            acceptButtonStyleClass: 'p-button-success',
            accept: () => {
                void this.restoreMapping(mapping);
            }
        });
    }

    async restoreMapping(mapping: ExternalDepartmentMappingSummary): Promise<void> {
        if (!this.canRestoreMapping(mapping)) return;
        try {
            await this.syncStore.restoreMapping(mapping.id, { expectedVersion: mapping.rowVersion });
            this.#messageService.add({ severity: 'success', summary: '已恢复', detail: '请重新生成预览确认后续差异' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '恢复失败', detail: apiErrorMessage(error, '请刷新后重试') });
        }
    }

    async openMappingConflictRun(mapping: ExternalDepartmentMappingSummary): Promise<void> {
        if (!mapping.lastConflictRunId) return;
        this.runDetailDialogVisible = true;
        this.syncRunView.set('history');
        try {
            await this.syncStore.loadRunDetail(mapping.lastConflictRunId);
        } catch {
            this.#messageService.add({ severity: 'error', summary: '加载失败', detail: '来源差异加载失败' });
            this.closeRunDetailDialog();
        }
    }

    openCreateSourceDialog(): void {
        this.editingSourceId.set(null);
        this.sourceForm = this.createEmptySourceForm();
        this.sourceWizardStep.set('platform');
        this.clearRootDepartmentDiagnosticTimer();
        this.sourceDialogVisible = true;
    }

    openEditSourceDialog(source: ExternalOrgSourceSummary): void {
        if (source.status === ExternalOrgSourceStatus.Archived) {
            this.#messageService.add({ severity: 'warn', summary: '不能编辑同步源', detail: '已归档的同步源不可编辑。' });
            return;
        }
        this.editingSourceId.set(source.id);
        this.sourceForm = {
            provider: source.provider,
            externalTenantId: source.externalTenantId ?? '',
            displayName: source.displayName,
            providerConfigId: source.providerConfigId,
            authoritativeOrgUnitId: source.authoritativeOrgUnitId,
            externalRootDepartmentId: this.normalizeExternalRootDepartmentId(source.externalRootDepartmentId),
            syncScopesText: source.syncScopes.join('\n')
        };
        this.sourceDialogVisible = true;
        this.clearRootDepartmentDiagnosticTimer();
        void this.testSelectedProviderConfigForOrgSync();
    }

    closeSourceDialog(): void {
        this.sourceDialogVisible = false;
        this.clearRootDepartmentDiagnosticTimer();
        this.providerConfigDiagnosticRequestId += 1;
    }

    selectWizardProvider(provider: ExternalOrgProvider): void {
        if (provider === this.sourceForm.provider) return;
        this.sourceForm.provider = provider;
        if (provider !== ExternalOrgProvider.Feishu) {
            this.sourceForm.providerConfigId = null;
            this.providerConfigDiagnosticRequestId += 1;
        }
    }

    goToWizardStep(step: SourceWizardStep): void {
        if (!this.canSelectWizardStep(step)) return;
        this.sourceWizardStep.set(step);
    }

    goToNextWizardStep(): void {
        if (!this.canGoToNextWizardStep()) return;
        const currentIndex = this.currentWizardStepIndex();
        const next = this.sourceWizardSteps[currentIndex + 1];
        if (next) this.sourceWizardStep.set(next.key);
    }

    goToPreviousWizardStep(): void {
        const currentIndex = this.currentWizardStepIndex();
        const previous = this.sourceWizardSteps[currentIndex - 1];
        if (previous) this.sourceWizardStep.set(previous.key);
    }

    canGoToNextWizardStep(): boolean {
        return this.sourceWizardStepIssue(this.sourceWizardStep()) === null;
    }

    canSelectWizardStep(step: SourceWizardStep): boolean {
        const targetIndex = this.sourceWizardSteps.findIndex((candidate) => candidate.key === step);
        if (targetIndex < 0) return false;
        const currentIndex = this.currentWizardStepIndex();
        if (targetIndex <= currentIndex) return true;
        return targetIndex === currentIndex + 1 && this.sourceWizardStepIssue(this.sourceWizardStep()) === null;
    }

    canSaveDraftFromWizard(): boolean {
        return (
            !this.syncStore.savingSource() &&
            this.sourceWizardStepIssue('platform') === null &&
            this.sourceSaveIssue(null) === null &&
            this.selectedProviderConfigOrgSyncReadinessIssue() === null
        );
    }

    canSaveAndPreviewWizard(): boolean {
        return !this.syncStore.savingSource() && !this.syncStore.creatingRun() && this.wizardPreviewIssue() === null;
    }

    wizardStepButtonClass(step: SourceWizardStep): string {
        if (step === this.sourceWizardStep()) return 'border-primary bg-primary-50 text-primary dark:bg-primary-950/30';
        if (this.isWizardStepCompleted(step)) return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100';
        return this.canSelectWizardStep(step) ? 'border-surface-200 hover:border-primary dark:border-surface-700' : 'border-surface-200 text-surface-400 dark:border-surface-700 dark:text-surface-500';
    }

    isWizardStepCompleted(step: SourceWizardStep): boolean {
        const targetIndex = this.sourceWizardSteps.findIndex((candidate) => candidate.key === step);
        return targetIndex >= 0 && targetIndex < this.currentWizardStepIndex() && this.isWizardStepCompleteForState(step);
    }

    isWizardStepCompleteForState(step: SourceWizardStep): boolean {
        if (step === 'connection' && !this.sourceForm.providerConfigId) return false;
        return this.sourceWizardStepIssue(step) === null;
    }

    hasUsableProviderConfig(): boolean {
        return this.identityProviderStore.configs().some((config) => this.isCompatibleProviderConfig(config) && this.providerConfigIssue(config) === null);
    }

    selectedProviderConfigName(): string {
        if (!this.sourceForm.providerConfigId) return '未选择';
        return this.identityProviderStore.configs().find((config) => config.id === this.sourceForm.providerConfigId)?.displayName ?? '未选择';
    }

    wizardScopeCount(): number {
        return this.parseSyncScopes().length;
    }

    wizardScopesPreview(): string {
        return this.parseSyncScopes().join('，') || '未配置';
    }

    wizardPreviewIssue(): string | null {
        const platformIssue = this.sourceWizardStepIssue('platform');
        if (platformIssue) return platformIssue;
        const activationIssue = this.sourceActivationIssue(this.sourceForm.provider, this.sourceForm.providerConfigId);
        if (activationIssue) return activationIssue;
        if (this.isTestingSelectedProviderConfig()) return '组织同步可用性检查正在进行。';
        const diagnostic = this.selectedProviderConfigDiagnostic();
        if (!diagnostic) return '组织同步可用性检查尚未完成。';
        if (diagnostic.status !== IdentityProviderConnectionTestStatus.Success) return diagnostic.message;
        return this.sourceWizardStepIssue('scope');
    }

    shouldShowWizardProviderConfigLink(): boolean {
        if (this.sourceForm.provider !== ExternalOrgProvider.Feishu) return false;
        if (!this.hasUsableProviderConfig()) return true;
        if (!this.sourceForm.providerConfigId) return false;
        if (this.selectedProviderConfigIssue()) return true;
        const diagnostic = this.selectedProviderConfigDiagnostic();
        return !!diagnostic && diagnostic.status !== IdentityProviderConnectionTestStatus.Success;
    }

    private currentWizardStepIndex(): number {
        return Math.max(
            0,
            this.sourceWizardSteps.findIndex((step) => step.key === this.sourceWizardStep())
        );
    }

    private sourceWizardStepIssue(step: SourceWizardStep): string | null {
        if (step === 'platform') {
            if (this.sourceForm.provider !== ExternalOrgProvider.Feishu) return '当前仅支持飞书组织同步。';
            if (!this.sourceForm.displayName.trim()) return '请填写同步源名称。';
            return null;
        }
        if (step === 'connection') {
            return this.selectedProviderConfigIssue();
        }
        if (step === 'scope') return null;
        return this.wizardPreviewIssue();
    }

    providerConfigOptions(): SelectOption<string | null>[] {
        const sourceProviderIssue = this.sourceForm.provider === ExternalOrgProvider.Feishu ? null : '当前外部平台尚未支持绑定企业协同接入。';
        return [
            { label: '不绑定', value: null },
            ...this.identityProviderStore
                .configs()
                .filter((config) => this.isCompatibleProviderConfig(config))
                .map((config) => {
                    const issue = sourceProviderIssue ?? this.providerConfigIssue(config);
                    return {
                        label: issue ? `${config.displayName} · ${issue}` : `${config.displayName} · 可用于组织同步`,
                        value: config.id,
                        disabled: Boolean(issue)
                    };
                })
        ];
    }

    updateProviderConfigId(value: string | null | undefined): void {
        this.sourceForm.providerConfigId = value ?? null;
        this.clearRootDepartmentDiagnosticTimer();
        void this.testSelectedProviderConfigForOrgSync();
    }

    updateExternalRootDepartmentId(value: string | null | undefined): void {
        this.sourceForm.externalRootDepartmentId = value ?? '';
        this.scheduleSelectedProviderConfigForOrgSyncTest();
    }

    async saveSource(options: { activateAfterCreate?: boolean; previewAfterActivate?: boolean } = {}): Promise<void> {
        const displayName = this.sourceForm.displayName.trim();
        if (!displayName) {
            this.#messageService.add({ severity: 'warn', summary: '请填写名称', detail: '同步源名称不能为空' });
            return;
        }
        const scopes = this.parseSyncScopes();
        const externalRootDepartmentId = this.normalizeExternalRootDepartmentId(this.sourceForm.externalRootDepartmentId);
        const editingId = this.editingSourceId();
        const sourceIssue = this.sourceSaveIssue(editingId);
        if (sourceIssue) {
            this.#messageService.add({ severity: 'warn', summary: '不能保存同步源', detail: sourceIssue });
            return;
        }
        if (!options.activateAfterCreate && this.shouldValidateOrgSyncReadinessOnSave(editingId, externalRootDepartmentId)) {
            const orgSyncReadinessIssue = await this.ensureProviderConfigOrgSyncReady(this.sourceForm.providerConfigId, externalRootDepartmentId);
            if (orgSyncReadinessIssue) {
                this.#messageService.add({ severity: 'warn', summary: '组织同步不可用', detail: orgSyncReadinessIssue });
                return;
            }
        }
        if (options.activateAfterCreate) {
            const activationIssue = this.sourceActivationIssue(this.sourceForm.provider, this.sourceForm.providerConfigId);
            if (activationIssue) {
                this.#messageService.add({ severity: 'warn', summary: '不能启用同步源', detail: activationIssue });
                return;
            }
            const orgSyncReadinessIssue = await this.ensureSelectedProviderConfigOrgSyncReady();
            if (orgSyncReadinessIssue) {
                this.#messageService.add({ severity: 'warn', summary: '组织同步不可用', detail: orgSyncReadinessIssue });
                return;
            }
        }
        if (editingId && options.activateAfterCreate) {
            this.#messageService.add({ severity: 'warn', summary: '不能启用同步源', detail: '请先保存配置，再从同步源列表执行启用。' });
            return;
        }
        try {
            if (editingId) {
                const selected = this.syncStore.sources().find((source) => source.id === editingId);
                await this.syncStore.updateSource(editingId, {
                    displayName,
                    providerConfigId: this.sourceForm.providerConfigId,
                    authoritativeOrgUnitId: this.sourceForm.authoritativeOrgUnitId,
                    externalRootDepartmentId,
                    syncScopes: scopes,
                    expectedVersion: selected?.rowVersion
                });
            } else {
                const created = await this.syncStore.createSource({
                    provider: this.sourceForm.provider,
                    externalTenantId: this.sourceForm.externalTenantId.trim() || null,
                    displayName,
                    providerConfigId: this.sourceForm.providerConfigId,
                    authoritativeOrgUnitId: this.sourceForm.authoritativeOrgUnitId,
                    externalRootDepartmentId,
                    syncScopes: scopes
                });
                if (options.activateAfterCreate) {
                    const activated = await this.syncStore.activateSource(created.id, { expectedVersion: created.rowVersion });
                    if (options.previewAfterActivate) {
                        try {
                            const run = await this.syncStore.createPreviewRun(activated.id, {
                                expectedSourceVersion: activated.rowVersion,
                                requestSnapshot: { triggeredFrom: 'poms-admin-wizard' }
                            });
                            this.handlePreviewRunResult(run, 'wizard');
                        } catch (error) {
                            this.selectedDiffItemIds.set(new Set());
                            this.#messageService.add({ severity: 'error', summary: '同步源已保存，预览失败', detail: apiErrorMessage(error, '外部组织拉取或差异生成失败') });
                        }
                    }
                }
            }
            this.closeSourceDialog();
            if (!options.previewAfterActivate) {
                const detail = options.activateAfterCreate ? '同步源已保存并启用' : editingId ? '同步源配置已保存' : '同步源草稿已保存';
                this.#messageService.add({ severity: 'success', summary: '保存成功', detail });
            }
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '保存失败', detail: apiErrorMessage(error, '请检查接入配置和版本状态') });
        }
    }

    async toggleSourceStatus(source: ExternalOrgSourceSummary): Promise<void> {
        if (source.status === ExternalOrgSourceStatus.Archived) return;
        const isPausing = source.status === ExternalOrgSourceStatus.Active;
        if (!isPausing) {
            const sourceIssue = this.sourceActivationIssue(source.provider, source.providerConfigId);
            if (sourceIssue) {
                this.#messageService.add({ severity: 'warn', summary: '不能启用同步源', detail: sourceIssue });
                return;
            }
            const orgSyncReadinessIssue = await this.ensureProviderConfigOrgSyncReady(source.providerConfigId, this.normalizeExternalRootDepartmentId(source.externalRootDepartmentId));
            if (orgSyncReadinessIssue) {
                this.#messageService.add({ severity: 'warn', summary: '组织同步不可用', detail: orgSyncReadinessIssue });
                return;
            }
        }
        try {
            if (isPausing) {
                await this.syncStore.pauseSource(source.id, { expectedVersion: source.rowVersion });
            } else {
                await this.syncStore.activateSource(source.id, { expectedVersion: source.rowVersion });
            }
            this.#messageService.add({ severity: 'success', summary: '状态已更新', detail: `同步源已${isPausing ? '暂停' : '启用'}` });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '状态更新失败', detail: apiErrorMessage(error, '请刷新后重试') });
        }
    }

    canArchiveSource(source: ExternalOrgSourceSummary): boolean {
        return source.status === ExternalOrgSourceStatus.Draft || source.status === ExternalOrgSourceStatus.Paused;
    }

    archiveSourceTooltip(source: ExternalOrgSourceSummary): string {
        if (source.status === ExternalOrgSourceStatus.Active) return '暂停后可归档';
        if (source.status === ExternalOrgSourceStatus.Archived) return '已归档';
        return '归档';
    }

    confirmArchiveSource(source: ExternalOrgSourceSummary): void {
        if (!this.canArchiveSource(source)) return;
        this.#confirmationService.confirm({
            header: '归档同步源',
            message: '归档后同步源将不可编辑，也不能再生成预览。',
            icon: 'pi pi-archive',
            acceptLabel: '归档',
            rejectLabel: '取消',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                void this.archiveSource(source);
            }
        });
    }

    async archiveSource(source: ExternalOrgSourceSummary): Promise<void> {
        if (!this.canArchiveSource(source)) {
            this.#messageService.add({ severity: 'warn', summary: '不能归档同步源', detail: this.archiveSourceTooltip(source) });
            return;
        }
        try {
            await this.syncStore.archiveSource(source.id, { expectedVersion: source.rowVersion });
            this.#messageService.add({ severity: 'success', summary: '状态已更新', detail: '同步源已归档' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '状态更新失败', detail: apiErrorMessage(error, '请刷新后重试') });
        }
    }

    canCreatePreview(): boolean {
        const source = this.syncStore.selectedSource();
        return !!source && source.status === ExternalOrgSourceStatus.Active && !this.sourceActivationIssue(source.provider, source.providerConfigId) && !this.syncStore.creatingRun();
    }

    async createPreviewRun(): Promise<void> {
        const source = this.syncStore.selectedSource();
        if (!source || !this.canCreatePreview()) return;
        try {
            const run = await this.syncStore.createPreviewRun(source.id, {
                expectedSourceVersion: source.rowVersion,
                requestSnapshot: { triggeredFrom: 'poms-admin' }
            });
            this.handlePreviewRunResult(run, 'manual');
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '预览失败', detail: apiErrorMessage(error, '外部组织拉取或差异生成失败') });
        }
    }

    private parseSyncScopes(): string[] {
        return this.sourceForm.syncScopesText
            .split(/\r?\n|,/)
            .map((scope) => scope.trim())
            .filter(Boolean);
    }

    private handlePreviewRunResult(run: OrgSyncRunSummary, origin: 'manual' | 'wizard'): void {
        if (run.status === OrgSyncRunStatus.Failed) {
            this.selectedDiffItemIds.set(new Set());
            this.#messageService.add({ severity: 'error', summary: origin === 'wizard' ? '同步源已保存，预览失败' : '预览失败', detail: this.previewFailureDetail(run) });
            return;
        }
        if (run.status !== OrgSyncRunStatus.Previewed) {
            this.selectedDiffItemIds.set(new Set());
            this.#messageService.add({ severity: 'warn', summary: origin === 'wizard' ? '同步源已保存，预览未完成' : '预览未完成', detail: `当前运行状态为「${this.runStatusLabel(run.status)}」，请稍后刷新。` });
            return;
        }
        this.selectedDiffItemIds.set(
            new Set(
                this.syncStore
                    .diffItems()
                    .filter((item) => this.isSelectableDiffItem(item))
                    .map((item) => item.id)
            )
        );
        this.#messageService.add({ severity: 'success', summary: origin === 'wizard' ? '保存并生成预览' : '预览已生成', detail: `发现 ${run.totalItemCount} 条差异` });
    }

    previewFailureDetail(run: OrgSyncRunSummary): string {
        return run.diagnosticSummary?.message?.trim() || run.errorSummary?.trim() || '外部组织拉取或差异生成失败';
    }

    previewEmptyMessage(): string {
        if (this.syncStore.loadingDiffItems()) return '加载中...';
        const run = this.syncStore.activeRun();
        if (!run) return '尚未生成预览';
        switch (run.status) {
            case OrgSyncRunStatus.Previewing:
                return '预览生成中，请稍后刷新';
            case OrgSyncRunStatus.Previewed:
                return '预览已完成，暂无差异';
            case OrgSyncRunStatus.Applying:
                return '正在应用预览差异，请稍后刷新';
            case OrgSyncRunStatus.Applied:
                return '本次预览已应用完成';
            case OrgSyncRunStatus.Failed:
                return '预览失败，未生成差异项';
            case OrgSyncRunStatus.Cancelled:
                return '预览已取消，请重新生成预览';
            default:
                return `当前运行状态为「${this.runStatusLabel(run.status)}」，请稍后刷新`;
        }
    }

    runHistoryEmptyMessage(): string {
        if (this.syncStore.loadingRunHistory()) return '加载中...';
        return '暂无同步运行历史';
    }

    mappingEmptyMessage(): string {
        if (this.syncStore.loadingMappings()) return '加载中...';
        if (this.syncStore.mappings().length > 0) return '没有符合筛选条件的部门映射';
        return '暂无部门映射';
    }

    runDurationLabel(run: OrgSyncRunSummary): string {
        const startedAt = Date.parse(run.startedAt);
        const finishedAt = run.finishedAt ? Date.parse(run.finishedAt) : NaN;
        if (Number.isNaN(startedAt) || Number.isNaN(finishedAt)) return '—';
        const durationMs = Math.max(0, finishedAt - startedAt);
        if (durationMs < 1000) return `${durationMs} ms`;
        const seconds = Math.round(durationMs / 1000);
        if (seconds < 60) return `${seconds} 秒`;
        const minutes = Math.floor(seconds / 60);
        const restSeconds = seconds % 60;
        return restSeconds > 0 ? `${minutes} 分 ${restSeconds} 秒` : `${minutes} 分`;
    }

    runDiffCountLabel(run: OrgSyncRunSummary): string {
        return `${run.totalItemCount} 条`;
    }

    async copyRunDiagnostics(run: OrgSyncRunSummary | null = this.syncStore.selectedRunDetail()): Promise<void> {
        if (!run) return;
        try {
            await navigator.clipboard.writeText(this.runDiagnosticText(run));
            this.#messageService.add({ severity: 'success', summary: '已复制', detail: '同步诊断已复制到剪贴板' });
        } catch {
            this.#messageService.add({ severity: 'warn', summary: '复制失败', detail: '当前浏览器不允许访问剪贴板' });
        }
    }

    runDiagnosticText(run: OrgSyncRunSummary): string {
        const diagnostic = run.diagnosticSummary;
        return [
            `runId: ${run.id}`,
            `sourceId: ${run.sourceId}`,
            `status: ${run.status}`,
            `startedAt: ${run.startedAt}`,
            `finishedAt: ${run.finishedAt ?? '—'}`,
            `duration: ${this.runDurationLabel(run)}`,
            `counts: total=${run.totalItemCount}, approved=${run.approvedItemCount}, skipped=${run.skippedItemCount}, failed=${run.failedItemCount}`,
            `errorSummary: ${run.errorSummary ?? '—'}`,
            diagnostic ? `diagnostic: ${JSON.stringify(diagnostic, null, 2)}` : 'diagnostic: —',
            `requestSnapshot: ${JSON.stringify(run.requestSnapshot ?? {}, null, 2)}`,
            `resultSummary: ${JSON.stringify(run.resultSummary ?? {}, null, 2)}`
        ].join('\n');
    }

    formatJson(value: unknown): string {
        return JSON.stringify(value ?? {}, null, 2);
    }

    canApplyRun(): boolean {
        const run = this.syncStore.activeRun();
        return !!run && run.status === OrgSyncRunStatus.Previewed && this.selectedDiffItemIds().size > 0 && !this.syncStore.previewStale() && !this.syncStore.applyingRun();
    }

    async applySelectedDiffItems(runId: string): Promise<void> {
        const run = this.syncStore.activeRun();
        if (!run || !this.canApplyRun()) return;
        const approvedDiffItemIds = Array.from(this.selectedDiffItemIds());
        const skippedDiffItemIds = this.syncStore
            .diffItems()
            .filter((item) => this.isSelectableDiffItem(item) && !this.selectedDiffItemIds().has(item.id))
            .map((item) => item.id);
        try {
            await this.syncStore.applyRun(runId, {
                expectedVersion: run.rowVersion,
                approvedDiffItemIds,
                skippedDiffItemIds
            });
            this.selectedDiffItemIds.set(new Set());
            this.#messageService.add({ severity: 'success', summary: '应用完成', detail: '组织结构已按选中差异更新' });
        } catch {
            this.#messageService.add({ severity: 'error', summary: '应用失败', detail: '请检查差异状态和同步运行版本' });
        }
    }

    toggleDiffItem(id: string, selected: boolean): void {
        this.selectedDiffItemIds.update((current) => {
            const next = new Set(current);
            if (selected) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }

    toggleAllDiffItems(selected: boolean): void {
        this.selectedDiffItemIds.set(
            selected
                ? new Set(
                      this.syncStore
                          .diffItems()
                          .filter((item) => this.isSelectableDiffItem(item))
                          .map((item) => item.id)
                  )
                : new Set()
        );
    }

    isDiffItemSelected(id: string): boolean {
        return this.selectedDiffItemIds().has(id);
    }

    allSelectableDiffItemsSelected(): boolean {
        const selectableIds = this.syncStore
            .diffItems()
            .filter((item) => this.isSelectableDiffItem(item))
            .map((item) => item.id);
        return selectableIds.length > 0 && selectableIds.every((id) => this.selectedDiffItemIds().has(id));
    }

    isSelectableDiffItem(item: OrgSyncDiffItemSummary): boolean {
        return item.status === OrgSyncDiffItemStatus.Pending && item.action !== OrgSyncDiffAction.Conflict && item.action !== OrgSyncDiffAction.Ignore;
    }

    providerLabel(provider: ExternalOrgProvider): string {
        return (
            {
                [ExternalOrgProvider.Feishu]: '飞书',
                [ExternalOrgProvider.Dingtalk]: '钉钉',
                [ExternalOrgProvider.Wecom]: '企业微信'
            } satisfies Record<ExternalOrgProvider, string>
        )[provider];
    }

    sourceStatusLabel(status: ExternalOrgSourceStatus): string {
        return (
            {
                [ExternalOrgSourceStatus.Draft]: '草稿',
                [ExternalOrgSourceStatus.Active]: '启用',
                [ExternalOrgSourceStatus.Paused]: '暂停',
                [ExternalOrgSourceStatus.Archived]: '归档'
            } satisfies Record<ExternalOrgSourceStatus, string>
        )[status];
    }

    sourceStatusSeverity(status: ExternalOrgSourceStatus): 'success' | 'secondary' | 'warn' | 'danger' {
        return (
            {
                [ExternalOrgSourceStatus.Draft]: 'secondary',
                [ExternalOrgSourceStatus.Active]: 'success',
                [ExternalOrgSourceStatus.Paused]: 'warn',
                [ExternalOrgSourceStatus.Archived]: 'danger'
            } satisfies Record<ExternalOrgSourceStatus, 'success' | 'secondary' | 'warn' | 'danger'>
        )[status];
    }

    mappingStatusLabel(status: ExternalDepartmentMappingStatus): string {
        return (
            {
                [ExternalDepartmentMappingStatus.Unmapped]: '未映射',
                [ExternalDepartmentMappingStatus.Mapped]: '已映射',
                [ExternalDepartmentMappingStatus.Conflict]: '冲突',
                [ExternalDepartmentMappingStatus.Ignored]: '忽略'
            } satisfies Record<ExternalDepartmentMappingStatus, string>
        )[status];
    }

    mappingStatusSeverity(status: ExternalDepartmentMappingStatus): 'success' | 'secondary' | 'warn' | 'danger' {
        return (
            {
                [ExternalDepartmentMappingStatus.Unmapped]: 'warn',
                [ExternalDepartmentMappingStatus.Mapped]: 'success',
                [ExternalDepartmentMappingStatus.Conflict]: 'danger',
                [ExternalDepartmentMappingStatus.Ignored]: 'secondary'
            } satisfies Record<ExternalDepartmentMappingStatus, 'success' | 'secondary' | 'warn' | 'danger'>
        )[status];
    }

    mappingReviewStateLabel(status: ExternalDepartmentMappingReviewState): string {
        return (
            {
                [ExternalDepartmentMappingReviewState.Unmapped]: '待映射',
                [ExternalDepartmentMappingReviewState.Mapped]: '已映射',
                [ExternalDepartmentMappingReviewState.Conflict]: '冲突',
                [ExternalDepartmentMappingReviewState.Ignored]: '已忽略',
                [ExternalDepartmentMappingReviewState.Stale]: '失效'
            } satisfies Record<ExternalDepartmentMappingReviewState, string>
        )[status];
    }

    mappingReviewStateSeverity(status: ExternalDepartmentMappingReviewState): 'success' | 'secondary' | 'warn' | 'danger' {
        return (
            {
                [ExternalDepartmentMappingReviewState.Unmapped]: 'warn',
                [ExternalDepartmentMappingReviewState.Mapped]: 'success',
                [ExternalDepartmentMappingReviewState.Conflict]: 'danger',
                [ExternalDepartmentMappingReviewState.Ignored]: 'secondary',
                [ExternalDepartmentMappingReviewState.Stale]: 'danger'
            } satisfies Record<ExternalDepartmentMappingReviewState, 'success' | 'secondary' | 'warn' | 'danger'>
        )[status];
    }

    runStatusLabel(status: OrgSyncRunStatus): string {
        return (
            {
                [OrgSyncRunStatus.Previewing]: '预览中',
                [OrgSyncRunStatus.Previewed]: '待应用',
                [OrgSyncRunStatus.Applying]: '应用中',
                [OrgSyncRunStatus.Applied]: '已应用',
                [OrgSyncRunStatus.Failed]: '失败',
                [OrgSyncRunStatus.Cancelled]: '已取消'
            } satisfies Record<OrgSyncRunStatus, string>
        )[status];
    }

    runStatusSeverity(status: OrgSyncRunStatus): 'success' | 'secondary' | 'warn' | 'danger' | 'info' {
        return (
            {
                [OrgSyncRunStatus.Previewing]: 'info',
                [OrgSyncRunStatus.Previewed]: 'warn',
                [OrgSyncRunStatus.Applying]: 'info',
                [OrgSyncRunStatus.Applied]: 'success',
                [OrgSyncRunStatus.Failed]: 'danger',
                [OrgSyncRunStatus.Cancelled]: 'secondary'
            } satisfies Record<OrgSyncRunStatus, 'success' | 'secondary' | 'warn' | 'danger' | 'info'>
        )[status];
    }

    diffActionLabel(action: OrgSyncDiffAction): string {
        return (
            {
                [OrgSyncDiffAction.CreateOrgUnit]: '新建组织',
                [OrgSyncDiffAction.UpdateOrgUnit]: '更新组织',
                [OrgSyncDiffAction.MoveOrgUnit]: '移动组织',
                [OrgSyncDiffAction.DisableOrgUnit]: '停用组织',
                [OrgSyncDiffAction.MapExistingOrgUnit]: '映射已有',
                [OrgSyncDiffAction.Ignore]: '忽略',
                [OrgSyncDiffAction.Conflict]: '冲突'
            } satisfies Record<OrgSyncDiffAction, string>
        )[action];
    }

    diffActionSeverity(action: OrgSyncDiffAction): 'success' | 'secondary' | 'warn' | 'danger' | 'info' {
        return (
            {
                [OrgSyncDiffAction.CreateOrgUnit]: 'success',
                [OrgSyncDiffAction.UpdateOrgUnit]: 'info',
                [OrgSyncDiffAction.MoveOrgUnit]: 'warn',
                [OrgSyncDiffAction.DisableOrgUnit]: 'danger',
                [OrgSyncDiffAction.MapExistingOrgUnit]: 'info',
                [OrgSyncDiffAction.Ignore]: 'secondary',
                [OrgSyncDiffAction.Conflict]: 'danger'
            } satisfies Record<OrgSyncDiffAction, 'success' | 'secondary' | 'warn' | 'danger' | 'info'>
        )[action];
    }

    diffStatusLabel(status: OrgSyncDiffItemStatus): string {
        return (
            {
                [OrgSyncDiffItemStatus.Pending]: '待处理',
                [OrgSyncDiffItemStatus.Approved]: '已批准',
                [OrgSyncDiffItemStatus.Skipped]: '已跳过',
                [OrgSyncDiffItemStatus.Applied]: '已应用',
                [OrgSyncDiffItemStatus.Failed]: '失败'
            } satisfies Record<OrgSyncDiffItemStatus, string>
        )[status];
    }

    diffStatusSeverity(status: OrgSyncDiffItemStatus): 'success' | 'secondary' | 'warn' | 'danger' {
        return (
            {
                [OrgSyncDiffItemStatus.Pending]: 'warn',
                [OrgSyncDiffItemStatus.Approved]: 'secondary',
                [OrgSyncDiffItemStatus.Skipped]: 'secondary',
                [OrgSyncDiffItemStatus.Applied]: 'success',
                [OrgSyncDiffItemStatus.Failed]: 'danger'
            } satisfies Record<OrgSyncDiffItemStatus, 'success' | 'secondary' | 'warn' | 'danger'>
        )[status];
    }

    orgUnitName(orgUnitId: string | null): string {
        if (!orgUnitId) return '—';
        return this.platformStore.orgUnits().find((unit) => unit.id === orgUnitId)?.name ?? '—';
    }

    candidateName(item: OrgSyncDiffItemSummary): string {
        const snapshot = item.candidateSnapshot ?? {};
        const name = snapshot['name'] ?? snapshot['externalDepartmentName'] ?? snapshot['departmentName'];
        return typeof name === 'string' && name.trim() ? name : '—';
    }

    formatDateTime(value: string | null): string {
        if (!value) return '—';
        return new Intl.DateTimeFormat('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(value));
    }

    rootDepartmentLabel(value: string | null | undefined): string {
        return this.normalizeExternalRootDepartmentId(value);
    }

    selectedProviderConfigIssue(): string | null {
        const formIssue = this.sourceFormIssue();
        if (formIssue) return formIssue;
        if (!this.sourceForm.providerConfigId) return null;
        return this.sourceConfigIssue(this.sourceForm.providerConfigId);
    }

    selectedProviderConfigDiagnostic(): IdentityProviderConnectionTestResult | null {
        const providerConfigId = this.sourceForm.providerConfigId;
        const entry = providerConfigId ? (this.providerConfigDiagnostics()[providerConfigId] ?? null) : null;
        if (!entry) return null;
        return entry.rootDepartmentId === this.normalizeExternalRootDepartmentId(this.sourceForm.externalRootDepartmentId) ? entry.result : null;
    }

    isTestingSelectedProviderConfig(): boolean {
        const providerConfigId = this.sourceForm.providerConfigId;
        return Boolean(providerConfigId && this.identityProviderStore.testingConfigId() === providerConfigId);
    }

    private selectedProviderConfigOrgSyncReadinessIssue(): string | null {
        if (!this.sourceForm.providerConfigId) return null;
        const issue = this.selectedProviderConfigIssue();
        if (issue) return issue;
        if (this.isTestingSelectedProviderConfig()) return '组织同步可用性检查正在进行。';
        const diagnostic = this.selectedProviderConfigDiagnostic();
        if (!diagnostic) return '组织同步可用性检查尚未完成。';
        return diagnostic.status === IdentityProviderConnectionTestStatus.Success ? null : diagnostic.message;
    }

    diagnosticStatusLabel(status: IdentityProviderConnectionDiagnosticStatus): string {
        return (
            {
                [IdentityProviderConnectionDiagnosticStatus.Passed]: '通过',
                [IdentityProviderConnectionDiagnosticStatus.Failed]: '失败',
                [IdentityProviderConnectionDiagnosticStatus.Warning]: '提醒',
                [IdentityProviderConnectionDiagnosticStatus.Skipped]: '跳过'
            } satisfies Record<IdentityProviderConnectionDiagnosticStatus, string>
        )[status];
    }

    diagnosticStatusSeverity(status: IdentityProviderConnectionDiagnosticStatus): 'success' | 'secondary' | 'warn' | 'danger' {
        return (
            {
                [IdentityProviderConnectionDiagnosticStatus.Passed]: 'success',
                [IdentityProviderConnectionDiagnosticStatus.Failed]: 'danger',
                [IdentityProviderConnectionDiagnosticStatus.Warning]: 'warn',
                [IdentityProviderConnectionDiagnosticStatus.Skipped]: 'secondary'
            } satisfies Record<IdentityProviderConnectionDiagnosticStatus, 'success' | 'secondary' | 'warn' | 'danger'>
        )[status];
    }

    private createEmptySourceForm(): ExternalOrgSourceForm {
        return {
            provider: ExternalOrgProvider.Feishu,
            externalTenantId: '',
            displayName: '',
            providerConfigId: null,
            authoritativeOrgUnitId: null,
            externalRootDepartmentId: '0',
            syncScopesText: 'contact:department.base:readonly'
        };
    }

    private isCompatibleProviderConfig(config: IdentityProviderConfigSummary): boolean {
        return config.provider === IdentityProvider.Feishu;
    }

    private sourceFormIssue(): string | null {
        return this.sourceBindingIssue();
    }

    private sourceBindingIssue(): string | null {
        if (this.sourceForm.provider !== ExternalOrgProvider.Feishu && this.sourceForm.providerConfigId) {
            return '当前外部平台尚未支持绑定企业协同接入，请先选择“不绑定”，或切换为飞书。';
        }
        return null;
    }

    private sourceSaveIssue(editingId: string | null): string | null {
        const bindingIssue = this.sourceBindingIssue();
        if (bindingIssue) return bindingIssue;
        if (!this.sourceForm.providerConfigId) return null;
        if (!editingId) return this.sourceConfigIssue(this.sourceForm.providerConfigId);

        const selected = this.syncStore.sources().find((source) => source.id === editingId);
        if (!selected) return '同步源不存在或尚未加载，请刷新后重试。';

        const providerConfigChanged = (selected.providerConfigId ?? null) !== this.sourceForm.providerConfigId;
        if (providerConfigChanged) return this.sourceConfigIssue(this.sourceForm.providerConfigId);
        return null;
    }

    private shouldValidateOrgSyncReadinessOnSave(editingId: string | null, externalRootDepartmentId: string): boolean {
        if (!this.sourceForm.providerConfigId || this.sourceForm.provider !== ExternalOrgProvider.Feishu) return false;
        if (!editingId) return true;

        const selected = this.syncStore.sources().find((source) => source.id === editingId);
        if (!selected) return false;

        const providerConfigChanged = (selected.providerConfigId ?? null) !== this.sourceForm.providerConfigId;
        const rootDepartmentChanged = this.normalizeExternalRootDepartmentId(selected.externalRootDepartmentId) !== externalRootDepartmentId;
        return providerConfigChanged || rootDepartmentChanged;
    }

    private sourceActivationIssue(provider: ExternalOrgProvider, providerConfigId: string | null): string | null {
        if (provider !== ExternalOrgProvider.Feishu) return '当前外部平台尚未支持组织同步，请先保存为草稿。';
        return this.sourceConfigIssue(providerConfigId);
    }

    private sourceConfigIssue(providerConfigId: string | null): string | null {
        if (!providerConfigId) return '启用同步源前需要选择一个已启用且已配置 Client Secret 的企业协同接入。';
        const config = this.identityProviderStore.configs().find((candidate) => candidate.id === providerConfigId);
        if (!config) return '接入配置不存在或尚未加载，请先刷新，或到企业协同接入检查。';
        return this.providerConfigIssue(config);
    }

    private async testSelectedProviderConfigForOrgSync(): Promise<IdentityProviderConnectionTestResult | null> {
        if (this.selectedProviderConfigIssue() || !this.sourceForm.providerConfigId) return null;
        return this.testProviderConfigForOrgSync(this.sourceForm.providerConfigId, this.normalizeExternalRootDepartmentId(this.sourceForm.externalRootDepartmentId));
    }

    private async ensureSelectedProviderConfigOrgSyncReady(): Promise<string | null> {
        if (!this.sourceForm.providerConfigId) return '启用同步源前需要选择一个已启用且已配置 Client Secret 的企业协同接入。';
        return this.ensureProviderConfigOrgSyncReady(this.sourceForm.providerConfigId, this.normalizeExternalRootDepartmentId(this.sourceForm.externalRootDepartmentId));
    }

    private async ensureProviderConfigOrgSyncReady(providerConfigId: string | null, rootDepartmentId: string): Promise<string | null> {
        const staticIssue = this.sourceConfigIssue(providerConfigId);
        if (staticIssue) return staticIssue;
        if (!providerConfigId) return '启用同步源前需要选择企业协同接入。';
        const diagnostic = await this.testProviderConfigForOrgSync(providerConfigId, rootDepartmentId);
        if (!diagnostic) return '组织同步可用性检查没有完成，请稍后重试。';
        return diagnostic.status === IdentityProviderConnectionTestStatus.Success ? null : diagnostic.message;
    }

    private async testProviderConfigForOrgSync(providerConfigId: string, rootDepartmentId: string): Promise<IdentityProviderConnectionTestResult | null> {
        const config = this.identityProviderStore.configs().find((candidate) => candidate.id === providerConfigId);
        if (!config) return null;
        const normalizedRootDepartmentId = this.normalizeExternalRootDepartmentId(rootDepartmentId);
        const requestId = ++this.providerConfigDiagnosticRequestId;
        try {
            const result = await this.identityProviderStore.testConnection(providerConfigId, {
                capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
                externalRootDepartmentId: normalizedRootDepartmentId,
                expectedVersion: config.rowVersion
            });
            if (requestId === this.providerConfigDiagnosticRequestId) {
                this.cacheProviderConfigDiagnostic(providerConfigId, normalizedRootDepartmentId, result);
            }
            return result;
        } catch (error) {
            if (requestId === this.providerConfigDiagnosticRequestId) {
                this.clearProviderConfigDiagnostic(providerConfigId);
                this.#messageService.add({ severity: 'error', summary: '检查失败', detail: apiErrorMessage(error, '组织同步可用性检查没有完成') });
            }
            return null;
        }
    }

    private cacheProviderConfigDiagnostic(providerConfigId: string, rootDepartmentId: string, result: IdentityProviderConnectionTestResult): void {
        this.providerConfigDiagnostics.update((current) => ({ ...current, [providerConfigId]: { rootDepartmentId, result } }));
    }

    private clearProviderConfigDiagnostic(providerConfigId: string): void {
        this.providerConfigDiagnostics.update((current) => {
            if (!(providerConfigId in current)) return current;
            const next = { ...current };
            delete next[providerConfigId];
            return next;
        });
    }

    private scheduleSelectedProviderConfigForOrgSyncTest(): void {
        this.clearRootDepartmentDiagnosticTimer();
        this.rootDepartmentDiagnosticTimer = setTimeout(() => {
            this.rootDepartmentDiagnosticTimer = null;
            if (!this.sourceDialogVisible) return;
            void this.testSelectedProviderConfigForOrgSync();
        }, 400);
    }

    private clearRootDepartmentDiagnosticTimer(): void {
        if (!this.rootDepartmentDiagnosticTimer) return;
        clearTimeout(this.rootDepartmentDiagnosticTimer);
        this.rootDepartmentDiagnosticTimer = null;
    }

    private normalizeExternalRootDepartmentId(value: string | null | undefined): string {
        return value?.trim() || '0';
    }

    private providerConfigIssue(config: IdentityProviderConfigSummary): string | null {
        if (config.provider !== IdentityProvider.Feishu) return '当前只支持飞书组织同步。';
        if (!config.enabled) return '总开关未启用。';
        if (!config.secretConfigured) return 'Client Secret 未配置。';
        if (config.status !== IdentityProviderConfigStatus.Active) return `状态为「${this.providerConfigStatusLabel(config.status)}」，尚未就绪。`;
        return null;
    }

    private providerConfigStatusLabel(status: IdentityProviderConfigStatus): string {
        return (
            {
                [IdentityProviderConfigStatus.Draft]: '草稿',
                [IdentityProviderConfigStatus.Active]: '启用',
                [IdentityProviderConfigStatus.Disabled]: '停用',
                [IdentityProviderConfigStatus.Misconfigured]: '配置异常'
            } satisfies Record<IdentityProviderConfigStatus, string>
        )[status];
    }

    private indentedOrgUnitLabel(unit: PlatformOrgUnitSummary): string {
        const depth = this.orgUnitDepth(unit);
        return `${'· '.repeat(depth)}${unit.name}`;
    }

    private orgUnitDepth(unit: PlatformOrgUnitSummary): number {
        let depth = 0;
        let parentId = unit.parentId;
        const seen = new Set<string>();
        while (parentId && !seen.has(parentId)) {
            seen.add(parentId);
            const parent = this.platformStore.orgUnits().find((candidate) => candidate.id === parentId);
            if (!parent) break;
            depth += 1;
            parentId = parent.parentId;
        }
        return depth;
    }
}
