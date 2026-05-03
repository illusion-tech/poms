import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    CommissionRoleAssignmentStatus,
    ContractHandoverCurrentBaselineSummarySourceTypeEnum,
    ProjectHandoverDetailViewHandoverStatusEnum,
    ProjectHandoverParticipantConfirmationSummaryStatusEnum,
    ProjectHandoverReceiptJudgmentModeSummarySourceTypeEnum,
    ProjectWorkspaceStore
} from '@poms/admin-data-access';
import { TableModule } from 'primeng/table';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { freezeVersionStatusLabel, freezeVersionStatusSeverity, type UiTagSeverity } from '../project/project-presentation';

const HANDOVER_STATUS_LABELS = {
    [ProjectHandoverDetailViewHandoverStatusEnum.NotStarted]: '未开始',
    [ProjectHandoverDetailViewHandoverStatusEnum.Draft]: '草稿',
    [ProjectHandoverDetailViewHandoverStatusEnum.Confirmed]: '已确认',
    [ProjectHandoverDetailViewHandoverStatusEnum.Superseded]: '已被替代',
    [ProjectHandoverDetailViewHandoverStatusEnum.Voided]: '已作废'
} as const satisfies Record<ProjectHandoverDetailViewHandoverStatusEnum, string>;

const HANDOVER_STATUS_SEVERITIES = {
    [ProjectHandoverDetailViewHandoverStatusEnum.NotStarted]: 'warn',
    [ProjectHandoverDetailViewHandoverStatusEnum.Draft]: 'warn',
    [ProjectHandoverDetailViewHandoverStatusEnum.Confirmed]: 'success',
    [ProjectHandoverDetailViewHandoverStatusEnum.Superseded]: 'secondary',
    [ProjectHandoverDetailViewHandoverStatusEnum.Voided]: 'danger'
} as const satisfies Record<ProjectHandoverDetailViewHandoverStatusEnum, UiTagSeverity>;

const PARTICIPANT_CONFIRMATION_STATUS_LABELS = {
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.NotStarted]: '未开始',
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.Pending]: '待确认',
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.Confirmed]: '已确认',
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.Closed]: '已关闭'
} as const satisfies Record<ProjectHandoverParticipantConfirmationSummaryStatusEnum, string>;

const PARTICIPANT_CONFIRMATION_STATUS_SEVERITIES = {
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.NotStarted]: 'warn',
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.Pending]: 'warn',
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.Confirmed]: 'success',
    [ProjectHandoverParticipantConfirmationSummaryStatusEnum.Closed]: 'secondary'
} as const satisfies Record<ProjectHandoverParticipantConfirmationSummaryStatusEnum, UiTagSeverity>;

const RECEIPT_JUDGMENT_MODE_LABELS: Record<string, string> = {
    'confirmed-receipt': '按确认回款',
    'delivered-but-unconfirmed': '按交付未确认回款',
    'manual-override': '手工覆盖口径'
};

const RECEIPT_JUDGMENT_SOURCE_LABELS = {
    [ProjectHandoverReceiptJudgmentModeSummarySourceTypeEnum.ProjectHandover]: '项目移交',
    [ProjectHandoverReceiptJudgmentModeSummarySourceTypeEnum.ProjectReceiptJudgmentFreeze]: '回款判断冻结',
    [ProjectHandoverReceiptJudgmentModeSummarySourceTypeEnum.None]: '无来源'
} as const satisfies Record<ProjectHandoverReceiptJudgmentModeSummarySourceTypeEnum, string>;

const BASELINE_SOURCE_LABELS = {
    [ContractHandoverCurrentBaselineSummarySourceTypeEnum.ContractReadiness]: '合同准备包',
    [ContractHandoverCurrentBaselineSummarySourceTypeEnum.ProjectHandover]: '项目移交',
    [ContractHandoverCurrentBaselineSummarySourceTypeEnum.HandoverRebaseline]: '移交再基线化',
    [ContractHandoverCurrentBaselineSummarySourceTypeEnum.None]: '无来源'
} as const satisfies Record<ContractHandoverCurrentBaselineSummarySourceTypeEnum, string>;

