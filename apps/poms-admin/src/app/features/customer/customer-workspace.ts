import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, type OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AttachmentTargetType,
  AuthStore,
  BusinessDiscussionTargetObjectType,
  type BusinessDiscussionType,
  CustomerAliasType,
  type CustomerDetailView,
  CustomerStore,
  type CustomerWorkspaceActionItem,
  type CustomerWorkspaceTimelineItem,
  type LeadRating,
  type LeadUrgency,
  type SalesFollowUpOutcome,
  UpdateCustomerRequestStatusEnum,
} from '@poms/admin-data-access';
import {
  BusinessDiscussionTypeLabel,
  LeadRatingLabel,
  LeadUrgencyLabel,
  SalesFollowUpOutcomeLabel,
} from '@poms/shared-contracts';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { AuditHistoryPanel } from '../../shared/ui/audit-history-panel';
import { BusinessDiscussionPanel } from '../../shared/ui/business-discussion-panel';
import { SalesFollowUpPanel } from '../../shared/ui/sales-follow-up-panel';
import { SalesIntelligencePanel } from '../../shared/ui/sales-intelligence-panel';
import { SectionCard } from '../../shared/ui/sectioncard';
import {
  contractStatusLabelOrFallback,
  contractStatusSeverityOrFallback,
  leadStatusLabelOrFallback,
  leadStatusSeverityOrFallback,
  projectStageLabelOrFallback,
  projectStageSeverityOrFallback,
  projectStatusLabelOrFallback,
  projectStatusSeverityOrFallback,
} from '../../shared/ui/status-presentation';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { CustomerFormDialog, type CustomerFormValue, EMPTY_CUSTOMER_FORM_VALUE } from './customer-form-dialog';
import {
  CUSTOMER_ALIAS_TYPE_OPTIONS,
  customerStatusLabel,
  customerStatusSeverity,
  displayText,
  optionalText,
  toCustomerFormValue,
} from './customer-view-model';

interface CustomerAliasForm {
  aliasName: string;
  aliasType: CustomerAliasType;
}

interface FollowUpReminderEntry {
  followUpId: string;
  todoId: string | null;
}

interface CustomerWorkspaceHeaderFact {
  label: string;
  value: number;
  unit: string;
}

interface CustomerWorkspaceSectionNavItem {
  id: string;
  label: string;
  icon: string;
}

const EMPTY_ALIAS_FORM: CustomerAliasForm = {
  aliasName: '',
  aliasType: CustomerAliasType.Alias,
};

const CUSTOMER_WORKSPACE_SECTION_NAV_ITEMS: readonly CustomerWorkspaceSectionNavItem[] = [
  { id: 'customer-workspace-overview', label: '经营工作台', icon: 'pi pi-chart-line' },
  { id: 'customer-profile', label: '客户档案', icon: 'pi pi-id-card' },
  { id: 'customer-relations', label: '客户关系', icon: 'pi pi-users' },
  { id: 'customer-business-discussions', label: '业务讨论', icon: 'pi pi-comments' },
  { id: 'customer-sales-follow-ups', label: '销售跟进', icon: 'pi pi-calendar-plus' },
  { id: 'customer-attachments', label: '客户附件', icon: 'pi pi-paperclip' },
];

const LEAD_RATING_LABELS = LeadRatingLabel as Record<LeadRating, string>;
const LEAD_URGENCY_LABELS = LeadUrgencyLabel as Record<LeadUrgency, string>;
const FOLLOW_UP_OUTCOME_LABELS = SalesFollowUpOutcomeLabel as Record<SalesFollowUpOutcome, string>;
const DISCUSSION_TYPE_LABELS = BusinessDiscussionTypeLabel as Record<BusinessDiscussionType, string>;

