import { CommonModule } from '@angular/common';
import { Component, Input, inject, type OnChanges, type SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CompetitorPosition,
  CustomerContactGender,
  CustomerContactStatus,
  type CustomerContactSummary,
  CustomerPreference,
  OpportunityStakeholderAccessLevel,
  OpportunityStakeholderAttitude,
  OpportunityStakeholderInfluenceLevel,
  OpportunityStakeholderRole,
  type SalesIntelligenceGapSeverity,
  SalesIntelligenceStore,
  WinProbabilityLevel,
} from '@poms/admin-data-access';
import {
  CompetitorPositionLabel,
  CompetitorPositionOptions,
  CustomerContactGenderLabel,
  CustomerContactGenderOptions,
  CustomerContactStatusLabel,
  CustomerContactStatusSeverity,
  CustomerPreferenceLabel,
  CustomerPreferenceOptions,
  CustomerPreferenceSeverity,
  OpportunityStakeholderAccessLevelLabel,
  OpportunityStakeholderAccessLevelOptions,
  OpportunityStakeholderAccessLevelSeverity,
  OpportunityStakeholderAttitudeLabel,
  OpportunityStakeholderAttitudeOptions,
  OpportunityStakeholderAttitudeSeverity,
  OpportunityStakeholderInfluenceLevelLabel,
  OpportunityStakeholderInfluenceLevelOptions,
  OpportunityStakeholderInfluenceLevelSeverity,
  OpportunityStakeholderRoleLabel,
  OpportunityStakeholderRoleOptions,
  SalesIntelligenceGapSeverityLabel,
  SalesIntelligenceGapSeveritySeverity,
  WinProbabilityLevelLabel,
  WinProbabilityLevelOptions,
  WinProbabilityLevelSeverity,
} from '@poms/shared-contracts';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SectionCard } from './sectioncard';
import { WorkspaceFeedback } from './workspace-feedback';

interface SalesIntelligenceOption<T extends string> {
  label: string;
  value: T;
}

interface ContactForm {
  name: string;
  gender: CustomerContactGender;
  department: string;
  title: string;
  workPhone: string;
  mobile: string;
  wechat: string;
  email: string;
  remark: string;
}

type ContactTextField = Exclude<keyof ContactForm, 'gender'>;

interface StakeholderForm {
  contactId: string | null;
  role: OpportunityStakeholderRole;
  attitude: OpportunityStakeholderAttitude;
  influenceLevel: OpportunityStakeholderInfluenceLevel;
  accessLevel: OpportunityStakeholderAccessLevel;
  focusAreas: string;
  communicationNotes: string;
  isPrimary: boolean;
}

interface CompetitorForm {
  competitorName: string;
  position: CompetitorPosition;
  customerPreference: CustomerPreference;
  competitorStrengths: string;
  competitorWeaknesses: string;
  ourAdvantages: string;
  ourRisks: string;
  winProbability: WinProbabilityLevel;
  evidence: string;
}

interface DiscoveryForm {
  procurementProcess: string;
  budgetSource: string;
  customerPainPoints: string;
  decisionCycle: string;
  nextContactPlan: string;
  remark: string;
}

const CONTACT_STATUS_LABELS = CustomerContactStatusLabel as Record<CustomerContactStatus, string>;
const CONTACT_STATUS_SEVERITY = CustomerContactStatusSeverity as Record<
  CustomerContactStatus,
  'success' | 'secondary' | 'warn' | 'danger' | 'info' | 'contrast'
>;
const CONTACT_GENDER_LABELS = CustomerContactGenderLabel as Record<CustomerContactGender, string>;
const STAKEHOLDER_ROLE_LABELS = OpportunityStakeholderRoleLabel as Record<OpportunityStakeholderRole, string>;
const STAKEHOLDER_ATTITUDE_LABELS = OpportunityStakeholderAttitudeLabel as Record<
  OpportunityStakeholderAttitude,
  string
>;
const STAKEHOLDER_ATTITUDE_SEVERITY = OpportunityStakeholderAttitudeSeverity as Record<
  OpportunityStakeholderAttitude,
  'success' | 'secondary' | 'warn' | 'danger' | 'info' | 'contrast'
>;
const STAKEHOLDER_INFLUENCE_LABELS = OpportunityStakeholderInfluenceLevelLabel as Record<
  OpportunityStakeholderInfluenceLevel,
  string
>;
const STAKEHOLDER_INFLUENCE_SEVERITY = OpportunityStakeholderInfluenceLevelSeverity as Record<
  OpportunityStakeholderInfluenceLevel,
  'success' | 'secondary' | 'warn' | 'danger' | 'info' | 'contrast'
>;
const STAKEHOLDER_ACCESS_LABELS = OpportunityStakeholderAccessLevelLabel as Record<
  OpportunityStakeholderAccessLevel,
  string
>;
const STAKEHOLDER_ACCESS_SEVERITY = OpportunityStakeholderAccessLevelSeverity as Record<
  OpportunityStakeholderAccessLevel,
  'success' | 'secondary' | 'warn' | 'danger' | 'info' | 'contrast'
>;
const COMPETITOR_POSITION_LABELS = CompetitorPositionLabel as Record<CompetitorPosition, string>;
const CUSTOMER_PREFERENCE_LABELS = CustomerPreferenceLabel as Record<CustomerPreference, string>;
const CUSTOMER_PREFERENCE_SEVERITY = CustomerPreferenceSeverity as Record<
  CustomerPreference,
  'success' | 'secondary' | 'warn' | 'danger' | 'info' | 'contrast'
>;
const WIN_PROBABILITY_LABELS = WinProbabilityLevelLabel as Record<WinProbabilityLevel, string>;
const WIN_PROBABILITY_SEVERITY = WinProbabilityLevelSeverity as Record<
  WinProbabilityLevel,
  'success' | 'secondary' | 'warn' | 'danger' | 'info' | 'contrast'
