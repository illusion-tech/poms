import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore, CustomerStatus, CustomerStore, ProjectStage, ProjectStatus, ProjectStore, type CustomerListView, type ProjectListView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PROJECT_STAGE_LABELS, PROJECT_STATUS_LABELS, projectStageLabelOrFallback, projectStageSeverityOrFallback, projectStatusLabelOrFallback, projectStatusSeverityOrFallback } from '../../shared/ui/status-presentation';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';

interface ProjectFilterOption<T extends string = string> {
    label: string;
    value: T;
}

interface ProjectColumnFilterOption<T extends string = string> {
    label: string;
    value: T | null;
}

interface ProjectSummaryItem {
    label: string;
    value: number;
    hint: string;
}

interface CustomerOption extends ProjectFilterOption {
    customer: CustomerListView;
}

interface CreateProjectForm {
    customerId: string | null;
    customerProjectNo: string;
    projectName: string;
}

const ALL_FILTER_VALUE = 'all';
type ProjectAllFilterValue = typeof ALL_FILTER_VALUE;
const ATTENTION_PROJECT_STATUSES: readonly ProjectStatus[] = [ProjectStatus.Blocked, ProjectStatus.OnHold, ProjectStatus.PendingApproval];

const PROJECT_STAGE_VALUES = [ProjectStage.Assessment, ProjectStage.ScopeConfirmation, ProjectStage.CommercialClosure, ProjectStage.Contracting, ProjectStage.Handover, ProjectStage.Execution, ProjectStage.Acceptance, ProjectStage.Completed, ProjectStage.ClosedLost, ProjectStage.ClosedTerminated] as const satisfies readonly ProjectStage[];

const PROJECT_STATUS_VALUES = [ProjectStatus.Active, ProjectStatus.PendingApproval, ProjectStatus.Blocked, ProjectStatus.OnHold, ProjectStatus.Completed, ProjectStatus.Closed] as const satisfies readonly ProjectStatus[];

const PROJECT_STAGE_OPTIONS: Array<ProjectFilterOption<ProjectStage | ProjectAllFilterValue>> = [{ label: '全部阶段', value: ALL_FILTER_VALUE }, ...PROJECT_STAGE_VALUES.map((value) => ({ label: PROJECT_STAGE_LABELS[value], value }))];

const PROJECT_STATUS_OPTIONS: Array<ProjectFilterOption<ProjectStatus | ProjectAllFilterValue>> = [{ label: '全部状态', value: ALL_FILTER_VALUE }, ...PROJECT_STATUS_VALUES.map((value) => ({ label: PROJECT_STATUS_LABELS[value], value }))];

const PROJECT_STAGE_COLUMN_FILTER_OPTIONS: Array<ProjectColumnFilterOption<ProjectStage>> = [{ label: '任意阶段', value: null }, ...PROJECT_STAGE_VALUES.map((value) => ({ label: PROJECT_STAGE_LABELS[value], value }))];

const PROJECT_STATUS_COLUMN_FILTER_OPTIONS: Array<ProjectColumnFilterOption<ProjectStatus>> = [{ label: '任意状态', value: null }, ...PROJECT_STATUS_VALUES.map((value) => ({ label: PROJECT_STATUS_LABELS[value], value }))];

const EMPTY_CREATE_FORM: CreateProjectForm = {
    customerId: null,
    customerProjectNo: '',
    projectName: ''
};

