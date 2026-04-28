import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { sensitiveProjectionDisplayText } from '../../shared/ui/sensitive-visibility';
import { actionLevelLabel, actionLevelSeverity, signalLevelLabelOrFallback } from '../project/project-presentation';

@Component({
    selector: 'app-project-commission-gate-overview',
    standalone: true,
    imports: [CommonModule, SectionCard, WorkspaceActionLink, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取提成阶段解释" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="提成阶段解释暂不可用" [detail]="error()" />
        } @else if (gateOverview()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>当前 gate 结论</ng-template>
                    <ng-template #description>把经营反馈如何影响提成阶段判断直接翻译成项目语境，而不是让用户自己对规则和经营快照。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="gateConclusionItems()" [columns]="4" />
                </section-card>

                <section-card>
                    <ng-template #title>为什么现在不能直接放行</ng-template>
                    <ng-template #description>这里聚合 tax / allocation / unmapped cost 三类经营依据，避免 gate 结论变成黑箱。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="gateBlockerItems()" [columns]="2" />
                </section-card>

                <section-card>
                    <ng-template #title>下一步与下游影响</ng-template>
                    <ng-template #description>让阶段解释直接告诉用户当前应该补什么，以及会影响到哪条提成操作链。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="gateNextStepItems()" [columns]="2" />
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

    readonly fallbackNextAction = computed(() => {
        const gateOverview = this.gateOverview();
        if (!gateOverview) {
            return '--';
        }

        return gateOverview.allowedActions.includes('reviewCommissionGateBinding') ? '当前仍需人工复核 gate 结果后再进入发放判断。' : '当前 gate 已具备下游使用条件。';
    });

    readonly gateConclusionItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.gateOverview();
        if (!current) {
            return [];
        }

        return [
            {
                label: '当前动作',
                value: actionLevelLabel(current.currentActionLevel),
                severity: actionLevelSeverity(current.currentActionLevel)
            },
            { label: '经营信号', value: signalLevelLabelOrFallback(current.signalLevel) },
            { label: '数据成熟度', value: current.dataMaturityLevel },
            {
                label: '建议动作',
                value: actionLevelLabel(current.costActionRecommendation),
                severity: actionLevelSeverity(current.costActionRecommendation)
            }
        ];
    });

    readonly gateBlockerItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.gateOverview();
        if (!current) {
            return [];
        }

        return [
            { label: '税务影响', value: sensitiveProjectionDisplayText(current.taxImpactSummaryProjection) },
            { label: '分摊稳定性', value: current.allocationStabilitySummary ?? '当前无额外说明' },
            { label: '未映射成本', value: current.unmappedCostSummary ?? '当前无未映射成本提示' },
            { label: '版本锚点', value: `${current.referencedBaselineVersion} / ${current.referencedSnapshotVersion}` }
        ];
    });

    readonly gateNextStepItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.gateOverview();
        if (!current) {
            return [];
        }

        return [
            { label: '下一步', value: sensitiveProjectionDisplayText(current.nextActionSummaryProjection, this.fallbackNextAction()) },
            { label: '影响下游', value: sensitiveProjectionDisplayText(current.downstreamConsumerSummaryProjection, '当前无额外下游影响说明') }
        ];
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
