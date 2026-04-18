import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthStore, ProjectStore, ProjectWorkspaceStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import {
    projectStageLabel,
    projectStageSeverity,
    projectStatusLabel,
    projectStatusSeverity,
    projectWorkspaceGuide
} from './project-presentation';

interface WorkspaceTab {
    label: string;
    routerLink: string[];
    exact?: boolean;
    enabled: boolean;
    permissionHint?: string;
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
                                <span>{{ workspaceGuide().currentStep }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <p-tag [value]="projectStageLabel(project()!.currentStage)" [severity]="projectStageSeverity(project()!.currentStage)" />
                        <p-tag [value]="projectStatusLabel(project()!.status)" [severity]="projectStatusSeverity(project()!.status)" />
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

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">当前阶段</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ projectStageLabel(project()!.currentStage) }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">下一步</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ workspaceGuide().nextStep }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">当前缺口</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ workspaceGuide().currentGap }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 bg-surface-0 px-4 py-3 dark:border-surface-700 dark:bg-surface-900">
                        <div class="text-xs text-surface-500 dark:text-surface-400">责任归口</div>
                        <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ workspaceGuide().owner }}</div>
                    </div>
                </div>

                <section-card>
                    <ng-template #title>工作区导航</ng-template>
                    <ng-template #description>按项目连续工作方式切换读取面，不再按对象详情页分散跳转。</ng-template>
                    <div class="mt-4 flex flex-wrap gap-2">
                        @for (tab of tabs(); track tab.label) {
                            @if (tab.enabled) {
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
                                    {{ tab.label }} · {{ tab.permissionHint }}
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
    readonly #authStore = inject(AuthStore);
    readonly #projectStore = inject(ProjectStore);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly project = this.#projectStore.selectedProject;
    readonly loading = this.#projectStore.loading;

    readonly projectStageLabel = projectStageLabel;
    readonly projectStageSeverity = projectStageSeverity;
    readonly projectStatusLabel = projectStatusLabel;
    readonly projectStatusSeverity = projectStatusSeverity;

    readonly workspaceGuide = computed(() => {
        const project = this.project();
        if (!project) {
            return {
                currentStep: '--',
                nextStep: '--',
                currentGap: '--',
                owner: '--'
            };
        }

        return projectWorkspaceGuide(project);
    });

    readonly tabs = computed<WorkspaceTab[]>(() => {
        const projectId = this.projectId();
        const baseRoute = ['/projects', projectId, 'workspace'];
        const commissionRoute = ['/projects', projectId, 'commission'];

        return [
            {
                label: '工作区总览',
                routerLink: baseRoute,
                exact: true,
                enabled: true
            },
            {
                label: '经营总览',
                routerLink: [...baseRoute, 'operating-overview'],
                enabled: this.canAccessFinanceWorkspace(),
                permissionHint: '需要项目读取和经营核算权限'
            },
            {
                label: '偏差与风险',
                routerLink: [...baseRoute, 'variance-risk'],
                enabled: this.canAccessFinanceWorkspace(),
                permissionHint: '需要项目读取和经营核算权限'
            },
            {
                label: '提成阶段解释',
                routerLink: [...commissionRoute, 'gate-overview'],
                enabled: this.canAccessFinanceWorkspace(),
                permissionHint: '需要项目读取和经营核算权限'
            },
            {
                label: '最终结算',
                routerLink: [...commissionRoute, 'final-settlement'],
                enabled: this.canAccessCommissionExplanation(),
                permissionHint: '需要项目读取和提成发放治理权限'
            },
            {
                label: '规则解释',
                routerLink: [...commissionRoute, 'rule-explanation'],
                enabled: this.canAccessCommissionExplanation(),
                permissionHint: '需要项目读取和提成发放治理权限'
            },
            {
                label: '提成操作',
                routerLink: [...commissionRoute, 'operations'],
                enabled: this.canAccessCommissionOperations(),
                permissionHint: '需要提成治理操作权限'
            }
        ];
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#projectStore.loadProject(projectId);
        }
    }

    ngOnDestroy() {
        this.#projectStore.clearSelectedProject();
        this.#workspaceStore.clear();
    }

    projectId(): string {
        return this.#route.snapshot.paramMap.get('id') ?? '';
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
        const projectId = this.projectId();
        if (projectId && this.canAccessCommissionOperations()) {
            this.#router.navigate(['/projects', projectId, 'commission', 'operations']);
        }
    }

    goBackToList() {
        this.#router.navigate(['/projects']);
    }

    canAccessFinanceWorkspace(): boolean {
        return this.#hasAllPermissions(['project:read', 'contract:finance:manage']);
    }

    canAccessCommissionExplanation(): boolean {
        return this.#hasAllPermissions(['project:read', 'commission:payouts:manage']);
    }

    canAccessCommissionOperations(): boolean {
        return this.#hasAllPermissions([
            'project:read',
            'commission:rule-versions:manage',
            'commission:calculations:manage',
            'commission:payouts:manage',
            'commission:adjustments:manage'
        ]);
    }

    #hasAllPermissions(requiredPermissions: string[]): boolean {
        const currentPermissions = (this.#authStore.currentUser()?.permissions ?? []) as readonly string[];
        return requiredPermissions.every((permission) => currentPermissions.includes(permission));
    }
}
