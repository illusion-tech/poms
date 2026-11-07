"""Minimal first-append delta against the merged sealed F producer patches."""
from pathlib import Path
import difflib,hashlib,json,subprocess
OUT=Path(__file__).resolve().parent
stage=(OUT/'F-stage-tax-sealed01.candidate.rs').read_text(encoding='utf-8')
allocation=(OUT/'F-allocation-sealed01.candidate.rs').read_text(encoding='utf-8')
start=stage.index('pub(super) async fn allocation(');end=stage.index('pub(super) async fn stage(',start)
a=allocation.index('pub(super) async fn allocation(');b=allocation.index('pub(super) async fn stage(',a)
helpers=allocation[allocation.index('\nfn restatement_successor_cost('):]
merged=stage[:start]+allocation[a:b]+stage[end:]+helpers
base=OUT/'F-merged-sealed01.candidate.rs';base.write_text(merged,encoding='utf-8',newline='')
subprocess.run(['rustfmt','--edition','2024',str(base)],check=True)
merged=base.read_text(encoding='utf-8')
old='''    } else if operating_source_consumed(session, cost_id).await? {
'''
if merged.count(old)!=1:raise RuntimeError('First-stage exact anchor changed')
modified=merged.replace(old,'''    } else if operating_source_consumed(session, cost_id).await?
        && !is_true_first_stage_append(session, &cost, reclassify).await?
    {
''',1)
modified+='''

// A pending/excluded reference is not prior recognition. This exception only
// appends the first actual stage and never revises a pre-existing stage/batch.
async fn is_true_first_stage_append(
    session:&mut CommonSession<'_,'_>,cost:&Value,reclassify:bool,
)->Result<bool,Error>{
    if reclassify || cost["is_included_in_project_cost"]!=false { return Ok(false); }
    let id=store::id(cost,"id")?;
    Ok(sqlx::query_scalar::<_,bool>("SELECT NOT EXISTS(SELECT 1 FROM poms.cost_stage_attribution_snapshot WHERE cost_record_id=$1) AND NOT EXISTS(SELECT 1 FROM poms.shared_cost_allocation_source_snapshot WHERE cost_record_id=$1)")
        .bind(id).fetch_one(&mut *session.connection).await?)
}
'''
candidate=OUT/'F-first-append-delta02.candidate.rs';candidate.write_text(modified,encoding='utf-8',newline='')
subprocess.run(['rustfmt','--edition','2024',str(candidate)],check=True)
modified=candidate.read_text(encoding='utf-8')
patch=''.join(difflib.unified_diff(merged.splitlines(keepends=True),modified.splitlines(keepends=True),fromfile='a/apps/poms-api-rust/src/project_cost_governance/service.rs',tofile='b/apps/poms-api-rust/src/project_cost_governance/service.rs'))
(OUT/'F-first-append-delta02.patch').write_text(patch,encoding='utf-8',newline='')
result={'kind':'review-only-not-applied-delta02','base':'F-merged-sealed01.candidate.rs','baseSha256':hashlib.sha256(base.read_bytes()).hexdigest(),'candidateSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'applied':False,'compiled':False,'realDatabaseValidated':False,'positiveCase':['Real registered E cost v1; included-ever=false; no stage at all; no allocation-source row in all history','G explicit exclude pending snapshot retains stageRef=null/unknown/pending','Ordinary real F first confirm appends stage/evidence and cost v2; no old G bytes rewritten','Subsequent actual late-facts G restatement explicitly classifies v2, captures v1 once and H reloads it'],'negativeCases':['Included-ever=true remains protected, including a currently excluded inclusion head','Any existing stage or any historical allocation-source row makes first-append exception false','Ordinary reclassification still requires sealed actual predecessor and complete impacted graph','Failure in later G restatement rolls back only that G command; separately committed first-stage fact remains real v2'],'tax':'Existing sealed tax wrapper already only blocks replacing=true on an existing consumed Tax. True first append stays normal: no Cost amount mutation and automaticallyIncludedInCost=false. Do not add a generic source-member denial to first Tax confirmation. Existing Tax replacement remains sealed.','expense':'Keep existing actual current-mapping/recognized source guards. A never-mapped, never-recognized pending Expense may first-confirm; a mere pending reference is not monetary recognition. Do not allow any principal/date/currency rewrite of a mapped/recognized Expense source. Root owns any new shared guard callsite delta.'}
(OUT/'first-append-delta02.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'patch':str(OUT/'F-first-append-delta02.patch'),'applied':False}))
