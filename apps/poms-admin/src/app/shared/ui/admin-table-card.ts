import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
    selector: 'app-admin-table-card',
    standalone: true,
    imports: [ToolbarModule],
    template: `
        <div class="card">
            <p-toolbar class="p-component p-toolbar mb-4">
                <ng-template #start>
                    <ng-content select="[adminToolbarStart]" />
                </ng-template>
                <ng-template #center>
                    <ng-content select="[adminToolbarCenter]" />
                </ng-template>
                <ng-template #end>
                    <ng-content select="[adminToolbarEnd]" />
                </ng-template>
            </p-toolbar>

            <ng-content />
        </div>
    `
})
export class AdminTableCard {}
