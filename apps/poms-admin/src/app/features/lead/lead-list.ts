import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore, LeadStore, type LeadDetailView, type LeadListView, type LeadStatus } from '@poms/admin-data-access';
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

interface CreateLeadForm {
    leadName: string;
    customerName: string;
    sourceChannel: string;
}

interface ConvertProjectForm {
    customerProjectNo: string;
    projectName: string;
    plannedSignAt: Date | null;
}

type LeadActionTarget = LeadListView | LeadDetailView;
type UiTagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined;

const ALL_FILTER_VALUE = 'all';

const LEAD_STATUS = {
    registered: 'registered' as LeadStatus,
    qualified: 'qualified' as LeadStatus,
    converted: 'converted' as LeadStatus,
    closed: 'closed' as LeadStatus
};

const EMPTY_CREATE_FORM: CreateLeadForm = {
    leadName: '',
    customerName: '',
    sourceChannel: ''
};

const EMPTY_CONVERT_FORM: ConvertProjectForm = {
    customerProjectNo: '',
    projectName: '',
    plannedSignAt: null
};

const LEAD_STATUS_LABELS: Record<string, string> = {
    registered: '待确认',
    qualified: '已有效',
    converted: '已转项目',
    closed: '已关闭'
};

const LEAD_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    registered: 'secondary',
    qualified: 'success',
    converted: 'info',
    closed: 'contrast'
};

