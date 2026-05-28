import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
    selector: 'app-admin-list-toolbar',
    standalone: true,
    imports: [ToolbarModule],
    template: `
        <p-toolbar styleClass="poms-admin-list-toolbar">
            <ng-template #start>
                <ng-content select="[adminToolbarStart]" />
            </ng-template>
            <ng-template #end>
                <ng-content select="[adminToolbarEnd]" />
            </ng-template>
        </p-toolbar>
    `
})
export class AdminListToolbar {}
