import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    ProjectWorkspaceStore,
    type ProjectBidCommercialProcessSummary,
    type ProjectPricingMarginConditionItemView,
    type ProjectPricingMarginReviewSummary,
    type ProjectPricingMarginWorkspaceView,
    type ProjectTechnicalCostPackageSummary
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

const PRICING_PATH_LABELS: Record<string, string> = {
    bid: '竞标承接',
    'direct-commercial': '直接商务'
};

const GROSS_MARGIN_BAND_LABELS: Record<string, string> = {
    'below-redline': '低于红线',
    watch: '需关注',
    target: '达到目标',
    'not-calculated': '未计算'
};

const PRICING_DECISION_LABELS: Record<string, string> = {
    pending: '待评审',
    released: '已放行',
    'conditional-release': '有条件放行',
    rejected: '已驳回',
    'escalation-required': '需升级'
};

const CONDITION_TYPE_LABELS: Record<string, string> = {
    financial: '财务',
    tax: '税务',
    payment: '回款',
    scope: '范围',
    risk: '风险',
    approval: '审批'
};

const CONDITION_STATUS_LABELS: Record<string, string> = {
    open: '打开',
    closed: '已关闭',
    waived: '已豁免'
};

const BID_MODE_LABELS: Record<string, string> = {
    'public-tender': '公开招标',
    invitation: '邀标',
    comparison: '比选',
    'commercial-negotiation': '商务谈判',
    'competitive-negotiation': '竞争性谈判',
    'direct-commercial': '直接商务',
    'not-required': '不适用'
};

const BID_RESULT_LABELS: Record<string, string> = {
    pending: '待结果',
    won: '中标 / 成交',
    lost: '未中标',
    cancelled: '已取消',
    'not-applicable': '不适用'
};

const TECHNICAL_DECISION_LABELS: Record<string, string> = {
    feasible: '技术可行',
    conditional: '有条件可行',
    'not-feasible': '暂不可行'
};