>;
const GAP_SEVERITY_LABELS = SalesIntelligenceGapSeverityLabel as Record<SalesIntelligenceGapSeverity, string>;
const GAP_SEVERITY = SalesIntelligenceGapSeveritySeverity as Record<
  SalesIntelligenceGapSeverity,
  'success' | 'secondary' | 'warn' | 'danger' | 'info' | 'contrast'
>;

const STAKEHOLDER_ROLE_OPTIONS = [
  ...(OpportunityStakeholderRoleOptions as ReadonlyArray<SalesIntelligenceOption<OpportunityStakeholderRole>>),
];
const CONTACT_GENDER_OPTIONS = [
  ...(CustomerContactGenderOptions as ReadonlyArray<SalesIntelligenceOption<CustomerContactGender>>),
];
const STAKEHOLDER_ATTITUDE_OPTIONS = [
  ...(OpportunityStakeholderAttitudeOptions as ReadonlyArray<SalesIntelligenceOption<OpportunityStakeholderAttitude>>),
];
const STAKEHOLDER_INFLUENCE_OPTIONS = [
  ...(OpportunityStakeholderInfluenceLevelOptions as ReadonlyArray<
    SalesIntelligenceOption<OpportunityStakeholderInfluenceLevel>
  >),
];
const STAKEHOLDER_ACCESS_OPTIONS = [
  ...(OpportunityStakeholderAccessLevelOptions as ReadonlyArray<
    SalesIntelligenceOption<OpportunityStakeholderAccessLevel>
  >),
];
const COMPETITOR_POSITION_OPTIONS = [
  ...(CompetitorPositionOptions as ReadonlyArray<SalesIntelligenceOption<CompetitorPosition>>),
];
const CUSTOMER_PREFERENCE_OPTIONS = [
  ...(CustomerPreferenceOptions as ReadonlyArray<SalesIntelligenceOption<CustomerPreference>>),
];
const WIN_PROBABILITY_OPTIONS = [
  ...(WinProbabilityLevelOptions as ReadonlyArray<SalesIntelligenceOption<WinProbabilityLevel>>),
];

const EMPTY_CONTACT_FORM: ContactForm = {
  name: '',
  gender: CustomerContactGender.Unknown,
  department: '',
  title: '',
  workPhone: '',
  mobile: '',
  wechat: '',
  email: '',
  remark: '',
};

const EMPTY_STAKEHOLDER_FORM: StakeholderForm = {
  contactId: null,
  role: OpportunityStakeholderRole.Unknown,
  attitude: OpportunityStakeholderAttitude.Unknown,
  influenceLevel: OpportunityStakeholderInfluenceLevel.Unknown,
  accessLevel: OpportunityStakeholderAccessLevel.Unknown,
  focusAreas: '',
  communicationNotes: '',
  isPrimary: false,
};

const EMPTY_COMPETITOR_FORM: CompetitorForm = {
  competitorName: '',
  position: CompetitorPosition.Unknown,
  customerPreference: CustomerPreference.Unknown,
  competitorStrengths: '',
  competitorWeaknesses: '',
  ourAdvantages: '',
  ourRisks: '',
  winProbability: WinProbabilityLevel.Unknown,
  evidence: '',
};

const EMPTY_DISCOVERY_FORM: DiscoveryForm = {
  procurementProcess: '',
  budgetSource: '',
  customerPainPoints: '',
  decisionCycle: '',
  nextContactPlan: '',
  remark: '',
};

