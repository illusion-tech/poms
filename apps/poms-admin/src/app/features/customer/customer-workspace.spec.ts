import { signal, type WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import {
  AttachmentStore,
  type AttachmentSummary,
  AttachmentTargetType,
  type AttachmentUploadProgressState,
  AuditHistoryStore,
  AuthStore,
  type BusinessDiscussionCommentSummary,
  BusinessDiscussionStore,
  BusinessDiscussionTargetObjectType,
  BusinessDiscussionType,
  type CompetitorIntelligenceRecordSummary,
  ContractStatus,
  type CustomerAliasSummary,
  CustomerAliasType,
  type CustomerContactSummary,
  type CustomerDetailView,
  CustomerStatus,
  CustomerStore,
  CustomerWorkspaceActionIntent,
  type CustomerWorkspaceOverviewView,
  CustomerWorkspaceTargetObjectType,
  CustomerWorkspaceTimelineEventType,
  CustomerWorkspaceTimelineSourceType,
  DictionaryStore,
  LeadRating,
  LeadStatus,
  LeadUrgency,
  type OpportunityStakeholderSummary,
  ProjectStage,
  ProjectStatus,
  type SalesDiscoveryRecordSummary,
  SalesFollowUpOutcome,
  SalesFollowUpRecordLifecycleScope,
  type SalesFollowUpRecordSummary,
  SalesFollowUpStore,
  type SalesIntelligenceGapSummary,
  SalesIntelligenceStore,
} from '@poms/admin-data-access';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { AuditHistoryPanel } from '../../shared/ui/audit-history-panel';
import { BusinessDiscussionPanel } from '../../shared/ui/business-discussion-panel';
import { SalesFollowUpPanel } from '../../shared/ui/sales-follow-up-panel';
import { SalesIntelligencePanel } from '../../shared/ui/sales-intelligence-panel';
import { CustomerWorkspace } from './customer-workspace';

function createCustomerDetail(overrides: Partial<CustomerDetailView> = {}): CustomerDetailView {
  const id = overrides.id ?? 'customer-1';
  return {
    id,
    customerNo: 'CUST-2026-001',
    displayName: '华南地铁集团',
    legalName: '华南地铁集团有限公司',
    shortName: '华南地铁',
    status: CustomerStatus.Active,
    ownerOrgId: 'org-1',
    ownerUserId: 'user-1',
    sourceChannel: '客户拜访',
    remark: null,
    mergedIntoCustomerId: null,
    rowVersion: 1,
    createdAt: '2026-04-30T08:00:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-04-30T08:00:00.000Z',
    updatedBy: 'user-1',
    ownerName: '张销售',
    ownerOrgName: '华南销售一部',
    leadCount: 2,
    projectCount: 1,
    contractCount: 1,
    aliases: [createAlias({ customerId: id })],
    ...overrides,
  };
}

function createAlias(overrides: Partial<CustomerAliasSummary> = {}): CustomerAliasSummary {
  return {
    id: 'alias-1',
    customerId: 'customer-1',
    aliasName: '华南地铁',
    aliasType: CustomerAliasType.Alias,
    normalizedName: '华南地铁',
    isPrimary: false,
    createdAt: '2026-04-30T08:00:00.000Z',
    createdBy: 'user-1',
    ...overrides,
  };
}

function createCustomerWorkspaceOverview(
  overrides: Partial<CustomerWorkspaceOverviewView> = {},
): CustomerWorkspaceOverviewView {
  return {
    customerId: 'customer-1',
    summary: {
      leadCount: 2,
      activeLeadCount: 1,
      convertedLeadCount: 1,
      projectCount: 1,
      activeProjectCount: 1,
      contractCount: 1,
      recentFollowUpCount: 1,
      recentDiscussionCount: 1,
      latestFollowUpAt: '2026-05-27T09:30:00.000Z',
      latestDiscussionAt: '2026-05-28T10:00:00.000Z',
    },
    activeLeads: [
      {
        id: 'lead-1',
        leadNo: 'LD-2026-001',
        leadName: '智慧园区线索',
        status: LeadStatus.Qualified,
        rating: LeadRating.A,
        urgency: LeadUrgency.High,
        ownerName: '张销售',
        updatedAt: '2026-05-27T09:30:00.000Z',
      },
    ],
    activeProjects: [
      {
        id: 'project-1',
        projectNo: 'PRJ-2026-001',
        projectName: '智慧园区项目',
        status: ProjectStatus.Active,
        currentStage: ProjectStage.Handover,
        ownerName: '张销售',
        plannedSignAt: '2026-06-10T00:00:00.000Z',
        updatedAt: '2026-05-28T10:00:00.000Z',
      },
    ],
    recentContracts: [
      {
        id: 'contract-1',
        contractNo: 'HT-2026-001',
        customerContractNo: 'C-001',
        status: ContractStatus.Active,
        projectId: 'project-1',
        projectName: '智慧园区项目',
        signedAt: '2026-05-20T00:00:00.000Z',
        updatedAt: '2026-05-28T10:00:00.000Z',
      },
    ],
    recentFollowUps: [
      {
        id: 'follow-up-1',
        summary: '确认预算窗口',
        outcome: SalesFollowUpOutcome.Progress,
        occurredAt: '2026-05-27T09:30:00.000Z',
        nextFollowUpAt: '2026-06-01T09:30:00.000Z',
        ownerName: '张销售',
      },
    ],
    recentDiscussions: [
      {
        id: 'discussion-1',
        threadId: 'thread-1',
        targetObjectType: BusinessDiscussionTargetObjectType.Customer,
        targetObjectId: 'customer-1',
        targetTitle: '华南地铁集团',
        discussionType: BusinessDiscussionType.DecisionChain,
        body: '预算确认人需要销售总监同步跟进。',
        isKeyConclusion: true,
        createdAt: '2026-05-28T10:00:00.000Z',
      },
    ],
    recommendedActions: [
      {
        key: 'review-active-leads',
        intent: CustomerWorkspaceActionIntent.OpenLeads,
        title: '处理活跃线索',
        description: '当前有 1 条活跃线索需要推进。',
        targetObjectType: CustomerWorkspaceTargetObjectType.Lead,
        targetObjectId: 'lead-1',
        targetTitle: '智慧园区线索',
        priority: 10,
      },
      {
        key: 'advance-active-projects',
        intent: CustomerWorkspaceActionIntent.OpenProjectWorkspace,
        title: '推进进行中项目',
        description: '当前有 1 个进行中项目。',
        targetObjectType: CustomerWorkspaceTargetObjectType.Project,
        targetObjectId: 'project-1',
        targetTitle: '智慧园区项目',
        priority: 20,
      },
      {
        key: 'record-follow-up',
        intent: CustomerWorkspaceActionIntent.RecordFollowUp,
        title: '记录下一次跟进',
        description: '沿着最近一次客户沟通继续记录后续动作。',
        targetObjectType: CustomerWorkspaceTargetObjectType.Customer,
        targetObjectId: 'customer-1',
        targetTitle: '华南地铁集团',
        priority: 40,
      },
    ],
    timeline: [
      {
        key: 'discussion:discussion-1',
        eventType: CustomerWorkspaceTimelineEventType.DiscussionAdded,
        sourceType: CustomerWorkspaceTimelineSourceType.Discussion,
        sourceId: 'discussion-1',
        occurredAt: '2026-05-28T10:00:00.000Z',
        title: '华南地铁集团',
        description: '预算确认人需要销售总监同步跟进。',
        actorName: null,
        targetObjectType: CustomerWorkspaceTargetObjectType.Discussion,
        targetObjectId: 'discussion-1',
        targetTitle: '华南地铁集团',
        isKey: true,
      },
      {
        key: 'project:project-1',
        eventType: CustomerWorkspaceTimelineEventType.ProjectUpdated,
        sourceType: CustomerWorkspaceTimelineSourceType.Project,
        sourceId: 'project-1',
        occurredAt: '2026-05-28T10:00:00.000Z',
        title: '智慧园区项目',
        description: 'PRJ-2026-001 · active · handover',
        actorName: '张销售',
        targetObjectType: CustomerWorkspaceTargetObjectType.Project,
        targetObjectId: 'project-1',
        targetTitle: '智慧园区项目',
        isKey: true,
      },
    ],
    generatedAt: '2026-05-28T10:05:00.000Z',
    ...overrides,
  };
}

function idleAttachmentUploadProgress(): AttachmentUploadProgressState {
  return {
    phase: 'idle',
    operationType: null,
    sessionId: null,
    uploadMode: null,
    providerType: null,
    fileName: null,
    progressPercent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    message: '',
    canAbort: false,
    error: null,
  };
}

describe('CustomerWorkspace', () => {
  let fixture: ComponentFixture<CustomerWorkspace>;
  let component: CustomerWorkspace;
  let paramMap: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let queryParamMap: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routerMock: { navigate: jest.Mock };
  let selectedCustomer: ReturnType<typeof signal<CustomerDetailView | null>>;
  let aliases: ReturnType<typeof signal<CustomerAliasSummary[]>>;
  let customerWorkspaceOverview: ReturnType<typeof signal<CustomerWorkspaceOverviewView | null>>;
  let attachmentStoreMock: {
    attachments: ReturnType<typeof signal<AttachmentSummary[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    uploadProgress: ReturnType<typeof signal<AttachmentUploadProgressState>>;
    loadAttachments: jest.Mock;
    uploadAttachment: jest.Mock;
    abortCurrentUpload: jest.Mock;
    voidAttachment: jest.Mock;
    downloadAttachment: jest.Mock;
    clearAttachments: jest.Mock;
    clearUploadProgress: jest.Mock;
  };
  let salesFollowUpStoreMock: {
    followUps: ReturnType<typeof signal<SalesFollowUpRecordSummary[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    loadFollowUps: jest.Mock;
    createFollowUp: jest.Mock;
    replaceFollowUp: jest.Mock;
    voidFollowUp: jest.Mock;
    clearFollowUps: jest.Mock;
  };
  let salesIntelligenceStoreMock: {
    contacts: ReturnType<typeof signal<CustomerContactSummary[]>>;
    stakeholders: ReturnType<typeof signal<OpportunityStakeholderSummary[]>>;
    competitors: ReturnType<typeof signal<CompetitorIntelligenceRecordSummary[]>>;
    discoveryRecords: ReturnType<typeof signal<SalesDiscoveryRecordSummary[]>>;
    gaps: ReturnType<typeof signal<SalesIntelligenceGapSummary[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    loadContext: jest.Mock;
    clearContext: jest.Mock;
  };
  let businessDiscussionStoreMock: {
    comments: ReturnType<typeof signal<BusinessDiscussionCommentSummary[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    loadComments: jest.Mock;
    createComment: jest.Mock;
    clearComments: jest.Mock;
  };
  let customerStoreMock: {
    selectedCustomer: typeof selectedCustomer;
    aliases: typeof aliases;
    customerWorkspaceOverview: typeof customerWorkspaceOverview;
    loadingDetail: ReturnType<typeof signal<boolean>>;
    loadingWorkspaceOverview: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loadCustomer: jest.Mock;
    loadCustomerWorkspaceOverview: jest.Mock;
    updateCustomer: jest.Mock;
    createAlias: jest.Mock;
    deleteAlias: jest.Mock;
  };
  let confirmationService: ConfirmationService;
  let confirmationConfirmSpy: jest.SpyInstance;
  let canWriteCustomerPermission: WritableSignal<boolean>;

  beforeEach(async () => {
    canWriteCustomerPermission = signal(true);
    selectedCustomer = signal<CustomerDetailView | null>(null);
    aliases = signal<CustomerAliasSummary[]>([]);
    customerWorkspaceOverview = signal<CustomerWorkspaceOverviewView | null>(null);
    paramMap = new BehaviorSubject(convertToParamMap({ id: 'customer-1' }));
    queryParamMap = new BehaviorSubject(convertToParamMap({}));
    routerMock = { navigate: jest.fn().mockResolvedValue(true) };
    attachmentStoreMock = {
      attachments: signal<AttachmentSummary[]>([]),
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      uploadProgress: signal(idleAttachmentUploadProgress()),
      loadAttachments: jest.fn().mockResolvedValue([]),
      uploadAttachment: jest.fn(),
      abortCurrentUpload: jest.fn().mockResolvedValue(undefined),
      voidAttachment: jest.fn(),
      downloadAttachment: jest.fn(),
      clearAttachments: jest.fn(),
      clearUploadProgress: jest.fn(() => attachmentStoreMock.uploadProgress.set(idleAttachmentUploadProgress())),
    };
    salesFollowUpStoreMock = {
      followUps: signal<SalesFollowUpRecordSummary[]>([]),
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadFollowUps: jest.fn().mockResolvedValue([]),
      createFollowUp: jest.fn(),
      replaceFollowUp: jest.fn(),
      voidFollowUp: jest.fn(),
      clearFollowUps: jest.fn(),
    };
    salesIntelligenceStoreMock = {
      contacts: signal<CustomerContactSummary[]>([]),
      stakeholders: signal<OpportunityStakeholderSummary[]>([]),
      competitors: signal<CompetitorIntelligenceRecordSummary[]>([]),
      discoveryRecords: signal<SalesDiscoveryRecordSummary[]>([]),
      gaps: signal<SalesIntelligenceGapSummary[]>([]),
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadContext: jest.fn().mockResolvedValue(undefined),
      clearContext: jest.fn(),
    };
    businessDiscussionStoreMock = {
      comments: signal<BusinessDiscussionCommentSummary[]>([]),
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadComments: jest.fn().mockResolvedValue([]),
      createComment: jest.fn(),
      clearComments: jest.fn(),
    };
    const dictionaryStoreMock = {
      items: signal([]),
      activeItems: signal([]),
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadItems: jest.fn().mockResolvedValue([]),
      clearItems: jest.fn(),
    };
    customerStoreMock = {
      selectedCustomer,
      aliases,
      customerWorkspaceOverview,
      loadingDetail: signal(false),
      loadingWorkspaceOverview: signal(false),
      saving: signal(false),
      loadCustomer: jest.fn().mockImplementation(async (id: string) => {
        const detail = createCustomerDetail({ id });
        selectedCustomer.set(detail);
        aliases.set(detail.aliases);
        return detail;
      }),
      loadCustomerWorkspaceOverview: jest.fn().mockImplementation(async (id: string) => {
        const overview = createCustomerWorkspaceOverview({ customerId: id });
        customerWorkspaceOverview.set(overview);
        return overview;
      }),
      updateCustomer: jest.fn().mockResolvedValue(createCustomerDetail()),
      createAlias: jest.fn().mockResolvedValue(createAlias()),
      deleteAlias: jest.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [CustomerWorkspace],
      providers: [
        {
          provide: AuthStore,
          useValue: {
            hasAnyPermission: jest.fn(
              (permissions: readonly string[]) =>
                permissions.includes('customer:write') && canWriteCustomerPermission(),
            ),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap.asObservable(),
            queryParamMap: queryParamMap.asObservable(),
          },
        },
        {
          provide: Router,
          useValue: routerMock,
        },
        {
          provide: ConfirmationService,
          useClass: ConfirmationService,
        },
        {
          provide: DictionaryStore,
          useValue: dictionaryStoreMock,
        },
      ],
    })
      .overrideComponent(CustomerWorkspace, {
        set: {
          providers: [
            {
              provide: CustomerStore,
              useValue: customerStoreMock,
            },
          ],
        },
      })
      .overrideComponent(AttachmentPanel, {
        set: {
          template: '<section>{{ title }}</section>',
          providers: [
            {
              provide: AttachmentStore,
              useValue: attachmentStoreMock,
            },
          ],
        },
      })
      .overrideComponent(AuditHistoryPanel, {
        set: {
          template: '<button type="button">编辑历史</button>',
          providers: [
            {
              provide: AuditHistoryStore,
              useValue: {
                records: signal([]),
                loading: signal(false),
                error: signal(null),
                loadEntityAuditLogs: jest.fn().mockResolvedValue([]),
                clear: jest.fn(),
              },
            },
          ],
        },
      })
      .overrideComponent(SalesFollowUpPanel, {
        set: {
          template: '<section>{{ title }}</section>',
          providers: [
            {
              provide: SalesFollowUpStore,
              useValue: salesFollowUpStoreMock,
            },
          ],
        },
      })
      .overrideComponent(SalesIntelligencePanel, {
        set: {
          template: '<section>{{ title }}</section>',
          providers: [
            {
              provide: SalesIntelligenceStore,
              useValue: salesIntelligenceStoreMock,
            },
          ],
        },
      })
      .overrideComponent(BusinessDiscussionPanel, {
        set: {
          template: '<section>{{ title }}</section>',
          providers: [
            {
              provide: BusinessDiscussionStore,
              useValue: businessDiscussionStoreMock,
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CustomerWorkspace);
    confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    confirmationConfirmSpy = jest.spyOn(confirmationService, 'confirm');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads the customer workspace from the route id', () => {
    const text = fixture.nativeElement.textContent;

    expect(customerStoreMock.loadCustomer).toHaveBeenCalledWith('customer-1');
    expect(customerStoreMock.loadCustomerWorkspaceOverview).toHaveBeenCalledWith('customer-1');
    expect(text).toContain('华南地铁集团');
    expect(text).toContain('经营工作台');
    expect(text).toContain('下一步动作');
    expect(text).toContain('经营事实');
    expect(text).toContain('处理活跃线索');
    expect(text).toContain('客户动态');
    expect(text).toContain('项目推进');
    expect(text).toContain('智慧园区线索');
    expect(text).toContain('智慧园区项目');
    expect(text).toContain('确认预算窗口');
    expect(text).toContain('预算确认人需要销售总监同步跟进。');
    expect(text).toContain('客户档案');
    expect(text).toContain('客户关系');
    expect(text).toContain('客户附件');
    expect(text).not.toContain('客户销售情报');
    expect(attachmentStoreMock.loadAttachments).toHaveBeenCalledWith({
      targetType: AttachmentTargetType.Customer,
      targetId: 'customer-1',
    });
    expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
      customerId: 'customer-1',
      leadId: undefined,
      projectId: undefined,
      lifecycleScope: SalesFollowUpRecordLifecycleScope.Active,
    });
    expect(salesIntelligenceStoreMock.loadContext).toHaveBeenCalledWith('customer-1', {
      leadId: undefined,
      projectId: undefined,
    });
    expect(businessDiscussionStoreMock.loadComments).toHaveBeenCalledWith({
      customerId: 'customer-1',
      leadId: undefined,
      projectId: undefined,
    });
  });

  it('passes customer write permission to contact maintenance', async () => {
    const panel = fixture.debugElement.query(By.directive(SalesIntelligencePanel))
      .componentInstance as SalesIntelligencePanel;

    expect(panel.canWriteCustomerContact).toBe(true);

    canWriteCustomerPermission.set(false);
    await fixture.whenStable();

    expect(panel.canWriteCustomerContact).toBe(false);
  });

  it('keeps sales follow-up reminder context in the customer workspace', async () => {
    queryParamMap.next(convertToParamMap({ followUpId: 'follow-up-1', todoId: 'todo-1' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.followUpReminderEntry()).toEqual({ followUpId: 'follow-up-1', todoId: 'todo-1' });
    expect(fixture.nativeElement.textContent).toContain('从销售跟进待办进入');
  });

  it('maps workspace actions and timeline items to existing routes', () => {
    component.executeWorkspaceAction(createCustomerWorkspaceOverview().recommendedActions[1]);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/projects', 'project-1', 'workspace']);

    component.openTimelineItem(createCustomerWorkspaceOverview().timeline[1]);
    expect(routerMock.navigate).toHaveBeenLastCalledWith(['/projects', 'project-1', 'workspace']);
  });

  it('shows a deletion action only for writable non-primary aliases', async () => {
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[aria-label="删除客户别名 华南地铁"]')).not.toBeNull();

    const customer = createCustomerDetail({ status: CustomerStatus.Merged });
    expect(component.canDeleteAlias(customer, createAlias())).toBe(false);
    expect(component.canDeleteAlias(createCustomerDetail(), createAlias({ isPrimary: true }))).toBe(false);
  });

  it('hides deletion actions without customer write permission', async () => {
    canWriteCustomerPermission.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[aria-label="删除客户别名 华南地铁"]')).toBeNull();
    expect(component.canDeleteAlias(createCustomerDetail(), createAlias())).toBe(false);
  });

  it('requires explicit confirmation before deleting an alias', async () => {
    const customer = createCustomerDetail();
    const alias = createAlias();

    component.confirmDeleteAlias(customer, alias);

    expect(confirmationConfirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        header: '删除客户别名',
        message: '确定删除客户别名“华南地铁”吗？删除后不再用于客户名称匹配，操作不可撤销。',
      }),
    );

    const confirmation = confirmationConfirmSpy.mock.calls[0][0] as Confirmation;
    confirmation.accept?.();
    await fixture.whenStable();

    expect(customerStoreMock.deleteAlias).toHaveBeenCalledWith('customer-1', 'alias-1');
    expect(component.deletingAliasId()).toBeNull();
  });

  it('keeps the alias visible and exposes a retryable error when deletion fails', async () => {
    customerStoreMock.deleteAlias.mockRejectedValueOnce(new Error('conflict'));

    await component.deleteAlias('customer-1', 'alias-1');

    expect(aliases().map(alias => alias.id)).toContain('alias-1');
    expect(component.aliasError()).toContain('请刷新后重试');
    expect(component.deletingAliasId()).toBeNull();
  });
});
