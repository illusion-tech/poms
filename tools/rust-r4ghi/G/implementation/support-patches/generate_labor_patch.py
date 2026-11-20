"""Review-only E producer seam; exact old bytes are hashed, never overwritten."""
from pathlib import Path
import difflib, hashlib, json, subprocess
ROOT=Path(__file__).resolve().parents[5]
OUT=Path(__file__).resolve().parent
SOURCE='apps/poms-api-rust/src/project_actual_cost/mod.rs'
original=(ROOT/SOURCE).read_text(encoding='utf-8')
modified=original
def once(old,new):
    global modified
    if modified.count(old)!=1: raise RuntimeError(f'Expected one exact anchor {old[:90]}')
    modified=modified.replace(old,new,1)
header='''async fn replace_labor(
    session: &mut CommonSession<'_, '_>,
    id: Uuid,
    body: &Value,
    actor: &Actor,
    op: &str,
) -> Result<Value, Error> {
'''
once(header,'''async fn replace_labor(
    session: &mut CommonSession<'_, '_>, id: Uuid,
    body: &Value, actor: &Actor, op: &str,
) -> Result<Value, Error> {
    replace_labor_inner(session,id,body,actor,op,None).await
}

pub(crate) async fn replace_labor_with_restatement_scope(
    session: &mut CommonSession<'_, '_>, id: Uuid,
    body: &Value, actor: &Actor, op: &str,
    scope: &crate::project_operating_common::model::VerifiedRestatementScope<'_>,
) -> Result<Value, Error> {
    replace_labor_inner(session,id,body,actor,op,Some(scope)).await
}

async fn replace_labor_inner(
    session: &mut CommonSession<'_, '_>, id: Uuid,
    body: &Value, actor: &Actor, op: &str,
    scope: Option<&crate::project_operating_common::model::VerifiedRestatementScope<'_>>,
) -> Result<Value, Error> {
''')
once('''    expected(body, "expectedSupersededRecordVersion", version(&old)?)?;
''','''    if let Some(scope)=scope {
        scope.access.assert_session(session,actor).await?;
        scope.access.assert_project(project)?;
        if scope.actor_id!=actor.id { return Err(Error::Forbidden("Sealed labor actor mismatch".into())); }
        let actual=crate::project_operating::sources::source_reference_with_session(session,"ProjectActualCostRecord",id).await?;
        if !scope.locked_source_refs.iter().any(|r|r.kind==actual.kind && r.id==actual.id && r.row_version==actual.row_version && r.payload_hash==actual.payload_hash){return Err(Error::Conflict("Sealed labor source changed".into()));}
    }else if sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM poms.operating_source_member WHERE source_id=$1)").bind(id).fetch_one(&mut *session.connection).await? {
        return Err(Error::CodedConflict{code:"operating_restatement_required",message:"Consumed labor requires atomic operating restatement".into()});
    }
    expected(body, "expectedSupersededRecordVersion", version(&old)?)?;
''')
once('''            Some("registered" | "confirmed")
        )
        || old["is_included_in_project_cost"] != false
''','''            Some("registered" | "confirmed")
        ) && !(scope.is_some() && old["record_status"]=="included" && old["is_included_in_project_cost"]==true)
        || (scope.is_none() && old["is_included_in_project_cost"] != false)
''')
once('''    if store::allocated(session.connection, id).await? {
''','''    if store::allocated(session.connection, id).await? && scope.is_none() {
''')
once('''    if locked {
        return Err(Error::Conflict(
            "Historical closing snapshot requires explicit restatement".into(),
''','''    if locked && scope.is_none() {
        return Err(Error::Conflict(
            "Historical closing snapshot requires explicit restatement".into(),
''')
candidate=OUT/'E-labor-sealed01.candidate.rs'
candidate.write_text(modified,encoding='utf-8',newline='')
subprocess.run(['rustfmt','--edition','2024','--config','skip_children=true',str(candidate)],check=True)
modified=candidate.read_text(encoding='utf-8')
(OUT/'E-labor-sealed01.patch').write_text(''.join(difflib.unified_diff(original.splitlines(keepends=True),modified.splitlines(keepends=True),fromfile='a/'+SOURCE,tofile='b/'+SOURCE)),encoding='utf-8',newline='')
(OUT/'E-labor-sealed01.json').write_text(json.dumps({'kind':'review-only-not-applied','source':SOURCE,'sourceSha256':hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest(),'candidateSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'applied':False,'compiled':False,'realDatabaseValidated':False,'invariants':['Existing real E build_labor/create_cost still owns rates, quantities, interval coverage, published-rate authority, attachments, numbering and audits','Old included-ever flag is never reset; old row becomes replaced with its original amounts/confirmation/source_basis intact','Root validates typed LaborCorrection, mints same-TX scope, and calls actual new-cost stage producer before G consumes it','Root must genuinely rebuild every consumed allocation source set using new real E successor IDs and restore all affected terminals atomically']},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'patch':str(OUT/'E-labor-sealed01.patch'),'applied':False}))