const ROLE_TYPE_LABELS: Record<string, string> = {
    'sales-owner': '销售负责人',
    'delivery-owner': '交付负责人',
    'project-owner': '项目负责人',
    PM: '项目经理'
};

interface FreezeBindingBanner {
    severity: 'success' | 'info' | 'warn';
    summary: string;
    detail: string;
}

@Component({
    selector: 'app-project-commission-freeze-binding',
    standalone: true,
    imports: [CommonModule, TableModule, SectionCard, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取冻结与责任边界" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="冻结与责任边界暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="返回提成阶段解释" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'contract-handover']" label="查看合同承接" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel
                    heading="冻结与责任边界判断"
                    caption="先确认当前冻结状态、责任边界、移交引用链和对 L5 的影响。"
                    [items]="commandItems()"
                />

                @if (statusBanner(); as banner) {
                    <app-workspace-feedback [severity]="banner.severity" [summary]="banner.summary" [detail]="banner.detail" />
                }

                <section-card>
                    <ng-template #title>当前冻结状态</ng-template>
                    <ng-template #description>这里读取当前角色冻结版本本身，不从后续结算或规则解释页面反推冻结结论。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="currentStateItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>责任边界与回款判断模式</ng-template>
                    <ng-template #description>参与人、权重和回款判断口径共同构成当前责任边界，不能只看下游规则结论。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="responsibilityItems()" [columns]="4" />

                    <p-table
                        class="mt-4 block"
                        styleClass="p-datatable-sm"
                        [value]="participants()"
                        [rowHover]="true"
                        [scrollable]="true"
                        [tableStyle]="{ 'min-width': '36rem' }"
                    >
                        <ng-template pTemplate="header">
                            <tr>
                                <th>角色</th>
                                <th>人员</th>
                                <th>权重</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-participant>
                            <tr>
                                <td>{{ roleTypeLabel(participant.roleType) }}</td>
                                <td class="font-medium text-surface-950 dark:text-surface-0">{{ participant.displayName }}</td>
                                <td>{{ formatParticipantWeight(participant.weight) }}</td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="3">当前没有可读取的参与人责任边界。</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </section-card>

                <section-card>
                    <ng-template #title>收口链引用</ng-template>
                    <ng-template #description>冻结结果必须能回到同一条移交、摘要快照和有效基线链，不在前端重建来源关系。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="closureItems()" [columns]="3" />

                    @if (handoverBlockers().length > 0) {
                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前移交阻断项" [detail]="handoverBlockersText()" />
                    }
                </section-card>

                <section-card>
                    <ng-template #title>下一步与 L5 影响</ng-template>
                    <ng-template #description>冻结页必须解释当前是否已经形成下游稳定输入，而不是只提示“继续下一步”。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="nextStepItems()" [columns]="3" />

                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="查看提成阶段解释" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'rule-explanation']" label="查看规则解释" severity="secondary" [outlined]="true" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'contract-handover']" label="查看合同承接" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectCommissionFreezeBinding implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly currentSummary = this.#workspaceStore.commissionFreezeBindingSummary;
    readonly freezeDetail = this.#workspaceStore.commissionFreezeBindingDetail;
    readonly handoverDetail = this.#workspaceStore.projectHandoverDetail;
    readonly loading = this.#workspaceStore.loadingCommissionFreezeBinding;
    readonly error = this.#workspaceStore.commissionFreezeBindingError;

    readonly participants = computed(() => this.currentSummary()?.participantsJson ?? []);
    readonly handoverBlockers = computed(() => this.handoverDetail()?.blockingReasons ?? []);

    readonly statusBanner = computed<FreezeBindingBanner>(() => {
        const summary = this.currentSummary();
        const handover = this.handoverDetail();

        if (!handover && !summary) {
            return {
                severity: 'warn',
                summary: '尚未形成冻结绑定视图',
                detail: '当前既没有项目移交详情，也没有当前冻结版本，暂时不能把责任边界交给下游提成链路。'
            };
        }

        if (!handover) {
            return {
                severity: 'warn',
                summary: '移交收口链暂未形成',
                detail: '当前冻结页缺少项目移交详情，先完成移交确认和摘要生成，再判断责任边界是否稳定。'
            };
        }

        if (!summary) {
            return {
                severity: 'info',
                summary: '尚未形成当前冻结版本',
                detail: '移交链已经可读，但当前项目还没有当前角色冻结版本，责任边界还不能作为正式输入使用。'
            };
        }

        if (summary.status !== CommissionRoleAssignmentStatus.Frozen) {
            return {
                severity: 'warn',
                summary: '当前仍未完成正式冻结',
                detail: `当前版本状态为 ${freezeVersionStatusLabel(summary.status)}，还不能把当前责任边界视为 L5 的稳定输入。`
            };
        }

        return {
            severity: 'success',
            summary: '当前冻结结果已形成正式责任边界',
            detail: '当前版本已绑定移交收口链，可继续进入提成阶段解释、规则解释和后续操作链。'
        };
    });

    readonly commandItems = computed<WorkspaceCommandPanelItem[]>(() => [
        {
            label: '当前状态',
            value: this.freezeStatusText(),
            icon: 'pi pi-lock'
        },
        {
            label: '参与人确认',
            value: this.participantConfirmationStatusLabel(this.handoverDetail()?.participantConfirmationSummary.status),
            icon: 'pi pi-users'
        },
        {
            label: '回款判断',
            value: this.receiptJudgmentModeLabel(this.freezeDetail()?.receiptJudgmentModeSummary.receiptJudgmentMode),
            icon: 'pi pi-wallet'
        },
        {
            label: '当前缺口',
            value: this.currentGapText(),
            icon: 'pi pi-exclamation-circle'
        },
        {
            label: '下一步',
            value: this.nextStepText(),
            icon: 'pi pi-arrow-right'
        }
    ]);

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadCommissionFreezeBinding(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? '';
    }

    currentStateItems(): WorkspaceFactGridItem[] {
        const summary = this.currentSummary();
        const detail = this.freezeDetail();
        const handover = this.handoverDetail();

        return [
            {
                label: '当前状态',
                value: summary ? freezeVersionStatusLabel(summary.status) : '尚未形成',
                severity: summary ? freezeVersionStatusSeverity(summary.status) : 'secondary'
            },
            {
                label: '当前版本',
                value: summary ? `V${summary.version}` : '待形成',
                detail: summary?.id ?? null
            },
            {
                label: '冻结时间',
                value: this.formatDateTime(summary?.frozenAt),
                detail: summary?.frozenAt ? '以冻结事实为准' : '当前还没有冻结确认时间'
            },
            {
                label: '绑定移交',
                value: detail?.sourceHandoverId ?? summary?.sourceHandoverId ?? handover?.handoverId ?? '待绑定',
                detail: handover ? this.handoverStatusLabel(handover.handoverStatus) : '当前没有可读取移交记录'
            },
            {
                label: '摘要快照',
                value: detail?.summarySnapshotId ?? summary?.handoverSummarySnapshotId ?? handover?.summarySnapshotId ?? '待生成',
                detail: detail?.summaryPackageKey ?? handover?.summaryPackageKey ?? null
            },
            {
                label: '有效基线摘要',
                value: detail?.effectiveHandoverBaselineSummary.summary ?? handover?.currentHandoverBaselineSummary.summary ?? '待形成',
                detail: this.baselineSourceLabel(detail?.effectiveHandoverBaselineSummary.sourceType ?? handover?.currentHandoverBaselineSummary.sourceType)
            }
        ];
    }

    responsibilityItems(): WorkspaceFactGridItem[] {
        const handover = this.handoverDetail();
        const detail = this.freezeDetail();

        return [
            {
                label: '参与人数量',
                value: this.participants().length,
                emphasis: true,
                detail: this.participants().length > 0 ? `权重合计 ${this.participantWeightTotalText()}` : '当前没有可读参与人'
            },
            {
                label: '参与人确认',
                value: this.participantConfirmationStatusLabel(handover?.participantConfirmationSummary.status),
                severity: this.participantConfirmationStatusSeverity(handover?.participantConfirmationSummary.status),
                detail: handover
                    ? `${handover.participantConfirmationSummary.confirmedCount}/${handover.participantConfirmationSummary.requiredCount} 已确认`
                    : '当前没有移交参与人确认结果'
            },
            {
                label: '回款判断口径',
                value: this.receiptJudgmentModeLabel(detail?.receiptJudgmentModeSummary.receiptJudgmentMode),
                detail: detail?.receiptJudgmentModeSummary.summary ?? handover?.receiptJudgmentModeSummary.summary ?? '当前没有可读取回款判断模式'
            },
            {
                label: '回款判断来源',
                value: this.receiptJudgmentSourceLabel(detail?.receiptJudgmentModeSummary.sourceType ?? handover?.receiptJudgmentModeSummary.sourceType),
                detail: detail?.receiptJudgmentModeSummary.sourceId ?? handover?.receiptJudgmentModeSummary.sourceId ?? null
            }
        ];
    }

    closureItems(): WorkspaceFactGridItem[] {
        const summary = this.currentSummary();
        const detail = this.freezeDetail();
        const handover = this.handoverDetail();

        return [
            {
                label: '来源移交记录',
                value: detail?.sourceHandoverId ?? summary?.sourceHandoverId ?? handover?.handoverId ?? '待确认'
            },
            {
                label: '来源移交摘要快照',
                value: detail?.handoverSummarySnapshotId ?? summary?.handoverSummarySnapshotId ?? handover?.summarySnapshotId ?? '待确认'
            },
            {
                label: '当前移交状态',
                value: this.handoverStatusLabel(handover?.handoverStatus),
                severity: this.handoverStatusSeverity(handover?.handoverStatus),
                detail: handover?.confirmedAt ? `确认时间 ${this.formatDateTime(handover.confirmedAt)}` : '当前还没有正式移交确认'
            },
            {
                label: '有效基线来源',
                value: this.baselineSourceLabel(detail?.effectiveHandoverBaselineSummary.sourceType ?? handover?.currentHandoverBaselineSummary.sourceType),
                detail: detail?.effectiveHandoverBaselineSummary.sourceId ?? handover?.currentHandoverBaselineSummary.sourceId ?? null
            },
            {
                label: '投影与导出',
                value: `${detail?.projectionLevel ?? handover?.projectionLevel ?? '待确认'} / ${detail?.exportPolicy ?? handover?.exportPolicy ?? '待确认'}`
            },
            {
                label: '页面快照',
                value: detail?.summarySnapshotId ?? handover?.summarySnapshotId ?? '待确认',
                detail: this.formatDateTime(detail?.generatedAt ?? handover?.generatedAt)
            }
        ];
    }

    nextStepItems(): WorkspaceFactGridItem[] {
        return [
            {
                label: '当前缺口',
                value: this.currentGapText()
            },
            {
                label: '下一步',
                value: this.nextStepText()
            },
            {
                label: '对 L5 的影响',
                value: this.l5ImpactText()
            }
        ];
    }

    handoverBlockersText(): string {
        const blockers = this.handoverBlockers();
        return blockers.length > 0 ? blockers.join('；') : '当前没有阻断项。';
    }

    freezeStatusText(): string {
        const summary = this.currentSummary();
        if (!summary) {
            return '尚未形成当前冻结版本';
        }

        if (summary.status === CommissionRoleAssignmentStatus.Frozen) {
            return '已完成正式冻结';
        }

        if (summary.status === CommissionRoleAssignmentStatus.Superseded) {
            return '当前版本已被替代';
        }

        return '当前仍未完成正式冻结';
    }

    currentGapText(): string {
        const summary = this.currentSummary();
        const handover = this.handoverDetail();

        if (!handover && !summary) {
            return '移交视图与当前冻结版本都未形成';
        }
        if (!handover) {
            return '缺少项目移交详情';
        }
        if (!summary) {
            return '尚未形成当前冻结版本';
        }
        if (summary.status !== CommissionRoleAssignmentStatus.Frozen) {
            return '当前版本仍未完成正式冻结';
        }

        return '当前没有额外阻断';
    }

    nextStepText(): string {
        const summary = this.currentSummary();
        const handover = this.handoverDetail();

        if (!handover) {
            return '先完成项目移交确认并生成移交摘要。';
        }
        if (!summary) {
            return '先创建当前角色分配版本并补齐参与人责任边界。';
        }
        if (summary.status !== CommissionRoleAssignmentStatus.Frozen) {
            return '冻结当前角色分配并绑定移交收口链。';
        }

        return '可继续进入提成阶段解释、规则解释和后续提成操作链。';
    }

    l5ImpactText(): string {
        const summary = this.currentSummary();
        if (summary?.status === CommissionRoleAssignmentStatus.Frozen) {
            return '当前责任边界已可作为 L5 规则解释与后续操作链的稳定输入。';
        }

        return 'L5 仍不能把当前责任边界视为稳定输入，后续规则结论只能继续提示缺口。';
    }

    participantWeightTotalText(): string {
        const totalWeight = this.participants().reduce((sum, item) => sum + item.weight, 0);
        return this.formatParticipantWeight(totalWeight);
    }

    roleTypeLabel(roleType: string): string {
        return ROLE_TYPE_LABELS[roleType] ?? roleType;
    }

    handoverStatusLabel(status: ProjectHandoverDetailViewHandoverStatusEnum | null | undefined): string {
        if (!status) {
            return '待确认';
        }
        return HANDOVER_STATUS_LABELS[status];
    }

    handoverStatusSeverity(status: ProjectHandoverDetailViewHandoverStatusEnum | null | undefined): UiTagSeverity {
        if (!status) {
            return 'secondary';
        }
        return HANDOVER_STATUS_SEVERITIES[status];
    }

    participantConfirmationStatusLabel(status: ProjectHandoverParticipantConfirmationSummaryStatusEnum | null | undefined): string {
        if (!status) {
            return '待确认';
        }
        return PARTICIPANT_CONFIRMATION_STATUS_LABELS[status];
    }

    participantConfirmationStatusSeverity(status: ProjectHandoverParticipantConfirmationSummaryStatusEnum | null | undefined): UiTagSeverity {
        if (!status) {
            return 'secondary';
        }
        return PARTICIPANT_CONFIRMATION_STATUS_SEVERITIES[status];
    }

    receiptJudgmentModeLabel(mode: string | null | undefined): string {
        if (!mode) {
            return '待确认';
        }
        return RECEIPT_JUDGMENT_MODE_LABELS[mode] ?? mode;
    }

    receiptJudgmentSourceLabel(sourceType: ProjectHandoverReceiptJudgmentModeSummarySourceTypeEnum | null | undefined): string {
        if (!sourceType) {
            return '待确认';
        }
        return RECEIPT_JUDGMENT_SOURCE_LABELS[sourceType];
    }

    baselineSourceLabel(sourceType: ContractHandoverCurrentBaselineSummarySourceTypeEnum | null | undefined): string {
        if (!sourceType) {
            return '待确认';
        }
        return BASELINE_SOURCE_LABELS[sourceType];
    }

    formatParticipantWeight(weight: number): string {
        const normalizedWeight = weight <= 1 ? weight * 100 : weight;
        return `${normalizedWeight.toLocaleString('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}%`;
    }

    formatDateTime(value: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
