import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    ProjectWorkspaceStore,
    type ProjectBidCommercialMaterialItemView,
    type ProjectBidCommercialProcessSummary,
    type ProjectBidCommercialTimelineItemView,
    type ProjectBidCommercialWorkspaceView
} from '@poms/admin-data-access';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import type { UiTagSeverity } from './project-presentation';

const BID_MODE_LABELS: Record<string, string> = {
    'public-tender': '公开招标',
    invitation: '邀标',
    comparison: '比选',
    'commercial-negotiation': '商务谈判',
    'competitive-negotiation': '竞争性谈判',
    'direct-commercial': '直接商务',
    'not-required': '不适用'
};

const BID_STAGE_LABELS: Record<string, string> = {
    'not-started': '未启动',
    preparation: '材料准备',
    submitted: '已提交',
    negotiating: '谈判中',
    'result-confirmed': '结果确认',
    closed: '已关闭'
};

const BID_DECISION_LABELS: Record<string, string> = {
    pending: '待决策',
    participate: '参与',
    'no-bid': '不投标',
    'not-required': '不适用'
};

const BID_RESULT_LABELS: Record<string, string> = {
    pending: '待结果',
    won: '中标 / 成交',
    lost: '未中标',
    cancelled: '已取消',
    'not-applicable': '不适用'
};

const MATERIAL_STATUS_LABELS: Record<string, string> = {
    missing: '缺失',
    'in-progress': '处理中',
    ready: '已齐备',
    'not-required': '不适用'
};

const TIMELINE_STATUS_LABELS: Record<string, string> = {
    pending: '待完成',
    done: '已完成',
    cancelled: '已取消'
};

