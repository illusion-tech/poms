import { computed, inject, Injectable, signal } from '@angular/core';
import type { CreateProjectRequest, ProjectDetailView, ProjectListView, ProjectTimelineView, UpdateProjectBasicInfoRequest } from '@poms/shared-api-client';
import { ProjectApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProjectStore {
    readonly #projectApi = inject(ProjectApi);

    readonly #projects = signal<ProjectListView[]>([]);
    readonly #selectedProject = signal<ProjectDetailView | null>(null);
    readonly #selectedProjectTimeline = signal<ProjectTimelineView | null>(null);
    readonly #loading = signal(false);
    readonly #loadingTimeline = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);
    readonly #timelineError = signal<string | null>(null);

    readonly projects = this.#projects.asReadonly();
    readonly selectedProject = this.#selectedProject.asReadonly();
    readonly selectedProjectTimeline = this.#selectedProjectTimeline.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loadingTimeline = this.#loadingTimeline.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly timelineError = this.#timelineError.asReadonly();
    readonly recentProjects = computed(() => this.#projects().slice(0, 5));
    readonly activeProjectCount = computed(() => this.#projects().filter((project) => project.status === 'active').length);
    readonly closedProjectCount = computed(() => this.#projects().filter((project) => project.status === 'closed').length);

    async loadProjects() {
        this.#loading.set(true);

        try {
            const projects = await firstValueFrom(this.#projectApi.projectControllerList());
            this.#projects.set(projects);
            this.#loaded.set(true);
            return projects;
        } finally {
            this.#loading.set(false);
        }
    }

    async loadProject(id: string) {
        this.#loading.set(true);

        try {
            if (this.#selectedProject()?.id !== id) {
                this.#selectedProjectTimeline.set(null);
                this.#timelineError.set(null);
            }

            const project = await firstValueFrom(this.#projectApi.projectControllerGetById({ id }));
            this.#selectedProject.set(project);
            return project;
        } finally {
            this.#loading.set(false);
        }
    }

    async loadProjectTimeline(id: string) {
        this.#loadingTimeline.set(true);
        this.#timelineError.set(null);

        try {
            const timeline = await firstValueFrom(
                this.#projectApi.projectControllerGetTimeline({
                    projectId: id
                })
            );
            this.#selectedProjectTimeline.set(timeline);
            return timeline;
        } catch (error) {
            this.#selectedProjectTimeline.set(null);
            this.#timelineError.set('项目生命周期完成时间暂时读取失败，当前仅显示阶段状态。');
            throw error;
        } finally {
            this.#loadingTimeline.set(false);
        }
    }

    async createProject(request: CreateProjectRequest) {
        this.#saving.set(true);

        try {
            const project = await firstValueFrom(this.#projectApi.projectControllerCreate({ createProjectRequest: request }));
            if (this.#loaded()) {
                await this.loadProjects();
            }
            return project;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateProject(id: string, request: UpdateProjectBasicInfoRequest) {
        this.#saving.set(true);

        try {
            await firstValueFrom(
                this.#projectApi.projectControllerUpdateBasicInfo({
                    id,
                    updateProjectBasicInfoRequest: request
                })
            );
            const project = await this.loadProject(id);
            if (this.#loaded()) {
                await this.loadProjects();
            }
            return project;
        } finally {
            this.#saving.set(false);
        }
    }

    clearSelectedProject() {
        this.#selectedProject.set(null);
        this.#selectedProjectTimeline.set(null);
        this.#timelineError.set(null);
    }
}
