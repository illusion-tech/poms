import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    AttachmentTargetType,
    AuthStore,
    BusinessDiscussionTargetObjectType,
    CustomerStatus,
    CustomerStore,
    LeadAllowedAction,
    LeadBudgetStatus,
    LeadEffectiveScoreSource,
    LeadGateStatus,
    LeadOwnershipScope,
    LeadRating,
    LeadScoreOverrideStatus,
    LeadScoreSnapshotKind,
    LeadSourceStatus,
    LeadStatus,
    LeadStore,
    LeadUrgency,
    PlatformStore,
    type CustomerListView,
    type LeadDetailView,
    type LeadListView,
    type LeadScoreHistoryView,
    type LeadScoreOverrideSummary,
    type LeadSourceSummary,
    type OwnerReferenceUser
} from '@poms/admin-data-access';
import { LeadBudgetStatusLabel, LeadBudgetStatusOptions, LeadRatingLabel, LeadRatingOptions, LeadUrgencyLabel, LeadUrgencyOptions } from '@poms/shared-contracts';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AuditHistoryPanel } from '../../shared/ui/audit-history-panel';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { BusinessDiscussionPanel } from '../../shared/ui/business-discussion-panel';
import { SalesFollowUpPanel } from '../../shared/ui/sales-follow-up-panel';
import { SalesIntelligencePanel } from '../../shared/ui/sales-intelligence-panel';
import { LEAD_STATUS_LABELS, leadStatusLabelOrFallback, leadStatusSeverityOrFallback } from '../../shared/ui/status-presentation';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';

interface LeadFilterOption<T extends string = string> {
    label: string;
    value: T;
}

interface LeadColumnFilterOption<T extends string = string> {
    label: string;
    value: T | null;
}

interface LeadSummaryItem {
    label: string;
    value: number;
    hint: string;
}

interface LeadDistributionItem extends LeadSummaryItem {
    color: string;
    shadowColor: string;
    flexValue: number;
    percentageLabel: string;
    tooltip: string;
}

interface LeadOwnerUserOption extends LeadFilterOption {
    primaryOrgUnitId: string | null;
}

interface CustomerOption extends LeadFilterOption {
    customer: CustomerListView;
}

interface CreateLeadForm {
    leadName: string;
    customerId: string | null;
    sourceId: string | null;
    demandDescription: string;
    budgetStatus: LeadBudgetStatus;
    estimatedAmount: string;
    urgency: LeadUrgency;
    expectedDecisionDate: Date | null;
    ownerUserId: string | null;
    ownerOrgId: string | null;
}

interface EditLeadForm {
    leadName: string;
    sourceId: string | null;
    demandDescription: string;
    budgetStatus: LeadBudgetStatus;
    estimatedAmount: string;
    urgency: LeadUrgency;
    expectedDecisionDate: Date | null;
}

interface LeadSourceForm {
    code: string;
    name: string;
    description: string;
    sortOrder: number;
}

interface ConvertProjectForm {
    customerProjectNo: string;
    projectName: string;
    plannedSignAt: Date | null;
}

interface AssignmentForm {
    ownerUserId: string | null;
    ownerOrgId: string | null;
    reason: string;
}

interface ScoreOverrideForm {
    score: number | null;
    reason: string;
}

interface FollowUpReminderEntry {
    followUpId: string;
    todoId: string | null;
}

type LeadActionTarget = LeadListView | LeadDetailView;

const ALL_FILTER_VALUE = 'all';
type LeadAllFilterValue = typeof ALL_FILTER_VALUE;

const leadFilterOptions = <T extends string>(options: ReadonlyArray<LeadFilterOption<T>>): Array<LeadFilterOption<T>> => [...options];

const LEAD_BUDGET_STATUS_LABELS = LeadBudgetStatusLabel as Record<LeadBudgetStatus, string>;

const LEAD_URGENCY_LABELS = LeadUrgencyLabel as Record<LeadUrgency, string>;

const LEAD_RATING_LABELS = LeadRatingLabel as Record<LeadRating, string>;

const LEAD_SOURCE_STATUS_LABELS: Record<LeadSourceStatus, string> = {
    [LeadSourceStatus.Active]: '启用',
    [LeadSourceStatus.Inactive]: '停用'
};

const LEAD_EFFECTIVE_SCORE_SOURCE_LABELS: Record<LeadEffectiveScoreSource, string> = {
    [LeadEffectiveScoreSource.System]: '系统评分',
    [LeadEffectiveScoreSource.ManualOverride]: '人工覆盖'
};

const LEAD_SCORE_OVERRIDE_STATUS_LABELS: Record<LeadScoreOverrideStatus, string> = {
    [LeadScoreOverrideStatus.Pending]: '待审批',
    [LeadScoreOverrideStatus.Approved]: '已批准',
    [LeadScoreOverrideStatus.Rejected]: '已驳回',
    [LeadScoreOverrideStatus.Revoked]: '已撤销',
    [LeadScoreOverrideStatus.Superseded]: '已替代'
};

const LEAD_STATUS_VALUES = [LeadStatus.Registered, LeadStatus.Qualified, LeadStatus.Converted, LeadStatus.Closed] as const satisfies readonly LeadStatus[];

const LEAD_STATUS_OPTIONS: Array<LeadFilterOption<LeadStatus | LeadAllFilterValue>> = [{ label: '全部状态', value: ALL_FILTER_VALUE }, ...LEAD_STATUS_VALUES.map((value) => ({ label: LEAD_STATUS_LABELS[value], value }))];

const LEAD_STATUS_COLUMN_FILTER_OPTIONS: Array<LeadColumnFilterOption<LeadStatus>> = [{ label: '任意状态', value: null }, ...LEAD_STATUS_VALUES.map((value) => ({ label: LEAD_STATUS_LABELS[value], value }))];

const LEAD_RATING_OPTIONS: Array<LeadFilterOption<LeadRating | LeadAllFilterValue>> = [{ label: '全部评级', value: ALL_FILTER_VALUE }, ...leadFilterOptions(LeadRatingOptions as ReadonlyArray<LeadFilterOption<LeadRating>>)];

const LEAD_BUDGET_STATUS_OPTIONS = leadFilterOptions(LeadBudgetStatusOptions as ReadonlyArray<LeadFilterOption<LeadBudgetStatus>>);

const LEAD_URGENCY_OPTIONS = leadFilterOptions(LeadUrgencyOptions as ReadonlyArray<LeadFilterOption<LeadUrgency>>);

const DEFAULT_BUDGET_STATUS = LeadBudgetStatus.Unknown;
const DEFAULT_URGENCY = LeadUrgency.Normal;
const DEFAULT_OWNERSHIP_SCOPE = LeadOwnershipScope.All;
const CONVERSION_QUERY_VALUE = 'ready';

const EMPTY_CREATE_FORM: CreateLeadForm = {
    leadName: '',
    customerId: null,
    sourceId: null,
    demandDescription: '',
    budgetStatus: DEFAULT_BUDGET_STATUS,
    estimatedAmount: '',
    urgency: DEFAULT_URGENCY,
    expectedDecisionDate: null,
    ownerUserId: null,
    ownerOrgId: null
};

const EMPTY_EDIT_FORM: EditLeadForm = {
    leadName: '',
    sourceId: null,
    demandDescription: '',
    budgetStatus: DEFAULT_BUDGET_STATUS,
    estimatedAmount: '',
    urgency: DEFAULT_URGENCY,
    expectedDecisionDate: null
};

const EMPTY_SOURCE_FORM: LeadSourceForm = {
    code: '',
    name: '',
    description: '',
    sortOrder: 100
};

const EMPTY_CONVERT_FORM: ConvertProjectForm = {
    customerProjectNo: '',
    projectName: '',
    plannedSignAt: null
};

const EMPTY_ASSIGNMENT_FORM: AssignmentForm = {
    ownerUserId: null,
    ownerOrgId: null,
    reason: ''
};

const EMPTY_SCORE_OVERRIDE_FORM: ScoreOverrideForm = {
    score: null,
    reason: ''
};

