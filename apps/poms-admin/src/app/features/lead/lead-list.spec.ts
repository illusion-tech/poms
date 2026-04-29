import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
    AuthStore,
    CustomerStatus,
    CustomerStore,
    LeadStore,
    PlatformStore,
    SalesFollowUpStore,
    type CustomerListView,
    type LeadDetailView,
    type LeadListView,
    type LeadSourceSummary,
    type OwnerReferenceOrgUnit,
    type OwnerReferenceUser,
    type ProjectSummary,
    type SalesFollowUpRecordSummary,
    type SanitizedUserWithOrgUnits
} from '@poms/admin-data-access';
import { LeadList } from './lead-list';

function createCustomer(overrides: Partial<CustomerListView> = {}): CustomerListView {
    return {
        id: 'customer-1',
        customerNo: 'CUST-2026-001',
        displayName: '华南地铁集团',
        legalName: null,
        shortName: null,
        status: CustomerStatus.Active,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        sourceChannel: null,
        remark: null,
        mergedIntoCustomerId: null,
        leadCount: 1,
        projectCount: 1,
        contractCount: 0,
        rowVersion: 1,
        createdAt: '2026-04-25T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createLead(overrides: Partial<LeadListView> = {}): LeadListView {
    return {
        id: 'lead-1',
        leadNo: 'L-2026-001',
        leadName: '华南地铁线索',
        customerId: 'customer-1',
        customerName: '华南地铁集团',
        sourceId: 'source-1',
        sourceName: '客户拜访',
        sourceChannel: '客户拜访',
        demandDescription: '客户计划建设地铁运维数字化平台。',
        budgetStatus: 'budget-confirmed',
        estimatedAmount: '1000000.00',
        urgency: 'high',
        expectedDecisionDate: '2026-05-01',
        status: 'registered',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        qualifiedAt: null,
        convertedProjectId: null,
        createdAt: '2026-04-25T09:00:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z',
        ...overrides
    };
}

function createLeadSource(overrides: Partial<LeadSourceSummary> = {}): LeadSourceSummary {
    return {
        id: 'source-1',
        code: 'customer-visit',
        name: '客户拜访',
        description: '客户现场拜访',
        status: 'active',
        sortOrder: 10,
        usageCount: 1,
        rowVersion: 1,
        createdAt: '2026-04-25T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createLeadDetail(overrides: Partial<LeadDetailView> = {}): LeadDetailView {
    const base = createLead(overrides);
    return {
        ...base,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        qualificationSummary: null,
        qualifiedBy: null,
        closedReason: null,
        closedAt: null,
        closedBy: null,
        convertedAt: null,
        convertedBy: null,
        rowVersion: 1,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        sourceSummary: '客户拜访',
        convertedProjectSummary: null,
        ...overrides
    };
}

function createProjectSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '华南地铁项目',
        sourceLeadId: 'lead-1',
        customerId: 'customer-1',
        customerName: '华南地铁集团',
        customerProjectNo: null,
        status: 'active',
        currentStage: 'assessment',
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        plannedSignAt: null,
        closedAt: null,
        closedReason: null,
        rowVersion: 1,
        createdAt: '2026-04-25T10:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T10:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createFollowUp(overrides: Partial<SalesFollowUpRecordSummary> = {}): SalesFollowUpRecordSummary {
    return {
        id: 'follow-up-1',
        customerId: 'customer-1',
        customerName: '华南地铁集团',
        leadId: 'lead-1',
        leadName: '华南地铁线索',
        projectId: null,
        projectName: null,
        followUpType: 'meeting' as SalesFollowUpRecordSummary['followUpType'],
        occurredAt: '2026-04-25T10:00:00.000Z',
        summary: '完成预算口径确认',
        detail: '客户确认预算口径，等待内部排期。',
        outcome: 'progress' as SalesFollowUpRecordSummary['outcome'],
        nextFollowUpAt: '2026-04-26T02:00:00.000Z',
        ownerOrgId: 'org-1',
        ownerOrgName: '华南销售一部',
        ownerUserId: 'user-1',
        ownerName: '张销售',
        rowVersion: 1,
        createdAt: '2026-04-25T10:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T10:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createPlatformUser(overrides: Partial<OwnerReferenceUser> = {}): OwnerReferenceUser {
    return {
        id: 'user-1',
        displayName: '张销售',
        isActive: true,
        primaryOrgUnitId: 'org-1',
        primaryOrgUnitName: '华南销售一部',
        ...overrides
    };
}

function createOrgUnit(overrides: Partial<OwnerReferenceOrgUnit> = {}): OwnerReferenceOrgUnit {
    return {
        id: 'org-1',
        name: '华南销售一部',
        code: 'SALES-SOUTH-1',
        isActive: true,
        ...overrides
    };
}

describe('LeadList', () => {
    let fixture: ComponentFixture<LeadList>;
    let component: LeadList;
    let leads: ReturnType<typeof signal<LeadListView[]>>;
    let leadSources: ReturnType<typeof signal<LeadSourceSummary[]>>;
    let selectedLead: ReturnType<typeof signal<LeadDetailView | null>>;
    let followUps: ReturnType<typeof signal<SalesFollowUpRecordSummary[]>>;
    let canWriteLead: ReturnType<typeof signal<boolean>>;
    let routerMock: { navigate: jest.Mock };
    let ownerUsers: ReturnType<typeof signal<OwnerReferenceUser[]>>;
    let ownerOrgUnits: ReturnType<typeof signal<OwnerReferenceOrgUnit[]>>;
    let customers: ReturnType<typeof signal<CustomerListView[]>>;
    let leadStoreMock: {
        leads: ReturnType<typeof signal<LeadListView[]>>;
        leadSources: ReturnType<typeof signal<LeadSourceSummary[]>>;
        selectedLead: ReturnType<typeof signal<LeadDetailView | null>>;
        loading: ReturnType<typeof signal<boolean>>;
        loadingSources: ReturnType<typeof signal<boolean>>;
        loadingDetail: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loadedSources: ReturnType<typeof signal<boolean>>;
        registeredLeadCount: ReturnType<typeof computed<number>>;
        qualifiedLeadCount: ReturnType<typeof computed<number>>;
        convertedLeadCount: ReturnType<typeof computed<number>>;
        closedLeadCount: ReturnType<typeof computed<number>>;
        loadLeads: jest.Mock;
        loadLeadSources: jest.Mock;
        loadLead: jest.Mock;
        createLead: jest.Mock;
        createLeadSource: jest.Mock;
        updateLeadSource: jest.Mock;
        qualifyLead: jest.Mock;
        closeLead: jest.Mock;
        convertLeadToProject: jest.Mock;
        clearSelectedLead: jest.Mock;
    };
    let platformStoreMock: {
        ownerUsers: ReturnType<typeof signal<OwnerReferenceUser[]>>;
        ownerOrgUnits: ReturnType<typeof signal<OwnerReferenceOrgUnit[]>>;
        loadingOwnerReferenceData: ReturnType<typeof signal<boolean>>;
        loadedOwnerReferenceData: ReturnType<typeof signal<boolean>>;
        loadOwnerReferenceData: jest.Mock;
    };
    let customerStoreMock: {
        activeCustomers: ReturnType<typeof computed<CustomerListView[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadCustomers: jest.Mock;
    };
    let salesFollowUpStoreMock: {
        followUps: ReturnType<typeof signal<SalesFollowUpRecordSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadFollowUps: jest.Mock;
        createFollowUp: jest.Mock;
        clearFollowUps: jest.Mock;
    };

    beforeEach(async () => {
        leads = signal([createLead()]);
        leadSources = signal([createLeadSource(), createLeadSource({ id: 'source-2', code: 'customer-referral', name: '老客户转介绍', usageCount: 0 })]);
        selectedLead = signal<LeadDetailView | null>(null);
        followUps = signal<SalesFollowUpRecordSummary[]>([createFollowUp()]);
        canWriteLead = signal(true);
        ownerUsers = signal<OwnerReferenceUser[]>([createPlatformUser(), createPlatformUser({ id: 'user-2', displayName: '李经理', primaryOrgUnitId: 'org-2', primaryOrgUnitName: '华东销售部' })]);
        ownerOrgUnits = signal<OwnerReferenceOrgUnit[]>([createOrgUnit(), createOrgUnit({ id: 'org-2', name: '华东销售部', code: 'SALES-EAST' })]);
        customers = signal<CustomerListView[]>([createCustomer(), createCustomer({ id: 'customer-2', customerNo: 'CUST-2026-002', displayName: '城市交通集团' })]);
        routerMock = { navigate: jest.fn() };
        leadStoreMock = {
            leads,
            leadSources,
            selectedLead,
            loading: signal(false),
            loadingSources: signal(false),
            loadingDetail: signal(false),
            saving: signal(false),
            loadedSources: signal(true),
            registeredLeadCount: computed(() => leads().filter((lead) => lead.status === 'registered').length),
            qualifiedLeadCount: computed(() => leads().filter((lead) => lead.status === 'qualified').length),
            convertedLeadCount: computed(() => leads().filter((lead) => lead.status === 'converted').length),
            closedLeadCount: computed(() => leads().filter((lead) => lead.status === 'closed').length),
            loadLeads: jest.fn().mockResolvedValue(leads()),
            loadLeadSources: jest.fn().mockResolvedValue(leadSources()),
            loadLead: jest.fn().mockImplementation(async () => {
                const detail = createLeadDetail();
                selectedLead.set(detail);
                return detail;
            }),
            createLead: jest.fn().mockResolvedValue(createLead()),
            createLeadSource: jest.fn().mockResolvedValue(createLeadSource()),
            updateLeadSource: jest.fn().mockResolvedValue(createLeadSource({ status: 'inactive' })),
            qualifyLead: jest.fn().mockResolvedValue(createLead({ status: 'qualified' })),
            closeLead: jest.fn().mockResolvedValue(createLead({ status: 'closed' })),
            convertLeadToProject: jest.fn().mockResolvedValue(createProjectSummary()),
            clearSelectedLead: jest.fn()
        };
        platformStoreMock = {
            ownerUsers,
            ownerOrgUnits,
            loadingOwnerReferenceData: signal(false),
            loadedOwnerReferenceData: signal(true),
            loadOwnerReferenceData: jest.fn().mockResolvedValue({ users: ownerUsers(), orgUnits: ownerOrgUnits() })
        };
        customerStoreMock = {
            activeCustomers: computed(() => customers().filter((customer) => customer.status === 'active')),
            loading: signal(false),
            loaded: signal(false),
            loadCustomers: jest.fn().mockResolvedValue(customers())
        };
        salesFollowUpStoreMock = {
            followUps,
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadFollowUps: jest.fn().mockResolvedValue(followUps()),
            createFollowUp: jest.fn().mockResolvedValue(createFollowUp()),
            clearFollowUps: jest.fn(() => followUps.set([]))
        };

        await TestBed.configureTestingModule({
            imports: [LeadList],
            providers: [
                {
                    provide: AuthStore,
                    useValue: {
                        currentUser: signal<SanitizedUserWithOrgUnits | null>({
                            id: 'user-1',
                            displayName: '张销售',
                            username: 'sales_rep',
                            roles: ['销售人员'],
                            permissions: ['nav:leads:view', 'lead:read', 'lead:write', 'lead:source:manage'],
                            email: 'sales@example.com',
                            avatarUrl: null,
                            isActive: true,
                            lastLoginAt: null,
                            emailVerified: false,
                            phoneVerified: false,
                            phone: null,
                            orgUnits: [
                                {
                                    id: 'org-1',
                                    name: '华南销售一部',
                                    code: 'SALES-SOUTH-1',
                                    description: null,
                                    membershipType: 'primary' as SanitizedUserWithOrgUnits['orgUnits'][number]['membershipType']
                                }
                            ]
                        }),
                        initialize: jest.fn(),
                        isAuthenticated: () => true,
                        hasAnyPermission: jest.fn((permissions: readonly string[]) => permissions.some((permission) => (permission === 'lead:write' ? canWriteLead() : permission === 'lead:source:manage')))
                    }
                },
                {
                    provide: Router,
                    useValue: routerMock
                },
                {
                    provide: PlatformStore,
                    useValue: platformStoreMock
                }
            ]
        })
            .overrideComponent(LeadList, {
                set: {
                    providers: [
                        {
                            provide: LeadStore,
                            useValue: leadStoreMock
                        },
                        {
                            provide: CustomerStore,
                            useValue: customerStoreMock
                        },
                        {
                            provide: SalesFollowUpStore,
                            useValue: salesFollowUpStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(LeadList);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('renders lead list facts from LeadListView', () => {
        const text = fixture.nativeElement.textContent;

        expect(leadStoreMock.loadLeads).toHaveBeenCalled();
        expect(text).toContain('华南地铁线索');
        expect(text).toContain('华南地铁集团');
        expect(text).toContain('客户拜访');
        expect(text).toContain('张销售');
        expect(text).toContain('待确认');
    });

    it('loads shared sales follow-up records when opening a lead detail', async () => {
        await component.openLeadDetail(createLead());

        expect(salesFollowUpStoreMock.clearFollowUps).toHaveBeenCalled();
        expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: undefined
        });
    });

    it('includes the converted project anchor when loading follow-ups for converted leads', async () => {
        const convertedLead = createLeadDetail({
            status: 'converted',
            convertedProjectId: 'project-1',
            convertedProjectSummary: createProjectSummary()
        });
        leadStoreMock.loadLead.mockImplementationOnce(async () => {
            selectedLead.set(convertedLead);
            return convertedLead;
        });

        await component.openLeadDetail(createLead({ status: 'converted', convertedProjectId: 'project-1' }));

        expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: 'project-1'
        });
    });

    it('creates a lead with the generated request shape', async () => {
        component.showCreateDialog();
        component.updateCreateField('leadName', '  城市交通机会  ');
        component.updateCreateCustomer('customer-2');
        component.updateCreateSource('source-2');
        component.updateCreateField('demandDescription', '  客户需要补强枢纽站安防系统。  ');
        component.updateCreateBudgetStatus('budget-confirmed');
        component.updateCreateField('estimatedAmount', '  2500000.00  ');
        component.updateCreateUrgency('critical');
        component.updateCreateExpectedDecisionDate(new Date(2026, 5, 1));

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith({
            leadName: '城市交通机会',
            customerId: 'customer-2',
            sourceId: 'source-2',
            demandDescription: '客户需要补强枢纽站安防系统。',
            budgetStatus: 'budget-confirmed',
            estimatedAmount: '2500000.00',
            urgency: 'critical',
            expectedDecisionDate: '2026-06-01',
            ownerUserId: 'user-1',
            ownerOrgId: 'org-1'
        });
        expect(customerStoreMock.loadCustomers).toHaveBeenCalledWith({ status: CustomerStatus.Active });
        expect(leadStoreMock.loadLeadSources).toHaveBeenCalled();
    });

    it('records project-context follow-up after a lead has been converted', async () => {
        const convertedLead = createLeadDetail({
            status: 'converted',
            convertedProjectId: 'project-1',
            convertedProjectSummary: createProjectSummary()
        });
        selectedLead.set(convertedLead);
        const occurredAt = new Date('2026-04-25T10:00:00.000Z');
        const nextFollowUpAt = new Date('2026-04-26T02:00:00.000Z');

        component.showFollowUpDialog(convertedLead);
        component.updateFollowUpDate('occurredAt', occurredAt);
        component.updateFollowUpText('summary', '  完成范围确认  ');
        component.updateFollowUpText('detail', '  客户确认先按一期范围推进。  ');
        component.updateFollowUpOutcome('risk-discovered');
        component.updateFollowUpDate('nextFollowUpAt', nextFollowUpAt);
        await component.createFollowUp();

        expect(salesFollowUpStoreMock.createFollowUp).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: null,
            projectId: 'project-1',
            followUpType: 'meeting',
            occurredAt: occurredAt.toISOString(),
            summary: '完成范围确认',
            detail: '客户确认先按一期范围推进。',
            outcome: 'risk-discovered',
            nextFollowUpAt: nextFollowUpAt.toISOString()
        });
        expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: 'project-1'
        });
    });

    it('updates the selected sales owner and defaults the owner org from the chosen user', async () => {
        component.showCreateDialog();
        component.updateCreateField('leadName', '城市交通机会');
        component.updateCreateCustomer('customer-1');
        component.updateCreateSource('source-1');
        component.updateCreateField('demandDescription', '客户需要补强枢纽站安防系统。');
        component.updateCreateOwnerUser('user-2');

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerUserId: 'user-2',
                ownerOrgId: 'org-2'
            })
        );
    });

    it('creates a managed lead source option', async () => {
        component.showSourceDialog();
        component.updateSourceField('code', '  partner-referral  ');
        component.updateSourceField('name', '  合作伙伴推荐  ');
        component.updateSourceField('description', '  合作伙伴渠道  ');
        component.updateSourceSortOrder(20);

        await component.createLeadSource();

        expect(leadStoreMock.createLeadSource).toHaveBeenCalledWith({
            code: 'partner-referral',
            name: '合作伙伴推荐',
            description: '合作伙伴渠道',
            sortOrder: 20
        });
    });

    it('does not expose write actions when the user only has read access', () => {
        canWriteLead.set(false);
        fixture.detectChanges();
        const buttonText = Array.from(fixture.nativeElement.querySelectorAll('button'))
            .map((button) => (button as HTMLButtonElement).textContent ?? '')
            .join(' ');

        expect(fixture.nativeElement.textContent).toContain('当前账号只能查看线索。');
        expect(buttonText).not.toContain('登记线索');
        expect(buttonText).not.toContain('确认有效');
        expect(buttonText).not.toContain('关闭线索');
    });

    it('qualifies a registered lead with a business explanation', async () => {
        const lead = createLead();

        component.showQualifyDialog(lead);
        component.qualificationSummary.set('客户预算明确，已确认采购意向。');
        await component.qualifyLead();

        expect(leadStoreMock.qualifyLead).toHaveBeenCalledWith('lead-1', {
            qualificationSummary: '客户预算明确，已确认采购意向。'
        });
    });

    it('converts a qualified lead into a project and navigates to the created project', async () => {
        const lead = createLead({ status: 'qualified' });

        component.showConvertDialog(lead);
        fixture.detectChanges();
        component.updateConvertField('customerProjectNo', '  CUS-PRJ-NEW  ');
        component.updateConvertField('projectName', '  城市交通项目  ');
        component.updateConvertDate(new Date(2026, 4, 1));
        await component.convertLeadToProject();

        expect(leadStoreMock.convertLeadToProject).toHaveBeenCalledWith('lead-1', {
            customerProjectNo: 'CUS-PRJ-NEW',
            projectName: '城市交通项目',
            plannedSignAt: '2026-05-01'
        });
        expect(routerMock.navigate).toHaveBeenCalledWith(['/projects', 'project-1']);
    });

    it('does not expose project conversion for registered or converted leads', () => {
        expect(component.canConvertLead(createLead({ status: 'registered' }))).toBe(false);
        expect(component.canConvertLead(createLead({ status: 'converted', convertedProjectId: 'project-1' }))).toBe(false);
        expect(component.canConvertLead(createLead({ status: 'qualified' }))).toBe(true);
    });
});
