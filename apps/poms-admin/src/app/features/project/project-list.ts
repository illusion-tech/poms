import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore, ProjectStore, type ProjectListView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

interface ProjectFilterOption {
    label: string;
    value: string;
}

interface ProjectSummaryItem {
    label: string;
    value: number;
    hint: string;
}

interface CreateProjectForm {
    customerName: string;
    projectCode: string;
    projectName: string;
}

type UiTagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined;

const ALL_FILTER_VALUE = 'all';

const EMPTY_CREATE_FORM: CreateProjectForm = {
    customerName: '',
    projectCode: '',
    projectName: ''
};

const PROJECT_STAGE_LABELS: Record<string, string> = {
    assessment: '立项评估',
    'scope-confirmation': '范围确认',
    'commercial-closure': '商务收口',
    contracting: '签约中',
    handover: '项目移交',
    execution: '正式执行',
    acceptance: '验收确认',
    completed: '已完成',
    'closed-lost': '已丢单',
    'closed-terminated': '已终止'
};

const PROJECT_STAGE_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    assessment: 'secondary',
    'scope-confirmation': 'info',
    'commercial-closure': 'warn',
    contracting: 'warn',
    handover: 'warn',
    execution: 'success',
    acceptance: 'info',
    completed: 'contrast',
    'closed-lost': 'danger',
    'closed-terminated': 'danger'
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
    active: '进行中',
    'pending-approval': '待审批',
    blocked: '阻塞中',
    'on-hold': '已挂起',
    completed: '已完成',
    closed: '已关闭',
    'closed-lost': '已丢单',
    'closed-terminated': '已终止'
};

const PROJECT_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    active: 'info',
    'pending-approval': 'secondary',
    blocked: 'warn',
    'on-hold': 'warn',
    completed: 'success',
    closed: 'contrast',
    'closed-lost': 'danger',
    'closed-terminated': 'danger'
};

