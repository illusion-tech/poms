import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SectionCard } from './sectioncard';

export interface WorkspaceCommandPanelItem {
    label: string;
    value: string;
    icon?: string;
}

@Component({
    selector: 'app-workspace-command-panel',
    standalone: true,
    imports: [CommonModule, SectionCard],
    styles: [
        `
            .workspace-command-panel {
                container-type: inline-size;
                display: block;
                width: 100%;
            }

            .workspace-command-grid {
                grid-template-columns: repeat(1, minmax(0, 1fr));
            }

            @container (min-width: 40rem) {
                .workspace-command-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @container (min-width: 60rem) {
                .workspace-command-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }

            @container (min-width: 76rem) {
                .workspace-command-grid {
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                }
            }
        `
    ],
    template: `
        <section-card class="workspace-command-panel">
            <ng-template #title>{{ heading }}</ng-template>
            <ng-template #description>{{ caption }}</ng-template>

            <div class="workspace-command-grid mt-4 grid gap-3">
                @for (item of items; track item.label) {
                    <div class="min-h-28 rounded-[8px] border border-surface-200 bg-surface-0/60 px-4 py-3 shadow-none dark:border-surface-700 dark:bg-surface-900/40">
                        <div class="flex min-w-0 items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                            @if (item.icon) {
                                <i class="shrink-0" [ngClass]="item.icon"></i>
                            }
                            <span class="min-w-0 truncate">{{ item.label }}</span>
                        </div>
                        <div class="mt-2 break-words text-sm font-medium leading-6 text-surface-950 dark:text-surface-0">{{ item.value }}</div>
                    </div>
                }
            </div>
        </section-card>
    `
})
export class WorkspaceCommandPanel {
    @Input() heading = '当前工作重点';
    @Input() caption = '先看当前阶段、下一步、缺口和责任归口。';
    @Input() items: readonly WorkspaceCommandPanelItem[] = [];
}
