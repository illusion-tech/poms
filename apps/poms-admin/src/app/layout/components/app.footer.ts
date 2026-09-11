import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { LayoutService } from '../service/layout.service';

@Component({
    selector: '[app-footer]',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="layout-footer">
            <div class="footer-logo-container">
                <img src="/layout/images/logo-{{ isDarkTheme() ? 'white' : 'dark' }}.svg" alt="poseidon-layout" />
                <span class="footer-app-name">Poseidon</span>
            </div>
            <span class="footer-copyright">&#169; Illusiontech - 2026</span>
        </div>
    `
})
export class AppFooter {
    layoutService = inject(LayoutService);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());
}
