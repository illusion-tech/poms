import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectStore, type ProjectDetailView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ProjectContextHeader } from '../../shared/ui/project-context-header';
import { ProjectLifecycleTimeline, type ProjectLifecycleTimelineItem } from '../../shared/ui/project-lifecycle-timeline';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';

type UiTagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined;

interface EditProjectForm {
    customerName: string;
    projectName: string;
}

const PROJECT_ACTIONS = {
    editBasicInfo: 'edit-project-basic-info',
    manageCommission: 'manage-project-commission',
    viewWorkspace: 'view-project-workspace'
} as const;

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

const CONTRACT_STATUS_LABELS: Record<string, string> = {
    draft: '草稿',
    'pending-review': '待审核',
    active: '已生效',
    terminated: '已终止',
    completed: '已完成'
};

const CONTRACT_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    draft: 'secondary',
    'pending-review': 'warn',
    active: 'success',
    terminated: 'danger',
    completed: 'contrast'
};

const CONFIRMATION_STATUS_LABELS: Record<string, string> = {
    not_configured: '暂未形成确认记录',
    pending: '待确认',
    partial: '部分确认',
    confirmed: '已确认',
    voided: '已作废'
};

const CONFIRMATION_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    not_configured: 'secondary',
    pending: 'warn',
    partial: 'info',
    confirmed: 'success',
    voided: 'contrast'
};

const BLOCKING_REASON_LABELS: Record<string, string> = {
    'project-status-blocked': '项目被标记为阻塞，需先处理阻断事项。',
    'project-closed': '项目已关闭，不能继续推进。'
};

const PROJECT_LIFECYCLE_STAGES = ['assessment', 'scope-confirmation', 'commercial-closure', 'contracting', 'handover', 'execution', 'acceptance', 'completed'] as const;

const PROJECT_LIFECYCLE_DESCRIPTIONS: Record<(typeof PROJECT_LIFECYCLE_STAGES)[number], string> = {
    assessment: '判断是否继续推进',
    'scope-confirmation': '确认范围与边界',
    'commercial-closure': '收口商务条件',
    contracting: '完成合同签署',
    handover: '移交经营依据',
    execution: '进入正式执行',
    acceptance: '完成验收确认',
    completed: '项目完成归档'
};

