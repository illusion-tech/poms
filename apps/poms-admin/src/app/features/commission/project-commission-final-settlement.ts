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
    commissionSettlementStatusLabel,
    commissionSettlementStatusSeverity,
    formatAmount,
    freezeVersionStatusLabel,
    freezeVersionStatusSeverity
} from '../project/project-presentation';

@Component({
    selector: 'app-project-commission-final-settlement',
    standalone: true,
    imports: [CommonModule, TagModule, SectionCard, WorkspaceActionLink, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取最终结算" />
        } @else if (error()) {
            <section-card>
                <ng-template #title>最终结算暂不可用</ng-template>
                <ng-template #description>{{ error() }}</ng-template>
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'rule-explanation']" label="查看规则解释" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="返回阶段解释" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'operations']" label="进入提成操作" />
                </div>
            </section-card>
        } @else if (finalSettlement()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>当前结算链状态</ng-template>
                    <ng-template #description>把最终结算、非质保结算、质保金结算和当前动作放到同一条收口链里，避免只看到结果不知道还缺什么。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">最终结算</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag
                                    [value]="commissionSettlementStatusLabel(finalSettlement()!.finalSettlementStatus)"
                                    [severity]="commissionSettlementStatusSeverity(finalSettlement()!.finalSettlementStatus)"
                                />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">非质保结算</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag
                                    [value]="commissionSettlementStatusLabel(finalSettlement()!.nonRetentionSettlementStatus)"
                                    [severity]="commissionSettlementStatusSeverity(finalSettlement()!.nonRetentionSettlementStatus)"
                                />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">质保金结算</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag
                                    [value]="commissionSettlementStatusLabel(finalSettlement()!.retentionSettlementStatus)"
                                    [severity]="commissionSettlementStatusSeverity(finalSettlement()!.retentionSettlementStatus)"
                                />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(finalSettlement()!.currentActionLevel)" [severity]="actionLevelSeverity(finalSettlement()!.currentActionLevel)" />
                            </div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>为什么现在还没收口</ng-template>
                    <ng-template #description>这里直接暴露最终结算仍然受哪些条件影响，而不是让用户自己去拼冻结记录、回款条件和税务差额。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">质保金条件</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ finalSettlement()!.retentionRequirementSummary ?? '当前无额外质保金条件说明' }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">质保金到账</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ finalSettlement()!.retentionReceiptSummary ?? '当前无到账补充说明' }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">离场例外</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ finalSettlement()!.departureExceptionSummary ?? '当前无离场例外说明' }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">税务影响</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ finalSettlement()!.taxImpactSummary }}</div>
                            <div class="mt-2 text-xs text-surface-400 dark:text-surface-500">
                                待明确金额 {{ formatAmount(finalSettlement()!.taxImpactPendingAmount) }}
                            </div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>共享依据包</ng-template>
                    <ng-template #description>最终结算页只消费现有冻结版本和共享证据包，不在前端拼一套新的 wire contract。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">冻结版本</div>
                            <div class="mt-2 flex items-center gap-2">
                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">V{{ finalSettlement()!.freezeVersionSummary.version }}</span>
                                <p-tag
                                    [value]="freezeVersionStatusLabel(finalSettlement()!.freezeVersionSummary.status)"
                                    [severity]="freezeVersionStatusSeverity(finalSettlement()!.freezeVersionSummary.status)"
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
                                {{ baselineSelectionSourceLabel(finalSettlement()!.baselineSelectionSource) }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">数据成熟度</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ finalSettlement()!.dataMaturityLevel }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">建议动作</div>
                            <div class="mt-2 flex items-center gap-2">
                                <p-tag [value]="actionLevelLabel(finalSettlement()!.costActionRecommendation)" [severity]="actionLevelSeverity(finalSettlement()!.costActionRecommendation)" />
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">版本锚点</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ finalSettlement()!.referencedBaselineVersion }} / {{ finalSettlement()!.referencedSnapshotVersion }}
                            </div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">投影视角</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ finalSettlement()!.projectionLevel }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">导出策略</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ finalSettlement()!.exportPolicy }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">证据快照</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">
                                {{ finalSettlement()!.summaryPackageKey }} / {{ finalSettlement()!.summarySnapshotId }}
                            </div>
                        </div>
                    </div>
                </section-card>

                <section-card>
                    <ng-template #title>下一步入口</ng-template>
                    <ng-template #description>最终结算页负责解释当前状态和证据锚点，真正需要处理的动作仍回到经营解释页或提成操作页。</ng-template>
                    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">当前建议</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ nextStepSummary() }}</div>
                        </div>
                        <div class="rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-700">
                            <div class="text-xs text-surface-500 dark:text-surface-400">允许动作数</div>
                            <div class="mt-2 text-sm font-medium text-surface-950 dark:text-surface-0">{{ finalSettlement()!.allowedActions.length }}</div>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'rule-explanation']" label="查看规则解释" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="返回阶段解释" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'operating-overview']" label="查看经营总览" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'operations']" label="进入提成操作" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectCommissionFinalSettlement implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly finalSettlement = this.#workspaceStore.commissionFinalSettlement;
    readonly loading = this.#workspaceStore.loadingCommissionFinalSettlement;
    readonly error = this.#workspaceStore.commissionFinalSettlementError;

    readonly actionLevelLabel = actionLevelLabel;
    readonly actionLevelSeverity = actionLevelSeverity;
    readonly baselineSelectionSourceLabel = baselineSelectionSourceLabel;
    readonly commissionSettlementStatusLabel = commissionSettlementStatusLabel;
    readonly commissionSettlementStatusSeverity = commissionSettlementStatusSeverity;
    readonly formatAmount = formatAmount;
    readonly freezeVersionStatusLabel = freezeVersionStatusLabel;
    readonly freezeVersionStatusSeverity = freezeVersionStatusSeverity;

    readonly freezeParticipantsSummary = computed(() => {
        const current = this.finalSettlement();
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

    readonly nextStepSummary = computed(() => {
        const current = this.finalSettlement();
        if (!current) {
            return '--';
        }

        if (current.allowedActions.length > 0) {
            return '当前仍有待处理治理动作，先进入提成操作页完成对应处理，再回来看最终结算状态。';
        }

        if (current.retentionSettlementStatus === 'ready-retention') {
            return '当前已具备质保金结算前提，先核对冻结依据和到账说明，再进入提成操作页。';
        }

        if (current.finalSettlementStatus === 'settled' || current.finalSettlementStatus === 'settled-final') {
            return '当前最终结算解释链已经形成，可转去规则解释或归档链继续核对。';
        }

        return '当前先核对阻塞说明、冻结版本和税务影响，再决定是否进入提成操作页处理。';
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadCommissionFinalSettlement(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? '';
    }
}
