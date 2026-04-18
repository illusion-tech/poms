import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import {
    actionLevelLabel,
    actionLevelSeverity,
    formatAmount
} from './project-presentation';

@Component({
    selector: 'app-project-operating-overview',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, SectionCard],
    template: `
        @if (loading()) {
            <div class="flex items-center justify-center py-20">
                <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        } @else if (error()) {
            <section-card>
                <ng-template #title>经营总览暂不可用</ng-template>
                <ng-template #description>{{ error() }}</ng-template>
                <div class="mt-4 flex flex-wrap gap-2">
                    <a
                        [routerLink]="['/projects', projectId(), 'workspace', 'variance-risk']"
                        class="inline-flex items-center rounded-md border border-surface-200 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:text-surface-200"
                    >
                        查看偏差与风险
                    </a>
                    <a
                        [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']"
                        class="inline-flex items-center rounded-md border border-surface-200 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:text-surface-200"
                    >
                        查看提成阶段解释
                    </a>
                </div>
            </section-card>
        } @else if (overview() && accounting()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>经营状态</ng-template>
                    <ng-template #description>先判断当前项目是否可以直接下游使用，再决定是否需要人工复核。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(overview()!.currentActionLevel)" [severity]="actionLevelSeverity(overview()!.currentActionLevel)" />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">数据成熟度</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ overview()!.dataMaturityLevel }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">基线版本</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ overview()!.referencedBaselineVersion }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">快照版本</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ overview()!.referencedSnapshotVersion }}</div>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <a
                            [routerLink]="['/projects', projectId(), 'workspace', 'variance-risk']"
                            class="inline-flex items-center rounded-md border border-surface-200 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:text-surface-200"
                        >
                            查看偏差与风险
                        </a>
                        <a
                            [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']"
                            class="inline-flex items-center rounded-md border border-surface-200 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:text-surface-200"
                        >
                            查看提成阶段解释
                        </a>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>经营口径</ng-template>
                    <ng-template #description>所有数字都围绕当前有效经营快照和统一核算视图读取，不在前端重新拼 contract/cost 对象。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">有效合同额</div>
                            <div class="mt-2 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ formatAmount(overview()!.effectiveContractSetSummary) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">确认回款</div>
                            <div class="mt-2 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ formatAmount(overview()!.receivableConfirmedAmountSummary) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">已归集成本</div>
                            <div class="mt-2 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ formatAmount(overview()!.includedCostTotalSummary) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">原始基线成本</div>
                            <div class="mt-2 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ formatAmount(accounting()!.originalBaselineCostSummary) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前有效基线成本</div>
                            <div class="mt-2 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ formatAmount(accounting()!.currentEffectiveBaselineCostSummary) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">毛利摘要</div>
                            <div class="mt-2 text-lg font-semibold text-surface-950 dark:text-surface-0">{{ overview()!.grossMarginSummary }}</div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>解释与缺口</ng-template>
                    <ng-template #description>把税务、分摊、未映射成本和建议动作留在同一页，避免只看到结果不知道为什么。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">税务影响</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ overview()!.taxImpactSummary }}</div>
                            <div class="mt-2 text-xs text-surface-400 dark:text-surface-500">待明确金额 {{ formatAmount(accounting()!.taxImpactPendingAmount) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">建议动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(accounting()!.costActionRecommendation)" [severity]="actionLevelSeverity(accounting()!.costActionRecommendation)" />
                                <span class="text-xs text-surface-400 dark:text-surface-500">{{ reviewConclusion() }}</span>
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">分摊稳定性</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ overview()!.allocationStabilitySummary ?? '当前无额外说明' }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">未映射成本</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ overview()!.unmappedCostSummary ?? '当前无未映射成本提示' }}</div>
                        </div>
                    </div>
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

    readonly actionLevelLabel = actionLevelLabel;
    readonly actionLevelSeverity = actionLevelSeverity;
    readonly formatAmount = formatAmount;

    readonly reviewConclusion = computed(() => {
        const overview = this.overview();
        if (!overview) {
            return '--';
        }

        return overview.allowedActions.includes('reviewOperatingSignalEvaluation') ? '当前需要人工复核' : '当前口径可直接下游使用';
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
