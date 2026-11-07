import pathlib,json,hashlib,difflib
own=pathlib.Path(__file__).resolve().parent;root=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');rel='apps/poms-admin/src/app/features/project/project-list.spec.ts';raw=(root/rel).read_bytes();source=raw.decode().replace('\r\n','\n');base=[]
base.append({'file':rel,'rawBytesSha256':hashlib.sha256(raw).hexdigest()})
source=source.replace('AuthStore, CustomerStatus, CustomerStore, ProjectStage,','AuthStore, CustomerStatus, CustomerStore, ProjectInitialOwnership, ProjectStage,').replace('type ProjectListView, type SanitizedUserWithOrgUnits','type ProjectListView, type ProjectSummary, type SanitizedUserWithOrgUnits')
source="import { ProjectSummarySchema, CreateProjectRequestSchema } from '@poms/shared-contracts';\n"+source
for old,new in [('customer-1','00000000-0000-4000-8000-000000002001'),('customer-2','00000000-0000-4000-8000-000000002002'),('project-1','00000000-0000-4000-8000-000000001001'),('user-1','00000000-0000-4000-8000-000000009001')]: source=source.replace(old,new)
anchor="describe('ProjectList', () => {"
helper="""function createPublicSummary(organization = false): ProjectSummary {
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

"""
assert source.count(anchor)==1;source=source.replace(anchor,helper+anchor).replace('jest.fn().mockResolvedValue(createProject()),','jest.fn().mockResolvedValue(createPublicSummary()),')
source=source.replace("it('uses the lead conversion chain as the visible project creation entry'", "it('keeps Lead conversion alongside the authorized assessment creation entry'")
source=source.replace("expect(buttonText).not.toContain('新建项目');", "expect(buttonText).toContain('创建评估项目');")
source=source.replace("expect(fixture.nativeElement.textContent).not.toContain('新建项目');", "expect(fixture.nativeElement.querySelector('button[aria-label=\"创建评估项目\"]')).toBeNull();",1)
# Project-write without Lead-write must now expose assessment creation, retaining the separate Lead gate hint.
old="expect(fixture.nativeElement.textContent).not.toContain('新建项目');";assert source.count(old)==1;source=source.replace(old,"expect(fixture.nativeElement.querySelector('button[aria-label=\"创建评估项目\"]')).not.toBeNull();")
source=source.replace("component.showCreateDialog();\n        component.updateCreateField('customerProjectNo'", "component.showCreateDialog();\n        expect(component.createForm().initialOwnership).toBe(ProjectInitialOwnership.Creator);\n        component.updateCreateField('customerProjectNo'",1)
extra="""
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
"""
pos=source.rfind('\n});');assert pos>0;source=source[:pos]+extra+source[pos:]
target=own/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);assert not target.exists();target.write_text(source,encoding='utf-8',newline='')
rel2='apps/poms-admin/src/app/features/project/project-store.spec.ts';raw2=(root/rel2).read_bytes();s=raw2.decode().replace('\r\n','\n');base.append({'file':rel2,'rawBytesSha256':hashlib.sha256(raw2).hexdigest()})
s=s.replace('FullProjectDetailViewSchema, CreatorFirstAssignmentAnchorViewSchema, LegacyOwnerAnchorViewSchema','FullProjectDetailViewSchema, CreatorFirstAssignmentAnchorViewSchema, LegacyOwnerAnchorViewSchema, ProjectSummarySchema')
s=s.replace('    ProjectApi,','    ProjectApi,\n    ProjectInitialOwnership,',1)
s=s.replace('function createSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {\n    return {','function createSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {\n    const summary: ProjectSummary = {',1)
old='        customerName: null,\n        status: ProjectStatus.Active,';assert s.count(old)==1;s=s.replace(old,'        customerName: null,\n        customerProjectNo: null,\n        status: ProjectStatus.Active,')
old='        ...overrides\n    };\n}\n\nfunction createTimeline';assert s.count(old)==1;s=s.replace(old,'        ...overrides\n    };\n    ProjectSummarySchema.parse(summary);\n    return summary;\n}\n\nfunction createTimeline')
extra2="""
    it('creates an organization assessment without list, Full, timeline or archive fan-out', async () => {
        const actual = createSummary({ currentStage: ProjectStage.Assessment, ownerUserId: null, ownerOrgId: '00000000-0000-4000-8000-000000010001', customerId: '00000000-0000-4000-8000-000000002002' });
        const api = { projectControllerCreate: jest.fn().mockReturnValue(of(actual)), projectControllerList: jest.fn().mockReturnValue(of([])), projectControllerGetById: jest.fn(), projectControllerGetTimeline: jest.fn(), projectControllerListProjectArchiveRecords: jest.fn() };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await store.loadProjects(); api.projectControllerList.mockClear();
        const body = { projectName: '组织承接', customerId: '00000000-0000-4000-8000-000000002002', initialOwnership: ProjectInitialOwnership.Organization };
        const returned = await store.createProject(body);
        expect(returned).toEqual(actual); expect(api.projectControllerCreate).toHaveBeenCalledWith({ createProjectRequest: body });
        expect(api.projectControllerList).not.toHaveBeenCalled(); expect(api.projectControllerGetById).not.toHaveBeenCalled(); expect(api.projectControllerGetTimeline).not.toHaveBeenCalled(); expect(api.projectControllerListProjectArchiveRecords).not.toHaveBeenCalled();
        expect(store.selectedProject()).toBeNull(); expect(store.loaded()).toBe(false);
    });

    it('preserves the loaded-list refresh for the default creator request', async () => {
        const actual = createSummary({ currentStage: ProjectStage.Assessment, ownerUserId: '00000000-0000-4000-8000-000000009001', ownerOrgId: '00000000-0000-4000-8000-000000010001' });
        const api = { projectControllerCreate: jest.fn().mockReturnValue(of(actual)), projectControllerList: jest.fn().mockReturnValue(of([])), projectControllerGetById: jest.fn() };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore); await store.loadProjects(); api.projectControllerList.mockClear();
        const body = { projectName: '默认创建人主责', customerId: '00000000-0000-4000-8000-000000002002' };
        await store.createProject(body);
        expect(api.projectControllerCreate).toHaveBeenCalledWith({ createProjectRequest: body }); expect(api.projectControllerList).toHaveBeenCalledTimes(1); expect(api.projectControllerGetById).not.toHaveBeenCalled();
    });
"""
pos=s.rfind('\n});');assert pos>0;s=s[:pos]+extra2+s[pos:];target2=own/'proposed'/rel2;target2.parent.mkdir(parents=True,exist_ok=True);assert not target2.exists();target2.write_text(s,encoding='utf-8',newline='')
patch=''
for item in base:
 p=own/'proposed'/item['file'];patch+=''.join(difflib.unified_diff((root/item['file']).read_text().splitlines(True),p.read_text().splitlines(True),fromfile='a/'+item['file'],tofile='b/'+item['file']))
(own/'tests15.patch').write_text(patch,encoding='utf-8',newline='');(own/'inputs15.json').write_text(json.dumps({'schemaVersion':1,'files':base,'actualS6SDKRequired':True},indent=2)+'\n',encoding='utf-8');print(json.dumps({'specCandidates':2,'actualS6SDKRequired':True,'executed':False}))
