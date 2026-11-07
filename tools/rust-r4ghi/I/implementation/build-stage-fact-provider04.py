"""Generate Root-owned I reader + F adapter diffs, without product mutations."""
from pathlib import Path
import json,hashlib,difflib,subprocess
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
WORK=Path.cwd().resolve();assert WORK.as_posix().lower()=='e:/projects/worktrees/poms-r4i-lifecycle/poms'
OUT=WORK/'tools/rust-r4ghi/I/implementation/support-patches'
inputs=[];changes=[]
def read(path):
    raw=(ROOT/path).read_bytes();inputs.append({'path':path,'root':ROOT.as_posix(),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    return raw.decode('utf-8-sig').replace('\r\n','\n')
def once(s,a,b):
    assert s.count(a)==1,a[:140]
    return s.replace(a,b,1)
path='apps/poms-api-rust/src/project_lifecycle/stage_fact.rs'
assert not (ROOT/path).exists(),'Root stage_fact.rs already exists; inspect before proposing an add'
changes.append((path,'',(OUT/'stage-fact-provider04.rs.txt').read_text(encoding='utf-8')))
path='apps/poms-api-rust/src/project_lifecycle/mod.rs';old=read(path)
new=old+'\nmod stage_fact;\npub use stage_fact::{VerifiedProjectStageFact,load_verified_stage_fact_with_session};\n'
changes.append((path,old,new))
path='apps/poms-api-rust/src/project_cost_governance/evidence.rs';old=read(path)
new=once(old,'            | "project-handover"','            | "project-handover"\n            | "project-stage-record"')
needle='    if source == "project-actual-cost-record" || source == "source-cost-fact" {'
branch='''    if source == "project-stage-record" {
        let sequence=i32::try_from(version).map_err(|_|Error::BadRequest("A stage source version must fit positive int4".into()))?;
        let fact=crate::project_lifecycle::load_verified_stage_fact_with_session(session,project,id,sequence).await?;
        let source_date=business_date(&fact.occurred_at().to_rfc3339())?;
        if source_date!=supplied_date{return Err(Error::Unprocessable("Evidence date does not match the actual stage entry".into()));}
        return Ok(Reference{snapshot:json!({"reference":input,"source":fact.evidence_snapshot()?}),labor:false,date:source_date,stage:Some(fact.stage().to_owned()),currency:None});
    }
'''
new=once(new,needle,branch+needle);changes.append((path,old,new))
path='apps/poms-api/src/app/features/project-cost/project-cost.controller.ts';old=read(path)
new=once(old,'import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from "@nestjs/common";','import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, NotImplementedException } from "@nestjs/common";')
guard='''
/** Explicit Native reference branch; this new factual source is Rust-only. */
function rejectProjectStageRecordNativeReference(input: unknown): void {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) return;
    const evidence = (input as Record<string, unknown>)['attributionEvidence'];
    if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) return;
    const source = evidence as Record<string, unknown>;
    if (source['kind'] === 'source' && source['sourceType'] === 'project-stage-record') {
        throw new NotImplementedException({code: 'native_project_stage_record_source_unsupported', message: 'Native reference does not produce or validate project-stage-record evidence; this controlled factual source is implemented by Rust.'});
    }
}
'''
new=once(new,'interface AuthenticatedRequest extends RuntimeAuditRequestLike {',guard+'\ninterface AuthenticatedRequest extends RuntimeAuditRequestLike {')
for method,nextmethod in [('confirmCostStageAttribution','reclassifyCostStageAttribution'),('reclassifyCostStageAttribution','listCostStageAttributions')]:
    start=new.index('    async '+method+'(');end=new.index('    async '+nextmethod+'(',start)
    chunk=new[start:end];chunk=once(chunk,'        const userId = req.user?.sub ?? "system";','        rejectProjectStageRecordNativeReference(body);\n        const userId = req.user?.sub ?? "system";')
    new=new[:start]+chunk+new[end:]
changes.append((path,old,new))
diff=[];rust_diff=[]
for path,before,after in changes:
    candidate=OUT/('stage-fact-provider04-'+Path(path).name+'.txt');candidate.write_text(after,encoding='utf-8',newline='\n')
    if path.endswith('.rs'):
        subprocess.run(['E:/.cargo/bin/rustfmt.exe','--edition','2024','--config','skip_children=true',str(candidate)],check=True)
    after=candidate.read_text(encoding='utf-8');part=list(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/'+path,tofile='b/'+path));diff.extend(part)
    if path.endswith('.rs'):rust_diff.extend(part)
(OUT/'stage-fact-provider04.patch').write_text(''.join(diff),encoding='utf-8',newline='\n')
(OUT/'stage-fact-provider04-rust.patch').write_text(''.join(rust_diff),encoding='utf-8',newline='\n')
(OUT/'stage-fact-provider04-inputs.json').write_text(json.dumps({'kind':'Root-I-reader-and-F-real-provider-proposal','inputs':inputs,'newReader':True,'sourceRefHashOwner':'project_operating::sources::project_stage_reference','productApplied':False,'sqlExecuted':False,'compile':'not-run'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(changes),'productApplied':False,'sourceInputs':inputs}))
