import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore, ProjectStore, TodoItemSummary } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';

@Component({
    selector: 'app-workbench',
    standalone: true,
    imports: [CommonModule, SectionCard, TagModule, ButtonModule, TableModule],
    providers: [ProjectStore],
    template: `
        <div class="flex flex-col gap-6">
            <!-- Stats Row -->
            <section-card class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 justify-between p-0">
                @for (item of statsData(); track item.title) {
                    <div class="sm:flex-1 flex flex-col gap-2 sm:odd:border-r md:last:border-none md:even:border-r p-6 border-surface-200 dark:border-surface-800">
                        <div class="text-sm text-surface-500 dark:text-white/64">{{ item.title }}</div>
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-semibold text-surface-950 dark:text-surface-0">{{ item.value }}</span>
                            @if (item.severity) {
                                <p-tag [severity]="item.severity" [value]="item.tag" />
                            }
                        </div>
                    </div>
                }
            </section-card>

            <div class="w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
                <!-- Recent Projects -->
                <section-card class="xl:col-span-2">
                    <ng-template #title>近期项目</ng-template>
                    <ng-template #action>
                        <p-button label="查看全部" icon="pi pi-arrow-right" iconPos="right" [text]="true" severity="secondary" (onClick)="navigateTo('/projects')" class="cursor-pointer" />
                    </ng-template>
                    <p-table [value]="recentProjects()" [loading]="loadingProjects()" class="mt-4" [pt]="{ root: { class: 'border-none!' } }">
                        <ng-template #header>
                            <tr>
                                <th>项目编码</th>
                                <th>项目名称</th>
                                <th>阶段</th>
                                <th>状态</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-project>
                            <tr class="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800" (click)="navigateTo('/projects/' + project.id)">
                                <td>
                                    <span class="text-primary font-medium">{{ project.projectCode }}</span>
                                </td>
                                <td>
                                    <span class="text-surface-950 dark:text-surface-0 text-sm">{{ project.projectName }}</span>
                                </td>
                                <td>
                                    <p-tag [value]="getStageName(project.currentStage)" [severity]="getStageSeverity(project.currentStage)" />
                                </td>
                                <td>
                                    <p-tag [value]="getStatusName(project.status)" [severity]="getProjectStatusSeverity(project.status)" />
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="4" class="text-center py-6 text-surface-400">暂无项目</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </section-card>

                <!-- My Todos -->
                <section-card>
                    <ng-template #title>我的待办</ng-template>
                    <div class="flex flex-col gap-3 mt-4">
                        @if (myTodos().length === 0) {
                            <div class="py-8 text-center">
                                <i class="pi pi-check-circle text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                                <p class="text-sm text-surface-500 dark:text-surface-400">暂无待办事项</p>
                            </div>
                        } @else {
                            @for (todo of myTodos(); track todo.id) {
                                <div
                                    class="flex items-start gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
                                    (click)="navigateToTodo(todo)"
                                >
                                    <div class="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" [ngClass]="todo.status === 'open' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'">
                                        <i class="pi text-sm" [ngClass]="todo.status === 'open' ? 'pi-clock text-orange-600 dark:text-orange-400' : 'pi-check text-green-600 dark:text-green-400'"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <span class="text-sm font-medium text-surface-950 dark:text-surface-0 truncate block">{{ todo.title }}</span>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="text-xs text-surface-400 dark:text-surface-500">{{ todo.businessDomain }}</span>
                                            @if (todo.targetTitle) {
                                                <span class="text-xs text-surface-300 dark:text-surface-600">&middot;</span>
                                                <span class="text-xs text-surface-400 dark:text-surface-500 truncate">{{ todo.targetTitle }}</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            }
                        }
                    </div>
                </section-card>
            </div>
        </div>
    `
})
export class Workbench implements OnInit {
    readonly #authStore = inject(AuthStore);
    readonly #projectStore = inject(ProjectStore);
    readonly #router = inject(Router);

    myTodos = computed(() => this.#authStore.myTodos());
    openTodosCount = computed(() => this.#authStore.openTodosCount());

    readonly recentProjects = this.#projectStore.recentProjects;
    readonly loadingProjects = this.#projectStore.loading;

    statsData = computed(() => [
        { title: '待办事项', value: this.openTodosCount(), tag: '待处理', severity: this.openTodosCount() > 0 ? ('warn' as const) : ('success' as const) },
        { title: '项目总数', value: this.#projectStore.projects().length, tag: '', severity: undefined },
        { title: '进行中', value: this.#projectStore.activeProjectCount(), tag: '', severity: undefined },
        { title: '已签约', value: this.#projectStore.closedWonProjectCount(), tag: '', severity: undefined }
    ]);

    ngOnInit() {
        void this.#projectStore.loadProjects();
    }

    navigateTo(path: string) {
        this.#router.navigate([path]);
    }

    navigateToTodo(todo: TodoItemSummary) {
        if (todo.targetObjectType === 'Contract') {
            this.#router.navigate(['/contracts', todo.targetObjectId]);
        } else if (todo.targetObjectType === 'Project') {
            this.#router.navigate(['/projects', todo.targetObjectId]);
        }
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

    getProjectStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            active: 'info',
            closed_won: 'success',
            closed_lost: 'danger',
            draft: 'secondary',
            suspended: 'warn'
        };
        return map[status];
    }
}
