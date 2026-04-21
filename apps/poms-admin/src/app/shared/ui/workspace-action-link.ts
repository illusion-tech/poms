import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

type ActionLinkSeverity = 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'help';

@Component({
    selector: 'app-workspace-action-link',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    template: `
        <a
            pButton
            [routerLink]="routerLink"
            [label]="label"
            [icon]="icon ?? ''"
            [severity]="severity"
            [outlined]="outlined"
            [size]="size"
            class="rounded-md!"
        ></a>
    `
})
export class WorkspaceActionLink {
    @Input({ required: true }) routerLink!: string | unknown[];
    @Input({ required: true }) label!: string;
    @Input() icon?: string;
    @Input() severity: ActionLinkSeverity = 'secondary';
    @Input() outlined = true;
    @Input() size: 'small' | 'large' | undefined;
}
