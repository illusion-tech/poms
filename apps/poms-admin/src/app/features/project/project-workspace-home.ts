import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStore, ProjectStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { SectionCard } from '../../shared/ui/sectioncard';

interface WorkspaceEntry {
    title: string;
    description: string;
    routerLink: string[];
    enabled: boolean;
    blockedReason?: string;
}

@Component({
    selector: 'app-project-workspace-home',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, SectionCard],
    template: `
        @if (project()) {
            <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section-card>
                    <ng-template #title>已落地入口</ng-template>
                    <ng-template #description>先把执行期项目工作区从对象详情页拆出来，形成可连续阅读和解释的主入口。</ng-template>

                    <div class="mt-4 flex flex-col divide-y divide-surface-200 dark:divide-surface-700">
                        @for (entry of workspaceEntries(); track entry.title) {
                            <div class="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                                <div class="min-w-0">
                                    <div class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ entry.title }}</div>
                                    <div class="mt-1 text-sm text-surface-500 dark:text-surface-400">{{ entry.description }}</div>
                                    @if (!entry.enabled && entry.blockedReason) {
                                        <div class="mt-2 text-xs text-surface-400 dark:text-surface-500">{{ entry.blockedReason }}</div>
                                    }
                                </div>
                                @if (entry.enabled) {
                                    <a
                                        [routerLink]="entry.routerLink"
                                        class="inline-flex items-center justify-center rounded-md border border-primary-200 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-800 dark:text-primary-200 dark:hover:bg-primary-950/30"
                                    >
                                        进入
                                    </a>
                                } @else {
                                    <span class="text-sm text-surface-400 dark:text-surface-500">需权限</span>
                                }
                            </div>
                        }
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>本轮边界</ng-template>
                    <ng-template #description>本次先交付壳层、读取页和 gate 解释，不把前端范围扩展到签约前与移交全量工作区。</ng-template>

                    <div class="mt-4 grid grid-cols-1 gap-3">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-sm font-medium text-surface-950 dark:text-surface-0">已覆盖</div>
                            <div class="mt-1 text-sm text-surface-500 dark:text-surface-400">项目工作区壳层、经营总览、偏差与风险、提成阶段解释、最终结算、规则解释、提成操作入口分离。</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-sm font-medium text-surface-950 dark:text-surface-0">暂不覆盖</div>
                            <div class="mt-1 text-sm text-surface-500 dark:text-surface-400">签约前 L1 六工作区、合同到移交 L3 工作区、质保金结算与归档写侧工作流。</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-sm font-medium text-surface-950 dark:text-surface-0">落地前提</div>
                            <div class="mt-1 text-sm text-surface-500 dark:text-surface-400">读取页全部消费现有 generated client；若项目未形成有效经营快照或 gate 绑定，会直接显示阻塞说明。</div>
                        </div>
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectWorkspaceHome {
    readonly #authStore = inject(AuthStore);
    readonly #projectStore = inject(ProjectStore);

    readonly project = this.#projectStore.selectedProject;

    readonly workspaceEntries = computed<WorkspaceEntry[]>(() => {
        const projectId = this.project()?.id;
        if (!projectId) {
            return [];
        }

        const canAccessFinanceWorkspace = this.#hasAllPermissions(['project:read', 'contract:finance:manage']);
        const canAccessCommissionExplanation = this.#hasAllPermissions(['project:read', 'commission:payouts:manage']);
        const canAccessCommissionOperations = this.#hasAllPermissions([
            'project:read',
            'commission:rule-versions:manage',
            'commission:calculations:manage',
            'commission:payouts:manage',
            'commission:adjustments:manage'
        ]);

        return [
            {
                title: '经营总览',
                description: '把合同、回款、成本、毛利与当前经营动作放到同一项目视角里。',
                routerLink: ['/projects', projectId, 'workspace', 'operating-overview'],
                enabled: canAccessFinanceWorkspace,
                blockedReason: '需要项目读取和经营核算权限。'
            },
            {
                title: '偏差与风险',
                description: '把偏差来源、风险级别、税务影响和下一步动作放到同一解释面里。',
                routerLink: ['/projects', projectId, 'workspace', 'variance-risk'],
                enabled: canAccessFinanceWorkspace,
                blockedReason: '需要项目读取和经营核算权限。'
            },
            {
                title: '提成阶段解释',
                description: '把经营反馈如何作用到提成 gate 的当前结论、阻塞与下游影响串起来。',
                routerLink: ['/projects', projectId, 'commission', 'gate-overview'],
                enabled: canAccessFinanceWorkspace,
                blockedReason: '需要项目读取和经营核算权限。'
            },
            {
                title: '最终结算',
                description: '把最终结算、非质保结算、质保金结算和冻结依据放到同一条解释链里。',
                routerLink: ['/projects', projectId, 'commission', 'final-settlement'],
                enabled: canAccessCommissionExplanation,
                blockedReason: '需要项目读取和提成发放治理权限。'
            },
            {
                title: '规则解释',
                description: '把为什么可发、为什么被挡住、下一步由谁处理直接解释出来。',
                routerLink: ['/projects', projectId, 'commission', 'rule-explanation'],
                enabled: canAccessCommissionExplanation,
                blockedReason: '需要项目读取和提成发放治理权限。'
            },
            {
                title: '提成操作',
                description: '把计算、发放、审批与调整留在独立操作页，不再兼任阶段解释。',
                routerLink: ['/projects', projectId, 'commission', 'operations'],
                enabled: canAccessCommissionOperations,
                blockedReason: '需要提成治理操作权限。'
            }
        ];
    });

    #hasAllPermissions(requiredPermissions: string[]): boolean {
        const currentPermissions = (this.#authStore.currentUser()?.permissions ?? []) as readonly string[];
        return requiredPermissions.every((permission) => currentPermissions.includes(permission));
    }
}
