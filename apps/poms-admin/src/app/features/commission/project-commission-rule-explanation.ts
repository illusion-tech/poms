import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import {
    actionLevelLabel,
    actionLevelSeverity,
    baselineSelectionSourceLabel,
    commissionRuleStageLabel,
    formatAmount,
    freezeVersionStatusLabel,
    freezeVersionStatusSeverity,
    gateDecisionLabel,
    gateDecisionSeverity
} from '../project/project-presentation';

@Component({
    selector: 'app-project-commission-rule-explanation',
    standalone: true,
    imports: [CommonModule, TagModule, SectionCard, WorkspaceActionLink, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取规则解释" />
        } @else if (error()) {
            <section-card>
                <ng-template #title>规则解释暂不可用</ng-template>
                <ng-template #description>{{ error() }}</ng-template>
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'final-settlement']" label="查看最终结算" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="返回阶段解释" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'operations']" label="进入提成操作" />
                </div>
            </section-card>
        } @else if (ruleExplanation()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>当前规则结论</ng-template>
                    <ng-template #description>规则解释页直接回答三件事：当前处于什么状态、结论是什么、为什么会得到这个结论。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前阶段状态</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ commissionRuleStageLabel(ruleExplanation()!.currentStageStatus) }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">规则结论</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="gateDecisionLabel(ruleExplanation()!.gateDecisionCode)" [severity]="gateDecisionSeverity(ruleExplanation()!.gateDecisionCode)" />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(ruleExplanation()!.currentActionLevel)" [severity]="actionLevelSeverity(ruleExplanation()!.currentActionLevel)" />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">建议动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(ruleExplanation()!.costActionRecommendation)" [severity]="actionLevelSeverity(ruleExplanation()!.costActionRecommendation)" />
                            </div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>为什么现在被挡住</ng-template>
                    <ng-template #description>把阻塞分类、阻塞码、解释说明和下一步动作拆开，让规则结论不再是黑箱。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">结论摘要</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ ruleExplanation()!.gateDecisionSummary }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">阻塞分类</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ ruleExplanation()!.blockingReasonCategory ?? '当前无额外阻塞分类' }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">阻塞编码</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ ruleExplanation()!.blockingReasonCode ?? '当前无额外阻塞编码' }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">阻塞说明</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ ruleExplanation()!.blockingReasonSummary ?? '当前无额外阻塞说明' }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700 md:col-span-2">
                            <div class="text-xs text-surface-500 dark:text-surface-400">下一步</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ ruleExplanation()!.nextActionSummary ?? fallbackNextAction() }}
                            </div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>共享依据包</ng-template>
                    <ng-template #description>规则解释复用最终结算链挂接的共享依据包，不再在前端拼接另一套证据来源。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">冻结版本</div>
                            <div class="mt-2 flex items-center gap-2">
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">V{{ ruleExplanation()!.freezeVersionSummary.version }}</span>
                                <p-tag
                                    [value]="freezeVersionStatusLabel(ruleExplanation()!.freezeVersionSummary.status)"
                                    [severity]="freezeVersionStatusSeverity(ruleExplanation()!.freezeVersionSummary.status)"
                                />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">冻结参与人</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ freezeParticipantsSummary() }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">基线选择</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ baselineSelectionSourceLabel(ruleExplanation()!.baselineSelectionSource) }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">税务影响</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ ruleExplanation()!.taxImpactSummary }}</div>
                            <div class="mt-2 text-xs text-surface-400 dark:text-surface-500">
                                待明确金额 {{ formatAmount(ruleExplanation()!.taxImpactPendingAmount) }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">数据成熟度</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ ruleExplanation()!.dataMaturityLevel }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">版本锚点</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ ruleExplanation()!.referencedBaselineVersion }} / {{ ruleExplanation()!.referencedSnapshotVersion }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">投影视角</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ ruleExplanation()!.projectionLevel }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">导出策略</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ ruleExplanation()!.exportPolicy }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">证据快照</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ ruleExplanation()!.summaryPackageKey }} / {{ ruleExplanation()!.summarySnapshotId }}
                            </div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>下一步入口</ng-template>
                    <ng-template #description>规则解释负责告诉用户为什么可发或不可发，真正处理仍回到最终结算页、阶段解释页或提成操作页。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前建议</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ actionSummary() }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">允许动作数</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ ruleExplanation()!.allowedActions.length }}</div>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'final-settlement']" label="查看最终结算" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="返回阶段解释" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'operating-overview']" label="查看经营总览" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'operations']" label="进入提成操作" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectCommissionRuleExplanation implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly ruleExplanation = this.#workspaceStore.commissionRuleExplanation;
    readonly loading = this.#workspaceStore.loadingCommissionRuleExplanation;
    readonly error = this.#workspaceStore.commissionRuleExplanationError;

    readonly actionLevelLabel = actionLevelLabel;
    readonly actionLevelSeverity = actionLevelSeverity;
    readonly baselineSelectionSourceLabel = baselineSelectionSourceLabel;
    readonly commissionRuleStageLabel = commissionRuleStageLabel;
    readonly formatAmount = formatAmount;
    readonly freezeVersionStatusLabel = freezeVersionStatusLabel;
    readonly freezeVersionStatusSeverity = freezeVersionStatusSeverity;
    readonly gateDecisionLabel = gateDecisionLabel;
    readonly gateDecisionSeverity = gateDecisionSeverity;

    readonly freezeParticipantsSummary = computed(() => {
        const current = this.ruleExplanation();
        if (!current) {
            return '--';
        }

        if (current.freezeVersionSummary.participantsJson.length === 0) {
            return '当前冻结版本未记录参与人';
        }

        return current.freezeVersionSummary.participantsJson
            .map((participant) => `${participant.displayName}（${participant.roleType} ${participant.weight}%）`)
            .join('、');
    });

    readonly fallbackNextAction = computed(() => {
        const current = this.ruleExplanation();
        if (!current) {
            return '--';
        }

        if (current.allowedActions.length > 0) {
            return '当前仍有治理动作待处理，先进入提成操作页完成处理后再回来看规则结论。';
        }

        return '当前规则结论已经形成，可继续核对最终结算页和阶段解释页。';
    });

    readonly actionSummary = computed(() => {
        const current = this.ruleExplanation();
        if (!current) {
            return '--';
        }

        if (current.allowedActions.length > 0) {
            return '当前解释链明确存在后续动作，先进入提成操作页处理，再回来看是否解除阻塞。';
        }

        if (current.gateDecisionCode.startsWith('BLOCK')) {
            return '当前仍应先补阻塞条件，不建议直接发放或跳过解释链。';
        }

        return '当前解释链已给出稳定结论，可继续核对最终结算与下游执行状态。';
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadCommissionRuleExplanation(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? '';
    }
}
