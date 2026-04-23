import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { type ContractHandoverSummaryView, ProjectWorkspaceStore } from '@poms/admin-data-access';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { formatAmount, type UiTagSeverity } from './project-presentation';

type ContractHandoverContractItem = ContractHandoverSummaryView['effectiveContractSetSummary']['contracts'][number];

const BASELINE_VALIDATION_STATUS_LABELS: Record<string, string> = {
    ready: '已具备',
    blocked: '阻断中',
    missing: '缺失'
};

const CURRENT_BASELINE_STATUS_LABELS: Record<string, string> = {
    available: '已形成',
    missing: '缺失'
};

const REBASELINE_STATUS_LABELS: Record<string, string> = {
    none: '未发起',
    processing: '处理中',
    pending_effective: '待切换生效',
    effective: '已生效',
    superseded: '已被替代',
    voided: '已作废'
};

const REBASELINE_BLOCKING_STATUS_LABELS: Record<string, string> = {
    none: '无阻断',
    blocking: '阻断中',
    effective: '已生效'
};

const RECEIVABLE_PLAN_STATUS_LABELS: Record<string, string> = {
    initialized: '已初始化',
    missing: '缺失',
    blocked: '阻断中'
};

const HANDOVER_STATUS_LABELS: Record<string, string> = {
    not_started: '未开始',
    draft: '草稿',
    confirmed: '已确认',
    superseded: '已被替代',
    voided: '已作废'
};

const PARTICIPANT_CONFIRMATION_STATUS_LABELS: Record<string, string> = {
    not_started: '未开始',
    pending: '待确认',
    confirmed: '已确认',
    closed: '已关闭'
};

const RECEIPT_JUDGMENT_STATUS_LABELS: Record<string, string> = {
    not_frozen: '未冻结',
    frozen: '已冻结'
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审批',
    approved: '已审批',
    active: '已生效',
    suspended: '已暂停',
    terminated: '已终止',
    expired: '已过期',
    archived: '已归档'
};

