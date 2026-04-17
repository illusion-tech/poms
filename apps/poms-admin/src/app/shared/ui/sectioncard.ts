import { CommonModule } from '@angular/common';
import { Component, ContentChild, TemplateRef, AfterContentInit } from '@angular/core';

@Component({
    selector: 'section-card',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div *ngIf="hasTitle || hasDescription || hasAction" class="flex flex-wrap items-start justify-between gap-2">
            <div>
                <ng-container *ngIf="titleTemplate">
                    <h4 class="text-lg font-medium text-surface-950 dark:text-surface-0">
                        <ng-container *ngTemplateOutlet="titleTemplate"></ng-container>
                    </h4>
                </ng-container>

                <ng-container *ngIf="descriptionTemplate">
                    <p class="mt-1 text-sm text-surface-500">
                        <ng-container *ngTemplateOutlet="descriptionTemplate"></ng-container>
                    </p>
                </ng-container>
            </div>

            <ng-container *ngIf="actionTemplate" [ngTemplateOutlet]="actionTemplate"></ng-container>
        </div>

        <ng-content></ng-content>
        <ng-container *ngIf="footerTemplate" [ngTemplateOutlet]="footerTemplate"></ng-container>
    `,
    host: {
        class: 'card'
    }
})
export class SectionCard implements AfterContentInit {
    @ContentChild('title') titleTemplate!: TemplateRef<unknown>;

    @ContentChild('description') descriptionTemplate!: TemplateRef<unknown>;

    @ContentChild('action') actionTemplate!: TemplateRef<unknown>;

    @ContentChild('footer') footerTemplate!: TemplateRef<unknown>;

    hasTitle: boolean = false;

    hasDescription: boolean = false;

    hasAction: boolean = false;

    ngAfterContentInit() {
        this.hasTitle = !!this.titleTemplate;

        this.hasDescription = !!this.descriptionTemplate;

        this.hasAction = !!this.actionTemplate;
    }
}
