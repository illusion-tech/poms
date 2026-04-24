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

@Component({
    selector: 'app-project-workspace-shell',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, ProjectContextHeader, SectionCard, WorkspaceCommandPanel, WorkspaceFeedback, WorkspaceLoading, WorkspaceNav],
    providers: [ProjectStore, ProjectWorkspaceStore],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取项目工作区" />
        } @else if (project()) {
            <div class="flex flex-col gap-6">
                <app-project-context-header
                    eyebrow="项目工作区"
                    [title]="workspaceTitle()"
                    [subtitle]="workspaceSubtitle()"
                    [stageLabel]="guidance()?.currentStageLabel ?? '当前阶段'"
                    [statusLabel]="guidance()?.statusLabel ?? '当前状态'"
                    backLabel="返回项目详情"
                    (back)="goBackToProject()"
                >
                    <ng-template #actions>
                        <div class="flex flex-wrap items-center gap-2">
                            <p-button
                                label="项目详情"
                                icon="pi pi-file"
                                severity="secondary"
                                [outlined]="true"
                                styleClass="rounded-md!"
                                (onClick)="goBackToProject()"
                                class="cursor-pointer"
                            />
                            <p-button
                                label="提成操作"
                                icon="pi pi-wallet"
                                severity="secondary"
                                [outlined]="true"
                                styleClass="rounded-md!"
                                [disabled]="!canAccessCommissionOperations()"
                                (onClick)="goToCommissionOperations()"
                                class="cursor-pointer"
                            />
                        </div>
                    </ng-template>
                </app-project-context-header>

                @if (guidanceError()) {
                    <app-workspace-feedback severity="error" summary="暂时读不到工作区引导" [detail]="guidanceError()">
                        <p-button label="重新读取" icon="pi pi-refresh" [text]="true" (onClick)="reloadGuidance()" class="mt-3 cursor-pointer" />
                    </app-workspace-feedback>
                }

                <app-workspace-command-panel [items]="workspaceOverviewItems()" />

                <section-card>
                    <ng-template #title>工作区导航</ng-template>
                    <ng-template #description>{{ basisSummaryText() }}</ng-template>
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
export class ProjectWorkspaceShell implements OnInit, OnDestroy {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #projectStore = inject(ProjectStore);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly project = this.#projectStore.selectedProject;
    readonly guidance = this.#workspaceStore.guidance;
    readonly guidanceError = this.#workspaceStore.guidanceError;

    readonly loading = computed(() => this.#projectStore.loading() || (this.#workspaceStore.loadingGuidance() && !this.#workspaceStore.hasGuidance()));

    readonly workspaceOverviewItems = computed<WorkspaceCommandPanelItem[]>(() => {
        const guidance = this.guidance();

        return [
            {
                label: '当前阶段',
                value: guidance?.currentStageLabel ?? '待确认',
                icon: 'pi pi-flag'
            },
            {
                label: '当前重点',
                value: guidance?.currentFocus ?? '正在读取',
                icon: 'pi pi-compass'
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

    workspaceTitle(): string {
        const project = this.project();
        return project ? `项目工作区 · ${project.projectName}` : '项目工作区';
    }

    workspaceSubtitle(): string {
        const project = this.project();
        const headline = this.guidance()?.headline ?? '正在读取工作区引导';
        return project ? `${project.projectCode} · ${headline}` : headline;
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
