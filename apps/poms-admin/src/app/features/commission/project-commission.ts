import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal, type WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    AuthStore,
    CommissionAdjustmentStatus,
    CommissionAdjustmentType,
    CommissionCalculationStatus,
    CommissionPayoutStage,
    CommissionPayoutStatus,
    CommissionPayoutTier,
    CommissionStore,
    NonRetentionCommissionPayoutStage,
    ProjectStore,
    ProjectWorkspaceStore,
    RegisterRetentionCommissionPayoutRequestPayoutStageEnum,
    TargetObjectType,
    TodoStatus
} from '@poms/admin-data-access';
import type { RejectApprovalRecordRequest } from '@poms/shared-contracts';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { SectionCard } from '../../shared/ui/sectioncard';
import {
    commissionAdjustmentStatusLabelOrFallback,
    commissionAdjustmentStatusSeverityOrFallback,
    commissionCalculationStatusLabelOrFallback,
    commissionCalculationStatusSeverityOrFallback,
    commissionPayoutStatusLabelOrFallback,
    commissionPayoutStatusSeverityOrFallback,
    projectStageLabelOrFallback,
    projectStageSeverityOrFallback,
    projectStatusLabelOrFallback,
    projectStatusSeverityOrFallback
} from '../../shared/ui/status-presentation';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import {
    formatSensitiveAmountProjection,
    sensitiveProjectionDisplayText,
    type SensitiveStringFieldProjectionView
} from '../../shared/ui/sensitive-visibility';
import { buildCommissionTodoDeepLinkContext, type CommissionTodoDeepLinkQuery } from './commission-todo-deeplink';

type CommissionPayoutRow = ReturnType<CommissionStore['payouts']>[number];
type CommissionAdjustmentRow = ReturnType<CommissionStore['adjustments']>[number];

const PAYOUT_STAGE_LABELS: Record<CommissionPayoutStage, string> = {
    [CommissionPayoutStage.First]: '首期发放',
    [CommissionPayoutStage.Second]: '二期发放',
    [CommissionPayoutStage.Final]: '最终发放',
    [CommissionPayoutStage.Retention]: '质保金结算'
};

