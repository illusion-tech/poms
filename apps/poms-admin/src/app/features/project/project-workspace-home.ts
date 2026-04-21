import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectStore, ProjectWorkspaceStore, type ProjectWorkspaceGuidanceView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { SectionCard } from '../../shared/ui/sectioncard';

@Component({
    selector: 'app-project-workspace-home',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, SectionCard],
    template: `
        @if (project()) {
            @if (guidance(); as guidance) {
                <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section-card>
                        <ng-template #title>{{ guidance.headline }}</ng-template>
                        <ng-template #description>{{ guidance.currentFocus }}</ng-template>

                        <div class="mt-4 grid grid-cols-1 gap-3">
                            <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">当前缺口</div>
                                <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance.currentGap }}</div>
                            </div>
                            <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">下一步</div>
                                <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance.nextStep }}</div>
                            </div>
                            <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">责任归口</div>
                                <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance.ownerLabel }}</div>
                            </div>
                            <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                                <div class="text-xs text-surface-500 dark:text-surface-400">当前依据</div>
                                <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ basisSummaryText(guidance) }}</div>
                            </div>
                        </div>

                        @if (guidance.blockingReasons.length > 0) {
                            <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                                <div class="font-medium">当前先处理这些问题</div>
                                <ul class="mt-2 list-disc space-y-1 pl-5">
                                    @for (reason of guidance.blockingReasons; track reason) {
                                        <li>{{ reason }}</li>
                                    }
                                </ul>
                            </div>
                        }
                    </section-card>

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
                                        <a
                                            [routerLink]="route"
                                            class="inline-flex items-center justify-center rounded-md border border-primary-200 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-800 dark:text-primary-200 dark:hover:bg-primary-950/30"
                                        >
                                            进入
                                        </a>
                                    } @else {
                                        <span class="text-sm text-surface-400 dark:text-surface-500">暂不可进入</span>
                                    }
                                </div>
                            }
                        </div>
                    </section-card>
                </div>
            } @else {
                <section-card>
                    <ng-template #title>正在整理工作区</ng-template>
                    <ng-template #description>{{ guidanceError() ?? '正在根据当前项目状态整理入口和下一步。' }}</ng-template>
                </section-card>
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
