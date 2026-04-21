import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectStore, ProjectWorkspaceStore } from '@poms/admin-data-access';
import type { ProjectWorkspaceEntryView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';

interface WorkspaceTab {
    label: string;
    routerLink: string | null;
    exact?: boolean;
    enabled: boolean;
    disabledReason?: string;
}

@Component({
    selector: 'app-project-workspace-shell',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, SectionCard],
    providers: [ProjectStore, ProjectWorkspaceStore],
    template: `
        @if (loading()) {
            <div class="flex items-center justify-center py-20">
                <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        } @else if (project()) {
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="flex items-start gap-3">
                        <p-button
                            icon="pi pi-arrow-left"
                            [text]="true"
                            [rounded]="true"
                            severity="secondary"
                            (onClick)="goBackToProject()"
                            class="cursor-pointer"
                        />
                        <div class="min-w-0">
                            <h1 class="text-xl font-semibold text-surface-950 dark:text-surface-0">项目工作区 · {{ project()!.projectName }}</h1>
                            <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                                <span>{{ project()!.projectCode }}</span>
                                <span>·</span>
                                <span>{{ guidance()?.headline ?? '正在读取工作区引导' }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <p-tag [value]="guidance()?.currentStageLabel ?? '当前阶段'" />
                        <p-tag [value]="guidance()?.statusLabel ?? '当前状态'" />
                        <p-button
                            label="项目详情"
                            icon="pi pi-file"
                            severity="secondary"
                            [outlined]="true"
                            [rounded]="true"
                            (onClick)="goBackToProject()"
                            class="cursor-pointer"
                        />
                        <p-button
                            label="提成操作"
                            icon="pi pi-wallet"
                            severity="secondary"
                            [outlined]="true"
                            [rounded]="true"
                            [disabled]="!canAccessCommissionOperations()"
                            (onClick)="goToCommissionOperations()"
                            class="cursor-pointer"
                        />
                    </div>
                </div>

                @if (guidanceError()) {
                    <section-card>
                        <ng-template #title>暂时读不到工作区引导</ng-template>
                        <ng-template #description>{{ guidanceError() }}</ng-template>
                        <p-button label="重新读取" icon="pi pi-refresh" [text]="true" (onClick)="reloadGuidance()" class="mt-3 cursor-pointer" />
                    </section-card>
                }

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">当前阶段</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance()?.currentStageLabel ?? '待确认' }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">当前重点</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance()?.currentFocus ?? '正在读取' }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">下一步</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance()?.nextStep ?? '正在读取' }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">当前缺口</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance()?.currentGap ?? '正在读取' }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">责任归口</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ guidance()?.ownerLabel ?? '正在读取' }}</div>
                    </div>
                </div>

                <section-card>
                    <ng-template #title>工作区导航</ng-template>
                    <ng-template #description>{{ basisSummaryText() }}</ng-template>
                    <div class="mt-4 flex flex-wrap gap-2">
                        @for (tab of tabs(); track tab.label) {
                            @if (tab.enabled && tab.routerLink) {
                                <a
                                    [routerLink]="tab.routerLink"
                                    routerLinkActive="bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100 border-primary-200 dark:border-primary-700"
                                    [routerLinkActiveOptions]="{ exact: tab.exact ?? false }"
                                    class="inline-flex items-center rounded-md border border-surface-200 px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-surface-700 dark:text-surface-200 dark:hover:border-primary-700 dark:hover:text-primary-200"
                                >
                                    {{ tab.label }}
                                </a>
                            } @else {
                                <span
                                    class="inline-flex items-center rounded-md border border-dashed border-surface-300 px-3 py-2 text-sm text-surface-400 dark:border-surface-600 dark:text-surface-500"
                                >
                                    {{ tab.label }} · {{ tab.disabledReason ?? '当前不可进入' }}
                                </span>
                            }
                        }
                    </div>
                </section-card>

                <router-outlet></router-outlet>
            </div>
        } @else {
            <div class="py-20 text-center">
                <i class="pi pi-exclamation-triangle mb-3 block text-4xl text-surface-300 dark:text-surface-600"></i>
                <p class="text-surface-500 dark:text-surface-400">项目未找到</p>
                <p-button label="返回项目列表" icon="pi pi-arrow-left" [text]="true" (onClick)="goBackToList()" class="mt-4 cursor-pointer" />
            </div>
        }
    `
})
export class ProjectWorkspaceShell implements OnInit, OnDestroy {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #projectStore = inject(ProjectStore);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly project = this.#projectStore.selectedProject;
    readonly guidance = this.#workspaceStore.guidance;
    readonly guidanceError = this.#workspaceStore.guidanceError;

    readonly loading = computed(() => this.#projectStore.loading() || (this.#workspaceStore.loadingGuidance() && !this.#workspaceStore.hasGuidance()));

    readonly tabs = computed<WorkspaceTab[]>(() => {
        return (this.guidance()?.recommendedEntries ?? []).map((entry) => ({
            label: entry.label,
            routerLink: entry.route,
            exact: entry.key === 'workspace-home',
            enabled: entry.enabled,
            disabledReason: entry.disabledReason ?? undefined
        }));
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#projectStore.loadProject(projectId);
            void this.#workspaceStore.loadGuidance(projectId).catch(() => undefined);
        }
    }

    ngOnDestroy() {
        this.#projectStore.clearSelectedProject();
        this.#workspaceStore.clear();
    }

    projectId(): string {
        return this.#route.snapshot.paramMap.get('id') ?? '';
    }

    reloadGuidance() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadGuidance(projectId).catch(() => undefined);
        }
    }

    goBackToProject() {
        const projectId = this.projectId();
        if (projectId) {
            this.#router.navigate(['/projects', projectId]);
        } else {
            this.goBackToList();
        }
    }

    goToCommissionOperations() {
        const entry = this.#findEntry('commission-operations');
        if (entry?.enabled && entry.route) {
            this.#router.navigateByUrl(entry.route);
        }
    }

    goBackToList() {
        this.#router.navigate(['/projects']);
    }

    canAccessCommissionOperations(): boolean {
        const entry = this.#findEntry('commission-operations');
        return Boolean(entry?.enabled && entry.route);
    }

    basisSummaryText(): string {
        const basis = this.guidance()?.basisSummary;
        if (basis?.summarySnapshotId && basis.generatedAt) {
            return `当前依据已于 ${this.#formatDateTime(basis.generatedAt)} 生成。`;
        }

        return '当前暂无依据记录；请先根据当前缺口补齐项目事实。';
    }

    #findEntry(key: string): ProjectWorkspaceEntryView | undefined {
        return this.guidance()?.recommendedEntries.find((entry) => entry.key === key);
    }

    #formatDateTime(value: string): string {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