@Component({
    selector: 'app-project-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, TagModule, DialogModule, WorkspaceFeedback],
    providers: [ProjectStore, CustomerStore],
    template: `
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">项目入口</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">项目管理</h1>
                        <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">先确认客户、负责人和阶段，再进入详情或工作区继续处理。</p>
                    </div>

                    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        @if (canCreateLead()) {
                            <p-button label="从线索创建项目" icon="pi pi-compass" severity="primary" styleClass="w-full sm:w-auto rounded-md!" (onClick)="navigateToLeadEntry()" />
                        }

                        @if (!canCreateLead() && canCreateProject()) {
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">正式项目入口已切到线索转项目。</div>
                        }

                        @if (!canCreateLead() && !canCreateProject()) {
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">当前账号只能查看项目。</div>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

            <section class="flex flex-col gap-4">
                <div class="overflow-hidden rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900">
                    <p-table
                        #dt
                        [value]="visibleProjects()"
                        [loading]="loading()"
                        [rowHover]="true"
                        [showGridlines]="true"
                        [paginator]="true"
                        [rows]="rows"
                        [first]="first"
                        dataKey="id"
                        sortMode="multiple"
                        responsiveLayout="scroll"
                        [globalFilterFields]="['projectNo', 'projectName', 'customerName', 'customerProjectNo', 'ownerName', 'ownerOrgName', 'currentStage', 'status']"
                        [tableStyle]="{ width: '100%', 'min-width': '72rem' }"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 个项目"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #caption>
                            <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div class="flex flex-col gap-3 md:flex-row md:items-center">
                                    <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="rounded-md!" (click)="clearFilters(dt)"></button>

                                    <p-iconfield class="w-full md:w-80">
                                        <p-inputicon class="pi pi-search" />
                                        <input pInputText [ngModel]="searchValue()" (ngModelChange)="searchValue.set($event)" (input)="onGlobalFilter(dt, $event)" placeholder="搜索项目、客户、负责人" class="w-full! rounded-md! py-2!" />
                                    </p-iconfield>

                                    <p-select
                                        [ngModel]="stageFilter()"
                                        (ngModelChange)="setStageFilter($event)"
                                        [options]="stageOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        appendTo="body"
                                        ariaLabel="按阶段筛选"
                                        styleClass="w-full md:w-44 rounded-md!"
                                    />

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

                                <div class="text-sm text-surface-500 dark:text-surface-400">当前筛出 {{ visibleProjects().length }} 个项目</div>
                            </div>
                        </ng-template>
                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="projectName" class="min-w-64">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">项目 <p-sortIcon field="projectName" /></span>
                                        <p-columnFilter type="text" field="projectName" display="menu" placeholder="按项目名筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="customerName" class="min-w-48">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">客户 <p-sortIcon field="customerName" /></span>
                                        <p-columnFilter type="text" field="customerName" display="menu" placeholder="按客户筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="currentStage" class="min-w-40">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">阶段 <p-sortIcon field="currentStage" /></span>
                                        <p-columnFilter field="currentStage" matchMode="equals" display="menu" [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                                            <ng-template #filter let-value let-filter="filterCallback">
                                                <p-select [ngModel]="value" [options]="stageColumnFilterOptions" optionLabel="label" optionValue="value" placeholder="任意阶段" appendTo="body" (onChange)="filter($event.value)" styleClass="w-48" />
                                            </ng-template>
                                        </p-columnFilter>
                                    </div>
                                </th>
                                <th pSortableColumn="status" class="min-w-36">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">状态 <p-sortIcon field="status" /></span>
                                        <p-columnFilter field="status" matchMode="equals" display="menu" [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                                            <ng-template #filter let-value let-filter="filterCallback">
                                                <p-select [ngModel]="value" [options]="statusColumnFilterOptions" optionLabel="label" optionValue="value" placeholder="任意状态" appendTo="body" (onChange)="filter($event.value)" styleClass="w-48" />
                                            </ng-template>
                                        </p-columnFilter>
                                    </div>
                                </th>
                                <th pSortableColumn="ownerName" class="min-w-52">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">负责人 <p-sortIcon field="ownerName" /></span>
                                        <p-columnFilter type="text" field="ownerName" display="menu" placeholder="按负责人筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="latestMilestoneAt" class="min-w-44">
                                    <span class="flex items-center gap-2">最近关键节点 <p-sortIcon field="latestMilestoneAt" /></span>
                                </th>
                                <th class="min-w-48">继续处理</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-project>
                            <tr>
                                <td>
                                    <button type="button" class="max-w-80 text-left text-sm font-semibold leading-5 text-primary hover:underline" (click)="navigateToDetail(project)">
                                        {{ project.projectName }}
                                    </button>
                                    <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ project.projectNo }}</div>
                                </td>
                                <td>
                                    <span class="text-sm leading-5 text-surface-800 dark:text-surface-100">{{ displayText(project.customerName, '待补充客户') }}</span>
                                </td>
                                <td>
                                    <p-tag [value]="getStageName(project.currentStage)" [severity]="getStageSeverity(project.currentStage)" styleClass="rounded-[6px]!" />
                                </td>
                                <td>
                                    <p-tag [value]="getStatusName(project.status)" [severity]="getStatusSeverity(project.status)" styleClass="rounded-[6px]!" />
                                </td>
                                <td>
                                    <div class="text-sm font-medium leading-5 text-surface-900 dark:text-surface-0">{{ displayText(project.ownerName, '待指定') }}</div>
                                    <div class="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ displayText(project.ownerOrgName, '待归属组织') }}</div>
                                </td>
                                <td>
                                    @if (project.latestMilestoneAt) {
                                        <span class="text-sm leading-5 text-surface-800 dark:text-surface-100">{{ project.latestMilestoneAt | date: 'yyyy-MM-dd' }}</span>
                                    } @else {
                                        <span class="text-sm leading-5 text-surface-500 dark:text-surface-400">暂无关键节点</span>
                                    }
                                </td>
                                <td>
                                    <div class="flex flex-wrap gap-2">
                                        <p-button label="详情" severity="secondary" [outlined]="true" size="small" styleClass="rounded-md!" (onClick)="navigateToDetail(project)" />
                                        <p-button label="工作区" severity="secondary" size="small" styleClass="rounded-md!" (onClick)="navigateToWorkspace(project)" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="7" class="px-6 py-12 text-center">
                                    <div class="mx-auto flex max-w-md flex-col items-center gap-2">
                                        <i class="pi pi-folder-open text-3xl text-surface-300 dark:text-surface-600"></i>
                                        <div class="text-sm font-medium text-surface-700 dark:text-surface-200">没有符合条件的项目</div>
                                        <div class="text-sm leading-6 text-surface-500 dark:text-surface-400">请调整搜索词、阶段或状态。</div>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #loadingbody>
                            <tr>
                                <td colspan="7" class="px-6 py-12 text-center text-surface-500 dark:text-surface-400">正在读取项目列表</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建项目" [style]="{ width: 'min(32rem, 92vw)' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-2">
                    <p class="text-sm leading-6 text-surface-600 dark:text-surface-300">项目会从立项评估开始。后续阶段由项目进展自然推进。</p>

                    @if (createError()) {
                        <app-workspace-feedback severity="error" summary="新建项目失败" [detail]="createError()" />
                    }

                    <div class="flex flex-col gap-2">
                        <label for="customerProjectNo" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户项目编号</label>
                        <input pInputText id="customerProjectNo" [ngModel]="createForm().customerProjectNo" (ngModelChange)="updateCreateField('customerProjectNo', $event)" placeholder="客户侧立项或招标编号，可选" class="w-full rounded-md!" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="projectName" class="text-sm font-medium text-surface-900 dark:text-surface-0">项目名称</label>
                        <input pInputText id="projectName" [ngModel]="createForm().projectName" (ngModelChange)="updateCreateField('projectName', $event)" placeholder="填写客户能识别的项目名称" class="w-full rounded-md!" />
                        @if (createAttempted() && !createForm().projectName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写项目名称。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <div class="flex items-center justify-between gap-3">
                            <label for="projectCustomerId" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户</label>
                            <button pButton type="button" label="客户管理" icon="pi pi-building" severity="secondary" [text]="true" class="rounded-md! px-2! py-1!" (click)="navigateToCustomers()"></button>
                        </div>
                        <p-select
                            inputId="projectCustomerId"
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
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeCreateDialog()" />
                        <p-button label="创建项目" [loading]="creating()" [disabled]="!isCreateFormValid()" styleClass="rounded-md!" (onClick)="createProject()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class ProjectList implements OnInit {
    readonly #authStore = inject(AuthStore);
    readonly #customerStore = inject(CustomerStore);
    readonly #projectStore = inject(ProjectStore);
    readonly #router = inject(Router);

    readonly projects = this.#projectStore.projects;
    readonly loading = this.#projectStore.loading;
    readonly creating = this.#projectStore.saving;
    readonly customerLoading = this.#customerStore.loading;

    readonly searchValue = signal('');
    readonly stageFilter = signal<ProjectStage | ProjectAllFilterValue>(ALL_FILTER_VALUE);
    readonly statusFilter = signal<ProjectStatus | ProjectAllFilterValue>(ALL_FILTER_VALUE);
    readonly createForm = signal<CreateProjectForm>(EMPTY_CREATE_FORM);
    readonly createAttempted = signal(false);
    readonly createError = signal<string | null>(null);

    readonly rows = 10;
    first = 0;
    createDialogVisible = false;

    readonly stageOptions = PROJECT_STAGE_OPTIONS;

    readonly statusOptions = PROJECT_STATUS_OPTIONS;

    readonly stageColumnFilterOptions = PROJECT_STAGE_COLUMN_FILTER_OPTIONS;

    readonly statusColumnFilterOptions = PROJECT_STATUS_COLUMN_FILTER_OPTIONS;

    readonly canCreateProject = computed(() => this.#authStore.hasAnyPermission(['project:write'] as const));
    readonly canCreateLead = computed(() => this.#authStore.hasAnyPermission(['lead:write'] as const));
    readonly customerOptions = computed<CustomerOption[]>(() =>
        this.#customerStore.activeCustomers().map((customer) => ({
            label: `${customer.displayName}（${customer.customerNo}）`,
            value: customer.id,
            customer
        }))
    );

    readonly visibleProjects = computed(() => {
        const keyword = this.normalize(this.searchValue());
        const selectedStage = this.stageFilter();
        const selectedStatus = this.statusFilter();

        return this.projects().filter((project) => {
            if (selectedStage !== ALL_FILTER_VALUE && project.currentStage !== selectedStage) {
                return false;
            }

            if (selectedStatus !== ALL_FILTER_VALUE && project.status !== selectedStatus) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            return this.projectSearchText(project).includes(keyword);
        });
    });

    readonly summaryItems = computed<ProjectSummaryItem[]>(() => {
        const projects = this.projects();
        const activeCount = projects.filter((project) => project.status === ProjectStatus.Active).length;
        const attentionCount = projects.filter((project) => ATTENTION_PROJECT_STATUSES.includes(project.status)).length;
        const milestoneCount = projects.filter((project) => Boolean(project.latestMilestoneAt)).length;

        return [
            { label: '全部项目', value: projects.length, hint: '可查看项目' },
            { label: '进行中', value: activeCount, hint: '保持推进' },
            { label: '需要关注', value: attentionCount, hint: '审批、阻塞或挂起' },
            { label: '已有关键节点', value: milestoneCount, hint: '可追溯进展' }
        ];
    });

    readonly isCreateFormValid = computed(() => {
        const form = this.createForm();
        return Boolean(form.projectName.trim() && form.customerId);
    });

    ngOnInit() {
        void this.ensureAuthReady();
        void this.loadCustomers();
        void this.#projectStore.loadProjects();
    }

    navigateToDetail(project: ProjectListView) {
        this.#router.navigate(['/projects', project.id]);
    }

    navigateToWorkspace(project: ProjectListView) {
        this.#router.navigate(['/projects', project.id, 'workspace']);
    }

    navigateToLeadEntry() {
        this.#router.navigate(['/leads']);
    }

    navigateToCustomers() {
        this.#router.navigate(['/customers']);
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
        this.first = 0;
    }

    clearFilters(table: Table) {
        this.searchValue.set('');
        this.stageFilter.set(ALL_FILTER_VALUE);
        this.statusFilter.set(ALL_FILTER_VALUE);
        this.first = 0;
        table.clear();
    }

    setStageFilter(value: ProjectStage | ProjectAllFilterValue | null | undefined) {
        this.stageFilter.set(value ?? ALL_FILTER_VALUE);
        this.first = 0;
    }

    setStatusFilter(value: ProjectStatus | ProjectAllFilterValue | null | undefined) {
        this.statusFilter.set(value ?? ALL_FILTER_VALUE);
        this.first = 0;
    }

    showCreateDialog() {
        if (!this.canCreateProject()) {
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

    updateCreateField(field: keyof CreateProjectForm, value: string) {
        this.createForm.update((form) => ({
            ...form,
            [field]: value
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

    async createProject() {
        this.createAttempted.set(true);

        if (!this.canCreateProject() || !this.isCreateFormValid()) {
            return;
        }

        const form = this.createForm();
        const customerId = form.customerId;

        if (!customerId) {
            return;
        }

        try {
            await this.#projectStore.createProject({
                projectName: form.projectName.trim(),
                customerId,
                customerProjectNo: this.optionalText(form.customerProjectNo)
            });
            this.closeCreateDialog();
        } catch {
            this.createError.set('项目没有创建成功，请稍后重试。');
        }
    }

    getStatusName(status: ProjectStatus): string {
        return projectStatusLabelOrFallback(status);
    }

    getStatusSeverity(status: ProjectStatus) {
        return projectStatusSeverityOrFallback(status);
    }

    getStageName(stage: ProjectStage): string {
        return projectStageLabelOrFallback(stage);
    }

    getStageSeverity(stage: ProjectStage) {
        return projectStageSeverityOrFallback(stage);
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    private optionalText(value: string): string | null {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    private projectSearchText(project: ProjectListView): string {
        return this.normalize([project.projectNo, project.customerProjectNo, project.projectName, project.customerName, project.ownerName, project.ownerOrgName, this.getStageName(project.currentStage), this.getStatusName(project.status)].join(' '));
    }

    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }

    private async loadCustomers(): Promise<void> {
        try {
            if (!this.#customerStore.loaded()) {
                await this.#customerStore.loadCustomers({ status: CustomerStatus.Active });
            }
        } catch {
            this.createError.set('客户候选没有读取成功，请稍后重试。');
        }
    }

    private async ensureAuthReady(): Promise<void> {
        if (this.#authStore.isAuthenticated() && !this.#authStore.currentUser()) {
            await this.#authStore.initialize();
        }
    }
}
