from pathlib import Path
p=Path(__file__).resolve().parent/'proposed/apps/poms-admin/src/app/features/project/project-store.spec.ts'
s=p.read_text(encoding='utf8');at=s.rfind('\n});');assert at>0
tests='''

    it.each(['creator', 'legacy'] as const)('rejects a genuine %s response and clears a previously full cache', async (kind) => {
        const projectId = '00000000-0000-4000-8000-000000001001';
        const narrow = kind === 'creator'
            ? CreatorFirstAssignmentAnchorViewSchema.parse({ scopeKind: 'creator-first-assignment-only', projectId, projectNo: 'P-bootstrap', projectRowVersion: 4, ownerOrgId: '00000000-0000-4000-8000-000000010001', ownerUserId: null, creatorUserId: '00000000-0000-4000-8000-000000009001', ownershipOriginRowVersion: 1, allowedActions: ['reassign-owner'] })
            : LegacyOwnerAnchorViewSchema.parse({ scopeKind: 'legacy-owner-anchor-only', projectId, projectNo: 'P-legacy', projectName: '历史基础锚点', currentStage: 'assessment', rowVersion: 4, ownerUserId: '00000000-0000-4000-8000-000000009001', ownerOrgId: null, sourceQualification: 'legacy-unverified', allowedActions: [], explanation: '仅可读取缺失组织来源的基础锚点' });
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(of(createDetail())).mockReturnValueOnce(of(narrow)) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await store.loadProject(projectId);
        expect(store.selectedProject()?.scopeKind).toBe('full-project');
        await expect(store.loadProject(projectId)).rejects.toThrow('完整项目范围');
        expect(store.selectedProject()).toBeNull();
        expect(store.loading()).toBe(false);
    });

    it('does not accept an untagged old-shaped response as a FullProject proof', async () => {
        const untagged = Object.fromEntries(Object.entries(createDetail()).filter(([key]) => key !== 'scopeKind'));
        const api = { projectControllerGetById: jest.fn().mockReturnValue(of(untagged)) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await expect(store.loadProject('00000000-0000-4000-8000-000000001001')).rejects.toThrow('完整项目范围');
        expect(store.selectedProject()).toBeNull();
    });

    it('never publishes an older FullProject response over the latest project', async () => {
        const oldRead = new Subject<ProjectDetailView>(), latestRead = new Subject<ProjectDetailView>();
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(oldRead).mockReturnValueOnce(latestRead) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        const oldResult = store.loadProject('00000000-0000-4000-8000-000000001001');
        const rejectedOld = expect(oldResult).rejects.toThrow('项目已变化');
        const latestResult = store.loadProject('00000000-0000-4000-8000-000000001002');
        const latest = createDetail({ id: '00000000-0000-4000-8000-000000001002', projectNo: 'P-latest' });
        latestRead.next(latest); latestRead.complete(); await latestResult;
        oldRead.next(createDetail()); oldRead.complete(); await rejectedOld;
        expect(store.selectedProject()).toEqual(latest);
        expect(store.loading()).toBe(false);
    });

    it('keeps the latest load pending and empty when an older FullProject arrives first', async () => {
        const oldRead = new Subject<ProjectDetailView>(), latestRead = new Subject<ProjectDetailView>();
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(oldRead).mockReturnValueOnce(latestRead) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        const oldResult = store.loadProject('00000000-0000-4000-8000-000000001001');
        const rejectedOld = expect(oldResult).rejects.toThrow('项目已变化');
        const latestResult = store.loadProject('00000000-0000-4000-8000-000000001002');
        oldRead.next(createDetail()); oldRead.complete(); await rejectedOld;
        expect(store.selectedProject()).toBeNull(); expect(store.loading()).toBe(true);
        const latest = createDetail({ id: '00000000-0000-4000-8000-000000001002' });
        latestRead.next(latest); latestRead.complete(); await latestResult;
        expect(store.selectedProject()).toEqual(latest);
    });

    it('clears old FullProject facts when the next project read fails', async () => {
        const api = { projectControllerGetById: jest.fn().mockReturnValueOnce(of(createDetail())).mockReturnValueOnce(throwError(() => new Error('scope denied'))) };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await store.loadProject('00000000-0000-4000-8000-000000001001');
        await expect(store.loadProject('00000000-0000-4000-8000-000000001002')).rejects.toThrow('scope denied');
        expect(store.selectedProject()).toBeNull(); expect(store.loading()).toBe(false);
    });

    it('does not read timeline or archive lists after a non-Full archive refresh', async () => {
        const projectId = '00000000-0000-4000-8000-000000001001';
        const creator = CreatorFirstAssignmentAnchorViewSchema.parse({ scopeKind: 'creator-first-assignment-only', projectId, projectNo: 'P-bootstrap', projectRowVersion: 4, ownerOrgId: '00000000-0000-4000-8000-000000010001', ownerUserId: null, creatorUserId: '00000000-0000-4000-8000-000000009001', ownershipOriginRowVersion: 1, allowedActions: ['reassign-owner'] });
        const api = { projectControllerCreateProjectArchiveRecord: jest.fn().mockReturnValue(of(createArchiveRecord())), projectControllerGetById: jest.fn().mockReturnValue(of(creator)), projectControllerGetTimeline: jest.fn(), projectControllerListProjectArchiveRecords: jest.fn() };
        TestBed.configureTestingModule({ providers: [ProjectStore, { provide: ProjectApi, useValue: api }] });
        const store = TestBed.inject(ProjectStore);
        await expect(store.createProjectArchiveRecord(projectId, { inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1, expectedProjectVersion: 3, archivedAt: '2026-04-26T08:30:00.000Z', archiveSummary: '模拟归档结论', evidenceSummary: '模拟证据' })).rejects.toThrow('完整项目范围');
        expect(api.projectControllerGetTimeline).not.toHaveBeenCalled();
        expect(api.projectControllerListProjectArchiveRecords).not.toHaveBeenCalled();
        expect(store.selectedProject()).toBeNull();
    });
'''
assert 'genuine %s response' not in s
s=s[:at]+tests+s[at:];p.write_text(s,encoding='utf8',newline='\n')
