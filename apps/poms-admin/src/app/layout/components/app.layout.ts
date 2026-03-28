import { AppBreadcrumb } from '@/app/layout/components/app.breadcrumb';
import { AppFooter } from '@/app/layout/components/app.footer';
import { AppRightMenu } from '@/app/layout/components/app.rightmenu';
import { AppSearch } from '@/app/layout/components/app.search';
import { LayoutService } from '@/app/layout/service/layout.service';
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppConfigurator } from './app.configurator';
import { AppSidebar } from './app.sidebar';
import { AppTopbar } from './app.topbar';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppConfigurator, AppBreadcrumb, AppFooter, AppSearch, AppRightMenu],
    template: `
        <div class="layout-wrapper" [ngClass]="containerClass()">
            <div app-sidebar></div>
            <div class="layout-content-wrapper">
                <div class="layout-content-wrapper-inside">
                    <div app-topbar></div>
                    <div class="layout-content">
                        <div app-breadcrumb></div>
                        <router-outlet></router-outlet>
                    </div>
                    <div app-footer></div>
                </div>
            </div>
            @defer (when layoutService.layoutState().configSidebarVisible) {
                <app-configurator />
            }
            @defer (when layoutService.layoutState().searchBarActive) {
                <div app-search></div>
            }
            @defer (when layoutService.layoutState().rightMenuVisible) {
                <div app-rightmenu></div>
            }
            <div class="layout-mask"></div>
        </div>
    `
})
export class AppLayout {
    layoutService: LayoutService = inject(LayoutService);

    containerClass = computed(() => {
        const layoutConfig = this.layoutService.layoutConfig();
        const layoutState = this.layoutService.layoutState();

        return {
            'layout-overlay': layoutConfig.menuMode === 'overlay',
            'layout-static': layoutConfig.menuMode === 'static',
            'layout-slim': layoutConfig.menuMode === 'slim',
            'layout-horizontal': layoutConfig.menuMode === 'horizontal',
            'layout-compact': layoutConfig.menuMode === 'compact',
            'layout-reveal': layoutConfig.menuMode === 'reveal',
            'layout-drawer': layoutConfig.menuMode === 'drawer',
            'layout-overlay-active': layoutState.overlayMenuActive,
            'layout-mobile-active': layoutState.mobileMenuActive,
            'layout-static-inactive': layoutState.staticMenuInactive,
            'layout-sidebar-expanded': layoutState.sidebarExpanded,
            'layout-sidebar-anchored': layoutState.anchored
        };
    });
}
