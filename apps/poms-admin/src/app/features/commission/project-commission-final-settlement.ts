import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommissionFinalSettlementStatus, ProjectWorkspaceStore } from '@poms/admin-data-access';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { formatSensitiveAmountProjection, sensitiveProjectionDisplayText } from '../../shared/ui/sensitive-visibility';
import {
    actionLevelLabel,
    actionLevelSeverity,
    baselineSelectionSourceLabel,
    commissionSettlementStatusLabelOrFallback,
    commissionSettlementStatusSeverityOrFallback,
    dataMaturityLevelLabelOrFallback,
    freezeVersionStatusLabel,
    freezeVersionStatusSeverity
} from '../project/project-presentation';

@Component({
    selector: 'app-project-commission-final-settlement',
    standalone: true,
    imports: [CommonModule, SectionCard, WorkspaceActionLink, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取最终结算" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="最终结算暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'rule-explanation']" label="查看规则解释" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="返回阶段解释" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'operations']" label="进入提成操作" />
                </div>
            </app-workspace-feedback>
        } @else if (finalSettlement()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>当前结算链状态</ng-template>
                    <ng-template #description>把最终结算、非质保结算、质保金结算和当前动作放到同一条收口链里，避免只看到结果不知道还缺什么。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="settlementStatusItems()" [columns]="4" />
                </section-card>

                <section-card>
                    <ng-template #title>为什么现在还没收口</ng-template>
                    <ng-template #description>这里直接暴露最终结算仍然受哪些条件影响，而不是让用户自己去拼冻结记录、回款条件和税务差额。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="settlementBlockerItems()" [columns]="2" />
                </section-card>

                <section-card>
                    <ng-template #title>共享依据包</ng-template>
                    <ng-template #description>最终结算页只消费现有冻结版本和共享证据包，不在前端拼一套新的 wire contract。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="settlementEvidenceItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>下一步入口</ng-template>
                    <ng-template #description>最终结算页负责解释当前状态和证据锚点，真正需要处理的动作仍回到经营解释页或提成操作页。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="settlementNextStepItems()" [columns]="2" />
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

    readonly freezeParticipantsSummary = computed(() => {
        const current = this.finalSettlement();
        if (!current) {
            return '--';
        }

        if (current.freezeVersionSummary.participantsJson.length === 0) {
            return '当前冻结版本未记录参与人';
        }

        return current.freezeVersionSummary.participantsJson.map((participant) => `${participant.displayName}（${participant.roleType} ${participant.weight}%）`).join('、');
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

        if (current.finalSettlementStatus === CommissionFinalSettlementStatus.SettledAll) {
            return '当前最终结算解释链已经形成，可转去规则解释或归档链继续核对。';
        }

        return '当前先核对阻塞说明、冻结版本和税务影响，再决定是否进入提成操作页处理。';
    });

    readonly settlementStatusItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.finalSettlement();
        if (!current) {
            return [];
        }

        return [
            {
                label: '最终结算',
                value: commissionSettlementStatusLabelOrFallback(current.finalSettlementStatus),
                severity: commissionSettlementStatusSeverityOrFallback(current.finalSettlementStatus)
            },
            {
                label: '非质保结算',
                value: commissionSettlementStatusLabelOrFallback(current.nonRetentionSettlementStatus),
                severity: commissionSettlementStatusSeverityOrFallback(current.nonRetentionSettlementStatus)
            },
            {
                label: '质保金结算',
                value: commissionSettlementStatusLabelOrFallback(current.retentionSettlementStatus),
                severity: commissionSettlementStatusSeverityOrFallback(current.retentionSettlementStatus)
            },
            {
                label: '当前动作',
                value: actionLevelLabel(current.currentActionLevel),
                severity: actionLevelSeverity(current.currentActionLevel)
            }
        ];
    });

    readonly settlementBlockerItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.finalSettlement();
        if (!current) {
            return [];
        }

        return [
            { label: '质保金条件', value: current.retentionRequirementSummary ?? '当前无额外质保金条件说明' },
            { label: '质保金到账', value: current.retentionReceiptSummary ?? '当前无到账补充说明' },
            { label: '离场例外', value: current.departureExceptionSummary ?? '当前无离场例外说明' },
            {
                label: '税务影响',
                value: sensitiveProjectionDisplayText(current.taxImpactSummaryProjection),
                detail: `待明确金额 ${formatSensitiveAmountProjection(current.taxImpactPendingAmountProjection)}`
            }
        ];
    });

    readonly settlementEvidenceItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.finalSettlement();
        if (!current) {
            return [];
        }

        return [
            {
                label: '冻结版本',
                value: `V${current.freezeVersionSummary.version} · ${freezeVersionStatusLabel(current.freezeVersionSummary.status)}`,
                severity: freezeVersionStatusSeverity(current.freezeVersionSummary.status)
            },
            { label: '冻结参与人', value: this.freezeParticipantsSummary() },
            { label: '基线选择', value: baselineSelectionSourceLabel(current.baselineSelectionSource) },
            { label: '数据成熟度', value: dataMaturityLevelLabelOrFallback(current.dataMaturityLevel) },
            {
                label: '建议动作',
                value: actionLevelLabel(current.costActionRecommendation),
                severity: actionLevelSeverity(current.costActionRecommendation)
            },
            { label: '版本锚点', value: `${current.referencedBaselineVersion} / ${current.referencedSnapshotVersion}` },
            { label: '投影视角', value: current.projectionLevel },
            { label: '导出策略', value: current.exportPolicy },
            { label: '证据快照', value: `${current.summaryPackageKey} / ${current.summarySnapshotId}` }
        ];
    });

    readonly settlementNextStepItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.finalSettlement();
        if (!current) {
            return [];
        }

        return [
            { label: '当前建议', value: this.nextStepSummary() },
            { label: '允许动作数', value: current.allowedActions.length }
        ];
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
