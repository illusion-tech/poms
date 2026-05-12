import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import {
    AuditHistoryStore,
    AttachmentStore,
    AttachmentTargetType,
    AuthStore,
    BusinessDiscussionStore,
    CustomerAliasType,
    CustomerStatus,
    CustomerStore,
    DictionaryStore,
    SalesIntelligenceStore,
    SalesFollowUpRecordLifecycleScope,
    SalesFollowUpStore,
    type AttachmentUploadProgressState,
    type AttachmentSummary,
    type BusinessDiscussionCommentSummary,
    type CustomerAliasSummary,
    type CustomerContactSummary,
    type CustomerDetailView,
    type CustomerListView,
    type SalesIntelligenceGapSummary,
    type OpportunityStakeholderSummary,
    type CompetitorIntelligenceRecordSummary,
    type SalesDiscoveryRecordSummary,
    type SalesFollowUpRecordSummary
} from '@poms/admin-data-access';
import { BehaviorSubject } from 'rxjs';
import { AuditHistoryPanel } from '../../shared/ui/audit-history-panel';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { BusinessDiscussionPanel } from '../../shared/ui/business-discussion-panel';
import { SalesFollowUpPanel } from '../../shared/ui/sales-follow-up-panel';
import { SalesIntelligencePanel } from '../../shared/ui/sales-intelligence-panel';
import { CustomerList } from './customer-list';

function createCustomer(overrides: Partial<CustomerListView> = {}): CustomerListView {
    return {
        id: 'customer-1',
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

function createCustomerDetail(overrides: Partial<CustomerDetailView> = {}): CustomerDetailView {
    const base = createCustomer(overrides);
    return {
        ...base,
        aliases: [createAlias({ customerId: base.id })],
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

describe('CustomerList', () => {
    let fixture: ComponentFixture<CustomerList>;
    let component: CustomerList;
    let queryParamMap: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let routerMock: { navigate: jest.Mock };
    let customers: ReturnType<typeof signal<CustomerListView[]>>;
    let selectedCustomer: ReturnType<typeof signal<CustomerDetailView | null>>;
    let aliases: ReturnType<typeof signal<CustomerAliasSummary[]>>;
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
        customers: typeof customers;
        selectedCustomer: typeof selectedCustomer;
        aliases: typeof aliases;
        loading: ReturnType<typeof signal<boolean>>;
        loadingDetail: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        activeCustomerCount: ReturnType<typeof computed<number>>;
        inactiveCustomerCount: ReturnType<typeof computed<number>>;
        loadCustomers: jest.Mock;
        loadCustomer: jest.Mock;
        clearSelectedCustomer: jest.Mock;
        createCustomer: jest.Mock;
        updateCustomer: jest.Mock;
        createAlias: jest.Mock;
    };

    beforeEach(async () => {
        customers = signal<CustomerListView[]>([createCustomer()]);
        selectedCustomer = signal<CustomerDetailView | null>(null);
        aliases = signal<CustomerAliasSummary[]>([]);
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
            customers,
            selectedCustomer,
            aliases,
            loading: signal(false),
            loadingDetail: signal(false),
            saving: signal(false),
            activeCustomerCount: computed(() => customers().filter((customer) => customer.status === CustomerStatus.Active).length),
            inactiveCustomerCount: computed(() => customers().filter((customer) => customer.status === CustomerStatus.Inactive).length),
            loadCustomers: jest.fn().mockResolvedValue(customers()),
            loadCustomer: jest.fn().mockImplementation(async (id: string) => {
                const detail = createCustomerDetail({ id });
                selectedCustomer.set(detail);
                aliases.set(detail.aliases);
                return detail;
            }),
            clearSelectedCustomer: jest.fn(() => {
                selectedCustomer.set(null);
                aliases.set([]);
            }),
            createCustomer: jest.fn(),
            updateCustomer: jest.fn(),
            createAlias: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [CustomerList],
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
            .overrideComponent(CustomerList, {
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

        fixture = TestBed.createComponent(CustomerList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads customer attachments from the selected customer detail context', async () => {
        await component.openDetail(createCustomer());
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('客户附件');
        expect(text).toContain('保存客户资质、开票资料、采购制度、框架协议和长期合作资料。');
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

    it('opens customer detail from a sales follow-up reminder query', async () => {
        queryParamMap.next(convertToParamMap({ customerId: 'customer-1', followUpId: 'follow-up-1', todoId: 'todo-1' }));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(customerStoreMock.loadCustomer).toHaveBeenCalledWith('customer-1');
        expect(component.detailDialogVisible).toBe(true);
        expect(component.followUpReminderEntry()).toEqual({ followUpId: 'follow-up-1', todoId: 'todo-1' });
        expect(fixture.nativeElement.textContent).toContain('从销售跟进待办进入');

        component.clearDetail();

        expect(routerMock.navigate).toHaveBeenCalledWith(
            [],
            expect.objectContaining({
                queryParams: {
                    customerId: null,
                    followUpId: null,
                    todoId: null
                },
                queryParamsHandling: 'merge',
                replaceUrl: true
            })
        );
    });
});
