import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import type { ProjectContextTagSeverity } from './project-context-header';

export type ProjectLifecycleItemState = 'done' | 'current' | 'pending' | 'blocked';

export interface ProjectLifecycleTimelineItem {
    key: string;
    label: string;
    description: string;
    state: ProjectLifecycleItemState;
    severity?: ProjectContextTagSeverity;
    detail?: string | null;
    completedAtLabel?: string | null;
    tooltip?: string | null;
}

@Component({
    selector: 'app-project-lifecycle-timeline',
    standalone: true,
    imports: [CommonModule, TagModule, TimelineModule, TooltipModule],
    template: `
        <div class="card">
            <div class="lc-head">
                <div>
                    <h2 class="lc-title">{{ title }}</h2>
                    <p class="lc-subtitle">{{ description }}</p>
                </div>
            </div>

            <div class="lc-h" aria-label="项目生命周期横向阶段线">
                <div class="lc-scroll" tabindex="0" aria-label="横向滚动查看全部项目阶段">
                    <ol class="lc-rail" [style.--lc-count]="items.length || 1">
                        @for (item of items; track item.key; let first = $first; let last = $last) {
                            <li class="lc-node">
                                <div class="lc-marker-row">
                                    <span class="lc-line" [class.lc-line-hidden]="first"></span>
                                    <span
                                        class="lc-marker"
                                        [ngClass]="markerClass(item.state)"
                                        [pTooltip]="tooltipText(item)"
                                        [tooltipDisabled]="!hasTooltip(item)"
                                        tooltipPosition="top"
                                        tabindex="0"
                                        [attr.aria-label]="markerAriaLabel(item)"
                                    >
                                        <i [class]="stateIcon(item.state)"></i>
                                    </span>
                                    <span class="lc-line" [class.lc-line-hidden]="last"></span>
                                </div>
                                <div class="lc-stage">
                                    <div class="lc-label">{{ item.label }}</div>
                                    <p class="lc-copy">{{ item.description }}</p>
                                    <p-tag [value]="stateLabel(item.state)" [severity]="item.severity ?? stateSeverity(item.state)" styleClass="lc-tag" />
                                    @if (detailText(item)) {
                                        <div class="lc-detail">{{ detailText(item) }}</div>
                                    }
                                </div>
                            </li>
                        }
                    </ol>
                </div>
            </div>

            <div class="lc-v" aria-label="项目生命周期纵向阶段线">
                <p-timeline [value]="items" align="left" styleClass="lc-timeline lc-timeline-v">
                    <ng-template #marker let-item>
                        <span
                            class="lc-marker"
                            [ngClass]="markerClass(item.state)"
                            [pTooltip]="tooltipText(item)"
                            [tooltipDisabled]="!hasTooltip(item)"
                            tooltipPosition="right"
                            tabindex="0"
                            [attr.aria-label]="markerAriaLabel(item)"
                        >
                            <i [class]="stateIcon(item.state)"></i>
                        </span>
                    </ng-template>
                    <ng-template #content let-item>
                        <div class="lc-stage lc-stage-v">
                            <div class="lc-label">{{ item.label }}</div>
                            <p class="lc-copy">{{ item.description }}</p>
                            <p-tag [value]="stateLabel(item.state)" [severity]="item.severity ?? stateSeverity(item.state)" styleClass="lc-tag" />
                            @if (detailText(item)) {
                                <div class="lc-detail">{{ detailText(item) }}</div>
                            }
                        </div>
                    </ng-template>
                </p-timeline>
            </div>
        </div>
    `,
    styles: [
        `
            .lc-head {
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
                justify-content: space-between;
                gap: 0.75rem;
                margin-bottom: 1rem;
            }

            .lc-title {
                margin: 0;
                color: var(--text-color);
                font-size: 1.125rem;
                font-weight: 500;
                line-height: 1.4;
            }

            .lc-subtitle {
                margin: 0.25rem 0 0;
                color: var(--text-color-secondary);
                font-size: 0.875rem;
                line-height: 1.5;
            }

            .lc-h {
                display: none;
            }

            .lc-scroll {
                overflow-x: auto;
                padding-bottom: 0.25rem;
            }

            .lc-rail {
                display: grid;
                grid-template-columns: repeat(var(--lc-count), minmax(8rem, 1fr));
                min-width: 64rem;
                margin-inline: auto;
                padding: 0;
                list-style: none;
            }

            .lc-marker-row {
                display: grid;
                width: 100%;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                margin-bottom: 1rem;
            }

            .lc-line {
                height: 1px;
                background: var(--surface-border);
            }

            .lc-line-hidden {
                visibility: hidden;
            }

            .lc-marker {
                position: relative;
                z-index: 1;
                display: inline-flex;
                width: 2rem;
                height: 2rem;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--surface-border);
                border-radius: 999px;
                box-shadow: var(--card-shadow);
                font-size: 0.875rem;
            }

            .lc-done {
                border-color: #bbf7d0;
                background: #f0fdf4;
                color: #15803d;
            }

            .lc-current {
                border-color: color-mix(in srgb, var(--primary-color) 30%, transparent);
                background: color-mix(in srgb, var(--primary-color) 10%, transparent);
                color: var(--primary-color);
            }

            .lc-pending {
                border-color: var(--surface-border);
                background: var(--surface-card);
                color: var(--text-color-secondary);
            }

            .lc-blocked {
                border-color: #fde68a;
                background: #fffbeb;
                color: #b45309;
            }

            .lc-stage {
                width: 8.5rem;
                margin-inline: auto;
                text-align: center;
            }

            .lc-stage-v {
                width: auto;
                margin-inline: 0;
                padding-bottom: 1.25rem;
                text-align: left;
            }

            .lc-label {
                color: var(--text-color);
                font-size: 0.875rem;
                font-weight: 500;
                line-height: 1.4;
            }

            .lc-copy {
                min-height: 2.5rem;
                margin: 0.25rem 0 0;
                color: var(--text-color-secondary);
                font-size: 0.75rem;
                line-height: 1.5;
            }

            .lc-detail {
                margin-top: 0.375rem;
                color: var(--text-color-secondary);
                font-size: 0.75rem;
            }

            :host ::ng-deep .lc-tag {
                margin-top: 0.5rem;
                border-radius: 6px;
            }

            :host ::ng-deep .lc-timeline-v .p-timeline-event-content {
                padding: 0 0 0 1rem;
            }

            @media (min-width: 768px) {
                .lc-h {
                    display: block;
                }

                .lc-v {
                    display: none;
                }
            }
        `
    ]
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
            done: 'lc-done',
            current: 'lc-current',
            pending: 'lc-pending',
            blocked: 'lc-blocked'
        };
        return classes[state];
    }

    detailText(item: ProjectLifecycleTimelineItem): string {
        if (item.completedAtLabel?.trim()) {
            return `完成：${item.completedAtLabel.trim()}`;
        }

        return item.detail?.trim() ?? '';
    }

    tooltipText(item: ProjectLifecycleTimelineItem): string {
        if (item.tooltip?.trim()) {
            return item.tooltip.trim();
        }

        if (item.completedAtLabel?.trim()) {
            return `完成时间：${item.completedAtLabel.trim()}`;
        }

        if (item.state === 'done') {
            return `${item.label}已完成`;
        }

        return '';
    }

    hasTooltip(item: ProjectLifecycleTimelineItem): boolean {
        return this.tooltipText(item).length > 0;
    }

    markerAriaLabel(item: ProjectLifecycleTimelineItem): string {
        const tooltip = this.tooltipText(item);
        const prefix = `${item.label}，${this.stateLabel(item.state)}`;
        return tooltip ? `${prefix}，${tooltip}` : prefix;
    }
}
