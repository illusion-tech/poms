import { CommonModule, formatDate } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore, ProjectStore, type ProjectArchiveRecordSummary, type ProjectDetailView, type ProjectTimelineView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ProjectContextHeader } from '../../shared/ui/project-context-header';
import { ProjectLifecycleTimeline, type ProjectLifecycleTimelineItem } from '../../shared/ui/project-lifecycle-timeline';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';

type UiTagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined;

interface EditProjectForm {
    customerName: string;
    customerProjectNo: string;
    projectName: string;
}

interface ReplaceArchiveForm {
    archivedAt: string;
    archiveSummary: string;
    evidenceSummary: string;
    replacementReason: string;
}

interface CreateArchiveForm {
    archivedAt: string;
    archiveSummary: string;
    evidenceSummary: string;
}

interface VoidArchiveForm {
    reason: string;
    comment: string;
}

const PROJECT_ACTIONS = {
    editBasicInfo: 'edit-project-basic-info',
    manageCommission: 'manage-project-commission',
    viewWorkspace: 'view-project-workspace'
} as const;

const PROJECT_ARCHIVE_ACTIONS = {
    replace: 'replace-project-archive-record',
    void: 'void-project-archive-record'
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

const ARCHIVE_STATUS_LABELS: Record<string, string> = {
    recorded: '当前有效',
    voided: '已撤销',
    superseded: '已被替代'
};

const ARCHIVE_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    recorded: 'success',
    voided: 'danger',
    superseded: 'warn'
};

const BLOCKING_REASON_LABELS: Record<string, string> = {
    'project-status-blocked': '项目被标记为阻塞，需先处理阻断事项。',
    'project-closed': '项目已关闭，不能继续推进。'
};

const PROJECT_LIFECYCLE_STAGES = ['assessment', 'scope-confirmation', 'commercial-closure', 'contracting', 'handover', 'execution', 'acceptance', 'completed'] as const;
const PROJECT_TERMINAL_STAGES = ['completed', 'closed-lost', 'closed-terminated'] as const;

type ProjectLifecycleStage = (typeof PROJECT_LIFECYCLE_STAGES)[number];
type ProjectTerminalStage = (typeof PROJECT_TERMINAL_STAGES)[number];
type ProjectTimelineEvent = ProjectTimelineView['events'][number];

interface ProjectArchivePanelView {
    actorName: string;
    evidenceLabel: string;
    occurredAtLabel: string;
    resultLabel: string;
    stage: ProjectTerminalStage;
}

const PROJECT_LIFECYCLE_DESCRIPTIONS: Record<(typeof PROJECT_LIFECYCLE_STAGES)[number], string> = {
    assessment: '判断是否继续推进',
    'scope-confirmation': '确认范围与边界',
    'commercial-closure': '收口商务条件',
    contracting: '完成合同签署',
    handover: '移交经营依据',
    execution: '进入正式执行',
    acceptance: '完成验收确认',
    completed: '形成业务完成结论'
};

