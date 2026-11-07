from pathlib import Path
import re,json,hashlib,difflib
HERE=Path(__file__).resolve().parent
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
category=['project','customer','lead','contract','snapshot','confirmation','approval','bid','user','org','archive','owner-record']
def identity(kind,n):return f'00000000-0000-4000-8000-{(category.index(kind)+1)*1000+int(n):012d}'
def once(s,a,b):
    assert s.count(a)==1,(a,s.count(a))
    return s.replace(a,b)
def full_factory(s,name,next_name):
    start=s.index(f'function {name}(');end=s.index(f'function {next_name}(',start)
    factory=s[start:end]
    factory=once(factory,'    return {','    const detail = {')
    factory=once(factory,"        id: 'project-1',", "        scopeKind: 'full-project',\n        projectRowVersion: overrides.projectRowVersion ?? overrides.rowVersion ?? 3,\n        currentStageRecordId: null,\n        executionAdmissionContext: null,\n        id: 'project-1',")
    if name=='createDetail':
        factory=once(factory,"        customerName: '华南地铁集团',", "        customerName: '华南地铁集团',\n        customerProjectNo: null,")
        factory=once(factory,'        ownerOrgId: null,',"        ownerOrgId: 'org-1',")
        factory=once(factory,'        ownerUserId: null,',"        ownerUserId: 'user-1',")
    factory=factory.replace("createdBy: 'system'","createdBy: 'user-1'").replace("updatedBy: 'admin'","updatedBy: 'user-1'")
    factory=once(factory,'        ...overrides\n    };\n}', '''        ...overrides
    };
    if (!overrides.stageSummary) detail.stageSummary = { ...detail.stageSummary, currentStage: detail.currentStage, status: detail.status };
    assertFullFixture(detail);
    return detail;
}''')
    s=s[:start]+factory+s[end:]
    guard='''function assertFullFixture(value: unknown): asserts value is ProjectDetailView {
    const result = FullProjectDetailViewSchema.safeParse(value);
    if (!result.success) throw new Error('Invalid FullProject fixture: ' + JSON.stringify(result.error.issues));
}

'''
    return s[:start]+guard+s[start:]

files=[];patch=''
def save(rel,s,raw):
    global patch
    dest=HERE/'proposed'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(s,encoding='utf8',newline='\n')
    original=HERE/'originals'/rel;original.parent.mkdir(parents=True,exist_ok=True);original.write_bytes(raw)
    files.append({'path':rel,'originalSHA256':hashlib.sha256(raw).hexdigest(),'proposedSHA256':hashlib.sha256(s.encode()).hexdigest()})
    patch+=''.join(difflib.unified_diff(raw.decode().splitlines(True),s.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel))

for filename,name,next_name in [('project-store.spec.ts','createDetail','createSummary'),('project-detail.spec.ts','createProject','createTimeline')]:
    rel='apps/poms-admin/src/app/features/project/'+filename;raw=(ROOT/rel).read_bytes();s=raw.decode()
    # Original test-only UUID labels were not valid public wire UUIDs.
    s=once(s,'    type ProjectDetailView,','    type FullProjectDetailView as ProjectDetailView,')
    if filename=='project-store.spec.ts':
        s="import { FullProjectDetailViewSchema, CreatorFirstAssignmentAnchorViewSchema, LegacyOwnerAnchorViewSchema } from '@poms/shared-contracts';\n"+s
        s=once(s,"import { of } from 'rxjs';", "import { of, Subject, throwError } from 'rxjs';")
    else:s="import { FullProjectDetailViewSchema } from '@poms/shared-contracts';\n"+s
    s=full_factory(s,name,next_name)
    s=s.replace('currentBidSummary: {\n','currentBidSummary: {\n            tenderNo: null,\n            bidPackageNo: null,\n')
    s=once(s,'    ProjectApi,' if filename=='project-store.spec.ts' else '    AuditHistoryStore,',
           ('    ProjectApi,' if filename=='project-store.spec.ts' else '    AuditHistoryStore,')+'\n    CreateProjectArchiveRecordRequestInputVersionEnum,\n    ReplaceProjectArchiveRecordRequestInputVersionEnum,\n    VoidProjectArchiveRecordRequestInputVersionEnum,')
    if filename=='project-store.spec.ts':
        s=s.replace("createProjectArchiveRecordRequest: {\n                archivedAt:", "createProjectArchiveRecordRequest: {\n                inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,\n                expectedProjectVersion: detail.projectRowVersion,\n                archivedAt:")
        s=once(s,"store.createProjectArchiveRecord('project-1', {\n            archivedAt:", "store.createProjectArchiveRecord('project-1', {\n            inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,\n            expectedProjectVersion: detail.projectRowVersion,\n            archivedAt:")
        for method,key,enum in [('replaceProjectArchiveRecord','replaceProjectArchiveRecordRequest','ReplaceProjectArchiveRecordRequestInputVersionEnum'),('voidProjectArchiveRecord','voidProjectArchiveRecordRequest','VoidProjectArchiveRecordRequestInputVersionEnum')]:
            s=once(s,f"store.{method}('archive-1', {{",f"store.{method}('archive-1', {{\n            inputVersion: {enum}.ServerDerivedV1,")
            s=once(s,f'{key}: {{',f'{key}: {{\n                inputVersion: {enum}.ServerDerivedV1,')
    else:
        s=once(s,"toHaveBeenCalledWith('project-1', {\n            archivedAt:", "toHaveBeenCalledWith('project-1', {\n            inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,\n            expectedProjectVersion: project.projectRowVersion,\n            archivedAt:")
        s=once(s,"toHaveBeenCalledWith('archive-1', {\n            archivedAt:", "toHaveBeenCalledWith('archive-1', {\n            inputVersion: ReplaceProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,\n            archivedAt:")
        s=once(s,"toHaveBeenCalledWith('archive-1', {\n            reason:", "toHaveBeenCalledWith('archive-1', {\n            inputVersion: VoidProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,\n            reason:")
        # The assertion is about source authority, not host-local timezone.
        block_start=s.index("it('renders archive panel from authoritative archive milestone")
        block_end=s.index("    it(",block_start+10)
        block=s[block_start:block_end].replace('2026-04-24T15:20:00.000Z','2026-04-24T08:20:00.000Z')
        s=s[:block_start]+block+s[block_end:]
    s=re.sub(r'(?<![A-Za-z0-9_-])('+'|'.join(sorted(category,key=len,reverse=True))+r')-(\d+)(?![A-Za-z0-9_-])',lambda m:identity(m[1],m[2]),s)
    s=s.replace('11111111-2222-3333-4444-555555555555','00000000-0000-4000-8000-000000090001')
    save(rel,s,raw)

(HERE/'tests07.patch').write_text(patch,encoding='utf8',newline='\n')
(HERE/'manifest07.json').write_text(json.dumps({'status':'Root-two-suite-fixture-and-regression-candidate-not-applied','files':files,'productGuardChanges':False,'productWrites':False},indent=2)+'\n',encoding='utf8')
