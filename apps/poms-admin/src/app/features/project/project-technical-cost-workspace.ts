import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    ProjectWorkspaceStore,
    ProjectTechnicalCostItemViewConfidenceLevelEnum,
    ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum,
    ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum,
    type ProjectTechnicalCostItemView,
    type ProjectTechnicalCostPackageSummary,
    type ProjectTechnicalCostWorkspaceView,
    type ProjectTechnicalRiskItemView,
    ProjectTechnicalRiskItemViewRiskLevelEnum,
    ProjectTechnicalRiskItemViewRiskStatusEnum,
    ProjectTechnicalScopeItemViewScopeTypeEnum
} from '@poms/admin-data-access';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { formatAmount, type UiTagSeverity } from './project-presentation';

const FEASIBILITY_DECISION_LABELS: Record<ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum, string> = {
    [ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.Feasible]: '技术可行',
    [ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.Conditional]: '有条件可行',
    [ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.NotFeasible]: '暂不可行'
};

const TAX_REVIEW_STATUS_LABELS: Record<ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum, string> = {
    [ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum.Pending]: '待复核',
    [ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum.Reviewed]: '已复核',
    [ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum.NotRequired]: '无需复核'
};

const SCOPE_TYPE_LABELS: Record<ProjectTechnicalScopeItemViewScopeTypeEnum, string> = {
    [ProjectTechnicalScopeItemViewScopeTypeEnum.InScope]: '范围内',
    [ProjectTechnicalScopeItemViewScopeTypeEnum.OutOfScope]: '排除项',
    [ProjectTechnicalScopeItemViewScopeTypeEnum.Assumption]: '假设'
};

const RISK_STATUS_LABELS: Record<ProjectTechnicalRiskItemViewRiskStatusEnum, string> = {
    [ProjectTechnicalRiskItemViewRiskStatusEnum.Open]: '打开',
    [ProjectTechnicalRiskItemViewRiskStatusEnum.Mitigating]: '缓解中',
    [ProjectTechnicalRiskItemViewRiskStatusEnum.Accepted]: '已接受',
    [ProjectTechnicalRiskItemViewRiskStatusEnum.Closed]: '已关闭'
};

const CONFIDENCE_LEVEL_LABELS: Record<ProjectTechnicalCostItemViewConfidenceLevelEnum, string> = {
    [ProjectTechnicalCostItemViewConfidenceLevelEnum.High]: '高',
    [ProjectTechnicalCostItemViewConfidenceLevelEnum.Medium]: '中',
    [ProjectTechnicalCostItemViewConfidenceLevelEnum.Low]: '低'
};

