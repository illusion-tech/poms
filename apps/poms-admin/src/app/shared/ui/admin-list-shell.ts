import { Component } from '@angular/core';

@Component({
    selector: 'app-admin-list-shell',
    standalone: true,
    template: `
        <section class="flex flex-col overflow-hidden rounded-[8px] border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900">
            <ng-content />
        </section>
    `
})
export class AdminListShell {}