@Component({
    selector: 'app-project-bid-commercial-workspace',
    standalone: true,
    imports: [CommonModule, SectionCard, TableModule, TagModule, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取招投标 / 商务竞标" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="招投标 / 商务竞标暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (workspace(); as currentWorkspace) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="招投标 / 商务竞标" caption="先确认竞标形态、材料责任、关键节点和结果路径。" [items]="commandItems(currentWorkspace)" />

                @if (currentWorkspace.currentProcess; as currentProcess) {
                    <section-card>
                        <ng-template #title>当前竞标过程</ng-template>
                        <ng-template #description>{{ currentProcess.processSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="processFactItems(currentProcess)" [columns]="4" />

                        @if (currentWorkspace.blockingReasons.length > 0) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前阻断项">
                                <ul class="mt-2 list-disc space-y-1 pl-5">
                                    @for (reason of currentWorkspace.blockingReasons; track reason) {
                                        <li>{{ reason }}</li>
                                    }
                                </ul>
                            </app-workspace-feedback>
                        } @else {
                            <app-workspace-feedback class="mt-4 block" severity="success" summary="当前没有竞标阻断" [detail]="currentWorkspace.nextStep" />
                        }
                    </section-card>

                    <section-card>
                        <ng-template #title>材料与责任</ng-template>
                        <ng-template #description>进入报价前，投标材料、责任角色和阻断状态必须清楚可读。</ng-template>

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="materialItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="materialItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '58rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>材料</th>
                                    <th>状态</th>
                                    <th>责任角色</th>
                                    <th>截止时间</th>
                                    <th>阻断</th>
                                    <th>导航提示</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>
                                        <p-tag [value]="materialStatusLabel(item.materialStatus)" [severity]="materialStatusSeverity(item)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                    <td>{{ formatDateTime(item.dueAt) }}</td>
                                    <td>{{ item.blocksNextStep ? '阻断下一步' : '不阻断' }}</td>
                                    <td>{{ item.navigationHint ?? '待确认' }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="6">当前竞标过程没有材料项。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>

                    <section-card>
                        <ng-template #title>关键节点</ng-template>
                        <ng-template #description>时间线用于解释当前结果是否来自正式过程，而不是页面临时判断。</ng-template>

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="timelineItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="timelineItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '64rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>节点</th>
                                    <th>状态</th>
                                    <th>发生时间</th>
                                    <th>截止时间</th>
                                    <th>责任角色</th>
                                    <th>说明</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>
                                        <p-tag [value]="timelineStatusLabel(item.timelineStatus)" [severity]="timelineStatusSeverity(item.timelineStatus)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ formatDateTime(item.occurredAt) }}</td>
                                    <td>{{ formatDateTime(item.dueAt) }}</td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                    <td>{{ item.summary ?? '待确认' }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="6">当前竞标过程没有关键节点。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>
                } @else {
                    <section-card>
                        <ng-template #title>竞标过程尚未形成</ng-template>
                        <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="缺少正式竞标事实">
                            <ul class="mt-2 list-disc space-y-1 pl-5">
                                @for (reason of currentWorkspace.blockingReasons; track reason) {
                                    <li>{{ reason }}</li>
                                }
                            </ul>
                        </app-workspace-feedback>
                    </section-card>
                }

                <section-card>
                    <ng-template #title>下一步</ng-template>
                    <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pricing-margin']" label="进入报价与毛利评审" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" severity="secondary" [outlined]="true" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectBidCommercialWorkspace implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly workspace = this.#workspaceStore.bidCommercialWorkspace;
    readonly loading = this.#workspaceStore.loadingBidCommercial;
    readonly error = this.#workspaceStore.bidCommercialError;

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadBidCommercialWorkspace(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    commandItems(workspace: ProjectBidCommercialWorkspaceView): WorkspaceCommandPanelItem[] {
        return [
            {
                label: '竞标形态',
                value: workspace.currentProcess ? this.bidModeLabel(workspace.currentProcess.bidMode) : '待形成竞标过程',
                icon: 'pi pi-sitemap'
            },
            {
                label: '当前节点',
                value: workspace.currentProcess ? this.bidStageLabel(workspace.currentProcess.currentStage) : '待启动',
                icon: 'pi pi-flag'
            },
            {
                label: '参与决策',
                value: workspace.currentProcess ? this.bidDecisionLabel(workspace.currentProcess.decision) : '待决策',
                icon: 'pi pi-check-circle'
            },
            {
                label: '竞标结果',
                value: workspace.currentProcess ? this.bidResultLabel(workspace.currentProcess.resultStatus) : '待结果',
                icon: 'pi pi-trophy'
            },
            {
                label: '责任归口',
                value: workspace.ownerLabel,
                icon: 'pi pi-users'
            }
        ];
    }

    processFactItems(process: ProjectBidCommercialProcessSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '竞标形态',
                value: this.bidModeLabel(process.bidMode),
                severity: this.bidModeSeverity(process.bidMode)
            },
            {
                label: '招标编号',
                value: process.tenderNo ?? '未提供'
            },
            {
                label: '标段 / 包件编号',
                value: process.bidPackageNo ?? '未提供'
            },
            {
                label: '过程阶段',
                value: this.bidStageLabel(process.currentStage),
                severity: this.bidStageSeverity(process.currentStage)
            },
            {
                label: '参与决策',
                value: this.bidDecisionLabel(process.decision),
                severity: this.bidDecisionSeverity(process.decision)
            },
            {
                label: '结果状态',
                value: this.bidResultLabel(process.resultStatus),
                severity: this.bidResultSeverity(process.resultStatus)
            },
            {
                label: '阻断数量',
                value: process.blockerCount,
                severity: process.blockerCount > 0 ? 'warn' : 'success'
            },
            {
                label: '当前版本',
                value: `V${process.version}`,
                detail: process.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '责任角色',
                value: process.ownerRole ?? '待确认'
            },
            {
                label: '生效时间',
                value: this.formatDateTime(process.effectiveAt)
            }
        ];
    }

    materialItems(workspace: ProjectBidCommercialWorkspaceView): ProjectBidCommercialMaterialItemView[] {
        return [...workspace.materialItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    timelineItems(workspace: ProjectBidCommercialWorkspaceView): ProjectBidCommercialTimelineItemView[] {
        return [...workspace.timelineItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    bidModeLabel(value: string): string {
        return BID_MODE_LABELS[value] ?? value;
    }

    bidModeSeverity(value: string): UiTagSeverity {
        if (value === 'not-required') {
            return 'secondary';
        }
        if (value === 'direct-commercial') {
            return 'info';
        }
        return 'warn';
    }

    bidStageLabel(value: string): string {
        return BID_STAGE_LABELS[value] ?? value;
    }

    bidStageSeverity(value: string): UiTagSeverity {
        if (value === 'closed' || value === 'result-confirmed') {
            return 'success';
        }
        if (value === 'not-started') {
            return 'secondary';
        }
        return 'info';
    }

    bidDecisionLabel(value: string): string {
        return BID_DECISION_LABELS[value] ?? value;
    }

    bidDecisionSeverity(value: string): UiTagSeverity {
        if (value === 'participate' || value === 'not-required') {
            return 'success';
        }
        if (value === 'no-bid') {
            return 'warn';
        }
        return 'secondary';
    }

    bidResultLabel(value: string): string {
        return BID_RESULT_LABELS[value] ?? value;
    }

    bidResultSeverity(value: string): UiTagSeverity {
        if (value === 'won' || value === 'not-applicable') {
            return 'success';
        }
        if (value === 'lost' || value === 'cancelled') {
            return 'danger';
        }
        return 'secondary';
    }

    materialStatusLabel(value: string): string {
        return MATERIAL_STATUS_LABELS[value] ?? value;
    }

    materialStatusSeverity(item: ProjectBidCommercialMaterialItemView): UiTagSeverity {
        if (item.blocksNextStep && item.materialStatus !== 'ready' && item.materialStatus !== 'not-required') {
            return 'danger';
        }
        if (item.materialStatus === 'ready' || item.materialStatus === 'not-required') {
            return 'success';
        }
        if (item.materialStatus === 'in-progress') {
            return 'warn';
        }
        return 'secondary';
    }

    timelineStatusLabel(value: string): string {
        return TIMELINE_STATUS_LABELS[value] ?? value;
    }

    timelineStatusSeverity(value: string): UiTagSeverity {
        if (value === 'done') {
            return 'success';
        }
        if (value === 'cancelled') {
            return 'danger';
        }
        return 'secondary';
    }

    formatDateTime(value: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
