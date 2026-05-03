import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
    BidCommercialModeLabel,
    BidCommercialResultStatusLabel,
    GrossMarginBandLabel,
    PricingMarginConditionStatusLabel,
    PricingMarginConditionTypeLabel,
    PricingMarginDecisionLabel,
    PricingMarginPathLabel,
    TechnicalFeasibilityDecisionLabel
} from '@poms/shared-contracts';
import {
    CreateProjectPricingMarginReviewRequestDecisionEnum,
    CreateProjectPricingMarginReviewRequestGrossMarginBandEnum,
    CreateProjectPricingMarginReviewRequestPricingPathEnum,
    ProjectBidCommercialProcessSummaryBidModeEnum,
    ProjectBidCommercialProcessSummaryResultStatusEnum,
    ProjectWorkspaceStore,
    type ProjectBidCommercialProcessSummary,
    type CreateProjectPricingMarginReviewRequest,
    type ProjectPricingMarginConditionItemInput,
    ProjectPricingMarginConditionItemInputConditionStatusEnum,
    ProjectPricingMarginConditionItemInputConditionTypeEnum,
    ProjectPricingMarginConditionItemViewConditionStatusEnum,
    ProjectPricingMarginConditionItemViewConditionTypeEnum,
    type ProjectPricingMarginConditionItemView,
    ProjectPricingMarginReviewSummaryDecisionEnum,
    ProjectPricingMarginReviewSummaryGrossMarginBandEnum,
    ProjectPricingMarginReviewSummaryPricingPathEnum,
    ProjectPricingMarginReviewSummaryStatusEnum,
    type ProjectPricingMarginReviewSummary,
    ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum,
    type ProjectPricingMarginWorkspaceView,
    type ProjectTechnicalCostPackageSummary
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
import { formatAmount, type UiTagSeverity } from './project-presentation';

type PricingPathValue = CreateProjectPricingMarginReviewRequestPricingPathEnum | ProjectPricingMarginReviewSummaryPricingPathEnum;
type GrossMarginBandValue = CreateProjectPricingMarginReviewRequestGrossMarginBandEnum | ProjectPricingMarginReviewSummaryGrossMarginBandEnum;
type PricingDecisionValue = CreateProjectPricingMarginReviewRequestDecisionEnum | ProjectPricingMarginReviewSummaryDecisionEnum;
type PricingConditionTypeValue = ProjectPricingMarginConditionItemInputConditionTypeEnum | ProjectPricingMarginConditionItemViewConditionTypeEnum;
type PricingConditionStatusValue = ProjectPricingMarginConditionItemInputConditionStatusEnum | ProjectPricingMarginConditionItemViewConditionStatusEnum;

const PRICING_PATH_LABELS = PricingMarginPathLabel as Record<PricingPathValue, string>;
const GROSS_MARGIN_BAND_LABELS = GrossMarginBandLabel as Record<GrossMarginBandValue, string>;
const PRICING_DECISION_LABELS = PricingMarginDecisionLabel as Record<PricingDecisionValue, string>;
const CONDITION_TYPE_LABELS = PricingMarginConditionTypeLabel as Record<PricingConditionTypeValue, string>;
const CONDITION_STATUS_LABELS = PricingMarginConditionStatusLabel as Record<PricingConditionStatusValue, string>;
const BID_MODE_LABELS = BidCommercialModeLabel as Record<ProjectBidCommercialProcessSummaryBidModeEnum, string>;
const BID_RESULT_LABELS = BidCommercialResultStatusLabel as Record<ProjectBidCommercialProcessSummaryResultStatusEnum, string>;
const TECHNICAL_DECISION_LABELS = TechnicalFeasibilityDecisionLabel as Record<ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum, string>;

type Option<T> = {
    label: string;
    value: T;
};

type PricingMarginDialogMode = 'create' | 'edit';

type PricingMarginConditionForm = {
    conditionKey: string;
    conditionType: ProjectPricingMarginConditionItemInputConditionTypeEnum;
    label: string;
    conditionSummary: string;
    conditionStatus: ProjectPricingMarginConditionItemInputConditionStatusEnum;
    requiredForContracting: boolean;
    responsibleRole: string;
    dueAt: string;
    resolutionSummary: string;
    sortOrder: number;
};

type PricingMarginForm = {
    technicalCostPackageId: string;
    bidCommercialProcessId: string;
    commercialReleaseBaselineId: string;
    pricingPath: CreateProjectPricingMarginReviewRequestPricingPathEnum;
    quoteVersion: string;
    currencyCode: string;
    quoteAmountTaxInclusive: string;
    quoteAmountTaxExclusive: string;
    taxRate: string;
    taxConditionSummary: string;
    paymentTermsSummary: string;
    grossMarginRate: string;
    grossMarginBand: CreateProjectPricingMarginReviewRequestGrossMarginBandEnum;
    grossMarginSummary: string;
    decision: CreateProjectPricingMarginReviewRequestDecisionEnum;
    decisionSummary: string;
    approvalScenarioKey: string;
    summaryPackageKey: string;
    summarySnapshotId: string;
    projectionLevel: string;
    exportPolicy: string;
    ownerRole: string;
    conditionItems: PricingMarginConditionForm[];
};

const BOOLEAN_OPTIONS: Option<boolean>[] = [
    { label: '是', value: true },
    { label: '否', value: false }
];

@Component({
    selector: 'app-project-pricing-margin-workspace',
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
            <app-workspace-loading label="正在读取报价与毛利评审" />
        } @else if (error()) {
            <app-workspace-feedback severity="error" summary="报价与毛利评审暂不可用" [detail]="error()">
                <div class="mt-4 flex flex-wrap gap-2">
                    <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" />
                    <app-workspace-action-link [routerLink]="['/projects', projectId()]" label="查看项目详情" severity="secondary" [outlined]="true" />
                </div>
            </app-workspace-feedback>
        } @else if (workspace(); as currentWorkspace) {
            <div class="flex flex-col gap-6">
                <app-workspace-command-panel heading="报价与毛利评审" caption="先确认报价、成本版本、税务回款条件和放行结论。" [items]="commandItems(currentWorkspace)" />

                <section-card>
                    <ng-template #title>评审维护</ng-template>
                    <ng-template #description>新增或编辑当前报价评审会提交新的当前版本，历史版本由后端保留。</ng-template>

                    @if (canWritePricingMargin(currentWorkspace)) {
                        <div class="mt-4 flex flex-wrap gap-2">
                            <p-button [label]="currentWorkspace.currentReview ? '编辑当前评审' : '创建报价评审'" icon="pi pi-pencil" (onClick)="openPricingDialog(currentWorkspace, currentWorkspace.currentReview ? 'edit' : 'create')" />
                            @if (currentWorkspace.currentReview) {
                                <p-button label="创建新评审" icon="pi pi-plus" severity="secondary" [outlined]="true" (onClick)="openPricingDialog(currentWorkspace, 'create')" />
                            }
                        </div>
                    } @else {
                        <app-workspace-feedback class="mt-4 block" severity="info" summary="当前只读" [detail]="pricingWriteDisabledReason(currentWorkspace)" />
                    }
                </section-card>

                @if (currentWorkspace.currentReview; as currentReview) {
                    <section-card>
                        <ng-template #title>当前报价评审</ng-template>
                        <ng-template #description>{{ currentReview.decisionSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="reviewFactItems(currentReview, currentWorkspace)" [columns]="4" />

                        @if (currentWorkspace.blockingReasons.length > 0) {
                            <app-workspace-feedback class="mt-4 block" severity="warn" summary="当前阻断项">
                                <ul class="mt-2 list-disc space-y-1 pl-5">
                                    @for (reason of currentWorkspace.blockingReasons; track reason) {
                                        <li>{{ reason }}</li>
                                    }
                                </ul>
                            </app-workspace-feedback>
                        } @else {
                            <app-workspace-feedback class="mt-4 block" severity="success" summary="当前可进入签约承接" [detail]="currentWorkspace.nextStep" />
                        }
                    </section-card>

                    <section-card>
                        <ng-template #title>报价、税务与回款条件</ng-template>
                        <ng-template #description>{{ currentReview.grossMarginSummary }}</ng-template>

                        <app-workspace-fact-grid class="mt-4 block" [items]="pricingFactItems(currentReview)" [columns]="4" />
                    </section-card>

                    <section-card>
                        <ng-template #title>上游事实引用</ng-template>
                        <ng-template #description>报价结论必须能追溯到成本版本和竞标 / 商务路径。</ng-template>

                        <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                            @if (currentWorkspace.technicalCostPackage; as technicalCostPackage) {
                                <app-workspace-fact-grid [items]="technicalCostFactItems(technicalCostPackage)" [columns]="2" />
                            } @else {
                                <app-workspace-feedback severity="warn" summary="缺少技术与成本版本引用" detail="报价评审应明确引用当前成本版本。" />
                            }

                            @if (currentWorkspace.bidCommercialProcess; as bidCommercialProcess) {
                                <app-workspace-fact-grid [items]="bidFactItems(bidCommercialProcess)" [columns]="2" />
                            } @else {
                                <app-workspace-feedback severity="info" summary="未引用竞标过程" detail="直接商务路径或暂未形成竞标过程时允许为空，但必须由后端事实明确。" />
                            }
                        </div>
                    </section-card>

                    <section-card>
                        <ng-template #title>条件与阻断</ng-template>
                        <ng-template #description>有条件放行、升级或阻断项必须明确责任角色、截止时间和处理结论。</ng-template>

                        <p-table
                            class="mt-4 block"
                            styleClass="p-datatable-sm"
                            [value]="conditionItems(currentWorkspace)"
                            [rowHover]="true"
                            [paginator]="conditionItems(currentWorkspace).length > 6"
                            [rows]="6"
                            [scrollable]="true"
                            [tableStyle]="{ 'min-width': '72rem' }"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>条件</th>
                                    <th>类型</th>
                                    <th>状态</th>
                                    <th>签约前必须完成</th>
                                    <th>责任角色</th>
                                    <th>截止时间</th>
                                    <th>说明</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-item>
                                <tr>
                                    <td class="font-medium text-surface-950 dark:text-surface-0">{{ item.label }}</td>
                                    <td>{{ conditionTypeLabel(item.conditionType) }}</td>
                                    <td>
                                        <p-tag [value]="conditionStatusLabel(item.conditionStatus)" [severity]="conditionStatusSeverity(item)" styleClass="rounded-[6px]!" />
                                    </td>
                                    <td>{{ item.requiredForContracting ? '必须完成' : '非阻断条件' }}</td>
                                    <td>{{ item.responsibleRole ?? '待确认' }}</td>
                                    <td>{{ formatDateTime(item.dueAt) }}</td>
                                    <td>{{ item.resolutionSummary ?? item.conditionSummary }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="7">当前报价评审没有条件项。</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </section-card>
                } @else {
                    <section-card>
                        <ng-template #title>报价与毛利评审尚未形成</ng-template>
                        <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                        <app-workspace-feedback class="mt-4 block" severity="warn" summary="缺少正式报价评审事实">
                            <ul class="mt-2 list-disc space-y-1 pl-5">
                                @for (reason of currentWorkspace.blockingReasons; track reason) {
                                    <li>{{ reason }}</li>
                                }
                            </ul>
                        </app-workspace-feedback>
                    </section-card>
                }

                <app-workspace-version-history
                    title="报价评审版本历史"
                    description="查看当前 / 历史报价评审、替代链和审计 metadata。"
                    primaryColumnHeader="报价版本"
                    secondaryColumnHeader="毛利判断"
                    outcomeColumnHeader="评审结论"
                    emptyMessage="当前没有报价评审历史版本。"
                    loadingMessage="正在读取报价评审历史"
                    [summaryItems]="pricingHistorySummaryItems()"
                    [rows]="pricingHistoryRows()"
                    [loading]="loadingHistory()"
                    [error]="historyError()"
                />

                <section-card>
                    <ng-template #title>下一步</ng-template>
                    <ng-template #description>{{ currentWorkspace.nextStep }}</ng-template>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'bid-commercial']" label="查看招投标 / 商务竞标" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace', 'pre-signing']" label="返回签约前主线" severity="secondary" [outlined]="true" />
                        <app-workspace-action-link [routerLink]="['/projects', projectId(), 'workspace']" label="返回工作区总览" severity="secondary" [outlined]="true" />
                    </div>
                </section-card>
            </div>
        }

        <p-dialog [(visible)]="pricingDialogVisible" [modal]="true" [header]="pricingDialogMode === 'edit' ? '编辑报价评审' : '创建报价评审'" [style]="{ width: 'min(58rem, 94vw)' }" styleClass="p-fluid">
            <div class="flex flex-col gap-5 py-4">
                <p-message severity="info" text="保存后会生成新的当前版本，原当前版本由后端标记为 superseded。" styleClass="w-full" />

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="pricingPath" class="font-medium">报价路径</label>
                        <p-select id="pricingPath" [(ngModel)]="pricingForm.pricingPath" [options]="pricingPathOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="pricingDecision" class="font-medium">评审结论</label>
                        <p-select id="pricingDecision" [(ngModel)]="pricingForm.decision" [options]="pricingDecisionOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="quoteVersion" class="font-medium">报价版本 <span class="text-red-500">*</span></label>
                        <input pInputText id="quoteVersion" [(ngModel)]="pricingForm.quoteVersion" placeholder="例如 Q-2026-001" />
                        @if (pricingSubmitAttempted && !pricingForm.quoteVersion.trim()) {
                            <span class="text-red-500 text-xs">请填写报价版本</span>
                        }
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="pricingCurrency" class="font-medium">币种</label>
                        <input pInputText id="pricingCurrency" [(ngModel)]="pricingForm.currencyCode" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="quoteTaxInclusive" class="font-medium">含税报价 <span class="text-red-500">*</span></label>
                        <input pInputText id="quoteTaxInclusive" [(ngModel)]="pricingForm.quoteAmountTaxInclusive" placeholder="数字字符串" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="quoteTaxExclusive" class="font-medium">不含税报价 <span class="text-red-500">*</span></label>
                        <input pInputText id="quoteTaxExclusive" [(ngModel)]="pricingForm.quoteAmountTaxExclusive" placeholder="数字字符串" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="taxRate" class="font-medium">税率 <span class="text-red-500">*</span></label>
                        <input pInputText id="taxRate" [(ngModel)]="pricingForm.taxRate" placeholder="例如 0.0600" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="grossMarginRate" class="font-medium">毛利率</label>
                        <input pInputText id="grossMarginRate" [(ngModel)]="pricingForm.grossMarginRate" placeholder="例如 0.3200，可为空" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="grossMarginBand" class="font-medium">毛利区间</label>
                        <p-select id="grossMarginBand" [(ngModel)]="pricingForm.grossMarginBand" [options]="grossMarginBandOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="pricingOwnerRole" class="font-medium">责任角色</label>
                        <input pInputText id="pricingOwnerRole" [(ngModel)]="pricingForm.ownerRole" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="technicalCostPackageId" class="font-medium">技术成本版本</label>
                        <input pInputText id="technicalCostPackageId" [(ngModel)]="pricingForm.technicalCostPackageId" readonly />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="bidCommercialProcessId" class="font-medium">竞标过程引用</label>
                        <input pInputText id="bidCommercialProcessId" [(ngModel)]="pricingForm.bidCommercialProcessId" readonly />
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="taxConditionSummary" class="font-medium">税务条件 <span class="text-red-500">*</span></label>
                        <textarea pTextarea id="taxConditionSummary" [(ngModel)]="pricingForm.taxConditionSummary" rows="3"></textarea>
                    </div>
                    <div class="flex flex-col gap-2 md:col-span-2">
                        <label for="paymentTermsSummary" class="font-medium">回款条件 <span class="text-red-500">*</span></label>
                        <textarea pTextarea id="paymentTermsSummary" [(ngModel)]="pricingForm.paymentTermsSummary" rows="3"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="grossMarginSummary" class="font-medium">毛利说明 <span class="text-red-500">*</span></label>
                        <textarea pTextarea id="grossMarginSummary" [(ngModel)]="pricingForm.grossMarginSummary" rows="3"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="decisionSummary" class="font-medium">结论说明 <span class="text-red-500">*</span></label>
                        <textarea pTextarea id="decisionSummary" [(ngModel)]="pricingForm.decisionSummary" rows="3"></textarea>
                    </div>
                </div>

                @if (pricingSubmitAttempted && !isPricingFormValid()) {
                    <p-message severity="warn" text="请补齐报价版本、金额、税率、税务条件、回款条件、毛利说明和结论说明。" styleClass="w-full" />
                }

                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="text-base font-semibold text-surface-950 dark:text-surface-0">条件项</h3>
                        <p-button label="新增条件项" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addConditionItem()" />
                    </div>

                    @for (item of pricingForm.conditionItems; track $index; let index = $index) {
                        <div class="rounded-[8px] border border-surface-200 p-3 dark:border-surface-700">
                            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div class="flex flex-col gap-2">
                                    <label [for]="'conditionKey' + index" class="font-medium">条件键</label>
                                    <input pInputText [id]="'conditionKey' + index" [(ngModel)]="item.conditionKey" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'conditionLabel' + index" class="font-medium">条件名称</label>
                                    <input pInputText [id]="'conditionLabel' + index" [(ngModel)]="item.label" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'conditionType' + index" class="font-medium">类型</label>
                                    <p-select [id]="'conditionType' + index" [(ngModel)]="item.conditionType" [options]="conditionTypeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'conditionStatus' + index" class="font-medium">状态</label>
                                    <p-select [id]="'conditionStatus' + index" [(ngModel)]="item.conditionStatus" [options]="conditionStatusOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'conditionRequired' + index" class="font-medium">签约前必须完成</label>
                                    <p-select [id]="'conditionRequired' + index" [(ngModel)]="item.requiredForContracting" [options]="booleanOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'conditionRole' + index" class="font-medium">责任角色</label>
                                    <input pInputText [id]="'conditionRole' + index" [(ngModel)]="item.responsibleRole" />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label [for]="'conditionDueAt' + index" class="font-medium">截止时间</label>
                                    <input pInputText [id]="'conditionDueAt' + index" [(ngModel)]="item.dueAt" placeholder="ISO 时间，可为空" />
                                </div>
                                <div class="flex flex-col gap-2 md:col-span-2">
                                    <label [for]="'conditionSummary' + index" class="font-medium">条件说明</label>
                                    <input pInputText [id]="'conditionSummary' + index" [(ngModel)]="item.conditionSummary" />
                                </div>
                                <div class="flex flex-col gap-2 md:col-span-2">
                                    <label [for]="'conditionResolution' + index" class="font-medium">处理说明</label>
                                    <input pInputText [id]="'conditionResolution' + index" [(ngModel)]="item.resolutionSummary" />
                                </div>
                                <div class="flex items-end justify-end">
                                    <p-button label="删除" icon="pi pi-trash" severity="danger" [outlined]="true" size="small" (onClick)="removeConditionItem(index)" />
                                </div>
                            </div>
                        </div>
                    } @empty {
                        <p-message severity="secondary" text="暂无条件项，保存时会提交空数组。" styleClass="w-full" />
                    }
                </div>
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="closePricingDialog()" />
                    <p-button label="保存为当前版本" (onClick)="submitPricingReview()" [loading]="saving()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class ProjectPricingMarginWorkspace implements OnInit {
    readonly #route = inject(ActivatedRoute);
    readonly #workspaceStore = inject(ProjectWorkspaceStore);

    readonly workspace = this.#workspaceStore.pricingMarginWorkspace;
    readonly loading = this.#workspaceStore.loadingPricingMargin;
    readonly history = this.#workspaceStore.pricingMarginReviewHistory;
    readonly loadingHistory = this.#workspaceStore.loadingPricingMarginHistory;
    readonly saving = this.#workspaceStore.savingPricingMargin;
    readonly error = this.#workspaceStore.pricingMarginError;
    readonly historyError = this.#workspaceStore.pricingMarginHistoryError;

    pricingDialogVisible = false;
    pricingDialogMode: PricingMarginDialogMode = 'create';
    pricingSubmitAttempted = false;
    pricingForm: PricingMarginForm = this.createEmptyPricingForm(null);

    readonly booleanOptions = BOOLEAN_OPTIONS;
    readonly pricingPathOptions: Option<CreateProjectPricingMarginReviewRequestPricingPathEnum>[] = [
        { label: '竞标承接', value: CreateProjectPricingMarginReviewRequestPricingPathEnum.Bid },
        { label: '直接商务', value: CreateProjectPricingMarginReviewRequestPricingPathEnum.DirectCommercial }
    ];
    readonly pricingDecisionOptions: Option<CreateProjectPricingMarginReviewRequestDecisionEnum>[] = [
        { label: '待评审', value: CreateProjectPricingMarginReviewRequestDecisionEnum.Pending },
        { label: '已放行', value: CreateProjectPricingMarginReviewRequestDecisionEnum.Released },
        { label: '有条件放行', value: CreateProjectPricingMarginReviewRequestDecisionEnum.ConditionalRelease },
        { label: '已驳回', value: CreateProjectPricingMarginReviewRequestDecisionEnum.Rejected },
        { label: '需升级', value: CreateProjectPricingMarginReviewRequestDecisionEnum.EscalationRequired }
    ];
    readonly grossMarginBandOptions: Option<CreateProjectPricingMarginReviewRequestGrossMarginBandEnum>[] = [
        { label: '低于红线', value: CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.BelowRedline },
        { label: '需关注', value: CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Watch },
        { label: '达到目标', value: CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Target },
        { label: '未计算', value: CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.NotCalculated }
    ];
    readonly conditionTypeOptions: Option<ProjectPricingMarginConditionItemInputConditionTypeEnum>[] = [
        { label: '财务', value: ProjectPricingMarginConditionItemInputConditionTypeEnum.Financial },
        { label: '税务', value: ProjectPricingMarginConditionItemInputConditionTypeEnum.Tax },
        { label: '回款', value: ProjectPricingMarginConditionItemInputConditionTypeEnum.Payment },
        { label: '范围', value: ProjectPricingMarginConditionItemInputConditionTypeEnum.Scope },
        { label: '风险', value: ProjectPricingMarginConditionItemInputConditionTypeEnum.Risk },
        { label: '审批', value: ProjectPricingMarginConditionItemInputConditionTypeEnum.Approval }
    ];
    readonly conditionStatusOptions: Option<ProjectPricingMarginConditionItemInputConditionStatusEnum>[] = [
        { label: '打开', value: ProjectPricingMarginConditionItemInputConditionStatusEnum.Open },
        { label: '已关闭', value: ProjectPricingMarginConditionItemInputConditionStatusEnum.Closed },
        { label: '已豁免', value: ProjectPricingMarginConditionItemInputConditionStatusEnum.Waived }
    ];

    ngOnInit() {
        const projectId = this.projectId();
        if (projectId) {
            void this.#workspaceStore.loadPricingMarginWorkspace(projectId).catch(() => undefined);
            void this.#workspaceStore.loadPricingMarginReviewHistory(projectId).catch(() => undefined);
        }
    }

    projectId(): string {
        return this.#route.parent?.snapshot.paramMap.get('id') ?? this.#route.snapshot.paramMap.get('id') ?? '';
    }

    canWritePricingMargin(workspace: ProjectPricingMarginWorkspaceView): boolean {
        return workspace.allowedActions.includes('create-pricing-margin-review') && workspace.technicalCostPackage !== null;
    }

    pricingWriteDisabledReason(workspace: ProjectPricingMarginWorkspaceView): string {
        if (!workspace.allowedActions.includes('create-pricing-margin-review')) {
            return '当前用户、项目阶段或项目状态没有报价 / 毛利评审写入权限。';
        }

        if (!workspace.technicalCostPackage) {
            return '当前缺少可引用的技术与成本版本，需先完成技术与成本工作区。';
        }

        return '当前工作区暂不允许写入。';
    }

    openPricingDialog(workspace: ProjectPricingMarginWorkspaceView, mode: PricingMarginDialogMode): void {
        this.pricingDialogMode = mode;
        this.pricingSubmitAttempted = false;
        this.pricingForm = mode === 'edit' && workspace.currentReview ? this.createPricingFormFromWorkspace(workspace) : this.createEmptyPricingForm(workspace);
        this.pricingDialogVisible = true;
    }

    closePricingDialog(): void {
        this.pricingDialogVisible = false;
        this.pricingSubmitAttempted = false;
    }

    addConditionItem(): void {
        this.pricingForm.conditionItems = [...this.pricingForm.conditionItems, this.createEmptyConditionItem(this.pricingForm.conditionItems.length + 1)];
    }

    removeConditionItem(index: number): void {
        this.pricingForm.conditionItems = this.pricingForm.conditionItems.filter((_, currentIndex) => currentIndex !== index);
    }

    async submitPricingReview(): Promise<void> {
        this.pricingSubmitAttempted = true;
        const request = this.buildPricingRequest();

        if (!request) {
            return;
        }

        try {
            await this.#workspaceStore.createPricingMarginReview(this.projectId(), request);
            this.closePricingDialog();
        } catch {
            // Store exposes the backend error in the page feedback.
        }
    }

    commandItems(workspace: ProjectPricingMarginWorkspaceView): WorkspaceCommandPanelItem[] {
        return [
            {
                label: '报价版本',
                value: workspace.currentReview?.quoteVersion ?? '待形成评审',
                icon: 'pi pi-file-edit'
            },
            {
                label: '评审结论',
                value: workspace.currentReview ? this.pricingDecisionLabel(workspace.currentReview.decision) : '待评审',
                icon: 'pi pi-verified'
            },
            {
                label: '毛利判断',
                value: workspace.currentReview ? this.grossMarginBandLabel(workspace.currentReview.grossMarginBand) : '待判断',
                icon: 'pi pi-chart-line'
            },
            {
                label: '签约承接',
                value: workspace.readyForContracting ? '可进入' : '暂不可进入',
                icon: 'pi pi-send'
            },
            {
                label: '责任归口',
                value: workspace.ownerLabel,
                icon: 'pi pi-users'
            }
        ];
    }

    reviewFactItems(review: ProjectPricingMarginReviewSummary, workspace: ProjectPricingMarginWorkspaceView): WorkspaceFactGridItem[] {
        return [
            {
                label: '评审结论',
                value: this.pricingDecisionLabel(review.decision),
                severity: this.pricingDecisionSeverity(review.decision)
            },
            {
                label: '毛利区间',
                value: this.grossMarginBandLabel(review.grossMarginBand),
                severity: this.grossMarginBandSeverity(review.grossMarginBand)
            },
            {
                label: '签约承接',
                value: workspace.readyForContracting ? '可进入' : '暂不可进入',
                severity: workspace.readyForContracting ? 'success' : 'warn'
            },
            {
                label: '阻断数量',
                value: review.blockerCount,
                severity: review.blockerCount > 0 ? 'warn' : 'success'
            },
            {
                label: '当前版本',
                value: `V${review.version}`,
                detail: review.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '商业放行基线',
                value: review.commercialReleaseBaselineId ?? '待形成',
                detail: review.summarySnapshotId ? `摘要 ${review.summarySnapshotId}` : null
            },
            {
                label: '责任角色',
                value: review.ownerRole ?? '待确认'
            },
            {
                label: '生效时间',
                value: this.formatDateTime(review.effectiveAt)
            }
        ];
    }

    pricingFactItems(review: ProjectPricingMarginReviewSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '含税报价',
                value: this.moneyText(review.quoteAmountTaxInclusive, review.currencyCode),
                emphasis: true
            },
            {
                label: '不含税报价',
                value: this.moneyText(review.quoteAmountTaxExclusive, review.currencyCode),
                emphasis: true
            },
            {
                label: '税率',
                value: this.percentText(review.taxRate)
            },
            {
                label: '毛利率',
                value: this.percentText(review.grossMarginRate)
            },
            {
                label: '报价路径',
                value: this.pricingPathLabel(review.pricingPath),
                severity: review.pricingPath === ProjectPricingMarginReviewSummaryPricingPathEnum.Bid ? 'warn' : 'info'
            },
            {
                label: '税务条件',
                value: review.taxConditionSummary
            },
            {
                label: '回款条件',
                value: review.paymentTermsSummary
            },
            {
                label: '导出策略',
                value: review.exportPolicy ?? '待确认',
                detail: review.projectionLevel
            }
        ];
    }

    technicalCostFactItems(currentPackage: ProjectTechnicalCostPackageSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '成本版本',
                value: `V${currentPackage.version}`,
                detail: currentPackage.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '技术可行性',
                value: this.technicalDecisionLabel(currentPackage.technicalFeasibilityDecision),
                severity: this.technicalDecisionSeverity(currentPackage.technicalFeasibilityDecision)
            },
            {
                label: '含税估算',
                value: this.moneyText(currentPackage.totalEstimatedAmountIncludingTax, currentPackage.currencyCode),
                emphasis: true
            },
            {
                label: '税务复核',
                value: currentPackage.taxReviewStatus
            }
        ];
    }

    bidFactItems(process: ProjectBidCommercialProcessSummary): WorkspaceFactGridItem[] {
        return [
            {
                label: '竞标形态',
                value: BID_MODE_LABELS[process.bidMode] ?? process.bidMode
            },
            {
                label: '竞标结果',
                value: BID_RESULT_LABELS[process.resultStatus] ?? process.resultStatus,
                severity: this.bidResultSeverity(process.resultStatus)
            },
            {
                label: '竞标版本',
                value: `V${process.version}`,
                detail: process.isCurrent ? '当前有效版本' : '历史版本'
            },
            {
                label: '结果说明',
                value: process.resultSummary ?? process.decisionSummary ?? '待确认'
            }
        ];
    }

    conditionItems(workspace: ProjectPricingMarginWorkspaceView): ProjectPricingMarginConditionItemView[] {
        return [...workspace.conditionItems].sort((left, right) => left.sortOrder - right.sortOrder);
    }

    pricingHistoryRows(): WorkspaceVersionHistoryRow[] {
        return this.sortedPricingHistory().map((review) => ({
            id: review.id,
            versionLabel: `V${review.version}`,
            isCurrent: review.isCurrent,
            statusLabel: this.versionStatusLabel(review.status),
            statusSeverity: this.versionStatusSeverity(review.status),
            primaryLabel: '报价版本',
            primaryValue: review.quoteVersion,
            secondaryLabel: '毛利判断',
            secondaryValue: this.grossMarginBandLabel(review.grossMarginBand),
            secondarySeverity: this.grossMarginBandSeverity(review.grossMarginBand),
            outcomeLabel: '评审结论',
            outcomeValue: this.pricingDecisionLabel(review.decision),
            outcomeSeverity: this.pricingDecisionSeverity(review.decision),
            effectiveAt: this.formatDateTime(review.effectiveAt),
            createdAt: this.formatDateTime(review.createdAt),
            createdBy: this.operatorIdText(review.createdBy),
            updatedAt: this.formatDateTime(review.updatedAt),
            updatedBy: this.operatorIdText(review.updatedBy),
            supersedesLabel: this.supersedesText(review.supersedesId),
            rowVersionLabel: String(review.rowVersion)
        }));
    }

    pricingHistorySummaryItems(): WorkspaceFactGridItem[] {
        const records = this.sortedPricingHistory();
        const current = records.find((record) => record.isCurrent) ?? this.workspace()?.currentReview ?? null;
        const historicalCount = records.filter((record) => !record.isCurrent).length;

        return [
            {
                label: '当前版本',
                value: current ? `V${current.version}` : '待形成',
                detail: current?.quoteVersion ?? null,
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

    pricingPathLabel(value: PricingPathValue): string {
        return PRICING_PATH_LABELS[value] ?? value;
    }

    grossMarginBandLabel(value: GrossMarginBandValue): string {
        return GROSS_MARGIN_BAND_LABELS[value] ?? value;
    }

    grossMarginBandSeverity(value: GrossMarginBandValue): UiTagSeverity {
        if (value === CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Target || value === ProjectPricingMarginReviewSummaryGrossMarginBandEnum.Target) {
            return 'success';
        }
        if (value === CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Watch || value === ProjectPricingMarginReviewSummaryGrossMarginBandEnum.Watch) {
            return 'warn';
        }
        if (value === CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.BelowRedline || value === ProjectPricingMarginReviewSummaryGrossMarginBandEnum.BelowRedline) {
            return 'danger';
        }
        return 'secondary';
    }

    pricingDecisionLabel(value: PricingDecisionValue): string {
        return PRICING_DECISION_LABELS[value] ?? value;
    }

    pricingDecisionSeverity(value: PricingDecisionValue): UiTagSeverity {
        if (value === CreateProjectPricingMarginReviewRequestDecisionEnum.Released || value === ProjectPricingMarginReviewSummaryDecisionEnum.Released) {
            return 'success';
        }
        if (value === CreateProjectPricingMarginReviewRequestDecisionEnum.ConditionalRelease || value === ProjectPricingMarginReviewSummaryDecisionEnum.ConditionalRelease) {
            return 'warn';
        }
        if (value === CreateProjectPricingMarginReviewRequestDecisionEnum.Rejected || value === ProjectPricingMarginReviewSummaryDecisionEnum.Rejected || value === CreateProjectPricingMarginReviewRequestDecisionEnum.EscalationRequired || value === ProjectPricingMarginReviewSummaryDecisionEnum.EscalationRequired) {
            return 'danger';
        }
        return 'secondary';
    }

    versionStatusLabel(value: ProjectPricingMarginReviewSummary['status']): string {
        if (value === ProjectPricingMarginReviewSummaryStatusEnum.Effective) {
            return '生效中';
        }
        if (value === ProjectPricingMarginReviewSummaryStatusEnum.Superseded) {
            return '已被替代';
        }
        return value;
    }

    versionStatusSeverity(value: ProjectPricingMarginReviewSummary['status']): UiTagSeverity {
        if (value === ProjectPricingMarginReviewSummaryStatusEnum.Effective) {
            return 'success';
        }
        if (value === ProjectPricingMarginReviewSummaryStatusEnum.Superseded) {
            return 'secondary';
        }
        return 'info';
    }

    conditionTypeLabel(value: PricingConditionTypeValue): string {
        return CONDITION_TYPE_LABELS[value] ?? value;
    }

    conditionStatusLabel(value: PricingConditionStatusValue): string {
        return CONDITION_STATUS_LABELS[value] ?? value;
    }

    conditionStatusSeverity(item: ProjectPricingMarginConditionItemView): UiTagSeverity {
        if (item.conditionStatus === ProjectPricingMarginConditionItemViewConditionStatusEnum.Closed || item.conditionStatus === ProjectPricingMarginConditionItemViewConditionStatusEnum.Waived) {
            return 'success';
        }
        if (item.requiredForContracting) {
            return 'danger';
        }
        return 'warn';
    }

    technicalDecisionLabel(value: ProjectTechnicalCostPackageSummary['technicalFeasibilityDecision']): string {
        return TECHNICAL_DECISION_LABELS[value] ?? value;
    }

    technicalDecisionSeverity(value: ProjectTechnicalCostPackageSummary['technicalFeasibilityDecision']): UiTagSeverity {
        if (value === ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.Feasible) {
            return 'success';
        }
        if (value === ProjectTechnicalCostPackageSummaryTechnicalFeasibilityDecisionEnum.Conditional) {
            return 'warn';
        }
        return 'danger';
    }

    bidResultSeverity(value: ProjectBidCommercialProcessSummary['resultStatus']): UiTagSeverity {
        if (value === ProjectBidCommercialProcessSummaryResultStatusEnum.Won || value === ProjectBidCommercialProcessSummaryResultStatusEnum.NotApplicable) {
            return 'success';
        }
        if (value === ProjectBidCommercialProcessSummaryResultStatusEnum.Lost || value === ProjectBidCommercialProcessSummaryResultStatusEnum.Cancelled) {
            return 'danger';
        }
        return 'secondary';
    }

    moneyText(value: string | null | undefined, currencyCode: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        return `${formatAmount(value)} ${currencyCode ?? ''}`.trim();
    }

    percentText(value: string | null | undefined): string {
        if (!value) {
            return '待确认';
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return value;
        }

        return `${(parsed * 100).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
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

    operatorIdText(value: string | null | undefined): string {
        return value?.trim() ? value : '系统 / 未记录';
    }

    supersedesText(value: string | null | undefined): string {
        return value ? `替代 ${this.shortId(value)}` : '无上一版本';
    }

    shortId(value: string): string {
        return value.length > 12 ? `${value.slice(0, 8)}...` : value;
    }

    sortedPricingHistory(): ProjectPricingMarginReviewSummary[] {
        return [...this.history()].sort((left, right) => right.version - left.version);
    }

    createEmptyPricingForm(workspace: ProjectPricingMarginWorkspaceView | null): PricingMarginForm {
        const technicalCostPackage = workspace?.technicalCostPackage ?? null;
        const bidCommercialProcess = workspace?.bidCommercialProcess ?? null;

        return {
            technicalCostPackageId: technicalCostPackage?.id ?? '',
            bidCommercialProcessId: bidCommercialProcess?.id ?? '',
            commercialReleaseBaselineId: '',
            pricingPath: bidCommercialProcess ? CreateProjectPricingMarginReviewRequestPricingPathEnum.Bid : CreateProjectPricingMarginReviewRequestPricingPathEnum.DirectCommercial,
            quoteVersion: '',
            currencyCode: technicalCostPackage?.currencyCode ?? 'CNY',
            quoteAmountTaxInclusive: '',
            quoteAmountTaxExclusive: '',
            taxRate: '',
            taxConditionSummary: technicalCostPackage?.taxAssumptionSummary ?? '',
            paymentTermsSummary: '',
            grossMarginRate: '',
            grossMarginBand: CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.NotCalculated,
            grossMarginSummary: '',
            decision: CreateProjectPricingMarginReviewRequestDecisionEnum.Pending,
            decisionSummary: '',
            approvalScenarioKey: 'pricing-margin-review',
            summaryPackageKey: 'pricing-margin-summary',
            summarySnapshotId: '',
            projectionLevel: 'pricing-margin',
            exportPolicy: 'internal',
            ownerRole: workspace?.ownerLabel ?? '',
            conditionItems: []
        };
    }

    createPricingFormFromWorkspace(workspace: ProjectPricingMarginWorkspaceView): PricingMarginForm {
        const currentReview = workspace.currentReview;
        if (!currentReview) {
            return this.createEmptyPricingForm(workspace);
        }

        return {
            technicalCostPackageId: currentReview.technicalCostPackageId,
            bidCommercialProcessId: currentReview.bidCommercialProcessId ?? '',
            commercialReleaseBaselineId: currentReview.commercialReleaseBaselineId ?? '',
            pricingPath: this.toPricingPath(currentReview.pricingPath),
            quoteVersion: currentReview.quoteVersion,
            currencyCode: currentReview.currencyCode,
            quoteAmountTaxInclusive: currentReview.quoteAmountTaxInclusive,
            quoteAmountTaxExclusive: currentReview.quoteAmountTaxExclusive,
            taxRate: currentReview.taxRate,
            taxConditionSummary: currentReview.taxConditionSummary,
            paymentTermsSummary: currentReview.paymentTermsSummary,
            grossMarginRate: currentReview.grossMarginRate ?? '',
            grossMarginBand: this.toGrossMarginBand(currentReview.grossMarginBand),
            grossMarginSummary: currentReview.grossMarginSummary,
            decision: this.toPricingDecision(currentReview.decision),
            decisionSummary: currentReview.decisionSummary,
            approvalScenarioKey: currentReview.approvalScenarioKey ?? 'pricing-margin-review',
            summaryPackageKey: currentReview.summaryPackageKey ?? 'pricing-margin-summary',
            summarySnapshotId: currentReview.summarySnapshotId ?? '',
            projectionLevel: currentReview.projectionLevel ?? 'pricing-margin',
            exportPolicy: currentReview.exportPolicy ?? 'internal',
            ownerRole: currentReview.ownerRole ?? workspace.ownerLabel,
            conditionItems: this.conditionItems(workspace).map((item, index) => ({
                conditionKey: item.conditionKey,
                conditionType: this.toConditionType(item.conditionType),
                label: item.label,
                conditionSummary: item.conditionSummary,
                conditionStatus: this.toConditionStatus(item.conditionStatus),
                requiredForContracting: item.requiredForContracting,
                responsibleRole: item.responsibleRole ?? '',
                dueAt: item.dueAt ?? '',
                resolutionSummary: item.resolutionSummary ?? '',
                sortOrder: item.sortOrder ?? index + 1
            }))
        };
    }

    createEmptyConditionItem(sortOrder: number): PricingMarginConditionForm {
        return {
            conditionKey: '',
            conditionType: ProjectPricingMarginConditionItemInputConditionTypeEnum.Payment,
            label: '',
            conditionSummary: '',
            conditionStatus: ProjectPricingMarginConditionItemInputConditionStatusEnum.Open,
            requiredForContracting: true,
            responsibleRole: '',
            dueAt: '',
            resolutionSummary: '',
            sortOrder
        };
    }

    isPricingFormValid(): boolean {
        return (
            this.pricingForm.technicalCostPackageId.trim().length > 0 &&
            this.pricingForm.quoteVersion.trim().length > 0 &&
            this.pricingForm.currencyCode.trim().length > 0 &&
            this.pricingForm.quoteAmountTaxInclusive.trim().length > 0 &&
            this.pricingForm.quoteAmountTaxExclusive.trim().length > 0 &&
            this.pricingForm.taxRate.trim().length > 0 &&
            this.pricingForm.taxConditionSummary.trim().length > 0 &&
            this.pricingForm.paymentTermsSummary.trim().length > 0 &&
            this.pricingForm.grossMarginSummary.trim().length > 0 &&
            this.pricingForm.decisionSummary.trim().length > 0
        );
    }

    buildPricingRequest(): CreateProjectPricingMarginReviewRequest | null {
        if (!this.isPricingFormValid()) {
            return null;
        }

        return {
            technicalCostPackageId: this.pricingForm.technicalCostPackageId.trim(),
            bidCommercialProcessId: this.blankToNull(this.pricingForm.bidCommercialProcessId),
            commercialReleaseBaselineId: this.blankToNull(this.pricingForm.commercialReleaseBaselineId),
            pricingPath: this.pricingForm.pricingPath,
            quoteVersion: this.pricingForm.quoteVersion.trim(),
            currencyCode: this.pricingForm.currencyCode.trim(),
            quoteAmountTaxInclusive: this.pricingForm.quoteAmountTaxInclusive.trim(),
            quoteAmountTaxExclusive: this.pricingForm.quoteAmountTaxExclusive.trim(),
            taxRate: this.pricingForm.taxRate.trim(),
            taxConditionSummary: this.pricingForm.taxConditionSummary.trim(),
            paymentTermsSummary: this.pricingForm.paymentTermsSummary.trim(),
            grossMarginRate: this.blankToNull(this.pricingForm.grossMarginRate),
            grossMarginBand: this.pricingForm.grossMarginBand,
            grossMarginSummary: this.pricingForm.grossMarginSummary.trim(),
            decision: this.pricingForm.decision,
            decisionSummary: this.pricingForm.decisionSummary.trim(),
            approvalScenarioKey: this.blankToNull(this.pricingForm.approvalScenarioKey),
            summaryPackageKey: this.blankToNull(this.pricingForm.summaryPackageKey),
            summarySnapshotId: this.blankToNull(this.pricingForm.summarySnapshotId),
            projectionLevel: this.blankToNull(this.pricingForm.projectionLevel),
            exportPolicy: this.blankToNull(this.pricingForm.exportPolicy),
            ownerRole: this.blankToNull(this.pricingForm.ownerRole),
            conditionItems: this.pricingForm.conditionItems.map(
                (item, index): ProjectPricingMarginConditionItemInput => ({
                    conditionKey: item.conditionKey.trim() || `condition-${index + 1}`,
                    conditionType: item.conditionType,
                    label: item.label.trim() || `条件项 ${index + 1}`,
                    conditionSummary: item.conditionSummary.trim() || `条件项 ${index + 1}`,
                    conditionStatus: item.conditionStatus,
                    requiredForContracting: item.requiredForContracting,
                    responsibleRole: this.blankToNull(item.responsibleRole),
                    dueAt: this.blankToNull(item.dueAt),
                    resolutionSummary: this.blankToNull(item.resolutionSummary),
                    sortOrder: index + 1
                })
            )
        };
    }

    blankToNull(value: string): string | null {
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }

    toPricingPath(value: string): CreateProjectPricingMarginReviewRequestPricingPathEnum {
        switch (value) {
            case CreateProjectPricingMarginReviewRequestPricingPathEnum.Bid:
                return CreateProjectPricingMarginReviewRequestPricingPathEnum.Bid;
            case CreateProjectPricingMarginReviewRequestPricingPathEnum.DirectCommercial:
                return CreateProjectPricingMarginReviewRequestPricingPathEnum.DirectCommercial;
            default:
                return CreateProjectPricingMarginReviewRequestPricingPathEnum.DirectCommercial;
        }
    }

    toGrossMarginBand(value: string): CreateProjectPricingMarginReviewRequestGrossMarginBandEnum {
        switch (value) {
            case CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.BelowRedline:
                return CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.BelowRedline;
            case CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Watch:
                return CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Watch;
            case CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Target:
                return CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.Target;
            case CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.NotCalculated:
                return CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.NotCalculated;
            default:
                return CreateProjectPricingMarginReviewRequestGrossMarginBandEnum.NotCalculated;
        }
    }

    toPricingDecision(value: string): CreateProjectPricingMarginReviewRequestDecisionEnum {
        switch (value) {
            case CreateProjectPricingMarginReviewRequestDecisionEnum.Pending:
                return CreateProjectPricingMarginReviewRequestDecisionEnum.Pending;
            case CreateProjectPricingMarginReviewRequestDecisionEnum.Released:
                return CreateProjectPricingMarginReviewRequestDecisionEnum.Released;
            case CreateProjectPricingMarginReviewRequestDecisionEnum.ConditionalRelease:
                return CreateProjectPricingMarginReviewRequestDecisionEnum.ConditionalRelease;
            case CreateProjectPricingMarginReviewRequestDecisionEnum.Rejected:
                return CreateProjectPricingMarginReviewRequestDecisionEnum.Rejected;
            case CreateProjectPricingMarginReviewRequestDecisionEnum.EscalationRequired:
                return CreateProjectPricingMarginReviewRequestDecisionEnum.EscalationRequired;
            default:
                return CreateProjectPricingMarginReviewRequestDecisionEnum.Pending;
        }
    }

    toConditionType(value: string): ProjectPricingMarginConditionItemInputConditionTypeEnum {
        switch (value) {
            case ProjectPricingMarginConditionItemInputConditionTypeEnum.Financial:
                return ProjectPricingMarginConditionItemInputConditionTypeEnum.Financial;
            case ProjectPricingMarginConditionItemInputConditionTypeEnum.Tax:
                return ProjectPricingMarginConditionItemInputConditionTypeEnum.Tax;
            case ProjectPricingMarginConditionItemInputConditionTypeEnum.Payment:
                return ProjectPricingMarginConditionItemInputConditionTypeEnum.Payment;
            case ProjectPricingMarginConditionItemInputConditionTypeEnum.Scope:
                return ProjectPricingMarginConditionItemInputConditionTypeEnum.Scope;
            case ProjectPricingMarginConditionItemInputConditionTypeEnum.Risk:
                return ProjectPricingMarginConditionItemInputConditionTypeEnum.Risk;
            case ProjectPricingMarginConditionItemInputConditionTypeEnum.Approval:
                return ProjectPricingMarginConditionItemInputConditionTypeEnum.Approval;
            default:
                return ProjectPricingMarginConditionItemInputConditionTypeEnum.Risk;
        }
    }

    toConditionStatus(value: string): ProjectPricingMarginConditionItemInputConditionStatusEnum {
        switch (value) {
            case ProjectPricingMarginConditionItemInputConditionStatusEnum.Open:
                return ProjectPricingMarginConditionItemInputConditionStatusEnum.Open;
            case ProjectPricingMarginConditionItemInputConditionStatusEnum.Closed:
                return ProjectPricingMarginConditionItemInputConditionStatusEnum.Closed;
            case ProjectPricingMarginConditionItemInputConditionStatusEnum.Waived:
                return ProjectPricingMarginConditionItemInputConditionStatusEnum.Waived;
            default:
                return ProjectPricingMarginConditionItemInputConditionStatusEnum.Open;
        }
    }
}