@Component({
    selector: 'app-project-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, TagModule, ButtonModule, InputTextModule, DialogModule, ProjectContextHeader, ProjectLifecycleTimeline, WorkspaceFeedback, WorkspaceLoading],
    providers: [ProjectStore],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取项目详情" />
        } @else if (project(); as project) {
            <div class="flex flex-col gap-6">
                <app-project-context-header
                    eyebrow="项目详情"
                    [title]="project.projectName"
                    [subtitle]="projectSubtitle(project)"
                    [stageLabel]="getStageName(project.stageSummary.currentStage)"
                    [stageSeverity]="getStageSeverity(project.stageSummary.currentStage)"
                    [statusLabel]="getStatusName(project.stageSummary.status)"
                    [statusSeverity]="getStatusSeverity(project.stageSummary.status)"
                    backLabel="返回项目列表"
                    (back)="goBack()"
                >
                    <ng-template #actions>
                        <div class="flex flex-wrap items-center gap-2">
                            @if (canOpenWorkspace(project)) {
                                <p-button label="项目工作区" icon="pi pi-sitemap" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="goToWorkspace()" />
                            }
                            @if (canManageCommission(project)) {
                                <p-button label="提成操作" icon="pi pi-wallet" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="goToCommission()" />
                            }
                            @if (canEdit(project)) {
                                <p-button label="编辑基本信息" icon="pi pi-pencil" severity="primary" styleClass="rounded-md!" (onClick)="showEditDialog()" />
                            }
                        </div>
                    </ng-template>

                    @if (availableActionCount(project) === 0) {
                        <app-workspace-feedback class="mt-4 block" severity="secondary" summary="当前账号只能查看项目详情" detail="暂无可操作入口。" />
                    }
                </app-project-context-header>

                <app-project-lifecycle-timeline [items]="lifecycleItems(project)" />

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">负责人</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(project.ownerName, '待指定') }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">归属组织</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(project.ownerOrgName, '待归属组织') }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">预计签约</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.stageSummary.plannedSignAt ? (project.stageSummary.plannedSignAt | date: 'yyyy-MM-dd') : '待确认' }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">资料更新时间</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section-card>
                        <ng-template #title>当前阶段</ng-template>
                        <ng-template #description>先看项目停在哪个阶段，以及是否存在明确阻断。</ng-template>

                        <div class="mt-4 flex flex-col gap-4">
                            <div class="flex flex-wrap gap-2">
                                <p-tag [value]="getStageName(project.stageSummary.currentStage)" [severity]="getStageSeverity(project.stageSummary.currentStage)" styleClass="rounded-[6px]!" />
                                <p-tag [value]="getStatusName(project.stageSummary.status)" [severity]="getStatusSeverity(project.stageSummary.status)" styleClass="rounded-[6px]!" />
                            </div>

                            @if (project.stageSummary.blockingReasons.length > 0) {
                                <div class="flex flex-col gap-2">
                                    @for (reason of project.stageSummary.blockingReasons; track reason) {
                                        <div class="rounded-[8px] border border-orange-200 bg-orange-50 px-3 py-2 text-sm leading-6 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-200">
                                            {{ getBlockingReason(reason) }}
                                        </div>
                                    }
                                </div>
                            } @else {
                                <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm leading-6 text-surface-600 dark:border-surface-700 dark:text-surface-300">
                                    当前没有记录阻断原因。
                                </div>
                            }

                            @if (project.stageSummary.closedReason) {
                                <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm leading-6 text-surface-600 dark:border-surface-700 dark:text-surface-300">
                                    关闭原因：{{ project.stageSummary.closedReason }}
                                </div>
                            }
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>合同情况</ng-template>
                        <ng-template #description>这里展示当前项目已经形成的正式合同事实。</ng-template>

                        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">正式合同数量</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.currentContractSummary.activeContractCount }}</div>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">最近合同</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(project.currentContractSummary.latestContractNo, '暂未形成正式合同') }}</div>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">合同状态</div>
                                @if (project.currentContractSummary.latestContractStatus) {
                                    <p-tag
                                        [value]="getContractStatusName(project.currentContractSummary.latestContractStatus)"
                                        [severity]="getContractStatusSeverity(project.currentContractSummary.latestContractStatus)"
                                        styleClass="mt-1 rounded-[6px]!"
                                    />
                                } @else {
                                    <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">待形成</div>
                                }
                            </div>
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">签约金额</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ formatAmount(project.currentContractSummary.signedAmount, project.currentContractSummary.currencyCode) }}</div>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700 sm:col-span-2">
                                <div class="text-xs text-surface-500 dark:text-surface-400">签约时间</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.currentContractSummary.signedAt ? (project.currentContractSummary.signedAt | date: 'yyyy-MM-dd') : '待确认' }}</div>
                            </div>
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>审批依据</ng-template>
                        <ng-template #description>这里展示项目详情当前可追溯到的审批摘要。</ng-template>

                        <div class="mt-4 flex flex-col gap-3">
                            @if (hasApprovalSummary(project)) {
                                <div class="rounded-[8px] border border-green-200 bg-green-50 px-3 py-2 text-sm leading-6 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-200">
                                    审批摘要已形成，当前详情可追溯到正式依据。
                                </div>
                                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                        <div class="text-xs text-surface-500 dark:text-surface-400">依据编号</div>
                                        <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ shortId(project.currentApprovalSummary.summarySnapshotId) }}</div>
                                    </div>
                                    <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                        <div class="text-xs text-surface-500 dark:text-surface-400">形成时间</div>
                                        <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.currentApprovalSummary.generatedAt ? (project.currentApprovalSummary.generatedAt | date: 'yyyy-MM-dd HH:mm') : '待确认' }}</div>
                                    </div>
                                </div>
                            } @else {
                                <div class="rounded-[8px] border border-surface-200 px-3 py-2 text-sm leading-6 text-surface-600 dark:border-surface-700 dark:text-surface-300">
                                    暂无审批摘要。
                                </div>
                            }
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>确认情况</ng-template>
                        <ng-template #description>这里展示项目确认记录是否已经形成。</ng-template>

                        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700 sm:col-span-3">
                                <div class="text-xs text-surface-500 dark:text-surface-400">确认状态</div>
                                <p-tag
                                    [value]="getConfirmationStatusName(project.currentConfirmationSummary.status)"
                                    [severity]="getConfirmationStatusSeverity(project.currentConfirmationSummary.status)"
                                    styleClass="mt-1 rounded-[6px]!"
                                />
                            </div>
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">需要确认</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.currentConfirmationSummary.requiredCount }}</div>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">已确认</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.currentConfirmationSummary.confirmedCount }}</div>
                            </div>
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">待确认</div>
                                <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.currentConfirmationSummary.pendingCount }}</div>
                            </div>
                        </div>
                    </section-card>
                </div>

                <section-card>
                    <ng-template #title>投标信息</ng-template>
                    <ng-template #description>只展示已经接入的正式投标事实，不用项目字段倒推出投标结论。</ng-template>

                    <div class="mt-4 rounded-[8px] border border-surface-200 px-3 py-2 text-sm leading-6 text-surface-600 dark:border-surface-700 dark:text-surface-300">
                        @if (project.currentBidSummary.bidStatus === 'not_configured') {
                            投标详情暂未接入正式事实源。
                        } @else {
                            {{ displayText(project.currentBidSummary.summary, '当前暂无投标摘要。') }}
                        }
                    </div>
                </section-card>
            </div>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑项目基本信息" [style]="{ width: 'min(32rem, 92vw)' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-2">
                    @if (editError) {
                        <div class="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                            {{ editError }}
                        </div>
                    }

                    <div class="flex flex-col gap-2">
                        <label for="editProjectName" class="text-sm font-medium text-surface-900 dark:text-surface-0">项目名称</label>
                        <input pInputText id="editProjectName" [(ngModel)]="editForm.projectName" class="w-full rounded-md!" />
                        @if (editAttempted && !editForm.projectName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写项目名称。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="editCustomerName" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户名称</label>
                        <input pInputText id="editCustomerName" [(ngModel)]="editForm.customerName" class="w-full rounded-md!" placeholder="可留空" />
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeEditDialog()" />
                        <p-button label="保存" [loading]="saving()" styleClass="rounded-md!" (onClick)="saveProject()" />
                    </div>
                </ng-template>
            </p-dialog>
        } @else {
            <div class="py-20 text-center">
                <i class="pi pi-exclamation-triangle mb-3 block text-4xl text-surface-300 dark:text-surface-600"></i>
                <p class="text-surface-500 dark:text-surface-400">项目未找到</p>
                <p-button label="返回项目列表" icon="pi pi-arrow-left" [text]="true" (onClick)="goBack()" styleClass="mt-4 rounded-md!" />
            </div>
        }
    `
})
export class ProjectDetail implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #projectStore = inject(ProjectStore);

    readonly project = this.#projectStore.selectedProject;
    readonly loading = this.#projectStore.loading;
    readonly saving = this.#projectStore.saving;

    editDialogVisible = false;
    editAttempted = false;
    editError: string | null = null;
    editForm: EditProjectForm = { customerName: '', projectName: '' };

    ngOnInit() {
        const id = this.#route.snapshot.paramMap.get('id');
        if (id) {
            void this.#projectStore.loadProject(id);
        }
    }

    goBack() {
        this.#router.navigate(['/projects']);
    }

    goToCommission() {
        const project = this.project();
        if (project && this.canManageCommission(project)) {
            this.#router.navigate(['/projects', project.id, 'commission', 'operations']);
        }
    }

    goToWorkspace() {
        const project = this.project();
        if (project && this.canOpenWorkspace(project)) {
            this.#router.navigate(['/projects', project.id, 'workspace']);
        }
    }

    showEditDialog() {
        const project = this.project();
        if (!project || !this.canEdit(project)) {
            return;
        }

        this.editForm = {
            customerName: project.customerName ?? '',
            projectName: project.projectName
        };
        this.editAttempted = false;
        this.editError = null;
        this.editDialogVisible = true;
    }

    closeEditDialog() {
        this.editDialogVisible = false;
        this.editError = null;
    }

    async saveProject() {
        const project = this.project();
        if (!project || !this.canEdit(project)) {
            return;
        }

        this.editAttempted = true;
        const projectName = this.editForm.projectName.trim();
        if (!projectName) {
            return;
        }

        const customerName = this.editForm.customerName.trim();

        try {
            await this.#projectStore.updateProject(project.id, {
                projectName,
                customerName: customerName || null
            });
            this.closeEditDialog();
        } catch {
            this.editError = '项目基本信息没有保存成功，请稍后重试。';
        }
    }

    canOpenWorkspace(project: ProjectDetailView): boolean {
        return project.allowedActions.includes(PROJECT_ACTIONS.viewWorkspace);
    }

    canEdit(project: ProjectDetailView): boolean {
        return project.allowedActions.includes(PROJECT_ACTIONS.editBasicInfo);
    }

    canManageCommission(project: ProjectDetailView): boolean {
        return project.allowedActions.includes(PROJECT_ACTIONS.manageCommission);
    }

    availableActionCount(project: ProjectDetailView): number {
        return [this.canOpenWorkspace(project), this.canEdit(project), this.canManageCommission(project)].filter(Boolean).length;
    }

    hasApprovalSummary(project: ProjectDetailView): boolean {
        return Boolean(project.currentApprovalSummary.summarySnapshotId);
    }

    displayText(value: string | null | undefined, fallback: string): string {
        return value?.trim() ? value : fallback;
    }

    projectSubtitle(project: ProjectDetailView): string {
        return `${project.projectCode} · ${this.displayText(project.customerName, '待补充客户')}`;
    }

    lifecycleItems(project: ProjectDetailView): ProjectLifecycleTimelineItem[] {
        const currentStage = project.stageSummary.currentStage;
        const currentIndex = PROJECT_LIFECYCLE_STAGES.findIndex((stage) => stage === currentStage);
        const isBlocked = project.stageSummary.status === 'blocked' || project.stageSummary.blockingReasons.length > 0;

        return PROJECT_LIFECYCLE_STAGES.map((stage, index) => {
            let state: ProjectLifecycleTimelineItem['state'] = 'pending';

            if (currentIndex === -1) {
                state = 'pending';
            } else if (index < currentIndex) {
                state = 'done';
            } else if (index === currentIndex) {
                state = isBlocked ? 'blocked' : 'current';
            }

            return {
                key: stage,
                label: this.getStageName(stage),
                description: PROJECT_LIFECYCLE_DESCRIPTIONS[stage],
                state,
                severity: stage === currentStage ? this.getStageSeverity(stage) : undefined
            };
        });
    }

    shortId(value: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        return value.length > 8 ? value.slice(0, 8) : value;
    }

    formatAmount(value: string | null | undefined, currencyCode: string | null | undefined): string {
        if (value === null || value === undefined || value === '') {
            return '待确认';
        }

        const parsed = Number(value);
        const amount = Number.isFinite(parsed)
            ? parsed.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
              })
            : value;

        return currencyCode ? `${amount} ${currencyCode}` : amount;
    }

    getBlockingReason(reason: string): string {
        return BLOCKING_REASON_LABELS[reason] ?? '项目当前存在待处理事项。';
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

    getContractStatusName(status: string): string {
        return CONTRACT_STATUS_LABELS[status] ?? status;
    }

    getContractStatusSeverity(status: string): UiTagSeverity {
        return CONTRACT_STATUS_SEVERITIES[status] ?? 'secondary';
    }

    getConfirmationStatusName(status: string): string {
        return CONFIRMATION_STATUS_LABELS[status] ?? status;
    }

    getConfirmationStatusSeverity(status: string): UiTagSeverity {
        return CONFIRMATION_STATUS_SEVERITIES[status] ?? 'secondary';
    }
}
