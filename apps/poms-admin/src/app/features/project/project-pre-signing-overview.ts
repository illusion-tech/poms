import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContractReadinessGuardDecisionLabel, ContractReadinessItemStatusLabel, ContractReadinessItemTypeLabel, ContractReadinessStatusLabel } from '@poms/shared-contracts';
import { ContractReadinessGuardDecision, type ContractReadinessDetail, type ContractReadinessItem, ContractReadinessItemStatus, ContractReadinessItemType, ContractReadinessStatus, ProjectWorkspaceStore, type ProjectWorkspaceGuidanceView } from '@poms/admin-data-access';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import type { UiTagSeverity } from './project-presentation';

interface PreSigningEntry {
    key: string;
    label: string;
    description: string;
    statusLabel: string;
    statusSeverity: UiTagSeverity;
    routerLink?: string | unknown[];
    disabledReason?: string;
}

const READINESS_STATUS_LABELS = ContractReadinessStatusLabel as Record<ContractReadinessStatus, string>;
const GUARD_DECISION_LABELS = ContractReadinessGuardDecisionLabel as Record<ContractReadinessGuardDecision, string>;
const READINESS_ITEM_STATUS_LABELS = ContractReadinessItemStatusLabel as Record<ContractReadinessItemStatus, string>;
const READINESS_ITEM_TYPE_LABELS = ContractReadinessItemTypeLabel as Record<ContractReadinessItemType, string>;

