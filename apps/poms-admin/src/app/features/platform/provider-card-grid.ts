import { Component } from '@angular/core';

@Component({
    selector: 'app-provider-card-grid',
    standalone: true,
    template: `
        <div data-testid="provider-card-grid" class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            <ng-content />
        </div>
    `
})
export class ProviderCardGrid {}
