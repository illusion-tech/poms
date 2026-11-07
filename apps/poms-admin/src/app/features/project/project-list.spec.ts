import { ProjectSummarySchema, CreateProjectRequestSchema } from '@poms/shared-contracts';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore, CustomerStatus, CustomerStore, ProjectInitialOwnership, ProjectStage, ProjectStatus, ProjectStore, type CustomerListView, type ProjectListView, type ProjectSummary, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
import { ProjectList } from './project-list';

function createCustomer(overrides: Partial<CustomerListView> = {}): CustomerListView {
    return {
        id: '00000000-0000-4000-8000-000000002001',
        customerNo: 'CUST-2026-001',
        displayName: '华南地铁集团',
        legalName: null,
        shortName: null,
        status: CustomerStatus.Active,
        ownerOrgId: null,
        ownerUserId: null,
        sourceChannel: null,
        remark: null,
        mergedIntoCustomerId: null,
        rowVersion: 1,
        createdAt: '2026-04-19T08:00:00.000Z',
        createdBy: null,
        updatedAt: '2026-04-19T08:00:00.000Z',
        updatedBy: null,
        ownerName: null,
        ownerOrgName: null,
        leadCount: 0,
        projectCount: 1,
        contractCount: 0,
        ...overrides
    };
}

function createProject(overrides: Partial<ProjectListView> = {}): ProjectListView {
    return {
        id: '00000000-0000-4000-8000-000000001001',
        projectNo: 'P-2026-001',
        projectName: '华南地铁运营平台',
        customerId: '00000000-0000-4000-8000-000000002001',
        customerName: '华南地铁集团',
        customerProjectNo: null,
        currentStage: ProjectStage.CommercialClosure,
        status: ProjectStatus.Active,
        ownerOrgName: '华南销售一部',
        ownerName: '张销售',
        latestMilestoneAt: '2026-04-20T10:00:00.000Z',
        createdAt: '2026-04-19T10:00:00.000Z',
        ...overrides
    };
}

function createPublicSummary(organization = false): ProjectSummary {
    const summary: ProjectSummary = {
        id: '00000000-0000-4000-8000-000000001099', projectNo: 'P-2026-0099', projectName: '真实公开DTO形状的单元测试项目',
        sourceLeadId: null, customerId: '00000000-0000-4000-8000-000000002002', customerName: '城市交通集团', customerProjectNo: null,
        status: ProjectStatus.Active, currentStage: ProjectStage.Assessment, ownerOrgId: '00000000-0000-4000-8000-000000010001',
        ownerUserId: organization ? null : '00000000-0000-4000-8000-000000009001', plannedSignAt: null, closedAt: null, closedReason: null,
        rowVersion: 1, createdAt: '2026-11-07T00:00:00Z', createdBy: '00000000-0000-4000-8000-000000009001', updatedAt: '2026-11-07T00:00:00Z', updatedBy: '00000000-0000-4000-8000-000000009001'
    };
    ProjectSummarySchema.parse(summary);
    return summary;
}

