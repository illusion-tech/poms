import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import {
    AttachmentStore,
    AttachmentTargetType,
    AuditHistoryStore,
    AuthStore,
    BusinessDiscussionTargetObjectType,
    BusinessDiscussionType,
    BusinessDiscussionStore,
    ContractStatus,
    CustomerAliasType,
    CustomerStatus,
    CustomerStore,
    DictionaryStore,
    LeadRating,
    LeadStatus,
    LeadUrgency,
    ProjectStage,
    ProjectStatus,
    SalesFollowUpOutcome,
    SalesFollowUpRecordLifecycleScope,
    SalesFollowUpStore,
    SalesIntelligenceStore,
    type AttachmentSummary,
    type AttachmentUploadProgressState,
    type BusinessDiscussionCommentSummary,
    type CompetitorIntelligenceRecordSummary,
    type CustomerAliasSummary,
    type CustomerContactSummary,
    type CustomerDetailView,
    type CustomerWorkspaceOverviewView,
    type OpportunityStakeholderSummary,
    type SalesDiscoveryRecordSummary,
    type SalesFollowUpRecordSummary,
    type SalesIntelligenceGapSummary
} from '@poms/admin-data-access';
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
        ...overrides
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
        ...overrides
    };
}

function createCustomerWorkspaceOverview(overrides: Partial<CustomerWorkspaceOverviewView> = {}): CustomerWorkspaceOverviewView {
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
            latestDiscussionAt: '2026-05-28T10:00:00.000Z'
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
                updatedAt: '2026-05-27T09:30:00.000Z'
            }
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
                updatedAt: '2026-05-28T10:00:00.000Z'
            }
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
                updatedAt: '2026-05-28T10:00:00.000Z'
            }
        ],
        recentFollowUps: [
            {
                id: 'follow-up-1',
                summary: '确认预算窗口',
                outcome: SalesFollowUpOutcome.Progress,
                occurredAt: '2026-05-27T09:30:00.000Z',
                nextFollowUpAt: '2026-06-01T09:30:00.000Z',
                ownerName: '张销售'
            }
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
                createdAt: '2026-05-28T10:00:00.000Z'
            }
        ],
        generatedAt: '2026-05-28T10:05:00.000Z',
        ...overrides
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
        error: null
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
    };

    beforeEach(async () => {
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
            clearUploadProgress: jest.fn(() => attachmentStoreMock.uploadProgress.set(idleAttachmentUploadProgress()))
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
            clearFollowUps: jest.fn()
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
            clearContext: jest.fn()
        };
        businessDiscussionStoreMock = {
            comments: signal<BusinessDiscussionCommentSummary[]>([]),
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadComments: jest.fn().mockResolvedValue([]),
            createComment: jest.fn(),
            clearComments: jest.fn()
        };
        const dictionaryStoreMock = {
            items: signal([]),
            activeItems: signal([]),
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadItems: jest.fn().mockResolvedValue([]),
            clearItems: jest.fn()
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
            createAlias: jest.fn().mockResolvedValue(createAlias())
        };

        await TestBed.configureTestingModule({
            imports: [CustomerWorkspace],
            providers: [
                {
                    provide: AuthStore,
                    useValue: {
                        hasAnyPermission: jest.fn((permissions: readonly string[]) => permissions.includes('customer:write'))
                    }
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: paramMap.asObservable(),
                        queryParamMap: queryParamMap.asObservable()
                    }
                },
                {
                    provide: Router,
                    useValue: routerMock
                },
                {
                    provide: DictionaryStore,
                    useValue: dictionaryStoreMock
                }
            ]
        })
            .overrideComponent(CustomerWorkspace, {
                set: {
                    providers: [
                        {
                            provide: CustomerStore,
                            useValue: customerStoreMock
                        }
                    ]
                }
            })
            .overrideComponent(AttachmentPanel, {
                set: {
                    template: '<section>{{ title }}</section>',
                    providers: [
                        {
                            provide: AttachmentStore,
                            useValue: attachmentStoreMock
                        }
                    ]
                }
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
                                clear: jest.fn()
                            }
                        }
                    ]
                }
            })
            .overrideComponent(SalesFollowUpPanel, {
                set: {
                    template: '<section>{{ title }}</section>',
                    providers: [
                        {
                            provide: SalesFollowUpStore,
                            useValue: salesFollowUpStoreMock
                        }
                    ]
                }
            })
            .overrideComponent(SalesIntelligencePanel, {
                set: {
                    template: '<section>{{ title }}</section>',
                    providers: [
                        {
                            provide: SalesIntelligenceStore,
                            useValue: salesIntelligenceStoreMock
                        }
                    ]
                }
            })
            .overrideComponent(BusinessDiscussionPanel, {
                set: {
                    template: '<section>{{ title }}</section>',
                    providers: [
                        {
                            provide: BusinessDiscussionStore,
                            useValue: businessDiscussionStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(CustomerWorkspace);
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
        expect(text).toContain('经营概览');
        expect(text).toContain('智慧园区线索');
        expect(text).toContain('智慧园区项目');
        expect(text).toContain('确认预算窗口');
        expect(text).toContain('预算确认人需要销售总监同步跟进。');
        expect(text).toContain('客户关系');
        expect(text).not.toContain('客户销售情报');
        expect(attachmentStoreMock.loadAttachments).toHaveBeenCalledWith({
            targetType: AttachmentTargetType.Customer,
            targetId: 'customer-1'
        });
        expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: undefined,
            projectId: undefined,
            lifecycleScope: SalesFollowUpRecordLifecycleScope.Active
        });
        expect(salesIntelligenceStoreMock.loadContext).toHaveBeenCalledWith('customer-1', {
            leadId: undefined,
            projectId: undefined
        });
        expect(businessDiscussionStoreMock.loadComments).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: undefined,
            projectId: undefined
        });
    });

    it('keeps sales follow-up reminder context in the customer workspace', async () => {
        queryParamMap.next(convertToParamMap({ followUpId: 'follow-up-1', todoId: 'todo-1' }));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.followUpReminderEntry()).toEqual({ followUpId: 'follow-up-1', todoId: 'todo-1' });
        expect(fixture.nativeElement.textContent).toContain('从销售跟进待办进入');
    });
});
