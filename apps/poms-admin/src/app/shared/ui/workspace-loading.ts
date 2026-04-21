import { Component, Input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'app-workspace-loading',
    standalone: true,
    imports: [ProgressSpinnerModule],
    template: `
        <div class="flex items-center justify-center py-20" role="status" [attr.aria-label]="label">
            <p-progress-spinner ariaLabel="正在读取" strokeWidth="4" animationDuration=".8s" styleClass="h-12! w-12!" />
        </div>
    `
})
export class WorkspaceLoading {
    @Input() label = '正在读取';
}
