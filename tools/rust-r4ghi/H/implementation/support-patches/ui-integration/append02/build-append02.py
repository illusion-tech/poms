"""Small additive follow-up against sealed UI candidate01; never edits it."""
from pathlib import Path
import re,json,hashlib,difflib
HERE=Path(__file__).resolve().parent
BASE=HERE.parent/'proposed'
root='apps/poms-admin/src/app/features/project/'
changes=[];patch=''
def once(s,a,b):
    assert s.count(a)==1,(a,s.count(a))
    return s.replace(a,b)
def write(name,s,old):
    global patch
    rel=root+name;target=HERE/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(s,encoding='utf8',newline='\n')
    raw=s.encode();changes.append({'path':rel,'candidate01SHA256':hashlib.sha256(old).hexdigest(),'append02SHA256':hashlib.sha256(raw).hexdigest()})
    patch+=''.join(difflib.unified_diff(old.decode().splitlines(True),s.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel))

name='project-governance-api.ts';old=(BASE/root/name).read_bytes();s=old.decode()
s=once(s,'{ completionRecordId, conditionId, closeProjectCompletionConditionRequest: body }','{ id: conditionId, completionRecordId, closeProjectCompletionConditionRequest: body }')
write(name,s,old)

name='project-governance-facts.ts';old=(BASE/root/name).read_bytes();s=old.decode()
s=once(s,'    ProjectHandoverDetailView, CommissionRoleAssignmentSummary, ReceiptRecordSummary, SourceRef','    ReceiptRecordSummary, SourceRef')
start=s.index('export function lifecycleContext(')
s=s[:start]+'''/** Admission references are issued only by the same server FullProject detail read. */
export function lifecycleContext(project: FullProjectDetailView, canWrite: boolean): LifecycleAuthoringContext {
    const admission = project.executionAdmissionContext;
    return {
        projectRowVersion: project.projectRowVersion,
        currentStage: project.currentStage,
        currentStageRecordId: project.currentStageRecordId,
        canWriteLifecycle: canWrite && project.status !== 'closed',
        canArchive: canWrite && project.status !== 'closed',
        executionAdmission: canWrite && project.currentStage === 'handover' && admission
            && admission.handoverStageRecordId === project.currentStageRecordId ? admission : null
    };
}
'''
write(name,s,old)

name='project-governance.ts';old=(BASE/root/name).read_bytes();s=old.decode()
s=once(s,', type ProjectHandoverDetailView, type CommissionRoleAssignmentSummary','')
s=once(s,"@if (!canRole() && detail.currentStage === 'handover') { <p role=\"status\">执行准入需要读取真实已冻结角色。当前账号没有角色读取能力，尚不能装配执行准入依据。</p> }", "@if (!detail.executionAdmissionContext && detail.currentStage === 'handover') { <p role=\"status\">当前执行准入尚未就绪，请核对真实移交、角色冻结与本人责任范围后重新读取。</p> }")
s=once(s,'    readonly handover = signal<ProjectHandoverDetailView | null>(null);\n    readonly role = signal<CommissionRoleAssignmentSummary | null>(null);\n','')
s=once(s,'lifecycleContext(project, this.canWrite(), this.handover(), this.role())','lifecycleContext(project, this.canWrite())')
assert s.count(' this.handover.set(null); this.role.set(null);')==2
s=s.replace(' this.handover.set(null); this.role.set(null);','')
pattern=r'    private async loadLifecycleContext\(\) \{.*?\n    \}\n    refreshAfterLifecycle\(\)'
replacement='''    private async loadLifecycleContext() {
        const epoch = this.epoch; this.panelError.set('');
        try {
            // EO admission comes directly from the current detail. Role GET keeps
            // its own permission and is called only by the separate Role panel.
            if (this.canWrite()) await this.platform.loadOwnerReferenceData();
        } catch (error) { if (epoch === this.epoch) this.panelError.set(this.errorText(error)); }
    }
    refreshAfterLifecycle()'''
s,count=re.subn(pattern,replacement,s,flags=re.S);assert count==1
write(name,s,old)
(HERE/'ui-append02.patch').write_text(patch,encoding='utf8',newline='\n')
manifest={'status':'follow-up-against-sealed-UI-candidate01-not-applied','baseCandidateManifestSHA256':'a138b237faedac017910947cd140d652e5e941a767c82591c20e309dee949d45','files':changes,'resolved':['IR05-01 generated close-condition request key is id, conditionId stays internal TaskRow field','EO reads exact server required-nullable executionAdmissionContext; no Role GET dependency or role/weight access'],'newPublicHttp':0,'productWrites':False}
(HERE/'manifest02.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'files':len(changes),'manifestSHA256':hashlib.sha256((HERE/'manifest02.json').read_bytes()).hexdigest()}))