@Component({
    selector: 'app-lead-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, DatePickerModule, InputTextModule, InputNumberModule, IconFieldModule, InputIconModule, SelectModule, TagModule, DialogModule, TextareaModule, AuditHistoryPanel, AttachmentPanel, BusinessDiscussionPanel, SalesFollowUpPanel, SalesIntelligencePanel, WorkspaceFeedback],
    providers: [LeadStore, CustomerStore],
    template: `
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">签约前入口</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">线索管理</h1>
                        <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">先登记客户机会，确认有效后再进入正式项目推进。</p>
                    </div>

                    <div class="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                        <p-button label="返回项目管理" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" styleClass="w-full sm:w-auto rounded-md!" (onClick)="goToProjects()" />

                        @if (canManageLeadSources()) {
                            <p-button label="来源维护" icon="pi pi-sliders-h" severity="secondary" [outlined]="true" styleClass="w-full sm:w-auto rounded-md!" (onClick)="showSourceDialog()" />
                        }

                        @if (canWriteLead()) {
                            <p-button label="登记线索" icon="pi pi-plus" severity="primary" styleClass="w-full sm:w-auto rounded-md!" (onClick)="showCreateDialog()" />
                        } @else {
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">当前账号只能查看线索。</div>
                        }
                    </div>
                </div>

                <div class="flex flex-col gap-[18px] overflow-visible rounded-[8px] border border-surface-200 bg-surface-0 p-5 dark:border-surface-700 dark:bg-surface-900">
                    <div class="flex h-8 min-w-0 items-center justify-between gap-4">
                        <h2 class="truncate text-xl font-medium leading-7 text-surface-900 dark:text-surface-0">线索分布</h2>
                        <div class="flex shrink-0 items-end gap-1">
                            <span class="text-xl font-semibold leading-tight text-surface-950 dark:text-surface-0">{{ totalLeadCount().toLocaleString() }}</span>
                            <span class="pb-0.5 text-sm leading-none text-surface-500 dark:text-surface-400">全部线索</span>
                        </div>
                    </div>

                    <div class="flex gap-1">
                        @for (item of leadDistributionItems(); track item.label) {
                            <div class="group relative min-w-0" [style.flex]="item.flexValue">
                                <div
                                    class="h-4 cursor-help rounded-lg outline-none ring-primary-300 transition-[filter] hover:brightness-105 focus-visible:ring-2"
                                    [ngClass]="item.color"
                                    [style.box-shadow]="'0px 5px 10px 0px ' + item.shadowColor"
                                    tabindex="0"
                                    [attr.aria-label]="item.tooltip"
                                ></div>
                                <div class="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 min-w-max -translate-x-1/2 rounded-md border border-surface-200 bg-surface-0 px-3 py-2 text-xs leading-5 text-surface-700 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200">
                                    <div class="flex items-center gap-2">
                                        <span class="h-2 w-2 rounded-sm" [ngClass]="item.color"></span>
                                        <span class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</span>
                                    </div>
                                    <div>{{ item.value.toLocaleString() }} 条 · {{ item.percentageLabel }}</div>
                                    <div class="text-surface-500 dark:text-surface-400">{{ item.hint }}</div>
                                </div>
                            </div>
                        }
                    </div>

                    <div class="grid grid-cols-4 gap-2 rounded-lg bg-surface-50 p-3 shadow-v1 dark:bg-white/10">
                        @for (item of leadDistributionItems(); track item.label) {
                            <div class="flex min-w-0 items-center">
                                <div class="h-4 w-1 shrink-0 rounded-full shadow-[0px_3px_1px_0px_rgba(0,0,0,0.00),0px_2px_1px_0px_rgba(0,0,0,0.01),0px_1px_1px_0px_rgba(0,0,0,0.02),0px_0px_1px_0px_rgba(0,0,0,0.03)]" [ngClass]="item.color"></div>
                                <span class="ml-2 truncate text-xs text-surface-950 dark:text-surface-0 sm:ml-3 sm:text-sm">{{ item.label }}</span>
                            </div>
                        }
                    </div>
                </div>
            </section>

            @if (pageError()) {
                <app-workspace-feedback severity="error" summary="线索暂时无法处理" [detail]="pageError()" />
            }

            @if (conversionGuideActive()) {
                <section class="flex flex-col gap-3 rounded-[8px] border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-100 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 font-semibold">
                            <i class="pi pi-arrow-right"></i>
                            <span>选择一条可转项目线索</span>
                        </div>
                        <p class="mt-1 max-w-4xl leading-6 text-primary-700 dark:text-primary-200">从项目入口进入后，系统先筛出已确认有效线索；能转的线索在操作列显示“转入项目”，未满足闸口的线索显示“补齐闸口”。</p>
                    </div>
                    <div class="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                        <span class="rounded-md bg-primary-100 px-3 py-2 text-sm font-medium text-primary-700 dark:bg-primary-900/60 dark:text-primary-100">{{ readyConversionLeadCount() }} 条可转项目</span>
                        <span class="rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">{{ blockedConversionLeadCount() }} 条待补齐</span>
                        <p-button label="查看全部线索" icon="pi pi-list" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="clearConversionGuide()" />
                    </div>
                </section>
            }

            <section class="flex flex-col gap-4">
                <div class="overflow-hidden rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900">
                    <p-table
                        #dt
                        [value]="visibleLeads()"
                        [loading]="loading()"
                        [rowHover]="true"
                        [showGridlines]="true"
                        [paginator]="true"
                        [rows]="rows"
                        [first]="first"
                        dataKey="id"
                        sortMode="multiple"
                        responsiveLayout="scroll"
                        [globalFilterFields]="['leadNo', 'leadName', 'customerName', 'sourceName', 'sourceChannel', 'budgetStatus', 'urgency', 'rating', 'effectiveRating', 'status', 'ownerName', 'ownerOrgName']"
                        [tableStyle]="{ width: '100%' }"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 条线索"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #caption>
                            <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div class="flex flex-col gap-3 md:flex-row md:items-center">
                                    <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (click)="clearFilters(dt)"></button>

                                    <p-iconfield class="w-full md:w-80">
                                        <p-inputicon class="pi pi-search" />
                                        <input pInputText [ngModel]="searchValue()" (ngModelChange)="searchValue.set($event)" (input)="onGlobalFilter(dt, $event)" placeholder="搜索线索、客户、销售主责" class="w-full! rounded-md! py-2!" />
                                    </p-iconfield>

                                    <p-select
                                        [ngModel]="statusFilter()"
                                        (ngModelChange)="setStatusFilter($event)"
                                        [options]="statusOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        appendTo="body"
                                        ariaLabel="按状态筛选"
                                        class="w-full md:w-40 rounded-md!"
                                    />

                                    <p-select
                                        [ngModel]="ratingFilter()"
                                        (ngModelChange)="setRatingFilter($event)"
                                        [options]="ratingOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        appendTo="body"
                                        ariaLabel="按评级筛选"
                                        class="w-full md:w-36 rounded-md!"
                                    />

                                    <p-select
                                        [ngModel]="ownershipFilter()"
                                        (ngModelChange)="setOwnershipFilter($event)"
                                        [options]="ownershipOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        appendTo="body"
                                        ariaLabel="按归属筛选"
                                        class="w-full md:w-36 rounded-md!"
                                    />
                                </div>

                                <div class="text-sm text-surface-500 dark:text-surface-400">当前筛出 {{ visibleLeads().length }} 条线索</div>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="leadName" class="w-[30%] min-w-72">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">线索/客户 <p-sortIcon field="leadName" /></span>
                                        <p-columnFilter type="text" field="leadName" display="menu" placeholder="按线索名筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="status" class="w-[22%] min-w-56">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">状态/评分 <p-sortIcon field="status" /></span>
                                        <p-columnFilter field="status" matchMode="equals" display="menu" [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                                            <ng-template #filter let-value let-filter="filterCallback">
                                                <p-select [ngModel]="value" [options]="statusColumnFilterOptions" optionLabel="label" optionValue="value" placeholder="任意状态" appendTo="body" (onChange)="filter($event.value)" class="w-44" />
                                            </ng-template>
                                        </p-columnFilter>
                                    </div>
                                </th>
                                <th pSortableColumn="estimatedAmount" class="w-[18%] min-w-48">
                                    <span class="flex items-center gap-2">商务信息 <p-sortIcon field="estimatedAmount" /></span>
                                </th>
                                <th pSortableColumn="ownerName" class="w-[18%] min-w-52">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">责任/更新 <p-sortIcon field="ownerName" /></span>
                                        <p-columnFilter type="text" field="ownerName" display="menu" placeholder="按销售主责筛选" />
                                    </div>
                                </th>
                                <th class="w-60 min-w-60">继续处理</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-lead>
                            <tr>
                                <td>
                                    <button type="button" class="text-left text-sm font-semibold leading-5 text-primary hover:underline" (click)="openLeadDetail(lead)">
                                        {{ lead.leadName }}
                                    </button>
                                    <div class="mt-2 flex flex-col gap-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                        <span>{{ lead.leadNo }}</span>
                                        <span class="text-surface-700 dark:text-surface-200">{{ lead.customerName }}</span>
                                        <span>来源：{{ getLeadSourceName(lead) }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="flex flex-wrap items-center gap-2">
                                        <p-tag [value]="getStatusName(lead.status)" [severity]="getStatusSeverity(lead.status)" class="rounded-[6px]" />
                                        <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ getEffectiveScore(lead) }}</span>
                                        <p-tag [value]="getLeadRatingName(getEffectiveRating(lead))" [severity]="getLeadRatingSeverity(getEffectiveRating(lead))" class="rounded-[6px]" />
                                        <p-tag [value]="getEffectiveScoreSourceName(getEffectiveScoreSource(lead))" [severity]="getEffectiveScoreSourceSeverity(getEffectiveScoreSource(lead))" class="rounded-[6px]" />
                                    </div>
                                    @if (isManualEffectiveScore(lead)) {
                                        <div class="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">系统 {{ lead.score }} / {{ getLeadRatingName(lead.rating) }}</div>
                                    }
                                    <div class="mt-2 flex items-start gap-1.5 text-xs leading-5" [ngClass]="canConvertLead(lead) ? 'text-green-600 dark:text-green-300' : 'text-amber-600 dark:text-amber-300'">
                                        <i class="pi mt-0.5 text-[0.7rem]" [ngClass]="canConvertLead(lead) ? 'pi-check-circle' : 'pi-exclamation-triangle'"></i>
                                        <span>{{ lead.gateSummary.conversion.explanation }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="grid grid-cols-1 gap-1 text-sm leading-5">
                                        <div class="flex items-center justify-between gap-3">
                                            <span class="text-xs text-surface-500 dark:text-surface-400">预算</span>
                                            <span class="text-right text-surface-900 dark:text-surface-0">{{ getBudgetStatusName(lead.budgetStatus) }}</span>
                                        </div>
                                        <div class="flex items-center justify-between gap-3">
                                            <span class="text-xs text-surface-500 dark:text-surface-400">金额</span>
                                            <span class="text-right text-surface-900 dark:text-surface-0">{{ formatAmount(lead.estimatedAmount) }}</span>
                                        </div>
                                        <div class="flex items-center justify-between gap-3">
                                            <span class="text-xs text-surface-500 dark:text-surface-400">紧迫度</span>
                                            <span class="text-right text-surface-900 dark:text-surface-0">{{ getUrgencyName(lead.urgency) }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="flex flex-col gap-1 text-sm leading-5">
                                        <span class="font-medium text-surface-900 dark:text-surface-0">{{ displayText(lead.ownerName, '公共池') }}</span>
                                        <span class="text-xs text-surface-500 dark:text-surface-400">{{ displayText(lead.ownerOrgName, '未归属组织') }}</span>
                                        <span class="text-xs text-surface-500 dark:text-surface-400">{{ lead.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="flex flex-wrap justify-start gap-2">
                                        <p-button label="查看" icon="pi pi-eye" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="openLeadDetail(lead)" />
                                        <p-button label="评分" icon="pi pi-history" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="openScoreHistory(lead)" />
                                        @if (canEditLead(lead)) {
                                            <p-button label="编辑" icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showEditLeadDialog(lead)" />
                                        }
                                        @if (canClaimLead(lead)) {
                                            <p-button label="申领" icon="pi pi-user-plus" size="small" severity="primary" [outlined]="true" styleClass="rounded-md!" [loading]="saving()" (onClick)="claimLeadOwner(lead)" />
                                        }
                                        @if (canAssignLeadOwner(lead)) {
                                            <p-button [label]="lead.ownerUserId ? '改派' : '分配'" icon="pi pi-users" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showAssignOwnerDialog(lead)" />
                                        }
                                        @if (canQualifyLead(lead)) {
                                            <p-button label="确认有效" icon="pi pi-check" size="small" severity="success" [outlined]="true" styleClass="rounded-md!" (onClick)="showQualifyDialog(lead)" />
                                        }
                                        @if (canConvertLead(lead)) {
                                            <p-button label="转入项目" icon="pi pi-arrow-right" size="small" severity="primary" styleClass="rounded-md!" (onClick)="showConvertDialog(lead)" />
                                        }
                                        @if (shouldShowConversionGapAction(lead)) {
                                            <p-button label="补齐闸口" icon="pi pi-list-check" size="small" severity="warn" [outlined]="true" styleClass="rounded-md!" (onClick)="openLeadDetail(lead)" />
                                        }
                                        @if (lead.convertedProjectId) {
                                            <p-button label="查看项目" icon="pi pi-external-link" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="goToProject(lead.convertedProjectId)" />
                                        }
                                        @if (canCloseLead(lead)) {
                                            <p-button label="关闭" icon="pi pi-times" size="small" severity="danger" [outlined]="true" styleClass="rounded-md!" (onClick)="showCloseDialog(lead)" />
                                        }
                                    </div>
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="5" class="py-8 text-center text-surface-400">{{ loading() ? '线索读取中...' : '暂无匹配线索' }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="登记线索" [style]="{ width: '36rem' }" styleClass="p-fluid" (onHide)="resetCreateDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (createError()) {
                        <app-workspace-feedback severity="error" summary="线索没有登记成功" [detail]="createError()" />
                    }

                    <div class="flex flex-col gap-2">
                        <label for="leadName" class="text-sm font-medium text-surface-900 dark:text-surface-0">线索标题</label>
                        <input pInputText id="leadName" [ngModel]="createForm().leadName" (ngModelChange)="updateCreateField('leadName', $event)" placeholder="填写客户能识别的机会名称" class="w-full rounded-md!" />
                        @if (createAttempted() && !createForm().leadName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写线索标题。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <div class="flex items-center justify-between gap-3">
                            <label for="leadCustomerId" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户</label>
                            <button pButton type="button" label="客户管理" icon="pi pi-building" severity="secondary" [text]="true" class="rounded-md! px-2! py-1!" (click)="goToCustomers()"></button>
                        </div>
                        <p-select
                            inputId="leadCustomerId"
                            [ngModel]="createForm().customerId"
                            (ngModelChange)="updateCreateCustomer($event)"
                            [options]="customerOptions()"
                            optionLabel="label"
                            optionValue="value"
                            [filter]="true"
                            filterBy="label"
                            [loading]="customerLoading()"
                            appendTo="body"
                            placeholder="选择客户主数据"
                            class="w-full rounded-md!"
                        />
                        @if (createAttempted() && !createForm().customerId) {
                            <span class="text-xs text-red-600 dark:text-red-300">请选择客户。</span>
                        }
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center justify-between gap-3">
                                <label for="leadSourceId" class="text-sm font-medium text-surface-900 dark:text-surface-0">来源渠道</label>
                                @if (canManageLeadSources()) {
                                    <button pButton type="button" label="维护" icon="pi pi-sliders-h" severity="secondary" [text]="true" class="rounded-md! px-2! py-1!" (click)="showSourceDialog()"></button>
                                }
                            </div>
                            <p-select
                                inputId="leadSourceId"
                                [ngModel]="createForm().sourceId"
                                (ngModelChange)="updateCreateSource($event)"
                                [options]="leadSourceOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [filter]="true"
                                filterBy="label"
                                [loading]="loadingSources()"
                                appendTo="body"
                                placeholder="选择来源"
                                class="w-full rounded-md!"
                            />
                            @if (createAttempted() && !createForm().sourceId) {
                                <span class="text-xs text-red-600 dark:text-red-300">请选择来源渠道。</span>
                            }
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="leadUrgency" class="text-sm font-medium text-surface-900 dark:text-surface-0">紧迫程度</label>
                            <p-select
                                inputId="leadUrgency"
                                [ngModel]="createForm().urgency"
                                (ngModelChange)="updateCreateUrgency($event)"
                                [options]="urgencyOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                class="w-full rounded-md!"
                            />
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="demandDescription" class="text-sm font-medium text-surface-900 dark:text-surface-0">需求描述</label>
                        <textarea
                            pTextarea
                            id="demandDescription"
                            rows="4"
                            [ngModel]="createForm().demandDescription"
                            (ngModelChange)="updateCreateField('demandDescription', $event)"
                            placeholder="描述客户目标、关键痛点、采购背景和已知范围"
                            class="w-full rounded-md!"
                        ></textarea>
                        @if (createAttempted() && !createForm().demandDescription.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写需求描述。</span>
                        }
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div class="flex flex-col gap-2">
                            <label for="budgetStatus" class="text-sm font-medium text-surface-900 dark:text-surface-0">预算情况</label>
                            <p-select
                                inputId="budgetStatus"
                                [ngModel]="createForm().budgetStatus"
                                (ngModelChange)="updateCreateBudgetStatus($event)"
                                [options]="budgetStatusOptions"
                                optionLabel="label"
                                optionValue="value"
                                appendTo="body"
                                class="w-full rounded-md!"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="estimatedAmount" class="text-sm font-medium text-surface-900 dark:text-surface-0">预计金额</label>
                            <input
                                pInputText
                                id="estimatedAmount"
                                inputmode="decimal"
                                [ngModel]="createForm().estimatedAmount"
                                (ngModelChange)="updateCreateField('estimatedAmount', $event)"
                                placeholder="例如：1000000"
                                class="w-full rounded-md!"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="expectedDecisionDate" class="text-sm font-medium text-surface-900 dark:text-surface-0">预计决策日期</label>
                            <p-datepicker
                                inputId="expectedDecisionDate"
                                [ngModel]="createForm().expectedDecisionDate"
                                (ngModelChange)="updateCreateExpectedDecisionDate($event)"
                                [showButtonBar]="true"
                                appendTo="body"
                                dateFormat="yy-mm-dd"
                                placeholder="可留空"
                                styleClass="w-full"
                                inputStyleClass="w-full rounded-md!"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="leadOwnerUserId" class="text-sm font-medium text-surface-900 dark:text-surface-0">销售主责</label>
                            <p-select
                                inputId="leadOwnerUserId"
                                [ngModel]="createForm().ownerUserId"
                                (ngModelChange)="updateCreateOwnerUser($event)"
                                [options]="ownerUserOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [showClear]="true"
                                [loading]="ownerReferenceLoading()"
                                appendTo="body"
                                placeholder="留空进入公共池"
                                class="w-full rounded-md!"
                            />
                            <span class="text-xs text-surface-500 dark:text-surface-400">留空后进入公共池，后续可由销售申领或主管分配。</span>
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="leadOwnerOrgId" class="text-sm font-medium text-surface-900 dark:text-surface-0">主责组织</label>
                            <p-select
                                inputId="leadOwnerOrgId"
                                [ngModel]="createForm().ownerOrgId"
                                (ngModelChange)="updateCreateOwnerOrg($event)"
                                [options]="ownerOrgOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [showClear]="true"
                                [loading]="ownerReferenceLoading()"
                                appendTo="body"
                                placeholder="可留空"
                                class="w-full rounded-md!"
                            />
                        </div>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeCreateDialog()" />
                        <p-button label="登记线索" [loading]="saving()" [disabled]="!isCreateFormValid()" styleClass="rounded-md!" (onClick)="createLead()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑线索" [style]="{ width: '36rem' }" styleClass="p-fluid" (onHide)="resetEditDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (editError()) {
                        <app-workspace-feedback severity="error" summary="线索没有保存成功" [detail]="editError()" />
                    }

                    @if (actionTarget(); as lead) {
                        <app-workspace-feedback severity="info" summary="当前线索" [detail]="lead.leadNo + ' · ' + lead.customerName" />
                    }

                    <div class="flex flex-col gap-2">
                        <label for="editLeadName" class="text-sm font-medium text-surface-900 dark:text-surface-0">线索标题</label>
                        <input pInputText id="editLeadName" [ngModel]="editForm().leadName" (ngModelChange)="updateEditField('leadName', $event)" class="w-full rounded-md!" />
                        @if (editAttempted() && !editForm().leadName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写线索标题。</span>
                        }
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="editLeadSourceId" class="text-sm font-medium text-surface-900 dark:text-surface-0">来源渠道</label>
                            <p-select
                                inputId="editLeadSourceId"
                                [ngModel]="editForm().sourceId"
                                (ngModelChange)="updateEditSource($event)"
                                [options]="leadSourceOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [filter]="true"
                                filterBy="label"
                                [loading]="loadingSources()"
                                appendTo="body"
                                class="w-full rounded-md!"
                            />
                            @if (editAttempted() && !editForm().sourceId) {
                                <span class="text-xs text-red-600 dark:text-red-300">请选择来源渠道。</span>
                            }
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="editLeadUrgency" class="text-sm font-medium text-surface-900 dark:text-surface-0">紧迫程度</label>
                            <p-select inputId="editLeadUrgency" [ngModel]="editForm().urgency" (ngModelChange)="updateEditUrgency($event)" [options]="urgencyOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="editDemandDescription" class="text-sm font-medium text-surface-900 dark:text-surface-0">需求描述</label>
                        <textarea pTextarea id="editDemandDescription" rows="4" [ngModel]="editForm().demandDescription" (ngModelChange)="updateEditField('demandDescription', $event)" class="w-full rounded-md!"></textarea>
                        @if (editAttempted() && !editForm().demandDescription.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写需求描述。</span>
                        }
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div class="flex flex-col gap-2">
                            <label for="editBudgetStatus" class="text-sm font-medium text-surface-900 dark:text-surface-0">预算情况</label>
                            <p-select inputId="editBudgetStatus" [ngModel]="editForm().budgetStatus" (ngModelChange)="updateEditBudgetStatus($event)" [options]="budgetStatusOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="editEstimatedAmount" class="text-sm font-medium text-surface-900 dark:text-surface-0">预计金额</label>
                            <input pInputText id="editEstimatedAmount" inputmode="decimal" [ngModel]="editForm().estimatedAmount" (ngModelChange)="updateEditField('estimatedAmount', $event)" class="w-full rounded-md!" />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="editExpectedDecisionDate" class="text-sm font-medium text-surface-900 dark:text-surface-0">预计决策日期</label>
                            <p-datepicker
                                inputId="editExpectedDecisionDate"
                                [ngModel]="editForm().expectedDecisionDate"
                                (ngModelChange)="updateEditExpectedDecisionDate($event)"
                                [showButtonBar]="true"
                                appendTo="body"
                                dateFormat="yy-mm-dd"
                                placeholder="可留空"
                                styleClass="w-full"
                                inputStyleClass="w-full rounded-md!"
                            />
                        </div>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="editDialogVisible = false" />
                        <p-button label="保存修改" [loading]="saving()" [disabled]="!isEditFormValid()" styleClass="rounded-md!" (onClick)="updateLead()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="sourceDialogVisible" [modal]="true" header="线索来源维护" [style]="{ width: '44rem' }" styleClass="p-fluid" (onHide)="resetSourceDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (sourceError()) {
                        <app-workspace-feedback severity="error" summary="来源没有保存成功" [detail]="sourceError()" />
                    }

                    <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_7rem]">
                            <div class="flex flex-col gap-2">
                                <label for="sourceCode" class="text-sm font-medium text-surface-900 dark:text-surface-0">编码</label>
                                <input pInputText id="sourceCode" [ngModel]="sourceForm().code" (ngModelChange)="updateSourceField('code', $event)" placeholder="partner-referral" class="w-full rounded-md!" />
                                @if (sourceAttempted() && !sourceForm().code.trim()) {
                                    <span class="text-xs text-red-600 dark:text-red-300">请填写编码。</span>
                                }
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="sourceName" class="text-sm font-medium text-surface-900 dark:text-surface-0">名称</label>
                                <input pInputText id="sourceName" [ngModel]="sourceForm().name" (ngModelChange)="updateSourceField('name', $event)" placeholder="合作伙伴推荐" class="w-full rounded-md!" />
                                @if (sourceAttempted() && !sourceForm().name.trim()) {
                                    <span class="text-xs text-red-600 dark:text-red-300">请填写名称。</span>
                                }
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="sourceSortOrder" class="text-sm font-medium text-surface-900 dark:text-surface-0">排序</label>
                                <input pInputText id="sourceSortOrder" type="number" [ngModel]="sourceForm().sortOrder" (ngModelChange)="updateSourceSortOrder($event)" class="w-full rounded-md!" />
                            </div>
                        </div>
                        <div class="mt-3 flex flex-col gap-2">
                            <label for="sourceDescription" class="text-sm font-medium text-surface-900 dark:text-surface-0">描述</label>
                            <textarea pTextarea id="sourceDescription" rows="2" [ngModel]="sourceForm().description" (ngModelChange)="updateSourceField('description', $event)" class="w-full rounded-md!"></textarea>
                        </div>
                        <div class="mt-3 flex justify-end">
                            <p-button label="新增来源" icon="pi pi-plus" [loading]="saving()" styleClass="rounded-md!" (onClick)="createLeadSource()" />
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        @if (loadingSources()) {
                            <app-workspace-feedback severity="info" summary="正在读取来源" detail="请稍候。" />
                        } @else {
                            @for (source of leadSources(); track source.id) {
                                <div class="flex flex-col gap-3 rounded-[8px] border border-surface-200 px-3 py-3 dark:border-surface-700 sm:flex-row sm:items-center sm:justify-between">
                                    <div class="min-w-0">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-sm font-semibold text-surface-950 dark:text-surface-0">{{ source.name }}</span>
                                            <span class="text-xs text-surface-500 dark:text-surface-400">{{ source.code }}</span>
                                            <p-tag [value]="getSourceStatusName(source.status)" [severity]="getSourceStatusSeverity(source.status)" class="rounded-[6px]" />
                                        </div>
                                        <div class="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                            已引用 {{ source.usageCount }} 条<span class="mx-1">·</span>{{ displayText(source.description, '无描述') }}
                                        </div>
                                    </div>
                                    <p-button
                                        [label]="source.status === LeadSourceStatus.Active ? '停用' : '启用'"
                                        [icon]="source.status === LeadSourceStatus.Active ? 'pi pi-pause' : 'pi pi-play'"
                                        severity="secondary"
                                        [outlined]="true"
                                        size="small"
                                        styleClass="rounded-md!"
                                        [loading]="saving()"
                                        (onClick)="toggleLeadSourceStatus(source)"
                                    />
                                </div>
                            } @empty {
                                <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无来源选项</div>
                            }
                        }
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end">
                        <p-button label="关闭" severity="secondary" styleClass="rounded-md!" (onClick)="sourceDialogVisible = false" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="detailDialogVisible" [modal]="true" header="线索详情" [style]="{ width: '42rem' }" (onHide)="clearDetail()">
                @if (loadingDetail()) {
                    <app-workspace-feedback severity="info" summary="正在读取线索详情" detail="请稍候。" />
                } @else if (selectedLead(); as lead) {
                    <div class="flex flex-col gap-4">
                        <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400">{{ lead.leadNo }}</div>
                                    <h2 class="mt-1 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ lead.leadName }}</h2>
                                    <p class="mt-1 text-sm text-surface-600 dark:text-surface-300">{{ lead.customerName }}</p>
                                </div>
                                <p-tag [value]="getStatusName(lead.status)" [severity]="getStatusSeverity(lead.status)" class="rounded-[6px]" />
                            </div>
                        </div>

                        <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">来源渠道</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ getLeadSourceName(lead) }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">预算情况</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ getBudgetStatusName(lead.budgetStatus) }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="flex items-center justify-between gap-2 text-xs text-surface-500 dark:text-surface-400">
                                    <span>当前有效评分</span>
                                    <button pButton type="button" label="历史" icon="pi pi-history" severity="secondary" [text]="true" class="rounded-md! px-2! py-1!" (click)="openScoreHistory(lead)"></button>
                                </dt>
                                <dd class="mt-1 flex flex-wrap items-center gap-2 text-sm text-surface-900 dark:text-surface-0">
                                    <span class="font-semibold">{{ getEffectiveScore(lead) }}</span>
                                    <p-tag [value]="getLeadRatingName(getEffectiveRating(lead))" [severity]="getLeadRatingSeverity(getEffectiveRating(lead))" class="rounded-[6px]" />
                                    <p-tag [value]="getEffectiveScoreSourceName(getEffectiveScoreSource(lead))" [severity]="getEffectiveScoreSourceSeverity(getEffectiveScoreSource(lead))" class="rounded-[6px]" />
                                </dd>
                                @if (isManualEffectiveScore(lead)) {
                                    <div class="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">系统 {{ lead.score }} / {{ getLeadRatingName(lead.rating) }}</div>
                                }
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">转项目闸口</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ lead.gateSummary.conversion.status === LeadGateStatus.Ready ? '已满足' : '待补齐' }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">预计金额</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ formatAmount(lead.estimatedAmount) }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">紧迫程度</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ getUrgencyName(lead.urgency) }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">销售主责</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ displayText(lead.ownerName, '公共池') }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">主责组织</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ displayText(lead.ownerOrgName, '未归属组织') }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">最近更新</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ lead.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</dd>
                            </div>
                        </dl>

                        @if (lead.demandDescription) {
                            <app-workspace-feedback severity="info" summary="需求描述" [detail]="lead.demandDescription" />
                        }

                        <app-workspace-feedback severity="info" summary="有效评分说明" [detail]="getEffectiveScoreReason(lead)" />

                        @if (isManualEffectiveScore(lead)) {
                            <app-workspace-feedback severity="secondary" summary="系统评分说明" [detail]="lead.scoreReason" />
                        }

                        @if (lead.gateSummary.conversion.status === LeadGateStatus.Blocked) {
                            <app-workspace-feedback severity="warn" summary="转项目前缺口" [detail]="lead.gateSummary.conversion.explanation" />
                        }

                        @if (lead.qualificationSummary) {
                            <app-workspace-feedback severity="success" summary="有效性说明" [detail]="lead.qualificationSummary" />
                        }

                        @if (lead.closedReason) {
                            <app-workspace-feedback severity="secondary" summary="关闭原因" [detail]="lead.closedReason" />
                        }

                        @if (lead.convertedProjectSummary) {
                            <div class="flex flex-col gap-3 rounded-[8px] border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                                <app-workspace-feedback severity="info" summary="已转入项目" [detail]="lead.convertedProjectSummary.projectName + '（' + lead.convertedProjectSummary.projectNo + '）'" />
                                <div>
                                    <p-button label="查看项目" icon="pi pi-external-link" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="goToProject(lead.convertedProjectSummary.id)" />
                                </div>
                            </div>
                        }

                        <app-sales-intelligence-panel
                            [customerId]="lead.customerId"
                            [leadId]="lead.id"
                            [projectId]="lead.convertedProjectId"
                            [canWrite]="canWriteLead()"
                            title="销售情报"
                            description="补齐联系人、决策链、竞争态势、采购流程和当前机会缺口。"
                        />

                        <app-business-discussion-panel
                            [customerId]="lead.customerId"
                            [leadId]="lead.id"
                            [projectId]="lead.convertedProjectId"
                            [targetObjectType]="lead.convertedProjectId ? projectDiscussionTargetType : leadDiscussionTargetType"
                            [targetObjectId]="lead.convertedProjectId || lead.id"
                            [targetTitle]="lead.convertedProjectSummary?.projectName || lead.leadName"
                            [canWrite]="canWriteLead()"
                            title="业务讨论"
                            description="记录推进判断、补充信息、风险和关键结论。"
                        />

                        <app-attachment-panel
                            [targetType]="leadAttachmentTargetType"
                            [targetId]="lead.id"
                            [canWrite]="canWriteLead()"
                            title="线索附件"
                            description="保存客户需求、沟通截图、会议纪要和线索判断材料。线索转入项目后会作为来源附件继续关联。"
                        />

                        @if (followUpReminderEntry()) {
                            <app-workspace-feedback severity="info" summary="从销售跟进待办进入" detail="请在下方销售跟进中登记本次处理结果，系统会据此关闭或刷新提醒。" />
                        }

                        <app-sales-follow-up-panel
                            [customerId]="lead.customerId"
                            [leadId]="lead.id"
                            [projectId]="lead.convertedProjectId"
                            [canWrite]="canWriteLead()"
                            title="销售跟进"
                            description="线索转项目后继续沿用同一张跟进记录表。"
                            [createContextDetail]="lead.convertedProjectId ? '本次记录会挂到已转入项目，同时保留客户维度。' : '本次记录会挂到当前线索，同时保留客户维度。'"
                        />
                    </div>

                    <ng-template #footer>
                        <div class="flex flex-wrap justify-end gap-2">
                            <app-audit-history-panel targetType="lead" [targetId]="lead.id" [targetTitle]="lead.leadName" />
                            @if (canEditLead(lead)) {
                                <p-button label="编辑信息" icon="pi pi-pencil" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showEditLeadDialog(lead)" />
                            }
                            @if (canClaimLead(lead)) {
                                <p-button label="申领" icon="pi pi-user-plus" severity="primary" [outlined]="true" [loading]="saving()" styleClass="rounded-md!" (onClick)="claimLeadOwner(lead)" />
                            }
                            @if (canAssignLeadOwner(lead)) {
                                <p-button [label]="lead.ownerUserId ? '改派主责' : '分配主责'" icon="pi pi-users" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showAssignOwnerDialog(lead)" />
                            }
                            @if (canQualifyLead(lead)) {
                                <p-button label="确认有效" icon="pi pi-check" severity="success" [outlined]="true" styleClass="rounded-md!" (onClick)="showQualifyDialog(lead)" />
                            }
                            @if (canCloseLead(lead)) {
                                <p-button label="关闭线索" icon="pi pi-times" severity="danger" [outlined]="true" styleClass="rounded-md!" (onClick)="showCloseDialog(lead)" />
                            }
                            @if (canConvertLead(lead)) {
                                <p-button label="转入项目" icon="pi pi-arrow-right" severity="primary" styleClass="rounded-md!" (onClick)="showConvertDialog(lead)" />
                            }
                            @if (lead.convertedProjectId) {
                                <p-button label="查看项目" icon="pi pi-external-link" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="goToProject(lead.convertedProjectId)" />
                            }
                            <p-button label="关闭" severity="secondary" styleClass="rounded-md!" (onClick)="detailDialogVisible = false" />
                        </div>
                    </ng-template>
                }
            </p-dialog>

            <p-dialog [(visible)]="scoreHistoryDialogVisible" [modal]="true" header="评分历史与人工覆盖" [style]="{ width: '50rem' }" (onHide)="resetScoreHistoryDialog()">
                @if (actionTarget(); as target) {
                    <div class="flex flex-col gap-4">
                        <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div class="min-w-0">
                                    <div class="text-xs text-surface-500 dark:text-surface-400">{{ target.leadNo }}</div>
                                    <h2 class="mt-1 truncate text-lg font-semibold text-surface-950 dark:text-surface-0">{{ target.leadName }}</h2>
                                    <p class="mt-1 text-sm text-surface-600 dark:text-surface-300">{{ target.customerName }}</p>
                                </div>
                                <div class="flex shrink-0 flex-wrap items-center gap-2">
                                    <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ getEffectiveScore(target) }}</span>
                                    <p-tag [value]="getLeadRatingName(getEffectiveRating(target))" [severity]="getLeadRatingSeverity(getEffectiveRating(target))" class="rounded-[6px]" />
                                    <p-tag [value]="getEffectiveScoreSourceName(getEffectiveScoreSource(target))" [severity]="getEffectiveScoreSourceSeverity(getEffectiveScoreSource(target))" class="rounded-[6px]" />
                                </div>
                            </div>
                        </div>

                        @if (scoreHistoryError()) {
                            <app-workspace-feedback severity="error" summary="评分历史暂时无法处理" [detail]="scoreHistoryError()" />
                        }

                        @if (loadingScoreHistory()) {
                            <app-workspace-feedback severity="info" summary="正在读取评分历史" detail="请稍候。" />
                        } @else if (scoreHistory(); as history) {
                            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                    <div class="text-xs text-surface-500 dark:text-surface-400">系统评分</div>
                                    <div class="mt-1 flex items-center gap-2 text-sm text-surface-900 dark:text-surface-0">
                                        <span class="font-semibold">{{ history.systemScore }}</span>
                                        <p-tag [value]="getLeadRatingName(history.systemRating)" [severity]="getLeadRatingSeverity(history.systemRating)" class="rounded-[6px]" />
                                    </div>
                                    <p class="mt-2 line-clamp-2 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ history.scoreReason }}</p>
                                </div>
                                <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                    <div class="text-xs text-surface-500 dark:text-surface-400">当前有效评分</div>
                                    <div class="mt-1 flex items-center gap-2 text-sm text-surface-900 dark:text-surface-0">
                                        <span class="font-semibold">{{ history.effectiveScore }}</span>
                                        <p-tag [value]="getLeadRatingName(history.effectiveRating)" [severity]="getLeadRatingSeverity(history.effectiveRating)" class="rounded-[6px]" />
                                        <p-tag [value]="getEffectiveScoreSourceName(history.effectiveScoreSource)" [severity]="getEffectiveScoreSourceSeverity(history.effectiveScoreSource)" class="rounded-[6px]" />
                                    </div>
                                    <p class="mt-2 line-clamp-2 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ history.effectiveScoreReason }}</p>
                                </div>
                            </div>

                            @if (history.pendingOverride; as pendingOverride) {
                                <div class="rounded-[8px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                                    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="text-sm font-semibold text-amber-900 dark:text-amber-100">待审批覆盖</span>
                                                <p-tag [value]="getScoreOverrideStatusName(pendingOverride.status)" [severity]="getScoreOverrideStatusSeverity(pendingOverride.status)" class="rounded-[6px]" />
                                            </div>
                                            <p class="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-100">
                                                申请 {{ pendingOverride.requestedScore }} / {{ getLeadRatingName(pendingOverride.requestedRating) }}，提交时系统 {{ pendingOverride.systemScoreAtRequest }} / {{ getLeadRatingName(pendingOverride.systemRatingAtRequest) }}。
                                            </p>
                                            <p class="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200">{{ pendingOverride.reason }}</p>
                                            @if (hasSystemScoreDrift(pendingOverride, history)) {
                                                <p class="mt-2 text-xs font-medium text-amber-800 dark:text-amber-100">提交后系统评分已变化，请审批前复核当前系统评分。</p>
                                            }
                                        </div>
                                        @if (canManageScoreOverrides()) {
                                            <div class="flex min-w-60 flex-col gap-2">
                                                <textarea pTextarea rows="2" [ngModel]="scoreOverrideApproveNote()" (ngModelChange)="scoreOverrideApproveNote.set($event)" class="w-full rounded-md!" placeholder="批准备注，可留空"></textarea>
                                                <textarea pTextarea rows="2" [ngModel]="scoreOverrideRejectReason()" (ngModelChange)="scoreOverrideRejectReason.set($event)" class="w-full rounded-md!" placeholder="驳回原因"></textarea>
                                                <div class="flex flex-wrap justify-end gap-2">
                                                    <p-button label="批准" icon="pi pi-check" size="small" severity="success" [loading]="saving()" styleClass="rounded-md!" (onClick)="approveScoreOverride(pendingOverride)" />
                                                    <p-button label="驳回" icon="pi pi-times" size="small" severity="danger" [outlined]="true" [disabled]="!scoreOverrideRejectReason().trim()" [loading]="saving()" styleClass="rounded-md!" (onClick)="rejectScoreOverride(pendingOverride)" />
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }

                            @if (history.activeOverride; as activeOverride) {
                                <div class="rounded-[8px] border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                                    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="text-sm font-semibold text-blue-900 dark:text-blue-100">生效中的人工覆盖</span>
                                                <p-tag [value]="getScoreOverrideStatusName(activeOverride.status)" [severity]="getScoreOverrideStatusSeverity(activeOverride.status)" class="rounded-[6px]" />
                                            </div>
                                            <p class="mt-2 text-sm leading-6 text-blue-800 dark:text-blue-100">当前取 {{ activeOverride.requestedScore }} / {{ getLeadRatingName(activeOverride.requestedRating) }}。</p>
                                            <p class="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-200">{{ activeOverride.reason }}</p>
                                        </div>
                                        @if (canManageScoreOverrides()) {
                                            <div class="flex min-w-60 flex-col gap-2">
                                                <textarea pTextarea rows="2" [ngModel]="scoreOverrideRevokeReason()" (ngModelChange)="scoreOverrideRevokeReason.set($event)" class="w-full rounded-md!" placeholder="撤销原因"></textarea>
                                                <div class="flex justify-end">
                                                    <p-button label="撤销覆盖" icon="pi pi-undo" size="small" severity="danger" [outlined]="true" [disabled]="!scoreOverrideRevokeReason().trim()" [loading]="saving()" styleClass="rounded-md!" (onClick)="revokeScoreOverride(activeOverride)" />
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }

                            @if (canSubmitScoreOverride(target, history)) {
                                <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                                    <div class="flex flex-col gap-2">
                                        <h3 class="text-sm font-semibold text-surface-950 dark:text-surface-0">提交人工覆盖申请</h3>
                                        <p class="text-xs leading-5 text-surface-500 dark:text-surface-400">人工覆盖只改变当前有效评分，不会补齐确认有效或转项目硬闸口缺口。</p>
                                    </div>
                                    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
                                        <div class="flex flex-col gap-2">
                                            <label for="scoreOverrideScore" class="text-sm font-medium text-surface-900 dark:text-surface-0">覆盖分数</label>
                                            <p-inputnumber inputId="scoreOverrideScore" [ngModel]="scoreOverrideForm().score" (ngModelChange)="updateScoreOverrideScore($event)" [min]="0" [max]="100" [useGrouping]="false" styleClass="w-full" inputStyleClass="w-full rounded-md!" />
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <label for="scoreOverrideReason" class="text-sm font-medium text-surface-900 dark:text-surface-0">覆盖原因</label>
                                            <textarea pTextarea id="scoreOverrideReason" rows="3" [ngModel]="scoreOverrideForm().reason" (ngModelChange)="updateScoreOverrideReason($event)" class="w-full rounded-md!" placeholder="说明为什么系统评分无法表达当前业务判断"></textarea>
                                        </div>
                                    </div>
                                    <div class="mt-3 flex justify-end">
                                        <p-button label="提交覆盖申请" icon="pi pi-send" severity="primary" [disabled]="!isScoreOverrideFormValid()" [loading]="saving()" styleClass="rounded-md!" (onClick)="submitScoreOverride()" />
                                    </div>
                                </div>
                            }

                            <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                                <div class="flex items-center justify-between gap-3">
                                    <h3 class="text-sm font-semibold text-surface-950 dark:text-surface-0">评分快照</h3>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ history.snapshots.length }} 条</span>
                                </div>
                                <div class="mt-3 flex flex-col gap-3">
                                    @for (snapshot of history.snapshots; track snapshot.id) {
                                        <div class="rounded-[8px] border border-surface-100 p-3 dark:border-surface-800">
                                            <div class="flex flex-wrap items-center justify-between gap-2">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <p-tag [value]="getScoreSnapshotKindName(snapshot.snapshotKind)" severity="secondary" class="rounded-[6px]" />
                                                    <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ snapshot.effectiveScore }} / {{ getLeadRatingName(snapshot.effectiveRating) }}</span>
                                                </div>
                                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ snapshot.createdAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                            </div>
                                            <p class="mt-2 text-xs leading-5 text-surface-600 dark:text-surface-300">{{ snapshot.scoreReason }}</p>
                                        </div>
                                    } @empty {
                                        <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无评分快照。</div>
                                    }
                                </div>
                            </div>

                            <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                                <div class="flex items-center justify-between gap-3">
                                    <h3 class="text-sm font-semibold text-surface-950 dark:text-surface-0">覆盖记录</h3>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ history.overrides.length }} 条</span>
                                </div>
                                <div class="mt-3 flex flex-col gap-3">
                                    @for (override of history.overrides; track override.id) {
                                        <div class="rounded-[8px] border border-surface-100 p-3 dark:border-surface-800">
                                            <div class="flex flex-wrap items-center justify-between gap-2">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <p-tag [value]="getScoreOverrideStatusName(override.status)" [severity]="getScoreOverrideStatusSeverity(override.status)" class="rounded-[6px]" />
                                                    <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ override.requestedScore }} / {{ getLeadRatingName(override.requestedRating) }}</span>
                                                </div>
                                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ override.requestedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                            </div>
                                            <p class="mt-2 text-xs leading-5 text-surface-600 dark:text-surface-300">{{ override.reason }}</p>
                                        </div>
                                    } @empty {
                                        <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无人工覆盖记录。</div>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                }

                <ng-template #footer>
                    <div class="flex justify-end">
                        <p-button label="关闭" severity="secondary" styleClass="rounded-md!" (onClick)="scoreHistoryDialogVisible = false" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="assignOwnerDialogVisible" [modal]="true" header="分配线索主责" [style]="{ width: '34rem' }" styleClass="p-fluid" (onHide)="resetAssignOwnerDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (actionTarget(); as lead) {
                        <app-workspace-feedback severity="info" summary="线索归属" [detail]="displayText(lead.ownerName, '当前在公共池') + ' · ' + lead.leadName" />
                    }
                    @if (assignmentError()) {
                        <app-workspace-feedback severity="error" summary="线索主责没有更新" [detail]="assignmentError()" />
                    }

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="assignOwnerUserId" class="text-sm font-medium text-surface-900 dark:text-surface-0">销售主责</label>
                            <p-select
                                inputId="assignOwnerUserId"
                                [ngModel]="assignmentForm().ownerUserId"
                                (ngModelChange)="updateAssignmentOwnerUser($event)"
                                [options]="ownerUserOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [filter]="true"
                                filterBy="label"
                                [loading]="ownerReferenceLoading()"
                                appendTo="body"
                                placeholder="选择销售主责"
                                class="w-full rounded-md!"
                            />
                            @if (assignmentAttempted() && !assignmentForm().ownerUserId) {
                                <span class="text-xs text-red-600 dark:text-red-300">请选择销售主责。</span>
                            }
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="assignOwnerOrgId" class="text-sm font-medium text-surface-900 dark:text-surface-0">主责组织</label>
                            <p-select
                                inputId="assignOwnerOrgId"
                                [ngModel]="assignmentForm().ownerOrgId"
                                (ngModelChange)="updateAssignmentOwnerOrg($event)"
                                [options]="ownerOrgOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [showClear]="true"
                                [loading]="ownerReferenceLoading()"
                                appendTo="body"
                                placeholder="可留空"
                                class="w-full rounded-md!"
                            />
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="assignmentReason" class="text-sm font-medium text-surface-900 dark:text-surface-0">分配原因</label>
                        <textarea
                            pTextarea
                            id="assignmentReason"
                            rows="3"
                            [ngModel]="assignmentForm().reason"
                            (ngModelChange)="updateAssignmentReason($event)"
                            placeholder="说明申领、分配或改派原因"
                            class="w-full rounded-md!"
                        ></textarea>
                        @if (assignmentAttempted() && !assignmentForm().reason.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写分配原因。</span>
                        }
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="assignOwnerDialogVisible = false" />
                        <p-button label="保存分配" [loading]="saving()" [disabled]="!isAssignmentFormValid()" styleClass="rounded-md!" (onClick)="assignLeadOwner()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="qualifyDialogVisible" [modal]="true" header="确认线索有效" [style]="{ width: '32rem' }" (onHide)="resetQualifyDialog()">
                <div class="flex flex-col gap-3 py-2">
                    <p class="m-0 text-sm text-surface-600 dark:text-surface-300">说明为什么这条线索可以进入正式项目推进。</p>
                    @if (actionTarget(); as lead) {
                        <div class="grid grid-cols-1 gap-3 rounded-[8px] border border-surface-200 p-3 dark:border-surface-700 sm:grid-cols-2">
                            <div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">来源</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ getLeadSourceName(lead) }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">预算与金额</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ getBudgetStatusName(lead.budgetStatus) }} / {{ formatAmount(lead.estimatedAmount) }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">当前销售主责</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(lead.ownerName, '未分配') }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">主责组织</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(lead.ownerOrgName, '未归属组织') }}</div>
                            </div>
                        </div>
                        @if (lead.gateSummary.qualification.status === LeadGateStatus.Blocked) {
                            <app-workspace-feedback severity="warn" summary="确认有效前请补齐" [detail]="lead.gateSummary.qualification.explanation" />
                        }
                    }
                    @if (qualificationError()) {
                        <app-workspace-feedback severity="error" summary="线索没有确认有效" [detail]="qualificationError()" />
                    }
                    <textarea pTextarea rows="5" [ngModel]="qualificationSummary()" (ngModelChange)="qualificationSummary.set($event)" class="w-full rounded-md!" placeholder="例如：客户预算明确，已确认采购意向。"></textarea>
                    @if (actionAttempted() && !qualificationSummary().trim()) {
                        <span class="text-xs text-red-600 dark:text-red-300">请填写有效性说明。</span>
                    }
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="qualifyDialogVisible = false" />
                        <p-button label="确认有效" severity="success" [loading]="saving()" styleClass="rounded-md!" (onClick)="qualifyLead()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="convertDialogVisible" [modal]="true" header="转入项目" [style]="{ width: '36rem' }" styleClass="p-fluid" (onHide)="resetConvertDialog()">
                <div class="flex flex-col gap-4 py-2">
                    @if (actionTarget(); as lead) {
                        <app-workspace-feedback severity="info" summary="将有效线索转为正式项目" [detail]="lead.customerName + ' · ' + lead.leadName" />
                        @if (lead.gateSummary.conversion.status === LeadGateStatus.Blocked) {
                            <app-workspace-feedback severity="warn" summary="转项目前请补齐" [detail]="lead.gateSummary.conversion.explanation" />
                        }
                        <div class="grid grid-cols-1 gap-3 rounded-[8px] border border-surface-200 p-3 dark:border-surface-700 sm:grid-cols-2">
                            <div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">项目销售主责（继承线索）</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(lead.ownerName, '未分配') }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-surface-500 dark:text-surface-400">项目主责组织</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(lead.ownerOrgName, '未归属组织') }}</div>
                            </div>
                        </div>
                    }

                    @if (convertError()) {
                        <app-workspace-feedback severity="error" summary="线索没有转入项目" [detail]="convertError()" />
                    }

                    <div class="flex flex-col gap-2">
                        <label for="convertCustomerProjectNo" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户项目编号</label>
                        <input
                            pInputText
                            id="convertCustomerProjectNo"
                            [ngModel]="convertForm().customerProjectNo"
                            (ngModelChange)="updateConvertField('customerProjectNo', $event)"
                            placeholder="客户侧立项或招标编号，可选"
                            class="w-full rounded-md!"
                        />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="convertProjectName" class="text-sm font-medium text-surface-900 dark:text-surface-0">项目名称</label>
                        <input pInputText id="convertProjectName" [ngModel]="convertForm().projectName" (ngModelChange)="updateConvertField('projectName', $event)" placeholder="默认使用线索标题" class="w-full rounded-md!" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="plannedSignAt" class="text-sm font-medium text-surface-900 dark:text-surface-0">预计签约日期</label>
                        <p-datepicker
                            inputId="plannedSignAt"
                            [ngModel]="convertForm().plannedSignAt"
                            (ngModelChange)="updateConvertDate($event)"
                            [showButtonBar]="true"
                            appendTo="body"
                            dateFormat="yy-mm-dd"
                            placeholder="可留空"
                            styleClass="w-full"
                            inputStyleClass="w-full rounded-md!"
                        />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="convertDialogVisible = false" />
                        <p-button label="转入项目" icon="pi pi-arrow-right" severity="primary" [loading]="saving()" styleClass="rounded-md!" (onClick)="convertLeadToProject()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="closeDialogVisible" [modal]="true" header="关闭线索" [style]="{ width: '32rem' }" (onHide)="resetCloseDialog()">
                <div class="flex flex-col gap-3 py-2">
                    <p class="m-0 text-sm text-surface-600 dark:text-surface-300">关闭后不再作为转项目入口，请写明原因。</p>
                    <textarea pTextarea rows="5" [ngModel]="closedReason()" (ngModelChange)="closedReason.set($event)" class="w-full rounded-md!" placeholder="例如：客户预算取消，暂不推进。"></textarea>
                    @if (actionAttempted() && !closedReason().trim()) {
                        <span class="text-xs text-red-600 dark:text-red-300">请填写关闭原因。</span>
                    }
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeDialogVisible = false" />
                        <p-button label="关闭线索" severity="danger" [loading]="saving()" styleClass="rounded-md!" (onClick)="closeLead()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class LeadList implements OnInit {
    readonly #authStore = inject(AuthStore);
    readonly #customerStore = inject(CustomerStore);
    readonly #leadStore = inject(LeadStore);
    readonly #platformStore = inject(PlatformStore);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);

    readonly LeadEffectiveScoreSource = LeadEffectiveScoreSource;
    readonly LeadGateStatus = LeadGateStatus;
    readonly LeadScoreOverrideStatus = LeadScoreOverrideStatus;
    readonly LeadSourceStatus = LeadSourceStatus;

    readonly leads = this.#leadStore.leads;
    readonly leadSources = this.#leadStore.leadSources;
    readonly selectedLead = this.#leadStore.selectedLead;
    readonly loading = this.#leadStore.loading;
    readonly loadingSources = this.#leadStore.loadingSources;
    readonly loadingDetail = this.#leadStore.loadingDetail;
    readonly saving = this.#leadStore.saving;
    readonly customerLoading = this.#customerStore.loading;
    readonly searchValue = signal('');
    readonly statusFilter = signal<LeadStatus | LeadAllFilterValue>(ALL_FILTER_VALUE);
    readonly ratingFilter = signal<LeadRating | LeadAllFilterValue>(ALL_FILTER_VALUE);
    readonly ownershipFilter = signal<LeadOwnershipScope>(DEFAULT_OWNERSHIP_SCOPE);
    readonly createForm = signal<CreateLeadForm>(EMPTY_CREATE_FORM);
    readonly editForm = signal<EditLeadForm>({ ...EMPTY_EDIT_FORM });
    readonly sourceForm = signal<LeadSourceForm>(EMPTY_SOURCE_FORM);
    readonly convertForm = signal<ConvertProjectForm>(EMPTY_CONVERT_FORM);
    readonly assignmentForm = signal<AssignmentForm>({ ...EMPTY_ASSIGNMENT_FORM });
    readonly scoreOverrideForm = signal<ScoreOverrideForm>({ ...EMPTY_SCORE_OVERRIDE_FORM });
    readonly createAttempted = signal(false);
    readonly editAttempted = signal(false);
    readonly sourceAttempted = signal(false);
    readonly assignmentAttempted = signal(false);
    readonly actionAttempted = signal(false);
    readonly scoreOverrideAttempted = signal(false);
    readonly createError = signal<string | null>(null);
    readonly editError = signal<string | null>(null);
    readonly sourceError = signal<string | null>(null);
    readonly assignmentError = signal<string | null>(null);
    readonly qualificationError = signal<string | null>(null);
    readonly convertError = signal<string | null>(null);
    readonly pageError = signal<string | null>(null);
    readonly scoreHistory = signal<LeadScoreHistoryView | null>(null);
    readonly loadingScoreHistory = signal(false);
    readonly scoreHistoryError = signal<string | null>(null);
    readonly scoreOverrideApproveNote = signal('');
    readonly scoreOverrideRejectReason = signal('');
    readonly scoreOverrideRevokeReason = signal('');
    readonly qualificationSummary = signal('');
    readonly closedReason = signal('');
    readonly actionTarget = signal<LeadActionTarget | null>(null);
    readonly followUpReminderEntry = signal<FollowUpReminderEntry | null>(null);
    readonly queryOpenedLeadId = signal<string | null>(null);
    readonly conversionGuideActive = signal(false);

    readonly rows = 10;
    first = 0;
    createDialogVisible = false;
    editDialogVisible = false;
    sourceDialogVisible = false;
    detailDialogVisible = false;
    assignOwnerDialogVisible = false;
    qualifyDialogVisible = false;
    convertDialogVisible = false;
    closeDialogVisible = false;
    scoreHistoryDialogVisible = false;

    readonly statusOptions = LEAD_STATUS_OPTIONS;

    readonly ratingOptions = LEAD_RATING_OPTIONS;

    readonly ownershipOptions: Array<{ label: string; value: LeadOwnershipScope }> = [
        { label: '全部', value: LeadOwnershipScope.All },
        { label: '我的', value: LeadOwnershipScope.Mine },
        { label: '公共池', value: LeadOwnershipScope.PublicPool }
    ];

    readonly statusColumnFilterOptions = LEAD_STATUS_COLUMN_FILTER_OPTIONS;

    readonly budgetStatusOptions = LEAD_BUDGET_STATUS_OPTIONS;

    readonly urgencyOptions = LEAD_URGENCY_OPTIONS;

    readonly leadAttachmentTargetType = AttachmentTargetType.Lead;
    readonly leadDiscussionTargetType = BusinessDiscussionTargetObjectType.Lead;
    readonly projectDiscussionTargetType = BusinessDiscussionTargetObjectType.Project;

    readonly ownerUserOptions = computed<LeadOwnerUserOption[]>(() =>
        this.#platformStore
            .ownerUsers()
            .filter((user) => user.isActive)
            .map((user) => ({
                label: this.ownerUserLabel(user),
                value: user.id,
                primaryOrgUnitId: user.primaryOrgUnitId
            }))
    );

    readonly ownerOrgOptions = computed<LeadFilterOption[]>(() =>
        this.#platformStore
            .ownerOrgUnits()
            .filter((orgUnit) => orgUnit.isActive)
            .map((orgUnit) => ({
                label: orgUnit.name,
                value: orgUnit.id
            }))
    );

    readonly ownerReferenceLoading = computed(() => this.#platformStore.loadingOwnerReferenceData());
    readonly customerOptions = computed<CustomerOption[]>(() =>
        this.#customerStore.activeCustomers().map((customer) => ({
            label: `${customer.displayName}（${customer.customerNo}）`,
            value: customer.id,
            customer
        }))
    );

    readonly canWriteLead = computed(() => this.#authStore.hasAnyPermission(['lead:write'] as const));
    readonly canAssignLead = computed(() => this.#authStore.hasAnyPermission(['lead:assign'] as const));
    readonly canManageLeadSources = computed(() => this.#authStore.hasAnyPermission(['lead:source:manage'] as const));
    readonly canManageScoreOverrides = computed(() => this.#authStore.hasAnyPermission(['lead:score:override'] as const));

    readonly leadSourceOptions = computed<LeadFilterOption[]>(() =>
        this.leadSources()
            .filter((source) => source.status === LeadSourceStatus.Active)
            .map((source) => ({
                label: source.name,
                value: source.id
            }))
    );

    readonly visibleLeads = computed(() => {
        const keyword = this.normalize(this.searchValue());
        const selectedStatus = this.statusFilter();

        return this.leads().filter((lead) => {
            if (selectedStatus !== ALL_FILTER_VALUE && lead.status !== selectedStatus) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            return this.leadSearchText(lead).includes(keyword);
        });
    });

    readonly readyConversionLeadCount = computed(() => this.leads().filter((lead) => this.canConvertLead(lead)).length);
    readonly blockedConversionLeadCount = computed(() => this.leads().filter((lead) => lead.status === LeadStatus.Qualified && !this.canConvertLead(lead)).length);

    readonly totalLeadCount = computed(() => this.leads().length);
    readonly leadDistributionItems = computed<LeadDistributionItem[]>(() => {
        const total = this.totalLeadCount();

        return [
            this.buildLeadDistributionItem(LEAD_STATUS_LABELS[LeadStatus.Registered], this.#leadStore.registeredLeadCount(), '需要判断', 'bg-orange-500', 'rgba(249,115,22,0.16)', total),
            this.buildLeadDistributionItem(LEAD_STATUS_LABELS[LeadStatus.Qualified], this.#leadStore.qualifiedLeadCount(), '可转项目', 'bg-green-500', 'rgba(34,197,94,0.16)', total),
            this.buildLeadDistributionItem(LEAD_STATUS_LABELS[LeadStatus.Converted], this.#leadStore.convertedLeadCount(), '已有来源链', 'bg-primary-500', 'rgba(59,130,246,0.16)', total),
            this.buildLeadDistributionItem(LEAD_STATUS_LABELS[LeadStatus.Closed], this.#leadStore.closedLeadCount(), '不再推进', 'bg-rose-500', 'rgba(244,63,94,0.16)', total)
        ];
    });

    readonly isCreateFormValid = computed(() => {
        const form = this.createForm();
        return Boolean(form.leadName.trim() && form.customerId && form.sourceId && form.demandDescription.trim() && form.budgetStatus && form.urgency);
    });

    readonly isEditFormValid = computed(() => {
        const form = this.editForm();
        return Boolean(form.leadName.trim() && form.sourceId && form.demandDescription.trim() && form.budgetStatus && form.urgency);
    });

    readonly isAssignmentFormValid = computed(() => {
        const form = this.assignmentForm();
        return Boolean(form.ownerUserId && form.reason.trim());
    });

    readonly isScoreOverrideFormValid = computed(() => {
        const form = this.scoreOverrideForm();
        return Number.isInteger(form.score) && form.score !== null && form.score >= 0 && form.score <= 100 && Boolean(form.reason.trim());
    });

    ngOnInit() {
        this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
            const leadId = params.get('leadId');
            const followUpId = params.get('followUpId');
            const conversionGuide = params.get('conversion') === CONVERSION_QUERY_VALUE;
            this.queryOpenedLeadId.set(leadId);
            this.followUpReminderEntry.set(followUpId ? { followUpId, todoId: params.get('todoId') } : null);
            this.conversionGuideActive.set(conversionGuide);
            if (conversionGuide) {
                this.statusFilter.set(LeadStatus.Qualified);
                this.first = 0;
            }
            if (leadId) {
                void this.openLeadDetailById(leadId);
            }
        });
        void this.ensureAuthReady();
        void this.loadCustomers();
        void this.loadOwnerReferenceData();
        void this.loadLeadSources();
        void this.loadLeads();
    }

    async loadLeads() {
        this.pageError.set(null);
        const rating = this.ratingFilter();
        const filters: Parameters<LeadStore['loadLeads']>[0] = {
            ownershipScope: this.ownershipFilter()
        };
        if (rating !== ALL_FILTER_VALUE) {
            filters.rating = rating;
        }
        try {
            await this.#leadStore.loadLeads(filters);
        } catch {
            this.pageError.set('线索列表没有读取成功，请稍后重试。');
        }
    }

    async loadLeadSources() {
        try {
            await this.#leadStore.loadLeadSources();
        } catch {
            this.pageError.set('线索来源没有读取成功，请稍后重试。');
        }
    }

    goToProjects() {
        this.#router.navigate(['/projects']);
    }

    goToCustomers() {
        this.#router.navigate(['/customers']);
    }

    goToProject(projectId: string | null | undefined) {
        if (projectId) {
            this.#router.navigate(['/projects', projectId]);
        }
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
        this.first = 0;
    }

    clearFilters(table: Table) {
        const shouldClearConversionGuide = this.conversionGuideActive();
        this.searchValue.set('');
        this.statusFilter.set(ALL_FILTER_VALUE);
        this.ratingFilter.set(ALL_FILTER_VALUE);
        this.ownershipFilter.set(DEFAULT_OWNERSHIP_SCOPE);
        this.conversionGuideActive.set(false);
        this.first = 0;
        table.clear();
        if (shouldClearConversionGuide) {
            this.clearConversionGuideQuery();
        }
        void this.loadLeads();
    }

    clearConversionGuide() {
        this.conversionGuideActive.set(false);
        this.statusFilter.set(ALL_FILTER_VALUE);
        this.first = 0;
        this.clearConversionGuideQuery();
    }

    private clearConversionGuideQuery() {
        void this.#router.navigate([], {
            relativeTo: this.#route,
            queryParams: {
                conversion: null
            },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    setStatusFilter(value: LeadStatus | LeadAllFilterValue | null | undefined) {
        this.statusFilter.set(value ?? ALL_FILTER_VALUE);
        this.first = 0;
    }

    setRatingFilter(value: LeadRating | LeadAllFilterValue | null | undefined) {
        this.ratingFilter.set(value ?? ALL_FILTER_VALUE);
        this.first = 0;
        void this.loadLeads();
    }

    setOwnershipFilter(value: LeadOwnershipScope | null | undefined) {
        this.ownershipFilter.set(value ?? DEFAULT_OWNERSHIP_SCOPE);
        this.first = 0;
        void this.loadLeads();
    }

    showCreateDialog() {
        if (!this.canWriteLead()) {
            return;
        }

        if (!this.#leadStore.loadedSources()) {
            void this.loadLeadSources();
        }
        this.createForm.set(this.defaultCreateForm());
        this.createAttempted.set(false);
        this.createError.set(null);
        this.createDialogVisible = true;
    }

    closeCreateDialog() {
        this.createDialogVisible = false;
        this.createError.set(null);
    }

    resetCreateDialog() {
        this.createAttempted.set(false);
        this.createError.set(null);
    }

    showEditLeadDialog(lead: LeadActionTarget) {
        if (!this.canEditLead(lead)) {
            return;
        }

        if (!this.#leadStore.loadedSources()) {
            void this.loadLeadSources();
        }

        this.actionTarget.set(lead);
        this.editForm.set({
            leadName: lead.leadName,
            sourceId: lead.sourceId,
            demandDescription: lead.demandDescription ?? '',
            budgetStatus: lead.budgetStatus,
            estimatedAmount: lead.estimatedAmount ?? '',
            urgency: lead.urgency,
            expectedDecisionDate: this.fromIsoDate(lead.expectedDecisionDate)
        });
        this.editAttempted.set(false);
        this.editError.set(null);
        this.editDialogVisible = true;
    }

    resetEditDialog() {
        this.editAttempted.set(false);
        this.editError.set(null);
        this.editForm.set({ ...EMPTY_EDIT_FORM });
    }

    showSourceDialog() {
        if (!this.canManageLeadSources()) {
            return;
        }

        this.sourceForm.set({ ...EMPTY_SOURCE_FORM });
        this.sourceAttempted.set(false);
        this.sourceError.set(null);
        this.sourceDialogVisible = true;
        void this.loadLeadSources();
    }

    resetSourceDialog() {
        this.sourceAttempted.set(false);
        this.sourceError.set(null);
    }

    updateSourceField(field: 'code' | 'name' | 'description', value: string) {
        this.sourceForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.sourceError.set(null);
    }

    updateSourceSortOrder(value: string | number | null | undefined) {
        const parsed = Number(value);
        this.sourceForm.update((form) => ({
            ...form,
            sortOrder: Number.isFinite(parsed) ? parsed : EMPTY_SOURCE_FORM.sortOrder
        }));
        this.sourceError.set(null);
    }

    async createLeadSource() {
        this.sourceAttempted.set(true);

        if (!this.canManageLeadSources()) {
            return;
        }

        const form = this.sourceForm();
        const code = form.code.trim();
        const name = form.name.trim();

        if (!code || !name) {
            return;
        }

        try {
            await this.#leadStore.createLeadSource({
                code,
                name,
                description: this.optionalText(form.description),
                sortOrder: form.sortOrder
            });
            this.sourceForm.set({ ...EMPTY_SOURCE_FORM });
            this.sourceAttempted.set(false);
            this.createForm.update((createForm) => ({
                ...createForm,
                sourceId: createForm.sourceId ?? this.leadSourceOptions()[0]?.value ?? null
            }));
        } catch {
            this.sourceError.set('请确认编码没有重复，且名称完整。');
        }
    }

    async toggleLeadSourceStatus(source: LeadSourceSummary) {
        if (!this.canManageLeadSources()) {
            return;
        }

        const nextStatus = source.status === LeadSourceStatus.Active ? LeadSourceStatus.Inactive : LeadSourceStatus.Active;

        try {
            await this.#leadStore.updateLeadSource(source.id, { status: nextStatus });
            if (this.createForm().sourceId === source.id && nextStatus === LeadSourceStatus.Inactive) {
                this.createForm.update((form) => ({
                    ...form,
                    sourceId: this.leadSourceOptions().find((option) => option.value !== source.id)?.value ?? null
                }));
            }
        } catch {
            this.sourceError.set('来源状态没有更新成功，请稍后重试。');
        }
    }

    updateCreateField(field: 'leadName' | 'demandDescription' | 'estimatedAmount', value: string) {
        this.createForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.createError.set(null);
    }

    updateEditField(field: 'leadName' | 'demandDescription' | 'estimatedAmount', value: string) {
        this.editForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.editError.set(null);
    }

    updateEditSource(value: string | null | undefined) {
        this.editForm.update((form) => ({
            ...form,
            sourceId: value ?? null
        }));
        this.editError.set(null);
    }

    updateEditBudgetStatus(value: LeadBudgetStatus | null | undefined) {
        this.editForm.update((form) => ({
            ...form,
            budgetStatus: value ?? DEFAULT_BUDGET_STATUS
        }));
        this.editError.set(null);
    }

    updateEditUrgency(value: LeadUrgency | null | undefined) {
        this.editForm.update((form) => ({
            ...form,
            urgency: value ?? DEFAULT_URGENCY
        }));
        this.editError.set(null);
    }

    updateEditExpectedDecisionDate(value: Date | null) {
        this.editForm.update((form) => ({
            ...form,
            expectedDecisionDate: value
        }));
        this.editError.set(null);
    }

    updateCreateSource(value: string | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            sourceId: value ?? null
        }));
        this.createError.set(null);
    }

    updateCreateBudgetStatus(value: LeadBudgetStatus | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            budgetStatus: value ?? DEFAULT_BUDGET_STATUS
        }));
        this.createError.set(null);
    }

    updateCreateUrgency(value: LeadUrgency | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            urgency: value ?? DEFAULT_URGENCY
        }));
        this.createError.set(null);
    }

    updateCreateExpectedDecisionDate(value: Date | null) {
        this.createForm.update((form) => ({
            ...form,
            expectedDecisionDate: value
        }));
        this.createError.set(null);
    }

    updateCreateCustomer(value: string | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            customerId: value ?? null
        }));
        this.createError.set(null);
    }

    updateCreateOwnerUser(value: string | null | undefined) {
        const ownerUserId = value ?? null;
        const owner = ownerUserId ? this.findOwnerUser(ownerUserId) : null;
        this.createForm.update((form) => ({
            ...form,
            ownerUserId,
            ownerOrgId: owner?.primaryOrgUnitId ?? null
        }));
        this.createError.set(null);
    }

    updateCreateOwnerOrg(value: string | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            ownerOrgId: value ?? null
        }));
        this.createError.set(null);
    }

    async createLead() {
        this.createAttempted.set(true);

        if (!this.canWriteLead() || !this.isCreateFormValid()) {
            return;
        }

        const form = this.createForm();
        const customerId = form.customerId;
        const sourceId = form.sourceId;

        if (!customerId || !sourceId) {
            return;
        }

        try {
            await this.#leadStore.createLead({
                leadName: form.leadName.trim(),
                customerId,
                sourceId,
                demandDescription: form.demandDescription.trim(),
                budgetStatus: form.budgetStatus,
                estimatedAmount: this.optionalText(form.estimatedAmount),
                urgency: form.urgency,
                expectedDecisionDate: form.expectedDecisionDate ? this.toIsoDate(form.expectedDecisionDate) : null,
                ownerUserId: form.ownerUserId,
                ownerOrgId: form.ownerUserId ? form.ownerOrgId ?? null : null
            });
            this.closeCreateDialog();
        } catch {
            this.createError.set('请检查线索信息是否完整，或稍后重试。');
        }
    }

    async updateLead() {
        this.editAttempted.set(true);
        const target = this.actionTarget();
        const form = this.editForm();
        const sourceId = form.sourceId;

        if (!target || !this.canEditLead(target) || !this.isEditFormValid() || !sourceId) {
            return;
        }

        try {
            await this.#leadStore.updateLead(target.id, {
                leadName: form.leadName.trim(),
                sourceId,
                demandDescription: form.demandDescription.trim(),
                budgetStatus: form.budgetStatus,
                estimatedAmount: this.optionalText(form.estimatedAmount),
                urgency: form.urgency,
                expectedDecisionDate: form.expectedDecisionDate ? this.toIsoDate(form.expectedDecisionDate) : null,
                expectedVersion: target.rowVersion
            });
            this.editDialogVisible = false;
        } catch {
            this.editError.set('请确认线索仍处于可编辑状态，且来源渠道有效。');
        }
    }

    async openLeadDetail(lead: LeadListView) {
        this.followUpReminderEntry.set(null);
        this.queryOpenedLeadId.set(null);
        await this.openLeadDetailById(lead.id);
    }

    async openLeadDetailById(leadId: string) {
        this.detailDialogVisible = true;
        this.pageError.set(null);

        try {
            await this.#leadStore.loadLead(leadId);
        } catch {
            this.pageError.set('线索详情没有读取成功，请稍后重试。');
        }
    }

    async openScoreHistory(lead: LeadActionTarget) {
        this.actionTarget.set(lead);
        this.scoreHistoryDialogVisible = true;
        this.resetScoreHistoryState();
        this.resetScoreOverrideForm(lead);
        await this.loadScoreHistory(lead.id);
    }

    async loadScoreHistory(leadId: string) {
        this.loadingScoreHistory.set(true);
        this.scoreHistoryError.set(null);

        try {
            const history = await this.#leadStore.loadLeadScoreHistory(leadId);
            this.scoreHistory.set(history);
            this.resetScoreOverrideForm(this.actionTarget());
        } catch {
            this.scoreHistoryError.set('评分历史没有读取成功，请稍后重试。');
        } finally {
            this.loadingScoreHistory.set(false);
        }
    }

    resetScoreHistoryDialog() {
        this.resetScoreHistoryState();
        this.scoreOverrideForm.set({ ...EMPTY_SCORE_OVERRIDE_FORM });
        this.scoreOverrideAttempted.set(false);
    }

    updateScoreOverrideScore(value: number | string | null | undefined) {
        const numericValue = typeof value === 'number' ? value : value === null || value === undefined || value === '' ? null : Number(value);
        this.scoreOverrideForm.update((form) => ({
            ...form,
            score: numericValue !== null && Number.isFinite(numericValue) ? numericValue : null
        }));
        this.scoreHistoryError.set(null);
    }

    updateScoreOverrideReason(value: string) {
        this.scoreOverrideForm.update((form) => ({
            ...form,
            reason: value
        }));
        this.scoreHistoryError.set(null);
    }

    clearDetail() {
        this.#leadStore.clearSelectedLead();
        this.assignOwnerDialogVisible = false;
        this.resetAssignOwnerDialog();
        this.clearFollowUpReminderQuery();
    }

    clearFollowUpReminderQuery() {
        if (!this.followUpReminderEntry() && !this.queryOpenedLeadId()) {
            return;
        }

        this.followUpReminderEntry.set(null);
        this.queryOpenedLeadId.set(null);
        void this.#router.navigate([], {
            relativeTo: this.#route,
            queryParams: {
                leadId: null,
                followUpId: null,
                todoId: null
            },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    async claimLeadOwner(lead: LeadActionTarget) {
        if (!this.canClaimLead(lead)) {
            return;
        }

        try {
            await this.#leadStore.claimLeadOwner(lead.id, { expectedVersion: lead.rowVersion });
        } catch {
            this.pageError.set('线索没有申领成功，请确认它仍在公共池。');
        }
    }

    showAssignOwnerDialog(lead: LeadActionTarget) {
        if (!this.canAssignLeadOwner(lead)) {
            return;
        }

        this.actionTarget.set(lead);
        this.assignmentForm.set({
            ownerUserId: lead.ownerUserId ?? null,
            ownerOrgId: lead.ownerOrgId ?? null,
            reason: lead.ownerUserId ? '销售主责改派' : '公共池线索分配'
        });
        this.assignmentAttempted.set(false);
        this.assignmentError.set(null);
        this.assignOwnerDialogVisible = true;
    }

    resetAssignOwnerDialog() {
        this.assignmentAttempted.set(false);
        this.assignmentError.set(null);
        this.assignmentForm.set({ ...EMPTY_ASSIGNMENT_FORM });
    }

    updateAssignmentOwnerUser(value: string | null | undefined) {
        const ownerUserId = value ?? null;
        const owner = ownerUserId ? this.findOwnerUser(ownerUserId) : null;
        this.assignmentForm.update((form) => ({
            ...form,
            ownerUserId,
            ownerOrgId: owner?.primaryOrgUnitId ?? null
        }));
        this.assignmentError.set(null);
    }

    updateAssignmentOwnerOrg(value: string | null | undefined) {
        this.assignmentForm.update((form) => ({
            ...form,
            ownerOrgId: value ?? null
        }));
        this.assignmentError.set(null);
    }

    updateAssignmentReason(value: string) {
        this.assignmentForm.update((form) => ({
            ...form,
            reason: value
        }));
        this.assignmentError.set(null);
    }

    async assignLeadOwner() {
        this.assignmentAttempted.set(true);
        const target = this.actionTarget();
        const form = this.assignmentForm();

        if (!target || !this.canAssignLeadOwner(target) || !form.ownerUserId || !form.reason.trim()) {
            return;
        }

        try {
            await this.#leadStore.assignLeadOwner(target.id, {
                ownerUserId: form.ownerUserId,
                ownerOrgId: form.ownerOrgId ?? null,
                reason: form.reason.trim(),
                expectedVersion: target.rowVersion
            });
            this.assignOwnerDialogVisible = false;
        } catch {
            this.assignmentError.set('请确认目标销售和组织仍然有效，且线索状态允许分配。');
        }
    }

    async submitScoreOverride() {
        this.scoreOverrideAttempted.set(true);
        const target = this.actionTarget();
        const history = this.scoreHistory();
        const form = this.scoreOverrideForm();

        if (!target || !this.canSubmitScoreOverride(target, history) || !this.isScoreOverrideFormValid() || form.score === null) {
            return;
        }

        try {
            await this.#leadStore.submitLeadScoreOverride(target.id, {
                score: form.score,
                reason: form.reason.trim(),
                expectedLeadRowVersion: target.rowVersion
            });
            await this.loadScoreHistory(target.id);
        } catch {
            this.scoreHistoryError.set('人工覆盖申请没有提交成功，请确认线索仍可编辑且没有待审批覆盖。');
        }
    }

    async approveScoreOverride(override: LeadScoreOverrideSummary) {
        if (!this.canManageScoreOverrides() || override.status !== LeadScoreOverrideStatus.Pending) {
            return;
        }

        try {
            await this.#leadStore.approveLeadScoreOverride(override.id, {
                expectedOverrideRowVersion: override.rowVersion,
                note: this.optionalText(this.scoreOverrideApproveNote())
            });
            this.scoreOverrideApproveNote.set('');
            await this.loadScoreHistory(override.leadId);
        } catch {
            this.scoreHistoryError.set('人工覆盖没有批准成功，请确认记录仍处于待审批状态。');
        }
    }

    async rejectScoreOverride(override: LeadScoreOverrideSummary) {
        const reason = this.scoreOverrideRejectReason().trim();
        if (!this.canManageScoreOverrides() || override.status !== LeadScoreOverrideStatus.Pending || !reason) {
            return;
        }

        try {
            await this.#leadStore.rejectLeadScoreOverride(override.id, {
                expectedOverrideRowVersion: override.rowVersion,
                reason
            });
            this.scoreOverrideRejectReason.set('');
            await this.loadScoreHistory(override.leadId);
        } catch {
            this.scoreHistoryError.set('人工覆盖没有驳回成功，请确认记录仍处于待审批状态。');
        }
    }

    async revokeScoreOverride(override: LeadScoreOverrideSummary) {
        const reason = this.scoreOverrideRevokeReason().trim();
        if (!this.canManageScoreOverrides() || override.status !== LeadScoreOverrideStatus.Approved || !reason) {
            return;
        }

        try {
            await this.#leadStore.revokeLeadScoreOverride(override.id, {
                expectedOverrideRowVersion: override.rowVersion,
                reason
            });
            this.scoreOverrideRevokeReason.set('');
            await this.loadScoreHistory(override.leadId);
        } catch {
            this.scoreHistoryError.set('人工覆盖没有撤销成功，请确认记录仍是生效覆盖。');
        }
    }

    showQualifyDialog(lead: LeadActionTarget) {
        if (!this.canQualifyLead(lead)) {
            return;
        }
        this.actionTarget.set(lead);
        this.qualificationSummary.set('');
        this.qualificationError.set(null);
        this.actionAttempted.set(false);
        this.qualifyDialogVisible = true;
    }

    resetQualifyDialog() {
        this.actionAttempted.set(false);
        this.qualificationSummary.set('');
        this.qualificationError.set(null);
    }

    async qualifyLead() {
        this.actionAttempted.set(true);
        const target = this.actionTarget();
        const summary = this.qualificationSummary().trim();

        if (!target || !summary || !this.canQualifyLead(target)) {
            return;
        }

        try {
            await this.#leadStore.qualifyLead(target.id, { qualificationSummary: summary });
            this.qualifyDialogVisible = false;
        } catch {
            this.qualificationError.set('请确认来源、需求、预算、金额、主责人和主责组织已补齐。');
        }
    }

    showConvertDialog(lead: LeadActionTarget) {
        if (!this.canConvertLead(lead)) {
            return;
        }

        this.actionTarget.set(lead);
        this.convertForm.set({
            ...EMPTY_CONVERT_FORM,
            projectName: lead.leadName
        });
        this.actionAttempted.set(false);
        this.convertError.set(null);
        this.convertDialogVisible = true;
    }

    resetConvertDialog() {
        this.actionAttempted.set(false);
        this.convertError.set(null);
        this.convertForm.set({ ...EMPTY_CONVERT_FORM });
    }

    updateConvertField(field: 'customerProjectNo' | 'projectName', value: string) {
        this.convertForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.convertError.set(null);
    }

    updateConvertDate(value: Date | null) {
        this.convertForm.update((form) => ({
            ...form,
            plannedSignAt: value
        }));
        this.convertError.set(null);
    }

    async convertLeadToProject() {
        this.actionAttempted.set(true);
        const target = this.actionTarget();
        const form = this.convertForm();

        if (!target || !this.canConvertLead(target)) {
            return;
        }

        try {
            const project = await this.#leadStore.convertLeadToProject(target.id, {
                customerProjectNo: this.optionalText(form.customerProjectNo),
                projectName: this.optionalText(form.projectName) ?? undefined,
                plannedSignAt: form.plannedSignAt ? this.toIsoDate(form.plannedSignAt) : null
            });
            this.convertDialogVisible = false;
            this.detailDialogVisible = false;
            this.goToProject(project.id);
        } catch {
            this.convertError.set('请确认线索仍处于有效状态，或稍后重试。');
        }
    }

    showCloseDialog(lead: LeadActionTarget) {
        if (!this.canCloseLead(lead)) {
            return;
        }
        this.actionTarget.set(lead);
        this.closedReason.set('');
        this.actionAttempted.set(false);
        this.closeDialogVisible = true;
    }

    resetCloseDialog() {
        this.actionAttempted.set(false);
        this.closedReason.set('');
    }

    async closeLead() {
        this.actionAttempted.set(true);
        const target = this.actionTarget();
        const reason = this.closedReason().trim();

        if (!target || !reason || !this.canCloseLead(target)) {
            return;
        }

        await this.#leadStore.closeLead(target.id, { closedReason: reason });
        this.closeDialogVisible = false;
    }

    canClaimLead(lead: LeadActionTarget): boolean {
        return this.canWriteLead() && (lead.allowedActions ?? []).includes(LeadAllowedAction.ClaimLeadOwner);
    }

    canAssignLeadOwner(lead: LeadActionTarget): boolean {
        return this.canAssignLead() && (lead.allowedActions ?? []).includes(LeadAllowedAction.AssignLeadOwner);
    }

    canEditLead(lead: Pick<LeadActionTarget, 'status'>): boolean {
        return this.canWriteLead() && (lead.status === LeadStatus.Registered || lead.status === LeadStatus.Qualified);
    }

    canQualifyLead(lead: LeadActionTarget): boolean {
        return this.canWriteLead() && lead.gateSummary.qualification.status === LeadGateStatus.Ready;
    }

    canCloseLead(lead: Pick<LeadActionTarget, 'status'>): boolean {
        return this.canWriteLead() && (lead.status === LeadStatus.Registered || lead.status === LeadStatus.Qualified);
    }

    canConvertLead(lead: LeadActionTarget): boolean {
        return this.canWriteLead() && lead.gateSummary.conversion.status === LeadGateStatus.Ready;
    }

    canSubmitScoreOverride(lead: LeadActionTarget | null, history: LeadScoreHistoryView | null = this.scoreHistory()): boolean {
        return Boolean(this.canWriteLead() && lead && lead.status !== LeadStatus.Closed && lead.status !== LeadStatus.Converted && !history?.pendingOverride);
    }

    shouldShowConversionGapAction(lead: LeadActionTarget): boolean {
        return this.conversionGuideActive() && this.canWriteLead() && lead.status === LeadStatus.Qualified && !this.canConvertLead(lead);
    }

    getEffectiveScore(lead: Pick<LeadActionTarget, 'score' | 'effectiveScore'>): number {
        return lead.effectiveScore ?? lead.score;
    }

    getEffectiveRating(lead: Pick<LeadActionTarget, 'rating' | 'effectiveRating'>): LeadRating {
        return lead.effectiveRating ?? lead.rating;
    }

    getEffectiveScoreReason(lead: Pick<LeadActionTarget, 'scoreReason' | 'effectiveScoreReason'>): string {
        return lead.effectiveScoreReason ?? lead.scoreReason;
    }

    getEffectiveScoreSource(lead: Pick<LeadActionTarget, 'effectiveScoreSource'>): LeadEffectiveScoreSource {
        return lead.effectiveScoreSource ?? LeadEffectiveScoreSource.System;
    }

    isManualEffectiveScore(lead: Pick<LeadActionTarget, 'effectiveScoreSource'>): boolean {
        return this.getEffectiveScoreSource(lead) === LeadEffectiveScoreSource.ManualOverride;
    }

    hasSystemScoreDrift(override: LeadScoreOverrideSummary, history: LeadScoreHistoryView): boolean {
        return override.systemScoreAtRequest !== history.systemScore || override.systemRatingAtRequest !== history.systemRating;
    }

    getStatusName(status: LeadStatus): string {
        return leadStatusLabelOrFallback(status);
    }

    getStatusSeverity(status: LeadStatus) {
        return leadStatusSeverityOrFallback(status);
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    getLeadSourceName(lead: Pick<LeadActionTarget, 'sourceName' | 'sourceChannel'>): string {
        return this.displayText(lead.sourceName ?? lead.sourceChannel, '未填写');
    }

    getBudgetStatusName(status: LeadBudgetStatus | null | undefined): string {
        return status ? LEAD_BUDGET_STATUS_LABELS[status] : '未填写';
    }

    getUrgencyName(urgency: LeadUrgency | null | undefined): string {
        return urgency ? LEAD_URGENCY_LABELS[urgency] : '未填写';
    }

    getLeadRatingName(rating: LeadRating | null | undefined): string {
        return rating ? LEAD_RATING_LABELS[rating] : '未评级';
    }

    getLeadRatingSeverity(rating: LeadRating | null | undefined) {
        switch (rating) {
            case LeadRating.A:
                return 'success';
            case LeadRating.B:
                return 'info';
            case LeadRating.C:
                return 'warn';
            default:
                return 'secondary';
        }
    }

    getEffectiveScoreSourceName(source: LeadEffectiveScoreSource | null | undefined): string {
        return source ? LEAD_EFFECTIVE_SCORE_SOURCE_LABELS[source] : '系统评分';
    }

    getEffectiveScoreSourceSeverity(source: LeadEffectiveScoreSource | null | undefined) {
        return source === LeadEffectiveScoreSource.ManualOverride ? 'warn' : 'secondary';
    }

    getScoreOverrideStatusName(status: LeadScoreOverrideStatus | null | undefined): string {
        return status ? LEAD_SCORE_OVERRIDE_STATUS_LABELS[status] : '未知';
    }

    getScoreOverrideStatusSeverity(status: LeadScoreOverrideStatus | null | undefined) {
        switch (status) {
            case LeadScoreOverrideStatus.Pending:
                return 'warn';
            case LeadScoreOverrideStatus.Approved:
                return 'success';
            case LeadScoreOverrideStatus.Rejected:
            case LeadScoreOverrideStatus.Revoked:
                return 'danger';
            default:
                return 'secondary';
        }
    }

    getScoreSnapshotKindName(kind: LeadScoreSnapshotKind | null | undefined): string {
        switch (kind) {
            case LeadScoreSnapshotKind.ManualOverride:
                return '覆盖生效';
            case LeadScoreSnapshotKind.OverrideRevoked:
                return '覆盖撤销';
            case LeadScoreSnapshotKind.System:
                return '系统评分';
            default:
                return '评分记录';
        }
    }

    getSourceStatusName(status: LeadSourceStatus): string {
        return LEAD_SOURCE_STATUS_LABELS[status];
    }

    getSourceStatusSeverity(status: LeadSourceStatus) {
        return status === LeadSourceStatus.Active ? 'success' : 'secondary';
    }

    formatAmount(value: string | null | undefined): string {
        if (!value) {
            return '未填写';
        }

        const amount = Number(value);
        if (!Number.isFinite(amount)) {
            return value;
        }

        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            maximumFractionDigits: 2
        }).format(amount);
    }

    private buildLeadDistributionItem(label: string, value: number, hint: string, color: string, shadowColor: string, total: number): LeadDistributionItem {
        const percentageLabel = this.formatPercentage(value, total);

        return {
            label,
            value,
            hint,
            color,
            shadowColor,
            percentageLabel,
            flexValue: Math.max(value, 1),
            tooltip: `${label}：${value.toLocaleString('zh-CN')} 条，占 ${percentageLabel}，${hint}`
        };
    }

    private defaultCreateForm(): CreateLeadForm {
        const currentUser = this.#authStore.currentUser();
        const primaryOrg = currentUser?.orgUnits.find((org) => org.membershipType === 'primary') ?? null;

        return {
            ...EMPTY_CREATE_FORM,
            sourceId: this.leadSourceOptions()[0]?.value ?? null,
            ownerUserId: currentUser?.id ?? null,
            ownerOrgId: primaryOrg?.id ?? null
        };
    }

    private async loadOwnerReferenceData(): Promise<void> {
        try {
            if (!this.#platformStore.loadedOwnerReferenceData()) {
                await this.#platformStore.loadOwnerReferenceData();
            }
        } catch {
            this.pageError.set('销售主责候选没有读取成功，请稍后重试。');
        }
    }

    private async loadCustomers(): Promise<void> {
        try {
            if (!this.#customerStore.loaded()) {
                await this.#customerStore.loadCustomers({ status: CustomerStatus.Active });
            }
        } catch {
            this.pageError.set('客户候选没有读取成功，请稍后重试。');
        }
    }

    private ownerUserLabel(user: OwnerReferenceUser): string {
        return user.primaryOrgUnitName ? `${user.displayName}（${user.primaryOrgUnitName}）` : user.displayName;
    }

    private findOwnerUser(id: string): OwnerReferenceUser | null {
        return this.#platformStore.ownerUsers().find((user) => user.id === id) ?? null;
    }

    private leadSearchText(lead: LeadListView): string {
        return this.normalize([lead.leadNo, lead.leadName, lead.customerName, lead.sourceName, lead.sourceChannel, this.getBudgetStatusName(lead.budgetStatus), this.getUrgencyName(lead.urgency), this.getLeadRatingName(lead.rating), this.getLeadRatingName(this.getEffectiveRating(lead)), this.getEffectiveScoreSourceName(this.getEffectiveScoreSource(lead)), String(lead.score), String(this.getEffectiveScore(lead)), lead.ownerName, lead.ownerOrgName, this.getStatusName(lead.status)].join(' '));
    }

    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }

    private optionalText(value: string): string | null {
        const normalized = value.trim();
        return normalized ? normalized : null;
    }

    private resetScoreHistoryState(): void {
        this.scoreHistory.set(null);
        this.scoreHistoryError.set(null);
        this.loadingScoreHistory.set(false);
        this.scoreOverrideApproveNote.set('');
        this.scoreOverrideRejectReason.set('');
        this.scoreOverrideRevokeReason.set('');
    }

    private resetScoreOverrideForm(lead: LeadActionTarget | null): void {
        this.scoreOverrideForm.set({
            score: lead ? this.getEffectiveScore(lead) : null,
            reason: ''
        });
        this.scoreOverrideAttempted.set(false);
    }

    private formatPercentage(value: number, total: number): string {
        if (total <= 0) {
            return '0%';
        }

        const percentage = (value / total) * 100;
        return `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(percentage)}%`;
    }

    private toIsoDate(value: Date): string {
        const year = value.getFullYear();
        const month = `${value.getMonth() + 1}`.padStart(2, '0');
        const day = `${value.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private fromIsoDate(value: string | null | undefined): Date | null {
        if (!value) {
            return null;
        }

        const [year, month, day] = value.split('-').map((part) => Number(part));
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
            return null;
        }

        return new Date(year, month - 1, day);
    }

    private async ensureAuthReady(): Promise<void> {
        if (this.#authStore.isAuthenticated() && !this.#authStore.currentUser()) {
            await this.#authStore.initialize();
        }
    }
}
