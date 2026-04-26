import { Component, Input } from '@angular/core';
import { MessageModule } from 'primeng/message';
import type { UiMessageSeverity } from './ui-severity';

export type WorkspaceFeedbackSeverity = UiMessageSeverity;

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
