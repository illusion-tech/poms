import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore, ProjectStore, type ProjectListView, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
import { ProjectList } from './project-list';

function createProject(overrides: Partial<ProjectListView> = {}): ProjectListView {
    return {
        id: 'project-1',
        projectCode: 'P-2026-001',
        projectName: '华南地铁运营平台',
        customerName: '华南地铁集团',
        currentStage: 'commercial-closure',
        status: 'active',
        ownerOrgName: '华南销售一部',
        ownerName: '张销售',
        latestMilestoneAt: '2026-04-20T10:00:00.000Z',
        createdAt: '2026-04-19T10:00:00.000Z',
        ...overrides
    };
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

    beforeEach(async () => {
        projectStoreMock = {
            createProject: jest.fn().mockResolvedValue(createProject()),
            loadProjects: jest.fn().mockResolvedValue([createProject()]),
            loading: signal(false),
            projects: signal([createProject()]),
            saving: signal(false)
        };
        currentUser = signal<SanitizedUserWithOrgUnits | null>({
            id: 'user-1',
            displayName: '张销售',
            username: 'sales_rep',
            roles: ['销售代表'],
            permissions: ['nav:projects:view', 'project:read', 'project:write'],
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

        await TestBed.configureTestingModule({
            imports: [ProjectList],
            providers: [
                {
                    provide: AuthStore,
                    useValue: {
                        currentUser,
                        initialize: jest.fn(),
                        isAuthenticated: () => true,
                        hasAnyPermission: jest.fn(() => canCreateProject())
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: jest.fn()
                    }
                }
            ]
        })
            .overrideComponent(ProjectList, {
                set: {
                    providers: [
                        {
                            provide: ProjectStore,
                            useValue: projectStoreMock
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
        component.updateCreateField('projectCode', '  P-2026-NEW  ');
        component.updateCreateField('projectName', '  城市交通项目  ');
        component.updateCreateField('customerName', '  城市交通集团  ');

        await component.createProject();

        expect(projectStoreMock.createProject).toHaveBeenCalledWith({
            projectCode: 'P-2026-NEW',
            projectName: '城市交通项目',
            customerName: '城市交通集团'
        });
    });

    it('does not expose project creation when the user only has read access', () => {
        canCreateProject.set(false);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('当前账号只能查看项目。');
        expect(fixture.nativeElement.textContent).not.toContain('新建项目');
    });
});
