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
            path: 'overview',
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
            path: 'business',
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
            path: 'platform',
            items: [
                {
                    label: '人员与权限',
                    icon: 'pi pi-users',
                    path: 'platform/people-access',
                    items: [
                        {
                            label: '用户管理',
                            icon: 'pi pi-users',
                            routerLink: ['/platform/users']
                        },
                        {
                            label: '角色与权限',
                            icon: 'pi pi-shield',
                            routerLink: ['/platform/roles']
                        }
                    ]
                },
                {
                    label: '组织架构',
                    icon: 'pi pi-sitemap',
                    path: 'platform/organization',
                    items: [
                        {
                            label: '组织单元',
                            icon: 'pi pi-sitemap',
                            routerLink: ['/platform/org-units']
                        },
                        {
                            label: '外部组织同步',
                            icon: 'pi pi-sync',
                            routerLink: ['/platform/external-org-sync']
                        }
                    ]
                },
                {
                    label: '集成与连接',
                    icon: 'pi pi-link',
                    path: 'platform/integrations',
                    items: [
                        {
                            label: '企业协同接入',
                            icon: 'pi pi-id-card',
                            routerLink: ['/platform/identity-providers']
                        },
                        {
                            label: '文件存储接入',
                            icon: 'pi pi-cloud',
                            routerLink: ['/platform/attachment-storage-providers']
                        }
                    ]
                },
                {
                    label: '业务配置',
                    icon: 'pi pi-sliders-h',
                    path: 'platform/business-config',
                    items: [
                        {
                            label: '业务字典',
                            icon: 'pi pi-book',
                            routerLink: ['/platform/dictionaries']
                        },
                        {
                            label: '系统设置',
                            icon: 'pi pi-sliders-h',
                            routerLink: ['/platform/system-settings']
                        }
                    ]
                },
                {
                    label: '系统治理',
                    icon: 'pi pi-cog',
                    path: 'platform/system-governance',
                    items: [
                        {
                            label: '导航菜单',
                            icon: 'pi pi-bars',
                            routerLink: ['/platform/navigation']
                        }
                    ]
                }
            ]
        },
        { separator: true },
        {
            label: '个人设置',
            icon: 'pi pi-user',
            path: 'account',
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
