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
    template: `
        <section-card>
            <ng-template #title>{{ heading }}</ng-template>
            <ng-template #description>{{ caption }}</ng-template>

            <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                @for (item of items; track item.label) {
                    <div class="rounded-[8px] border border-surface-200 px-4 py-3 dark:border-surface-700">
                        <div class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                            @if (item.icon) {
                                <i [class]="item.icon"></i>
                            }
                            <span>{{ item.label }}</span>
                        </div>
                        <div class="mt-2 text-sm font-medium leading-6 text-surface-950 dark:text-surface-0">{{ item.value }}</div>
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