@Component({
    selector: 'app-project-technical-cost-workspace',
    standalone: true,
    imports: [CommonModule, SectionCard, TableModule, TagModule, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取技术与成本" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="技术与成本暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (workspace(); as currentWorkspace) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="技术与成本" caption="先确认技术结论、范围边界、风险阻断和前期成本口径。" [items]="commandItems(currentWorkspace)" />

                @if (currentWorkspace.currentPackage; as currentPackage) {
                    <section-card>
                        <ng-template #title>技术结论与版本口径</ng-template>
                        <ng-template #description>{{ currentPackage.technicalConclusionSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="packageFactItems(currentPackage)" [columns]="4" />

                        @if (currentWorkspace.blockingReasons.length > 0) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前阻断项">
                                <ul class="mt-2 list-disc space-y-1 pl-5">
                                    @for (reason of currentWorkspace.blockingReasons; track reason) {
                                        <li>{{ reason }}</li>
                                    }
                                </ul>
                            </app-workspace-feedback>
                        } @else {
                            <app-workspace-feedback class="mt-4 block" severity="success" summary="当前没有阻断项" [detail]="currentWorkspace.nextStep" />
                        }
                    </section-card>

                    <section-card>
                        <ng-template #title>范围边界</ng-template>
                        <ng-template #description>范围内、排除项和假设必须在进入报价前清楚可读。</ng-template>

                        <p-table class="mt-4 block" styleClass="p-datatable-sm" [value]="currentWorkspace.scopeItems" [rowHover]="true" [scrollable]="true" [tableStyle]="{ 'min-width': '42rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>类型</th>
                                    <th>条目</th>
                                    <th>说明</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td>
                                        <p-tag [value]="scopeTypeLabel(item.scopeType)" [severity]="scopeTypeSeverity(item.scopeType)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>{{ item.description }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="3">当前版本包没有范围边界条目。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>

                    <section-card>
                        <ng-template #title>风险与保留意见</ng-template>
                        <ng-template #description>阻塞下一阶段的风险必须明确责任角色和缓解计划。</ng-template>

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="riskItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="riskItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '64rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>等级</th>
                                    <th>类别</th>
                                    <th>风险</th>
                                    <th>状态</th>
                                    <th>责任角色</th>
                                    <th>缓解计划</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td>
                                        <p-tag [value]="item.riskLevel" [severity]="riskLevelSeverity(item.riskLevel)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.riskCategory }}</td>
                                    <td>
                                        <div class="font-medium text-surface-950 dark:text-surface-0">{{ item.riskDescription }}</div>
                                        <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ item.impactScope }}</div>
                                    </td>
                                    <td>
                                        <p-tag [value]="riskStatusLabel(item.riskStatus)" [severity]="riskStatusSeverity(item)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.ownerRole }}</td>
                                    <td>{{ item.mitigationPlan }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="6">当前版本包没有风险条目。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>

                    <section-card>
                        <ng-template #title>前期成本与税务</ng-template>
                        <ng-template #description>{{ currentPackage.taxAssumptionSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="costFactItems(currentPackage)" [columns]="4" />

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="costItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="costItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '72rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>类别</th>
                                    <th>成本说明</th>
                                    <th>估算依据</th>
                                    <th>不含税</th>
                                    <th>税金</th>
                                    <th>含税</th>
                                    <th>置信度</th>
                                    <th>责任角色</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td>
                                        <div class="font-medium text-surface-950 dark:text-surface-0">{{ item.costCategory }}</div>
                                        <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ item.costSubcategory ?? '无子类' }}</div>
                                    </td>
                                    <td>{{ item.costDescription }}</td>
                                    <td>{{ item.estimationBasis }}</td>
                                    <td>{{ moneyText(item.amountExcludingTax, item.currencyCode) }}</td>
                                    <td>{{ moneyText(item.taxCostAmount, item.currencyCode) }}</td>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ moneyText(item.amountIncludingTax, item.currencyCode) }}</td>
                                    <td>
                                        <p-tag [value]="confidenceLabel(item.confidenceLevel)" [severity]="confidenceSeverity(item)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="8">当前版本包没有成本条目。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>
                } @else {
                    <section-card>
                        <ng-template #title>技术与成本版本包尚未形成</ng-template>
                        <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="缺少技术与成本版本包">
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
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectTechnicalCostWorkspace implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly workspace = this.#workspaceStore.technicalCostWorkspace;
    readonly loading = this.#workspaceStore.loadingTechnicalCost;
    readonly error = this.#workspaceStore.technicalCostError;

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadTechnicalCostWorkspace(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    commandItems(workspace: ProjectTechnicalCostWorkspaceView): WorkspaceCommandPanelItem[] {
        return [
            {
                label: '技术结论',
                value: workspace.currentPackage ? this.feasibilityDecisionLabel(workspace.currentPackage.technicalFeasibilityDecision) : '待形成版本包',
                icon: 'pi pi-verified'
            },
            {
                label: '成本估算',
                value: workspace.currentPackage ? this.moneyText(workspace.currentPackage.totalEstimatedAmountIncludingTax, workspace.currentPackage.currencyCode) : '待估算',
                icon: 'pi pi-wallet'
            },
            {
                label: '最高风险',
                value: workspace.currentPackage?.highestRiskLevel ?? '无风险记录',
                icon: 'pi pi-shield'
            },
            {
                label: '当前阻断',
                value: workspace.blockingReasons.length > 0 ? `${workspace.blockingReasons.length} 项` : '无阻断',
                icon: 'pi pi-exclamation-triangle'
            },
            {
                label: '责任归口',
                value: workspace.ownerLabel,
                icon: 'pi pi-users'
            }
        ];
    }

    packageFactItems(currentPackage: ProjectTechnicalCostPackageSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '技术可行性',
                value: this.feasibilityDecisionLabel(currentPackage.technicalFeasibilityDecision),
                severity: this.feasibilityDecisionSeverity(currentPackage.technicalFeasibilityDecision)
            },
            {
                label: '下一阶段',
                value: currentPackage.allowNextStage ? '允许推进' : '暂不允许',
                severity: currentPackage.allowNextStage ? 'success' : 'warn'
            },
            {
                label: '版本',
                value: `V${currentPackage.version}`,
                detail: currentPackage.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '生效时间',
                value: this.formatDateTime(currentPackage.effectiveAt)
            },
            {
                label: '最高风险',
                value: currentPackage.highestRiskLevel ?? '无风险记录',
                severity: currentPackage.highestRiskLevel ? this.riskLevelSeverity(currentPackage.highestRiskLevel) : 'success'
            },
            {
                label: '阻断数量',
                value: currentPackage.blockerCount,
                severity: currentPackage.blockerCount > 0 ? 'warn' : 'success'
            },
            {
                label: '税务复核',
                value: this.taxReviewStatusLabel(currentPackage.taxReviewStatus),
                severity: this.taxReviewStatusSeverity(currentPackage.taxReviewStatus)
            },
            {
                label: '更新时间',
                value: this.formatDateTime(currentPackage.updatedAt)
            }
        ];
    }

    costFactItems(currentPackage: ProjectTechnicalCostPackageSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '不含税估算',
                value: this.moneyText(currentPackage.totalEstimatedAmountExcludingTax, currentPackage.currencyCode),
                emphasis: true
            },
            {
                label: '税金成本',
                value: this.moneyText(currentPackage.totalTaxCostAmount, currentPackage.currencyCode),
                emphasis: true
            },
            {
                label: '含税估算',
                value: this.moneyText(currentPackage.totalEstimatedAmountIncludingTax, currentPackage.currencyCode),
                emphasis: true
            },
            {
                label: '币种',
                value: currentPackage.currencyCode,
                detail: '首版同一版本包内保持单币种'
            }
        ];
    }

    riskItems(workspace: ProjectTechnicalCostWorkspaceView): ProjectTechnicalRiskItemView[] {
        return [...workspace.riskItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    costItems(workspace: ProjectTechnicalCostWorkspaceView): ProjectTechnicalCostItemView[] {
        return [...workspace.costItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    feasibilityDecisionLabel(decision: ProjectTechnicalCostPackageSummary['technicalFeasibilityDecision']): string {
        return FEASIBILITY_DECISION_LABELS[decision] ?? decision;
    }

    feasibilityDecisionSeverity(decision: ProjectTechnicalCostPackageSummary['technicalFeasibilityDecision']): UiTagSeverity {
        if (decision === ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.Feasible) {
            return 'success';
        }
        if (decision === ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.Conditional) {
            return 'warn';
        }
        if (decision === ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.NotFeasible) {
            return 'danger';
        }
        return 'secondary';
    }

    taxReviewStatusLabel(status: ProjectTechnicalCostPackageSummary['taxReviewStatus']): string {
        return TAX_REVIEW_STATUS_LABELS[status] ?? status;
    }

    taxReviewStatusSeverity(status: ProjectTechnicalCostPackageSummary['taxReviewStatus']): UiTagSeverity {
        if (status === ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum.Reviewed || status === ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum.NotRequired) {
            return 'success';
        }
        if (status === ProjectTechnicalCostPackageSummaryTaxReviewStatusEnum.Pending) {
            return 'warn';
        }
        return 'secondary';
    }

    scopeTypeLabel(scopeType: ProjectTechnicalScopeItemViewScopeTypeEnum): string {
        return SCOPE_TYPE_LABELS[scopeType] ?? scopeType;
    }

    scopeTypeSeverity(scopeType: ProjectTechnicalScopeItemViewScopeTypeEnum): UiTagSeverity {
        if (scopeType === ProjectTechnicalScopeItemViewScopeTypeEnum.InScope) {
            return 'success';
        }
        if (scopeType === ProjectTechnicalScopeItemViewScopeTypeEnum.OutOfScope) {
            return 'warn';
        }
        return 'info';
    }

    riskLevelSeverity(riskLevel: ProjectTechnicalRiskItemViewRiskLevelEnum | ProjectTechnicalCostPackageSummary['highestRiskLevel']): UiTagSeverity {
        if (riskLevel === ProjectTechnicalRiskItemViewRiskLevelEnum.R4) {
            return 'danger';
        }
        if (riskLevel === ProjectTechnicalRiskItemViewRiskLevelEnum.R3) {
            return 'warn';
        }
        if (riskLevel === ProjectTechnicalRiskItemViewRiskLevelEnum.R2) {
            return 'info';
        }
        return 'secondary';
    }

    riskStatusLabel(status: ProjectTechnicalRiskItemView['riskStatus']): string {
        return RISK_STATUS_LABELS[status] ?? status;
    }

    riskStatusSeverity(item: ProjectTechnicalRiskItemView): UiTagSeverity {
        if (item.blocksNextStage && item.riskStatus !== ProjectTechnicalRiskItemViewRiskStatusEnum.Closed) {
            return 'danger';
        }
        if (item.riskStatus === ProjectTechnicalRiskItemViewRiskStatusEnum.Closed) {
            return 'success';
        }
        if (item.riskStatus === ProjectTechnicalRiskItemViewRiskStatusEnum.Mitigating) {
            return 'warn';
        }
        return 'secondary';
    }

    confidenceLabel(level: ProjectTechnicalCostItemView['confidenceLevel']): string {
        return CONFIDENCE_LEVEL_LABELS[level] ?? level;
    }

    confidenceSeverity(item: ProjectTechnicalCostItemView): UiTagSeverity {
        if (item.highUncertainty) {
            return 'warn';
        }
        if (item.confidenceLevel === ProjectTechnicalCostItemViewConfidenceLevelEnum.High) {
            return 'success';
        }
        if (item.confidenceLevel === ProjectTechnicalCostItemViewConfidenceLevelEnum.Medium) {
            return 'info';
        }
        return 'secondary';
    }

    moneyText(value: string | null | undefined, currencyCode: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        return `${formatAmount(value)} ${currencyCode ?? ''}`.trim();
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
