import { CommonModule } from '@angular/common';
import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import type { UiTagSeverity } from './ui-severity';

export type ProjectContextTagSeverity = UiTagSeverity;

@Component({
    selector: 'app-project-context-header',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule, ToolbarModule],
    template: `
        <div class="card">
            <p-toolbar styleClass="border-0! bg-transparent! p-0!">
                <ng-template #start>
                    <div class="flex min-w-0 items-start gap-3">
                        @if (showBack) {
                            <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" severity="secondary" [attr.aria-label]="backLabel" styleClass="rounded-md!" (onClick)="back.emit()" />
                        }
                        <div class="min-w-0">
                            @if (eyebrow) {
                                <p class="text-sm font-medium text-surface-500 dark:text-surface-400">{{ eyebrow }}</p>
                            }
                            <h1 class="mt-1 text-2xl font-semibold leading-8 text-surface-950 dark:text-surface-0">{{ title }}</h1>
                            @if (subtitle) {
                                <p class="mt-2 text-sm leading-5 text-surface-500 dark:text-surface-400">{{ subtitle }}</p>
                            }
                        </div>
                    </div>
                </ng-template>

                <ng-template #end>
                    <div class="mt-4 flex flex-wrap items-center justify-start gap-2 lg:mt-0 lg:justify-end">
                        @if (stageLabel) {
                            <p-tag [value]="stageLabel" [severity]="stageSeverity" styleClass="rounded-[6px]!" />
                        }
                        @if (statusLabel) {
                            <p-tag [value]="statusLabel" [severity]="statusSeverity" styleClass="rounded-[6px]!" />
                        }
                        @if (actionsTemplate) {
                            <ng-container [ngTemplateOutlet]="actionsTemplate"></ng-container>
                        }
                    </div>
                </ng-template>
            </p-toolbar>

            <ng-content></ng-content>
        </div>
    `
})
export class ProjectContextHeader {
    @Input() eyebrow = '';
    @Input() title = '';
    @Input() subtitle: string | null = null;
    @Input() stageLabel: string | null = null;
    @Input() stageSeverity: ProjectContextTagSeverity = undefined;
    @Input() statusLabel: string | null = null;
    @Input() statusSeverity: ProjectContextTagSeverity = undefined;
    @Input() showBack = true;
    @Input() backLabel = '返回';

    @Output() back = new EventEmitter<void>();

    @ContentChild('actions') actionsTemplate?: TemplateRef<unknown>;
}
