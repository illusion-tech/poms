import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarWidget } from '@poms/admin/features/landing/components/topbarwidget';
import { RouterModule } from '@angular/router';
import { FooterWidget } from '@poms/admin/features/landing/components/footerwidget';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'app-landing-layout',
    standalone: true,
    imports: [CommonModule, TopbarWidget, RouterModule, FooterWidget, AppConfigurator],
    template: ` <div class="w-full min-h-screen">
        <topbar-widget />
        <main>
            <router-outlet />
        </main>
        <footer-widget />
        <button class="layout-config-button config-link" (click)="layoutService.toggleConfigSidebar()">
            <i class="pi pi-cog"></i>
        </button>
        @defer (when layoutService.layoutState().configSidebarVisible) {
            <app-configurator location="landing" />
        }
    </div>`
})
export class LandingLayout {
    layoutService: LayoutService = inject(LayoutService);
}