@Component({
  selector: 'app-customer-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    AttachmentPanel,
    AuditHistoryPanel,
    BusinessDiscussionPanel,
    SalesFollowUpPanel,
    SalesIntelligencePanel,
    SectionCard,
    WorkspaceFeedback,
    CustomerFormDialog,
  ],
  providers: [CustomerStore],
  template: `
        <div class="flex flex-col gap-5">
            @if (pageError()) {
                <app-workspace-feedback severity="error" summary="客户工作台暂时无法打开" [detail]="pageError()" />
            }

            @if (loadingDetail()) {
                <app-workspace-feedback severity="info" summary="正在读取客户工作台" detail="请稍候。" />
            } @else if (customer(); as customer) {
                <section class="card">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div class="min-w-0">
                            <div class="mb-3 flex flex-wrap items-center gap-2">
                                <p-button icon="pi pi-arrow-left" severity="secondary" [outlined]="true" ariaLabel="返回客户列表" styleClass="rounded-md!" (onClick)="backToList()" />
                                <span class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">{{ customer.customerNo }}</span>
                                <p-tag [value]="statusLabel(customer.status)" [severity]="statusSeverity(customer.status)" class="rounded-md" />
                            </div>
                            <h2 class="m-0 text-2xl font-semibold text-surface-950 dark:text-surface-0">{{ customer.displayName }}</h2>
                            <p class="mt-2 text-sm leading-6 text-surface-600 dark:text-surface-300">{{ displayText(customer.legalName || customer.shortName, '未维护法定名称/简称') }}</p>
                            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
                                <span>主责：{{ displayText(customer.ownerName, '未指定') }}</span>
                                <span>组织：{{ displayText(customer.ownerOrgName, '未归属组织') }}</span>
                                <span>更新：{{ customer.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                            </div>
                        </div>
                        <div class="flex shrink-0 flex-wrap items-center gap-2">
                            <app-audit-history-panel targetType="customer" [targetId]="customer.id" [targetTitle]="customer.displayName" />
                            <p-button icon="pi pi-pencil" label="编辑客户" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showEditDialog(customer)" />
                        </div>
                    </div>

                    <div class="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-surface-200 bg-surface-200 sm:grid-cols-3 dark:border-surface-700 dark:bg-surface-700">
                        @for (fact of customerHeaderFacts(); track fact.label) {
                            <div class="bg-surface-0 px-4 py-3 dark:bg-surface-900">
                                <div class="text-xs text-surface-500 dark:text-surface-400">{{ fact.label }}</div>
                                <div class="mt-2 flex items-baseline gap-1">
                                    <span class="text-xl font-semibold text-surface-950 dark:text-surface-0">{{ fact.value }}</span>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">{{ fact.unit }}</span>
                                </div>
                            </div>
                        }
                    </div>
                </section>

                <nav class="card p-2!" aria-label="客户工作台分区导航">
                    <div class="flex gap-1 overflow-x-auto">
                        @for (section of workspaceSectionNavItems; track section.id) {
                            <p-button [icon]="section.icon" [label]="section.label" severity="secondary" [text]="true" styleClass="rounded-md! whitespace-nowrap" (onClick)="scrollToWorkspaceSection(section.id)" />
                        }
                    </div>
                </nav>

                <section-card id="customer-workspace-overview">
                    <ng-template #title>经营工作台</ng-template>
                    <ng-template #description>优先处理动作、近期动态和核心经营事实。</ng-template>
                    <ng-template #action>
                        @if (workspaceOverview(); as overview) {
                            <span class="shrink-0 text-xs text-surface-500 dark:text-surface-400">生成：{{ overview.generatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                        }
                    </ng-template>

                    <div class="mt-4">
                        @if (overviewError()) {
                            <app-workspace-feedback severity="warn" summary="经营概览没有读取成功" [detail]="overviewError()" />
                        } @else if (loadingWorkspaceOverview()) {
                            <app-workspace-feedback severity="info" summary="正在读取经营概览" detail="请稍候。" />
                        } @else if (workspaceOverview(); as overview) {
                            <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                                <div class="min-w-0">
                                    <div class="border-y border-surface-200 py-4 dark:border-surface-700">
                                        <div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <h4 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">下一步动作</h4>
                                            <span class="text-xs text-surface-500 dark:text-surface-400">基于当前客户经营事实生成</span>
                                        </div>
                                        @if (overview.recommendedActions.length) {
                                            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                                @for (action of overview.recommendedActions; track action.key) {
                                                    <div class="min-w-0">
                                                        <p-button
                                                            [icon]="getWorkspaceActionIcon(action)"
                                                            [label]="action.title"
                                                            severity="secondary"
                                                            [outlined]="true"
                                                            styleClass="w-full justify-start rounded-md!"
                                                            (onClick)="executeWorkspaceAction(action)"
                                                        />
                                                        <p class="mt-2 line-clamp-2 text-xs leading-5 text-surface-500 dark:text-surface-400">{{ action.description }}</p>
                                                    </div>
                                                }
                                            </div>
                                        } @else {
                                            <div class="text-sm text-surface-500 dark:text-surface-400">暂无推荐动作。</div>
                                        }
                                    </div>

                                <div class="mt-6">
                                    <div class="mb-3 flex items-center justify-between gap-3">
                                        <h4 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">经营事实</h4>
                                        <span class="text-xs text-surface-500 dark:text-surface-400">用于判断客户当前经营状态</span>
                                    </div>
                                    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                        <div class="min-w-0">
                                            <div class="flex items-center justify-between gap-3">
                                                <h5 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">活跃线索</h5>
                                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ overview.summary.activeLeadCount }} 条</span>
                                            </div>
                                            <div class="mt-3 divide-y divide-surface-200 border-y border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                                                @for (lead of overview.activeLeads; track lead.id) {
                                                    <article class="py-3">
                                                        <div class="flex items-start justify-between gap-3">
                                                            <div class="min-w-0">
                                                                <div class="truncate text-sm font-medium text-primary">{{ lead.leadName }}</div>
                                                                <div class="mt-1 truncate text-xs text-surface-500 dark:text-surface-400">{{ lead.leadNo }} · {{ displayText(lead.ownerName, '未指定') }}</div>
                                                            </div>
                                                            <p-tag [value]="getLeadStatusName(lead.status)" [severity]="getLeadStatusSeverity(lead.status)" class="rounded-md shrink-0 whitespace-nowrap" />
                                                        </div>
                                                        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                                                            <span>{{ getLeadRatingName(lead.rating) }}</span>
                                                            <span>{{ getLeadUrgencyName(lead.urgency) }}</span>
                                                            <span>{{ lead.updatedAt | date: 'MM-dd HH:mm' }}</span>
                                                        </div>
                                                    </article>
                                                } @empty {
                                                    <div class="py-3 text-sm text-surface-500 dark:text-surface-400">暂无活跃线索。</div>
                                                }
                                            </div>
                                        </div>

                                        <div class="min-w-0">
                                            <div class="flex items-center justify-between gap-3">
                                                <h5 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">进行中项目</h5>
                                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ overview.summary.activeProjectCount }} 个</span>
                                            </div>
                                            <div class="mt-3 divide-y divide-surface-200 border-y border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                                                @for (project of overview.activeProjects; track project.id) {
                                                    <article class="py-3">
                                                        <div class="min-w-0">
                                                            <div class="truncate text-sm font-medium text-primary">{{ project.projectName }}</div>
                                                            <div class="mt-1 truncate text-xs text-surface-500 dark:text-surface-400">{{ project.projectNo }} · {{ displayText(project.ownerName, '未指定') }}</div>
                                                        </div>
                                                        <div class="mt-2 flex flex-wrap items-center gap-2">
                                                            <p-tag [value]="getProjectStageName(project.currentStage)" [severity]="getProjectStageSeverity(project.currentStage)" class="rounded-md whitespace-nowrap" />
                                                            <p-tag [value]="getProjectStatusName(project.status)" [severity]="getProjectStatusSeverity(project.status)" class="rounded-md whitespace-nowrap" />
                                                            @if (project.plannedSignAt) {
                                                                <span class="text-xs text-surface-500 dark:text-surface-400">计划签约 {{ project.plannedSignAt | date: 'MM-dd' }}</span>
                                                            }
                                                        </div>
                                                    </article>
                                                } @empty {
                                                    <div class="py-3 text-sm text-surface-500 dark:text-surface-400">暂无进行中项目。</div>
                                                }
                                            </div>
                                        </div>

                                        <div class="min-w-0">
                                            <div class="flex items-center justify-between gap-3">
                                                <h5 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">近期合同</h5>
                                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ overview.summary.contractCount }} 份</span>
                                            </div>
                                            <div class="mt-3 divide-y divide-surface-200 border-y border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                                                @for (contract of overview.recentContracts; track contract.id) {
                                                    <article class="py-3">
                                                        <div class="flex items-start justify-between gap-3">
                                                            <div class="min-w-0">
                                                                <div class="truncate text-sm font-medium text-surface-900 dark:text-surface-0">{{ contract.contractNo }}</div>
                                                                <div class="mt-1 truncate text-xs text-surface-500 dark:text-surface-400">{{ contract.projectName }}</div>
                                                            </div>
                                                            <p-tag [value]="getContractStatusName(contract.status)" [severity]="getContractStatusSeverity(contract.status)" class="rounded-md shrink-0 whitespace-nowrap" />
                                                        </div>
                                                        <div class="mt-2 text-xs text-surface-500 dark:text-surface-400">更新 {{ contract.updatedAt | date: 'MM-dd HH:mm' }}</div>
                                                    </article>
                                                } @empty {
                                                    <div class="py-3 text-sm text-surface-500 dark:text-surface-400">暂无合同记录。</div>
                                                }
                                            </div>
                                        </div>

                                        <div class="min-w-0">
                                            <div class="flex items-center justify-between gap-3">
                                                <h5 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">近期协同</h5>
                                                <span class="text-xs text-surface-500 dark:text-surface-400">{{ overview.summary.recentFollowUpCount + overview.summary.recentDiscussionCount }} 条</span>
                                            </div>
                                            <div class="mt-3 divide-y divide-surface-200 border-y border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                                                @if (overview.recentFollowUps.length || overview.recentDiscussions.length) {
                                                    @for (followUp of overview.recentFollowUps; track followUp.id) {
                                                        <article class="py-3">
                                                            <div class="flex items-start justify-between gap-3">
                                                                <div class="min-w-0">
                                                                    <div class="truncate text-sm font-medium text-surface-900 dark:text-surface-0">{{ followUp.summary }}</div>
                                                                    <div class="mt-1 truncate text-xs text-surface-500 dark:text-surface-400">跟进 · {{ displayText(followUp.ownerName, '未指定') }}</div>
                                                                </div>
                                                                <span class="shrink-0 text-xs text-surface-500 dark:text-surface-400">{{ followUp.occurredAt | date: 'MM-dd' }}</span>
                                                            </div>
                                                            <div class="mt-2 text-xs text-surface-500 dark:text-surface-400">{{ getFollowUpOutcomeName(followUp.outcome) }}</div>
                                                        </article>
                                                    }
                                                    @for (discussion of overview.recentDiscussions; track discussion.id) {
                                                        <article class="py-3">
                                                            <div class="flex items-start justify-between gap-3">
                                                                <div class="min-w-0">
                                                                    <div class="line-clamp-2 text-sm font-medium text-surface-900 dark:text-surface-0">{{ discussion.body }}</div>
                                                                    <div class="mt-1 truncate text-xs text-surface-500 dark:text-surface-400">讨论 · {{ discussion.targetTitle }}</div>
                                                                </div>
                                                                @if (discussion.isKeyConclusion) {
                                                                    <p-tag value="关键结论" severity="success" class="rounded-md shrink-0 whitespace-nowrap" />
                                                                }
                                                            </div>
                                                            <div class="mt-2 text-xs text-surface-500 dark:text-surface-400">{{ getDiscussionTypeName(discussion.discussionType) }} · {{ discussion.createdAt | date: 'MM-dd HH:mm' }}</div>
                                                        </article>
                                                    }
                                                } @else {
                                                    <div class="py-3 text-sm text-surface-500 dark:text-surface-400">暂无近期协同。</div>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <aside class="min-w-0 border-t border-surface-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0 dark:border-surface-700">
                                <div class="mb-3 flex items-center justify-between gap-3">
                                    <h4 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">客户动态</h4>
                                    <span class="text-xs text-surface-500 dark:text-surface-400">按发生时间倒序</span>
                                </div>
                                @if (overview.timeline.length) {
                                    <div class="divide-y divide-surface-200 border-y border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                                        @for (item of overview.timeline; track item.key) {
                                            <article class="flex items-start gap-3 py-3">
                                                <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-200">
                                                    <i [class]="getTimelineIcon(item)"></i>
                                                </span>
                                                <div class="min-w-0 flex-1">
                                                    <div class="flex flex-wrap items-center gap-2">
                                                        <span class="text-sm font-medium text-surface-950 dark:text-surface-0">{{ item.title }}</span>
                                                        <span class="text-xs text-surface-500 dark:text-surface-400">{{ getTimelineEventName(item) }}</span>
                                                        @if (item.isKey) {
                                                            <p-tag value="关键" severity="success" class="rounded-md whitespace-nowrap" />
                                                        }
                                                    </div>
                                                    <p class="mt-1 line-clamp-2 text-sm leading-6 text-surface-600 dark:text-surface-300">{{ displayText(item.description, '暂无说明') }}</p>
                                                    <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                                                        <span>{{ item.occurredAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                                                        @if (item.actorName) {
                                                            <span>{{ item.actorName }}</span>
                                                        }
                                                    </div>
                                                </div>
                                                <p-button icon="pi pi-arrow-right" severity="secondary" [text]="true" [rounded]="true" ariaLabel="打开动态来源" (onClick)="openTimelineItem(item)" />
                                            </article>
                                        }
                                    </div>
                                } @else {
                                    <div class="border-y border-surface-200 py-3 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无客户动态。</div>
                                }
                            </aside>
                            </div>
                        } @else {
                            <div class="rounded-lg border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无经营概览。</div>
                        }
                    </div>
                </section-card>

                <section-card id="customer-profile">
                    <ng-template #title>客户档案</ng-template>
                    <ng-template #description>客户主档身份、长期备注和常用别名。</ng-template>

                    <h4 class="mt-4 text-sm font-semibold text-surface-900 dark:text-surface-0">基础信息</h4>
                    <dl class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">法定名称</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ displayText(customer.legalName, '未维护') }}</dd>
                        </div>
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">简称</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ displayText(customer.shortName, '未维护') }}</dd>
                        </div>
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">来源渠道</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ displayText(customer.sourceChannel, '未维护') }}</dd>
                        </div>
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">创建时间</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ customer.createdAt | date: 'yyyy-MM-dd HH:mm' }}</dd>
                        </div>
                        <div class="md:col-span-2 xl:col-span-4">
                            <dt class="text-surface-500 dark:text-surface-400">备注</dt>
                            <dd class="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-200">{{ displayText(customer.remark, '暂无备注') }}</dd>
                        </div>
                    </dl>

                    <div class="mt-6 border-t border-surface-200 pt-5 dark:border-surface-700">
                        <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <h4 class="m-0 text-sm font-semibold text-surface-900 dark:text-surface-0">客户别名</h4>
                                <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">维护法定名称、简称、历史输入和导入名称。</p>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <input pInputText [ngModel]="aliasForm().aliasName" (ngModelChange)="updateAliasName($event)" placeholder="新增别名" class="w-48 rounded-md!" />
                                <p-select [ngModel]="aliasForm().aliasType" (ngModelChange)="updateAliasType($event)" [options]="aliasTypeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-36 rounded-md!" />
                                <p-button icon="pi pi-plus" label="添加" [loading]="saving()" [disabled]="!aliasForm().aliasName.trim()" styleClass="rounded-md!" (onClick)="createAlias(customer)" />
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-2">
                            @for (alias of aliases(); track alias.id) {
                                <span class="rounded-md border border-surface-200 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:text-surface-200">{{ alias.aliasName }}</span>
                            } @empty {
                                <span class="text-sm text-surface-500 dark:text-surface-400">暂无别名</span>
                            }
                        </div>
                    </div>
                </section-card>

                @if (followUpReminderEntry()) {
                    <app-workspace-feedback severity="info" summary="从销售跟进待办进入" detail="请在下方客户销售跟进中登记本次处理结果，系统会据此关闭或刷新提醒。" />
                }

                <div id="customer-relations">
                    <app-sales-intelligence-panel [customerId]="customer.id" [canWrite]="canWriteCustomer()" title="客户关系" description="维护客户联系人，并作为线索和项目决策链的联系人来源。" />
                </div>

                <div id="customer-business-discussions">
                    <app-business-discussion-panel
                        [customerId]="customer.id"
                        [targetObjectType]="customerDiscussionTargetType"
                        [targetObjectId]="customer.id"
                        [targetTitle]="customer.displayName"
                        [canWrite]="canWriteCustomer()"
                        title="客户业务讨论"
                        description="沉淀客户长期信息、跨线索判断和协同结论。"
                    />
                </div>

                <div id="customer-sales-follow-ups">
                    <app-sales-follow-up-panel
                        [customerId]="customer.id"
                        [canWrite]="canWriteCustomer()"
                        title="客户销售跟进"
                        description="沉淀客户级沟通、长期采购信息、合作机会和下一步动作。"
                        createContextDetail="本次记录会挂到当前客户，用于跨线索和跨项目查看客户销售过程。"
                    />
                </div>

                <div id="customer-attachments">
                    <app-attachment-panel [targetType]="customerAttachmentTargetType" [targetId]="customer.id" [canWrite]="canWriteCustomer()" title="客户附件" description="保存客户资质、开票资料、采购制度、框架协议和长期合作资料。" />
                </div>

                <app-customer-form-dialog [visible]="editDialogVisible" mode="edit" [initialValue]="editFormInitial()" [saving]="saving()" [error]="formError()" (visibleChange)="editDialogVisible = $event" (save)="updateCustomer($event)" />
            }
        </div>
    `,
})
export class CustomerWorkspace implements OnInit {
  readonly #customerStore = inject(CustomerStore);
  readonly #authStore = inject(AuthStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);