@Component({
    selector: 'app-project-contract-handover',
    standalone: true,
    imports: [CommonModule, SectionCard, TableModule, TagModule, WorkspaceActionLink, WorkspaceCommandPanel, WorkspaceFactGrid, WorkspaceFeedback, WorkspaceLoading],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取合同承接" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="合同承接暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (summary() && handover()) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="承接判断" caption="先确认合同是否已稳定，再判断是否可以进入正式移交。" [items]="handoverCommandItems()" />

                <section-card>
                    <ng-template #title>当前有效合同集合</ng-template>
                    <ng-template #description>合同集合是进入移交确认的上游事实，不在前端重新计算口径。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="contractSetItems()" [columns]="3" />

                    <p-table
                        class="mt-4 block"
                        styleClass="p-datatable-sm"
                        [value]="contractItems()"
                        [rowHover]="true"
                        [paginator]="contractItems().length > 5"
                        [rows]="5"
                        [scrollable]="true"
                        [tableStyle]="{ 'min-width': '48rem' }"
                    >
                        <ng-template pTemplate="header">
                            <tr>
                                <th>合同编号</th>
                                <th>状态</th>
                                <th>签约金额</th>
                                <th>签约时间</th>
                                <th>当前快照</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-contract>
                            <tr>
                                <td class="font-medium text-surface-950 dark:text-surface-0">{{ contract.contractNo }}</td>
                                <td>
                                    <p-tag [value]="contractStatusLabel(contract.status)" [severity]="contractStatusSeverity(contract.status)" styleClass="rounded-[6px]!" />
                                </td>
                                <td>{{ formatMoney(contract.signedAmount, contract.currencyCode) }}</td>
                                <td>{{ formatDateTime(contract.signedAt) }}</td>
                                <td>{{ contract.currentSnapshotId ?? '待确认' }}</td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="5">当前没有有效合同集合记录。</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </section-card>

                <section-card>
                    <ng-template #title>承接基线与前置项</ng-template>
                    <ng-template #description>这里展示当前承接口径是否稳定，以及缺失项是否会阻断进入移交。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="baselineItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>再基线化与回款计划</ng-template>
                    <ng-template #description>合同变更后必须明确当前移交前有效基线，不能沿用过期承接口径。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="rebaselineItems()" [columns]="3" />
                </section-card>

                <section-card>
                    <ng-template #title>正式移交状态</ng-template>
                    <ng-template #description>移交确认、参与人确认和回款判断口径共同决定是否能进入执行主线。</ng-template>
                    <app-workspace-fact-grid class="mt-4 block" [items]="projectHandoverItems()" [columns]="3" />

                    @if (handoverBlockers().length > 0) {
                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前阻断项" [detail]="handoverBlockersText()" />
                    }

                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'commission', 'gate-overview']" label="查看提成阶段解释" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>
            </div>
        }
    `
})
export class ProjectContractHandover implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly summary = this.#workspaceStore.contractHandoverSummary;
    readonly handover = this.#workspaceStore.projectHandoverDetail;
    readonly loading = this.#workspaceStore.loadingContractHandover;
    readonly error = this.#workspaceStore.contractHandoverError;

    readonly handoverCommandItems = computed<WorkspaceCommandPanelItem[]>(() => {
        const summary = this.summary();
        const handover = this.handover();
        if (!summary || !handover) {
            return [];
        }

        return [
            {
                label: '合同集合',
                value: `${summary.effectiveContractSetSummary.activeContractCount} 份有效合同`,
                icon: 'pi pi-file'
            },
            {
                label: '承接基线',
                value: this.currentBaselineStatusLabel(summary.currentHandoverBaselineSummary.status),
                icon: 'pi pi-sitemap'
            },
            {
                label: '再基线化',
                value: this.rebaselineStatusLabel(summary.latestHandoverRebaselineSummary.status),
                icon: 'pi pi-refresh'
            },
            {
                label: '移交确认',
                value: this.handoverStatusLabel(handover.handoverStatus),
                icon: 'pi pi-verified'
            },
            {
                label: '当前缺口',
                value: this.blockingSummary(),
                icon: 'pi pi-exclamation-circle'
            }
        ];
    });

    readonly handoverBlockers = computed(() => {
        const summary = this.summary();
        const handover = this.handover();
        return [...(summary?.blockingReasons ?? []), ...(handover?.blockingReasons ?? [])];
    });

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadContractHandover(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    contractItems(): ContractHandoverContractItem[] {
        return this.summary()?.effectiveContractSetSummary.contracts ?? [];
    }

    contractSetItems(): WorkspaceFactGridItem[] {
        const current = this.summary();
        if (!current) {
            return [];
        }

        const contractSet = current.effectiveContractSetSummary;
        return [
            {
                label: '有效合同数量',
                value: contractSet.activeContractCount,
                emphasis: true
            },
            {
                label: '有效合同额',
                value: this.formatMoney(contractSet.totalSignedAmount, contractSet.currencyCodes.join(' / ')),
                emphasis: true
            },
            {
                label: '合同编号',
                value: contractSet.contractNos.length > 0 ? contractSet.contractNos.join('、') : '待确认'
            },
            {
                label: '最早签约',
                value: this.formatDateTime(contractSet.earliestSignedAt)
            },
            {
                label: '最新签约',
                value: this.formatDateTime(contractSet.latestSignedAt)
            },
            {
                label: '摘要快照',
                value: current.contractSummarySnapshotId ?? '待生成'
            }
        ];
    }

    baselineItems(): WorkspaceFactGridItem[] {
        const current = this.summary();
        if (!current) {
            return [];
        }

        const validation = current.contractBaselineValidationSummary;
        const baseline = current.currentHandoverBaselineSummary;
        return [
            {
                label: '基线校验',
                value: this.baselineValidationStatusLabel(validation.status),
                severity: this.baselineValidationSeverity(validation.status),
                detail: validation.blockingReasonSummary ?? `缺失前置项 ${validation.missingPrerequisiteCount} 项`
            },
            {
                label: '合同快照初始化',
                value: validation.initializedContractSnapshotId ?? '待确认',
                detail: this.formatDateTime(validation.contractSnapshotInitializedAt)
            },
            {
                label: '商业放行包',
                value: validation.readinessPackageId ?? '待确认',
                detail: validation.guardDecision ?? validation.packageStatus ?? '待确认'
            },
            {
                label: '当前承接基线',
                value: this.currentBaselineStatusLabel(baseline.status),
                severity: this.currentBaselineSeverity(baseline.status),
                detail: baseline.summary
            },
            {
                label: '基线快照',
                value: baseline.baselineSnapshotId ?? '待确认',
                detail: this.sourceTypeLabel(baseline.sourceType)
            },
            {
                label: '来源记录',
                value: baseline.sourceId ?? '待确认'
            }
        ];
    }

    rebaselineItems(): WorkspaceFactGridItem[] {
        const current = this.summary();
        if (!current) {
            return [];
        }

        const rebaseline = current.latestHandoverRebaselineSummary;
        const receivable = current.receivablePlanInitSummary;
        return [
            {
                label: '再基线化状态',
                value: this.rebaselineStatusLabel(rebaseline.status),
                severity: this.rebaselineStatusSeverity(rebaseline.status),
                detail: rebaseline.rebaselineRecordId ?? '当前没有再基线化记录'
            },
            {
                label: '阻断状态',
                value: this.rebaselineBlockingStatusLabel(rebaseline.blockingStatus),
                severity: this.rebaselineBlockingSeverity(rebaseline.blockingStatus),
                detail: rebaseline.impactSummary ?? `影响项 ${rebaseline.impactItemCount} 项`
            },
            {
                label: '生效后基线',
                value: rebaseline.effectiveBaselineAfterId ?? '待确认',
                detail: this.formatDateTime(rebaseline.handledAt)
            },
            {
                label: '回款计划',
                value: this.receivablePlanStatusLabel(receivable.status),
                severity: this.receivablePlanStatusSeverity(receivable.status),
                detail: receivable.summary
            },
            {
                label: '回款计划版本',
                value: receivable.initializedReceivablePlanVersionId ?? '待确认'
            },
            {
                label: '初始化时间',
                value: this.formatDateTime(receivable.receivablePlanInitializedAt)
            }
        ];
    }

    projectHandoverItems(): WorkspaceFactGridItem[] {
        const current = this.handover();
        if (!current) {
            return [];
        }

        const participant = current.participantConfirmationSummary;
        const receipt = current.receiptJudgmentModeSummary;
        return [
            {
                label: '移交状态',
                value: this.handoverStatusLabel(current.handoverStatus),
                severity: this.handoverStatusSeverity(current.handoverStatus),
                detail: current.confirmedAt ? `确认时间 ${this.formatDateTime(current.confirmedAt)}` : '尚未完成移交确认'
            },
            {
                label: '确认人',
                value: current.confirmedBy ?? '待确认',
                detail: current.comment ?? null
            },
            {
                label: '参与人确认',
                value: this.participantStatusLabel(participant.status),
                severity: this.participantStatusSeverity(participant.status),
                detail: `${participant.confirmedCount}/${participant.requiredCount} 已确认，${participant.pendingCount} 待确认`
            },
            {
                label: '回款判断口径',
                value: this.receiptJudgmentStatusLabel(receipt.status),
                severity: this.receiptJudgmentStatusSeverity(receipt.status),
                detail: receipt.summary
            },
            {
                label: '移交摘要快照',
                value: current.summarySnapshotId ?? '待生成',
                detail: current.summaryPackageKey ?? '待确认'
            },
            {
                label: '投影与导出',
                value: current.projectionLevel ?? '待确认',
                detail: current.exportPolicy ?? '待确认'
            }
        ];
    }

    handoverBlockersText(): string {
        const blockers = this.handoverBlockers();
        return blockers.length > 0 ? blockers.join('；') : '当前没有阻断项。';
    }

    blockingSummary(): string {
        const blockers = this.handoverBlockers();
        return blockers.length > 0 ? `${blockers.length} 项阻断` : '当前没有阻断';
    }

    formatMoney(value: string | null | undefined, currencyCode: string | null | undefined): string {
        const amount = formatAmount(value);
        return currencyCode ? `${amount} ${currencyCode}` : amount;
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

    contractStatusLabel(status: string): string {
        return CONTRACT_STATUS_LABELS[status] ?? status;
    }

    contractStatusSeverity(status: string): UiTagSeverity {
        if (status === 'active' || status === 'approved') {
            return 'success';
        }
        if (status === 'pending_review' || status === 'suspended') {
            return 'warn';
        }
        if (status === 'terminated' || status === 'expired') {
            return 'danger';
        }
        return 'secondary';
    }

    baselineValidationStatusLabel(status: string): string {
        return BASELINE_VALIDATION_STATUS_LABELS[status] ?? status;
    }

    baselineValidationSeverity(status: string): UiTagSeverity {
        return this.statusSeverity(status, 'ready');
    }

    currentBaselineStatusLabel(status: string): string {
        return CURRENT_BASELINE_STATUS_LABELS[status] ?? status;
    }

    currentBaselineSeverity(status: string): UiTagSeverity {
        return this.statusSeverity(status, 'available');
    }

    rebaselineStatusLabel(status: string): string {
        return REBASELINE_STATUS_LABELS[status] ?? status;
    }

    rebaselineStatusSeverity(status: string): UiTagSeverity {
        if (status === 'effective' || status === 'none') {
            return 'success';
        }
        if (status === 'processing' || status === 'pending_effective') {
            return 'warn';
        }
        if (status === 'voided') {
            return 'danger';
        }
        return 'secondary';
    }

    rebaselineBlockingStatusLabel(status: string): string {
        return REBASELINE_BLOCKING_STATUS_LABELS[status] ?? status;
    }

    rebaselineBlockingSeverity(status: string): UiTagSeverity {
        if (status === 'blocking') {
            return 'danger';
        }
        if (status === 'effective') {
            return 'success';
        }
        return 'secondary';
    }

    receivablePlanStatusLabel(status: string): string {
        return RECEIVABLE_PLAN_STATUS_LABELS[status] ?? status;
    }

    receivablePlanStatusSeverity(status: string): UiTagSeverity {
        return this.statusSeverity(status, 'initialized');
    }

    handoverStatusLabel(status: string): string {
        return HANDOVER_STATUS_LABELS[status] ?? status;
    }

    handoverStatusSeverity(status: string): UiTagSeverity {
        return this.statusSeverity(status, 'confirmed');
    }

    participantStatusLabel(status: string): string {
        return PARTICIPANT_CONFIRMATION_STATUS_LABELS[status] ?? status;
    }

    participantStatusSeverity(status: string): UiTagSeverity {
        return this.statusSeverity(status, 'confirmed');
    }

    receiptJudgmentStatusLabel(status: string): string {
        return RECEIPT_JUDGMENT_STATUS_LABELS[status] ?? status;
    }

    receiptJudgmentStatusSeverity(status: string): UiTagSeverity {
        return this.statusSeverity(status, 'frozen');
    }

    sourceTypeLabel(sourceType: string): string {
        const labels: Record<string, string> = {
            'contract-readiness': '合同准备包',
            'project-handover': '项目移交',
            'handover-rebaseline': '移交再基线化',
            none: '无来源'
        };
        return labels[sourceType] ?? sourceType;
    }

    statusSeverity(status: string, successStatus: string): UiTagSeverity {
        if (status === successStatus) {
            return 'success';
        }
        if (status === 'blocked' || status === 'missing' || status === 'voided') {
            return 'danger';
        }
        if (status === 'pending' || status === 'draft' || status === 'not_started' || status === 'not_frozen') {
            return 'warn';
        }
        return 'secondary';
    }
}