@Component({
    selector: 'app-project-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, DialogModule],
    providers: [ProjectStore],
    template: `
        <div class="flex flex-col gap-5">
            <section class="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-700">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-500 dark:text-surface-400">项目入口</p>
                        <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">项目管理</h1>
                        <p class="mt-2 max-w-3xl text-sm leading-6 text-surface-600 dark:text-surface-300">
                            先确认客户、负责人和阶段，再进入详情或工作区继续处理。
                        </p>
                    </div>

                    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        @if (canCreateProject()) {
                            <p-button
                                label="新建项目"
                                icon="pi pi-plus"
                                severity="primary"
                                styleClass="w-full sm:w-auto rounded-md!"
                                (onClick)="showCreateDialog()"
                            />
                        } @else {
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
                                当前账号只能查看项目。
                            </div>
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
                <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div class="flex flex-col gap-3 md:flex-row md:items-center">
                        <p-iconfield class="w-full md:w-80">
                            <p-inputicon class="pi pi-search" />
                            <input
                                pInputText
                                [ngModel]="searchValue()"
                                (ngModelChange)="searchValue.set($event)"
                                placeholder="搜索项目、客户、负责人"
                                class="w-full! rounded-md! py-2!"
                            />
                        </p-iconfield>

                        <select
                            class="h-10 rounded-md border border-surface-300 bg-surface-0 px-3 text-sm text-surface-700 outline-none transition-colors hover:border-surface-400 focus:border-primary dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:border-surface-500"
                            [ngModel]="stageFilter()"
                            (ngModelChange)="stageFilter.set($event)"
                            aria-label="按阶段筛选"
                        >
                            @for (option of stageOptions; track option.value) {
                                <option [value]="option.value">{{ option.label }}</option>
                            }
                        </select>

                        <select
                            class="h-10 rounded-md border border-surface-300 bg-surface-0 px-3 text-sm text-surface-700 outline-none transition-colors hover:border-surface-400 focus:border-primary dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:border-surface-500"
                            [ngModel]="statusFilter()"
                            (ngModelChange)="statusFilter.set($event)"
                            aria-label="按状态筛选"
                        >
                            @for (option of statusOptions; track option.value) {
                                <option [value]="option.value">{{ option.label }}</option>
                            }
                        </select>
                    </div>

                    <div class="text-sm text-surface-500 dark:text-surface-400">
                        当前筛出 {{ visibleProjects().length }} 个项目
                    </div>
                </div>

                <div class="overflow-hidden rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900">
                    <p-table
                        [value]="visibleProjects()"
                        [loading]="loading()"
                        [paginator]="true"
                        [rows]="rows"
                        [first]="first"
                        dataKey="id"
                        sortMode="multiple"
                        responsiveLayout="scroll"
                        [tableStyle]="{ width: '100%', 'min-width': '72rem' }"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="显示 {first} 到 {last}，共 {totalRecords} 个项目"
                        [pt]="{ root: { class: 'border-none!' }, pcPaginator: { root: { class: 'rounded-none!' } } }"
                    >
                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="projectName" class="min-w-64">
                                    <span class="flex items-center gap-2">项目 <p-sortIcon field="projectName" /></span>
                                </th>
                                <th pSortableColumn="customerName" class="min-w-48">
                                    <span class="flex items-center gap-2">客户 <p-sortIcon field="customerName" /></span>
                                </th>
                                <th pSortableColumn="currentStage" class="min-w-40">
                                    <span class="flex items-center gap-2">阶段 <p-sortIcon field="currentStage" /></span>
                                </th>
                                <th pSortableColumn="status" class="min-w-36">
                                    <span class="flex items-center gap-2">状态 <p-sortIcon field="status" /></span>
                                </th>
                                <th pSortableColumn="ownerName" class="min-w-52">
                                    <span class="flex items-center gap-2">负责人 <p-sortIcon field="ownerName" /></span>
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
                                    <button
                                        type="button"
                                        class="max-w-80 text-left text-sm font-semibold leading-5 text-primary hover:underline"
                                        (click)="navigateToDetail(project)"
                                    >
                                        {{ project.projectName }}
                                    </button>
                                    <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ project.projectCode }}</div>
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
                    </p-table>
                </div>
            </section>

            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建项目" [style]="{ width: 'min(32rem, 92vw)' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-2">
                    <p class="text-sm leading-6 text-surface-600 dark:text-surface-300">
                        项目会从立项评估开始。后续阶段由项目进展自然推进。
                    </p>

                    @if (createError()) {
                        <div class="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                            {{ createError() }}
                        </div>
                    }

                    <div class="flex flex-col gap-2">
                        <label for="projectCode" class="text-sm font-medium text-surface-900 dark:text-surface-0">项目编号</label>
                        <input
                            pInputText
                            id="projectCode"
                            [ngModel]="createForm().projectCode"
                            (ngModelChange)="updateCreateField('projectCode', $event)"
                            placeholder="例如：P-2026-001"
                            class="w-full rounded-md!"
                        />
                        @if (createAttempted() && !createForm().projectCode.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写项目编号。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="projectName" class="text-sm font-medium text-surface-900 dark:text-surface-0">项目名称</label>
                        <input
                            pInputText
                            id="projectName"
                            [ngModel]="createForm().projectName"
                            (ngModelChange)="updateCreateField('projectName', $event)"
                            placeholder="填写客户能识别的项目名称"
                            class="w-full rounded-md!"
                        />
                        @if (createAttempted() && !createForm().projectName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写项目名称。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="customerName" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户名称</label>
                        <input
                            pInputText
                            id="customerName"
                            [ngModel]="createForm().customerName"
                            (ngModelChange)="updateCreateField('customerName', $event)"
                            placeholder="填写客户公司或单位名称"
                            class="w-full rounded-md!"
                        />
                        @if (createAttempted() && !createForm().customerName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写客户名称。</span>
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
    readonly #projectStore = inject(ProjectStore);
    readonly #router = inject(Router);

    readonly projects = this.#projectStore.projects;
    readonly loading = this.#projectStore.loading;
    readonly creating = this.#projectStore.saving;

    readonly searchValue = signal('');
    readonly stageFilter = signal(ALL_FILTER_VALUE);
    readonly statusFilter = signal(ALL_FILTER_VALUE);
    readonly createForm = signal<CreateProjectForm>(EMPTY_CREATE_FORM);
    readonly createAttempted = signal(false);
    readonly createError = signal<string | null>(null);

    readonly rows = 10;
    first = 0;
    createDialogVisible = false;

    readonly stageOptions: ProjectFilterOption[] = [
        { label: '全部阶段', value: ALL_FILTER_VALUE },
        ...Object.entries(PROJECT_STAGE_LABELS).map(([value, label]) => ({ label, value }))
    ];

    readonly statusOptions: ProjectFilterOption[] = [
        { label: '全部状态', value: ALL_FILTER_VALUE },
        ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ label, value }))
    ];

    readonly canCreateProject = computed(() => this.#authStore.hasAnyPermission(['project:write'] as const));

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
        const activeCount = projects.filter((project) => project.status === 'active').length;
        const attentionCount = projects.filter((project) => ['blocked', 'on-hold', 'pending-approval'].includes(project.status)).length;
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
        return Boolean(form.projectCode.trim() && form.projectName.trim() && form.customerName.trim());
    });

    ngOnInit() {
        void this.ensureAuthReady();
        void this.#projectStore.loadProjects();
    }

    navigateToDetail(project: ProjectListView) {
        this.#router.navigate(['/projects', project.id]);
    }

    navigateToWorkspace(project: ProjectListView) {
        this.#router.navigate(['/projects', project.id, 'workspace']);
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

    async createProject() {
        this.createAttempted.set(true);

        if (!this.canCreateProject() || !this.isCreateFormValid()) {
            return;
        }

        const form = this.createForm();

        try {
            await this.#projectStore.createProject({
                projectCode: form.projectCode.trim(),
                projectName: form.projectName.trim(),
                customerName: form.customerName.trim()
            });
            this.closeCreateDialog();
        } catch {
            this.createError.set('项目没有创建成功，请稍后重试。');
        }
    }

    getStatusName(status: string): string {
        return PROJECT_STATUS_LABELS[status] ?? status;
    }

    getStatusSeverity(status: string): UiTagSeverity {
        return PROJECT_STATUS_SEVERITIES[status];
    }

    getStageName(stage: string): string {
        return PROJECT_STAGE_LABELS[stage] ?? stage;
    }

    getStageSeverity(stage: string): UiTagSeverity {
        return PROJECT_STAGE_SEVERITIES[stage];
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    private projectSearchText(project: ProjectListView): string {
        return this.normalize(
            [
                project.projectCode,
                project.projectName,
                project.customerName,
                project.ownerName,
                project.ownerOrgName,
                this.getStageName(project.currentStage),
                this.getStatusName(project.status)
            ].join(' ')
        );
    }

    private normalize(value: string): string {
        return value.trim().toLowerCase();
    }

    private async ensureAuthReady(): Promise<void> {
        if (this.#authStore.isAuthenticated() && !this.#authStore.currentUser()) {
            await this.#authStore.initialize();
        }
    }
}
