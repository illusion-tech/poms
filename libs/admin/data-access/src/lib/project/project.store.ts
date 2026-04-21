import { computed, inject, Injectable, signal } from '@angular/core';
import type { CreateProjectRequest, ProjectListView, ProjectSummary, UpdateProjectBasicInfoRequest } from '@poms/shared-api-client';
import { ProjectApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProjectStore {
    readonly #projectApi = inject(ProjectApi);

    readonly #projects = signal<ProjectListView[]>([]);
    readonly #selectedProject = signal<ProjectSummary | null>(null);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly projects = this.#projects.asReadonly();
    readonly selectedProject = this.#selectedProject.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
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
            const project = await firstValueFrom(this.#projectApi.projectControllerGetById({ id }));
            this.#selectedProject.set(project);
            return project;
        } finally {
            this.#loading.set(false);
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
            const project = await firstValueFrom(
                this.#projectApi.projectControllerUpdateBasicInfo({
                    id,
                    updateProjectBasicInfoRequest: request
                })
            );
            this.#selectedProject.set(project);
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
    }
}