@Component({
  selector: 'app-sales-intelligence-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    SectionCard,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    WorkspaceFeedback,
  ],
  providers: [SalesIntelligenceStore],
  template: `
        <section-card>
            <ng-template #title>{{ heading }}</ng-template>
            <ng-template #description>{{ descriptionText }}</ng-template>
            <ng-template #action>
                <div class="flex max-w-full flex-wrap items-center gap-2">
                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" [disabled]="!canReadContext()" (onClick)="reload()" />
                    @if (canWrite) {
                        <p-button icon="pi pi-user-plus" label="联系人" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="!customerId" (onClick)="showContactDialog()" />
                        @if (hasOpportunityContext()) {
                            <p-button icon="pi pi-sitemap" label="关系人" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="!canCreateOpportunityFacts()" (onClick)="showStakeholderDialog()" />
                            <p-button icon="pi pi-shield" label="竞争态势" severity="secondary" [outlined]="true" styleClass="rounded-md!" [disabled]="!canCreateOpportunityFacts()" (onClick)="showCompetitorDialog()" />
                            <p-button icon="pi pi-compass" label="销售发现" severity="primary" [outlined]="true" styleClass="rounded-md!" [disabled]="!canCreateOpportunityFacts()" (onClick)="showDiscoveryDialog()" />
                        }
                    }
                </div>
            </ng-template>

            <div class="mt-4 flex flex-col gap-4">
                @if (!canReadContext()) {
                    <app-workspace-feedback severity="warn" summary="暂时不能读取销售情报" detail="当前业务对象缺少客户、线索或项目标识，无法形成查询上下文。" />
                } @else if (error()) {
                    <app-workspace-feedback severity="error" summary="销售情报暂时无法处理" [detail]="error()" />
                } @else if (store.loading()) {
                    <app-workspace-feedback severity="info" summary="正在读取销售情报" detail="请稍候。" />
                } @else {
                    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                            <div class="flex items-center justify-between gap-3">
                                <h4 class="text-sm font-semibold text-surface-950 dark:text-surface-0">客户联系人</h4>
                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ store.contacts().length }} 人</span>
                            </div>
                            <div class="mt-3 flex flex-col gap-3">
                                @for (contact of store.contacts(); track contact.id) {
                                    <article class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div class="min-w-0">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <span class="font-medium text-surface-950 dark:text-surface-0">{{ contact.name }}</span>
                                                    <p-tag [value]="contactGenderLabel(contact.gender)" severity="secondary" class="rounded-[6px]" />
                                                    <p-tag [value]="contactStatusLabel(contact.status)" [severity]="contactStatusSeverity(contact.status)" class="rounded-[6px]" />
                                                </div>
                                                <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ displayText(contact.department, '未填部门') }} · {{ displayText(contact.title, '未填职务') }}</div>
                                            </div>
                                        </div>
                                        <div class="mt-2 grid grid-cols-1 gap-1 text-xs text-surface-600 dark:text-surface-300 sm:grid-cols-2">
                                            <span>电话：{{ displayText(contact.workPhone || contact.mobile, '未填写') }}</span>
                                            <span>微信：{{ displayText(contact.wechat, '未填写') }}</span>
                                            <span class="sm:col-span-2">邮箱：{{ displayText(contact.email, '未填写') }}</span>
                                        </div>
                                        @if (contact.remark) {
                                            <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ contact.remark }}</p>
                                        }
                                    </article>
                                } @empty {
                                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无客户联系人。</div>
                                }
                            </div>
                        </div>

                        @if (hasOpportunityContext()) {
                            <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                                <div class="flex items-center justify-between gap-3">
                                    <h4 class="text-sm font-semibold text-surface-950 dark:text-surface-0">情报缺口</h4>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ missingGapCount() }} 项待补</span>
                                </div>
                                <div class="mt-3 flex flex-col gap-2">
                                    @for (gap of store.gaps(); track gap.item) {
                                        <div class="flex flex-col gap-2 rounded-[8px] border px-3 py-2" [ngClass]="gap.isMissing ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30' : 'border-surface-200 dark:border-surface-700'">
                                            <div class="flex flex-wrap items-center justify-between gap-2">
                                                <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ gap.label }}</span>
                                                <div class="flex flex-wrap gap-2">
                                                    <p-tag [value]="gap.isMissing ? '待补齐' : '已覆盖'" [severity]="gap.isMissing ? 'warn' : 'success'" class="rounded-[6px]" />
                                                    <p-tag [value]="gapSeverityLabel(gap.severity)" [severity]="gapSeverity(gap.severity)" class="rounded-[6px]" />
                                                </div>
                                            </div>
                                            <div class="text-xs leading-5 text-surface-600 dark:text-surface-300">{{ gap.explanation }}</div>
                                        </div>
                                    } @empty {
                                        <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无情报缺口结果。</div>
                                    }
                                </div>
                            </div>
                        }
                    </div>

                    @if (hasOpportunityContext()) {
                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
                            <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                                <div class="flex items-center justify-between gap-3">
                                    <h4 class="text-sm font-semibold text-surface-950 dark:text-surface-0">决策链关系人</h4>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ store.stakeholders().length }} 人</span>
                                </div>
                                <div class="mt-3 flex flex-col gap-3">
                                    @for (stakeholder of store.stakeholders(); track stakeholder.id) {
                                        <article class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="font-medium text-surface-950 dark:text-surface-0">{{ stakeholder.contactName }}</span>
                                                @if (stakeholder.isPrimary) {
                                                    <p-tag value="关键" severity="contrast" class="rounded-[6px]" />
                                                }
                                            </div>
                                            <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{{ displayText(stakeholder.contactDepartment, '未填部门') }} · {{ displayText(stakeholder.contactTitle, '未填职务') }}</div>
                                            <div class="mt-2 flex flex-wrap gap-2">
                                                <p-tag [value]="stakeholderRoleLabel(stakeholder.role)" severity="secondary" class="rounded-[6px]" />
                                                <p-tag [value]="stakeholderAttitudeLabel(stakeholder.attitude)" [severity]="stakeholderAttitudeSeverity(stakeholder.attitude)" class="rounded-[6px]" />
                                                <p-tag [value]="stakeholderInfluenceLabel(stakeholder.influenceLevel)" [severity]="stakeholderInfluenceSeverity(stakeholder.influenceLevel)" class="rounded-[6px]" />
                                                <p-tag [value]="stakeholderAccessLabel(stakeholder.accessLevel)" [severity]="stakeholderAccessSeverity(stakeholder.accessLevel)" class="rounded-[6px]" />
                                            </div>
                                            @if (stakeholder.focusAreas.length) {
                                                <div class="mt-2 flex flex-wrap gap-1">
                                                    @for (area of stakeholder.focusAreas; track area) {
                                                        <span class="rounded-[6px] bg-surface-100 px-2 py-1 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-300">{{ area }}</span>
                                                    }
                                                </div>
                                            }
                                            @if (stakeholder.communicationNotes) {
                                                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ stakeholder.communicationNotes }}</p>
                                            }
                                        </article>
                                    } @empty {
                                        <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无机会关系人。</div>
                                    }
                                </div>
                            </div>

                            <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                                <div class="flex items-center justify-between gap-3">
                                    <h4 class="text-sm font-semibold text-surface-950 dark:text-surface-0">竞争态势</h4>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ store.competitors().length }} 条</span>
                                </div>
                                <div class="mt-3 flex flex-col gap-3">
                                    @for (record of store.competitors(); track record.id) {
                                        <article class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                            <div class="flex flex-wrap items-center justify-between gap-2">
                                                <span class="font-medium text-surface-950 dark:text-surface-0">{{ record.competitorName }}</span>
                                                <p-tag [value]="winProbabilityLabel(record.winProbability)" [severity]="winProbabilitySeverity(record.winProbability)" class="rounded-[6px]" />
                                            </div>
                                            <div class="mt-2 flex flex-wrap gap-2">
                                                <p-tag [value]="competitorPositionLabel(record.position)" severity="secondary" class="rounded-[6px]" />
                                                <p-tag [value]="customerPreferenceLabel(record.customerPreference)" [severity]="customerPreferenceSeverity(record.customerPreference)" class="rounded-[6px]" />
                                            </div>
                                            <dl class="mt-2 grid grid-cols-1 gap-2 text-xs text-surface-600 dark:text-surface-300">
                                                <div><dt class="font-medium text-surface-500 dark:text-surface-400">我方优势</dt><dd class="mt-1">{{ displayText(record.ourAdvantages, '待补充') }}</dd></div>
                                                <div><dt class="font-medium text-surface-500 dark:text-surface-400">我方风险</dt><dd class="mt-1">{{ displayText(record.ourRisks, '待补充') }}</dd></div>
                                            </dl>
                                            @if (record.evidence) {
                                                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ record.evidence }}</p>
                                            }
                                        </article>
                                    } @empty {
                                        <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无竞争态势记录。</div>
                                    }
                                </div>
                            </div>

                            <div class="rounded-[8px] border border-surface-200 p-4 dark:border-surface-700">
                                <div class="flex items-center justify-between gap-3">
                                    <h4 class="text-sm font-semibold text-surface-950 dark:text-surface-0">销售发现</h4>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ store.discoveryRecords().length }} 条</span>
                                </div>
                                <div class="mt-3 flex flex-col gap-3">
                                    @for (record of store.discoveryRecords(); track record.id) {
                                        <article class="rounded-[8px] border border-surface-200 px-3 py-2 dark:border-surface-700">
                                            <div class="grid grid-cols-1 gap-2 text-xs text-surface-600 dark:text-surface-300">
                                                <div><span class="font-medium text-surface-500 dark:text-surface-400">采购流程：</span>{{ displayText(record.procurementProcess, '待补充') }}</div>
                                                <div><span class="font-medium text-surface-500 dark:text-surface-400">预算来源：</span>{{ displayText(record.budgetSource, '待补充') }}</div>
                                                <div><span class="font-medium text-surface-500 dark:text-surface-400">客户痛点：</span>{{ displayText(record.customerPainPoints, '待补充') }}</div>
                                                <div><span class="font-medium text-surface-500 dark:text-surface-400">决策周期：</span>{{ displayText(record.decisionCycle, '待补充') }}</div>
                                                <div><span class="font-medium text-surface-500 dark:text-surface-400">下一步接触：</span>{{ displayText(record.nextContactPlan, '待补充') }}</div>
                                            </div>
                                            @if (record.remark) {
                                                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-600 dark:text-surface-300">{{ record.remark }}</p>
                                            }
                                        </article>
                                    } @empty {
                                        <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无销售发现记录。</div>
                                    }
                                </div>
                            </div>
                        </div>
                    }
                }
            </div>
        </section-card>

        <p-dialog [(visible)]="contactDialogVisible" [modal]="true" appendTo="body" header="新增客户联系人" [style]="{ width: 'min(36rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetContactDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (error()) {
                    <app-workspace-feedback severity="error" summary="联系人没有保存成功" [detail]="error()" />
                }
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceContactName" class="text-sm font-medium text-surface-900 dark:text-surface-0">姓名</label>
                        <input pInputText id="salesIntelligenceContactName" [ngModel]="contactForm().name" (ngModelChange)="updateContactField('name', $event)" class="w-full rounded-md!" />
                        @if (contactAttempted() && !contactForm().name.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写联系人姓名。</span>
                        }
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceContactGender" class="text-sm font-medium text-surface-900 dark:text-surface-0">性别</label>
                        <p-select inputId="salesIntelligenceContactGender" [ngModel]="contactForm().gender" (ngModelChange)="updateContactGender($event)" [options]="contactGenderOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceContactDepartment" class="text-sm font-medium text-surface-900 dark:text-surface-0">部门</label>
                        <input pInputText id="salesIntelligenceContactDepartment" [ngModel]="contactForm().department" (ngModelChange)="updateContactField('department', $event)" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceContactTitle" class="text-sm font-medium text-surface-900 dark:text-surface-0">职务</label>
                        <input pInputText id="salesIntelligenceContactTitle" [ngModel]="contactForm().title" (ngModelChange)="updateContactField('title', $event)" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceContactPhone" class="text-sm font-medium text-surface-900 dark:text-surface-0">工作电话</label>
                        <input pInputText id="salesIntelligenceContactPhone" [ngModel]="contactForm().workPhone" (ngModelChange)="updateContactField('workPhone', $event)" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceContactMobile" class="text-sm font-medium text-surface-900 dark:text-surface-0">手机</label>
                        <input pInputText id="salesIntelligenceContactMobile" [ngModel]="contactForm().mobile" (ngModelChange)="updateContactField('mobile', $event)" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceContactWechat" class="text-sm font-medium text-surface-900 dark:text-surface-0">微信</label>
                        <input pInputText id="salesIntelligenceContactWechat" [ngModel]="contactForm().wechat" (ngModelChange)="updateContactField('wechat', $event)" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesIntelligenceContactEmail" class="text-sm font-medium text-surface-900 dark:text-surface-0">邮箱</label>
                        <input pInputText id="salesIntelligenceContactEmail" [ngModel]="contactForm().email" (ngModelChange)="updateContactField('email', $event)" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesIntelligenceContactRemark" class="text-sm font-medium text-surface-900 dark:text-surface-0">备注</label>
                        <textarea pTextarea id="salesIntelligenceContactRemark" rows="3" [ngModel]="contactForm().remark" (ngModelChange)="updateContactField('remark', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                </div>
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="contactDialogVisible = false" />
                    <p-button label="保存联系人" [loading]="store.saving()" styleClass="rounded-md!" (onClick)="createContact()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="stakeholderDialogVisible" [modal]="true" appendTo="body" header="记录机会关系人" [style]="{ width: 'min(38rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetStakeholderDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (error()) {
                    <app-workspace-feedback severity="error" summary="关系人没有保存成功" [detail]="error()" />
                }
                @if (!contactOptions().length) {
                    <app-workspace-feedback severity="warn" summary="缺少可选联系人" detail="请先新增客户联系人，再把联系人纳入当前机会的决策链。" />
                }
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesIntelligenceStakeholderContact" class="text-sm font-medium text-surface-900 dark:text-surface-0">联系人</label>
                        <p-select inputId="salesIntelligenceStakeholderContact" [ngModel]="stakeholderForm().contactId" (ngModelChange)="updateStakeholderContact($event)" [options]="contactOptions()" optionLabel="label" optionValue="value" appendTo="body" placeholder="选择联系人" class="w-full rounded-md!" />
                        @if (stakeholderAttempted() && !stakeholderForm().contactId) {
                            <span class="text-xs text-red-600 dark:text-red-300">请选择联系人。</span>
                        }
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceStakeholderRole" class="text-sm font-medium text-surface-900 dark:text-surface-0">角色</label>
                        <p-select inputId="salesIntelligenceStakeholderRole" [ngModel]="stakeholderForm().role" (ngModelChange)="updateStakeholderEnum('role', $event)" [options]="stakeholderRoleOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceStakeholderAttitude" class="text-sm font-medium text-surface-900 dark:text-surface-0">态度</label>
                        <p-select inputId="salesIntelligenceStakeholderAttitude" [ngModel]="stakeholderForm().attitude" (ngModelChange)="updateStakeholderEnum('attitude', $event)" [options]="stakeholderAttitudeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceStakeholderInfluence" class="text-sm font-medium text-surface-900 dark:text-surface-0">影响力</label>
                        <p-select inputId="salesIntelligenceStakeholderInfluence" [ngModel]="stakeholderForm().influenceLevel" (ngModelChange)="updateStakeholderEnum('influenceLevel', $event)" [options]="stakeholderInfluenceOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceStakeholderAccess" class="text-sm font-medium text-surface-900 dark:text-surface-0">可接触程度</label>
                        <p-select inputId="salesIntelligenceStakeholderAccess" [ngModel]="stakeholderForm().accessLevel" (ngModelChange)="updateStakeholderEnum('accessLevel', $event)" [options]="stakeholderAccessOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <label class="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
                        <p-toggleswitch [ngModel]="stakeholderForm().isPrimary" (ngModelChange)="updateStakeholderPrimary($event)" />
                        <span>关键关系人</span>
                    </label>
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesIntelligenceStakeholderFocus" class="text-sm font-medium text-surface-900 dark:text-surface-0">关注点</label>
                        <input pInputText id="salesIntelligenceStakeholderFocus" [ngModel]="stakeholderForm().focusAreas" (ngModelChange)="updateStakeholderText('focusAreas', $event)" placeholder="用逗号分隔多个关注点" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesIntelligenceStakeholderNotes" class="text-sm font-medium text-surface-900 dark:text-surface-0">沟通备注</label>
                        <textarea pTextarea id="salesIntelligenceStakeholderNotes" rows="3" [ngModel]="stakeholderForm().communicationNotes" (ngModelChange)="updateStakeholderText('communicationNotes', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                </div>
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="stakeholderDialogVisible = false" />
                    <p-button label="保存关系人" [loading]="store.saving()" [disabled]="!contactOptions().length" styleClass="rounded-md!" (onClick)="createStakeholder()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="competitorDialogVisible" [modal]="true" appendTo="body" header="记录竞争态势" [style]="{ width: 'min(40rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetCompetitorDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (error()) {
                    <app-workspace-feedback severity="error" summary="竞争态势没有保存成功" [detail]="error()" />
                }
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesIntelligenceCompetitorName" class="text-sm font-medium text-surface-900 dark:text-surface-0">竞争对手</label>
                        <input pInputText id="salesIntelligenceCompetitorName" [ngModel]="competitorForm().competitorName" (ngModelChange)="updateCompetitorText('competitorName', $event)" class="w-full rounded-md!" />
                        @if (competitorAttempted() && !competitorForm().competitorName.trim()) {
                            <span class="text-xs text-red-600 dark:text-red-300">请填写竞争对手名称。</span>
                        }
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceCompetitorPosition" class="text-sm font-medium text-surface-900 dark:text-surface-0">竞争位置</label>
                        <p-select inputId="salesIntelligenceCompetitorPosition" [ngModel]="competitorForm().position" (ngModelChange)="updateCompetitorEnum('position', $event)" [options]="competitorPositionOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceCustomerPreference" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户倾向</label>
                        <p-select inputId="salesIntelligenceCustomerPreference" [ngModel]="competitorForm().customerPreference" (ngModelChange)="updateCompetitorEnum('customerPreference', $event)" [options]="customerPreferenceOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceWinProbability" class="text-sm font-medium text-surface-900 dark:text-surface-0">胜率判断</label>
                        <p-select inputId="salesIntelligenceWinProbability" [ngModel]="competitorForm().winProbability" (ngModelChange)="updateCompetitorEnum('winProbability', $event)" [options]="winProbabilityOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                    <div></div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceCompetitorStrengths" class="text-sm font-medium text-surface-900 dark:text-surface-0">对手优势</label>
                        <textarea pTextarea id="salesIntelligenceCompetitorStrengths" rows="3" [ngModel]="competitorForm().competitorStrengths" (ngModelChange)="updateCompetitorText('competitorStrengths', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceCompetitorWeaknesses" class="text-sm font-medium text-surface-900 dark:text-surface-0">对手短板</label>
                        <textarea pTextarea id="salesIntelligenceCompetitorWeaknesses" rows="3" [ngModel]="competitorForm().competitorWeaknesses" (ngModelChange)="updateCompetitorText('competitorWeaknesses', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceOurAdvantages" class="text-sm font-medium text-surface-900 dark:text-surface-0">我方优势</label>
                        <textarea pTextarea id="salesIntelligenceOurAdvantages" rows="3" [ngModel]="competitorForm().ourAdvantages" (ngModelChange)="updateCompetitorText('ourAdvantages', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesIntelligenceOurRisks" class="text-sm font-medium text-surface-900 dark:text-surface-0">我方风险</label>
                        <textarea pTextarea id="salesIntelligenceOurRisks" rows="3" [ngModel]="competitorForm().ourRisks" (ngModelChange)="updateCompetitorText('ourRisks', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesIntelligenceEvidence" class="text-sm font-medium text-surface-900 dark:text-surface-0">依据</label>
                        <textarea pTextarea id="salesIntelligenceEvidence" rows="3" [ngModel]="competitorForm().evidence" (ngModelChange)="updateCompetitorText('evidence', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                </div>
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="competitorDialogVisible = false" />
                    <p-button label="保存竞争态势" [loading]="store.saving()" styleClass="rounded-md!" (onClick)="createCompetitor()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="discoveryDialogVisible" [modal]="true" appendTo="body" header="补充销售发现" [style]="{ width: 'min(40rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetDiscoveryDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (error()) {
                    <app-workspace-feedback severity="error" summary="销售发现没有保存成功" [detail]="error()" />
                }
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="salesDiscoveryProcurementProcess" class="text-sm font-medium text-surface-900 dark:text-surface-0">采购流程</label>
                        <textarea pTextarea id="salesDiscoveryProcurementProcess" rows="3" [ngModel]="discoveryForm().procurementProcess" (ngModelChange)="updateDiscoveryField('procurementProcess', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesDiscoveryBudgetSource" class="text-sm font-medium text-surface-900 dark:text-surface-0">预算来源</label>
                        <textarea pTextarea id="salesDiscoveryBudgetSource" rows="3" [ngModel]="discoveryForm().budgetSource" (ngModelChange)="updateDiscoveryField('budgetSource', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesDiscoveryPainPoints" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户痛点</label>
                        <textarea pTextarea id="salesDiscoveryPainPoints" rows="3" [ngModel]="discoveryForm().customerPainPoints" (ngModelChange)="updateDiscoveryField('customerPainPoints', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="salesDiscoveryDecisionCycle" class="text-sm font-medium text-surface-900 dark:text-surface-0">决策周期</label>
                        <textarea pTextarea id="salesDiscoveryDecisionCycle" rows="3" [ngModel]="discoveryForm().decisionCycle" (ngModelChange)="updateDiscoveryField('decisionCycle', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesDiscoveryNextContact" class="text-sm font-medium text-surface-900 dark:text-surface-0">下一步接触计划</label>
                        <textarea pTextarea id="salesDiscoveryNextContact" rows="3" [ngModel]="discoveryForm().nextContactPlan" (ngModelChange)="updateDiscoveryField('nextContactPlan', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                    <div class="flex flex-col gap-2 sm:col-span-2">
                        <label for="salesDiscoveryRemark" class="text-sm font-medium text-surface-900 dark:text-surface-0">备注</label>
                        <textarea pTextarea id="salesDiscoveryRemark" rows="3" [ngModel]="discoveryForm().remark" (ngModelChange)="updateDiscoveryField('remark', $event)" class="w-full rounded-md!"></textarea>
                    </div>
                </div>
                @if (discoveryAttempted() && !isDiscoveryFormValid()) {
                    <span class="text-xs text-red-600 dark:text-red-300">请至少补充一项销售发现。</span>
                }
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="discoveryDialogVisible = false" />
                    <p-button label="保存销售发现" [loading]="store.saving()" styleClass="rounded-md!" (onClick)="createDiscovery()" />
                </div>
            </ng-template>
        </p-dialog>
    `,
})
export class SalesIntelligencePanel implements OnChanges {
  readonly store = inject(SalesIntelligenceStore);

