import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore, CustomerStatus, CustomerStore, LeadStore, PlatformStore, type CustomerListView, type LeadDetailView, type LeadListView, type OwnerReferenceOrgUnit, type OwnerReferenceUser, type ProjectSummary, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
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
        sourceChannel: '客户拜访',
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
    let selectedLead: ReturnType<typeof signal<LeadDetailView | null>>;
    let canWriteLead: ReturnType<typeof signal<boolean>>;
    let routerMock: { navigate: jest.Mock };
    let ownerUsers: ReturnType<typeof signal<OwnerReferenceUser[]>>;
    let ownerOrgUnits: ReturnType<typeof signal<OwnerReferenceOrgUnit[]>>;
    let customers: ReturnType<typeof signal<CustomerListView[]>>;
    let leadStoreMock: {
        leads: ReturnType<typeof signal<LeadListView[]>>;
        selectedLead: ReturnType<typeof signal<LeadDetailView | null>>;
        loading: ReturnType<typeof signal<boolean>>;
        loadingDetail: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        registeredLeadCount: ReturnType<typeof computed<number>>;
        qualifiedLeadCount: ReturnType<typeof computed<number>>;
        convertedLeadCount: ReturnType<typeof computed<number>>;
        closedLeadCount: ReturnType<typeof computed<number>>;
        loadLeads: jest.Mock;
        loadLead: jest.Mock;
        createLead: jest.Mock;
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

    beforeEach(async () => {
        leads = signal([createLead()]);
        selectedLead = signal<LeadDetailView | null>(null);
        canWriteLead = signal(true);
        ownerUsers = signal<OwnerReferenceUser[]>([createPlatformUser(), createPlatformUser({ id: 'user-2', displayName: '李经理', primaryOrgUnitId: 'org-2', primaryOrgUnitName: '华东销售部' })]);
        ownerOrgUnits = signal<OwnerReferenceOrgUnit[]>([createOrgUnit(), createOrgUnit({ id: 'org-2', name: '华东销售部', code: 'SALES-EAST' })]);
        customers = signal<CustomerListView[]>([createCustomer(), createCustomer({ id: 'customer-2', customerNo: 'CUST-2026-002', displayName: '城市交通集团' })]);
        routerMock = { navigate: jest.fn() };
        leadStoreMock = {
            leads,
            selectedLead,
            loading: signal(false),
            loadingDetail: signal(false),
            saving: signal(false),
            registeredLeadCount: computed(() => leads().filter((lead) => lead.status === 'registered').length),
            qualifiedLeadCount: computed(() => leads().filter((lead) => lead.status === 'qualified').length),
            convertedLeadCount: computed(() => leads().filter((lead) => lead.status === 'converted').length),
            closedLeadCount: computed(() => leads().filter((lead) => lead.status === 'closed').length),
            loadLeads: jest.fn().mockResolvedValue(leads()),
            loadLead: jest.fn().mockImplementation(async () => {
                const detail = createLeadDetail();
                selectedLead.set(detail);
                return detail;
            }),
            createLead: jest.fn().mockResolvedValue(createLead()),
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
                            permissions: ['nav:leads:view', 'lead:read', 'lead:write'],
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
                        hasAnyPermission: jest.fn((permissions: readonly string[]) => permissions.includes('lead:write') && canWriteLead())
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

    it('creates a lead with the generated request shape', async () => {
        component.showCreateDialog();
        component.updateCreateField('leadName', '  城市交通机会  ');
        component.updateCreateCustomer('customer-2');
        component.updateCreateField('sourceChannel', '  老客户转介绍  ');

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith({
            leadName: '城市交通机会',
            customerId: 'customer-2',
            sourceChannel: '老客户转介绍',
            ownerUserId: 'user-1',
            ownerOrgId: 'org-1'
        });
        expect(customerStoreMock.loadCustomers).toHaveBeenCalledWith({ status: CustomerStatus.Active });
    });

    it('updates the selected sales owner and defaults the owner org from the chosen user', async () => {
        component.showCreateDialog();
        component.updateCreateField('leadName', '城市交通机会');
        component.updateCreateCustomer('customer-1');
        component.updateCreateOwnerUser('user-2');

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerUserId: 'user-2',
                ownerOrgId: 'org-2'
            })
        );
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
