"""Small genuine-producer helpers needed by the all-preflight correction facade."""
from pathlib import Path
import difflib,hashlib,json,subprocess
OUT=Path(__file__).resolve().parent; ROOT=OUT.parents[4]
e_source='apps/poms-api-rust/src/project_actual_cost/mod.rs'
base=(OUT/'E-labor-sealed01.candidate.rs').read_text(encoding='utf-8')
candidate=base+'''

/// Read-only preflight through the very same real E labor builder. No number,
/// cost row, audit or fabricated persisted draft is produced by this helper.
pub(crate) async fn validate_labor_replacement_with_restatement_scope(
    session:&mut CommonSession<'_,'_>,id:Uuid,body:&Value,actor:&Actor,
    scope:&crate::project_operating_common::model::VerifiedRestatementScope<'_>,
)->Result<(),Error>{
    scope.access.assert_session(session,actor).await?;
    require_labor_read(actor)?;
    let old=store::row(session.connection,Table::Cost,id,true).await?;
    scope.access.assert_project(uid(&old,"project_id")?)?;
    let actual=crate::project_operating::sources::source_reference_with_session(session,"ProjectActualCostRecord",id).await?;
    if !scope.locked_source_refs.iter().any(|r|r.id==actual.id&&r.kind==actual.kind&&r.row_version==actual.row_version&&r.payload_hash==actual.payload_hash){return Err(Error::Conflict("Labor preflight is outside exact sealed source scope".into()));}
    expected(body,"expectedSupersededRecordVersion",version(&old)?)?;
    if old["cost_type"]!="labor"||!matches!(old["record_status"].as_str(),Some("registered"|"confirmed"|"included"))||store::successor(session.connection,id).await?.is_some(){return Err(Error::Conflict("Labor preflight requires the actual current source".into()));}
    let mut checked=old.clone();
    build_labor(session,body,&mut checked,Some(&old),actor).await?;
    Ok(())
}
'''
e_file=OUT/'E-preflight-delta03.candidate.rs';e_file.write_text(candidate,encoding='utf-8',newline='');subprocess.run(['rustfmt','--edition','2024','--config','skip_children=true',str(e_file)],check=True)
candidate=e_file.read_text(encoding='utf-8');(OUT/'E-preflight-delta03.patch').write_text(''.join(difflib.unified_diff(base.splitlines(keepends=True),candidate.splitlines(keepends=True),fromfile='a/'+e_source,tofile='b/'+e_source)),encoding='utf-8',newline='')
f_source='apps/poms-api-rust/src/project_cost_governance/evidence.rs';before=(ROOT/f_source).read_text(encoding='utf-8')
old='''        if !logic::valid_confirmation_state(
            store::text(&cost, "record_status")?,
            cost["is_included_in_project_cost"]
                .as_bool()
                .unwrap_or(true),
        ) {
'''
new='''        // This branch reads evidence and never changes the referenced cost.
        // Actual target stage/allocation/tax write guards remain in service.
        let included_readable=cost["record_status"]=="included"
            && cost["is_included_in_project_cost"]==true
            && !cost["confirmed_at"].is_null() && !cost["confirmed_by"].is_null();
        if !included_readable && !logic::valid_confirmation_state(
            store::text(&cost, "record_status")?,
            cost["is_included_in_project_cost"].as_bool().unwrap_or(true),
        ) {
'''
if before.count(old)!=1:raise RuntimeError('Exact F reference read guard changed')
after=before.replace(old,new,1);f_file=OUT/'F-reference-read-delta03.candidate.rs';f_file.write_text(after,encoding='utf-8',newline='');subprocess.run(['rustfmt','--edition','2024',str(f_file)],check=True)
after=f_file.read_text(encoding='utf-8');(OUT/'F-reference-read-delta03.patch').write_text(''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/'+f_source,tofile='b/'+f_source)),encoding='utf-8',newline='')
meta={'kind':'review-only-not-applied-delta03','applied':False,'compiled':False,'realDatabaseValidated':False,'Epreflight':{'baseSha256':hashlib.sha256(base.encode()).hexdigest(),'candidateSha256':hashlib.sha256(e_file.read_bytes()).hexdigest(),'effects':'none; calls existing build_labor only, returns unit'},'FreferenceRead':{'baseSha256':hashlib.sha256((ROOT/f_source).read_bytes()).hexdigest(),'candidateSha256':hashlib.sha256(f_file.read_bytes()).hexdigest(),'boundary':'Read/capture an actual same-project included cost with real confirmation. No included cost mutation, no allocation consumption or stage interval inference; service write guards and source.stage=None stay intact.'},'reason':'A real first Tax append may cite an already recognized source without requiring a nonexistent old Tax. A sealed Tax/Stage correction may also read actual recognized cost source facts.'}
(OUT/'facade-dependencies-delta03.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'delta03':['E-preflight-delta03.patch','F-reference-read-delta03.patch'],'applied':False}))