  @Input() customerId: string | null = null;
  @Input() leadId: string | null = null;
  @Input() projectId: string | null = null;
  @Input() canWrite = false;
  @Input('title') heading = '销售情报';
  @Input('description') descriptionText = '集中查看客户联系人、决策链、竞争态势和销售发现。';

  readonly error = signal<string | null>(null);
  readonly contactForm = signal<ContactForm>({ ...EMPTY_CONTACT_FORM });
  readonly stakeholderForm = signal<StakeholderForm>({ ...EMPTY_STAKEHOLDER_FORM });
  readonly competitorForm = signal<CompetitorForm>({ ...EMPTY_COMPETITOR_FORM });
  readonly discoveryForm = signal<DiscoveryForm>({ ...EMPTY_DISCOVERY_FORM });
  readonly contactAttempted = signal(false);
  readonly stakeholderAttempted = signal(false);
  readonly competitorAttempted = signal(false);
  readonly discoveryAttempted = signal(false);

  contactDialogVisible = false;
  stakeholderDialogVisible = false;
  competitorDialogVisible = false;
  discoveryDialogVisible = false;

  readonly stakeholderRoleOptions = STAKEHOLDER_ROLE_OPTIONS;
  readonly contactGenderOptions = CONTACT_GENDER_OPTIONS;
  readonly stakeholderAttitudeOptions = STAKEHOLDER_ATTITUDE_OPTIONS;
  readonly stakeholderInfluenceOptions = STAKEHOLDER_INFLUENCE_OPTIONS;
  readonly stakeholderAccessOptions = STAKEHOLDER_ACCESS_OPTIONS;
  readonly competitorPositionOptions = COMPETITOR_POSITION_OPTIONS;
  readonly customerPreferenceOptions = CUSTOMER_PREFERENCE_OPTIONS;
  readonly winProbabilityOptions = WIN_PROBABILITY_OPTIONS;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] || changes['leadId'] || changes['projectId']) {
      void this.reload();
    }
  }

  async reload(): Promise<void> {
    if (!this.canReadContext()) {
      this.store.clearContext();
      return;
    }

    this.error.set(null);
    try {
      await this.store.loadContext(this.customerId, {
        leadId: this.leadId ?? undefined,
        projectId: this.projectId ?? undefined,
      });
    } catch {
      this.error.set('销售情报没有读取成功，请稍后重试。');
    }
  }

  showContactDialog(): void {
    if (!this.canWrite || !this.customerId) {
      return;
    }

    this.contactForm.set({ ...EMPTY_CONTACT_FORM });
    this.contactAttempted.set(false);
    this.error.set(null);
    this.contactDialogVisible = true;
  }

  showStakeholderDialog(): void {
    if (!this.canCreateOpportunityFacts()) {
      return;
    }

    this.stakeholderForm.set({
      ...EMPTY_STAKEHOLDER_FORM,
      contactId: this.firstActiveContact()?.id ?? null,
    });
    this.stakeholderAttempted.set(false);
    this.error.set(null);
    this.stakeholderDialogVisible = true;
  }

  showCompetitorDialog(): void {
    if (!this.canCreateOpportunityFacts()) {
      return;
    }

    this.competitorForm.set({ ...EMPTY_COMPETITOR_FORM });
    this.competitorAttempted.set(false);
    this.error.set(null);
    this.competitorDialogVisible = true;
  }

  showDiscoveryDialog(): void {
    if (!this.canCreateOpportunityFacts()) {
      return;
    }

    this.discoveryForm.set({ ...EMPTY_DISCOVERY_FORM });
    this.discoveryAttempted.set(false);
    this.error.set(null);
    this.discoveryDialogVisible = true;
  }

  resetContactDialog(): void {
    this.contactAttempted.set(false);
    this.error.set(null);
  }

  resetStakeholderDialog(): void {
    this.stakeholderAttempted.set(false);
    this.error.set(null);
  }

  resetCompetitorDialog(): void {
    this.competitorAttempted.set(false);
    this.error.set(null);
  }

  resetDiscoveryDialog(): void {
    this.discoveryAttempted.set(false);
    this.error.set(null);
  }

  updateContactField(field: ContactTextField, value: string): void {
    this.contactForm.update(form => ({ ...form, [field]: value }));
    this.error.set(null);
  }

  updateContactGender(value: CustomerContactGender | null | undefined): void {
    this.contactForm.update(form => ({ ...form, gender: value ?? CustomerContactGender.Unknown }));
    this.error.set(null);
  }

  updateStakeholderContact(value: string | null | undefined): void {
    this.stakeholderForm.update(form => ({ ...form, contactId: value ?? null }));
    this.error.set(null);
  }

  updateStakeholderEnum<T extends 'role' | 'attitude' | 'influenceLevel' | 'accessLevel'>(
    field: T,
    value: StakeholderForm[T] | null | undefined,
  ): void {
    const fallback = EMPTY_STAKEHOLDER_FORM[field];
    this.stakeholderForm.update(form => ({ ...form, [field]: value ?? fallback }));
    this.error.set(null);
  }

  updateStakeholderText(field: 'focusAreas' | 'communicationNotes', value: string): void {
    this.stakeholderForm.update(form => ({ ...form, [field]: value }));
    this.error.set(null);
  }

  updateStakeholderPrimary(value: boolean): void {
    this.stakeholderForm.update(form => ({ ...form, isPrimary: Boolean(value) }));
    this.error.set(null);
  }

  updateCompetitorEnum<T extends 'position' | 'customerPreference' | 'winProbability'>(
    field: T,
    value: CompetitorForm[T] | null | undefined,
  ): void {
    const fallback = EMPTY_COMPETITOR_FORM[field];
    this.competitorForm.update(form => ({ ...form, [field]: value ?? fallback }));
    this.error.set(null);
  }

  updateCompetitorText(field: keyof CompetitorForm, value: string): void {
    this.competitorForm.update(form => ({ ...form, [field]: value }));
    this.error.set(null);
  }

  updateDiscoveryField(field: keyof DiscoveryForm, value: string): void {
    this.discoveryForm.update(form => ({ ...form, [field]: value }));
    this.error.set(null);
  }

  async createContact(): Promise<void> {
    this.contactAttempted.set(true);
    const customerId = this.customerId;
    const form = this.contactForm();

    if (!this.canWrite || !customerId || !form.name.trim()) {
      return;
    }

    try {
      await this.store.createCustomerContact({
        customerId,
        name: form.name.trim(),
        gender: form.gender,
        department: this.optionalText(form.department),
        title: this.optionalText(form.title),
        workPhone: this.optionalText(form.workPhone),
        mobile: this.optionalText(form.mobile),
        wechat: this.optionalText(form.wechat),
        email: this.optionalText(form.email),
        remark: this.optionalText(form.remark),
      });
      this.contactDialogVisible = false;
    } catch {
      this.error.set('请确认联系人姓名完整，且客户仍然有效。');
    }
  }

  async createStakeholder(): Promise<void> {
    this.stakeholderAttempted.set(true);
    const customerId = this.customerId;
    const form = this.stakeholderForm();
    const anchors = this.writeOpportunityAnchors();

    if (!this.canCreateOpportunityFacts() || !customerId || !form.contactId || !anchors) {
      return;
    }

    try {
      await this.store.createOpportunityStakeholder({
        customerId,
        ...anchors,
        contactId: form.contactId,
        role: form.role,
        attitude: form.attitude,
        influenceLevel: form.influenceLevel,
        accessLevel: form.accessLevel,
        focusAreas: this.parseFocusAreas(form.focusAreas),
        communicationNotes: this.optionalText(form.communicationNotes),
        isPrimary: form.isPrimary,
      });
      this.stakeholderDialogVisible = false;
    } catch {
      this.error.set('请确认联系人和当前机会仍然有效。');
    }
  }

  async createCompetitor(): Promise<void> {
    this.competitorAttempted.set(true);
    const customerId = this.customerId;
    const form = this.competitorForm();
    const anchors = this.writeOpportunityAnchors();

    if (!this.canCreateOpportunityFacts() || !customerId || !form.competitorName.trim() || !anchors) {
      return;
    }

    try {
      await this.store.createCompetitorIntelligenceRecord({
        customerId,
        ...anchors,
        competitorName: form.competitorName.trim(),
        position: form.position,
        customerPreference: form.customerPreference,
        competitorStrengths: this.optionalText(form.competitorStrengths),
        competitorWeaknesses: this.optionalText(form.competitorWeaknesses),
        ourAdvantages: this.optionalText(form.ourAdvantages),
        ourRisks: this.optionalText(form.ourRisks),
        winProbability: form.winProbability,
        evidence: this.optionalText(form.evidence),
      });
      this.competitorDialogVisible = false;
    } catch {
      this.error.set('请确认当前机会仍然有效，且竞争态势信息完整。');
    }
  }

  async createDiscovery(): Promise<void> {
    this.discoveryAttempted.set(true);
    const customerId = this.customerId;
    const form = this.discoveryForm();
    const anchors = this.writeOpportunityAnchors();

    if (!this.canCreateOpportunityFacts() || !customerId || !anchors || !this.isDiscoveryFormValid()) {
      return;
    }

    try {
      await this.store.createSalesDiscoveryRecord({
        customerId,
        ...anchors,
        procurementProcess: this.optionalText(form.procurementProcess),
        budgetSource: this.optionalText(form.budgetSource),
        customerPainPoints: this.optionalText(form.customerPainPoints),
        decisionCycle: this.optionalText(form.decisionCycle),
        nextContactPlan: this.optionalText(form.nextContactPlan),
        remark: this.optionalText(form.remark),
      });
      this.discoveryDialogVisible = false;
    } catch {
      this.error.set('请确认当前机会仍然有效，或稍后重试。');
    }
  }

  canReadContext(): boolean {
    return Boolean(this.customerId || this.leadId || this.projectId);
  }

  hasOpportunityContext(): boolean {
    return Boolean(this.leadId || this.projectId);
  }

  canCreateOpportunityFacts(): boolean {
    return Boolean(this.canWrite && this.customerId && this.hasOpportunityContext());
  }

  isDiscoveryFormValid(): boolean {
    const form = this.discoveryForm();
    return Object.values(form).some(value => value.trim().length > 0);
  }

  missingGapCount(): number {
    return this.store.gaps().filter(gap => gap.isMissing).length;
  }

  contactOptions(): Array<SalesIntelligenceOption<string>> {
    return this.store
      .contacts()
      .filter(contact => contact.status === CustomerContactStatus.Active)
      .map(contact => ({
        label: `${contact.name}${contact.title ? ` · ${contact.title}` : ''}`,
        value: contact.id,
      }));
  }

  contactStatusLabel(status: CustomerContactStatus): string {
    return CONTACT_STATUS_LABELS[status] ?? status;
  }

  contactGenderLabel(gender: CustomerContactGender): string {
    return CONTACT_GENDER_LABELS[gender] ?? gender;
  }

  contactStatusSeverity(status: CustomerContactStatus) {
    return CONTACT_STATUS_SEVERITY[status] ?? 'secondary';
  }

  stakeholderRoleLabel(role: OpportunityStakeholderRole): string {
    return STAKEHOLDER_ROLE_LABELS[role] ?? role;
  }

  stakeholderAttitudeLabel(attitude: OpportunityStakeholderAttitude): string {
    return STAKEHOLDER_ATTITUDE_LABELS[attitude] ?? attitude;
  }

  stakeholderAttitudeSeverity(attitude: OpportunityStakeholderAttitude) {
    return STAKEHOLDER_ATTITUDE_SEVERITY[attitude] ?? 'secondary';
  }

  stakeholderInfluenceLabel(level: OpportunityStakeholderInfluenceLevel): string {
    return STAKEHOLDER_INFLUENCE_LABELS[level] ?? level;
  }

  stakeholderInfluenceSeverity(level: OpportunityStakeholderInfluenceLevel) {
    return STAKEHOLDER_INFLUENCE_SEVERITY[level] ?? 'secondary';
  }

  stakeholderAccessLabel(level: OpportunityStakeholderAccessLevel): string {
    return STAKEHOLDER_ACCESS_LABELS[level] ?? level;
  }

  stakeholderAccessSeverity(level: OpportunityStakeholderAccessLevel) {
    return STAKEHOLDER_ACCESS_SEVERITY[level] ?? 'secondary';
  }

  competitorPositionLabel(position: CompetitorPosition): string {
    return COMPETITOR_POSITION_LABELS[position] ?? position;
  }

  customerPreferenceLabel(preference: CustomerPreference): string {
    return CUSTOMER_PREFERENCE_LABELS[preference] ?? preference;
  }

  customerPreferenceSeverity(preference: CustomerPreference) {
    return CUSTOMER_PREFERENCE_SEVERITY[preference] ?? 'secondary';
  }

  winProbabilityLabel(probability: WinProbabilityLevel): string {
    return WIN_PROBABILITY_LABELS[probability] ?? probability;
  }

  winProbabilitySeverity(probability: WinProbabilityLevel) {
    return WIN_PROBABILITY_SEVERITY[probability] ?? 'secondary';
  }

  gapSeverityLabel(severity: SalesIntelligenceGapSeverity): string {
    return GAP_SEVERITY_LABELS[severity] ?? severity;
  }

  gapSeverity(severity: SalesIntelligenceGapSeverity) {
    return GAP_SEVERITY[severity] ?? 'secondary';
  }

  displayText(value: string | null | undefined, fallback: string): string {
    return value?.trim() ? value : fallback;
  }

  private firstActiveContact(): CustomerContactSummary | null {
    return this.store.contacts().find(contact => contact.status === CustomerContactStatus.Active) ?? null;
  }

  private writeOpportunityAnchors(): { leadId?: string; projectId?: string } | null {
    if (this.projectId) {
      return { projectId: this.projectId };
    }

    if (this.leadId) {
      return { leadId: this.leadId };
    }

    return null;
  }

  private parseFocusAreas(value: string): string[] {
    return value
      .split(/[,\n，]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  private optionalText(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
}
