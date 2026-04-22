import { Component, Input } from '@angular/core';
import { MessageModule } from 'primeng/message';

export type WorkspaceFeedbackSeverity = 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';

@Component({
    selector: 'app-workspace-feedback',
    standalone: true,
    imports: [MessageModule],
    template: `
        <p-message [severity]="severity" styleClass="w-full">
            <div class="flex flex-col gap-1">
                <span class="font-medium">{{ summary }}</span>
                @if (detail) {
                    <span class="text-sm leading-5">{{ detail }}</span>
                }
                <ng-content></ng-content>
            </div>
        </p-message>
    `
})
export class WorkspaceFeedback {
    @Input() severity: WorkspaceFeedbackSeverity = 'info';
    @Input() summary = '';
    @Input() detail: string | null = null;
}
