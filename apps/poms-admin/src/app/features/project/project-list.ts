import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { AdminListShell } from '../../shared/ui/admin-list-shell';
import { AdminListToolbar } from '../../shared/ui/admin-list-toolbar';
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

const PROJECT_STAGE_VALUES = [
    ProjectStage.Assessment,
    ProjectStage.ScopeConfirmation,
    ProjectStage.CommercialClosure,
    ProjectStage.Contracting,
    ProjectStage.Handover,
    ProjectStage.Execution,
    ProjectStage.Acceptance,
    ProjectStage.Completed,
    ProjectStage.ClosedLost,
    ProjectStage.ClosedTerminated
] as const satisfies readonly ProjectStage[];

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
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, TagModule, DialogModule, AdminListShell, AdminListToolbar, WorkspaceFeedback],
    providers: [ProjectStore, CustomerStore],
    template: `
        <div class="flex flex-col gap-5">
            <section class="border-b border-surface-200 pb-5 dark:border-surface-700">
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
                <app-admin-list-shell>
                    <app-admin-list-toolbar>
                        <div adminToolbarStart class="flex w-full flex-col gap-3 md:flex-row md:items-center">
                            <button pButton type="button" label="清空筛选" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" class="w-full rounded-md! md:w-auto" (click)="clearFilters(dt)"></button>

                            <p-iconfield class="w-full md:w-80">
                                <p-inputicon class="pi pi-search" />
                                <input pInputText [ngModel]="searchValue()" (ngModelChange)="searchValue.set($event)" (input)="onGlobalFilter(dt, $event)" placeholder="搜索项目、客户、负责人" class="w-full! rounded-md! py-2!" />
                            </p-iconfield>

                            <p-select [ngModel]="stageFilter()" (ngModelChange)="setStageFilter($event)" [options]="stageOptions" optionLabel="label" optionValue="value" appendTo="body" ariaLabel="按阶段筛选" class="w-full md:w-44 rounded-md!" />

                            <p-select [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" ariaLabel="按状态筛选" class="w-full md:w-40 rounded-md!" />
                        </div>

                        <div adminToolbarEnd class="flex flex-col gap-3 text-sm text-surface-500 dark:text-surface-400 sm:flex-row sm:items-center">
                            <span>当前筛出 {{ visibleProjects().length }} 个项目</span>
                            @if (canCreateLead()) {
                                <p-button label="选择线索转项目" icon="pi pi-compass" severity="primary" styleClass="w-full sm:w-auto rounded-md!" (onClick)="navigateToLeadEntry()" />
                            }

                            @if (!canCreateLead() && canCreateProject()) {
                                <span class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">正式项目入口需要从已确认有效线索转入。</span>
                            }

                            @if (!canCreateLead() && !canCreateProject()) {
                                <span class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">当前账号只能查看项目。</span>
                            }
                        </div>
                    </app-admin-list-toolbar>

                    <p-table
                        #dt
                        [value]="visibleProjects()"
                        [loading]="loading()"
                        [rowHover]="true"
                        [paginator]="true"
                        [rows]="rows"
                        [first]="first"
                        dataKey="id"
                        sortMode="multiple"
                        responsiveLayout="scroll"
                        [globalFilterFields]="['projectNo', 'projectName', 'customerName', 'customerProjectNo', 'ownerName', 'ownerOrgName', 'currentStage', 'status']"
                        [tableStyle]="{ width: '100%', 'min-width': '64rem' }"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 个项目"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="projectName" class="w-[34%] min-w-72">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">项目/客户 <p-sortIcon field="projectName" /></span>
                                        <p-columnFilter type="text" field="projectName" display="menu" placeholder="按项目名筛选" />
                                    </div>
                                </th>
                                <th pSortableColumn="currentStage" class="w-[22%] min-w-52">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">阶段/状态 <p-sortIcon field="currentStage" /></span>
                                        <p-columnFilter field="currentStage" matchMode="equals" display="menu" [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                                            <ng-template #filter let-value let-filter="filterCallback">
                                                <p-select [ngModel]="value" [options]="stageColumnFilterOptions" optionLabel="label" optionValue="value" placeholder="任意阶段" appendTo="body" (onChange)="filter($event.value)" class="w-48" />
                                            </ng-template>
                                        </p-columnFilter>
                                    </div>
                                </th>
                                <th pSortableColumn="ownerName" class="w-[24%] min-w-60">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="flex items-center gap-2">责任/节点 <p-sortIcon field="ownerName" /></span>
                                        <p-columnFilter type="text" field="ownerName" display="menu" placeholder="按负责人筛选" />
                                    </div>
                                </th>
                                <th class="w-56 min-w-56">继续处理</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-project>
                            <tr>
                                <td>
                                    <button type="button" class="text-left text-sm font-semibold leading-5 text-primary hover:underline" (click)="navigateToDetail(project)">
                                        {{ project.projectName }}
                                    </button>
                                    <div class="mt-2 flex flex-col gap-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                                        <span>{{ project.projectNo }}</span>
                                        <span class="text-surface-700 dark:text-surface-200">{{ displayText(project.customerName, '待补充客户') }}</span>
                                        <span>客户项目号：{{ displayText(project.customerProjectNo, '未填写') }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="flex flex-wrap items-center gap-2">
                                        <p-tag [value]="getStageName(project.currentStage)" [severity]="getStageSeverity(project.currentStage)" class="rounded-[6px]!" />
                                        <p-tag [value]="getStatusName(project.status)" [severity]="getStatusSeverity(project.status)" class="rounded-[6px]!" />
                                    </div>
                                </td>
                                <td>
                                    <div class="flex flex-col gap-1 text-sm leading-5">
                                        <span class="font-medium text-surface-900 dark:text-surface-0">{{ displayText(project.ownerName, '待指定') }}</span>
                                        <span class="text-xs text-surface-500 dark:text-surface-400">{{ displayText(project.ownerOrgName, '待归属组织') }}</span>
                                        <span class="text-xs text-surface-500 dark:text-surface-400">关键节点：{{ project.latestMilestoneAt ? (project.latestMilestoneAt | date: 'yyyy-MM-dd') : '暂无' }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="flex flex-wrap justify-start gap-2">
                                        <p-button label="详情" icon="pi pi-eye" severity="secondary" [outlined]="true" size="small" styleClass="rounded-md!" (onClick)="navigateToDetail(project)" />
                                        <p-button label="工作区" icon="pi pi-briefcase" severity="secondary" size="small" styleClass="rounded-md!" (onClick)="navigateToWorkspace(project)" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="4" class="px-6 py-12 text-center">
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
                </app-admin-list-shell>
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
                            class="w-full rounded-md!"
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
    @ViewChild('dt') dt!: Table;

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
        this.#router.navigate(['/leads'], { queryParams: { conversion: 'ready' } });
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
