import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectStore, type ProjectSummary } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-project-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, DialogModule, SelectModule, MenuModule],
    providers: [ProjectStore],
    template: `
        <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 class="text-surface-950 dark:text-surface-0 text-lg font-medium leading-7">项目管理</h1>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <p-iconfield class="w-full sm:w-[217px]">
                        <p-inputicon class="pi pi-search" />
                        <input pInputText [(ngModel)]="searchValue" (input)="onGlobalFilter(dt, $event)" placeholder="搜索项目" class="w-full! py-2! rounded-xl!" />
                    </p-iconfield>

                    <p-button icon="pi pi-plus" label="新建项目" severity="primary" [rounded]="true" class="w-full sm:w-auto cursor-pointer" (onClick)="showCreateDialog()" />
                </div>
            </div>

            <!-- Table -->
            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="projects()"
                    [loading]="loading()"
                    [paginator]="true"
                    [rows]="rows"
                    [first]="first"
                    sortMode="multiple"
                    [tableStyle]="{ width: '100%' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示 {first} 到 {last} 共 {totalRecords} 条"
                    [globalFilterFields]="['projectCode', 'projectName', 'status', 'currentStage']"
                    class="bg-surface-0 dark:bg-surface-800 overflow-hidden"
                    [pt]="{ pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="projectCode" class="flex-1">
                                <span class="flex items-center gap-2">项目编码 <p-sortIcon field="projectCode" /></span>
                            </th>
                            <th pSortableColumn="projectName" class="flex-1">
                                <span class="flex items-center gap-2">项目名称 <p-sortIcon field="projectName" /></span>
                            </th>
                            <th pSortableColumn="currentStage" class="flex-1">
                                <span class="flex items-center gap-2">当前阶段 <p-sortIcon field="currentStage" /></span>
                            </th>
                            <th pSortableColumn="status" class="flex-1">
                                <span class="flex items-center gap-2">状态 <p-sortIcon field="status" /></span>
                            </th>
                            <th pSortableColumn="createdAt" class="flex-1">
                                <span class="flex items-center gap-2">创建时间 <p-sortIcon field="createdAt" /></span>
                            </th>
                            <th style="width: 6rem">操作</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-project>
                        <tr>
                            <td>
                                <span class="text-primary font-medium cursor-pointer hover:underline" (click)="navigateToDetail(project)">{{ project.projectCode }}</span>
                            </td>
                            <td>
                                <span class="text-surface-950 dark:text-surface-0 text-sm font-medium leading-tight">{{ project.projectName }}</span>
                            </td>
                            <td>
                                <p-tag [value]="getStageName(project.currentStage)" [severity]="getStageSeverity(project.currentStage)" class="px-2 py-1 rounded-[6px]" />
                            </td>
                            <td>
                                <p-tag [value]="getStatusName(project.status)" [severity]="getStatusSeverity(project.status)" class="px-2 py-1 rounded-[6px]" />
                            </td>
                            <td>
                                <span class="text-surface-500 dark:text-surface-400 text-sm font-normal leading-tight">{{ project.createdAt | date: 'yyyy-MM-dd' }}</span>
                            </td>
                            <td>
                                <div class="flex items-center gap-1">
                                    <p-button (onClick)="toggleMenu($event, project)" [rounded]="true" [text]="true" icon="pi pi-ellipsis-h" size="small" severity="secondary" class="cursor-pointer" />
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="6" class="text-center py-8">
                                <i class="pi pi-inbox text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                                <span class="text-surface-500 dark:text-surface-400">暂无项目数据</span>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
                <p-menu #actionMenu [model]="menuItems()" [popup]="true" styleClass="w-48!" appendTo="body" />
            </div>

            <!-- Create Project Dialog -->
            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建项目" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label for="projectCode" class="text-surface-900 dark:text-surface-0 font-medium">项目编码</label>
                        <input pInputText id="projectCode" [(ngModel)]="createForm.projectCode" class="w-full" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="projectName" class="text-surface-900 dark:text-surface-0 font-medium">项目名称</label>
                        <input pInputText id="projectName" [(ngModel)]="createForm.projectName" class="w-full" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="currentStage" class="text-surface-900 dark:text-surface-0 font-medium">当前阶段</label>
                        <p-select id="currentStage" [(ngModel)]="createForm.currentStage" [options]="stageOptions" optionLabel="label" optionValue="value" placeholder="选择阶段" class="w-full" appendTo="body" />
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" (onClick)="createProject()" [loading]="creating()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class ProjectList implements OnInit {
    @ViewChild('dt') dt!: Table;
    @ViewChild('actionMenu') actionMenu!: Menu;

    readonly #projectStore = inject(ProjectStore);
    readonly #router = inject(Router);

    readonly projects = this.#projectStore.projects;
    readonly loading = this.#projectStore.loading;
    readonly creating = this.#projectStore.saving;

    searchValue = '';
    first = 0;
    rows = 10;
    selectedProject = signal<ProjectSummary | null>(null);

    createDialogVisible = false;
    createForm = { projectCode: '', projectName: '', currentStage: 'lead' };

    stageOptions = [
        { label: '线索', value: 'lead' },
        { label: '商机', value: 'opportunity' },
        { label: '方案', value: 'proposal' },
        { label: '谈判', value: 'negotiation' }
    ];

    menuItems = computed(() => {
        const project = this.selectedProject();
        if (!project) return [];
        return [
            {
                label: '查看详情',
                icon: 'pi pi-eye',
                command: () => this.navigateToDetail(project)
            },
            {
                label: '编辑',
                icon: 'pi pi-pencil',
                command: () => this.navigateToDetail(project)
            }
        ];
    });

    ngOnInit() {
        void this.#projectStore.loadProjects();
    }

    toggleMenu(event: Event, project: ProjectSummary) {
        this.selectedProject.set(project);
        this.actionMenu.toggle(event);
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToDetail(project: ProjectSummary) {
        this.#router.navigate(['/projects', project.id]);
    }

    showCreateDialog() {
        this.createForm = { projectCode: '', projectName: '', currentStage: 'lead' };
        this.createDialogVisible = true;
    }

    async createProject() {
        if (!this.createForm.projectCode || !this.createForm.projectName) return;

        try {
            await this.#projectStore.createProject(this.createForm);
            this.createDialogVisible = false;
        } catch {
            return;
        }
    }

    getStatusName(status: string): string {
        const map: Record<string, string> = {
            active: '进行中',
            closed_won: '已签约',
            closed_lost: '已丢单',
            draft: '草稿',
            suspended: '已暂停'
        };
        return map[status] ?? status;
    }

    getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            active: 'info',
            closed_won: 'success',
            closed_lost: 'danger',
            draft: 'secondary',
            suspended: 'warn'
        };
        return map[status];
    }

    getStageName(stage: string): string {
        const map: Record<string, string> = {
            lead: '线索',
            opportunity: '商机',
            proposal: '方案',
            negotiation: '谈判',
            contracting: '签约中',
            execution: '执行中',
            closed: '已关闭'
        };
        return map[stage] ?? stage;
    }

    getStageSeverity(stage: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            lead: 'secondary',
            opportunity: 'info',
            proposal: 'info',
            negotiation: 'warn',
            contracting: 'warn',
            execution: 'success',
            closed: 'contrast'
        };
        return map[stage];
    }
}
