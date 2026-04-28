import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
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
    commissionRuleStageLabelOrFallback,
    freezeVersionStatusLabel,
    freezeVersionStatusSeverity,
    gateDecisionLabelOrFallback,
    gateDecisionSeverityOrFallback
} from '../project/project-presentation';

@Component({
    selector: 'app-project-commission-rule-explanation',
    standalone: true,
    imports: [CommonModule, SectionCard, WorkspaceActionLink, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取规则解释" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="规则解释暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'final-settlement']" label="查看最终结算" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="返回阶段解释" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'operations']" label="进入提成操作" />
                </div>
            </app-workspace-feedback>
        } @else if (ruleExplanation()) {
            <div class="flex flex-col gap-6">
                <section-card>
                    <ng-template #title>当前规则结论</ng-template>
                    <ng-template #description>规则解释页直接回答三件事：当前处于什么状态、结论是什么、为什么会得到这个结论。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="ruleConclusionItems()" [columns]="4" />
                </section-card>

                <section-card>
                    <ng-template #title>为什么现在被挡住</ng-template>
                    <ng-template #description>把阻塞分类、阻塞码、解释说明和下一步动作拆开，让规则结论不再是黑箱。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="ruleBlockerItems()" [columns]="2" />
                </section-card>

                <section-card>
                    <ng-template #title>共享依据包</ng-template>
                    <ng-template #description>规则解释复用最终结算链挂接的共享依据包，不再在前端拼接另一套证据来源。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="ruleEvidenceItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>下一步入口</ng-template>
                    <ng-template #description>规则解释负责告诉用户为什么可发或不可发，真正处理仍回到最终结算页、阶段解释页或提成操作页。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="ruleNextStepItems()" [columns]="2" />
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

    readonly freezeParticipantsSummary = computed(() => {
        const current = this.ruleExplanation();
        if (!current) {
            return '--';
        }

        if (current.freezeVersionSummary.participantsJson.length === 0) {
            return '当前冻结版本未记录参与人';
        }

        return current.freezeVersionSummary.participantsJson.map((participant) => `${participant.displayName}（${participant.roleType} ${participant.weight}%）`).join('、');
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

    readonly ruleConclusionItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.ruleExplanation();
        if (!current) {
            return [];
        }

        return [
            { label: '当前阶段状态', value: commissionRuleStageLabelOrFallback(current.currentStageStatus) },
            {
                label: '规则结论',
                value: gateDecisionLabelOrFallback(current.gateDecisionCode),
                severity: gateDecisionSeverityOrFallback(current.gateDecisionCode)
            },
            {
                label: '当前动作',
                value: actionLevelLabel(current.currentActionLevel),
                severity: actionLevelSeverity(current.currentActionLevel)
            },
            {
                label: '建议动作',
                value: actionLevelLabel(current.costActionRecommendation),
                severity: actionLevelSeverity(current.costActionRecommendation)
            }
        ];
    });

    readonly ruleBlockerItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.ruleExplanation();
        if (!current) {
            return [];
        }

        return [
            { label: '结论摘要', value: current.gateDecisionSummary },
            { label: '阻塞分类', value: current.blockingReasonCategory ?? '当前无额外阻塞分类' },
            { label: '阻塞编码', value: current.blockingReasonCode ?? '当前无额外阻塞编码' },
            { label: '阻塞说明', value: current.blockingReasonSummary ?? '当前无额外阻塞说明' },
            { label: '下一步', value: sensitiveProjectionDisplayText(current.nextActionSummaryProjection, this.fallbackNextAction()) }
        ];
    });

    readonly ruleEvidenceItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.ruleExplanation();
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
            {
                label: '税务影响',
                value: sensitiveProjectionDisplayText(current.taxImpactSummaryProjection),
                detail: `待明确金额 ${formatSensitiveAmountProjection(current.taxImpactPendingAmountProjection)}`
            },
            { label: '数据成熟度', value: current.dataMaturityLevel },
            { label: '版本锚点', value: `${current.referencedBaselineVersion} / ${current.referencedSnapshotVersion}` },
            { label: '投影视角', value: current.projectionLevel },
            { label: '导出策略', value: current.exportPolicy },
            { label: '证据快照', value: `${current.summaryPackageKey} / ${current.summarySnapshotId}` }
        ];
    });

    readonly ruleNextStepItems = computed<WorkspaceFactGridItem[]>(() => {
        const current = this.ruleExplanation();
        if (!current) {
            return [];
        }

        return [
            { label: '当前建议', value: this.actionSummary() },
            { label: '允许动作数', value: current.allowedActions.length }
        ];
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