  readonly customer = this.#customerStore.selectedCustomer;
  readonly aliases = this.#customerStore.aliases;
  readonly workspaceOverview = this.#customerStore.customerWorkspaceOverview;
  readonly loadingDetail = this.#customerStore.loadingDetail;
  readonly loadingWorkspaceOverview = this.#customerStore.loadingWorkspaceOverview;
  readonly saving = this.#customerStore.saving;

  readonly pageError = signal<string | null>(null);
  readonly overviewError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly aliasForm = signal<CustomerAliasForm>({ ...EMPTY_ALIAS_FORM });
  readonly editFormInitial = signal<CustomerFormValue>({ ...EMPTY_CUSTOMER_FORM_VALUE });
  readonly followUpReminderEntry = signal<FollowUpReminderEntry | null>(null);

  readonly aliasTypeOptions = CUSTOMER_ALIAS_TYPE_OPTIONS;
  readonly workspaceSectionNavItems = CUSTOMER_WORKSPACE_SECTION_NAV_ITEMS;
  readonly customerAttachmentTargetType = AttachmentTargetType.Customer;
  readonly customerDiscussionTargetType = BusinessDiscussionTargetObjectType.Customer;
  readonly canWriteCustomer = computed(() => this.#authStore.hasAnyPermission(['customer:write'] as const));
  readonly customerHeaderFacts = computed<CustomerWorkspaceHeaderFact[]>(() => {
    const customer = this.customer();
    const summary = this.workspaceOverview()?.summary;
    return [
      { label: '活跃线索', value: summary?.activeLeadCount ?? customer?.leadCount ?? 0, unit: '条' },
      { label: '进行中项目', value: summary?.activeProjectCount ?? customer?.projectCount ?? 0, unit: '个' },
      { label: '合同', value: summary?.contractCount ?? customer?.contractCount ?? 0, unit: '份' },
    ];
  });

  editDialogVisible = false;

  ngOnInit() {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(params => {
      const customerId = params.get('id');
      if (!customerId) {
        this.pageError.set('缺少客户标识，无法打开客户工作台。');
        return;
      }

      void this.loadCustomer(customerId);
    });

    this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(params => {
      const followUpId = params.get('followUpId');
      this.followUpReminderEntry.set(followUpId ? { followUpId, todoId: params.get('todoId') } : null);
    });
  }

  async loadCustomer(customerId: string) {
    this.pageError.set(null);
    this.overviewError.set(null);
    this.aliasForm.set({ ...EMPTY_ALIAS_FORM });
    try {
      const overviewLoad = this.#customerStore.loadCustomerWorkspaceOverview(customerId).catch(() => {
        this.overviewError.set('客户经营聚合信息暂时无法读取，基础档案和各业务面板仍可继续使用。');
        return null;
      });
      const [customer] = await Promise.all([this.#customerStore.loadCustomer(customerId), overviewLoad]);
      this.editFormInitial.set(toCustomerFormValue(customer));
    } catch {
      this.pageError.set('客户详情没有读取成功，请稍后重试。');
    }
  }

  backToList() {
    void this.#router.navigate(['/customers']);
  }

  executeWorkspaceAction(action: CustomerWorkspaceActionItem) {
    switch (action.intent) {
      case 'open-leads':
        void this.#router.navigate(['/leads']);
        return;
      case 'open-project-workspace':
        void this.#router.navigate(
          action.targetObjectId ? ['/projects', action.targetObjectId, 'workspace'] : ['/projects'],
        );
        return;
      case 'open-contract':
        void this.#router.navigate(action.targetObjectId ? ['/contracts', action.targetObjectId] : ['/contracts']);
        return;
      case 'record-follow-up':
        this.scrollToWorkspaceSection('customer-sales-follow-ups');
        return;
      case 'capture-discussion':
        this.scrollToWorkspaceSection('customer-business-discussions');
        return;
    }
  }

