import { Component, ElementRef, inject, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { AppMenuitem, type AppMenuItemModel } from './app.menuitem';

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

    readonly #staticFallback: AppMenuItemModel[] = [
        {
            label: '总览',
            icon: 'pi pi-th-large',
            items: [
                {
                    label: '工作台',
                    icon: 'pi pi-home',
                    routerLink: ['/dashboard']
                }
            ]
        },
        { separator: true },
        {
            label: '业务管理',
            icon: 'pi pi-briefcase',
            items: [
                {
                    label: '线索管理',
                    icon: 'pi pi-compass',
                    routerLink: ['/leads']
                },
                {
                    label: '项目管理',
                    icon: 'pi pi-briefcase',
                    routerLink: ['/projects']
                },
                {
                    label: '合同管理',
                    icon: 'pi pi-file-edit',
                    routerLink: ['/contracts']
                },
                {
                    label: '附件中心',
                    icon: 'pi pi-paperclip',
                    routerLink: ['/attachments']
                }
            ]
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
                },
                {
                    label: '业务字典',
                    icon: 'pi pi-book',
                    routerLink: ['/platform/dictionaries']
                },
                {
                    label: '外部身份提供商',
                    icon: 'pi pi-id-card',
                    routerLink: ['/platform/identity-providers']
                },
                {
                    label: '附件存储提供商',
                    icon: 'pi pi-cloud',
                    routerLink: ['/platform/attachment-storage-providers']
                },
                {
                    label: '系统设置',
                    icon: 'pi pi-sliders-h',
                    routerLink: ['/platform/system-settings']
                },
                {
                    label: '导航菜单',
                    icon: 'pi pi-bars',
                    routerLink: ['/platform/navigation']
                }
            ]
        },
        { separator: true },
        {
            label: '个人设置',
            icon: 'pi pi-user',
            items: [
                {
                    label: '个人中心',
                    icon: 'pi pi-user',
                    routerLink: ['/profile']
                }
            ]
        }
    ];
}
