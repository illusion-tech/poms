import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ProjectStore, ProjectWorkspaceStore, type ProjectWorkspaceGuidanceView } from '@poms/admin-data-access';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';

@Component({
    selector: 'app-project-workspace-home',
    standalone: true,
    imports: [CommonModule, SectionCard, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFeedback],
    template: `
        @if (project()) {
            @if (guidance(); as guidance) {
                <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div class="flex flex-col gap-4">
                        <app-workspace-command-panel [heading]="guidance.headline" [caption]="guidance.currentFocus" [items]="workspaceOverviewItems(guidance)" />

                        @if (guidance.blockingReasons.length > 0) {
                            <app-workspace-feedback severity="warn" summary="当前先处理这些问题">
                                <ul class="mt-2 list-disc space-y-1 pl-5">
                                    @for (reason of guidance.blockingReasons; track reason) {
                                        <li>{{ reason }}</li>
                                    }
                                </ul>
                            </app-workspace-feedback>
                        }
                    </div>

                    <section-card>
                        <ng-template #title>推荐入口</ng-template>
                        <ng-template #description>按当前项目状态继续处理。</ng-template>

                        <div class="mt-4 flex flex-col divide-y divide-surface-200 dark:divide-surface-700">
                            @for (entry of guidance.recommendedEntries; track entry.key) {
                                <div class="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ entry.label }}</div>
                                        <div class="mt-1 text-sm text-surface-500 dark:text-surface-400">{{ entry.description }}</div>
                                        @if (!entry.enabled && entry.disabledReason) {
                                            <div class="mt-2 text-xs text-surface-400 dark:text-surface-500">{{ entry.disabledReason }}</div>
                                        }
                                    </div>
                                    @if (entry.enabled && entry.route; as route) {
                                        <app-workspace-action-link [routerLink]="route" label="进入" severity="primary" [outlined]="true" />
                                    } @else {
                                        <span class="text-sm text-surface-400 dark:text-surface-500">暂不可进入</span>
                                    }
                                </div>
                            }
                        </div>
                    </section-card>
                </div>
            } @else {
                <app-workspace-feedback severity="info" summary="正在整理工作区" [detail]="guidanceError() ?? '正在根据当前项目状态整理入口和下一步。'" />
            }
        }
    `
})
export class ProjectWorkspaceHome {
    readonly #projectStore = inject(ProjectStore);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly project = this.#projectStore.selectedProject;
    readonly guidance = this.#workspaceStore.guidance;
    readonly guidanceError = this.#workspaceStore.guidanceError;

    workspaceOverviewItems(guidance: ProjectWorkspaceGuidanceView): WorkspaceCommandPanelItem[] {
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
                label: '当前依据',
                value: this.basisSummaryText(guidance),
                icon: 'pi pi-book'
            }
        ];
    }

    basisSummaryText(guidance: ProjectWorkspaceGuidanceView): string {
        if (guidance.basisSummary.summarySnapshotId && guidance.basisSummary.generatedAt) {
            return `当前依据已于 ${this.#formatDateTime(guidance.basisSummary.generatedAt)} 生成。`;
        }

        return '当前暂无依据记录；请先根据当前缺口补齐项目事实。';
    }

    #formatDateTime(value: string): string {
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