const TEMPLATE = `
    <p-toast />
    @if (loading()) {
        <app-workspace-loading label="正在读取提成操作" />
    } @else if (project()) {
        <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3">
                    <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" severity="secondary" (onClick)="goBackToProject()" class="cursor-pointer" />
                    <div>
                        <h1 class="text-xl font-semibold text-surface-950 dark:text-surface-0">提成操作 · {{ project()!.projectName }}</h1>
                    <span class="text-sm text-surface-500 dark:text-surface-400">{{ project()!.projectNo }}</span>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <p-tag [value]="getProjectStageName(project()!.currentStage)" [severity]="getProjectStageSeverity(project()!.currentStage)" />
                    <p-tag [value]="getProjectStatusName(project()!.status)" [severity]="getProjectStatusSeverity(project()!.status)" />
                    <p-button label="阶段解释" icon="pi pi-sliders-h" severity="secondary" [outlined]="true" [rounded]="true" (onClick)="goToGateOverview()" class="cursor-pointer" />
                    <p-button label="刷新" icon="pi pi-refresh" severity="secondary" [outlined]="true" [rounded]="true" (onClick)="reload()" class="cursor-pointer" />
                </div>
            </div>

            @if (todoDeepLinkContext(); as context) {
                <section-card data-testid="commission-todo-context">
                    <ng-template #title>待办上下文</ng-template>
                    <div class="mt-4 flex flex-col gap-4">
                        <app-workspace-feedback [severity]="context.targetFound ? 'info' : 'warn'" [summary]="context.summary" [detail]="context.detail" />
                        <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <div class="rounded-md border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900">
                                <div class="text-xs text-surface-400 dark:text-surface-500">目标类型</div>
                                <div class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ context.targetLabel }}</div>
                            </div>
                            <div class="rounded-md border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900">
                                <div class="text-xs text-surface-400 dark:text-surface-500">目标对象</div>
                                <div class="mt-1 break-all font-medium text-surface-950 dark:text-surface-0">{{ context.todoTargetTitle ?? context.targetId }}</div>
                            </div>
                            <div class="rounded-md border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900">
                                <div class="text-xs text-surface-400 dark:text-surface-500">审批记录</div>
                                <div class="mt-1 break-all font-medium text-surface-950 dark:text-surface-0">{{ context.approvalRecordId ?? '暂无' }}</div>
                            </div>
                            <div class="rounded-md border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900">
                                <div class="text-xs text-surface-400 dark:text-surface-500">当前节点</div>
                                <div class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ context.currentNodeName ?? '暂无待办摘要' }}</div>
                            </div>
                        </div>
                    </div>
                </section-card>
            }

            <section-card>
                <ng-template #title>当前状态</ng-template>
                <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1">
                        <div class="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800"><div class="text-xs text-surface-400 dark:text-surface-500">当前提成池</div><div class="text-lg font-semibold text-surface-950 dark:text-surface-0">{{ currentPool() }}</div></div>
                        <div class="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800"><div class="text-xs text-surface-400 dark:text-surface-500">待审批发放</div><div class="text-lg font-semibold text-surface-950 dark:text-surface-0">{{ commissionStore.pendingApprovalCount() }}</div></div>
                        <div class="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800"><div class="text-xs text-surface-400 dark:text-surface-500">待审批调整</div><div class="text-lg font-semibold text-surface-950 dark:text-surface-0">{{ commissionStore.pendingAdjustmentCount() }}</div></div>
                        <div class="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800"><div class="text-xs text-surface-400 dark:text-surface-500">已登记发放</div><div class="text-lg font-semibold text-surface-950 dark:text-surface-0">{{ commissionStore.paidPayoutCount() }}</div></div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <p-button label="触发计算" icon="pi pi-calculator" severity="primary" [rounded]="true" (onClick)="openTriggerDialog()" class="cursor-pointer" />
                        <p-button label="创建发放草稿" icon="pi pi-wallet" severity="secondary" [outlined]="true" [rounded]="true" [disabled]="!commissionStore.currentEffectiveCalculation()" (onClick)="openCreatePayoutDialog()" class="cursor-pointer" />
                        <p-button label="发起调整" icon="pi pi-exclamation-circle" severity="contrast" [outlined]="true" [rounded]="true" [disabled]="payoutOptions().length === 0" (onClick)="openCreateAdjustmentDialog()" class="cursor-pointer" />
                    </div>
                </div>
            </section-card>

            <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <section-card class="xl:col-span-2">
                    <ng-template #title>计算结果</ng-template>
                    <p-table
                        #calculationTable
                        [value]="calculations()"
                        [loading]="commissionStore.loadingCalculations()"
                        [paginator]="true"
                        [rows]="tableRows"
                        [rowHover]="true"
                        [showGridlines]="true"
                        [globalFilterFields]="['version', 'status', 'commissionPoolProjection.displayText']"
                        responsiveLayout="scroll"
                        [tableStyle]="{ width: '100%', 'min-width': '42rem' }"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 条"
                        class="mt-4"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #caption>
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (click)="clearTable(calculationTable, calculationSearchValue)"></button>
                                <p-iconfield class="w-full sm:w-64">
                                    <p-inputicon class="pi pi-search" />
                                    <input pInputText [ngModel]="calculationSearchValue()" (ngModelChange)="calculationSearchValue.set($event)" (input)="onGlobalFilter(calculationTable, $event)" placeholder="搜索版本或状态" class="w-full! rounded-md! py-2!" />
                                </p-iconfield>
                            </div>
                        </ng-template>
                        <ng-template #header><tr><th>版本</th><th>提成池</th><th>状态</th><th>操作</th></tr></ng-template>
                        <ng-template #body let-item>
                            <tr>
                                <td><div class="flex flex-col gap-1"><span class="font-medium text-surface-950 dark:text-surface-0">V{{ item.version }}</span><span class="text-xs text-surface-400 dark:text-surface-500">{{ formatSensitiveRateProjection(item.contributionMarginRateProjection) }}</span></div></td>
                                <td>{{ formatSensitiveAmountProjection(item.commissionPoolProjection) }}</td>
                                <td><p-tag [value]="getCalculationStatusName(item.status)" [severity]="getCalculationStatusSeverity(item.status)" /></td>
                                <td>
                                    <div class="flex flex-wrap gap-2">
                                        @if (item.status === calculationStatus.Calculated) { <p-button label="确认生效" size="small" severity="success" [rounded]="true" [loading]="commissionStore.saving()" (onClick)="confirmCalculation(item.id, item.rowVersion)" class="cursor-pointer" /> }
                                        @if (item.status === calculationStatus.Effective && item.isCurrent) { <p-button label="重算" size="small" severity="warn" [outlined]="true" [rounded]="true" [loading]="commissionStore.saving()" (onClick)="openRecalculateDialog(item.id, item.rowVersion, sensitiveProjectionValue(item.recognizedRevenueTaxExclusiveProjection), sensitiveProjectionValue(item.recognizedCostTaxExclusiveProjection))" class="cursor-pointer" /> }
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage><tr><td colspan="4" class="py-8 text-center text-surface-400">暂无计算结果</td></tr></ng-template>
                        <ng-template #loadingbody><tr><td colspan="4" class="py-8 text-center text-surface-400">正在读取计算结果</td></tr></ng-template>
                    </p-table>
                </section-card>

                <section-card class="xl:col-span-3">
                    <ng-template #title>发放记录</ng-template>
                    <p-menu #payoutActionMenu [model]="payoutActionItems()" [popup]="true" styleClass="w-48!" appendTo="body" />
                    <p-table
                        #payoutTable
                        [value]="payouts()"
                        [loading]="commissionStore.loadingPayouts()"
                        [paginator]="true"
                        [rows]="tableRows"
                        [rowHover]="true"
                        [showGridlines]="true"
                        [globalFilterFields]="['stageType', 'selectedTier', 'status', 'payoutKind', 'theoreticalCapAmountProjection.displayText']"
                        responsiveLayout="scroll"
                        [tableStyle]="{ width: '100%', 'min-width': '54rem' }"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 条"
                        class="mt-4"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #caption>
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (click)="clearTable(payoutTable, payoutSearchValue)"></button>
                                <p-iconfield class="w-full sm:w-72">
                                    <p-inputicon class="pi pi-search" />
                                    <input pInputText [ngModel]="payoutSearchValue()" (ngModelChange)="payoutSearchValue.set($event)" (input)="onGlobalFilter(payoutTable, $event)" placeholder="搜索阶段、档位或状态" class="w-full! rounded-md! py-2!" />
                                </p-iconfield>
                            </div>
                        </ng-template>
                        <ng-template #header><tr><th>阶段</th><th>档位</th><th>理论上限</th><th>状态</th><th style="width: 7rem">操作</th></tr></ng-template>
                        <ng-template #body let-item>
                            <tr [attr.data-testid]="highlightedPayoutId() === item.id ? 'commission-payout-highlighted-row' : null" [ngClass]="highlightedPayoutId() === item.id ? 'bg-primary-50/70 dark:bg-primary-950/20' : ''">
                                <td><div class="flex flex-col gap-2"><span>{{ getStageLabel(item.stageType) }}</span><p-tag [value]="getPayoutKindLabel(item.payoutKind)" severity="secondary" /></div></td>
                                <td>{{ getTierLabel(item.selectedTier) }}</td>
                                <td>{{ formatSensitiveAmountProjection(item.theoreticalCapAmountProjection) }}</td>
                                <td><div class="flex flex-col gap-2"><p-tag [value]="getPayoutStatusName(item.status)" [severity]="getPayoutStatusSeverity(item.status)" /> @if (todoForPayout(item.id)) { <span class="text-[11px] text-primary-600 dark:text-primary-300">你有待处理审批</span> }</div></td>
                                <td>
                                    <p-button icon="pi pi-ellipsis-h" label="操作" size="small" severity="secondary" [outlined]="true" [rounded]="true" [disabled]="!hasPayoutActions(item)" (onClick)="openPayoutActions($event, item, payoutActionMenu)" class="cursor-pointer" />
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage><tr><td colspan="5" class="py-8 text-center text-surface-400">暂无发放记录</td></tr></ng-template>
                        <ng-template #loadingbody><tr><td colspan="5" class="py-8 text-center text-surface-400">正在读取发放记录</td></tr></ng-template>
                    </p-table>
                </section-card>
            </div>

            <section-card>
                <ng-template #title>异常调整</ng-template>
                <p-menu #adjustmentActionMenu [model]="adjustmentActionItems()" [popup]="true" styleClass="w-48!" appendTo="body" />
                <p-table
                    #adjustmentTable
                    [value]="adjustments()"
                    [loading]="commissionStore.loadingAdjustments()"
                    [paginator]="true"
                    [rows]="tableRows"
                    [rowHover]="true"
                    [showGridlines]="true"
                    [globalFilterFields]="['adjustmentType', 'status', 'reasonProjection.displayText']"
                    responsiveLayout="scroll"
                    [tableStyle]="{ width: '100%', 'min-width': '64rem' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 条"
                    class="mt-4"
                    [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #caption>
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (click)="clearTable(adjustmentTable, adjustmentSearchValue)"></button>
                            <p-iconfield class="w-full sm:w-72">
                                <p-inputicon class="pi pi-search" />
                                <input pInputText [ngModel]="adjustmentSearchValue()" (ngModelChange)="adjustmentSearchValue.set($event)" (input)="onGlobalFilter(adjustmentTable, $event)" placeholder="搜索类型、状态或原因" class="w-full! rounded-md! py-2!" />
                            </p-iconfield>
                        </div>
                    </ng-template>
                    <ng-template #header><tr><th>类型</th><th>关联对象</th><th>金额</th><th>状态</th><th>原因</th><th style="width: 7rem">操作</th></tr></ng-template>
                    <ng-template #body let-item>
                        <tr [attr.data-testid]="highlightedAdjustmentId() === item.id ? 'commission-adjustment-highlighted-row' : null" [ngClass]="highlightedAdjustmentId() === item.id ? 'bg-primary-50/70 dark:bg-primary-950/20' : ''">
                            <td>{{ getAdjustmentTypeLabel(item.adjustmentType) }}</td>
                            <td>{{ getAdjustmentTargetLabel(item.relatedPayoutId, item.relatedCalculationId) }}</td>
                            <td>{{ formatSensitiveAmountProjection(item.amountProjection) }}</td>
                            <td><div class="flex flex-col gap-2"><p-tag [value]="getAdjustmentStatusName(item.status)" [severity]="getAdjustmentStatusSeverity(item.status)" /> @if (todoForAdjustment(item.id)) { <span class="text-[11px] text-primary-600 dark:text-primary-300">你有待处理审批</span> }</div></td>
                            <td class="max-w-80"><span class="line-clamp-2">{{ sensitiveProjectionDisplayText(item.reasonProjection) }}</span></td>
                            <td>
                                <p-button icon="pi pi-ellipsis-h" label="操作" size="small" severity="secondary" [outlined]="true" [rounded]="true" [disabled]="!hasAdjustmentActions(item)" (onClick)="openAdjustmentActions($event, item, adjustmentActionMenu)" class="cursor-pointer" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage><tr><td colspan="6" class="py-8 text-center text-surface-400">暂无调整记录</td></tr></ng-template>
                    <ng-template #loadingbody><tr><td colspan="6" class="py-8 text-center text-surface-400">正在读取调整记录</td></tr></ng-template>
                </p-table>
            </section-card>
        </div>
    } @else {
        <div class="py-20 text-center">
            <app-workspace-feedback severity="warn" summary="项目未找到" detail="请返回项目列表重新选择项目。" />
            <p-button label="返回项目列表" icon="pi pi-arrow-left" [text]="true" (onClick)="goBackToList()" class="mt-4 cursor-pointer" />
        </div>
    }

    <p-dialog [(visible)]="triggerDialogVisible" [modal]="true" header="触发提成计算" [style]="{ width: '30rem' }" styleClass="p-fluid">
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-2">
                <label class="font-medium">提成规则版本</label>
                <p-select [(ngModel)]="triggerForm.ruleVersionId" [options]="activeRuleOptions()" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
            </div>
            <div class="flex flex-col gap-2"><label class="font-medium">确认收入（不含税）</label><input pInputText [(ngModel)]="triggerForm.recognizedRevenueTaxExclusive" class="w-full" /></div>
            <div class="flex flex-col gap-2"><label class="font-medium">确认成本（不含税）</label><input pInputText [(ngModel)]="triggerForm.recognizedCostTaxExclusive" class="w-full" /></div>
        </div>
        <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="triggerDialogVisible = false" /><p-button label="开始计算" icon="pi pi-calculator" [loading]="commissionStore.saving()" (onClick)="triggerCalculation()" /></div></ng-template>
    </p-dialog>

    <p-dialog [(visible)]="recalculateDialogVisible" [modal]="true" header="重算提成版本" [style]="{ width: '32rem' }" styleClass="p-fluid">
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-2"><label class="font-medium">重算原因</label><textarea pTextarea [(ngModel)]="recalculateForm.reason" [rows]="4" class="w-full"></textarea></div>
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2"><label class="font-medium">确认收入（不含税）</label><input pInputText [(ngModel)]="recalculateForm.recognizedRevenueTaxExclusive" class="w-full" /></div>
                <div class="flex flex-col gap-2"><label class="font-medium">确认成本（不含税）</label><input pInputText [(ngModel)]="recalculateForm.recognizedCostTaxExclusive" class="w-full" /></div>
            </div>
        </div>
        <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="recalculateDialogVisible = false" /><p-button label="生成新版本" icon="pi pi-refresh" severity="warn" [loading]="commissionStore.saving()" (onClick)="recalculateCalculation()" /></div></ng-template>
    </p-dialog>

    <p-dialog [(visible)]="createPayoutDialogVisible" [modal]="true" header="创建发放草稿" [style]="{ width: '32rem' }" styleClass="p-fluid">
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-2"><label class="font-medium">计算版本</label><p-select [(ngModel)]="createPayoutForm.calculationId" [options]="effectiveCalculationOptions()" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2"><label class="font-medium">发放阶段</label><p-select [(ngModel)]="createPayoutForm.stageType" [options]="stageOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
                <div class="flex flex-col gap-2"><label class="font-medium">审批档位</label><p-select [(ngModel)]="createPayoutForm.selectedTier" [options]="tierOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
            </div>
        </div>
        <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createPayoutDialogVisible = false" /><p-button label="创建草稿" icon="pi pi-wallet" [loading]="commissionStore.saving()" (onClick)="createPayout()" /></div></ng-template>
    </p-dialog>

    <p-dialog [(visible)]="createAdjustmentDialogVisible" [modal]="true" header="发起异常调整" [style]="{ width: '34rem' }" styleClass="p-fluid">
        <div class="flex flex-col gap-4 py-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2"><label class="font-medium">调整类型</label><p-select [(ngModel)]="adjustmentForm.adjustmentType" [options]="adjustmentTypeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
                <div class="flex flex-col gap-2"><label class="font-medium">关联发放记录</label><p-select [(ngModel)]="adjustmentForm.relatedPayoutId" [options]="payoutOptions()" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
            </div>
            @if (requiresAdjustmentAmount()) { <div class="flex flex-col gap-2"><label class="font-medium">调整金额</label><input pInputText [(ngModel)]="adjustmentForm.amount" class="w-full" /></div> }
            <div class="flex flex-col gap-2"><label class="font-medium">调整原因</label><textarea pTextarea [(ngModel)]="adjustmentForm.reason" [rows]="4" class="w-full"></textarea></div>
        </div>
        <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createAdjustmentDialogVisible = false" /><p-button label="创建调整" icon="pi pi-exclamation-circle" severity="contrast" [loading]="commissionStore.saving()" (onClick)="createAdjustment()" /></div></ng-template>
    </p-dialog>

    <p-dialog [(visible)]="registerDialogVisible" [modal]="true" header="登记业务发放" [style]="{ width: '30rem' }" styleClass="p-fluid">
        <div class="flex flex-col gap-4 py-4"><div class="flex flex-col gap-2"><label class="font-medium">登记发放金额</label><input pInputText [(ngModel)]="registerForm.paidRecordAmount" class="w-full" /></div></div>
        <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="registerDialogVisible = false" /><p-button label="登记" icon="pi pi-check-circle" [loading]="commissionStore.saving()" (onClick)="registerPayout()" /></div></ng-template>
    </p-dialog>

    <p-dialog [(visible)]="rejectDialogVisible" [modal]="true" [header]="rejectMode === 'adjustment' ? '驳回调整审批' : '驳回发放审批'" [style]="{ width: '34rem' }" styleClass="p-fluid">
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-2"><label class="font-medium">驳回原因</label><input pInputText [(ngModel)]="rejectForm.reason" class="w-full" /></div>
            <div class="flex flex-col gap-2"><label class="font-medium">补充说明</label><textarea pTextarea [(ngModel)]="rejectForm.comment" [rows]="4" class="w-full"></textarea></div>
        </div>
        <ng-template #footer><div class="flex justify-end gap-2"><p-button label="取消" severity="secondary" [outlined]="true" (onClick)="rejectDialogVisible = false" /><p-button label="确认驳回" severity="danger" icon="pi pi-times" [loading]="commissionStore.saving()" (onClick)="rejectDecision()" /></div></ng-template>
    </p-dialog>
`;

