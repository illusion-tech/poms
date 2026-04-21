import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import {
    actionLevelLabel,
    actionLevelSeverity,
    signalLevelLabel
} from '../project/project-presentation';

@Component({
    selector: 'app-project-commission-gate-overview',
    standalone: true,
    imports: [CommonModule, TagModule, SectionCard, WorkspaceActionLink, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取提成阶段解释" />
        } @else if (error()) {
            <section-card>
                <ng-template #title>提成阶段解释暂不可用</ng-template>
                <ng-template #description>{{ error() }}</ng-template>
            </section-card>
        } @else if (gateOverview()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>当前 gate 结论</ng-template>
                    <ng-template #description>把经营反馈如何影响提成阶段判断直接翻译成项目语境，而不是让用户自己对规则和经营快照。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(gateOverview()!.currentActionLevel)" [severity]="actionLevelSeverity(gateOverview()!.currentActionLevel)" />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">经营信号</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ signalLevelLabel(gateOverview()!.signalLevel) }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">数据成熟度</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ gateOverview()!.dataMaturityLevel }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">建议动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(gateOverview()!.costActionRecommendation)" [severity]="actionLevelSeverity(gateOverview()!.costActionRecommendation)" />
                            </div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>为什么现在不能直接放行</ng-template>
                    <ng-template #description>这里聚合 tax / allocation / unmapped cost 三类经营依据，避免 gate 结论变成黑箱。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">税务影响</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ gateOverview()!.taxImpactSummary }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">分摊稳定性</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ gateOverview()!.allocationStabilitySummary ?? '当前无额外说明' }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">未映射成本</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ gateOverview()!.unmappedCostSummary ?? '当前无未映射成本提示' }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">版本锚点</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ gateOverview()!.referencedBaselineVersion }} / {{ gateOverview()!.referencedSnapshotVersion }}</div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>下一步与下游影响</ng-template>
                    <ng-template #description>让阶段解释直接告诉用户当前应该补什么，以及会影响到哪条提成操作链。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">下一步</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ gateOverview()!.nextActionSummary ?? fallbackNextAction() }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">影响下游</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ gateOverview()!.downstreamConsumerSummary ?? '当前无额外下游影响说明' }}</div>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'operating-overview']" label="查看经营总览" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'operations']" label="进入提成操作" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectCommissionGateOverview implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly gateOverview = this.#workspaceStore.commissionGateOverview;
    readonly loading = this.#workspaceStore.loadingCommissionGate;
    readonly error = this.#workspaceStore.commissionGateError;

    readonly actionLevelLabel = actionLevelLabel;
    readonly actionLevelSeverity = actionLevelSeverity;
    readonly signalLevelLabel = signalLevelLabel;

    readonly fallbackNextAction = computed(() => {
        const gateOverview = this.gateOverview();
        if (!gateOverview) {
            return '--';
        }

        return gateOverview.allowedActions.includes('reviewCommissionGateBinding')
            ? '当前仍需人工复核 gate 结果后再进入发放判断。'
            : '当前 gate 已具备下游使用条件。';
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadCommissionGateOverview(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? '';
    }
}
