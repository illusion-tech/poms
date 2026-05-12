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
            .workspace-fact-grid-shell {
                container-type: inline-size;
                display: block;
                width: 100%;
            }

            .workspace-fact-grid {
                grid-template-columns: repeat(1, minmax(0, 1fr));
            }

            @container (min-width: 40rem) {
                .workspace-fact-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @container (min-width: 72rem) {
                .workspace-fact-grid {
                    grid-template-columns: repeat(var(--workspace-fact-columns), minmax(0, 1fr));
                }
            }
        `
    ],
    template: `
        <div class="workspace-fact-grid-shell" [style.--workspace-fact-columns]="columns">
            <div class="workspace-fact-grid grid gap-3">
                @for (item of items; track item.label) {
                    <div class="rounded-[8px] border border-surface-200 bg-surface-0/60 px-4 py-3 shadow-none dark:border-surface-700 dark:bg-surface-900/40">
                        <div class="flex min-w-0 items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                            @if (item.icon) {
                                <i class="shrink-0" [ngClass]="item.icon"></i>
                            }
                            <span class="min-w-0 truncate">{{ item.label }}</span>
                        </div>

                        @if (item.severity) {
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="valueText(item)" [severity]="item.severity" class="rounded-[6px]!" />
                            </div>
                        } @else {
                            <div class="mt-2 break-words font-medium text-surface-950 dark:text-surface-0" [ngClass]="item.emphasis ? 'text-lg' : 'text-sm'">
                                {{ valueText(item) }}
                            </div>
                        }

                        @if (item.detail) {
                            <div class="mt-2 break-words text-xs text-surface-400 dark:text-surface-500">{{ item.detail }}</div>
                        }
                    </div>
                }
            </div>
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
