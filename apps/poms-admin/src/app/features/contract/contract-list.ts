import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { Router } from '@angular/router';
import { AuthStore, ContractStatus, ContractStore, ProjectStage, ProjectStatus, ProjectStore, type ContractSummary, type ProjectListView } from '@poms/admin-data-access';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BUSINESS_FINANCE_PERMISSION_KEYS, formatSensitiveAmountProjection } from '../../shared/ui/sensitive-visibility';
import { contractStatusLabelOrFallback, contractStatusSeverityOrFallback, projectStageLabelOrFallback, projectStageSeverityOrFallback, projectStatusLabelOrFallback, projectStatusSeverityOrFallback } from '../../shared/ui/status-presentation';

const CONTRACT_STATUS_FILTER_VALUES = [ContractStatus.Draft, ContractStatus.PendingReview, ContractStatus.Active, ContractStatus.Terminated, ContractStatus.Completed] as const;
const CONTRACT_STATUS_FILTER_OPTIONS = CONTRACT_STATUS_FILTER_VALUES.map((value) => ({
    label: contractStatusLabelOrFallback(value),
    value
}));

@Component({
    selector: 'app-contract-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, DialogModule, SelectModule, MessageModule, AutoCompleteModule],
    providers: [ContractStore, ProjectStore],
    template: `
        <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 class="text-surface-950 dark:text-surface-0 text-lg font-medium leading-7">合同管理</h1>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    @if (canManageContractFinance()) {
                        <p-button icon="pi pi-plus" label="新建合同" severity="primary" [rounded]="true" class="w-full sm:w-auto cursor-pointer" (onClick)="showCreateDialog()" />
                    }
                </div>
            </div>

            <!-- Table -->
            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="contracts()"
                    [loading]="loading()"
                    [paginator]="true"
                    [rows]="rows"
                    [first]="first"
                    [rowHover]="true"
                    [showGridlines]="true"
                    dataKey="id"
                    sortMode="multiple"
                    responsiveLayout="scroll"
                    [tableStyle]="{ width: '100%' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last} 共 {totalRecords} 条"
                    [globalFilterFields]="['contractNo', 'customerContractNo', 'projectName', 'customerName', 'status', 'currencyCode']"
                    class="bg-surface-0 dark:bg-surface-800 overflow-hidden"
                    [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #caption>
                        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (click)="clearFilters(dt)"></button>
                                <p-iconfield class="w-full sm:w-80">
                                    <p-inputicon class="pi pi-search" />
                                    <input pInputText [(ngModel)]="searchValue" (input)="onGlobalFilter(dt, $event)" placeholder="搜索合同、项目、客户" class="w-full! rounded-md! py-2!" />
                                </p-iconfield>
                            </div>
                            <div class="text-sm text-surface-500 dark:text-surface-400">当前共 {{ contracts().length }} 份合同</div>
                        </div>
                    </ng-template>
                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="contractNo" class="w-[30%] min-w-72">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="flex items-center gap-2">合同/项目 <p-sortIcon field="contractNo" /></span>
                                    <p-columnFilter type="text" field="contractNo" display="menu" placeholder="按 POMS 编号筛选" />
                                </div>
                            </th>
                            <th pSortableColumn="customerName" class="w-[20%] min-w-48">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="flex items-center gap-2">客户 <p-sortIcon field="customerName" /></span>
                                    <p-columnFilter type="text" field="customerName" display="menu" placeholder="按客户筛选" />
                                </div>
                            </th>
                            <th pSortableColumn="signedAmount" class="w-[22%] min-w-56">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="flex items-center gap-2">金额/状态 <p-sortIcon field="signedAmount" /></span>
                                    <p-columnFilter field="status" matchMode="equals" display="menu" [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                                        <ng-template #filter let-value let-filter="filterCallback">
                                            <p-select [ngModel]="value" [options]="statusColumnFilterOptions" optionLabel="label" optionValue="value" placeholder="任意状态" appendTo="body" (onChange)="filter($event.value)" class="w-44" />
                                        </ng-template>
                                    </p-columnFilter>
                                </div>
                            </th>
                            <th pSortableColumn="signedAt" class="w-[16%] min-w-44">
                                <span class="flex items-center gap-2">签约信息 <p-sortIcon field="signedAt" /></span>
                            </th>
                            <th class="w-40 min-w-40">继续处理</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-contract>
                        <tr>
                            <td>
                                <button type="button" class="text-left text-sm font-semibold leading-5 text-primary hover:underline" (click)="navigateToDetail(contract)">{{ contract.contractNo }}</button>
                                <div class="mt-2 flex flex-col gap-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                    <span>客户合同：{{ displayText(contract.customerContractNo, '未填写') }}</span>
                                    <span class="text-surface-700 dark:text-surface-200">{{ contract.projectName }}</span>
                                </div>
                            </td>
                            <td>
                                <span class="text-sm leading-5 text-surface-800 dark:text-surface-100">{{ displayText(contract.customerName, '未绑定客户') }}</span>
                            </td>
                            <td>
                                <div class="flex flex-col gap-2 text-sm leading-5">
                                    <span class="font-medium text-surface-950 dark:text-surface-0">{{ formatSensitiveAmountProjection(contract.signedAmountProjection, contract.currencyCode) }}</span>
                                    <p-tag [value]="getStatusName(contract.status)" [severity]="getStatusSeverity(contract.status)" class="w-fit rounded-[6px] px-2 py-1" />
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-col gap-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                    <span>签约：{{ contract.signedAt ? (contract.signedAt | date: 'yyyy-MM-dd') : '未登记' }}</span>
                                    <span>更新：{{ contract.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-wrap justify-start gap-2">
                                    <p-button label="详情" icon="pi pi-eye" size="small" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="navigateToDetail(contract)" />
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="5" class="text-center py-8">
                                <i class="pi pi-inbox text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                                <span class="text-surface-500 dark:text-surface-400">暂无匹配合同</span>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #loadingbody>
                        <tr>
                            <td colspan="5" class="py-8 text-center text-surface-500 dark:text-surface-400">正在读取合同列表</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <!-- Create Contract Dialog -->
            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建合同" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label for="contractProjectSelector" class="text-surface-900 dark:text-surface-0 font-medium">关联项目 <span class="text-red-500">*</span></label>
                        <p-autocomplete
                            inputId="contractProjectSelector"
                            [(ngModel)]="selectedProject"
                            [suggestions]="projectSuggestions"
                            optionLabel="projectName"
                            [dropdown]="true"
                            [forceSelection]="true"
                            [showClear]="true"
                            [completeOnFocus]="true"
                            emptyMessage="没有匹配项目"
                            placeholder="搜索项目编号、项目名称或客户"
                            styleClass="w-full"
                            inputStyleClass="w-full"
                            appendTo="body"
                            (completeMethod)="filterProjects($event)"
                            (onSelect)="selectProject($event.value)"
                            (onClear)="selectProject(null)"
                        >
                            <ng-template #selecteditem let-project>
                                <span>{{ project.projectNo }} · {{ project.projectName }}</span>
                            </ng-template>
                            <ng-template #item let-project>
                                <div class="flex flex-col gap-1 py-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-surface-950 dark:text-surface-0">{{ project.projectNo }}</span>
                                        <span class="text-sm text-surface-700 dark:text-surface-200">{{ project.projectName }}</span>
                                    </div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400">{{ project.customerName || '待补充客户' }} · {{ getProjectStageName(project.currentStage) }} · {{ getProjectStatusName(project.status) }}</div>
                                </div>
                            </ng-template>
                        </p-autocomplete>
                        @if (createSubmitAttempted && !selectedProject) {
                            <span class="text-red-500 text-xs">请选择关联项目</span>
                        }
                    </div>

                    @if (selectedProject; as project) {
                        <div class="rounded-[8px] border border-surface-200 bg-surface-50 px-3 py-3 dark:border-surface-700 dark:bg-surface-800">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400">已选择项目</div>
                                    <div class="mt-1 text-sm font-semibold text-surface-950 dark:text-surface-0">{{ project.projectNo }} · {{ project.projectName }}</div>
                                    <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ project.customerName || '待补充客户' }}</div>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <p-tag [value]="getProjectStageName(project.currentStage)" [severity]="getProjectStageSeverity(project.currentStage)" class="rounded-[6px]!" />
                                    <p-tag [value]="getProjectStatusName(project.status)" [severity]="getProjectStatusSeverity(project.status)" class="rounded-[6px]!" />
                                </div>
                            </div>
                            @if (project.customerProjectNo) {
                                <div class="mt-2 text-xs text-surface-500 dark:text-surface-400">客户项目编号：{{ project.customerProjectNo }}</div>
                            }
                        </div>
                    } @else if (!loadingProjects() && projects().length === 0) {
                        <p-message severity="warn" text="当前没有可选择的项目，请先完成项目创建或刷新后重试。" styleClass="w-full" />
                    }

                    <p-message severity="info" text="POMS 合同编号将在创建成功后由系统生成。" styleClass="w-full" />

                    <div class="flex flex-col gap-2">
                        <label for="customerContractNo" class="text-surface-900 dark:text-surface-0 font-medium">客户合同编号</label>
                        <input pInputText id="customerContractNo" [(ngModel)]="createForm.customerContractNo" class="w-full" placeholder="客户或甲方法务系统编号，可为空" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="signedAmount" class="text-surface-900 dark:text-surface-0 font-medium">签约金额 <span class="text-red-500">*</span></label>
                        <input pInputText id="signedAmount" [(ngModel)]="createForm.signedAmount" class="w-full" [class.border-red-500]="createSubmitAttempted && !isValidAmount(createForm.signedAmount)" placeholder="正数，最多两位小数" />
                        @if (createSubmitAttempted && !isValidAmount(createForm.signedAmount)) {
                            <span class="text-red-500 text-xs">请输入大于 0 的有效金额，最多两位小数</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="currencyCode" class="text-surface-900 dark:text-surface-0 font-medium">币种</label>
                        <p-select id="currencyCode" [(ngModel)]="createForm.currencyCode" [options]="currencyOptions" optionLabel="label" optionValue="value" placeholder="选择币种" class="w-full" appendTo="body" />
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="cancelCreate()" />
                        <p-button label="创建" (onClick)="createContract()" [loading]="creating()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class ContractList implements OnInit {
    @ViewChild('dt') dt!: Table;

    readonly #contractStore = inject(ContractStore);
    readonly #projectStore = inject(ProjectStore);
    readonly #router = inject(Router);
    readonly #authStore = inject(AuthStore);

    readonly contracts = this.#contractStore.contracts;
    readonly projects = this.#projectStore.projects;
    readonly loading = this.#contractStore.loading;
    readonly loadingProjects = this.#projectStore.loading;
    readonly creating = this.#contractStore.saving;

    searchValue = '';
    first = 0;
    rows = 10;
    readonly statusColumnFilterOptions = CONTRACT_STATUS_FILTER_OPTIONS;
    readonly formatSensitiveAmountProjection = formatSensitiveAmountProjection;
    readonly canViewFinancialSensitiveFields = computed(() => this.#authStore.hasAnyPermission(BUSINESS_FINANCE_PERMISSION_KEYS));
    readonly canManageContractFinance = this.canViewFinancialSensitiveFields;

    createDialogVisible = false;
    createSubmitAttempted = false;
    createForm = { projectId: '', customerContractNo: '', signedAmount: '', currencyCode: 'CNY' };
    selectedProject: ProjectListView | null = null;
    projectSuggestions: ProjectListView[] = [];

    currencyOptions = [
        { label: '人民币 (CNY)', value: 'CNY' },
        { label: '美元 (USD)', value: 'USD' },
        { label: '欧元 (EUR)', value: 'EUR' }
    ];

    ngOnInit() {
        void Promise.all([this.#contractStore.loadContracts(), this.#projectStore.loadProjects()]);
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
        this.first = 0;
    }

    clearFilters(table: Table) {
        this.searchValue = '';
        this.first = 0;
        table.clear();
    }

    navigateToDetail(contract: ContractSummary) {
        this.#router.navigate(['/contracts', contract.id]);
    }

    isValidAmount(value: string): boolean {
        return /^\d+(\.\d{1,2})?$/.test(value.trim()) && parseFloat(value) > 0;
    }

    showCreateDialog() {
        this.createForm = { projectId: '', customerContractNo: '', signedAmount: '', currencyCode: 'CNY' };
        this.selectedProject = null;
        this.projectSuggestions = this.projects().slice(0, 20);
        this.createSubmitAttempted = false;
        this.createDialogVisible = true;

        if (this.projects().length === 0) {
            void this.#projectStore.loadProjects().then((projects) => {
                this.projectSuggestions = projects.slice(0, 20);
            });
        }
    }

    cancelCreate() {
        this.createSubmitAttempted = false;
        this.createDialogVisible = false;
        this.selectedProject = null;
    }

    async createContract() {
        this.createSubmitAttempted = true;
        if (!this.selectedProject || !this.isValidAmount(this.createForm.signedAmount)) {
            return;
        }

        try {
            await this.#contractStore.createContract({
                projectId: this.selectedProject.id,
                customerContractNo: this.optionalText(this.createForm.customerContractNo),
                signedAmount: this.createForm.signedAmount.trim(),
                currencyCode: this.createForm.currencyCode
            });
            this.createDialogVisible = false;
            this.createSubmitAttempted = false;
            this.selectedProject = null;
        } catch {
            return;
        }
    }

    filterProjects(event: AutoCompleteCompleteEvent) {
        const query = event.query.trim().toLowerCase();
        const projects = this.projects();
        this.projectSuggestions = (query ? projects.filter((project) => this.projectSearchText(project).includes(query)) : projects).slice(0, 20);
    }

    selectProject(project: ProjectListView | null) {
        this.selectedProject = project;
        this.createForm.projectId = project?.id ?? '';
    }

    projectSearchText(project: ProjectListView): string {
        return [project.projectNo, project.projectName, project.customerName, project.customerProjectNo, this.getProjectStageName(project.currentStage), this.getProjectStatusName(project.status)].filter(Boolean).join(' ').toLowerCase();
    }

    optionalText(value: string): string | null {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    getStatusName(status: ContractStatus): string {
        return contractStatusLabelOrFallback(status);
    }

    getStatusSeverity(status: ContractStatus) {
        return contractStatusSeverityOrFallback(status);
    }

    getProjectStageName(stage: ProjectStage): string {
        return projectStageLabelOrFallback(stage);
    }

    getProjectStageSeverity(stage: ProjectStage) {
        return projectStageSeverityOrFallback(stage);
    }

    getProjectStatusName(status: ProjectStatus): string {
        return projectStatusLabelOrFallback(status);
    }

    getProjectStatusSeverity(status: ProjectStatus) {
        return projectStatusSeverityOrFallback(status);
    }
}
