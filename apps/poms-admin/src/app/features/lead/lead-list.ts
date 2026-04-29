import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
    AttachmentTargetType,
    AuthStore,
    CustomerStatus,
    CustomerStore,
    LeadStore,
    PlatformStore,
    SalesFollowUpStore,
    type CustomerListView,
    type LeadBudgetStatus,
    type LeadDetailView,
    type LeadListView,
    type LeadSourceStatus,
    type LeadSourceSummary,
    type LeadStatus,
    type LeadUrgency,
    type OwnerReferenceUser,
    type SalesFollowUpOutcome,
    type SalesFollowUpRecordSummary,
    type SalesFollowUpType
} from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { LEAD_STATUS_LABELS, leadStatusLabelOrFallback, leadStatusSeverityOrFallback } from '../../shared/ui/status-presentation';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';

interface LeadFilterOption {
    label: string;
    value: string;
}

interface LeadColumnFilterOption {
    label: string;
    value: string | null;
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

interface SalesFollowUpForm {
    followUpType: SalesFollowUpType;
    occurredAt: Date | null;
    summary: string;
    detail: string;
    outcome: SalesFollowUpOutcome;
    nextFollowUpAt: Date | null;
}

type LeadActionTarget = LeadListView | LeadDetailView;

const ALL_FILTER_VALUE = 'all';

const LEAD_STATUS = {
    registered: 'registered' as LeadStatus,
    qualified: 'qualified' as LeadStatus,
    converted: 'converted' as LeadStatus,
    closed: 'closed' as LeadStatus
};

const LEAD_BUDGET_STATUS_LABELS: Record<LeadBudgetStatus, string> = {
    unknown: '预算未知',
    'no-budget': '暂无预算',
    'rough-budget': '初步预算',
    'budget-confirmed': '预算已确认',
    'budget-approved': '预算已批准'
};

const LEAD_URGENCY_LABELS: Record<LeadUrgency, string> = {
    low: '低',
    normal: '一般',
    high: '高',
    critical: '紧急'
};

const LEAD_SOURCE_STATUS_LABELS: Record<LeadSourceStatus, string> = {
    active: '启用',
    inactive: '停用'
};

const SALES_FOLLOW_UP_TYPE_LABELS: Record<SalesFollowUpType, string> = {
    phone: '电话',
    meeting: '会议',
    wechat: '微信',
    email: '邮件',
    onsite: '现场拜访',
    other: '其他'
};

const SALES_FOLLOW_UP_OUTCOME_LABELS: Record<SalesFollowUpOutcome, string> = {
    progress: '有进展',
    'waiting-customer': '待客户反馈',
    'risk-discovered': '发现风险',
    deferred: '暂缓',
    'close-recommended': '建议关闭',
    'no-response': '暂无回应',
    other: '其他'
};

const DEFAULT_BUDGET_STATUS = 'unknown' as LeadBudgetStatus;
const DEFAULT_URGENCY = 'normal' as LeadUrgency;
const DEFAULT_FOLLOW_UP_TYPE = 'meeting' as SalesFollowUpType;
const DEFAULT_FOLLOW_UP_OUTCOME = 'progress' as SalesFollowUpOutcome;

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

const EMPTY_FOLLOW_UP_FORM: SalesFollowUpForm = {
    followUpType: DEFAULT_FOLLOW_UP_TYPE,
    occurredAt: null,
    summary: '',
    detail: '',
    outcome: DEFAULT_FOLLOW_UP_OUTCOME,
    nextFollowUpAt: null
};

@Component({
    selector: 'app-lead-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, DatePickerModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, TagModule, DialogModule, TextareaModule, AttachmentPanel, WorkspaceFeedback],
    providers: [LeadStore, CustomerStore, SalesFollowUpStore],
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
                        [globalFilterFields]="['leadNo', 'leadName', 'customerName', 'sourceName', 'sourceChannel', 'budgetStatus', 'urgency', 'status', 'ownerName', 'ownerOrgName']"
                        [tableStyle]="{ width: '100%', 'min-width': '94rem' }"
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
                                        styleClass="w-full md:w-40 rounded-md!"
                                    />
                                </div>

                                <div class="text-sm text-surface-500 dark:text-surface-400">当前筛出 {{ visibleLeads().length }} 条线索</div>
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="leadName" class="min-w-64">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">线索 <p-sortIcon field="leadName" /></span>
                                        <p-columnFilter type="text" field="leadName" display="menu" placeholder="按线索名筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="customerName" class="min-w-48">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">客户 <p-sortIcon field="customerName" /></span>
                                        <p-columnFilter type="text" field="customerName" display="menu" placeholder="按客户筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="status" class="min-w-36">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">状态 <p-sortIcon field="status" /></span>
                                        <p-columnFilter field="status" matchMode="equals" display="menu" [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                                            <ng-template #filter let-value let-filter="filterCallback">
                                                <p-select [ngModel]="value" [options]="statusColumnFilterOptions" optionLabel="label" optionValue="value" placeholder="任意状态" appendTo="body" (onChange)="filter($event.value)" styleClass="w-44" />
                                            </ng-template>
                                        </p-columnFilter>
                                    </div>
                                </th>
                                <th pSortableColumn="sourceName" class="min-w-40">
                                    <span class="flex items-center gap-2">来源 <p-sortIcon field="sourceName" /></span>
                                </th>
                                <th pSortableColumn="budgetStatus" class="min-w-36">
                                    <span class="flex items-center gap-2">预算 <p-sortIcon field="budgetStatus" /></span>
                                </th>
                                <th pSortableColumn="estimatedAmount" class="min-w-36">
                                    <span class="flex items-center gap-2">预计金额 <p-sortIcon field="estimatedAmount" /></span>
                                </th>
                                <th pSortableColumn="urgency" class="min-w-28">
                                    <span class="flex items-center gap-2">紧迫度 <p-sortIcon field="urgency" /></span>
                                </th>
                                <th pSortableColumn="ownerName" class="min-w-52">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">销售主责 <p-sortIcon field="ownerName" /></span>
                                        <p-columnFilter type="text" field="ownerName" display="menu" placeholder="按销售主责筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="updatedAt" class="min-w-44">
                                    <span class="flex items-center gap-2">最近更新 <p-sortIcon field="updatedAt" /></span>
                                </th>
                                <th class="min-w-64">继续处理</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-lead>
                            <tr>
                                <td>
                                    <button type="button" class="max-w-80 text-left text-sm font-semibold leading-5 text-primary hover:underline" (click)="openLeadDetail(lead)">
                                        {{ lead.leadName }}
                                    </button>
                                    <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ lead.leadNo }}</div>
                                </td>
                                <td>{{ lead.customerName }}</td>
                                <td><p-tag [value]="getStatusName(lead.status)" [severity]="getStatusSeverity(lead.status)" styleClass="rounded-[6px]" /></td>
                                <td>{{ getLeadSourceName(lead) }}</td>
                                <td>{{ getBudgetStatusName(lead.budgetStatus) }}</td>
                                <td>{{ formatAmount(lead.estimatedAmount) }}</td>
                                <td>{{ getUrgencyName(lead.urgency) }}</td>
                                <td>
                                    <div class="flex flex-col gap-1">
                                        <span>{{ displayText(lead.ownerName, '未分配') }}</span>
                                        <span class="text-xs text-surface-500 dark:text-surface-400">{{ displayText(lead.ownerOrgName, '未归属组织') }}</span>
                                    </div>
                                </td>
                                <td>{{ lead.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                                <td>
                                    <div class="flex flex-wrap gap-2">
                                        <p-button label="查看" icon="pi pi-eye" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="openLeadDetail(lead)" />
                                        @if (canQualifyLead(lead)) {
                                            <p-button label="确认有效" icon="pi pi-check" size="small" severity="success" [outlined]="true" styleClass="rounded-md!" (onClick)="showQualifyDialog(lead)" />
                                        }
                                        @if (canConvertLead(lead)) {
                                            <p-button label="转入项目" icon="pi pi-arrow-right" size="small" severity="primary" styleClass="rounded-md!" (onClick)="showConvertDialog(lead)" />
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
                                <td colspan="10" class="py-8 text-center text-surface-400">{{ loading() ? '线索读取中...' : '暂无匹配线索' }}</td>
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
                            styleClass="w-full rounded-md!"
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
                                styleClass="w-full rounded-md!"
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
                                styleClass="w-full rounded-md!"
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
                                styleClass="w-full rounded-md!"
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
                                [loading]="ownerReferenceLoading()"
                                appendTo="body"
                                placeholder="选择销售主责"
                                styleClass="w-full rounded-md!"
                            />
                            @if (createAttempted() && !createForm().ownerUserId) {
                                <span class="text-xs text-red-600 dark:text-red-300">请选择销售主责。</span>
                            }
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
                                styleClass="w-full rounded-md!"
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
                                            <p-tag [value]="getSourceStatusName(source.status)" [severity]="getSourceStatusSeverity(source.status)" styleClass="rounded-[6px]" />
                                        </div>
                                        <div class="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                            已引用 {{ source.usageCount }} 条<span class="mx-1">·</span>{{ displayText(source.description, '无描述') }}
                                        </div>
                                    </div>
                                    <p-button
                                        [label]="source.status === 'active' ? '停用' : '启用'"
                                        [icon]="source.status === 'active' ? 'pi pi-pause' : 'pi pi-play'"
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
                                <p-tag [value]="getStatusName(lead.status)" [severity]="getStatusSeverity(lead.status)" styleClass="rounded-[6px]" />
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
                                <dt class="text-xs text-surface-500 dark:text-surface-400">预计金额</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ formatAmount(lead.estimatedAmount) }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">紧迫程度</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ getUrgencyName(lead.urgency) }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">销售主责</dt>
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ displayText(lead.ownerName, '未分配') }}</dd>
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

                        @if (leadGateMissingItems(lead).length) {
                            <app-workspace-feedback severity="warn" summary="转项目前缺口" [detail]="leadGateMissingItems(lead).join('、')" />
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

                        <app-attachment-panel
                            [targetType]="leadAttachmentTargetType"
                            [targetId]="lead.id"
                            [canWrite]="canWriteLead()"
                            title="线索附件"
                            description="保存客户需求、沟通截图、会议纪要和线索判断材料。线索转入项目后会作为来源附件继续关联。"
                        />

                        <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 class="m-0 text-base font-semibold text-surface-950 dark:text-surface-0">销售跟进</h3>
                                    <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">线索转项目后继续沿用同一张跟进记录表。</p>
                                </div>
                                @if (canWriteLead()) {
                                    <p-button label="记录跟进" icon="pi pi-plus" severity="primary" [outlined]="true" styleClass="rounded-md!" (onClick)="showFollowUpDialog(lead)" />
                                }
                            </div>

                            <div class="mt-4 flex flex-col gap-3">
                                @if (followUpError() && !followUpDialogVisible) {
                                    <app-workspace-feedback severity="error" summary="销售跟进暂时无法处理" [detail]="followUpError()" />
                                } @else if (followUpLoading()) {
                                    <app-workspace-feedback severity="info" summary="正在读取销售跟进" detail="请稍候。" />
                                } @else if (followUps().length) {
                                    @for (record of followUps(); track record.id) {
                                        <div class="relative rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div class="min-w-0">
                                                    <div class="flex flex-wrap items-center gap-2">
                                                        <span class="text-sm font-semibold text-surface-950 dark:text-surface-0">{{ record.summary }}</span>
                                                        <p-tag [value]="getFollowUpOutcomeName(record.outcome)" severity="secondary" styleClass="rounded-[6px]" />
                                                    </div>
                                                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                                                        <span>{{ record.occurredAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                                        <span>{{ getFollowUpTypeName(record.followUpType) }}</span>
                                                        <span>{{ followUpContextLabel(record) }}</span>
                                                        <span>{{ displayText(record.ownerName, '未指定销售') }}</span>
                                                    </div>
                                                </div>
                                                @if (record.nextFollowUpAt) {
                                                    <div class="shrink-0 rounded-[6px] bg-primary-50 px-2 py-1 text-xs text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
                                                        下次 {{ record.nextFollowUpAt | date: 'MM-dd HH:mm' }}
                                                    </div>
                                                }
                                            </div>
                                            @if (record.detail) {
                                                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ record.detail }}</p>
                                            }
                                        </div>
                                    }
                                } @else {
                                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无销售跟进记录。</div>
                                }
                            </div>
                        </div>
                    </div>

                    <ng-template #footer>
                        <div class="flex flex-wrap justify-end gap-2">
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

            <p-dialog [(visible)]="followUpDialogVisible" [modal]="true" header="记录销售跟进" [style]="{ width: '36rem' }" styleClass="p-fluid" (onHide)="resetFollowUpDialog()">
                @if (selectedLead(); as lead) {
                    <div class="flex flex-col gap-4 py-2">
                        <app-workspace-feedback
                            severity="info"
                            summary="跟进上下文"
                            [detail]="lead.convertedProjectId ? '本次记录会挂到已转入项目，同时保留客户维度。' : '本次记录会挂到当前线索，同时保留客户维度。'"
                        />

                        @if (followUpError()) {
                            <app-workspace-feedback severity="error" summary="跟进记录没有保存成功" [detail]="followUpError()" />
                        }

                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="followUpType" class="text-sm font-medium text-surface-900 dark:text-surface-0">跟进方式</label>
                                <p-select
                                    inputId="followUpType"
                                    [ngModel]="followUpForm().followUpType"
                                    (ngModelChange)="updateFollowUpType($event)"
                                    [options]="followUpTypeOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    styleClass="w-full rounded-md!"
                                />
                            </div>

                            <div class="flex flex-col gap-2">
                                <label for="followUpOccurredAt" class="text-sm font-medium text-surface-900 dark:text-surface-0">发生时间</label>
                                <p-datepicker
                                    inputId="followUpOccurredAt"
                                    [ngModel]="followUpForm().occurredAt"
                                    (ngModelChange)="updateFollowUpDate('occurredAt', $event)"
                                    [showButtonBar]="true"
                                    [showTime]="true"
                                    hourFormat="24"
                                    appendTo="body"
                                    dateFormat="yy-mm-dd"
                                    styleClass="w-full"
                                    inputStyleClass="w-full rounded-md!"
                                />
                                @if (followUpAttempted() && !followUpForm().occurredAt) {
                                    <span class="text-xs text-red-600 dark:text-red-300">请选择发生时间。</span>
                                }
                            </div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="followUpSummary" class="text-sm font-medium text-surface-900 dark:text-surface-0">摘要</label>
                            <input pInputText id="followUpSummary" [ngModel]="followUpForm().summary" (ngModelChange)="updateFollowUpText('summary', $event)" placeholder="例如：完成预算口径确认" class="w-full rounded-md!" />
                            @if (followUpAttempted() && !followUpForm().summary.trim()) {
                                <span class="text-xs text-red-600 dark:text-red-300">请填写跟进摘要。</span>
                            }
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="followUpDetail" class="text-sm font-medium text-surface-900 dark:text-surface-0">详情</label>
                            <textarea
                                pTextarea
                                id="followUpDetail"
                                rows="4"
                                [ngModel]="followUpForm().detail"
                                (ngModelChange)="updateFollowUpText('detail', $event)"
                                placeholder="记录客户反馈、风险、承诺事项和下一步动作"
                                class="w-full rounded-md!"
                            ></textarea>
                        </div>

                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="followUpOutcome" class="text-sm font-medium text-surface-900 dark:text-surface-0">结果</label>
                                <p-select
                                    inputId="followUpOutcome"
                                    [ngModel]="followUpForm().outcome"
                                    (ngModelChange)="updateFollowUpOutcome($event)"
                                    [options]="followUpOutcomeOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    styleClass="w-full rounded-md!"
                                />
                            </div>

                            <div class="flex flex-col gap-2">
                                <label for="nextFollowUpAt" class="text-sm font-medium text-surface-900 dark:text-surface-0">下次跟进</label>
                                <p-datepicker
                                    inputId="nextFollowUpAt"
                                    [ngModel]="followUpForm().nextFollowUpAt"
                                    (ngModelChange)="updateFollowUpDate('nextFollowUpAt', $event)"
                                    [showButtonBar]="true"
                                    [showTime]="true"
                                    hourFormat="24"
                                    appendTo="body"
                                    dateFormat="yy-mm-dd"
                                    placeholder="可留空"
                                    styleClass="w-full"
                                    inputStyleClass="w-full rounded-md!"
                                />
                            </div>
                        </div>
                    </div>
                }

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="followUpDialogVisible = false" />
                        <p-button label="保存跟进" [loading]="followUpSaving()" [disabled]="!isFollowUpFormValid()" styleClass="rounded-md!" (onClick)="createFollowUp()" />
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
                        @if (leadGateMissingItems(lead).length) {
                            <app-workspace-feedback severity="warn" summary="确认有效前请补齐" [detail]="leadGateMissingItems(lead).join('、')" />
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
    readonly #salesFollowUpStore = inject(SalesFollowUpStore);
    readonly #router = inject(Router);

    readonly leads = this.#leadStore.leads;
    readonly leadSources = this.#leadStore.leadSources;
    readonly selectedLead = this.#leadStore.selectedLead;
    readonly loading = this.#leadStore.loading;
    readonly loadingSources = this.#leadStore.loadingSources;
    readonly loadingDetail = this.#leadStore.loadingDetail;
    readonly saving = this.#leadStore.saving;
    readonly customerLoading = this.#customerStore.loading;
    readonly followUps = this.#salesFollowUpStore.followUps;
    readonly followUpLoading = this.#salesFollowUpStore.loading;
    readonly followUpSaving = this.#salesFollowUpStore.saving;

    readonly searchValue = signal('');
    readonly statusFilter = signal(ALL_FILTER_VALUE);
    readonly createForm = signal<CreateLeadForm>(EMPTY_CREATE_FORM);
    readonly sourceForm = signal<LeadSourceForm>(EMPTY_SOURCE_FORM);
    readonly convertForm = signal<ConvertProjectForm>(EMPTY_CONVERT_FORM);
    readonly followUpForm = signal<SalesFollowUpForm>({ ...EMPTY_FOLLOW_UP_FORM });
    readonly createAttempted = signal(false);
    readonly sourceAttempted = signal(false);
    readonly followUpAttempted = signal(false);
    readonly actionAttempted = signal(false);
    readonly createError = signal<string | null>(null);
    readonly sourceError = signal<string | null>(null);
    readonly followUpError = signal<string | null>(null);
    readonly qualificationError = signal<string | null>(null);
    readonly convertError = signal<string | null>(null);
    readonly pageError = signal<string | null>(null);
    readonly qualificationSummary = signal('');
    readonly closedReason = signal('');
    readonly actionTarget = signal<LeadActionTarget | null>(null);

    readonly rows = 10;
    first = 0;
    createDialogVisible = false;
    sourceDialogVisible = false;
    detailDialogVisible = false;
    followUpDialogVisible = false;
    qualifyDialogVisible = false;
    convertDialogVisible = false;
    closeDialogVisible = false;

    readonly statusOptions: LeadFilterOption[] = [{ label: '全部状态', value: ALL_FILTER_VALUE }, ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ label, value }))];

