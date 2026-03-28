import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, type Route } from '@angular/router';
import type { NavigationSyncSummary } from '@poms/shared-contracts';
import { type NavigationItem, PlatformApi } from '@poms/shared-api-client';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { catchError, firstValueFrom, of } from 'rxjs';

type RouteAlignment = 'aligned' | 'missing' | 'container';
type Availability = 'active' | 'hidden' | 'disabled';

interface NavigationGovernanceRow {
    readonly id: string;
    readonly key: string;
    readonly title: string;
    readonly type: string;
    readonly link: string | null;
    readonly icon: string | null;
    readonly depth: number;
    readonly displayOrder: number;
    readonly requiredPermissionsText: string;
    readonly routeAlignment: RouteAlignment;
    readonly routeAlignmentLabel: string;
    readonly availability: Availability;
    readonly availabilityLabel: string;
}

@Component({
    selector: 'app-navigation-governance',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />

        <div class="flex flex-col gap-6">
            <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div class="space-y-2">
                        <h1 class="text-surface-950 dark:text-surface-0 text-lg font-medium leading-7">导航治理</h1>
                        <p class="text-sm text-surface-500 m-0">只读治理入口，展示后端导航 SSOT、权限要求与前端真实路由对齐状态。</p>
                    </div>

                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <p-iconfield class="w-full sm:w-[18rem]">
                            <p-inputicon class="pi pi-search" />
                            <input pInputText [(ngModel)]="searchValue" placeholder="搜索导航键、标题或路由" class="w-full! py-2! rounded-xl!" />
                        </p-iconfield>
                        <div class="flex items-center gap-3">
                            <p-button
                                icon="pi pi-history"
                                label="记录同步审计"
                                severity="contrast"
                                [loading]="syncing()"
                                (onClick)="syncAudit()"
                                class="w-full sm:w-auto"
                            />
                            <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" [loading]="loading()" (onClick)="reload()" class="w-full sm:w-auto" />
                        </div>
                    </div>
                </div>

                <div class="px-6 py-5 bg-surface-50 dark:bg-surface-950/40 border-b border-surface-200 dark:border-surface-700">
                    <div class="rounded-2xl border border-amber-300/70 bg-amber-50 dark:bg-amber-950/20 px-4 py-4">
                        <p class="text-sm text-surface-800 dark:text-surface-100 m-0 leading-6">
                            当前阶段仅补齐受控只读治理入口。标题、图标、排序、显隐、禁用与权限要求仍由代码评审和发布流程维护；
                            导航事实源同步审计与统一安全事件基线继续由 <span class="font-mono">P1-S13</span> 收口。
                        </p>
                    </div>
                </div>

                <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 border-b border-surface-200 dark:border-surface-700">
                    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 px-4 py-4">
                        <p class="text-xs uppercase tracking-wide text-surface-500 m-0">总节点数</p>
                        <p class="text-2xl font-semibold text-surface-950 dark:text-surface-0 mt-3 mb-0">{{ summary().totalNodes }}</p>
                    </div>
                    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 px-4 py-4">
                        <p class="text-xs uppercase tracking-wide text-surface-500 m-0">可跳转节点</p>
                        <p class="text-2xl font-semibold text-surface-950 dark:text-surface-0 mt-3 mb-0">{{ summary().routableNodes }}</p>
                    </div>
                    <div class="rounded-2xl border border-emerald-200 dark:border-emerald-800 px-4 py-4">
                        <p class="text-xs uppercase tracking-wide text-surface-500 m-0">已对齐路由</p>
                        <p class="text-2xl font-semibold text-emerald-700 dark:text-emerald-300 mt-3 mb-0">{{ summary().alignedRoutes }}</p>
                    </div>
                    <div class="rounded-2xl border border-rose-200 dark:border-rose-800 px-4 py-4">
                        <p class="text-xs uppercase tracking-wide text-surface-500 m-0">待处理路由缺口</p>
                        <p class="text-2xl font-semibold text-rose-700 dark:text-rose-300 mt-3 mb-0">{{ summary().missingRoutes }}</p>
                    </div>
                </div>

                <div class="px-6 py-5">
                    <p-table
                        [value]="filteredRows()"
                        [tableStyle]="{ width: '100%' }"
                        [scrollable]="true"
                        scrollHeight="flex"
                    >
                        <ng-template #header>
                            <tr>
                                <th style="width: 24%">导航项</th>
                                <th style="width: 12%">类型</th>
                                <th style="width: 22%">目标链接</th>
                                <th style="width: 16%">路由状态</th>
                                <th style="width: 10%">可见性</th>
                                <th style="width: 16%">权限要求</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td>
                                    <div class="flex flex-col gap-1" [style.padding-left.rem]="row.depth * 1.25 + 0.5">
                                        <span class="text-surface-950 dark:text-surface-0 text-sm font-medium">{{ row.title }}</span>
                                        <span class="text-surface-500 text-xs font-mono">{{ row.key }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200">
                                        {{ row.type }}
                                    </span>
                                </td>
                                <td>
                                    @if (row.link) {
                                        <div class="flex flex-col gap-1">
                                            <span class="text-sm text-surface-950 dark:text-surface-0 font-mono">{{ row.link }}</span>
                                            <span class="text-xs text-surface-500">displayOrder: {{ row.displayOrder }}</span>
                                        </div>
                                    } @else {
                                        <span class="text-sm text-surface-500">容器节点，无直接跳转</span>
                                    }
                                </td>
                                <td>
                                    <span
                                        class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                                        [ngClass]="{
                                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': row.routeAlignment === 'aligned',
                                            'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300': row.routeAlignment === 'missing',
                                            'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200': row.routeAlignment === 'container'
                                        }"
                                    >
                                        {{ row.routeAlignmentLabel }}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                                        [ngClass]="{
                                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': row.availability === 'active',
                                            'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': row.availability === 'disabled',
                                            'bg-surface-300 text-surface-800 dark:bg-surface-700 dark:text-surface-100': row.availability === 'hidden'
                                        }"
                                    >
                                        {{ row.availabilityLabel }}
                                    </span>
                                </td>
                                <td>
                                    <span class="text-xs text-surface-600 dark:text-surface-300 leading-5">{{ row.requiredPermissionsText }}</span>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="6" class="text-center py-8 text-surface-400">
                                    {{ loading() ? '加载中...' : '没有匹配的导航项' }}
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </div>
        </div>
    `
})
export class NavigationGovernance {
    readonly #http = inject(HttpClient);
    readonly #platformApi = inject(PlatformApi);
    readonly #messageService = inject(MessageService);
    readonly #router = inject(Router);

    readonly loading = signal(false);
    readonly syncing = signal(false);
    readonly rows = signal<NavigationGovernanceRow[]>([]);
    readonly routePaths = new Set(this.#collectRoutePaths(this.#router.config));
    searchValue = '';

    readonly summary = computed(() => {
        const rows = this.rows();
        const routableRows = rows.filter((row) => row.link !== null);

        return {
            totalNodes: rows.length,
            routableNodes: routableRows.length,
            alignedRoutes: routableRows.filter((row) => row.routeAlignment === 'aligned').length,
            missingRoutes: routableRows.filter((row) => row.routeAlignment === 'missing').length
        };
    });

    constructor() {
        void this.reload();
    }

    filteredRows(): NavigationGovernanceRow[] {
        const query = this.searchValue.trim().toLowerCase();
        if (!query) return this.rows();

        return this.rows().filter(
            (row) =>
                row.key.toLowerCase().includes(query) ||
                row.title.toLowerCase().includes(query) ||
                (row.link ?? '').toLowerCase().includes(query) ||
                row.requiredPermissionsText.toLowerCase().includes(query)
        );
    }

    async reload() {
        this.loading.set(true);

        const tree = await firstValueFrom(this.#platformApi.platformControllerGetAllNavigationItems().pipe(catchError(() => of([] as NavigationItem[]))));
        this.rows.set(this.#flattenTree(tree ?? []));
        this.loading.set(false);

        if (!tree || tree.length === 0) {
            this.#messageService.add({
                severity: 'error',
                summary: '加载失败',
                detail: '未能获取导航治理数据，请检查管理员权限或后端服务状态'
            });
        }
    }

    async syncAudit() {
        this.syncing.set(true);

        const summary = await firstValueFrom(
            this.#http.post<NavigationSyncSummary>('/api/platform/navigation/sync', {}).pipe(catchError(() => of(null)))
        );

        this.syncing.set(false);

        if (!summary) {
            this.#messageService.add({
                severity: 'error',
                summary: '同步失败',
                detail: '未能记录导航同步审计，请检查管理员权限或后端服务状态'
            });
            return;
        }

        this.#messageService.add({
            severity: 'success',
            summary: '已记录同步审计',
            detail: `节点 ${summary.nodeCount} 个，校验 ${summary.treeChecksum.slice(0, 12)}`
        });
        await this.reload();
    }

    #flattenTree(items: NavigationItem[], depth = 0): NavigationGovernanceRow[] {
        return items.flatMap((item) => {
            const availability: Availability = item.isHidden ? 'hidden' : item.isDisabled ? 'disabled' : 'active';
            const routeAlignment: RouteAlignment = !item.link ? 'container' : this.routePaths.has(this.#normalizePath(item.link)) ? 'aligned' : 'missing';

            const row: NavigationGovernanceRow = {
                id: item.id,
                key: item.key,
                title: item.title ?? item.key,
                type: item.type,
                link: item.link,
                icon: item.icon,
                depth,
                displayOrder: item.displayOrder,
                requiredPermissionsText: item.requiredPermissions?.length ? item.requiredPermissions.join(', ') : '仅需登录',
                routeAlignment,
                routeAlignmentLabel: routeAlignment === 'aligned' ? '已对齐' : routeAlignment === 'missing' ? '缺少路由' : '容器节点',
                availability,
                availabilityLabel: availability === 'active' ? '启用中' : availability === 'disabled' ? '已禁用' : '已隐藏'
            };

            const children = item.children?.length ? this.#flattenTree(item.children, depth + 1) : [];
            return [row, ...children];
        });
    }

    #collectRoutePaths(routes: readonly Route[], parentPath = ''): string[] {
        const result: string[] = [];

        for (const route of routes) {
            if (route.redirectTo || route.path === '**') continue;

            const currentPath = this.#joinPath(parentPath, route.path ?? '');
            if (route.path) {
                result.push(currentPath);
            }

            if (route.children?.length) {
                result.push(...this.#collectRoutePaths(route.children, currentPath));
            }
        }

        return Array.from(new Set(result.map((path) => this.#normalizePath(path))));
    }

    #joinPath(parentPath: string, segment: string): string {
        if (!segment) {
            return parentPath || '/';
        }

        const normalizedParent = parentPath === '/' ? '' : parentPath;
        return this.#normalizePath(`${normalizedParent}/${segment}`);
    }

    #normalizePath(path: string): string {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return normalized.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
}
