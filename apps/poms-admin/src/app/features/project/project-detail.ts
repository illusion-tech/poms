import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';

@Component({
    selector: 'app-project-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, SectionCard, TagModule, ButtonModule, InputTextModule, DialogModule],
    providers: [ProjectStore],
    template: `
        @if (loading()) {
            <div class="flex items-center justify-center py-20">
                <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        } @else if (project()) {
            <div class="flex flex-col gap-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div class="flex items-center gap-3">
                        <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" severity="secondary" (onClick)="goBack()" class="cursor-pointer" />
                        <div>
                            <h1 class="text-xl font-semibold text-surface-950 dark:text-surface-0">{{ project()!.projectName }}</h1>
                            <span class="text-sm text-surface-500 dark:text-surface-400">{{ project()!.projectCode }}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <p-tag [value]="getStageName(project()!.currentStage)" [severity]="getStageSeverity(project()!.currentStage)" />
                        <p-tag [value]="getStatusName(project()!.status)" [severity]="getStatusSeverity(project()!.status)" />
                        <p-button label="项目工作区" icon="pi pi-sitemap" severity="secondary" [outlined]="true" [rounded]="true" (onClick)="goToWorkspace()" class="cursor-pointer" />
                        <p-button label="提成操作" icon="pi pi-wallet" severity="secondary" [outlined]="true" [rounded]="true" (onClick)="goToCommission()" class="cursor-pointer" />
                        <p-button label="编辑" icon="pi pi-pencil" severity="primary" [rounded]="true" (onClick)="showEditDialog()" class="cursor-pointer" />
                    </div>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <!-- Basic Info -->
                    <section-card>
                        <ng-template #title>基本信息</ng-template>
                        <div class="grid grid-cols-2 gap-4 mt-4">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">项目编码</span>
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ project()!.projectCode }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">项目名称</span>
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ project()!.projectName }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">当前阶段</span>
                                <p-tag [value]="getStageName(project()!.currentStage)" [severity]="getStageSeverity(project()!.currentStage)" />
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">项目状态</span>
                                <p-tag [value]="getStatusName(project()!.status)" [severity]="getStatusSeverity(project()!.status)" />
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">客户名称</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.customerName ?? '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">预计签约日期</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.plannedSignAt ? (project()!.plannedSignAt | date: 'yyyy-MM-dd') : '-' }}</span>
                            </div>
                        </div>
                    </section-card>

                    <!-- Audit Info -->
                    <section-card>
                        <ng-template #title>审计追踪</ng-template>
                        <div class="grid grid-cols-2 gap-4 mt-4">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">创建时间</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.createdAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">创建人</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.createdBy ?? '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">最后更新</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">更新人</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.updatedBy ?? '-' }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-surface-500 dark:text-surface-400">版本号</span>
                                <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.rowVersion }}</span>
                            </div>
                            @if (project()!.closedAt) {
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">关闭时间</span>
                                    <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.closedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                </div>
                            }
                            @if (project()!.closedReason) {
                                <div class="flex flex-col gap-1 col-span-2">
                                    <span class="text-xs text-surface-500 dark:text-surface-400">关闭原因</span>
                                    <span class="text-sm text-surface-950 dark:text-surface-0">{{ project()!.closedReason }}</span>
                                </div>
                            }
                        </div>
                    </section-card>
                </div>
            </div>

            <!-- Edit Dialog -->
            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑项目" [style]="{ width: '30rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-surface-900 dark:text-surface-0 font-medium">项目名称</label>
                        <input pInputText [(ngModel)]="editForm.projectName" class="w-full" />
                    </div>
                </div>

                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" (onClick)="saveProject()" [loading]="saving()" />
                    </div>
                </ng-template>
            </p-dialog>
        } @else {
            <div class="py-20 text-center">
                <i class="pi pi-exclamation-triangle text-4xl text-surface-300 dark:text-surface-600 mb-3 block"></i>
                <p class="text-surface-500 dark:text-surface-400">项目未找到</p>
                <p-button label="返回列表" icon="pi pi-arrow-left" [text]="true" (onClick)="goBack()" class="mt-4 cursor-pointer" />
            </div>
        }
    `
})
export class ProjectDetail implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #projectStore = inject(ProjectStore);

    readonly project = this.#projectStore.selectedProject;
    readonly loading = this.#projectStore.loading;
    readonly saving = this.#projectStore.saving;
    editDialogVisible = false;
    editForm = { projectName: '' };

    ngOnInit() {
        const id = this.#route.snapshot.paramMap.get('id');
        if (id) {
            void this.#projectStore.loadProject(id);
        }
    }

    goBack() {
        this.#router.navigate(['/projects']);
    }

    goToCommission() {
        const project = this.project();
        if (project) {
            this.#router.navigate(['/projects', project.id, 'commission', 'operations']);
        }
    }

    goToWorkspace() {
        const project = this.project();
        if (project) {
            this.#router.navigate(['/projects', project.id, 'workspace']);
        }
    }

    showEditDialog() {
        const p = this.project();
        if (!p) return;
        this.editForm = { projectName: p.projectName };
        this.editDialogVisible = true;
    }

    async saveProject() {
        const p = this.project();
        if (!p) return;

        try {
            await this.#projectStore.updateProject(p.id, {
                projectName: this.editForm.projectName
            });
            this.editDialogVisible = false;
        } catch {
            return;
        }
    }

    getStatusName(status: string): string {
        const map: Record<string, string> = {
            active: '进行中',
            'pending-approval': '待审批',
            blocked: '阻塞中',
            'on-hold': '已挂起',
            completed: '已完成',
            closed: '已关闭',
            'closed-lost': '已丢单',
            'closed-terminated': '已终止'
        };
        return map[status] ?? status;
    }

    getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            active: 'info',
            'pending-approval': 'secondary',
            blocked: 'warn',
            'on-hold': 'warn',
            completed: 'success',
            closed: 'contrast',
            'closed-lost': 'danger',
            'closed-terminated': 'danger'
        };
        return map[status];
    }

    getStageName(stage: string): string {
        const map: Record<string, string> = {
            assessment: '立项评估',
            'scope-confirmation': '范围确认',
            'commercial-closure': '商务收口',
            contracting: '签约中',
            handover: '项目移交',
            execution: '正式执行',
            acceptance: '验收确认',
            completed: '已完成',
            'closed-lost': '已丢单',
            'closed-terminated': '已终止'
        };
        return map[stage] ?? stage;
    }

    getStageSeverity(stage: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
        const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
            assessment: 'secondary',
            'scope-confirmation': 'info',
            'commercial-closure': 'warn',
            contracting: 'warn',
            handover: 'warn',
            execution: 'success',
            acceptance: 'info',
            completed: 'contrast',
            'closed-lost': 'danger',
            'closed-terminated': 'danger'
        };
        return map[stage];
    }
}