@Component({
    selector: 'app-project-pricing-margin-workspace',
    standalone: true,
    imports: [CommonModule, SectionCard, TableModule, TagModule, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取报价与毛利评审" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="报价与毛利评审暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (workspace(); as currentWorkspace) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="报价与毛利评审" caption="先确认报价、成本版本、税务回款条件和放行结论。" [items]="commandItems(currentWorkspace)" />

                @if (currentWorkspace.currentReview; as currentReview) {
                    <section-card>
                        <ng-template #title>当前报价评审</ng-template>
                        <ng-template #description>{{ currentReview.decisionSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="reviewFactItems(currentReview, currentWorkspace)" [columns]="4" />

                        @if (currentWorkspace.blockingReasons.length > 0) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前阻断项">
                                <ul class="mt-2 list-disc space-y-1 pl-5">
                                    @for (reason of currentWorkspace.blockingReasons; track reason) {
                                        <li>{{ reason }}</li>
                                    }
                                </ul>
                            </app-workspace-feedback>
                        } @else {
                            <app-workspace-feedback class="mt-4 block" severity="success" summary="当前可进入签约承接" [detail]="currentWorkspace.nextStep" />
                        }
                    </section-card>

                    <section-card>
                        <ng-template #title>报价、税务与回款条件</ng-template>
                        <ng-template #description>{{ currentReview.grossMarginSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="pricingFactItems(currentReview)" [columns]="4" />
                    </section-card>

                    <section-card>
                        <ng-template #title>上游事实引用</ng-template>
                        <ng-template #description>报价结论必须能追溯到成本版本和竞标 / 商务路径。</ng-template>

                        <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                            @if (currentWorkspace.technicalCostPackage; as technicalCostPackage) {
                                <app-workspace-fact-grid [items]="technicalCostFactItems(technicalCostPackage)" [columns]="2" />
                            } @else {
                                <app-workspace-feedback severity="warn" summary="缺少技术与成本版本引用" detail="报价评审应明确引用当前成本版本。" />
                            }

                            @if (currentWorkspace.bidCommercialProcess; as bidCommercialProcess) {
                                <app-workspace-fact-grid [items]="bidFactItems(bidCommercialProcess)" [columns]="2" />
                            } @else {
                                <app-workspace-feedback severity="info" summary="未引用竞标过程" detail="直接商务路径或暂未形成竞标过程时允许为空，但必须由后端事实明确。" />
                            }
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>条件与阻断</ng-template>
                        <ng-template #description>有条件放行、升级或阻断项必须明确责任角色、截止时间和处理结论。</ng-template>

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="conditionItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="conditionItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '72rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>条件</th>
                                    <th>类型</th>
                                    <th>状态</th>
                                    <th>签约前必须完成</th>
                                    <th>责任角色</th>
                                    <th>截止时间</th>
                                    <th>说明</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>{{ conditionTypeLabel(item.conditionType) }}</td>
                                    <td>
                                        <p-tag [value]="conditionStatusLabel(item.conditionStatus)" [severity]="conditionStatusSeverity(item)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.requiredForContracting ? '必须完成' : '非阻断条件' }}</td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                    <td>{{ formatDateTime(item.dueAt) }}</td>
                                    <td>{{ item.resolutionSummary ?? item.conditionSummary }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="7">当前报价评审没有条件项。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>
                } @else {
                    <section-card>
                        <ng-template #title>报价与毛利评审尚未形成</ng-template>
                        <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="缺少正式报价评审事实">
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
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'bid-commercial']" label="查看招投标 / 商务竞标" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" severity="secondary" [outlined]="true" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectPricingMarginWorkspace implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly workspace = this.#workspaceStore.pricingMarginWorkspace;
    readonly loading = this.#workspaceStore.loadingPricingMargin;
    readonly error = this.#workspaceStore.pricingMarginError;

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadPricingMarginWorkspace(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    commandItems(workspace: ProjectPricingMarginWorkspaceView): WorkspaceCommandPanelItem[] {
        return [
            {
                label: '报价版本',
                value: workspace.currentReview?.quoteVersion ?? '待形成评审',
                icon: 'pi pi-file-edit'
            },
            {
                label: '评审结论',
                value: workspace.currentReview ? this.pricingDecisionLabel(workspace.currentReview.decision) : '待评审',
                icon: 'pi pi-verified'
            },
            {
                label: '毛利判断',
                value: workspace.currentReview ? this.grossMarginBandLabel(workspace.currentReview.grossMarginBand) : '待判断',
                icon: 'pi pi-chart-line'
            },
            {
                label: '签约承接',
                value: workspace.readyForContracting ? '可进入' : '暂不可进入',
                icon: 'pi pi-send'
            },
            {
                label: '责任归口',
                value: workspace.ownerLabel,
                icon: 'pi pi-users'
            }
        ];
    }

    reviewFactItems(review: ProjectPricingMarginReviewSummary, workspace: ProjectPricingMarginWorkspaceView): WorkspaceFactGridItem[] {
        return [
            {
                label: '评审结论',
                value: this.pricingDecisionLabel(review.decision),
                severity: this.pricingDecisionSeverity(review.decision)
            },
            {
                label: '毛利区间',
                value: this.grossMarginBandLabel(review.grossMarginBand),
                severity: this.grossMarginBandSeverity(review.grossMarginBand)
            },
            {
                label: '签约承接',
                value: workspace.readyForContracting ? '可进入' : '暂不可进入',
                severity: workspace.readyForContracting ? 'success' : 'warn'
            },
            {
                label: '阻断数量',
                value: review.blockerCount,
                severity: review.blockerCount > 0 ? 'warn' : 'success'
            },
            {
                label: '当前版本',
                value: `V${review.version}`,
                detail: review.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '商业放行基线',
                value: review.commercialReleaseBaselineId ?? '待形成',
                detail: review.summarySnapshotId ? `摘要 ${review.summarySnapshotId}` : null
            },
            {
                label: '责任角色',
                value: review.ownerRole ?? '待确认'
            },
            {
                label: '生效时间',
                value: this.formatDateTime(review.effectiveAt)
            }
        ];
    }

    pricingFactItems(review: ProjectPricingMarginReviewSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '含税报价',
                value: this.moneyText(review.quoteAmountTaxInclusive, review.currencyCode),
                emphasis: true
            },
            {
                label: '不含税报价',
                value: this.moneyText(review.quoteAmountTaxExclusive, review.currencyCode),
                emphasis: true
            },
            {
                label: '税率',
                value: this.percentText(review.taxRate)
            },
            {
                label: '毛利率',
                value: this.percentText(review.grossMarginRate)
            },
            {
                label: '报价路径',
                value: this.pricingPathLabel(review.pricingPath),
                severity: review.pricingPath === 'bid' ? 'warn' : 'info'
            },
            {
                label: '税务条件',
                value: review.taxConditionSummary
            },
            {
                label: '回款条件',
                value: review.paymentTermsSummary
            },
            {
                label: '导出策略',
                value: review.exportPolicy ?? '待确认',
                detail: review.projectionLevel
            }
        ];
    }

    technicalCostFactItems(currentPackage: ProjectTechnicalCostPackageSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '成本版本',
                value: `V${currentPackage.version}`,
                detail: currentPackage.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '技术可行性',
                value: this.technicalDecisionLabel(currentPackage.technicalFeasibilityDecision),
                severity: this.technicalDecisionSeverity(currentPackage.technicalFeasibilityDecision)
            },
            {
                label: '含税估算',
                value: this.moneyText(currentPackage.totalEstimatedAmountIncludingTax, currentPackage.currencyCode),
                emphasis: true
            },
            {
                label: '税务复核',
                value: currentPackage.taxReviewStatus
            }
        ];
    }

    bidFactItems(process: ProjectBidCommercialProcessSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '竞标形态',
                value: BID_MODE_LABELS[process.bidMode] ?? process.bidMode
            },
            {
                label: '竞标结果',
                value: BID_RESULT_LABELS[process.resultStatus] ?? process.resultStatus,
                severity: this.bidResultSeverity(process.resultStatus)
            },
            {
                label: '竞标版本',
                value: `V${process.version}`,
                detail: process.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '结果说明',
                value: process.resultSummary ?? process.decisionSummary ?? '待确认'
            }
        ];
    }

    conditionItems(workspace: ProjectPricingMarginWorkspaceView): ProjectPricingMarginConditionItemView[] {
        return [...workspace.conditionItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    pricingPathLabel(value: string): string {
        return PRICING_PATH_LABELS[value] ?? value;
    }

    grossMarginBandLabel(value: string): string {
        return GROSS_MARGIN_BAND_LABELS[value] ?? value;
    }

    grossMarginBandSeverity(value: string): UiTagSeverity {
        if (value === 'target') {
            return 'success';
        }
        if (value === 'watch') {
            return 'warn';
        }
        if (value === 'below-redline') {
            return 'danger';
        }
        return 'secondary';
    }

    pricingDecisionLabel(value: string): string {
        return PRICING_DECISION_LABELS[value] ?? value;
    }

    pricingDecisionSeverity(value: string): UiTagSeverity {
        if (value === 'released') {
            return 'success';
        }
        if (value === 'conditional-release') {
            return 'warn';
        }
        if (value === 'rejected' || value === 'escalation-required') {
            return 'danger';
        }
        return 'secondary';
    }

    conditionTypeLabel(value: string): string {
        return CONDITION_TYPE_LABELS[value] ?? value;
    }

    conditionStatusLabel(value: string): string {
        return CONDITION_STATUS_LABELS[value] ?? value;
    }

    conditionStatusSeverity(item: ProjectPricingMarginConditionItemView): UiTagSeverity {
        if (item.conditionStatus === 'closed' || item.conditionStatus === 'waived') {
            return 'success';
        }
        if (item.requiredForContracting) {
            return 'danger';
        }
        return 'warn';
    }

    technicalDecisionLabel(value: string): string {
        return TECHNICAL_DECISION_LABELS[value] ?? value;
    }

    technicalDecisionSeverity(value: string): UiTagSeverity {
        if (value === 'feasible') {
            return 'success';
        }
        if (value === 'conditional') {
            return 'warn';
        }
        return 'danger';
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

    moneyText(value: string | null | undefined, currencyCode: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        return `${formatAmount(value)} ${currencyCode ?? ''}`.trim();
    }

    percentText(value: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return value;
        }

        return `${(parsed * 100).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}%`;
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