@Component({
    selector: 'app-project-commission',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, TagModule, ButtonModule, DialogModule, IconFieldModule, InputIconModule, InputTextModule, MenuModule, SelectModule, TableModule, TextareaModule, ToastModule, WorkspaceFeedback, WorkspaceLoading],
    providers: [CommissionStore, MessageService],
    template: TEMPLATE
})
export class ProjectCommission implements OnInit, OnDestroy {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);
    readonly #messageService = inject(MessageService);
    readonly #authStore = inject(AuthStore);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);
    readonly projectStore = inject(ProjectStore);
    readonly commissionStore = inject(CommissionStore);

    readonly project = this.projectStore.selectedProject;
    readonly calculations = this.commissionStore.calculations;
    readonly payouts = this.commissionStore.payouts;
    readonly adjustments = this.commissionStore.adjustments;
    readonly loading = computed(() => this.projectStore.loading() || this.commissionStore.loadingRuleVersions() || this.commissionStore.loadingCalculations() || this.commissionStore.loadingPayouts() || this.commissionStore.loadingAdjustments());
    readonly currentPool = computed(() => {
        const currentCalculation = this.commissionStore.currentEffectiveCalculation();
        return currentCalculation ? this.formatSensitiveAmountProjection(currentCalculation.commissionPoolProjection) : '--';
    });
    readonly formatSensitiveAmountProjection = formatSensitiveAmountProjection;
    readonly sensitiveProjectionDisplayText = sensitiveProjectionDisplayText;
    readonly calculationStatus = CommissionCalculationStatus;
    readonly payoutStageEnum = CommissionPayoutStage;
    readonly payoutStatus = CommissionPayoutStatus;
    readonly adjustmentStatus = CommissionAdjustmentStatus;
    readonly stageOptions = [CommissionPayoutStage.First, CommissionPayoutStage.Second, CommissionPayoutStage.Final].map((value) => ({
        label: PAYOUT_STAGE_LABELS[value],
        value
    }));
    readonly tierOptions = [
        { label: '基础档', value: CommissionPayoutTier.Basic },
        { label: '中档', value: CommissionPayoutTier.Mid },
        { label: '上限档', value: CommissionPayoutTier.Premium }
    ];
    readonly adjustmentTypeOptions = [
        { label: '暂停发放', value: CommissionAdjustmentType.SuspendPayout },
        { label: '冲销发放', value: CommissionAdjustmentType.ReversePayout },
        { label: '扣回', value: CommissionAdjustmentType.Clawback },
        { label: '补发', value: CommissionAdjustmentType.Supplement }
    ];
    readonly payoutTodoMap = computed(
        () =>
            new Map(
                this.#authStore
                    .myTodos()
                    .filter((todo) => todo.targetObjectType === TargetObjectType.CommissionPayout && todo.status === TodoStatus.Open)
                    .map((todo) => [todo.targetObjectId, todo])
            )
    );
    readonly adjustmentTodoMap = computed(
        () =>
            new Map(
                this.#authStore
                    .myTodos()
                    .filter((todo) => todo.targetObjectType === TargetObjectType.CommissionAdjustment && todo.status === TodoStatus.Open)
                    .map((todo) => [todo.targetObjectId, todo])
            )
    );
    readonly activeRuleOptions = computed(() =>
        this.commissionStore.activeRuleVersions().map((item) => ({
            label: `${item.ruleCode} · V${item.version}`,
            value: item.id
        }))
    );
    readonly payoutById = computed(() => new Map(this.payouts().map((item) => [item.id, item])));
    readonly calculationById = computed(() => new Map(this.calculations().map((item) => [item.id, item])));
    readonly primaryPayouts = computed(() => this.payouts().filter((item) => item.payoutKind === 'primary'));
    readonly effectiveCalculationOptions = computed(() =>
        this.calculations()
            .filter((item) => item.status === this.calculationStatus.Effective)
            .map((item) => ({
                label: `V${item.version} · 提成池 ${this.formatSensitiveAmountProjection(item.commissionPoolProjection)}`,
                value: item.id
            }))
    );
    readonly payoutOptions = computed(() =>
        this.primaryPayouts().map((item) => ({
            label: `${this.getStageLabel(item.stageType)} · ${this.getPayoutStatusName(item.status)} · ${this.formatSensitiveAmountProjection(item.theoreticalCapAmountProjection)}`,
            value: item.id
        }))
    );

    readonly tableRows = 5;
    readonly calculationSearchValue = signal('');
    readonly payoutSearchValue = signal('');
    readonly adjustmentSearchValue = signal('');
    readonly payoutActionItems = signal<MenuItem[]>([]);
    readonly adjustmentActionItems = signal<MenuItem[]>([]);
    readonly todoDeepLinkQuery = signal<CommissionTodoDeepLinkQuery>({
        payoutId: null,
        adjustmentId: null,
        approvalRecordId: null
    });
    readonly todoDeepLinkContext = computed(() =>
        buildCommissionTodoDeepLinkContext({
            query: this.todoDeepLinkQuery(),
            todos: this.#authStore.myTodos(),
            payoutIds: new Set(this.payouts().map((item) => item.id)),
            adjustmentIds: new Set(this.adjustments().map((item) => item.id))
        })
    );
    readonly highlightedPayoutId = computed(() => this.todoDeepLinkContext()?.highlightPayoutId ?? null);
    readonly highlightedAdjustmentId = computed(() => this.todoDeepLinkContext()?.highlightAdjustmentId ?? null);
    triggerDialogVisible = false;
    recalculateDialogVisible = false;
    createPayoutDialogVisible = false;
    createAdjustmentDialogVisible = false;
    registerDialogVisible = false;
    rejectDialogVisible = false;
    rejectMode: 'payout' | 'adjustment' = 'payout';
    triggerForm = { ruleVersionId: '', recognizedRevenueTaxExclusive: '', recognizedCostTaxExclusive: '' };
    recalculateForm = { calculationId: '', expectedVersion: undefined as number | undefined, reason: '', recognizedRevenueTaxExclusive: '', recognizedCostTaxExclusive: '' };
    createPayoutForm = { calculationId: '', stageType: CommissionPayoutStage.First, selectedTier: CommissionPayoutTier.Basic };
    adjustmentForm = { adjustmentType: CommissionAdjustmentType.SuspendPayout, relatedPayoutId: '', amount: '', reason: '' };
    registerForm = {
        payoutId: '',
        payoutStage: CommissionPayoutStage.First,
        summarySnapshotId: undefined as string | undefined,
        expectedVersion: undefined as number | undefined,
        paidRecordAmount: ''
    };
    rejectForm = { approvalRecordId: '', expectedVersion: undefined as number | undefined, reason: '', comment: '' };

    ngOnInit() {
        const projectId = this.projectId();
        this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
            this.todoDeepLinkQuery.set({
                payoutId: params.get('payoutId'),
                adjustmentId: params.get('adjustmentId'),
                approvalRecordId: params.get('approvalRecordId')
            });
        });
        if (projectId) {
            void this.commissionStore.reload(projectId);
            void this.#workspaceStore.loadCommissionFinalSettlement(projectId).catch(() => undefined);
        }
    }

    ngOnDestroy() {
        this.commissionStore.clear();
    }

    projectId() {
        return this.#route.parent?.snapshot.paramMap.get('id');
    }
    todoForPayout(payoutId: string) {
        return this.payoutTodoMap().get(payoutId) ?? null;
    }
    todoForAdjustment(adjustmentId: string) {
        return this.adjustmentTodoMap().get(adjustmentId) ?? null;
    }
    requiresAdjustmentAmount() {
        return this.adjustmentForm.adjustmentType === CommissionAdjustmentType.Clawback || this.adjustmentForm.adjustmentType === CommissionAdjustmentType.Supplement;
    }
    goBackToProject() {
        const id = this.projectId();
        if (id) this.#router.navigate(['/projects', id]);
    }
    goToGateOverview() {
        const id = this.projectId();
        if (id) this.#router.navigate(['/projects', id, 'commission', 'gate-overview']);
    }
    goToFinalSettlement() {
        const id = this.projectId();
        if (id) this.#router.navigate(['/projects', id, 'commission', 'final-settlement']);
    }
    goBackToList() {
        this.#router.navigate(['/projects']);
    }
    async reload() {
        const id = this.projectId();
        if (!id) return;
        await Promise.all([this.commissionStore.reload(id), this.#workspaceStore.loadCommissionFinalSettlement(id).catch(() => undefined)]);
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    clearTable(table: Table, searchValue: WritableSignal<string>) {
        searchValue.set('');
        table.clear();
    }

    hasPayoutActions(item: CommissionPayoutRow) {
        return this.buildPayoutActionItems(item).some((action) => !action.disabled);
    }

    openPayoutActions(event: Event, item: CommissionPayoutRow, menu: Menu) {
        this.payoutActionItems.set(this.buildPayoutActionItems(item));
        menu.toggle(event);
    }

    hasAdjustmentActions(item: CommissionAdjustmentRow) {
        return this.buildAdjustmentActionItems(item).some((action) => !action.disabled);
    }

    openAdjustmentActions(event: Event, item: CommissionAdjustmentRow, menu: Menu) {
        this.adjustmentActionItems.set(this.buildAdjustmentActionItems(item));
        menu.toggle(event);
    }

    openTriggerDialog() {
        const defaultRuleVersionId = this.commissionStore.activeRuleVersions()[0]?.id ?? '';
        if (!defaultRuleVersionId) {
            this.#messageService.add({ severity: 'warn', summary: '暂无可用规则版本', detail: '请先激活提成规则版本，再触发提成计算' });
            return;
        }
        this.triggerForm = { ruleVersionId: defaultRuleVersionId, recognizedRevenueTaxExclusive: '', recognizedCostTaxExclusive: '' };
        this.triggerDialogVisible = true;
    }

    async triggerCalculation() {
        const id = this.projectId();
        if (!id) return;
        if (!this.triggerForm.ruleVersionId || !this.triggerForm.recognizedRevenueTaxExclusive.trim() || !this.triggerForm.recognizedCostTaxExclusive.trim()) {
            return this.#messageService.add({ severity: 'warn', summary: '请填写必填项' });
        }
        try {
            const calculation = await this.commissionStore.triggerCalculation(id, {
                ruleVersionId: this.triggerForm.ruleVersionId,
                recognizedRevenueTaxExclusive: this.triggerForm.recognizedRevenueTaxExclusive.trim(),
                recognizedCostTaxExclusive: this.triggerForm.recognizedCostTaxExclusive.trim()
            });
            this.triggerDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '计算完成', detail: `已生成提成计算版本 V${calculation.version}` });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '计算失败', detail: this.getErrorMessage(error) });
        }
    }

    openRecalculateDialog(calculationId: string, expectedVersion: number, revenue: string, cost: string) {
        this.recalculateForm = { calculationId, expectedVersion, reason: '', recognizedRevenueTaxExclusive: revenue, recognizedCostTaxExclusive: cost };
        this.recalculateDialogVisible = true;
    }

    async recalculateCalculation() {
        const id = this.projectId();
        if (!id) return;
        if (!this.recalculateForm.reason.trim()) return this.#messageService.add({ severity: 'warn', summary: '请填写重算原因' });
        try {
            const calculation = await this.commissionStore.recalculateCalculation(id, this.recalculateForm.calculationId, {
                reason: this.recalculateForm.reason.trim(),
                recognizedRevenueTaxExclusive: this.recalculateForm.recognizedRevenueTaxExclusive.trim(),
                recognizedCostTaxExclusive: this.recalculateForm.recognizedCostTaxExclusive.trim(),
                expectedVersion: this.recalculateForm.expectedVersion
            });
            this.recalculateDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '重算完成', detail: `已生成新的提成计算版本 V${calculation.version}` });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '重算失败', detail: this.getErrorMessage(error) });
        }
    }

    async confirmCalculation(calcId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.confirmCalculation(id, calcId, { expectedVersion });
            this.#messageService.add({ severity: 'success', summary: '已生效', detail: '当前提成计算版本已确认生效' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '生效失败', detail: this.getErrorMessage(error) });
        }
    }

    openCreatePayoutDialog() {
        const effective = this.commissionStore.currentEffectiveCalculation();
        this.createPayoutForm = { calculationId: effective?.id ?? '', stageType: CommissionPayoutStage.First, selectedTier: CommissionPayoutTier.Basic };
        this.createPayoutDialogVisible = true;
    }

    async createPayout() {
        const id = this.projectId();
        if (!id) return;
        if (!this.createPayoutForm.calculationId) return this.#messageService.add({ severity: 'warn', summary: '请选择计算版本' });
        try {
            await this.commissionStore.createPayout(id, this.createPayoutForm);
            this.createPayoutDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '草稿已创建' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '创建失败', detail: this.getErrorMessage(error) });
        }
    }

    async submitPayoutApproval(payoutId: string, payoutStage: CommissionPayoutStage, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.submitPayoutApproval(id, payoutId, {
                payoutStage: this.toSubmitPayoutStage(payoutStage),
                expectedVersion
            });
            this.#messageService.add({ severity: 'success', summary: '提交成功', detail: '发放审批已进入统一待办' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '提交失败', detail: this.getErrorMessage(error) });
        }
    }

    async approvePayout(approvalRecordId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.approvePayoutApproval(id, approvalRecordId, expectedVersion);
            this.#messageService.add({ severity: 'success', summary: '审批通过', detail: '当前可继续登记业务发放' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '审批失败', detail: this.getErrorMessage(error) });
        }
    }

    openCreateAdjustmentDialog() {
        this.adjustmentForm = { adjustmentType: CommissionAdjustmentType.SuspendPayout, relatedPayoutId: this.primaryPayouts()[0]?.id ?? '', amount: '', reason: '' };
        this.createAdjustmentDialogVisible = true;
    }

    async createAdjustment() {
        const id = this.projectId();
        if (!id) return;
        if (!this.adjustmentForm.relatedPayoutId) return this.#messageService.add({ severity: 'warn', summary: '请选择关联发放记录' });
        if (!this.adjustmentForm.reason.trim()) return this.#messageService.add({ severity: 'warn', summary: '请填写调整原因' });
        const relatedPayout = this.payoutById().get(this.adjustmentForm.relatedPayoutId);
        try {
            await this.commissionStore.createAdjustment(id, {
                adjustmentType: this.adjustmentForm.adjustmentType,
                relatedPayoutId: this.adjustmentForm.relatedPayoutId,
                relatedCalculationId: relatedPayout?.calculationId ?? null,
                reason: this.adjustmentForm.reason.trim(),
                ...(this.adjustmentForm.amount.trim() ? { amount: this.adjustmentForm.amount.trim() } : {})
            });
            this.createAdjustmentDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '调整草稿已创建' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '创建失败', detail: this.getErrorMessage(error) });
        }
    }

    async submitAdjustmentApproval(adjustmentId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.submitAdjustmentApproval(id, adjustmentId, { expectedVersion });
            this.#messageService.add({ severity: 'success', summary: '提交成功', detail: '调整审批已进入统一待办' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '提交失败', detail: this.getErrorMessage(error) });
        }
    }

    async approveAdjustment(approvalRecordId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.approveAdjustmentApproval(id, approvalRecordId, expectedVersion);
            this.#messageService.add({ severity: 'success', summary: '审批通过', detail: '当前调整已可执行' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '审批失败', detail: this.getErrorMessage(error) });
        }
    }

    async executeAdjustment(adjustmentId: string, expectedVersion: number) {
        const id = this.projectId();
        if (!id) return;
        try {
            await this.commissionStore.executeAdjustment(id, adjustmentId, { expectedVersion });
            this.#messageService.add({ severity: 'success', summary: '执行成功', detail: '当前调整已完成并回写业务状态' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '执行失败', detail: this.getErrorMessage(error) });
        }
    }

    openRejectDialog(mode: 'payout' | 'adjustment', approvalRecordId: string, expectedVersion: number) {
        this.rejectMode = mode;
        this.rejectForm = { approvalRecordId, expectedVersion, reason: '', comment: '' };
        this.rejectDialogVisible = true;
    }

    async rejectDecision() {
        const id = this.projectId();
        if (!id) return;
        if (!this.rejectForm.reason.trim()) return this.#messageService.add({ severity: 'warn', summary: '请填写驳回原因' });
        const request: RejectApprovalRecordRequest = { reason: this.rejectForm.reason.trim(), expectedVersion: this.rejectForm.expectedVersion, ...(this.rejectForm.comment.trim() ? { comment: this.rejectForm.comment.trim() } : {}) };
        try {
            if (this.rejectMode === 'adjustment') {
                await this.commissionStore.rejectAdjustmentApproval(id, this.rejectForm.approvalRecordId, request);
            } else {
                await this.commissionStore.rejectPayoutApproval(id, this.rejectForm.approvalRecordId, request);
            }
            this.rejectDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '已驳回', detail: this.rejectMode === 'adjustment' ? '调整审批已退回草稿' : '发放审批已退回草稿' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '驳回失败', detail: this.getErrorMessage(error) });
        }
    }

    openRegisterDialog(payoutId: string, payoutStage: CommissionPayoutStage, defaultAmount: string, expectedVersion: number) {
        const summarySnapshotId = payoutStage === CommissionPayoutStage.Retention ? this.#workspaceStore.commissionFinalSettlement()?.summarySnapshotId : undefined;

        if (payoutStage === CommissionPayoutStage.Retention && !summarySnapshotId) {
            this.#messageService.add({
                severity: 'warn',
                summary: '请先刷新结算链',
                detail: '当前缺少质保金登记所需的结算快照锚点，请先进入最终结算页确认当前结算链。'
            });
            return;
        }

        this.registerForm = { payoutId, payoutStage, summarySnapshotId, expectedVersion, paidRecordAmount: defaultAmount };
        this.registerDialogVisible = true;
    }

    async registerPayout() {
        const id = this.projectId();
        if (!id) return;
        if (!this.registerForm.paidRecordAmount.trim()) return this.#messageService.add({ severity: 'warn', summary: '请填写发放金额' });
        try {
            if (this.registerForm.payoutStage === CommissionPayoutStage.Retention) {
                const summarySnapshotId = this.registerForm.summarySnapshotId;
                if (!summarySnapshotId) {
                    throw new Error('当前页面缺少质保金登记所需的结算快照锚点');
                }

                await this.commissionStore.registerPayout(id, this.registerForm.payoutId, {
                    payoutStage: RegisterRetentionCommissionPayoutRequestPayoutStageEnum.Retention,
                    paidRecordAmount: this.registerForm.paidRecordAmount.trim(),
                    summarySnapshotId,
                    expectedVersion: this.registerForm.expectedVersion
                });
            } else {
                await this.commissionStore.registerPayout(id, this.registerForm.payoutId, {
                    payoutStage: this.toRegisterPayoutStage(this.registerForm.payoutStage),
                    paidRecordAmount: this.registerForm.paidRecordAmount.trim(),
                    expectedVersion: this.registerForm.expectedVersion
                });
            }
            this.registerDialogVisible = false;
            this.#messageService.add({ severity: 'success', summary: '登记成功' });
        } catch (error) {
            this.#messageService.add({ severity: 'error', summary: '登记失败', detail: this.getErrorMessage(error) });
        }
    }

    private buildPayoutActionItems(item: CommissionPayoutRow): MenuItem[] {
        const saving = this.commissionStore.saving();
        const todo = this.todoForPayout(item.id);
        const actions: MenuItem[] = [];

        if (item.payoutKind === 'primary' && item.status === this.payoutStatus.Draft && item.stageType !== this.payoutStageEnum.Retention) {
            actions.push({
                label: '提交审批',
                icon: 'pi pi-send',
                disabled: saving,
                command: () => void this.submitPayoutApproval(item.id, item.stageType, item.rowVersion)
            });
        }

        if (item.payoutKind === 'primary' && item.status === this.payoutStatus.Draft && item.stageType === this.payoutStageEnum.Retention) {
            actions.push({
                label: '查看结算链',
                icon: 'pi pi-link',
                command: () => this.goToFinalSettlement()
            });
        }

        if (item.payoutKind === 'primary' && item.status === this.payoutStatus.PendingApproval && todo) {
            actions.push(
                {
                    label: '审批通过',
                    icon: 'pi pi-check',
                    disabled: saving,
                    command: () => void this.approvePayout(todo.sourceId, todo.rowVersion)
                },
                {
                    label: '驳回',
                    icon: 'pi pi-times',
                    disabled: saving,
                    command: () => this.openRejectDialog('payout', todo.sourceId, todo.rowVersion)
                }
            );
        }

        if (item.payoutKind === 'primary' && item.status === this.payoutStatus.Approved) {
            actions.push({
                label: '登记发放',
                icon: 'pi pi-wallet',
                disabled: saving,
                command: () =>
                    this.openRegisterDialog(
                        item.id,
                        item.stageType,
                        this.sensitiveProjectionValue(item.approvedAmountProjection) ||
                            this.sensitiveProjectionValue(item.theoreticalCapAmountProjection),
                        item.rowVersion
                    )
            });
        }

        return actions;
    }

    private buildAdjustmentActionItems(item: CommissionAdjustmentRow): MenuItem[] {
        const saving = this.commissionStore.saving();
        const todo = this.todoForAdjustment(item.id);
        const actions: MenuItem[] = [];

        if (item.status === this.adjustmentStatus.Draft) {
            actions.push({
                label: '提交审批',
                icon: 'pi pi-send',
                disabled: saving,
                command: () => void this.submitAdjustmentApproval(item.id, item.rowVersion)
            });
        }

        if (item.status === this.adjustmentStatus.PendingApproval && todo) {
            actions.push(
                {
                    label: '审批通过',
                    icon: 'pi pi-check',
                    disabled: saving,
                    command: () => void this.approveAdjustment(todo.sourceId, todo.rowVersion)
                },
                {
                    label: '驳回',
                    icon: 'pi pi-times',
                    disabled: saving,
                    command: () => this.openRejectDialog('adjustment', todo.sourceId, todo.rowVersion)
                }
            );
        }

        if (item.status === this.adjustmentStatus.Approved) {
            actions.push({
                label: '执行调整',
                icon: 'pi pi-play',
                disabled: saving,
                command: () => void this.executeAdjustment(item.id, item.rowVersion)
            });
        }

        return actions;
    }

    getAdjustmentTargetLabel(relatedPayoutId: string | null, relatedCalculationId: string | null) {
        const payout = relatedPayoutId ? this.payoutById().get(relatedPayoutId) : null;
        if (payout) return `${this.getStageLabel(payout.stageType)} · ${this.getPayoutKindLabel(payout.payoutKind)} · ${this.getPayoutStatusName(payout.status)}`;
        const calculation = relatedCalculationId ? this.calculationById().get(relatedCalculationId) : null;
        if (calculation) return `计算版本 V${calculation.version}`;
        return '--';
    }
    formatAmount(value: string | null | undefined) {
        if (value === null || value === undefined || value === '') return '--';
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
    }
    formatRate(value: string) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(2)}%` : value;
    }
    formatSensitiveRateProjection(projection: SensitiveStringFieldProjectionView | null | undefined) {
        const value = this.sensitiveProjectionValue(projection);
        if (!value) return sensitiveProjectionDisplayText(projection);
        return this.formatRate(value);
    }
    sensitiveProjectionValue(projection: SensitiveStringFieldProjectionView | null | undefined) {
        return projection?.mode === 'full' && typeof projection.value === 'string' ? projection.value : '';
    }
    getCalculationStatusName(status: CommissionCalculationStatus) {
        return commissionCalculationStatusLabelOrFallback(status);
    }
    getCalculationStatusSeverity(status: CommissionCalculationStatus) {
        return commissionCalculationStatusSeverityOrFallback(status);
    }
    getPayoutStatusName(status: CommissionPayoutStatus) {
        return commissionPayoutStatusLabelOrFallback(status);
    }
    getPayoutStatusSeverity(status: CommissionPayoutStatus) {
        return commissionPayoutStatusSeverityOrFallback(status);
    }
    getPayoutKindLabel(kind: 'primary' | 'supplement') {
        return { primary: '正常发放', supplement: '补发记录' }[kind];
    }
    getAdjustmentTypeLabel(type: CommissionAdjustmentType) {
        return { 'suspend-payout': '暂停发放', 'reverse-payout': '冲销发放', clawback: '扣回', supplement: '补发', recalculate: '重算' }[type];
    }
    getAdjustmentStatusName(status: CommissionAdjustmentStatus) {
        return commissionAdjustmentStatusLabelOrFallback(status);
    }
    getAdjustmentStatusSeverity(status: CommissionAdjustmentStatus) {
        return commissionAdjustmentStatusSeverityOrFallback(status);
    }
    getStageLabel(stage: CommissionPayoutStage) {
        return PAYOUT_STAGE_LABELS[stage];
    }
    getTierLabel(tier: CommissionPayoutTier) {
        return { basic: '基础档', mid: '中档', premium: '上限档' }[tier];
    }
    getProjectStatusName(status: string) {
        return projectStatusLabelOrFallback(status);
    }
    getProjectStatusSeverity(status: string) {
        return projectStatusSeverityOrFallback(status);
    }
    getProjectStageName(stage: string) {
        return projectStageLabelOrFallback(stage);
    }
    getProjectStageSeverity(stage: string) {
        return projectStageSeverityOrFallback(stage);
    }
    toSubmitPayoutStage(payoutStage: CommissionPayoutStage) {
        switch (payoutStage) {
            case CommissionPayoutStage.First:
                return NonRetentionCommissionPayoutStage.First;
            case CommissionPayoutStage.Second:
                return NonRetentionCommissionPayoutStage.Second;
            case CommissionPayoutStage.Final:
                return NonRetentionCommissionPayoutStage.Final;
            default:
                throw new Error('当前页面不支持直接提交质保金发放审批');
        }
    }
    toRegisterPayoutStage(payoutStage: CommissionPayoutStage) {
        switch (payoutStage) {
            case CommissionPayoutStage.First:
                return NonRetentionCommissionPayoutStage.First;
            case CommissionPayoutStage.Second:
                return NonRetentionCommissionPayoutStage.Second;
            case CommissionPayoutStage.Final:
                return NonRetentionCommissionPayoutStage.Final;
            default:
                throw new Error('当前页面缺少质保金登记所需的结算快照锚点');
        }
    }
    getErrorMessage(error: unknown) {
        if (typeof error === 'object' && error !== null) {
            const candidate = error as { error?: { message?: string }; message?: string };
            if (candidate.error?.message) return candidate.error.message;
            if (candidate.message) return candidate.message;
        }
        return '请求未成功，请稍后重试';
    }
}
