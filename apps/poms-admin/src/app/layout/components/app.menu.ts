import { Component, ElementRef, inject, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: '[app-menu]',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model(); track $index) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `
})
export class AppMenu {
    el: ElementRef = inject(ElementRef);
    #authStore = inject(AuthStore);

    @ViewChild('menuContainer') menuContainer!: ElementRef;

    readonly model = computed(() => {
        const dynamicMenu = this.#authStore.menuModel();
        if (dynamicMenu.length > 0) {
            return dynamicMenu;
        }
        return this.#staticFallback;
    });

    readonly #staticFallback: any[] = [
        {
            label: '工作台',
            icon: 'pi pi-home',
            routerLink: ['/dashboard']
        },
        { separator: true },
        {
            label: '项目管理',
            icon: 'pi pi-briefcase',
            routerLink: ['/projects']
        },
        { separator: true },
        {
            label: '合同管理',
            icon: 'pi pi-file-edit',
            routerLink: ['/contracts']
        },
        { separator: true },
        {
            label: '平台配置',
            icon: 'pi pi-cog',
            items: [
                {
                    label: '用户管理',
                    icon: 'pi pi-users',
                    routerLink: ['/platform/users']
                },
                {
                    label: '角色管理',
                    icon: 'pi pi-shield',
                    routerLink: ['/platform/roles']
                },
                {
                    label: '组织管理',
                    icon: 'pi pi-building',
                    routerLink: ['/platform/org-units']
                }
            ]
        }
    ];
}