  openTimelineItem(item: CustomerWorkspaceTimelineItem) {
    switch (item.sourceType) {
      case 'lead':
        void this.#router.navigate(['/leads']);
        return;
      case 'project':
        void this.#router.navigate(['/projects', item.sourceId, 'workspace']);
        return;
      case 'contract':
        void this.#router.navigate(['/contracts', item.sourceId]);
        return;
      case 'follow-up':
        this.scrollToWorkspaceSection('customer-sales-follow-ups');
        return;
      case 'discussion':
        this.scrollToWorkspaceSection('customer-business-discussions');
        return;
    }
  }

  getWorkspaceActionIcon(action: CustomerWorkspaceActionItem): string {
    switch (action.intent) {
      case 'open-leads':
        return 'pi pi-compass';
      case 'open-project-workspace':
        return 'pi pi-briefcase';
      case 'open-contract':
        return 'pi pi-file-edit';
      case 'record-follow-up':
        return 'pi pi-calendar-plus';
      case 'capture-discussion':
        return 'pi pi-comments';
    }
    return 'pi pi-arrow-right';
  }

  getTimelineEventName(item: CustomerWorkspaceTimelineItem): string {
    switch (item.eventType) {
      case 'lead-updated':
        return '线索更新';
      case 'project-updated':
        return '项目推进';
      case 'contract-updated':
        return '合同更新';
      case 'follow-up-recorded':
        return '跟进记录';
      case 'discussion-added':
        return '讨论沉淀';
    }
    return '客户动态';
  }

