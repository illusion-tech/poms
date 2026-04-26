import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { actionLevelLabel, actionLevelSeverity, signalLevelLabelOrFallback } from './project-presentation';

@Component({
    selector: 'app-project-variance-risk',
    standalone: true,
    imports: [CommonModule, SectionCard, WorkspaceActionLink, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取偏差与风险" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="偏差与风险暂不可用" [detail]="error()" />
        } @else if (varianceRisk()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>风险判断</ng-template>
                    <ng-template #description>当前页只回答三件事：偏差从哪里来、风险等级是什么、下一步该怎么做。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="riskJudgementItems()" [columns]="4" />
                </section-card>

                <section-card>
                    <ng-template #title>偏差解释</ng-template>
                    <ng-template #description>偏差解释要能直接支撑经营判断和提成 gate，不只是一句风险提示。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="varianceExplanationItems()" [columns]="2" />
                </section-card>

                <section-card>
                    <ng-template #title>当前缺口</ng-template>
                    <ng-template #description>把影响经营可信度的缺口单独暴露出来，便于判断是否要进入人工复核。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="varianceGapItems()" [columns]="2" />
                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'operating-overview']" label="返回经营总览" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="查看提成阶段解释" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectVarianceRisk implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly varianceRisk = this.#workspaceStore.varianceRiskExplanation;
    readonly loading = this.#workspaceStore.loadingVarianceRisk;
    readonly error = this.#workspaceStore.varianceRiskError;

    readonly fallbackRecommendation = computed(() => {
        const current = this.varianceRisk();
        if (!current) {
            return '--';
        }

        return current.allowedActions.includes('reviewOperatingSignalEvaluation') ? '当前结果仍要求人工复核后再进入下游判断。' : '当前结果可以作为下游判断输入。';
    });

    readonly riskJudgementItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.varianceRisk();
        if (!current) {
            return [];
        }

        return [
            { label: '风险等级', value: signalLevelLabelOrFallback(current.riskLevel) },
            {
                label: '当前动作',
                value: actionLevelLabel(current.currentActionLevel),
                severity: actionLevelSeverity(current.currentActionLevel)
            },
            {
                label: '建议动作',
                value: actionLevelLabel(current.costActionRecommendation),
                severity: actionLevelSeverity(current.costActionRecommendation)
            },
            { label: '数据成熟度', value: current.dataMaturityLevel }
        ];
    });

    readonly varianceExplanationItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.varianceRisk();
        if (!current) {
            return [];
        }

        return [
            { label: '偏差来源', value: current.varianceSourceSummary },
            { label: '推荐动作说明', value: current.recommendedActionSummary ?? this.fallbackRecommendation() },
            { label: '税务影响', value: current.taxImpactSummary },
            { label: '版本锚点', value: `${current.referencedBaselineVersion} / ${current.referencedSnapshotVersion}` }
        ];
    });

    readonly varianceGapItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.varianceRisk();
        if (!current) {
            return [];
        }

        return [
            { label: '分摊稳定性', value: current.allocationStabilitySummary ?? '当前无额外说明' },
            { label: '未映射成本', value: current.unmappedCostSummary ?? '当前无未映射成本提示' }
        ];
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadVarianceRisk(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? '';
    }
}
