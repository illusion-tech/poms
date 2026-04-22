import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { ProjectContextTagSeverity } from './project-context-header';

export interface WorkspaceFactGridItem {
    label: string;
    value: string | number | null | undefined;
    detail?: string | null;
    icon?: string;
    severity?: ProjectContextTagSeverity;
    emphasis?: boolean;
}

@Component({
    selector: 'app-workspace-fact-grid',
    standalone: true,
    imports: [CommonModule, TagModule],
    styles: [
        `
            @media (min-width: 1280px) {
                .workspace-fact-grid {
                    grid-template-columns: repeat(var(--workspace-fact-columns), minmax(0, 1fr));
                }
            }
        `
    ],
    template: `
        <div class="workspace-fact-grid grid grid-cols-1 gap-3 md:grid-cols-2" [style.--workspace-fact-columns]="columns">
            @for (item of items; track item.label) {
                <div class="rounded-[8px] border border-surface-200 px-4 py-3 dark:border-surface-700">
                    <div class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                        @if (item.icon) {
                            <i [class]="item.icon"></i>
                        }
                        <span>{{ item.label }}</span>
                    </div>

                    @if (item.severity) {
                        <div class="mt-2 flex items-center gap-2">
                            <p-tag [value]="valueText(item)" [severity]="item.severity" styleClass="rounded-[6px]!" />
                        </div>
                    } @else {
                        <div class="mt-2 font-medium text-surface-950 dark:text-surface-0" [ngClass]="item.emphasis ? 'text-lg' : 'text-sm'">
                            {{ valueText(item) }}
                        </div>
                    }

                    @if (item.detail) {
                        <div class="mt-2 text-xs text-surface-400 dark:text-surface-500">{{ item.detail }}</div>
                    }
                </div>
            }
        </div>
    `
})
export class WorkspaceFactGrid {
    @Input() items: readonly WorkspaceFactGridItem[] = [];
    @Input() columns = 4;

    valueText(item: WorkspaceFactGridItem): string {
        if (item.value === null || item.value === undefined || item.value === '') {
            return '待确认';
        }

        return String(item.value);
    }
}
