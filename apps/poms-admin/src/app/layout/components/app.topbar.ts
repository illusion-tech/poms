import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthStore, TodoItemSummary } from '@poms/admin-data-access';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../service/layout.service';
import { AppBreadcrumb } from './app.breadcrumb';

@Component({
    selector: '[app-topbar]',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AppBreadcrumb, AvatarModule],
    template: ` <div class="layout-topbar">
        <div class="topbar-left">
            <a tabindex="0" #menubutton type="button" class="menu-button" (click)="onMenuButtonClick()">
                <i class="pi pi-chevron-left"></i>
            </a>
            <img class="horizontal-logo" src="/layout/images/logo-white.svg" alt="logo" />
            <span class="topbar-separator"></span>
            <div app-breadcrumb></div>
            <a routerLink="/">
                <img class="mobile-logo" src="/layout/images/logo-{{ isDarkTheme() ? 'white' : 'dark' }}.svg" alt="logo" />
            </a>
        </div>

        <div class="topbar-right">
            <ul class="topbar-menu">
                <li class="right-sidebar-item">
                    <a class="right-sidebar-button" (click)="toggleSearchBar()">
                        <i class="pi pi-search"></i>
                    </a>
                </li>
                <li class="right-sidebar-item">
                    <button class="app-config-button" (click)="onConfigButtonClick()"><i class="pi pi-cog"></i></button>
                </li>
                <li class="right-sidebar-item static sm:relative">
                    <a class="right-sidebar-button relative z-50" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveActiveClass="animate-fadeout" leaveToClass="hidden" [hideOnOutsideClick]="true">
                        @if (openTodosCount() > 0) {
                            <span class="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2.5"></span>
                        }
                        <i class="pi pi-bell"></i>
                    </a>
                    <div
                        class="list-none m-0 py-4 px-4 rounded-3xl border border-surface absolute bg-surface-0 dark:bg-surface-900 overflow-hidden hidden origin-top min-w-72 sm:w-[24rem] mt-2 right-0 z-50 top-auto shadow-[0px_56px_16px_0px_rgba(0,0,0,0.00),0px_36px_14px_0px_rgba(0,0,0,0.01),0px_20px_12px_0px_rgba(0,0,0,0.02),0px_9px_9px_0px_rgba(0,0,0,0.03),0px_2px_5px_0px_rgba(0,0,0,0.04)]"
                        style="right: -100px"
                    >
                        <div class="flex items-center gap-2 justify-between mb-4">
                            <span class="text-lg font-medium text-surface-950 dark:text-surface-0">待办事项</span>
                            @if (openTodosCount() > 0) {
                                <span class="px-2 py-1 rounded-md text-xs font-semibold bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300">{{ openTodosCount() }} 项待处理</span>
                            }
                        </div>
                        @if (myTodos().length === 0) {
                            <div class="py-8 text-center">
                                <i class="pi pi-check-circle text-4xl text-surface-300 dark:text-surface-600 mb-3"></i>
                                <p class="text-sm text-surface-500 dark:text-surface-400">暂无待办事项</p>
                            </div>
                        } @else {
                            <ul class="flex flex-col gap-4 max-h-80 overflow-y-auto">
                                @for (todo of myTodos(); track todo.id) {
                                    <li
                                        class="flex gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
                                        (click)="navigateToTodo(todo)"
                                    >
                                        <div class="flex items-start pt-0.5">
                                            <div class="w-8 h-8 flex items-center justify-center rounded-lg" [ngClass]="todo.status === 'open' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'">
                                                <i class="pi text-sm" [ngClass]="todo.status === 'open' ? 'pi-clock text-orange-600 dark:text-orange-400' : 'pi-check text-green-600 dark:text-green-400'"></i>
                                            </div>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2">
                                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0 truncate">{{ todo.title }}</span>
                                            </div>
                                            @if (todo.currentNodeName) {
                                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ todo.currentNodeName }}</span>
                                            }
                                            <div class="flex items-center gap-2 mt-1.5">
                                                <span class="text-xs text-surface-400 dark:text-surface-500">{{ todo.businessDomain }}</span>
                                                @if (todo.targetTitle) {
                                                    <span class="text-xs text-surface-300 dark:text-surface-600">&middot;</span>
                                                    <span class="text-xs text-surface-400 dark:text-surface-500 truncate">{{ todo.targetTitle }}</span>
                                                }
                                            </div>
                                        </div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </li>
                <li class="profile-item static sm:relative">
                    <a class="right-sidebar-button relative z-50" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveActiveClass="animate-fadeout" leaveToClass="hidden" [hideOnOutsideClick]="true">
                        <p-avatar styleClass="w-10! h-10!">
                            <img src="/layout/images/profile.jpg" />
                        </p-avatar>
                    </a>
                    <div
                        class="list-none p-2 m-0 rounded-2xl border border-surface overflow-hidden absolute bg-surface-0 dark:bg-surface-900 hidden origin-top w-52 mt-2 right-0 z-999 top-auto shadow-[0px_56px_16px_0px_rgba(0,0,0,0.00),0px_36px_14px_0px_rgba(0,0,0,0.01),0px_20px_12px_0px_rgba(0,0,0,0.02),0px_9px_9px_0px_rgba(0,0,0,0.03),0px_2px_5px_0px_rgba(0,0,0,0.04)]"
                    >
                        @if (currentUser()) {
                            <div class="px-2.5 py-2 mb-1 border-b border-surface">
                                <p class="text-sm font-medium text-surface-950 dark:text-surface-0 truncate">{{ currentUser()?.username }}</p>
                                <p class="text-xs text-surface-500 dark:text-surface-400 truncate">{{ currentUser()?.email }}</p>
                            </div>
                        }
                        <ul class="flex flex-col gap-1">
                            <li>
                                <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-user"></i>
                                    <span>Profile</span>
                                </a>
                            </li>
                            <li>
                                <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-cog"></i>
                                    <span>Settings</span>
                                </a>
                            </li>
                            <li>
                                <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-calendar"></i>
                                    <span>Calendar</span>
                                </a>
                            </li>
                            <li>
                                <a class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-inbox"></i>
                                    <span>Inbox</span>
                                </a>
                            </li>
                            <li>
                                <a (click)="logout()" class="label-small dark:text-surface-400 flex gap-2 py-2 px-2.5 rounded-lg items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                    <i class="pi pi-power-off"></i>
                                    <span>Log out</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </li>
                <li class="right-sidebar-item">
                    <a tabindex="0" class="right-sidebar-button" (click)="showRightMenu()">
                        <i class="pi pi-align-right"></i>
                    </a>
                </li>
            </ul>
        </div>
    </div>`
})
export class AppTopbar {
    layoutService = inject(LayoutService);
    readonly #authStore = inject(AuthStore);
    readonly #router = inject(Router);

    isDarkTheme = computed(() => this.layoutService.isDarkTheme());
    currentUser = computed(() => this.#authStore.currentUser());
    myTodos = computed(() => this.#authStore.myTodos());
    openTodosCount = computed(() => this.#authStore.openTodosCount());

    logout() {
        this.#authStore.logout();
        this.#router.navigate(['/auth/login']);
    }

    navigateToTodo(todo: TodoItemSummary) {
        if (todo.targetObjectType === 'Contract') {
            this.#router.navigate(['/contracts', todo.targetObjectId]);
        } else if (todo.targetObjectType === 'Project') {
            this.#router.navigate(['/projects', todo.targetObjectId]);
        }
    }

    @ViewChild('menubutton') menuButton!: ElementRef;

    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    showRightMenu() {
        this.layoutService.toggleRightMenu();
    }

    onConfigButtonClick() {
        this.layoutService.showConfigSidebar();
    }

    toggleSearchBar() {
        this.layoutService.layoutState.update((value) => ({ ...value, searchBarActive: !value.searchBarActive }));
    }
}
