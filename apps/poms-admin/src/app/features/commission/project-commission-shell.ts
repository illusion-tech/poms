import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthStore, ProjectStore, ProjectWorkspaceStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { WorkspaceNav, type WorkspaceNavItem } from '../../shared/ui/workspace-nav';
import {
    projectStageLabel,
    projectStageSeverity,
    projectStatusLabel,
    projectStatusSeverity,
    projectWorkspaceGuide
} from '../project/project-presentation';

@Component({
    selector: 'app-project-commission-shell',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, SectionCard, WorkspaceLoading, WorkspaceNav],
    providers: [ProjectStore, ProjectWorkspaceStore],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取提成工作区" />
        } @else if (project()) {
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div class="flex items-start gap-3">
                        <p-button
                            icon="pi pi-arrow-left"
                            [text]="true"
                            [rounded]="true"
                            severity="secondary"
                            (onClick)="goBackToWorkspace()"
                            class="cursor-pointer"
                        />
                        <div class="min-w-0">
                            <h1 class="text-xl font-semibold text-surface-950 dark:text-surface-0">提成工作区 · {{ project()!.projectName }}</h1>
                            <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                                <span>{{ project()!.projectCode }}</span>
                                <span>·</span>
                                <span>{{ workspaceGuide().nextStep }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <p-tag [value]="projectStageLabel(project()!.currentStage)" [severity]="projectStageSeverity(project()!.currentStage)" />
                        <p-tag [value]="projectStatusLabel(project()!.status)" [severity]="projectStatusSeverity(project()!.status)" />
                        <p-button
                            label="返回项目工作区"
                            icon="pi pi-sitemap"
                            severity="secondary"
                            [outlined]="true"
                            [rounded]="true"
                            (onClick)="goBackToWorkspace()"
                            class="cursor-pointer"
                        />
                    </div>
                </div>

                <section-card>
                    <ng-template #title>提成相关事项</ng-template>
                    <ng-template #description>先查看阶段条件和结算说明，再处理发放、登记或调整。</ng-template>
                    <app-workspace-nav class="mt-4 block" [items]="tabs()" />
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
export class ProjectCommissionShell implements OnInit, OnDestroy {
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

    readonly tabs = computed<WorkspaceNavItem[]>(() => {
        const projectId = this.projectId();
        return [
            {
                label: '提成阶段解释',
                routerLink: ['/projects', projectId, 'commission', 'gate-overview'],
                enabled: this.canAccessCommissionGate(),
                disabledReason: '需要项目查看和合同资金权限。'
            },
            {
                label: '最终结算',
                routerLink: ['/projects', projectId, 'commission', 'final-settlement'],
                enabled: this.canAccessCommissionExplanation(),
                disabledReason: '需要项目查看和提成发放权限。'
            },
            {
                label: '规则解释',
                routerLink: ['/projects', projectId, 'commission', 'rule-explanation'],
                enabled: this.canAccessCommissionExplanation(),
                disabledReason: '需要项目查看和提成发放权限。'
            },
            {
                label: '提成操作',
                routerLink: ['/projects', projectId, 'commission', 'operations'],
                enabled: this.canAccessCommissionOperations(),
                disabledReason: '需要完整的提成治理操作权限。'
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

    goBackToWorkspace() {
        const projectId = this.projectId();
        if (projectId) {
            this.#router.navigate(['/projects', projectId, 'workspace']);
        } else {
            this.goBackToList();
        }
    }

    goBackToList() {
        this.#router.navigate(['/projects']);
    }

    canAccessCommissionGate(): boolean {
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
