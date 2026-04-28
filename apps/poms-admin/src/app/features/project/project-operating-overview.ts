import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import {
    formatSensitiveAmountProjection,
    sensitiveProjectionDisplayText
} from '../../shared/ui/sensitive-visibility';
import {
    actionLevelLabel,
    actionLevelSeverity
} from './project-presentation';

@Component({
    selector: 'app-project-operating-overview',
    standalone: true,
    imports: [CommonModule, SectionCard, WorkspaceActionLink, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取经营总览" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="经营总览暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'variance-risk']" label="查看偏差与风险" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="查看提成阶段解释" />
                </div>
            </app-workspace-feedback>
        } @else if (overview() && accounting()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>经营状态</ng-template>
                    <ng-template #description>先判断当前项目是否可以直接下游使用，再决定是否需要人工复核。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="operatingStateItems()" [columns]="4" />
                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'variance-risk']" label="查看偏差与风险" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="查看提成阶段解释" />
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>经营口径</ng-template>
                    <ng-template #description>所有数字都围绕当前有效经营快照和统一核算视图读取，不在前端重新拼 contract/cost 对象。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="operatingMetricItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>解释与缺口</ng-template>
                    <ng-template #description>把税务、分摊、未映射成本和建议动作留在同一页，避免只看到结果不知道为什么。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="operatingGapItems()" [columns]="2" />
                </section-card>
            </div>
        }
    `
})
export class ProjectOperatingOverview implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly overview = this.#workspaceStore.businessOutcomeOverview;
    readonly accounting = this.#workspaceStore.unifiedAccounting;
    readonly loading = this.#workspaceStore.loadingOperatingOverview;
    readonly error = this.#workspaceStore.operatingOverviewError;

    readonly reviewConclusion = computed(() => {
        const overview = this.overview();
        if (!overview) {
            return '--';
        }

        return overview.allowedActions.includes('reviewOperatingSignalEvaluation') ? '当前需要人工复核' : '当前口径可直接下游使用';
    });

    readonly operatingStateItems = computed<WorkspaceFactGridItem[]>(() => {
        const overview = this.overview();
        if (!overview) {
            return [];
        }

        return [
            {
                label: '当前动作',
                value: actionLevelLabel(overview.currentActionLevel),
                severity: actionLevelSeverity(overview.currentActionLevel)
            },
            {
                label: '数据成熟度',
                value: overview.dataMaturityLevel
            },
            {
                label: '基线版本',
                value: overview.referencedBaselineVersion
            },
            {
                label: '快照版本',
                value: overview.referencedSnapshotVersion
            }
        ];
    });

    readonly operatingMetricItems = computed<WorkspaceFactGridItem[]>(() => {
        const overview = this.overview();
        const accounting = this.accounting();
        if (!overview || !accounting) {
            return [];
        }

        return [
            { label: '有效合同额', value: formatSensitiveAmountProjection(overview.effectiveContractSetSummaryProjection), emphasis: true },
            { label: '确认回款', value: formatSensitiveAmountProjection(overview.receivableConfirmedAmountSummaryProjection), emphasis: true },
            { label: '已归集成本', value: formatSensitiveAmountProjection(overview.includedCostTotalSummaryProjection), emphasis: true },
            { label: '原始基线成本', value: formatSensitiveAmountProjection(accounting.originalBaselineCostSummaryProjection), emphasis: true },
            { label: '当前有效基线成本', value: formatSensitiveAmountProjection(accounting.currentEffectiveBaselineCostSummaryProjection), emphasis: true },
            { label: '毛利摘要', value: sensitiveProjectionDisplayText(overview.grossMarginSummaryProjection), emphasis: true }
        ];
    });

    readonly operatingGapItems = computed<WorkspaceFactGridItem[]>(() => {
        const overview = this.overview();
        const accounting = this.accounting();
        if (!overview || !accounting) {
            return [];
        }

        return [
            {
                label: '税务影响',
                value: sensitiveProjectionDisplayText(overview.taxImpactSummaryProjection),
                detail: `待明确金额 ${formatSensitiveAmountProjection(accounting.taxImpactPendingAmountProjection)}`
            },
            {
                label: '建议动作',
                value: actionLevelLabel(accounting.costActionRecommendation),
                severity: actionLevelSeverity(accounting.costActionRecommendation),
                detail: this.reviewConclusion()
            },
            {
                label: '分摊稳定性',
                value: overview.allocationStabilitySummary ?? '当前无额外说明'
            },
            {
                label: '未映射成本',
                value: overview.unmappedCostSummary ?? '当前无未映射成本提示'
            }
        ];
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadOperatingOverview(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? '';
    }
}
