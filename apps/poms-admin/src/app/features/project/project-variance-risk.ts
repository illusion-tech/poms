import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import {
    actionLevelLabel,
    actionLevelSeverity,
    signalLevelLabel
} from './project-presentation';

@Component({
    selector: 'app-project-variance-risk',
    standalone: true,
    imports: [CommonModule, RouterModule, TagModule, SectionCard],
    template: `
        @if (loading()) {
            <div class="flex items-center justify-center py-20">
                <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        } @else if (error()) {
            <section-card>
                <ng-template #title>偏差与风险暂不可用</ng-template>
                <ng-template #description>{{ error() }}</ng-template>
            </section-card>
        } @else if (varianceRisk()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>风险判断</ng-template>
                    <ng-template #description>当前页只回答三件事：偏差从哪里来、风险等级是什么、下一步该怎么做。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">风险等级</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ signalLevelLabel(varianceRisk()!.riskLevel) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(varianceRisk()!.currentActionLevel)" [severity]="actionLevelSeverity(varianceRisk()!.currentActionLevel)" />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">建议动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(varianceRisk()!.costActionRecommendation)" [severity]="actionLevelSeverity(varianceRisk()!.costActionRecommendation)" />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">数据成熟度</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ varianceRisk()!.dataMaturityLevel }}</div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>偏差解释</ng-template>
                    <ng-template #description>偏差解释要能直接支撑经营判断和提成 gate，不只是一句风险提示。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">偏差来源</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ varianceRisk()!.varianceSourceSummary }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">推荐动作说明</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ varianceRisk()!.recommendedActionSummary ?? fallbackRecommendation() }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">税务影响</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ varianceRisk()!.taxImpactSummary }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">版本锚点</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ varianceRisk()!.referencedBaselineVersion }} / {{ varianceRisk()!.referencedSnapshotVersion }}</div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>当前缺口</ng-template>
                    <ng-template #description>把影响经营可信度的缺口单独暴露出来，便于判断是否要进入人工复核。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">分摊稳定性</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ varianceRisk()!.allocationStabilitySummary ?? '当前无额外说明' }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">未映射成本</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ varianceRisk()!.unmappedCostSummary ?? '当前无未映射成本提示' }}</div>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <a
                            [routerLink]="['/projects', projectId(), 'workspace', 'operating-overview']"
                            class="inline-flex items-center rounded-md border border-surface-200 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:text-surface-200"
                        >
                            返回经营总览
                        </a>
                        <a
                            [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']"
                            class="inline-flex items-center rounded-md border border-surface-200 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:text-surface-200"
                        >
                            查看提成阶段解释
                        </a>
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

    readonly actionLevelLabel = actionLevelLabel;
    readonly actionLevelSeverity = actionLevelSeverity;
    readonly signalLevelLabel = signalLevelLabel;

    readonly fallbackRecommendation = computed(() => {
        const current = this.varianceRisk();
        if (!current) {
            return '--';
        }

        return current.allowedActions.includes('reviewOperatingSignalEvaluation')
            ? '当前结果仍要求人工复核后再进入下游判断。'
            : '当前结果可以作为下游判断输入。';
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
