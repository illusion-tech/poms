import { CommonModule } from '@angular/common';
import { type AfterContentInit, Component, ContentChild, type TemplateRef } from '@angular/core';

@Component({
  selector: 'section-card',
  standalone: true,
  imports: [CommonModule],
  template: `
      @if (hasTitle || hasDescription || hasAction) {
        <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
          @if (titleTemplate) {
                <h4 class="text-lg font-medium text-surface-950 dark:text-surface-0">
                    <ng-container *ngTemplateOutlet="titleTemplate"></ng-container>
                </h4>
          }

          @if (descriptionTemplate) {
                <p class="mt-1 text-sm text-surface-500">
                    <ng-container *ngTemplateOutlet="descriptionTemplate"></ng-container>
                </p>
          }
            </div>

        @if (actionTemplate) {
          <ng-container *ngTemplateOutlet="actionTemplate"></ng-container>
        }
        </div>
      }

        <ng-content></ng-content>
      @if (footerTemplate) {
        <ng-container *ngTemplateOutlet="footerTemplate"></ng-container>
      }
    `,
  host: {
    class: 'card block',
  },
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
