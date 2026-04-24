import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectStore, ProjectWorkspaceStore } from '@poms/admin-data-access';
import type { ProjectWorkspaceEntryView } from '@poms/admin-data-access';
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
    projectStatusSeverity
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
                    [stageLabel]="guidance()?.currentStageLabel ?? projectStageLabel(project()!.currentStage)"
                    [stageSeverity]="projectStageSeverity(project()!.currentStage)"
                    [statusLabel]="guidance()?.statusLabel ?? projectStatusLabel(project()!.status)"
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

                @if (guidanceError()) {
                    <app-workspace-feedback severity="error" summary="暂时读不到提成工作区引导" [detail]="guidanceError()">
                        <p-button label="重新读取" icon="pi pi-refresh" [text]="true" (onClick)="reloadGuidance()" class="mt-3 cursor-pointer" />
                    </app-workspace-feedback>
                }

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
    readonly #projectStore = inject(ProjectStore);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly project = this.#projectStore.selectedProject;
    readonly guidance = this.#workspaceStore.guidance;
    readonly guidanceError = this.#workspaceStore.guidanceError;
    readonly loading = computed(() => this.#projectStore.loading() || (this.#workspaceStore.loadingGuidance() && !this.#workspaceStore.hasGuidance()));

    readonly projectStageLabel = projectStageLabel;
    readonly projectStageSeverity = projectStageSeverity;
    readonly projectStatusLabel = projectStatusLabel;
    readonly projectStatusSeverity = projectStatusSeverity;

    readonly commissionOverviewItems = computed<WorkspaceCommandPanelItem[]>(() => {
        const guidance = this.guidance();

        return [
            {
                label: '当前阶段',
                value: guidance?.currentStageLabel ?? '待确认',
                icon: 'pi pi-flag'
            },
            {
                label: '下一步',
                value: guidance?.nextStep ?? '正在读取',
                icon: 'pi pi-arrow-right'
            },
            {
                label: '当前缺口',
                value: guidance?.currentGap ?? '正在读取',
                icon: 'pi pi-exclamation-circle'
            },
            {
                label: '责任归口',
                value: guidance?.ownerLabel ?? '正在读取',
                icon: 'pi pi-users'
            }
        ];
    });

    readonly tabs = computed<WorkspaceNavItem[]>(() => {
        const keys = ['commission-freeze-binding', 'commission-gate-overview', 'commission-final-settlement', 'commission-rule-explanation', 'commission-operations'];
        const entries = this.guidance()?.recommendedEntries ?? [];

        return keys.map((key) => this.#toNavItem(key, entries)).filter((item): item is WorkspaceNavItem => item !== null);
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

    commissionTitle(): string {
        const project = this.project();
        return project ? `提成工作区 · ${project.projectName}` : '提成工作区';
    }

    commissionSubtitle(): string {
        const project = this.project();
        const nextStep = this.guidance()?.nextStep ?? '正在读取提成工作区引导';
        return project ? `${project.projectCode} · ${nextStep}` : nextStep;
    }

    reloadGuidance() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadGuidance(projectId).catch(() => undefined);
        }
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

    #toNavItem(key: string, entries: readonly ProjectWorkspaceEntryView[]): WorkspaceNavItem | null {
        const entry = entries.find((candidate) => candidate.key === key);
        if (!entry) {
            return null;
        }

        return {
            label: entry.label,
            routerLink: entry.route,
            enabled: entry.enabled,
            disabledReason: entry.disabledReason ?? undefined
        };
    }
}