  getTimelineIcon(item: CustomerWorkspaceTimelineItem): string {
    switch (item.sourceType) {
      case 'lead':
        return 'pi pi-compass';
      case 'project':
        return 'pi pi-briefcase';
      case 'contract':
        return 'pi pi-file-edit';
      case 'follow-up':
        return 'pi pi-calendar';
      case 'discussion':
        return 'pi pi-comments';
    }
    return 'pi pi-history';
  }

  showEditDialog(customer: CustomerDetailView) {
    this.formError.set(null);
    this.editFormInitial.set(toCustomerFormValue(customer));
    this.editDialogVisible = true;
  }

  async updateCustomer(form: CustomerFormValue) {
    const customer = this.customer();
    if (!customer) {
      return;
    }

    try {
      await this.#customerStore.updateCustomer(customer.id, {
        displayName: form.displayName.trim(),
        legalName: optionalText(form.legalName),
        shortName: optionalText(form.shortName),
        status:
          form.status === EMPTY_CUSTOMER_FORM_VALUE.status
            ? UpdateCustomerRequestStatusEnum.Active
            : UpdateCustomerRequestStatusEnum.Inactive,
        sourceChannel: optionalText(form.sourceChannel),
        remark: optionalText(form.remark),
      });
      this.editDialogVisible = false;
    } catch {
      this.formError.set('请稍后重试。');
    }
  }

  updateAliasName(value: string) {
    this.aliasForm.update(form => ({ ...form, aliasName: value }));
  }

  updateAliasType(value: CustomerAliasForm['aliasType']) {
    this.aliasForm.update(form => ({ ...form, aliasType: value }));
  }

  async createAlias(customer: CustomerDetailView) {
    const form = this.aliasForm();
    if (!form.aliasName.trim()) {
      return;
    }

    try {
      await this.#customerStore.createAlias(customer.id, {
        aliasName: form.aliasName.trim(),
        aliasType: form.aliasType,
      });
      this.aliasForm.set({ ...EMPTY_ALIAS_FORM });
    } catch {
      this.pageError.set('客户别名没有添加成功，请检查是否重复。');
    }
  }

  statusLabel = customerStatusLabel;
  statusSeverity = customerStatusSeverity;
  displayText = displayText;

  getLeadStatusName(status: string): string {
    return leadStatusLabelOrFallback(status);
  }

  getLeadStatusSeverity(status: string) {
    return leadStatusSeverityOrFallback(status);
  }

  getLeadRatingName(rating: LeadRating | null | undefined): string {
    return rating ? LEAD_RATING_LABELS[rating] : '未评级';
  }

  getLeadUrgencyName(urgency: LeadUrgency | null | undefined): string {
    return urgency ? LEAD_URGENCY_LABELS[urgency] : '未确认紧急度';
  }

  getProjectStageName(stage: string): string {
    return projectStageLabelOrFallback(stage);
  }

  getProjectStageSeverity(stage: string) {
    return projectStageSeverityOrFallback(stage);
  }

  getProjectStatusName(status: string): string {
    return projectStatusLabelOrFallback(status);
  }

  getProjectStatusSeverity(status: string) {
    return projectStatusSeverityOrFallback(status);
  }

  getContractStatusName(status: string): string {
    return contractStatusLabelOrFallback(status);
  }

  getContractStatusSeverity(status: string) {
    return contractStatusSeverityOrFallback(status);
  }

  getFollowUpOutcomeName(outcome: SalesFollowUpOutcome): string {
    return FOLLOW_UP_OUTCOME_LABELS[outcome] ?? outcome;
  }

  getDiscussionTypeName(type: BusinessDiscussionType): string {
    return DISCUSSION_TYPE_LABELS[type] ?? type;
  }

  scrollToWorkspaceSection(sectionId: string) {
    this.#document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
