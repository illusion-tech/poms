import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

export interface WorkspaceNavItem {
    label: string;
    routerLink: string | unknown[] | null;
    exact?: boolean;
    enabled: boolean;
    disabledReason?: string;
}

@Component({
    selector: 'app-workspace-nav',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    template: `
        <nav class="flex flex-wrap gap-2" aria-label="工作区导航">
            @for (item of items; track item.label) {
                @if (item.enabled && item.routerLink) {
                    <a
                        pButton
                        [routerLink]="item.routerLink"
                        routerLinkActive="p-button-primary"
                        ariaCurrentWhenActive="page"
                        [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                        [label]="item.label"
                        severity="secondary"
                        [outlined]="true"
                        class="rounded-md!"
                    ></a>
                } @else {
                    <button
                        pButton
                        type="button"
                        [label]="disabledLabel(item)"
                        severity="secondary"
                        [outlined]="true"
                        [disabled]="true"
                        class="rounded-md!"
                    ></button>
                }
            }
        </nav>
    `
})
export class WorkspaceNav {
    @Input() items: readonly WorkspaceNavItem[] = [];

    disabledLabel(item: WorkspaceNavItem): string {
        return item.disabledReason ? `${item.label} · ${item.disabledReason}` : `${item.label} · 当前不可进入`;
    }
}
