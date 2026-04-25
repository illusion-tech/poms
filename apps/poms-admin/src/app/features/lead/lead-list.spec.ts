import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore, LeadStore, type LeadDetailView, type LeadListView, type ProjectSummary, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
import { LeadList } from './lead-list';

function createLead(overrides: Partial<LeadListView> = {}): LeadListView {
    return {
        id: 'lead-1',
        leadCode: 'L-2026-001',
        leadName: '华南地铁线索',
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
        projectCode: 'P-2026-001',
        projectName: '华南地铁项目',
        sourceLeadId: 'lead-1',
        customerId: null,
        customerName: '华南地铁集团',
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

describe('LeadList', () => {
    let fixture: ComponentFixture<LeadList>;
    let component: LeadList;
    let leads: ReturnType<typeof signal<LeadListView[]>>;
    let selectedLead: ReturnType<typeof signal<LeadDetailView | null>>;
    let canWriteLead: ReturnType<typeof signal<boolean>>;
    let routerMock: { navigate: jest.Mock };
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

    beforeEach(async () => {
        leads = signal([createLead()]);
        selectedLead = signal<LeadDetailView | null>(null);
        canWriteLead = signal(true);
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
                            orgUnits: []
                        }),
                        initialize: jest.fn(),
                        isAuthenticated: () => true,
                        hasAnyPermission: jest.fn((permissions: readonly string[]) => permissions.includes('lead:write') && canWriteLead())
                    }
                },
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        })
            .overrideComponent(LeadList, {
                set: {
                    providers: [
                        {
                            provide: LeadStore,
                            useValue: leadStoreMock
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
        component.updateCreateField('leadCode', '  L-2026-NEW  ');
        component.updateCreateField('leadName', '  城市交通机会  ');
        component.updateCreateField('customerName', '  城市交通集团  ');
        component.updateCreateField('sourceChannel', '  老客户转介绍  ');

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith({
            leadCode: 'L-2026-NEW',
            leadName: '城市交通机会',
            customerName: '城市交通集团',
            sourceChannel: '老客户转介绍'
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
        component.updateConvertField('projectCode', '  P-2026-NEW  ');
        component.updateConvertField('projectName', '  城市交通项目  ');
        component.updateConvertDate(new Date(2026, 4, 1));
        await component.convertLeadToProject();

        expect(leadStoreMock.convertLeadToProject).toHaveBeenCalledWith('lead-1', {
            projectCode: 'P-2026-NEW',
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