@Component({
    selector: 'app-lead-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, DatePickerModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, TagModule, DialogModule, TextareaModule, WorkspaceFeedback],
    providers: [LeadStore],
    template: `
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">签约前入口</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">线索管理</h1>
                        <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">
                            先登记客户机会，确认有效后再进入正式项目推进。
                        </p>
                    </div>

                    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <p-button label="返回项目管理" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" styleClass="w-full sm:w-auto rounded-md!" (onClick)="goToProjects()" />

                        @if (canWriteLead()) {
                            <p-button label="登记线索" icon="pi pi-plus" severity="primary" styleClass="w-full sm:w-auto rounded-md!" (onClick)="showCreateDialog()" />
                        } @else {
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
                                当前账号只能查看线索。
                            </div>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    @for (item of summaryItems(); track item.label) {
                        <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                            <div class="text-sm text-surface-500 dark:text-surface-400">{{ item.label }}</div>
                            <div class="mt-2 flex items-end justify-between gap-3">
                                <span class="text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ item.value }}</span>
                                <span class="text-xs leading-5 text-surface-500 dark:text-surface-400">{{ item.hint }}</span>
                            </div>
                        </div>
                    }
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
                        [globalFilterFields]="['leadNo', 'leadName', 'customerName', 'sourceChannel', 'status', 'ownerName', 'ownerOrgName']"
                        [tableStyle]="{ width: '100%', 'min-width': '74rem' }"
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
                                        <input
                                            pInputText
                                            [ngModel]="searchValue()"
                                            (ngModelChange)="searchValue.set($event)"
                                            (input)="onGlobalFilter(dt, $event)"
                                            placeholder="搜索线索、客户、负责人"
                                            class="w-full! rounded-md! py-2!"
                                        />
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
                                <th pSortableColumn="sourceChannel" class="min-w-36">
                                    <span class="flex items-center gap-2">来源 <p-sortIcon field="sourceChannel" /></span>
                                </th>
                                <th pSortableColumn="ownerName" class="min-w-52">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">负责人 <p-sortIcon field="ownerName" /></span>
                                        <p-columnFilter type="text" field="ownerName" display="menu" placeholder="按负责人筛选" />
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
                                <td>{{ displayText(lead.sourceChannel, '未填写') }}</td>
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
                                <td colspan="7" class="py-8 text-center text-surface-400">{{ loading() ? '线索读取中...' : '暂无匹配线索' }}</td>
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
                        <label for="leadCustomerName" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户名称</label>
                        <input pInputText id="leadCustomerName" [ngModel]="createForm().customerName" (ngModelChange)="updateCreateField('customerName', $event)" placeholder="填写客户公司或单位名称" class="w-full rounded-md!" />
                        @if (createAttempted() && !createForm().customerName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写客户名称。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="sourceChannel" class="text-sm font-medium text-surface-900 dark:text-surface-0">来源渠道</label>
                        <input pInputText id="sourceChannel" [ngModel]="createForm().sourceChannel" (ngModelChange)="updateCreateField('sourceChannel', $event)" placeholder="例如：客户拜访、老客户转介绍" class="w-full rounded-md!" />
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeCreateDialog()" />
                        <p-button label="登记线索" [loading]="saving()" [disabled]="!isCreateFormValid()" styleClass="rounded-md!" (onClick)="createLead()" />
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
                                <dd class="mt-1 text-sm text-surface-900 dark:text-surface-0">{{ displayText(lead.sourceChannel, '未填写') }}</dd>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                                <dt class="text-xs text-surface-500 dark:text-surface-400">负责人</dt>
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

                        @if (lead.qualificationSummary) {
                            <app-workspace-feedback severity="success" summary="有效性说明" [detail]="lead.qualificationSummary" />
                        }

                        @if (lead.closedReason) {
                            <app-workspace-feedback severity="secondary" summary="关闭原因" [detail]="lead.closedReason" />
                        }

                        @if (lead.convertedProjectSummary) {
                            <div class="flex flex-col gap-3 rounded-[8px] border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                                <app-workspace-feedback
                                    severity="info"
                                    summary="已转入项目"
                                    [detail]="lead.convertedProjectSummary.projectName + '（' + lead.convertedProjectSummary.projectNo + '）'"
                                />
                                <div>
                                    <p-button label="查看项目" icon="pi pi-external-link" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="goToProject(lead.convertedProjectSummary.id)" />
                                </div>
                            </div>
                        }
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

            <p-dialog [(visible)]="qualifyDialogVisible" [modal]="true" header="确认线索有效" [style]="{ width: '32rem' }" (onHide)="resetQualifyDialog()">
                <div class="flex flex-col gap-3 py-2">
                    <p class="m-0 text-sm text-surface-600 dark:text-surface-300">说明为什么这条线索可以进入正式项目推进。</p>
                    <textarea pTextarea rows="5" [ngModel]="qualificationSummary()" (ngModelChange)="qualificationSummary.set($event)" class="w-full rounded-md!" placeholder="例如：客户预算明确，已确认采购意向。" ></textarea>
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
                        <app-workspace-feedback
                            severity="info"
                            summary="将有效线索转为正式项目"
                            [detail]="lead.customerName + ' · ' + lead.leadName"
                        />
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
                        <input
                            pInputText
                            id="convertProjectName"
                            [ngModel]="convertForm().projectName"
                            (ngModelChange)="updateConvertField('projectName', $event)"
                            placeholder="默认使用线索标题"
                            class="w-full rounded-md!"
                        />
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
                    <textarea pTextarea rows="5" [ngModel]="closedReason()" (ngModelChange)="closedReason.set($event)" class="w-full rounded-md!" placeholder="例如：客户预算取消，暂不推进。" ></textarea>
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
    readonly #leadStore = inject(LeadStore);
    readonly #router = inject(Router);

    readonly leads = this.#leadStore.leads;
    readonly selectedLead = this.#leadStore.selectedLead;
    readonly loading = this.#leadStore.loading;
    readonly loadingDetail = this.#leadStore.loadingDetail;
    readonly saving = this.#leadStore.saving;

    readonly searchValue = signal('');
    readonly statusFilter = signal(ALL_FILTER_VALUE);
    readonly createForm = signal<CreateLeadForm>(EMPTY_CREATE_FORM);
    readonly convertForm = signal<ConvertProjectForm>(EMPTY_CONVERT_FORM);
    readonly createAttempted = signal(false);
    readonly actionAttempted = signal(false);
    readonly createError = signal<string | null>(null);
    readonly convertError = signal<string | null>(null);
    readonly pageError = signal<string | null>(null);
    readonly qualificationSummary = signal('');
    readonly closedReason = signal('');
    readonly actionTarget = signal<LeadActionTarget | null>(null);

    readonly rows = 10;
    first = 0;
    createDialogVisible = false;
    detailDialogVisible = false;
    qualifyDialogVisible = false;
    convertDialogVisible = false;
    closeDialogVisible = false;

    readonly statusOptions: LeadFilterOption[] = [
        { label: '全部状态', value: ALL_FILTER_VALUE },
        ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ label, value }))
    ];

    readonly statusColumnFilterOptions: LeadColumnFilterOption[] = [
        { label: '任意状态', value: null },
        ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ label, value }))
    ];

    readonly canWriteLead = computed(() => this.#authStore.hasAnyPermission(['lead:write'] as const));

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

    readonly summaryItems = computed<LeadSummaryItem[]>(() => [
        { label: '全部线索', value: this.leads().length, hint: '销售机会' },
        { label: '待确认', value: this.#leadStore.registeredLeadCount(), hint: '需要判断' },
        { label: '已有效', value: this.#leadStore.qualifiedLeadCount(), hint: '可转项目' },
        { label: '已转项目', value: this.#leadStore.convertedLeadCount(), hint: '已有来源链' },
        { label: '已关闭', value: this.#leadStore.closedLeadCount(), hint: '不再推进' }
    ]);

    readonly isCreateFormValid = computed(() => {
        const form = this.createForm();
        return Boolean(form.leadName.trim() && form.customerName.trim());
    });

    ngOnInit() {
        void this.ensureAuthReady();
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

    goToProjects() {
        this.#router.navigate(['/projects']);
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

        this.createForm.set({ ...EMPTY_CREATE_FORM });
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

    updateCreateField(field: keyof CreateLeadForm, value: string) {
        this.createForm.update((form) => ({
            ...form,
            [field]: value
        }));
        this.createError.set(null);
    }

    async createLead() {
        this.createAttempted.set(true);

        if (!this.canWriteLead() || !this.isCreateFormValid()) {
            return;
        }

        const form = this.createForm();

        try {
            await this.#leadStore.createLead({
                leadName: form.leadName.trim(),
                customerName: form.customerName.trim(),
                sourceChannel: this.optionalText(form.sourceChannel)
            });
            this.closeCreateDialog();
        } catch {
            this.createError.set('请检查线索信息是否完整，或稍后重试。');
        }
    }

    async openLeadDetail(lead: LeadListView) {
        this.detailDialogVisible = true;
        this.pageError.set(null);

        try {
            await this.#leadStore.loadLead(lead.id);
        } catch {
            this.pageError.set('线索详情没有读取成功，请稍后重试。');
        }
    }

    clearDetail() {
        this.#leadStore.clearSelectedLead();
    }

    showQualifyDialog(lead: LeadActionTarget) {
        if (!this.canQualifyLead(lead)) {
            return;
        }
        this.actionTarget.set(lead);
        this.qualificationSummary.set('');
        this.actionAttempted.set(false);
        this.qualifyDialogVisible = true;
    }

    resetQualifyDialog() {
        this.actionAttempted.set(false);
        this.qualificationSummary.set('');
    }

    async qualifyLead() {
        this.actionAttempted.set(true);
        const target = this.actionTarget();
        const summary = this.qualificationSummary().trim();

        if (!target || !summary || !this.canQualifyLead(target)) {
            return;
        }

        await this.#leadStore.qualifyLead(target.id, { qualificationSummary: summary });
        this.qualifyDialogVisible = false;
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

    canQualifyLead(lead: Pick<LeadActionTarget, 'status'>): boolean {
        return this.canWriteLead() && lead.status === LEAD_STATUS.registered;
    }

    canCloseLead(lead: Pick<LeadActionTarget, 'status'>): boolean {
        return this.canWriteLead() && (lead.status === LEAD_STATUS.registered || lead.status === LEAD_STATUS.qualified);
    }

    canConvertLead(lead: Pick<LeadActionTarget, 'status' | 'convertedProjectId'>): boolean {
        return this.canWriteLead() && lead.status === LEAD_STATUS.qualified && !lead.convertedProjectId;
    }

    getStatusName(status: string): string {
        return LEAD_STATUS_LABELS[status] ?? status;
    }

    getStatusSeverity(status: string): UiTagSeverity {
        return LEAD_STATUS_SEVERITIES[status];
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    private leadSearchText(lead: LeadListView): string {
        return this.normalize(
            [
                lead.leadNo,
                lead.leadName,
                lead.customerName,
                lead.sourceChannel,
                lead.ownerName,
                lead.ownerOrgName,
                this.getStatusName(lead.status)
            ].join(' ')
        );
    }

    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }

    private optionalText(value: string): string | null {
        const normalized = value.trim();
        return normalized ? normalized : null;
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
