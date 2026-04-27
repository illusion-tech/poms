import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
    CreateProjectBidCommercialProcessRequestBidModeEnum,
    CreateProjectBidCommercialProcessRequestCurrentStageEnum,
    CreateProjectBidCommercialProcessRequestDecisionEnum,
    CreateProjectBidCommercialProcessRequestResultStatusEnum,
    ProjectWorkspaceStore,
    ProjectBidCommercialMaterialItemInputMaterialStatusEnum,
    ProjectBidCommercialTimelineItemInputTimelineStatusEnum,
    type CreateProjectBidCommercialProcessRequest,
    type ProjectBidCommercialMaterialItemInput,
    type ProjectBidCommercialMaterialItemView,
    type ProjectBidCommercialProcessSummary,
    type ProjectBidCommercialTimelineItemInput,
    type ProjectBidCommercialTimelineItemView,
    type ProjectBidCommercialWorkspaceView
} from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { SectionCard } from '../../shared/ui/sectioncard';
import { WorkspaceActionLink } from '../../shared/ui/workspace-action-link';
import { WorkspaceCommandPanel, type WorkspaceCommandPanelItem } from '../../shared/ui/workspace-command-panel';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from '../../shared/ui/workspace-fact-grid';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { WorkspaceLoading } from '../../shared/ui/workspace-loading';
import { WorkspaceVersionHistory, type WorkspaceVersionHistoryRow } from '../../shared/ui/workspace-version-history';
import type { UiTagSeverity } from './project-presentation';

const BID_MODE_LABELS: Record<string, string> = {
    'public-tender': '公开招标',
    invitation: '邀标',
    comparison: '比选',
    'commercial-negotiation': '商务谈判',
    'competitive-negotiation': '竞争性谈判',
    'direct-commercial': '直接商务',
    'not-required': '不适用'
};

const BID_STAGE_LABELS: Record<string, string> = {
    'not-started': '未启动',
    preparation: '材料准备',
    submitted: '已提交',
    negotiating: '谈判中',
    'result-confirmed': '结果确认',
    closed: '已关闭'
};

const BID_DECISION_LABELS: Record<string, string> = {
    pending: '待决策',
    participate: '参与',
    'no-bid': '不投标',
    'not-required': '不适用'
};

const BID_RESULT_LABELS: Record<string, string> = {
    pending: '待结果',
    won: '中标 / 成交',
    lost: '未中标',
    cancelled: '已取消',
    'not-applicable': '不适用'
};

const MATERIAL_STATUS_LABELS: Record<string, string> = {
    missing: '缺失',
    'in-progress': '处理中',
    ready: '已齐备',
    'not-required': '不适用'
};

const TIMELINE_STATUS_LABELS: Record<string, string> = {
    pending: '待完成',
    done: '已完成',
    cancelled: '已取消'
};

type Option<T> = {
    label: string;
    value: T;
};

type BidCommercialDialogMode = 'create' | 'edit';

type BidCommercialMaterialForm = {
    materialKey: string;
    label: string;
    materialStatus: ProjectBidCommercialMaterialItemInputMaterialStatusEnum;
    responsibleRole: string;
    dueAt: string;
    blocksNextStep: boolean;
    navigationHint: string;
    sortOrder: number;
};

type BidCommercialTimelineForm = {
    eventKey: string;
    label: string;
    summary: string;
    timelineStatus: ProjectBidCommercialTimelineItemInputTimelineStatusEnum;
    occurredAt: string;
    dueAt: string;
    responsibleRole: string;
    sortOrder: number;
};

type BidCommercialForm = {
    bidMode: CreateProjectBidCommercialProcessRequestBidModeEnum;
    currentStage: CreateProjectBidCommercialProcessRequestCurrentStageEnum;
    decision: CreateProjectBidCommercialProcessRequestDecisionEnum;
    resultStatus: CreateProjectBidCommercialProcessRequestResultStatusEnum;
    processSummary: string;
    decisionSummary: string;
    resultSummary: string;
    tenderNo: string;
    bidPackageNo: string;
    ownerRole: string;
    materialItems: BidCommercialMaterialForm[];
    timelineItems: BidCommercialTimelineForm[];
};

const BOOLEAN_OPTIONS: Option<boolean>[] = [
    { label: '是', value: true },
    { label: '否', value: false }
];