    readonly statusColumnFilterOptions: LeadColumnFilterOption[] = [{ label: '任意状态', value: null }, ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ label, value }))];

    readonly budgetStatusOptions: LeadFilterOption[] = Object.entries(LEAD_BUDGET_STATUS_LABELS).map(([value, label]) => ({ label, value }));

    readonly urgencyOptions: LeadFilterOption[] = Object.entries(LEAD_URGENCY_LABELS).map(([value, label]) => ({ label, value }));

    readonly followUpTypeOptions: LeadFilterOption[] = Object.entries(SALES_FOLLOW_UP_TYPE_LABELS).map(([value, label]) => ({ label, value }));

    readonly followUpOutcomeOptions: LeadFilterOption[] = Object.entries(SALES_FOLLOW_UP_OUTCOME_LABELS).map(([value, label]) => ({ label, value }));

    readonly leadAttachmentTargetType = AttachmentTargetType.Lead;

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
    readonly canManageLeadSources = computed(() => this.#authStore.hasAnyPermission(['lead:source:manage'] as const));

    readonly leadSourceOptions = computed<LeadFilterOption[]>(() =>
        this.leadSources()
            .filter((source) => source.status === 'active')
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

    readonly totalLeadCount = computed(() => this.leads().length);
    readonly leadDistributionItems = computed<LeadDistributionItem[]>(() => {
        const total = this.totalLeadCount();

        return [
            this.buildLeadDistributionItem('待确认', this.#leadStore.registeredLeadCount(), '需要判断', 'bg-orange-500', 'rgba(249,115,22,0.16)', total),
            this.buildLeadDistributionItem('已有效', this.#leadStore.qualifiedLeadCount(), '可转项目', 'bg-green-500', 'rgba(34,197,94,0.16)', total),
            this.buildLeadDistributionItem('已转项目', this.#leadStore.convertedLeadCount(), '已有来源链', 'bg-primary-500', 'rgba(59,130,246,0.16)', total),
            this.buildLeadDistributionItem('已关闭', this.#leadStore.closedLeadCount(), '不再推进', 'bg-rose-500', 'rgba(244,63,94,0.16)', total)
        ];
    });

    readonly isCreateFormValid = computed(() => {
        const form = this.createForm();
        return Boolean(form.leadName.trim() && form.customerId && form.sourceId && form.demandDescription.trim() && form.budgetStatus && form.urgency && form.ownerUserId);
    });

    readonly isFollowUpFormValid = computed(() => {
        const form = this.followUpForm();
        return Boolean(form.followUpType && form.occurredAt && form.summary.trim() && form.outcome);
    });

    ngOnInit() {
        void this.ensureAuthReady();
        void this.loadCustomers();
        void this.loadOwnerReferenceData();
        void this.loadLeadSources();
        void this.loadLeads();
    }

    async loadLeads() {
        this.pageError.set(null);
        try {
            await this.#leadStore.loadLeads();
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

        const nextStatus = (source.status === 'active' ? 'inactive' : 'active') as LeadSourceStatus;

        try {
            await this.#leadStore.updateLeadSource(source.id, { status: nextStatus });
            if (this.createForm().sourceId === source.id && nextStatus === 'inactive') {
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

    updateCreateSource(value: string | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            sourceId: value ?? null
        }));
        this.createError.set(null);
    }

    updateCreateBudgetStatus(value: string | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            budgetStatus: (value ?? DEFAULT_BUDGET_STATUS) as LeadBudgetStatus
        }));
        this.createError.set(null);
    }

    updateCreateUrgency(value: string | null | undefined) {
        this.createForm.update((form) => ({
            ...form,
            urgency: (value ?? DEFAULT_URGENCY) as LeadUrgency
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
        const ownerUserId = form.ownerUserId;
        const customerId = form.customerId;
        const sourceId = form.sourceId;

        if (!ownerUserId || !customerId || !sourceId) {
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
                ownerUserId,
                ownerOrgId: form.ownerOrgId ?? null
            });
            this.closeCreateDialog();
        } catch {
            this.createError.set('请检查线索信息是否完整，或稍后重试。');
        }
    }

    async openLeadDetail(lead: LeadListView) {
        this.detailDialogVisible = true;
        this.pageError.set(null);
        this.followUpError.set(null);
        this.#salesFollowUpStore.clearFollowUps();

        try {
            const detail = await this.#leadStore.loadLead(lead.id);
            await this.loadFollowUpsForLead(detail);
        } catch {
            this.pageError.set('线索详情没有读取成功，请稍后重试。');
        }
    }

    clearDetail() {
        this.#leadStore.clearSelectedLead();
        this.#salesFollowUpStore.clearFollowUps();
        this.followUpDialogVisible = false;
        this.resetFollowUpDialog();
    }

    showFollowUpDialog(lead: LeadActionTarget) {
        if (!this.canWriteLead()) {
            return;
        }

        this.actionTarget.set(lead);
        this.followUpForm.set(this.defaultFollowUpForm());
        this.followUpAttempted.set(false);
        this.followUpError.set(null);
        this.followUpDialogVisible = true;
    }

    resetFollowUpDialog() {
        this.followUpAttempted.set(false);
        this.followUpError.set(null);
    }

    updateFollowUpType(value: string | null | undefined) {
        this.followUpForm.update((form) => ({
            ...form,
            followUpType: (value ?? DEFAULT_FOLLOW_UP_TYPE) as SalesFollowUpType
        }));
        this.followUpError.set(null);
    }

    updateFollowUpOutcome(value: string | null | undefined) {
        this.followUpForm.update((form) => ({
            ...form,
            outcome: (value ?? DEFAULT_FOLLOW_UP_OUTCOME) as SalesFollowUpOutcome
        }));
        this.followUpError.set(null);
    }

    updateFollowUpText(field: 'summary' | 'detail', value: string) {
        this.followUpForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.followUpError.set(null);
    }

    updateFollowUpDate(field: 'occurredAt' | 'nextFollowUpAt', value: Date | null) {
        this.followUpForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.followUpError.set(null);
    }

    async createFollowUp() {
        this.followUpAttempted.set(true);
        const lead = this.selectedLead();
        const form = this.followUpForm();

        if (!lead || !this.canWriteLead() || !this.isFollowUpFormValid() || !form.occurredAt) {
            return;
        }

        const projectId = lead.convertedProjectId ?? null;

        try {
            await this.#salesFollowUpStore.createFollowUp({
                customerId: lead.customerId,
                leadId: projectId ? null : lead.id,
                projectId,
                followUpType: form.followUpType,
                occurredAt: form.occurredAt.toISOString(),
                summary: form.summary.trim(),
                detail: this.optionalText(form.detail),
                outcome: form.outcome,
                nextFollowUpAt: form.nextFollowUpAt ? form.nextFollowUpAt.toISOString() : null
            });
            await this.loadFollowUpsForLead(lead);
            this.followUpDialogVisible = false;
        } catch {
            this.followUpError.set('请确认线索、客户或项目仍然有效，或稍后重试。');
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

    canQualifyLead(lead: LeadActionTarget): boolean {
        return this.canWriteLead() && lead.status === LEAD_STATUS.registered && this.hasLeadGateFacts(lead);
    }

    canCloseLead(lead: Pick<LeadActionTarget, 'status'>): boolean {
        return this.canWriteLead() && (lead.status === LEAD_STATUS.registered || lead.status === LEAD_STATUS.qualified);
    }

    canConvertLead(lead: LeadActionTarget): boolean {
        return this.canWriteLead() && lead.status === LEAD_STATUS.qualified && !lead.convertedProjectId && this.hasLeadGateFacts(lead);
    }

    getStatusName(status: string): string {
        return leadStatusLabelOrFallback(status);
    }

    getStatusSeverity(status: string) {
        return leadStatusSeverityOrFallback(status);
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    getLeadSourceName(lead: Pick<LeadActionTarget, 'sourceName' | 'sourceChannel'>): string {
        return this.displayText(lead.sourceName ?? lead.sourceChannel, '未填写');
    }

    getBudgetStatusName(status: LeadBudgetStatus | string | null | undefined): string {
        return status ? (LEAD_BUDGET_STATUS_LABELS[status as LeadBudgetStatus] ?? status) : '未填写';
    }

    getUrgencyName(urgency: LeadUrgency | string | null | undefined): string {
        return urgency ? (LEAD_URGENCY_LABELS[urgency as LeadUrgency] ?? urgency) : '未填写';
    }

    getSourceStatusName(status: LeadSourceStatus): string {
        return LEAD_SOURCE_STATUS_LABELS[status] ?? status;
    }

    getSourceStatusSeverity(status: LeadSourceStatus) {
        return status === 'active' ? 'success' : 'secondary';
    }

    getFollowUpTypeName(type: SalesFollowUpType | string): string {
        return SALES_FOLLOW_UP_TYPE_LABELS[type as SalesFollowUpType] ?? type;
    }

    getFollowUpOutcomeName(outcome: SalesFollowUpOutcome | string): string {
        return SALES_FOLLOW_UP_OUTCOME_LABELS[outcome as SalesFollowUpOutcome] ?? outcome;
    }

    followUpContextLabel(record: Pick<SalesFollowUpRecordSummary, 'leadId' | 'projectId'>): string {
        if (record.projectId) {
            return '项目跟进';
        }

        if (record.leadId) {
            return '线索跟进';
        }

        return '客户跟进';
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

    leadGateMissingItems(lead: LeadActionTarget): string[] {
        const missing: string[] = [];

        if (!lead.sourceId) {
            missing.push('来源');
        }
        if (!lead.demandDescription?.trim()) {
            missing.push('需求描述');
        }
        if (!lead.budgetStatus || lead.budgetStatus === 'unknown' || lead.budgetStatus === 'no-budget') {
            missing.push('预算确认');
        }
        if (!this.hasPositiveAmount(lead.estimatedAmount)) {
            missing.push('预计金额');
        }
        if (!lead.urgency) {
            missing.push('紧迫程度');
        }
        if (!lead.ownerName?.trim()) {
            missing.push('销售主责');
        }
        if (!lead.ownerOrgName?.trim()) {
            missing.push('主责组织');
        }

        return missing;
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

    private defaultFollowUpForm(): SalesFollowUpForm {
        return {
            ...EMPTY_FOLLOW_UP_FORM,
            occurredAt: new Date()
        };
    }

    private async loadFollowUpsForLead(lead: LeadDetailView): Promise<void> {
        try {
            await this.#salesFollowUpStore.loadFollowUps({
                customerId: lead.customerId,
                leadId: lead.id,
                projectId: lead.convertedProjectId ?? undefined
            });
        } catch {
            this.followUpError.set('销售跟进记录没有读取成功，请稍后重试。');
        }
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
        return this.normalize([lead.leadNo, lead.leadName, lead.customerName, lead.sourceName, lead.sourceChannel, this.getBudgetStatusName(lead.budgetStatus), this.getUrgencyName(lead.urgency), lead.ownerName, lead.ownerOrgName, this.getStatusName(lead.status)].join(' '));
    }

    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }

    private optionalText(value: string): string | null {
        const normalized = value.trim();
        return normalized ? normalized : null;
    }

    private hasLeadGateFacts(lead: LeadActionTarget): boolean {
        return this.leadGateMissingItems(lead).length === 0;
    }

    private hasPositiveAmount(value: string | null | undefined): boolean {
        return value !== null && value !== undefined && Number(value) > 0;
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

    private async ensureAuthReady(): Promise<void> {
        if (this.#authStore.isAuthenticated() && !this.#authStore.currentUser()) {
            await this.#authStore.initialize();
        }
    }
}