@Component({
    selector: 'app-project-pre-signing-overview',
    standalone: true,
    imports: [CommonModule, SectionCard, TableModule, TagModule, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取签约前主线" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="签约前主线暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (guidance(); as currentGuidance) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="签约前主线" [caption]="currentGuidance.currentFocus" [items]="preSigningCommandItems(currentGuidance)" />

                <section-card>
                    <ng-template #title>当前阻断与下一步</ng-template>
                    <ng-template #description>先看项目为什么停在当前阶段，再进入对应工作区处理。</ng-template>

                    @if (currentGuidance.blockingReasons.length > 0) {
                        <app-workspace-feedback severity="warn" summary="当前阻断项">
                            <ul class="mt-2 list-disc space-y-1 pl-5">
                                @for (reason of currentGuidance.blockingReasons; track reason) {
                                    <li>{{ reason }}</li>
                                }
                            </ul>
                        </app-workspace-feedback>
                    } @else {
                        <app-workspace-feedback severity="success" summary="当前没有显式阻断" detail="继续按下一步动作补齐签约前事实。" />
                    }

                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>签约前工作区入口</ng-template>
                    <ng-template #description>总入口先保持上下文连续；未形成正式事实源的工作区只显示状态，不生成跳转。</ng-template>

                    <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        @for (entry of preSigningEntries(); track entry.key) {
                            <div class="rounded-[8px] border border-surface-200 px-4 py-3 dark:border-surface-700">
                                <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div class="min-w-0">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ entry.label }}</span>
                                            <p-tag [value]="entry.statusLabel" [severity]="entry.statusSeverity" class="rounded-[6px]!" />
                                        </div>
                                        <div class="mt-2 text-sm leading-6 text-surface-500 dark:text-surface-400">{{ entry.description }}</div>
                                        @if (entry.disabledReason) {
                                            <div class="mt-2 text-xs text-surface-400 dark:text-surface-500">{{ entry.disabledReason }}</div>
                                        }
                                    </div>
                                    @if (entry.routerLink; as routerLink) {
                                        <app-workspace-action-link [routerLink]="routerLink" label="进入" severity="primary" [outlined]="true" size="small" />
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>签约就绪承接状态</ng-template>
                    <ng-template #description>承接包只用于解释进入合同主链前的最终收口状态，不替代前面的详细工作区。</ng-template>

                    @if (readiness(); as currentReadiness) {
                        <app-workspace-fact-grid class="mt-4 block" [items]="readinessFactItems(currentReadiness)" [columns]="4" />

                        <p-table
                            class="mt-4 block p-datatable-sm"
                            [value]="readinessItems(currentReadiness)"
                            [rowHover]="true"
                            [paginator]="readinessItems(currentReadiness).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '48rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>检查项</th>
                                    <th>类型</th>
                                    <th>状态</th>
                                    <th>责任角色</th>
                                    <th>说明</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>{{ readinessItemTypeLabel(item.itemType) }}</td>
                                    <td>
                                        <p-tag [value]="readinessItemStatusLabel(item.status)" [severity]="readinessItemStatusSeverity(item.status)" class="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                    <td>{{ item.summary ?? item.navigationHint ?? '待确认' }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="5">当前承接包没有明细项。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    } @else {
                        <app-workspace-feedback
                            class="mt-4 block"
                            severity="warn"
                            summary="签约就绪承接包尚未形成"
                            detail="先补齐签约前评估、范围、报价和合同前置事实；形成承接包后，这里会展示可签约判断与缺口。"
                        />
                    }
                </section-card>
            </div>
        }
    `
})
export class ProjectPreSigningOverview implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly guidance = this.#workspaceStore.guidance;
    readonly readiness = this.#workspaceStore.contractReadiness;
    readonly loading = this.#workspaceStore.loadingPreSigning;
    readonly error = this.#workspaceStore.preSigningError;

    readonly preSigningEntries = computed<PreSigningEntry[]>(() => {
        const projectId = this.projectId();
        const readiness = this.readiness();
        const hasReadiness = readiness !== null;

        return [
            {
                key: 'overview',
                label: '项目总览',
                description: '查看当前阶段、阻断原因、下一步和责任归口。',
                statusLabel: '当前',
                statusSeverity: 'info',
                routerLink: ['/projects', projectId, 'workspace', 'pre-signing']
            },
            {
                key: 'initiation',
                label: '立项与推进',
                description: '机会判断、材料补齐和继续推进结论。',
                statusLabel: '摘要',
                statusSeverity: 'secondary',
                disabledReason: '当前先在总入口展示阶段和阻断摘要。'
            },
            {
                key: 'technical-cost',
                label: '技术与成本',
                description: '范围边界、排除项、技术风险和前期成本。',
                statusLabel: '可进入',
                statusSeverity: 'info',
                routerLink: ['/projects', projectId, 'workspace', 'technical-cost']
            },
            {
                key: 'bid-commercial',
                label: '招投标 / 商务竞标',
                description: '投标形态、材料责任、竞标结果和商务路径。',
                statusLabel: '可进入',
                statusSeverity: 'info',
                routerLink: ['/projects', projectId, 'workspace', 'bid-commercial']
            },
            {
                key: 'pricing-margin',
                label: '报价与毛利评审',
                description: '报价结论、毛利判断、审批摘要和放行条件。',
                statusLabel: '可进入',
                statusSeverity: 'info',
                routerLink: ['/projects', projectId, 'workspace', 'pricing-margin']
            },
            {
                key: 'contract-readiness',
                label: '签约就绪',
                description: '合同主链前的最终承接包、前置项和守卫判断。',
                statusLabel: hasReadiness ? '已读取' : '待形成',
                statusSeverity: readiness ? this.readinessStatusSeverity(readiness.packageStatus) : 'secondary',
                disabledReason: hasReadiness ? '当前页已展示签约就绪摘要。' : '承接包形成后在当前页展示摘要。'
            }
        ];
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadPreSigningOverview(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    preSigningCommandItems(guidance: ProjectWorkspaceGuidanceView): WorkspaceCommandPanelItem[] {
        return [
            {
                label: '当前阶段',
                value: guidance.currentStageLabel,
                icon: 'pi pi-flag'
            },
            {
                label: '当前缺口',
                value: guidance.currentGap,
                icon: 'pi pi-exclamation-circle'
            },
            {
                label: '下一步',
                value: guidance.nextStep,
                icon: 'pi pi-arrow-right'
            },
            {
                label: '责任归口',
                value: guidance.ownerLabel,
                icon: 'pi pi-users'
            },
            {
                label: '签约就绪',
                value: this.readinessStatusText(this.readiness()),
                icon: 'pi pi-verified'
            }
        ];
    }

    readinessFactItems(readiness: ContractReadinessDetail): WorkspaceFactGridItem[] {
        return [
            {
                label: '承接包状态',
                value: this.readinessStatusLabel(readiness.packageStatus),
                severity: this.readinessStatusSeverity(readiness.packageStatus),
                detail: readiness.currentEffectiveDecisionSummary
            },
            {
                label: '守卫判断',
                value: this.guardDecisionLabel(readiness.guardDecision),
                severity: this.guardDecisionSeverity(readiness.guardDecision),
                detail: readiness.blockingReasonSummary
            },
            {
                label: '缺失前置项',
                value: readiness.missingPrerequisiteCount,
                emphasis: true
            },
            {
                label: '商业放行差异',
                value: readiness.diffLevel,
                detail: readiness.reviewStatus
            },
            {
                label: '合同快照',
                value: readiness.initializedContractSnapshotId ?? '待初始化',
                detail: this.formatDateTime(readiness.contractSnapshotInitializedAt)
            },
            {
                label: '应收计划',
                value: readiness.initializedReceivablePlanVersionId ?? '待初始化',
                detail: this.formatDateTime(readiness.receivablePlanInitializedAt)
            },
            {
                label: '当前版本',
                value: readiness.isCurrent ? '当前有效' : '非当前',
                severity: readiness.isCurrent ? 'success' : 'warn'
            },
            {
                label: '更新时间',
                value: this.formatDateTime(readiness.updatedAt)
            }
        ];
    }

    readinessItems(readiness: ContractReadinessDetail): ContractReadinessItem[] {
        return [...readiness.items].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    readinessStatusText(readiness: ContractReadinessDetail | null): string {
        return readiness ? this.readinessStatusLabel(readiness.packageStatus) : '尚未形成承接包';
    }

    readinessStatusLabel(status: ContractReadinessStatus): string {
        return READINESS_STATUS_LABELS[status] ?? status;
    }

    readinessStatusSeverity(status: ContractReadinessStatus): UiTagSeverity {
        if (status === ContractReadinessStatus.Ready) {
            return 'success';
        }
        if (status === ContractReadinessStatus.Conditional) {
            return 'warn';
        }
        if (status === ContractReadinessStatus.Blocked) {
            return 'danger';
        }
        return 'secondary';
    }

    guardDecisionLabel(decision: ContractReadinessGuardDecision): string {
        return GUARD_DECISION_LABELS[decision] ?? decision;
    }

    guardDecisionSeverity(decision: ContractReadinessGuardDecision): UiTagSeverity {
        if (decision === ContractReadinessGuardDecision.Allowed) {
            return 'success';
        }
        if (decision === ContractReadinessGuardDecision.ReviewRequired) {
            return 'warn';
        }
        if (decision === ContractReadinessGuardDecision.Blocked) {
            return 'danger';
        }
        return 'secondary';
    }

    readinessItemTypeLabel(type: ContractReadinessItemType): string {
        return READINESS_ITEM_TYPE_LABELS[type] ?? type;
    }

    readinessItemStatusLabel(status: ContractReadinessItemStatus): string {
        return READINESS_ITEM_STATUS_LABELS[status] ?? status;
    }

    readinessItemStatusSeverity(status: ContractReadinessItemStatus): UiTagSeverity {
        if (status === ContractReadinessItemStatus.Ready) {
            return 'success';
        }
        if (status === ContractReadinessItemStatus.Conditional) {
            return 'warn';
        }
        if (status === ContractReadinessItemStatus.Blocked) {
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