@Component({
    selector: 'app-project-bid-commercial-workspace',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        SectionCard,
        ButtonModule,
        DialogModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TableModule,
        TagModule,
        TextareaModule,
        WorkspaceActionLink,
        WorkspaceCommandPanel,
        WorkspaceFactGrid,
        WorkspaceFeedback,
        WorkspaceLoading,
        WorkspaceVersionHistory
    ],
    template: `
        @if (loading()) {
            <app-workspace-loading label="正在读取招投标 / 商务竞标" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="招投标 / 商务竞标暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (workspace(); as currentWorkspace) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="招投标 / 商务竞标" caption="先确认竞标形态、材料责任、关键节点和结果路径。" [items]="commandItems(currentWorkspace)" />

                <section-card>
                    <ng-template #title>过程维护</ng-template>
                    <ng-template #description>新增或编辑当前竞标过程会提交新的当前版本，历史版本由后端保留。</ng-template>

                    @if (canWriteBidCommercial(currentWorkspace)) {
                        <div class="mt-4 flex flex-wrap gap-2">
                            <p-button [label]="currentWorkspace.currentProcess ? '编辑当前过程' : '创建竞标过程'" icon="pi pi-pencil" (onClick)="openBidDialog(currentWorkspace, currentWorkspace.currentProcess ? 'edit' : 'create')" />
                            @if (currentWorkspace.currentProcess) {
                                <p-button label="创建新过程" icon="pi pi-plus" severity="secondary" [outlined]="true" (onClick)="openBidDialog(currentWorkspace, 'create')" />
                            }
                        </div>
                    } @else {
                        <app-workspace-feedback class="mt-4 block" severity="info" summary="当前只读" [detail]="writeDisabledReason(currentWorkspace)" />
                    }
                </section-card>

                @if (currentWorkspace.currentProcess; as currentProcess) {
                    <section-card>
                        <ng-template #title>当前竞标过程</ng-template>
                        <ng-template #description>{{ currentProcess.processSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="processFactItems(currentProcess)" [columns]="4" />

                        @if (currentWorkspace.blockingReasons.length > 0) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前阻断项">
                                <ul class="mt-2 list-disc space-y-1 pl-5">
                                    @for (reason of currentWorkspace.blockingReasons; track reason) {
                                        <li>{{ reason }}</li>
                                    }
                                </ul>
                            </app-workspace-feedback>
                        } @else {
                            <app-workspace-feedback class="mt-4 block" severity="success" summary="当前没有竞标阻断" [detail]="currentWorkspace.nextStep" />
                        }
                    </section-card>

                    <section-card>
                        <ng-template #title>材料与责任</ng-template>
                        <ng-template #description>进入报价前，投标材料、责任角色和阻断状态必须清楚可读。</ng-template>

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="materialItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="materialItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '58rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>材料</th>
                                    <th>状态</th>
                                    <th>责任角色</th>
                                    <th>截止时间</th>
                                    <th>阻断</th>
                                    <th>导航提示</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>
                                        <p-tag [value]="materialStatusLabel(item.materialStatus)" [severity]="materialStatusSeverity(item)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                    <td>{{ formatDateTime(item.dueAt) }}</td>
                                    <td>{{ item.blocksNextStep ? '阻断下一步' : '不阻断' }}</td>
                                    <td>{{ item.navigationHint ?? '待确认' }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="6">当前竞标过程没有材料项。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>

                    <section-card>
                        <ng-template #title>关键节点</ng-template>
                        <ng-template #description>时间线用于解释当前结果是否来自正式过程，而不是页面临时判断。</ng-template>

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="timelineItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="timelineItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '64rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>节点</th>
                                    <th>状态</th>
                                    <th>发生时间</th>
                                    <th>截止时间</th>
                                    <th>责任角色</th>
                                    <th>说明</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>
                                        <p-tag [value]="timelineStatusLabel(item.timelineStatus)" [severity]="timelineStatusSeverity(item.timelineStatus)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ formatDateTime(item.occurredAt) }}</td>
                                    <td>{{ formatDateTime(item.dueAt) }}</td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                    <td>{{ item.summary ?? '待确认' }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="6">当前竞标过程没有关键节点。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>
                } @else {
                    <section-card>
                        <ng-template #title>竞标过程尚未形成</ng-template>
                        <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="缺少正式竞标事实">
                            <ul class="mt-2 list-disc space-y-1 pl-5">
                                @for (reason of currentWorkspace.blockingReasons; track reason) {
                                    <li>{{ reason }}</li>
                                }
                            </ul>
                        </app-workspace-feedback>
                    </section-card>
                }

                <app-workspace-version-history
                    title="竞标版本历史"
                    description="查看当前 / 历史竞标过程、替代链和审计 metadata。"
                    primaryColumnHeader="过程阶段"
                    secondaryColumnHeader="参与决策"
                    outcomeColumnHeader="竞标结果"
                    emptyMessage="当前没有竞标过程历史版本。"
                    loadingMessage="正在读取竞标过程历史"
                    [summaryItems]="bidHistorySummaryItems()"
                    [rows]="bidHistoryRows()"
                    [loading]="loadingHistory()"
                    [error]="historyError()"
                />

                <section-card>
                    <ng-template #title>下一步</ng-template>
                    <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pricing-margin']" label="进入报价与毛利评审" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" severity="secondary" [outlined]="true" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>
            </div>
        }

        <p-dialog [(visible)]="bidDialogVisible" [modal]="true" [header]="bidDialogMode === 'edit' ? '编辑竞标过程' : '创建竞标过程'" [style]="{ width: 'min(58rem, 94vw)' }" styleClass="p-fluid">
            <div class="flex flex-col gap-5 py-4">
                <p-message severity="info" text="保存后会生成新的当前版本，原当前版本由后端标记为 superseded。" styleClass="w-full" />

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="bidMode" class="font-medium">竞标形态</label>
                        <p-select id="bidMode" [(ngModel)]="bidForm.bidMode" [options]="bidModeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="bidStage" class="font-medium">当前节点</label>
                        <p-select id="bidStage" [(ngModel)]="bidForm.currentStage" [options]="bidStageOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="bidDecision" class="font-medium">参与决策</label>
                        <p-select id="bidDecision" [(ngModel)]="bidForm.decision" [options]="bidDecisionOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="bidResult" class="font-medium">竞标结果</label>
                        <p-select id="bidResult" [(ngModel)]="bidForm.resultStatus" [options]="bidResultOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="tenderNo" class="font-medium">招标编号</label>
                        <input pInputText id="tenderNo" [(ngModel)]="bidForm.tenderNo" placeholder="客户招标编号，可为空" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="bidPackageNo" class="font-medium">标段 / 包件编号</label>
                        <input pInputText id="bidPackageNo" [(ngModel)]="bidForm.bidPackageNo" placeholder="标段或包件编号，可为空" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="bidOwnerRole" class="font-medium">责任角色</label>
                        <input pInputText id="bidOwnerRole" [(ngModel)]="bidForm.ownerRole" placeholder="例如：销售负责人 / 商务负责人" />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="bidProcessSummary" class="font-medium">过程摘要 <span class="text-red-500">*</span></label>
                        <textarea pTextarea id="bidProcessSummary" [(ngModel)]="bidForm.processSummary" rows="3" placeholder="说明当前竞标过程、客户反馈和待处理事项"></textarea>
                        @if (bidSubmitAttempted && !bidForm.processSummary.trim()) {
                            <span class="text-red-500 text-xs">请填写过程摘要</span>
                        }
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="bidDecisionSummary" class="font-medium">决策说明</label>
                        <textarea pTextarea id="bidDecisionSummary" [(ngModel)]="bidForm.decisionSummary" rows="3"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="bidResultSummary" class="font-medium">结果说明</label>
                        <textarea pTextarea id="bidResultSummary" [(ngModel)]="bidForm.resultSummary" rows="3"></textarea>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="text-base font-semibold text-surface-950 dark:text-surface-0">材料项</h3>
                        <p-button label="新增材料项" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addMaterialItem()" />
                    </div>

                    @for (item of bidForm.materialItems; track $index; let index = $index) {
                        <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div class="flex flex-col gap-2">
                                    <label [for]="'materialKey' + index" class="font-medium">材料键</label>
                                    <input pInputText [id]="'materialKey' + index" [(ngModel)]="item.materialKey" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'materialLabel' + index" class="font-medium">材料名称</label>
                                    <input pInputText [id]="'materialLabel' + index" [(ngModel)]="item.label" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'materialStatus' + index" class="font-medium">状态</label>
                                    <p-select [id]="'materialStatus' + index" [(ngModel)]="item.materialStatus" [options]="materialStatusOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'materialRole' + index" class="font-medium">责任角色</label>
                                    <input pInputText [id]="'materialRole' + index" [(ngModel)]="item.responsibleRole" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'materialDueAt' + index" class="font-medium">截止时间</label>
                                    <input pInputText [id]="'materialDueAt' + index" [(ngModel)]="item.dueAt" placeholder="ISO 时间，可为空" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'materialBlocks' + index" class="font-medium">阻断下一步</label>
                                    <p-select [id]="'materialBlocks' + index" [(ngModel)]="item.blocksNextStep" [options]="booleanOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                                </div>
                                <div class="flex flex-col gap-2 md:col-span-2">
                                    <label [for]="'materialHint' + index" class="font-medium">导航提示</label>
                                    <input pInputText [id]="'materialHint' + index" [(ngModel)]="item.navigationHint" />
                                </div>
                                <div class="flex items-end justify-end">
                                    <p-button label="删除" icon="pi pi-trash" severity="danger" [outlined]="true" size="small" (onClick)="removeMaterialItem(index)" />
                                </div>
                            </div>
                        </div>
                    } @empty {
                        <p-message severity="secondary" text="暂无材料项，保存时会提交空数组。" styleClass="w-full" />
                    }
                </div>

                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="text-base font-semibold text-surface-950 dark:text-surface-0">关键节点</h3>
                        <p-button label="新增节点" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addTimelineItem()" />
                    </div>

                    @for (item of bidForm.timelineItems; track $index; let index = $index) {
                        <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div class="flex flex-col gap-2">
                                    <label [for]="'timelineKey' + index" class="font-medium">节点键</label>
                                    <input pInputText [id]="'timelineKey' + index" [(ngModel)]="item.eventKey" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'timelineLabel' + index" class="font-medium">节点名称</label>
                                    <input pInputText [id]="'timelineLabel' + index" [(ngModel)]="item.label" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'timelineStatus' + index" class="font-medium">状态</label>
                                    <p-select [id]="'timelineStatus' + index" [(ngModel)]="item.timelineStatus" [options]="timelineStatusOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'timelineOccurredAt' + index" class="font-medium">发生时间</label>
                                    <input pInputText [id]="'timelineOccurredAt' + index" [(ngModel)]="item.occurredAt" placeholder="ISO 时间，可为空" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'timelineDueAt' + index" class="font-medium">截止时间</label>
                                    <input pInputText [id]="'timelineDueAt' + index" [(ngModel)]="item.dueAt" placeholder="ISO 时间，可为空" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'timelineRole' + index" class="font-medium">责任角色</label>
                                    <input pInputText [id]="'timelineRole' + index" [(ngModel)]="item.responsibleRole" />
                                </div>
                                <div class="flex flex-col gap-2 md:col-span-2">
                                    <label [for]="'timelineSummary' + index" class="font-medium">说明</label>
                                    <input pInputText [id]="'timelineSummary' + index" [(ngModel)]="item.summary" />
                                </div>
                                <div class="flex items-end justify-end">
                                    <p-button label="删除" icon="pi pi-trash" severity="danger" [outlined]="true" size="small" (onClick)="removeTimelineItem(index)" />
                                </div>
                            </div>
                        </div>
                    } @empty {
                        <p-message severity="secondary" text="暂无关键节点，保存时会提交空数组。" styleClass="w-full" />
                    }
                </div>
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="closeBidDialog()" />
                    <p-button label="保存为当前版本" (onClick)="submitBidProcess()" [loading]="saving()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class ProjectBidCommercialWorkspace implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly workspace = this.#workspaceStore.bidCommercialWorkspace;
    readonly loading = this.#workspaceStore.loadingBidCommercial;
    readonly history = this.#workspaceStore.bidCommercialProcessHistory;
    readonly loadingHistory = this.#workspaceStore.loadingBidCommercialHistory;
    readonly saving = this.#workspaceStore.savingBidCommercial;
    readonly error = this.#workspaceStore.bidCommercialError;
    readonly historyError = this.#workspaceStore.bidCommercialHistoryError;

    bidDialogVisible = false;
    bidDialogMode: BidCommercialDialogMode = 'create';
    bidSubmitAttempted = false;
    bidForm: BidCommercialForm = this.createEmptyBidForm();

    readonly booleanOptions = BOOLEAN_OPTIONS;
    readonly bidModeOptions: Option<CreateProjectBidCommercialProcessRequestBidModeEnum>[] = [
        { label: '公开招标', value: CreateProjectBidCommercialProcessRequestBidModeEnum.PublicTender },
        { label: '邀标', value: CreateProjectBidCommercialProcessRequestBidModeEnum.Invitation },
        { label: '比选', value: CreateProjectBidCommercialProcessRequestBidModeEnum.Comparison },
        { label: '商务谈判', value: CreateProjectBidCommercialProcessRequestBidModeEnum.CommercialNegotiation },
        { label: '竞争性谈判', value: CreateProjectBidCommercialProcessRequestBidModeEnum.CompetitiveNegotiation },
        { label: '直接商务', value: CreateProjectBidCommercialProcessRequestBidModeEnum.DirectCommercial },
        { label: '不适用', value: CreateProjectBidCommercialProcessRequestBidModeEnum.NotRequired }
    ];
    readonly bidStageOptions: Option<CreateProjectBidCommercialProcessRequestCurrentStageEnum>[] = [
        { label: '未启动', value: CreateProjectBidCommercialProcessRequestCurrentStageEnum.NotStarted },
        { label: '材料准备', value: CreateProjectBidCommercialProcessRequestCurrentStageEnum.Preparation },
        { label: '已提交', value: CreateProjectBidCommercialProcessRequestCurrentStageEnum.Submitted },
        { label: '谈判中', value: CreateProjectBidCommercialProcessRequestCurrentStageEnum.Negotiating },
        { label: '结果确认', value: CreateProjectBidCommercialProcessRequestCurrentStageEnum.ResultConfirmed },
        { label: '已关闭', value: CreateProjectBidCommercialProcessRequestCurrentStageEnum.Closed }
    ];
    readonly bidDecisionOptions: Option<CreateProjectBidCommercialProcessRequestDecisionEnum>[] = [
        { label: '待决策', value: CreateProjectBidCommercialProcessRequestDecisionEnum.Pending },
        { label: '参与', value: CreateProjectBidCommercialProcessRequestDecisionEnum.Participate },
        { label: '不投标', value: CreateProjectBidCommercialProcessRequestDecisionEnum.NoBid },
        { label: '不适用', value: CreateProjectBidCommercialProcessRequestDecisionEnum.NotRequired }
    ];
    readonly bidResultOptions: Option<CreateProjectBidCommercialProcessRequestResultStatusEnum>[] = [
        { label: '待结果', value: CreateProjectBidCommercialProcessRequestResultStatusEnum.Pending },
        { label: '中标 / 成交', value: CreateProjectBidCommercialProcessRequestResultStatusEnum.Won },
        { label: '未中标', value: CreateProjectBidCommercialProcessRequestResultStatusEnum.Lost },
        { label: '已取消', value: CreateProjectBidCommercialProcessRequestResultStatusEnum.Cancelled },
        { label: '不适用', value: CreateProjectBidCommercialProcessRequestResultStatusEnum.NotApplicable }
    ];
    readonly materialStatusOptions: Option<ProjectBidCommercialMaterialItemInputMaterialStatusEnum>[] = [
        { label: '缺失', value: ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Missing },
        { label: '处理中', value: ProjectBidCommercialMaterialItemInputMaterialStatusEnum.InProgress },
        { label: '已齐备', value: ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Ready },
        { label: '不适用', value: ProjectBidCommercialMaterialItemInputMaterialStatusEnum.NotRequired }
    ];
    readonly timelineStatusOptions: Option<ProjectBidCommercialTimelineItemInputTimelineStatusEnum>[] = [
        { label: '待完成', value: ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Pending },
        { label: '已完成', value: ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Done },
        { label: '已取消', value: ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Cancelled }
    ];

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadBidCommercialWorkspace(projectId).catch(() => undefined);
            void this.#workspaceStore.loadBidCommercialProcessHistory(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    canWriteBidCommercial(workspace: ProjectBidCommercialWorkspaceView): boolean {
        return workspace.allowedActions.includes('create-bid-commercial-process');
    }

    writeDisabledReason(workspace: ProjectBidCommercialWorkspaceView): string {
        if (!workspace.allowedActions.includes('create-bid-commercial-process')) {
            return '当前用户、项目阶段或项目状态没有招投标 / 商务竞标写入权限。';
        }

        return '当前工作区暂不允许写入。';
    }

    openBidDialog(workspace: ProjectBidCommercialWorkspaceView, mode: BidCommercialDialogMode): void {
        this.bidDialogMode = mode;
        this.bidSubmitAttempted = false;
        this.bidForm = mode === 'edit' && workspace.currentProcess ? this.createFormFromWorkspace(workspace) : this.createEmptyBidForm();
        this.bidDialogVisible = true;
    }

    closeBidDialog(): void {
        this.bidDialogVisible = false;
        this.bidSubmitAttempted = false;
    }

    addMaterialItem(): void {
        this.bidForm.materialItems = [...this.bidForm.materialItems, this.createEmptyMaterialItem(this.bidForm.materialItems.length + 1)];
    }

    removeMaterialItem(index: number): void {
        this.bidForm.materialItems = this.bidForm.materialItems.filter((_, currentIndex) => currentIndex !== index);
    }

    addTimelineItem(): void {
        this.bidForm.timelineItems = [...this.bidForm.timelineItems, this.createEmptyTimelineItem(this.bidForm.timelineItems.length + 1)];
    }

    removeTimelineItem(index: number): void {
        this.bidForm.timelineItems = this.bidForm.timelineItems.filter((_, currentIndex) => currentIndex !== index);
    }

    async submitBidProcess(): Promise<void> {
        this.bidSubmitAttempted = true;
        const request = this.buildBidRequest();

        if (!request) {
            return;
        }

        try {
            await this.#workspaceStore.createBidCommercialProcess(this.projectId(), request);
            this.closeBidDialog();
        } catch {
            // Store exposes the backend error in the page feedback.
        }
    }

    commandItems(workspace: ProjectBidCommercialWorkspaceView): WorkspaceCommandPanelItem[] {
        return [
            {
                label: '竞标形态',
                value: workspace.currentProcess ? this.bidModeLabel(workspace.currentProcess.bidMode) : '待形成竞标过程',
                icon: 'pi pi-sitemap'
            },
            {
                label: '当前节点',
                value: workspace.currentProcess ? this.bidStageLabel(workspace.currentProcess.currentStage) : '待启动',
                icon: 'pi pi-flag'
            },
            {
                label: '参与决策',
                value: workspace.currentProcess ? this.bidDecisionLabel(workspace.currentProcess.decision) : '待决策',
                icon: 'pi pi-check-circle'
            },
            {
                label: '竞标结果',
                value: workspace.currentProcess ? this.bidResultLabel(workspace.currentProcess.resultStatus) : '待结果',
                icon: 'pi pi-trophy'
            },
            {
                label: '责任归口',
                value: workspace.ownerLabel,
                icon: 'pi pi-users'
            }
        ];
    }

    processFactItems(process: ProjectBidCommercialProcessSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '竞标形态',
                value: this.bidModeLabel(process.bidMode),
                severity: this.bidModeSeverity(process.bidMode)
            },
            {
                label: '招标编号',
                value: process.tenderNo ?? '未提供'
            },
            {
                label: '标段 / 包件编号',
                value: process.bidPackageNo ?? '未提供'
            },
            {
                label: '过程阶段',
                value: this.bidStageLabel(process.currentStage),
                severity: this.bidStageSeverity(process.currentStage)
            },
            {
                label: '参与决策',
                value: this.bidDecisionLabel(process.decision),
                severity: this.bidDecisionSeverity(process.decision)
            },
            {
                label: '结果状态',
                value: this.bidResultLabel(process.resultStatus),
                severity: this.bidResultSeverity(process.resultStatus)
            },
            {
                label: '阻断数量',
                value: process.blockerCount,
                severity: process.blockerCount > 0 ? 'warn' : 'success'
            },
            {
                label: '当前版本',
                value: `V${process.version}`,
                detail: process.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '责任角色',
                value: process.ownerRole ?? '待确认'
            },
            {
                label: '生效时间',
                value: this.formatDateTime(process.effectiveAt)
            }
        ];
    }

    materialItems(workspace: ProjectBidCommercialWorkspaceView): ProjectBidCommercialMaterialItemView[] {
        return [...workspace.materialItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    timelineItems(workspace: ProjectBidCommercialWorkspaceView): ProjectBidCommercialTimelineItemView[] {
        return [...workspace.timelineItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    bidHistoryRows(): WorkspaceVersionHistoryRow[] {
        return this.sortedBidHistory().map((process) => ({
            id: process.id,
            versionLabel: `V${process.version}`,
            isCurrent: process.isCurrent,
            statusLabel: this.versionStatusLabel(process.status),
            statusSeverity: this.versionStatusSeverity(process.status),
            primaryLabel: '过程阶段',
            primaryValue: this.bidStageLabel(process.currentStage),
            primarySeverity: this.bidStageSeverity(process.currentStage),
            secondaryLabel: '参与决策',
            secondaryValue: this.bidDecisionLabel(process.decision),
            secondarySeverity: this.bidDecisionSeverity(process.decision),
            outcomeLabel: '竞标结果',
            outcomeValue: this.bidResultLabel(process.resultStatus),
            outcomeSeverity: this.bidResultSeverity(process.resultStatus),
            effectiveAt: this.formatDateTime(process.effectiveAt),
            createdAt: this.formatDateTime(process.createdAt),
            createdBy: this.operatorIdText(process.createdBy),
            updatedAt: this.formatDateTime(process.updatedAt),
            updatedBy: this.operatorIdText(process.updatedBy),
            supersedesLabel: this.supersedesText(process.supersedesId),
            rowVersionLabel: String(process.rowVersion)
        }));
    }

    bidHistorySummaryItems(): WorkspaceFactGridItem[] {
        const records = this.sortedBidHistory();
        const current = records.find((record) => record.isCurrent) ?? this.workspace()?.currentProcess ?? null;
        const historicalCount = records.filter((record) => !record.isCurrent).length;

        return [
            {
                label: '当前版本',
                value: current ? `V${current.version}` : '待形成',
                detail: current?.id ? this.shortId(current.id) : null,
                severity: current ? 'success' : 'secondary'
            },
            {
                label: '历史版本',
                value: historicalCount,
                detail: '不含当前版本'
            },
            {
                label: '最近生效',
                value: this.formatDateTime(current?.effectiveAt ?? records[0]?.effectiveAt)
            },
            {
                label: '上一版本',
                value: this.supersedesText(current?.supersedesId ?? null),
                detail: current?.rowVersion ? `Row version ${current.rowVersion}` : null
            }
        ];
    }

    bidModeLabel(value: string): string {
        return BID_MODE_LABELS[value] ?? value;
    }

    bidModeSeverity(value: string): UiTagSeverity {
        if (value === 'not-required') {
            return 'secondary';
        }
        if (value === 'direct-commercial') {
            return 'info';
        }
        return 'warn';
    }

    bidStageLabel(value: string): string {
        return BID_STAGE_LABELS[value] ?? value;
    }

    bidStageSeverity(value: string): UiTagSeverity {
        if (value === 'closed' || value === 'result-confirmed') {
            return 'success';
        }
        if (value === 'not-started') {
            return 'secondary';
        }
        return 'info';
    }

    bidDecisionLabel(value: string): string {
        return BID_DECISION_LABELS[value] ?? value;
    }

    bidDecisionSeverity(value: string): UiTagSeverity {
        if (value === 'participate' || value === 'not-required') {
            return 'success';
        }
        if (value === 'no-bid') {
            return 'warn';
        }
        return 'secondary';
    }

    bidResultLabel(value: string): string {
        return BID_RESULT_LABELS[value] ?? value;
    }

    bidResultSeverity(value: string): UiTagSeverity {
        if (value === 'won' || value === 'not-applicable') {
            return 'success';
        }
        if (value === 'lost' || value === 'cancelled') {
            return 'danger';
        }
        return 'secondary';
    }

    versionStatusLabel(value: string): string {
        if (value === 'effective') {
            return '生效中';
        }
        if (value === 'superseded') {
            return '已被替代';
        }
        return value;
    }

    versionStatusSeverity(value: string): UiTagSeverity {
        if (value === 'effective') {
            return 'success';
        }
        if (value === 'superseded') {
            return 'secondary';
        }
        return 'info';
    }

    materialStatusLabel(value: string): string {
        return MATERIAL_STATUS_LABELS[value] ?? value;
    }

    materialStatusSeverity(item: ProjectBidCommercialMaterialItemView): UiTagSeverity {
        if (item.blocksNextStep && item.materialStatus !== 'ready' && item.materialStatus !== 'not-required') {
            return 'danger';
        }
        if (item.materialStatus === 'ready' || item.materialStatus === 'not-required') {
            return 'success';
        }
        if (item.materialStatus === 'in-progress') {
            return 'warn';
        }
        return 'secondary';
    }

    timelineStatusLabel(value: string): string {
        return TIMELINE_STATUS_LABELS[value] ?? value;
    }

    timelineStatusSeverity(value: string): UiTagSeverity {
        if (value === 'done') {
            return 'success';
        }
        if (value === 'cancelled') {
            return 'danger';
        }
        return 'secondary';
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

    operatorIdText(value: string | null | undefined): string {
        return value?.trim() ? value : '系统 / 未记录';
    }

    supersedesText(value: string | null | undefined): string {
        return value ? `替代 ${this.shortId(value)}` : '无上一版本';
    }

    shortId(value: string): string {
        return value.length > 12 ? `${value.slice(0, 8)}...` : value;
    }

    sortedBidHistory(): ProjectBidCommercialProcessSummary[] {
        return [...this.history()].sort((left, right) => right.version - left.version);
    }

    createEmptyBidForm(): BidCommercialForm {
        return {
            bidMode: CreateProjectBidCommercialProcessRequestBidModeEnum.PublicTender,
            currentStage: CreateProjectBidCommercialProcessRequestCurrentStageEnum.Preparation,
            decision: CreateProjectBidCommercialProcessRequestDecisionEnum.Pending,
            resultStatus: CreateProjectBidCommercialProcessRequestResultStatusEnum.Pending,
            processSummary: '',
            decisionSummary: '',
            resultSummary: '',
            tenderNo: '',
            bidPackageNo: '',
            ownerRole: '',
            materialItems: [],
            timelineItems: []
        };
    }

    createFormFromWorkspace(workspace: ProjectBidCommercialWorkspaceView): BidCommercialForm {
        const currentProcess = workspace.currentProcess;
        if (!currentProcess) {
            return this.createEmptyBidForm();
        }

        return {
            bidMode: this.toBidMode(currentProcess.bidMode),
            currentStage: this.toBidStage(currentProcess.currentStage),
            decision: this.toBidDecision(currentProcess.decision),
            resultStatus: this.toBidResult(currentProcess.resultStatus),
            processSummary: currentProcess.processSummary,
            decisionSummary: currentProcess.decisionSummary ?? '',
            resultSummary: currentProcess.resultSummary ?? '',
            tenderNo: currentProcess.tenderNo ?? '',
            bidPackageNo: currentProcess.bidPackageNo ?? '',
            ownerRole: currentProcess.ownerRole ?? '',
            materialItems: this.materialItems(workspace).map((item, index) => ({
                materialKey: item.materialKey,
                label: item.label,
                materialStatus: this.toMaterialStatus(item.materialStatus),
                responsibleRole: item.responsibleRole ?? '',
                dueAt: item.dueAt ?? '',
                blocksNextStep: item.blocksNextStep,
                navigationHint: item.navigationHint ?? '',
                sortOrder: item.sortOrder ?? index + 1
            })),
            timelineItems: this.timelineItems(workspace).map((item, index) => ({
                eventKey: item.eventKey,
                label: item.label,
                summary: item.summary ?? '',
                timelineStatus: this.toTimelineStatus(item.timelineStatus),
                occurredAt: item.occurredAt ?? '',
                dueAt: item.dueAt ?? '',
                responsibleRole: item.responsibleRole ?? '',
                sortOrder: item.sortOrder ?? index + 1
            }))
        };
    }

    createEmptyMaterialItem(sortOrder: number): BidCommercialMaterialForm {
        return {
            materialKey: '',
            label: '',
            materialStatus: ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Missing,
            responsibleRole: '',
            dueAt: '',
            blocksNextStep: true,
            navigationHint: '',
            sortOrder
        };
    }

    createEmptyTimelineItem(sortOrder: number): BidCommercialTimelineForm {
        return {
            eventKey: '',
            label: '',
            summary: '',
            timelineStatus: ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Pending,
            occurredAt: '',
            dueAt: '',
            responsibleRole: '',
            sortOrder
        };
    }

    buildBidRequest(): CreateProjectBidCommercialProcessRequest | null {
        const processSummary = this.bidForm.processSummary.trim();
        if (!processSummary) {
            return null;
        }

        return {
            bidMode: this.bidForm.bidMode,
            currentStage: this.bidForm.currentStage,
            decision: this.bidForm.decision,
            resultStatus: this.bidForm.resultStatus,
            processSummary,
            decisionSummary: this.blankToNull(this.bidForm.decisionSummary),
            resultSummary: this.blankToNull(this.bidForm.resultSummary),
            tenderNo: this.blankToNull(this.bidForm.tenderNo),
            bidPackageNo: this.blankToNull(this.bidForm.bidPackageNo),
            ownerRole: this.blankToNull(this.bidForm.ownerRole),
            materialItems: this.bidForm.materialItems.map(
                (item, index): ProjectBidCommercialMaterialItemInput => ({
                    materialKey: item.materialKey.trim() || `material-${index + 1}`,
                    label: item.label.trim() || `材料项 ${index + 1}`,
                    materialStatus: item.materialStatus,
                    responsibleRole: this.blankToNull(item.responsibleRole),
                    dueAt: this.blankToNull(item.dueAt),
                    blocksNextStep: item.blocksNextStep,
                    navigationHint: this.blankToNull(item.navigationHint),
                    sortOrder: index + 1
                })
            ),
            timelineItems: this.bidForm.timelineItems.map(
                (item, index): ProjectBidCommercialTimelineItemInput => ({
                    eventKey: item.eventKey.trim() || `event-${index + 1}`,
                    label: item.label.trim() || `节点 ${index + 1}`,
                    summary: this.blankToNull(item.summary),
                    timelineStatus: item.timelineStatus,
                    occurredAt: this.blankToNull(item.occurredAt),
                    dueAt: this.blankToNull(item.dueAt),
                    responsibleRole: this.blankToNull(item.responsibleRole),
                    sortOrder: index + 1
                })
            )
        };
    }

    blankToNull(value: string): string | null {
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }

    toBidMode(value: string): CreateProjectBidCommercialProcessRequestBidModeEnum {
        switch (value) {
            case CreateProjectBidCommercialProcessRequestBidModeEnum.PublicTender:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.PublicTender;
            case CreateProjectBidCommercialProcessRequestBidModeEnum.Invitation:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.Invitation;
            case CreateProjectBidCommercialProcessRequestBidModeEnum.Comparison:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.Comparison;
            case CreateProjectBidCommercialProcessRequestBidModeEnum.CommercialNegotiation:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.CommercialNegotiation;
            case CreateProjectBidCommercialProcessRequestBidModeEnum.CompetitiveNegotiation:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.CompetitiveNegotiation;
            case CreateProjectBidCommercialProcessRequestBidModeEnum.DirectCommercial:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.DirectCommercial;
            case CreateProjectBidCommercialProcessRequestBidModeEnum.NotRequired:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.NotRequired;
            default:
                return CreateProjectBidCommercialProcessRequestBidModeEnum.NotRequired;
        }
    }

    toBidStage(value: string): CreateProjectBidCommercialProcessRequestCurrentStageEnum {
        switch (value) {
            case CreateProjectBidCommercialProcessRequestCurrentStageEnum.NotStarted:
                return CreateProjectBidCommercialProcessRequestCurrentStageEnum.NotStarted;
            case CreateProjectBidCommercialProcessRequestCurrentStageEnum.Preparation:
                return CreateProjectBidCommercialProcessRequestCurrentStageEnum.Preparation;
            case CreateProjectBidCommercialProcessRequestCurrentStageEnum.Submitted:
                return CreateProjectBidCommercialProcessRequestCurrentStageEnum.Submitted;
            case CreateProjectBidCommercialProcessRequestCurrentStageEnum.Negotiating:
                return CreateProjectBidCommercialProcessRequestCurrentStageEnum.Negotiating;
            case CreateProjectBidCommercialProcessRequestCurrentStageEnum.ResultConfirmed:
                return CreateProjectBidCommercialProcessRequestCurrentStageEnum.ResultConfirmed;
            case CreateProjectBidCommercialProcessRequestCurrentStageEnum.Closed:
                return CreateProjectBidCommercialProcessRequestCurrentStageEnum.Closed;
            default:
                return CreateProjectBidCommercialProcessRequestCurrentStageEnum.NotStarted;
        }
    }

    toBidDecision(value: string): CreateProjectBidCommercialProcessRequestDecisionEnum {
        switch (value) {
            case CreateProjectBidCommercialProcessRequestDecisionEnum.Pending:
                return CreateProjectBidCommercialProcessRequestDecisionEnum.Pending;
            case CreateProjectBidCommercialProcessRequestDecisionEnum.Participate:
                return CreateProjectBidCommercialProcessRequestDecisionEnum.Participate;
            case CreateProjectBidCommercialProcessRequestDecisionEnum.NoBid:
                return CreateProjectBidCommercialProcessRequestDecisionEnum.NoBid;
            case CreateProjectBidCommercialProcessRequestDecisionEnum.NotRequired:
                return CreateProjectBidCommercialProcessRequestDecisionEnum.NotRequired;
            default:
                return CreateProjectBidCommercialProcessRequestDecisionEnum.Pending;
        }
    }

    toBidResult(value: string): CreateProjectBidCommercialProcessRequestResultStatusEnum {
        switch (value) {
            case CreateProjectBidCommercialProcessRequestResultStatusEnum.Pending:
                return CreateProjectBidCommercialProcessRequestResultStatusEnum.Pending;
            case CreateProjectBidCommercialProcessRequestResultStatusEnum.Won:
                return CreateProjectBidCommercialProcessRequestResultStatusEnum.Won;
            case CreateProjectBidCommercialProcessRequestResultStatusEnum.Lost:
                return CreateProjectBidCommercialProcessRequestResultStatusEnum.Lost;
            case CreateProjectBidCommercialProcessRequestResultStatusEnum.Cancelled:
                return CreateProjectBidCommercialProcessRequestResultStatusEnum.Cancelled;
            case CreateProjectBidCommercialProcessRequestResultStatusEnum.NotApplicable:
                return CreateProjectBidCommercialProcessRequestResultStatusEnum.NotApplicable;
            default:
                return CreateProjectBidCommercialProcessRequestResultStatusEnum.Pending;
        }
    }

    toMaterialStatus(value: string): ProjectBidCommercialMaterialItemInputMaterialStatusEnum {
        switch (value) {
            case ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Missing:
                return ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Missing;
            case ProjectBidCommercialMaterialItemInputMaterialStatusEnum.InProgress:
                return ProjectBidCommercialMaterialItemInputMaterialStatusEnum.InProgress;
            case ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Ready:
                return ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Ready;
            case ProjectBidCommercialMaterialItemInputMaterialStatusEnum.NotRequired:
                return ProjectBidCommercialMaterialItemInputMaterialStatusEnum.NotRequired;
            default:
                return ProjectBidCommercialMaterialItemInputMaterialStatusEnum.Missing;
        }
    }

    toTimelineStatus(value: string): ProjectBidCommercialTimelineItemInputTimelineStatusEnum {
        switch (value) {
            case ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Pending:
                return ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Pending;
            case ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Done:
                return ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Done;
            case ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Cancelled:
                return ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Cancelled;
            default:
                return ProjectBidCommercialTimelineItemInputTimelineStatusEnum.Pending;
        }
    }
}