describe('ProjectList', () => {
    let fixture: ComponentFixture<ProjectList>;
    let component: ProjectList;
    let projectStoreMock: {
        createProject: jest.Mock;
        loadProjects: jest.Mock;
        loading: ReturnType<typeof signal<boolean>>;
        projects: ReturnType<typeof signal<ProjectListView[]>>;
        saving: ReturnType<typeof signal<boolean>>;
    };
    let currentUser: ReturnType<typeof signal<SanitizedUserWithOrgUnits | null>>;
    let canCreateProject: ReturnType<typeof signal<boolean>>;
    let canCreateLead: ReturnType<typeof signal<boolean>>;
    let customers: ReturnType<typeof signal<CustomerListView[]>>;
    let routerMock: { navigate: jest.Mock };
    let customerStoreMock: {
        activeCustomers: ReturnType<typeof computed<CustomerListView[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadCustomers: jest.Mock;
    };

    beforeEach(async () => {
        projectStoreMock = {
            createProject: jest.fn().mockResolvedValue(createPublicSummary()),
            loadProjects: jest.fn().mockResolvedValue([createProject()]),
            loading: signal(false),
            projects: signal([createProject()]),
            saving: signal(false)
        };
        currentUser = signal<SanitizedUserWithOrgUnits | null>({
            id: '00000000-0000-4000-8000-000000009001',
            displayName: '张销售',
            username: 'sales_rep',
            roles: ['销售代表'],
            permissions: ['nav:projects:view', 'nav:leads:view', 'project:read', 'project:write', 'lead:read', 'lead:write'],
            email: 'sales@example.com',
            avatarUrl: null,
            isActive: true,
            lastLoginAt: null,
            emailVerified: false,
            phoneVerified: false,
            phone: null,
            orgUnits: []
        });
        canCreateProject = signal(true);
        canCreateLead = signal(true);
        customers = signal<CustomerListView[]>([createCustomer(), createCustomer({ id: '00000000-0000-4000-8000-000000002002', customerNo: 'CUST-2026-002', displayName: '城市交通集团' })]);
        routerMock = { navigate: jest.fn() };
        customerStoreMock = {
            activeCustomers: computed(() => customers().filter((customer) => customer.status === CustomerStatus.Active)),
            loading: signal(false),
            loaded: signal(false),
            loadCustomers: jest.fn().mockResolvedValue(customers())
        };

        await TestBed.configureTestingModule({
            imports: [ProjectList],
            providers: [
                {
                    provide: AuthStore,
                    useValue: {
                        currentUser,
                        initialize: jest.fn(),
                        isAuthenticated: () => true,
                        hasAnyPermission: jest.fn((permissions: readonly string[]) => {
                            if (permissions.includes('lead:write')) {
                                return canCreateLead();
                            }
                            if (permissions.includes('project:write')) {
                                return canCreateProject();
                            }
                            return false;
                        })
                    }
                },
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        })
            .overrideComponent(ProjectList, {
                set: {
                    providers: [
                        {
                            provide: ProjectStore,
                            useValue: projectStoreMock
                        },
                        {
                            provide: CustomerStore,
                            useValue: customerStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(ProjectList);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('renders project list facts from ProjectListView', () => {
        const text = fixture.nativeElement.textContent;

        expect(projectStoreMock.loadProjects).toHaveBeenCalled();
        expect(text).toContain('华南地铁运营平台');
        expect(text).toContain('华南地铁集团');
        expect(text).toContain('华南销售一部');
        expect(text).toContain('张销售');
        expect(text).toContain('商务收口');
        expect(text).toContain('2026-04-20');
    });

    it('creates a project without legacy stage, status, owner or audit fields', async () => {
        component.showCreateDialog();
        expect(component.createForm().initialOwnership).toBe(ProjectInitialOwnership.Creator);
        component.updateCreateField('customerProjectNo', '  CUS-PRJ-NEW  ');
        component.updateCreateField('projectName', '  城市交通项目  ');
        component.updateCreateCustomer('00000000-0000-4000-8000-000000002002');

        await component.createProject();

        expect(projectStoreMock.createProject).toHaveBeenCalledWith({
            projectName: '城市交通项目',
            customerId: '00000000-0000-4000-8000-000000002002',
            customerProjectNo: 'CUS-PRJ-NEW'
        });
        expect(customerStoreMock.loadCustomers).toHaveBeenCalledWith({ status: CustomerStatus.Active });
    });

    it('keeps Lead conversion alongside the authorized assessment creation entry', () => {
        const leadConversionButton = fixture.nativeElement.querySelector('button[aria-label="选择线索转项目"]') as HTMLButtonElement | null;
        const buttonText = Array.from(fixture.nativeElement.querySelectorAll('button'))
            .map((button) => (button as HTMLButtonElement).textContent ?? '')
            .join(' ');

        expect(leadConversionButton).not.toBeNull();
        expect(buttonText).toContain('创建评估项目');

        component.navigateToLeadEntry();

        expect(routerMock.navigate).toHaveBeenCalledWith(['/leads'], { queryParams: { conversion: 'ready' } });
    });

    it('does not expose project creation when the user only has read access', () => {
        canCreateProject.set(false);
        canCreateLead.set(false);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('当前账号只能查看项目。');
        expect(fixture.nativeElement.querySelector('button[aria-label="创建评估项目"]')).toBeNull();
    });

    it('explains the route change when project write exists without lead write', () => {
        canCreateLead.set(false);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('可创建评估项目；线索转入仍需负责人完成资格确认。');
        expect(fixture.nativeElement.querySelector('button[aria-label="创建评估项目"]')).not.toBeNull();
    });
    it('sends the real organization enum and navigates using the actual created response ID', async () => {
        const actual = createPublicSummary(true);
        projectStoreMock.createProject.mockResolvedValue(actual);
        routerMock.navigate.mockResolvedValue(true);
        component.showCreateDialog();
        component.updateCreateField('projectName', '组织承接项目');
        component.updateCreateCustomer('00000000-0000-4000-8000-000000002002');
        component.updateInitialOwnership(ProjectInitialOwnership.Organization);
        const listCallsBefore = projectStoreMock.loadProjects.mock.calls.length;
        await component.createProject();
        const expected = { projectName: '组织承接项目', customerId: '00000000-0000-4000-8000-000000002002', customerProjectNo: null, initialOwnership: ProjectInitialOwnership.Organization };
        CreateProjectRequestSchema.parse(expected);
        expect(projectStoreMock.createProject).toHaveBeenCalledWith(expected);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/projects', actual.id]);
        expect(projectStoreMock.loadProjects).toHaveBeenCalledTimes(listCallsBefore);
    });

    it('keeps a successful creation when navigation fails and retries only its actual anchor', async () => {
        const actual = createPublicSummary(true);
        projectStoreMock.createProject.mockResolvedValue(actual);
        routerMock.navigate.mockRejectedValueOnce(new Error('navigation-only failure'));
        component.showCreateDialog();
        component.updateCreateField('projectName', '组织承接项目');
        component.updateCreateCustomer('00000000-0000-4000-8000-000000002002');
        component.updateInitialOwnership(ProjectInitialOwnership.Organization);
        await component.createProject();
        expect(component.createdProjectId()).toBe(actual.id);
        expect(component.createdProjectNavigationError()).toContain('无需再次创建');
        expect(component.createError()).toBeNull();
        routerMock.navigate.mockResolvedValue(true);
        await component.openCreatedProject();
        expect(projectStoreMock.createProject).toHaveBeenCalledTimes(1);
        expect(routerMock.navigate).toHaveBeenLastCalledWith(['/projects', actual.id]);
    });

    it('does not silently create a personal project for an unsupported selection', async () => {
        component.showCreateDialog();
        component.updateCreateField('projectName', '不得回落个人创建');
        component.updateCreateCustomer('00000000-0000-4000-8000-000000002002');
        component.updateInitialOwnership('unsupported-selection');
        expect(component.isCreateFormValid()).toBe(false);
        await component.createProject();
        expect(projectStoreMock.createProject).not.toHaveBeenCalled();
    });

});
