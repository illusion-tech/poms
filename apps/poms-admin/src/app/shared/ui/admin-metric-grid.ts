import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface AdminMetricItem {
    readonly label: string;
    readonly value: string | number;
    readonly hint?: string | null;
    readonly valueClass?: string;
}

@Component({
    selector: 'app-admin-metric-grid',
    standalone: true,
    imports: [CommonModule],
    template: `
        <section class="card overflow-hidden p-0!">
            <div class="grid grid-cols-1" [ngClass]="gridClass">
                @for (item of items; track item.label) {
                    <div class="min-w-0 border-surface-200 p-5 dark:border-surface-800" [ngClass]="itemClass">
                        <div class="text-sm text-surface-500 dark:text-white/64">{{ item.label }}</div>
                        <div class="mt-2 flex min-w-0 items-end justify-between gap-3">
                            <span class="truncate text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0" [ngClass]="item.valueClass">{{ item.value }}</span>
                            @if (item.hint) {
                                <span class="shrink-0 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ item.hint }}</span>
                            }
                        </div>
                    </div>
                }
            </div>
        </section>
    `
})
export class AdminMetricGrid {
    @Input({ required: true }) items: readonly AdminMetricItem[] = [];

    @Input() columns: 3 | 4 = 4;

    get gridClass(): string {
        return this.columns === 3 ? 'grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4';
    }

    get itemClass(): string {
        return this.columns === 3 ? 'border-r last:border-r-0' : 'border-b last:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0';
    }
}