@Component({
    selector: 'app-project-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, TagModule, ButtonModule, InputTextModule, DialogModule, TextareaModule, ProjectContextHeader, ProjectLifecycleTimeline, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
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

                @if (timelineError(); as error) {
                    <app-workspace-feedback severity="warn" summary="阶段完成时间暂时不可用" [detail]="error" />
                }

                <app-project-lifecycle-timeline [items]="lifecycleItems(project, projectTimeline())" />

                @if (project.sourceLeadSummary; as sourceLead) {
                    <section-card>
                        <ng-template #title>来源线索</ng-template>
                        <ng-template #description>项目由已确认有效的线索转入，客户、负责人和推进口径可继续追溯。</ng-template>

                        <div class="mt-4 flex flex-col gap-4">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400">{{ sourceLead.leadNo }}</div>
                                    <div class="mt-1 text-base font-semibold text-surface-950 dark:text-surface-0">{{ sourceLead.leadName }}</div>
                                    <div class="mt-1 text-sm text-surface-600 dark:text-surface-300">{{ sourceLead.customerName }}</div>
                                </div>
                                <p-tag [value]="getLeadStatusName(sourceLead.status)" [severity]="getLeadStatusSeverity(sourceLead.status)" styleClass="rounded-[6px]!" />
                            </div>

                            <p-button label="查看线索列表" icon="pi pi-compass" severity="secondary" [outlined]="true" styleClass="w-full sm:w-auto rounded-md!" (onClick)="goToLeads()" />
                        </div>
                    </section-card>
                }

                @if (isTerminalStage(project.stageSummary.currentStage)) {
                    <section-card>
                        <ng-template #title>项目归档</ng-template>
                        <ng-template #description>终态项目的归档事实和后续修正记录独立呈现，不占用生命周期主线节点。</ng-template>

                        @if (archiveRecordsError(); as error) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="归档记录暂时不可用" [detail]="error" />
                        } @else if (loadingArchiveRecords()) {
                            <app-workspace-loading class="mt-4 block" label="正在读取归档记录" />
                        } @else if (currentArchiveRecord(archiveRecords()); as archiveRecord) {
                            <div class="mt-4 flex flex-wrap items-center gap-2">
                                <p-tag value="已形成归档记录" severity="contrast" styleClass="rounded-[6px]!" />
                                <p-tag [value]="getArchiveStatusName(archiveRecord.status)" [severity]="getArchiveStatusSeverity(archiveRecord.status)" styleClass="rounded-[6px]!" />
                                <p-tag [value]="getStageName(archiveRecord.archiveAnchorStage)" [severity]="getStageSeverity(archiveRecord.archiveAnchorStage)" styleClass="rounded-[6px]!" />
                            </div>

                            <div class="mt-4 rounded-[8px] border border-surface-200 px-4 py-3 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">归档结论</div>
                                <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ archiveRecord.archiveSummary }}</div>
                            </div>

                            <app-workspace-fact-grid class="mt-4 block" [items]="archiveRecordFactItems(archiveRecord)" [columns]="4" />

                            @if (canReplaceArchiveRecord(archiveRecord) || canVoidArchiveRecord(archiveRecord)) {
                                <div class="mt-4 flex flex-wrap gap-2">
                                    @if (canReplaceArchiveRecord(archiveRecord)) {
                                        <p-button label="替代归档" icon="pi pi-refresh" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="openReplaceArchiveDialog(archiveRecord)" />
                                    }
                                    @if (canVoidArchiveRecord(archiveRecord)) {
                                        <p-button label="撤销归档" icon="pi pi-ban" severity="danger" [outlined]="true" styleClass="rounded-md!" (onClick)="openVoidArchiveDialog(archiveRecord)" />
                                    }
                                </div>
                            } @else {
                                <app-workspace-feedback class="mt-4 block" severity="secondary" summary="当前账号不能维护归档记录" detail="如需修正归档，请联系具备项目维护权限的负责人处理。" />
                            }
                        } @else if (archiveRecords().length > 0) {
                            <app-workspace-feedback class="mt-4 block" severity="info" summary="当前没有有效归档记录" detail="历史归档已被撤销或替代，当前项目仍需形成新的有效归档记录。" />
                            @if (canCreateArchiveRecord(project)) {
                                <div class="mt-4">
                                    <p-button label="创建归档记录" icon="pi pi-plus" styleClass="rounded-md!" (onClick)="openCreateArchiveDialog(project)" />
                                </div>
                            } @else {
                                <app-workspace-feedback class="mt-4 block" severity="secondary" summary="当前账号不能创建归档记录" detail="如需形成新的有效归档，请联系具备项目维护权限的负责人处理。" />
                            }
                        } @else if (timelineError()) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="归档事实暂时不可用" detail="时间线读取失败，当前无法判断是否已经形成正式归档记录。" />
                            @if (canCreateArchiveRecord(project)) {
                                <div class="mt-4">
                                    <p-button label="创建归档记录" icon="pi pi-plus" styleClass="rounded-md!" (onClick)="openCreateArchiveDialog(project)" />
                                </div>
                            }
                        } @else if (archiveSummary(project, projectTimeline()); as archive) {
                            <div class="mt-4 flex flex-wrap items-center gap-2">
                                <p-tag value="已形成归档记录" severity="contrast" styleClass="rounded-[6px]!" />
                                <p-tag [value]="getStageName(archive.stage)" [severity]="getStageSeverity(archive.stage)" styleClass="rounded-[6px]!" />
                            </div>

                            <div class="mt-4 rounded-[8px] border border-surface-200 px-4 py-3 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">归档结论</div>
                                <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ archive.resultLabel }}</div>
                            </div>

                            <app-workspace-fact-grid class="mt-4 block" [items]="archiveFactItems(archive)" [columns]="4" />
                        } @else {
                            <app-workspace-feedback class="mt-4 block" severity="secondary" summary="尚未形成归档记录" [detail]="archiveGapDetail(project)" />
                            @if (canCreateArchiveRecord(project)) {
                                <div class="mt-4">
                                    <p-button label="创建归档记录" icon="pi pi-plus" styleClass="rounded-md!" (onClick)="openCreateArchiveDialog(project)" />
                                </div>
                            } @else {
                                <app-workspace-feedback class="mt-4 block" severity="secondary" summary="当前账号不能创建归档记录" detail="如需形成正式归档，请联系具备项目维护权限的负责人处理。" />
                            }
                        }

                        @if (!archiveRecordsError() && archiveRecords().length > 0) {
                            <div class="mt-6 border-t border-surface-200 pt-4 dark:border-surface-700">
                                <div class="flex flex-col gap-1">
                                    <div class="text-sm font-semibold text-surface-950 dark:text-surface-0">归档历史</div>
                                    <div class="text-xs text-surface-500 dark:text-surface-400">按服务端审计顺序展示，不在前端改写状态。</div>
                                </div>

                                <div class="mt-3 flex flex-col divide-y divide-surface-200 rounded-[8px] border border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                                    @for (record of archiveRecords(); track record.id) {
                                        <div class="flex flex-col gap-3 px-4 py-3">
                                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ record.archiveSummary }}</div>
                                                    <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">归档时间 {{ formatDateTime(record.archivedAt) }} · {{ displayText(record.archivedByName, '待确认操作人') }}</div>
                                                </div>
                                                <div class="flex flex-wrap gap-2">
                                                    <p-tag [value]="getArchiveStatusName(record.status)" [severity]="getArchiveStatusSeverity(record.status)" styleClass="rounded-[6px]!" />
                                                    <p-tag [value]="getStageName(record.archiveAnchorStage)" [severity]="getStageSeverity(record.archiveAnchorStage)" styleClass="rounded-[6px]!" />
                                                </div>
                                            </div>

                                            <div class="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                                <div>
                                                    <span class="text-surface-500 dark:text-surface-400">证据摘要：</span>
                                                    <span class="font-medium text-surface-800 dark:text-surface-100">{{ displayText(record.evidenceSummary, '待补充') }}</span>
                                                </div>
                                                @if (record.replacementReason) {
                                                    <div>
                                                        <span class="text-surface-500 dark:text-surface-400">替代原因：</span>
                                                        <span class="font-medium text-surface-800 dark:text-surface-100">{{ record.replacementReason }}</span>
                                                    </div>
                                                }
                                                @if (record.voidReason) {
                                                    <div>
                                                        <span class="text-surface-500 dark:text-surface-400">撤销原因：</span>
                                                        <span class="font-medium text-surface-800 dark:text-surface-100">{{ record.voidReason }}</span>
                                                    </div>
                                                }
                                                @if (record.voidedAt) {
                                                    <div>
                                                        <span class="text-surface-500 dark:text-surface-400">撤销记录：</span>
                                                        <span class="font-medium text-surface-800 dark:text-surface-100">{{ formatDateTime(record.voidedAt) }} · {{ displayText(record.voidedByName, '待确认操作人') }}</span>
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    </section-card>
                }

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">POMS 项目编号</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ project.projectNo }}</div>
                    </div>
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-sm text-surface-500 dark:text-surface-400">客户项目编号</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ displayText(project.customerProjectNo, '未提供') }}</div>
                    </div>
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
                                        <app-workspace-feedback severity="warn" summary="存在阻断原因" [detail]="getBlockingReason(reason)" />
                                    }
                                </div>
                            } @else {
                                <app-workspace-feedback severity="secondary" summary="当前没有记录阻断原因" detail="后续阶段可继续依据当前状态推进。" />
                            }

                            @if (project.stageSummary.closedReason) {
                                <app-workspace-feedback severity="info" summary="关闭原因" [detail]="project.stageSummary.closedReason" />
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
                                <app-workspace-feedback severity="success" summary="审批摘要已形成" detail="当前详情可追溯到正式依据。" />
                                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                        <div class="text-xs text-surface-500 dark:text-surface-400">依据编号</div>
                                        <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">{{ shortId(project.currentApprovalSummary.summarySnapshotId) }}</div>
                                    </div>
                                    <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                        <div class="text-xs text-surface-500 dark:text-surface-400">形成时间</div>
                                        <div class="mt-1 text-sm font-medium text-surface-950 dark:text-surface-0">
                                            {{ project.currentApprovalSummary.generatedAt ? (project.currentApprovalSummary.generatedAt | date: 'yyyy-MM-dd HH:mm') : '待确认' }}
                                        </div>
                                    </div>
                                </div>
                            } @else {
                                <app-workspace-feedback severity="secondary" summary="暂无审批摘要" detail="当前项目还没有可追溯的审批摘要。" />
                            }
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>确认情况</ng-template>
                        <ng-template #description>这里展示项目确认记录是否已经形成。</ng-template>

                        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700 sm:col-span-3">
                                <div class="text-xs text-surface-500 dark:text-surface-400">确认状态</div>
                                <p-tag [value]="getConfirmationStatusName(project.currentConfirmationSummary.status)" [severity]="getConfirmationStatusSeverity(project.currentConfirmationSummary.status)" styleClass="mt-1 rounded-[6px]!" />
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

                    @if (project.currentBidSummary.bidStatus === 'not_configured') {
                        <app-workspace-feedback class="mt-4 block" severity="secondary" summary="暂未形成正式投标事实" detail="当前详情不会用项目字段倒推出投标结论。" />
                    } @else {
                        <div class="mt-4 rounded-[8px] border border-surface-200 px-3 py-2 text-sm leading-6 text-surface-600 dark:border-surface-700 dark:text-surface-300">
                            {{ displayText(project.currentBidSummary.summary, '当前暂无投标摘要。') }}
                        </div>
                    }
                </section-card>
            </div>

            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑项目基本信息" [style]="{ width: 'min(32rem, 92vw)' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-2">
                    @if (editError) {
                        <app-workspace-feedback severity="error" summary="保存失败" [detail]="editError" />
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

                    <div class="flex flex-col gap-2">
                        <label for="editCustomerProjectNo" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户项目编号</label>
                        <input pInputText id="editCustomerProjectNo" [(ngModel)]="editForm.customerProjectNo" class="w-full rounded-md!" placeholder="客户或甲方项目编号，可留空" />
                        <span class="text-xs text-surface-500 dark:text-surface-400">POMS 项目编号由系统生成，不在这里修改。</span>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeEditDialog()" />
                        <p-button label="保存" [loading]="saving()" styleClass="rounded-md!" (onClick)="saveProject()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="createArchiveDialogVisible" [modal]="true" header="创建归档记录" [style]="{ width: 'min(36rem, 92vw)' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-2">
                    @if (createArchiveError) {
                        <app-workspace-feedback severity="error" summary="创建归档失败" [detail]="createArchiveError" />
                    }

                    <app-workspace-feedback severity="info" summary="创建后将形成当前有效归档" detail="系统会以服务端项目终态事实作为归档锚点，前端不手动选择生命周期阶段。" />

                    <div class="flex flex-col gap-2">
                        <label for="createArchiveAt" class="text-sm font-medium text-surface-900 dark:text-surface-0">归档时间</label>
                        <input pInputText id="createArchiveAt" type="datetime-local" [(ngModel)]="createArchiveForm.archivedAt" class="w-full rounded-md!" />
                        @if (createArchiveAttempted && !createArchiveForm.archivedAt.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写归档时间。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="createArchiveSummary" class="text-sm font-medium text-surface-900 dark:text-surface-0">归档结论</label>
                        <textarea pTextarea id="createArchiveSummary" [(ngModel)]="createArchiveForm.archiveSummary" rows="4" class="w-full rounded-md!" placeholder="说明本次归档结论。"></textarea>
                        @if (createArchiveAttempted && !createArchiveForm.archiveSummary.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写归档结论。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="createArchiveEvidence" class="text-sm font-medium text-surface-900 dark:text-surface-0">证据摘要</label>
                        <textarea pTextarea id="createArchiveEvidence" [(ngModel)]="createArchiveForm.evidenceSummary" rows="3" class="w-full rounded-md!" placeholder="说明本次归档依据。"></textarea>
                        @if (createArchiveAttempted && !createArchiveForm.evidenceSummary.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写证据摘要。</span>
                        }
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeCreateArchiveDialog()" />
                        <p-button label="提交归档" [loading]="savingArchiveCommand()" styleClass="rounded-md!" (onClick)="createArchiveRecord()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="replaceArchiveDialogVisible" [modal]="true" header="替代归档记录" [style]="{ width: 'min(36rem, 92vw)' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-2">
                    @if (replaceArchiveError) {
                        <app-workspace-feedback severity="error" summary="替代归档失败" [detail]="replaceArchiveError" />
                    }

                    <div class="flex flex-col gap-2">
                        <label for="replaceArchiveAt" class="text-sm font-medium text-surface-900 dark:text-surface-0">归档时间</label>
                        <input pInputText id="replaceArchiveAt" type="datetime-local" [(ngModel)]="replaceArchiveForm.archivedAt" class="w-full rounded-md!" />
                        @if (replaceArchiveAttempted && !replaceArchiveForm.archivedAt.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写归档时间。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="replaceArchiveSummary" class="text-sm font-medium text-surface-900 dark:text-surface-0">归档结论</label>
                        <textarea pTextarea id="replaceArchiveSummary" [(ngModel)]="replaceArchiveForm.archiveSummary" rows="4" class="w-full rounded-md!" placeholder="说明新的归档结论。"></textarea>
                        @if (replaceArchiveAttempted && !replaceArchiveForm.archiveSummary.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写归档结论。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="replaceArchiveEvidence" class="text-sm font-medium text-surface-900 dark:text-surface-0">证据摘要</label>
                        <textarea pTextarea id="replaceArchiveEvidence" [(ngModel)]="replaceArchiveForm.evidenceSummary" rows="3" class="w-full rounded-md!" placeholder="说明本次归档依据。"></textarea>
                        @if (replaceArchiveAttempted && !replaceArchiveForm.evidenceSummary.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写证据摘要。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="replaceArchiveReason" class="text-sm font-medium text-surface-900 dark:text-surface-0">替代原因</label>
                        <textarea pTextarea id="replaceArchiveReason" [(ngModel)]="replaceArchiveForm.replacementReason" rows="3" class="w-full rounded-md!" placeholder="说明为什么需要替代当前归档记录。"></textarea>
                        @if (replaceArchiveAttempted && !replaceArchiveForm.replacementReason.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写替代原因。</span>
                        }
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeReplaceArchiveDialog()" />
                        <p-button label="提交替代" [loading]="savingArchiveCommand()" styleClass="rounded-md!" (onClick)="replaceArchiveRecord()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="voidArchiveDialogVisible" [modal]="true" header="撤销归档记录" [style]="{ width: 'min(34rem, 92vw)' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-2">
                    @if (voidArchiveError) {
                        <app-workspace-feedback severity="error" summary="撤销归档失败" [detail]="voidArchiveError" />
                    }

                    <app-workspace-feedback severity="warn" summary="撤销后当前项目将没有有效归档记录" detail="系统会保留原记录和撤销审计，不会删除历史。" />

                    <div class="flex flex-col gap-2">
                        <label for="voidArchiveReason" class="text-sm font-medium text-surface-900 dark:text-surface-0">撤销原因</label>
                        <textarea pTextarea id="voidArchiveReason" [(ngModel)]="voidArchiveForm.reason" rows="4" class="w-full rounded-md!" placeholder="说明为什么撤销当前归档记录。"></textarea>
                        @if (voidArchiveAttempted && !voidArchiveForm.reason.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写撤销原因。</span>
                        }
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="voidArchiveComment" class="text-sm font-medium text-surface-900 dark:text-surface-0">补充说明</label>
                        <textarea pTextarea id="voidArchiveComment" [(ngModel)]="voidArchiveForm.comment" rows="3" class="w-full rounded-md!" placeholder="可补充处理背景，非必填。"></textarea>
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="closeVoidArchiveDialog()" />
                        <p-button label="确认撤销" severity="danger" [loading]="savingArchiveCommand()" styleClass="rounded-md!" (onClick)="voidArchiveRecord()" />
                    </div>
                </ng-template>
            </p-dialog>
        } @else {
            <div class="py-20 text-center">
                <app-workspace-feedback severity="warn" summary="项目未找到" detail="请返回项目列表重新选择项目。" />
                <p-button label="返回项目列表" icon="pi pi-arrow-left" [text]="true" (onClick)="goBack()" styleClass="mt-4 rounded-md!" />
            </div>
        }
    `
})
export class ProjectDetail implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #projectStore = inject(ProjectStore);
    readonly #authStore = inject(AuthStore);

    readonly project = this.#projectStore.selectedProject;
    readonly projectTimeline = this.#projectStore.selectedProjectTimeline;
    readonly archiveRecords = this.#projectStore.selectedProjectArchiveRecords;
    readonly loading = this.#projectStore.loading;
    readonly saving = this.#projectStore.saving;
    readonly loadingArchiveRecords = this.#projectStore.loadingArchiveRecords;
    readonly savingArchiveCommand = this.#projectStore.savingArchiveCommand;
    readonly timelineError = this.#projectStore.timelineError;
    readonly archiveRecordsError = this.#projectStore.archiveRecordsError;

    editDialogVisible = false;
    editAttempted = false;
    editError: string | null = null;
    editForm: EditProjectForm = { customerName: '', customerProjectNo: '', projectName: '' };
    createArchiveDialogVisible = false;
    createArchiveAttempted = false;
    createArchiveError: string | null = null;
    createArchiveForm: CreateArchiveForm = {
        archivedAt: '',
        archiveSummary: '',
        evidenceSummary: ''
    };
    replaceArchiveDialogVisible = false;
    replaceArchiveAttempted = false;
    replaceArchiveError: string | null = null;
    replaceArchiveTarget: ProjectArchiveRecordSummary | null = null;
    replaceArchiveForm: ReplaceArchiveForm = {
        archivedAt: '',
        archiveSummary: '',
        evidenceSummary: '',
        replacementReason: ''
    };
    voidArchiveDialogVisible = false;
    voidArchiveAttempted = false;
    voidArchiveError: string | null = null;
    voidArchiveTarget: ProjectArchiveRecordSummary | null = null;
    voidArchiveForm: VoidArchiveForm = { reason: '', comment: '' };

    ngOnInit() {
        const id = this.#route.snapshot.paramMap.get('id');
        if (id) {
            void this.#projectStore.loadProject(id);
            void this.#projectStore.loadProjectTimeline(id).catch(() => undefined);
            void this.#projectStore.loadProjectArchiveRecords(id).catch(() => undefined);
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

    goToLeads() {
        this.#router.navigate(['/leads']);
    }

    showEditDialog() {
        const project = this.project();
        if (!project || !this.canEdit(project)) {
            return;
        }

        this.editForm = {
            customerName: project.customerName ?? '',
            customerProjectNo: project.customerProjectNo ?? '',
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
        const customerProjectNo = this.editForm.customerProjectNo.trim();

        try {
            await this.#projectStore.updateProject(project.id, {
                projectName,
                customerName: customerName || null,
                customerProjectNo: customerProjectNo || null
            });
            this.closeEditDialog();
        } catch {
            this.editError = '项目基本信息没有保存成功，请稍后重试。';
        }
    }

    openCreateArchiveDialog(project: ProjectDetailView) {
        if (!this.canCreateArchiveRecord(project)) {
            return;
        }

        this.createArchiveForm = {
            archivedAt: this.toDateTimeInputValue(new Date().toISOString()),
            archiveSummary: '',
            evidenceSummary: ''
        };
        this.createArchiveAttempted = false;
        this.createArchiveError = null;
        this.createArchiveDialogVisible = true;
    }

    closeCreateArchiveDialog() {
        this.createArchiveDialogVisible = false;
        this.createArchiveError = null;
    }

    async createArchiveRecord() {
        const project = this.project();
        if (!project || !this.canCreateArchiveRecord(project)) {
            return;
        }

        this.createArchiveAttempted = true;
        const archivedAt = this.normalizeDateTimeInput(this.createArchiveForm.archivedAt);
        const archiveSummary = this.createArchiveForm.archiveSummary.trim();
        const evidenceSummary = this.createArchiveForm.evidenceSummary.trim();

        if (!archivedAt || !archiveSummary || !evidenceSummary) {
            if (!archivedAt && this.createArchiveForm.archivedAt.trim()) {
                this.createArchiveError = '归档时间格式不正确，请重新选择。';
            }
            return;
        }

        try {
            await this.#projectStore.createProjectArchiveRecord(project.id, {
                archivedAt,
                archiveSummary,
                evidenceSummary
            });
            this.closeCreateArchiveDialog();
        } catch {
            this.createArchiveError = '归档记录没有创建成功，请确认项目是否已具备有效终态事实后重试。';
        }
    }

    openReplaceArchiveDialog(record: ProjectArchiveRecordSummary) {
        const project = this.project();
        if (!project || !this.canReplaceArchiveRecord(record)) {
            return;
        }

        this.replaceArchiveTarget = record;
        this.replaceArchiveForm = {
            archivedAt: this.toDateTimeInputValue(record.archivedAt),
            archiveSummary: record.archiveSummary,
            evidenceSummary: record.evidenceSummary,
            replacementReason: ''
        };
        this.replaceArchiveAttempted = false;
        this.replaceArchiveError = null;
        this.replaceArchiveDialogVisible = true;
    }

    closeReplaceArchiveDialog() {
        this.replaceArchiveDialogVisible = false;
        this.replaceArchiveError = null;
        this.replaceArchiveTarget = null;
    }

    async replaceArchiveRecord() {
        const project = this.project();
        const record = this.replaceArchiveTarget;
        if (!project || !record || !this.canReplaceArchiveRecord(record)) {
            return;
        }

        this.replaceArchiveAttempted = true;
        const archivedAt = this.normalizeDateTimeInput(this.replaceArchiveForm.archivedAt);
        const archiveSummary = this.replaceArchiveForm.archiveSummary.trim();
        const evidenceSummary = this.replaceArchiveForm.evidenceSummary.trim();
        const replacementReason = this.replaceArchiveForm.replacementReason.trim();

        if (!archivedAt || !archiveSummary || !evidenceSummary || !replacementReason) {
            if (!archivedAt && this.replaceArchiveForm.archivedAt.trim()) {
                this.replaceArchiveError = '归档时间格式不正确，请重新选择。';
            }
            return;
        }

        try {
            await this.#projectStore.replaceProjectArchiveRecord(record.id, {
                archivedAt,
                archiveSummary,
                evidenceSummary,
                replacementReason,
                expectedVersion: record.rowVersion
            });
            this.closeReplaceArchiveDialog();
        } catch {
            this.replaceArchiveError = '替代归档没有提交成功，请确认记录是否已被其他人更新后重试。';
        }
    }

    openVoidArchiveDialog(record: ProjectArchiveRecordSummary) {
        const project = this.project();
        if (!project || !this.canVoidArchiveRecord(record)) {
            return;
        }

        this.voidArchiveTarget = record;
        this.voidArchiveForm = { reason: '', comment: '' };
        this.voidArchiveAttempted = false;
        this.voidArchiveError = null;
        this.voidArchiveDialogVisible = true;
    }

    closeVoidArchiveDialog() {
        this.voidArchiveDialogVisible = false;
        this.voidArchiveError = null;
        this.voidArchiveTarget = null;
    }

    async voidArchiveRecord() {
        const project = this.project();
        const record = this.voidArchiveTarget;
        if (!project || !record || !this.canVoidArchiveRecord(record)) {
            return;
        }

        this.voidArchiveAttempted = true;
        const reason = this.voidArchiveForm.reason.trim();
        const comment = this.voidArchiveForm.comment.trim();
        if (!reason) {
            return;
        }

        try {
            await this.#projectStore.voidProjectArchiveRecord(record.id, {
                reason,
                comment: comment || null,
                expectedVersion: record.rowVersion
            });
            this.closeVoidArchiveDialog();
        } catch {
            this.voidArchiveError = '撤销归档没有提交成功，请确认记录是否已被其他人更新后重试。';
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

    canCreateArchiveRecord(project: ProjectDetailView): boolean {
        return this.isTerminalStage(project.stageSummary.currentStage) && !this.currentArchiveRecord(this.archiveRecords()) && this.#authStore.hasAnyPermission(['project:write'] as const);
    }

    canReplaceArchiveRecord(record: ProjectArchiveRecordSummary): boolean {
        return record.allowedActions.includes(PROJECT_ARCHIVE_ACTIONS.replace);
    }

    canVoidArchiveRecord(record: ProjectArchiveRecordSummary): boolean {
        return record.allowedActions.includes(PROJECT_ARCHIVE_ACTIONS.void);
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
        return `${project.projectNo} · ${this.displayText(project.customerName, '待补充客户')}`;
    }

    archiveSummary(project: ProjectDetailView, timeline: ProjectTimelineView | null): ProjectArchivePanelView | null {
        const currentStage = project.stageSummary.currentStage;
        if (!this.isTerminalStage(currentStage)) {
            return null;
        }

        const archiveEvent = (timeline?.events ?? [])
            .filter((event) => event.isAuthoritative && event.sourceType === 'project-archive-record' && event.eventType === 'milestone' && event.stage === currentStage)
            .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0];

        if (!archiveEvent) {
            return null;
        }

        return {
            stage: currentStage,
            occurredAtLabel: this.formatTimelineDate(archiveEvent.occurredAt),
            resultLabel: archiveEvent.resultLabel,
            evidenceLabel: this.displayText(archiveEvent.evidenceLabel, '待补充归档依据'),
            actorName: this.displayText(archiveEvent.actorName, '待确认')
        };
    }

    archiveFactItems(archive: ProjectArchivePanelView): WorkspaceFactGridItem[] {
        return [
            {
                label: '归档时间',
                value: archive.occurredAtLabel,
                icon: 'pi pi-calendar',
                emphasis: true
            },
            {
                label: '锚定终态',
                value: this.getStageName(archive.stage),
                severity: this.getStageSeverity(archive.stage),
                icon: 'pi pi-flag'
            },
            {
                label: '操作人',
                value: archive.actorName,
                icon: 'pi pi-user'
            },
            {
                label: '证据摘要',
                value: archive.evidenceLabel,
                icon: 'pi pi-file'
            }
        ];
    }

    currentArchiveRecord(records: ProjectArchiveRecordSummary[]): ProjectArchiveRecordSummary | null {
        return records.find((record) => record.status === 'recorded') ?? null;
    }

    archiveRecordFactItems(record: ProjectArchiveRecordSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '归档时间',
                value: this.formatDateTime(record.archivedAt),
                icon: 'pi pi-calendar',
                emphasis: true
            },
            {
                label: '锚定终态',
                value: this.getStageName(record.archiveAnchorStage),
                severity: this.getStageSeverity(record.archiveAnchorStage),
                icon: 'pi pi-flag'
            },
            {
                label: '操作人',
                value: this.displayText(record.archivedByName, '待确认'),
                icon: 'pi pi-user'
            },
            {
                label: '证据摘要',
                value: this.displayText(record.evidenceSummary, '待补充归档依据'),
                icon: 'pi pi-file'
            }
        ];
    }

    archiveGapDetail(project: ProjectDetailView): string {
        return `项目当前已进入${this.getStageName(project.stageSummary.currentStage)}，但还没有读取到正式归档事实。`;
    }

    lifecycleItems(project: ProjectDetailView, timeline: ProjectTimelineView | null): ProjectLifecycleTimelineItem[] {
        const currentStage = project.stageSummary.currentStage;
        const currentIndex = PROJECT_LIFECYCLE_STAGES.findIndex((stage) => stage === currentStage);
        const isBlocked = project.stageSummary.status === 'blocked' || project.stageSummary.blockingReasons.length > 0;
        const milestoneByStage = this.timelineEventByStage(timeline);

        return PROJECT_LIFECYCLE_STAGES.map((stage, index) => {
            let state: ProjectLifecycleTimelineItem['state'] = 'pending';
            const milestone = milestoneByStage.get(stage);

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
                severity: stage === currentStage ? this.getStageSeverity(stage) : undefined,
                ...this.lifecycleMilestoneDetail(milestone)
            };
        });
    }

    private timelineEventByStage(timeline: ProjectTimelineView | null): Map<ProjectLifecycleStage, ProjectTimelineEvent> {
        const eventsByStage = new Map<ProjectLifecycleStage, ProjectTimelineEvent>();

        for (const event of timeline?.events ?? []) {
            if (!event.isAuthoritative || !this.isLifecycleStage(event.stage)) {
                continue;
            }

            const current = eventsByStage.get(event.stage);
            if (!current || this.shouldReplaceTimelineEvent(current, event)) {
                eventsByStage.set(event.stage, event);
            }
        }

        return eventsByStage;
    }

    private shouldReplaceTimelineEvent(current: ProjectTimelineEvent, candidate: ProjectTimelineEvent): boolean {
        if (current.eventType !== 'stage-completed' && candidate.eventType === 'stage-completed') {
            return true;
        }

        if (current.eventType === candidate.eventType) {
            return candidate.occurredAt.localeCompare(current.occurredAt) > 0;
        }

        return false;
    }

    private lifecycleMilestoneDetail(event: ProjectTimelineEvent | undefined): Partial<ProjectLifecycleTimelineItem> {
        if (!event) {
            return {};
        }

        const occurredAt = this.formatTimelineDate(event.occurredAt);
        const actorText = event.actorName ? `，操作人：${event.actorName}` : '';
        const evidenceText = event.evidenceLabel ? `，依据：${event.evidenceLabel}` : '';

        if (event.eventType === 'stage-completed') {
            return {
                completedAtLabel: occurredAt,
                tooltip: `${event.resultLabel}，完成时间：${occurredAt}${actorText}${evidenceText}`
            };
        }

        return {
            detail: `${event.resultLabel}：${occurredAt}`,
            tooltip: `${event.resultLabel}，时间：${occurredAt}${actorText}${evidenceText}`
        };
    }

    private isLifecycleStage(stage: string): stage is ProjectLifecycleStage {
        return (PROJECT_LIFECYCLE_STAGES as readonly string[]).includes(stage);
    }

    isTerminalStage(stage: string): stage is ProjectTerminalStage {
        return (PROJECT_TERMINAL_STAGES as readonly string[]).includes(stage);
    }

    private formatTimelineDate(value: string): string {
        return formatDate(value, 'yyyy-MM-dd HH:mm', 'en-US');
    }

    formatDateTime(value: string | null | undefined): string {
        return value ? this.formatTimelineDate(value) : '待确认';
    }

    private toDateTimeInputValue(value: string): string {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return '';
        }

        const localTime = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
        return localTime.toISOString().slice(0, 16);
    }

    private normalizeDateTimeInput(value: string): string | null {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed.toISOString();
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

    getLeadStatusName(status: string): string {
        return LEAD_STATUS_LABELS[status] ?? status;
    }

    getLeadStatusSeverity(status: string): UiTagSeverity {
        return LEAD_STATUS_SEVERITIES[status] ?? 'secondary';
    }

    getArchiveStatusName(status: string): string {
        return ARCHIVE_STATUS_LABELS[status] ?? status;
    }

    getArchiveStatusSeverity(status: string): UiTagSeverity {
        return ARCHIVE_STATUS_SEVERITIES[status] ?? 'secondary';
    }
}
