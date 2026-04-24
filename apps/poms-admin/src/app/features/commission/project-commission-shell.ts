import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthStore, ProjectStore, ProjectWorkspaceStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { ProjectContextHeader } from '../../shared/ui/project-context-header';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
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
    imports: [CommonModule, RouterModule, ButtonModule, ProjectContextHeader, SectionCard, WorkspaceCommandPanel, WorkspaceFeedback, WorkspaceLoading, WorkspaceNav],
    providers: [ProjectStore, ProjectWorkspaceStore],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取提成工作区" />
        } @else if (project()) {
            <div class="flex flex-col gap-6">
                <app-project-context-header
                    eyebrow="提成工作区"
                    [title]="commissionTitle()"
                    [subtitle]="commissionSubtitle()"
                    [stageLabel]="projectStageLabel(project()!.currentStage)"
                    [stageSeverity]="projectStageSeverity(project()!.currentStage)"
                    [statusLabel]="projectStatusLabel(project()!.status)"
                    [statusSeverity]="projectStatusSeverity(project()!.status)"
                    backLabel="返回项目工作区"
                    (back)="goBackToWorkspace()"
                >
                    <ng-template #actions>
                        <div class="flex flex-wrap items-center gap-2">
                            <p-button
                                label="返回项目工作区"
                                icon="pi pi-sitemap"
                                severity="secondary"
                                [outlined]="true"
                                styleClass="rounded-md!"
                                (onClick)="goBackToWorkspace()"
                                class="cursor-pointer"
                            />
                        </div>
                    </ng-template>
                </app-project-context-header>

                <app-workspace-command-panel heading="提成处理重点" caption="先确认阶段条件、阻断事项、下一步和责任归口。" [items]="commissionOverviewItems()" />

                <section-card>
                    <ng-template #title>提成相关事项</ng-template>
                    <ng-template #description>先查看阶段条件和结算说明，再处理发放、登记或调整。</ng-template>
                    <app-workspace-nav class="mt-4 block" [items]="tabs()" />
                </section-card>

                <router-outlet></router-outlet>
            </div>
        } @else {
            <div class="py-20 text-center">
                <app-workspace-feedback severity="warn" summary="项目未找到" detail="请返回项目列表重新选择项目。" />
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

    readonly commissionOverviewItems = computed<WorkspaceCommandPanelItem[]>(() => {
        const guide = this.workspaceGuide();

        return [
            {
                label: '当前阶段',
                value: guide.currentStep,
                icon: 'pi pi-flag'
            },
            {
                label: '下一步',
                value: guide.nextStep,
                icon: 'pi pi-arrow-right'
            },
            {
                label: '当前缺口',
                value: guide.currentGap,
                icon: 'pi pi-exclamation-circle'
            },
            {
                label: '责任归口',
                value: guide.owner,
                icon: 'pi pi-users'
            }
        ];
    });

    readonly tabs = computed<WorkspaceNavItem[]>(() => {
        const projectId = this.projectId();
        return [
            {
                label: '冻结与责任边界',
                routerLink: ['/projects', projectId, 'commission', 'freeze-binding'],
                enabled: this.canAccessCommissionFreezeBinding(),
                disabledReason: '需要项目查看和提成角色冻结权限。'
            },
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

    commissionTitle(): string {
        const project = this.project();
        return project ? `提成工作区 · ${project.projectName}` : '提成工作区';
    }

    commissionSubtitle(): string {
        const project = this.project();
        const nextStep = this.workspaceGuide().nextStep;
        return project ? `${project.projectCode} · ${nextStep}` : nextStep;
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

    canAccessCommissionFreezeBinding(): boolean {
        return this.#hasAllPermissions(['project:read', 'commission:assignments:manage']);
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
