import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import type { ProjectContextTagSeverity } from './project-context-header';

export type ProjectLifecycleItemState = 'done' | 'current' | 'pending' | 'blocked';

export interface ProjectLifecycleTimelineItem {
    key: string;
    label: string;
    description: string;
    state: ProjectLifecycleItemState;
    severity?: ProjectContextTagSeverity;
}

@Component({
    selector: 'app-project-lifecycle-timeline',
    standalone: true,
    imports: [CommonModule, TagModule, TimelineModule],
    template: `
        <div class="card">
            <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 class="text-lg font-medium text-surface-950 dark:text-surface-0">{{ title }}</h2>
                    <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">{{ description }}</p>
                </div>
            </div>

            <div class="overflow-x-auto pb-1">
                <p-timeline [value]="items" layout="horizontal" align="top" styleClass="min-w-[44rem]">
                    <ng-template #marker let-item>
                        <span
                            class="z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm shadow-sm"
                            [ngClass]="markerClass(item.state)"
                            [attr.aria-label]="stateLabel(item.state)"
                        >
                            <i [class]="stateIcon(item.state)"></i>
                        </span>
                    </ng-template>
                    <ng-template #content let-item>
                        <div class="w-36">
                            <div class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</div>
                            <p class="mt-1 min-h-10 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ item.description }}</p>
                            <p-tag [value]="stateLabel(item.state)" [severity]="item.severity ?? stateSeverity(item.state)" styleClass="mt-2 rounded-[6px]!" />
                        </div>
                    </ng-template>
                    <ng-template #opposite>&nbsp;</ng-template>
                </p-timeline>
            </div>
        </div>
    `
})
export class ProjectLifecycleTimeline {
    @Input() title = '项目生命周期';
    @Input() description = '用同一条阶段线区分对象详情和连续工作推进。';
    @Input() items: ProjectLifecycleTimelineItem[] = [];

    stateLabel(state: ProjectLifecycleItemState): string {
        const labels: Record<ProjectLifecycleItemState, string> = {
            done: '已走过',
            current: '当前',
            pending: '待推进',
            blocked: '有阻断'
        };
        return labels[state];
    }

    stateIcon(state: ProjectLifecycleItemState): string {
        const icons: Record<ProjectLifecycleItemState, string> = {
            done: 'pi pi-check',
            current: 'pi pi-circle-fill',
            pending: 'pi pi-clock',
            blocked: 'pi pi-exclamation-triangle'
        };
        return icons[state];
    }

    stateSeverity(state: ProjectLifecycleItemState): ProjectContextTagSeverity {
        const severities: Record<ProjectLifecycleItemState, Exclude<ProjectContextTagSeverity, undefined>> = {
            done: 'success',
            current: 'info',
            pending: 'secondary',
            blocked: 'warn'
        };
        return severities[state];
    }

    markerClass(state: ProjectLifecycleItemState): string {
        const classes: Record<ProjectLifecycleItemState, string> = {
            done: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200',
            current: 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-200',
            pending: 'border-surface-200 bg-surface-0 text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400',
            blocked: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
        };
        return classes[state];
    }
}
