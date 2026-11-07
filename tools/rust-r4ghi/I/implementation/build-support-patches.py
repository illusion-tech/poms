"""Generate reviewable Root-owned patches; never modify product files."""
from pathlib import Path
import difflib
import hashlib
import json

ROOT=Path.cwd().resolve()
assert ROOT.as_posix().lower()=='e:/projects/worktrees/poms-r4i-lifecycle/poms'
OUT=ROOT/'tools/rust-r4ghi/I/implementation/support-patches'
OUT.mkdir(parents=True,exist_ok=True)
inputs=[]

def patch(name,changes):
    chunks=[]
    for path,before,after in changes:
        inputs.append({'path':path,'sha256':hashlib.sha256((ROOT/path).read_bytes()).hexdigest()})
        chunks.extend(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/'+path,tofile='b/'+path))
    (OUT/name).write_text(''.join(chunks),encoding='utf-8',newline='\n')

def read(path):return (ROOT/path).read_text(encoding='utf-8')
def replace(text,before,after):
    assert text.count(before)==1, before[:120]
    return text.replace(before,after,1)

path='apps/poms-api-rust/src/project_handover/service.rs'
old=read(path)
new=replace(old,'    lock_project(session.connection, project).await?;\n    let old = match old_override {','''    lock_project(session.connection, project).await?;
    if anchor.is_none() {
        crate::project_action_authorization::require(session, actor,
            crate::project_action_authorization::ProjectAction::PrepareHandover,
            crate::project_action_authorization::ProjectActionTarget::Project { id: project }).await?;
    }
    let old = match old_override {''')
new=replace(new,'    let h = sources::row(session, handover, false).await?;\n    if anchor.is_none() {','''    let h = sources::row(session, handover, false).await?;
    if anchor.is_none() {
        crate::project_lifecycle::enter_handover_with_session(session, project, handover,
            rv(&s.project)?, actor).await?;
    }
    if anchor.is_none() {''')
new+='''
/// Reuse D's existing fixed basis/summary/current-source and actual duty checks.
pub async fn verify_confirmed_handover_with_session(
    session:&mut CommonSession<'_, '_>,project_id:Uuid,handover_id:Uuid,
)->Result<Value,Error>{
    lock_project(session.connection,project_id).await?;
    let h=sources::row(session,handover_id,true).await?;
    if h["project_id"]!=project_id.to_string()||h["producer_version"]!=1||h["is_current"]!=true||h["status"]!="confirmed"||h["confirmed_at"].is_null()||h["confirmed_by"].is_null(){
        return Err(Error::Conflict("须引用本项目真实当前确认移交。".into()));
    }
    sources::fresh(session,&h).await?;
    let confirmed:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.confirmation_record c WHERE c.id=$1 AND c.target_type='project-handover' AND c.target_id=$2 AND c.project_id=$3 AND c.status='confirmed' AND c.required_count>0 AND c.required_count=c.confirmed_count AND NOT EXISTS(SELECT 1 FROM poms.confirmation_participant cp WHERE cp.confirmation_record_id=c.id AND (cp.participant_status<>'confirmed' OR cp.confirmed_at IS NULL)))")
        .bind(id(&h,"confirmation_record_id")?).bind(handover_id).bind(project_id).fetch_one(&mut *session.connection).await?;
    if !confirmed{return Err(Error::Conflict("全部参与人须真实确认本人职责。".into()));}
    Ok(h)
}
'''
mod='apps/poms-api-rust/src/project_handover/mod.rs'
mod_old=read(mod)
mod_new=replace(mod_old,'pub use service::execute;','pub use service::{execute, verify_confirmed_handover_with_session};')
patch('01-d-handover.patch',[(path,old,new),(mod,mod_old,mod_new)])

path='apps/poms-api-rust/src/projects/service.rs'
old=read(path)
new=replace(old,'        // Preserve source preflight before BEGIN;','''        if current_stage.is_some_and(|stage| stage != ProjectStage::Assessment) {
            return Err(ProjectsError::BadRequest("新项目只允许从 assessment 创建。".into()));
        }
        // Preserve source preflight before BEGIN;''')
new=replace(new,'''                                current_stage: current_stage
                                    .unwrap_or(ProjectStage::Assessment)
                                    .as_str()
                                    .to_owned(),''','''                                current_stage: ProjectStage::Assessment.as_str().to_owned(),''')
needle='''                        .await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(project)'''
new=replace(new,needle,'''                        .await?;
                        crate::project_action_authorization::ownership::record_new_origin_with_connection(
                            &mut transaction,project.id,operator.id,"direct-create",project.id,None)
                            .await.map_err(|_|sqlx::Error::Protocol("new project ownership origin failed".into()))?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(project)''')
path_lead='apps/poms-api-rust/src/leads/service.rs'
lead_old=read(path_lead)
lead_new=replace(lead_old,'            project.row_version=store::insert_conversion_project(connection,&project).await?;', '''            project.row_version=store::insert_conversion_project(connection,&project).await?;
            crate::project_action_authorization::ownership::record_new_origin_with_connection(
                connection,project.id,operator.id,"lead-conversion",before.id,None)
                .await.map_err(|_|LeadsError::Internal)?;''')
patch('02-project-and-lead-origin.patch',[(path,old,new),(path_lead,lead_old,lead_new)])

path='apps/poms-api-rust/src/projects/validation.rs'
old=read(path)
new=replace(old,'''    let values = ProjectStage::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    enumeration(object, "currentStage", &values, errors).and_then(|value| value.parse().ok())''','''    enumeration(object, "currentStage", &["assessment"], errors).and_then(|value| value.parse().ok())''')
patch('03-create-stage-validation.patch',[(path,old,new)])
path='apps/poms-api-rust/src/project_workspace/service.rs'
old=read(path)
new=replace(old,'''            key: format!("project-completed:{}", row.id),
            stage: "completed",''','''            key: format!("project-completed:{}", row.id),
            stage: &row.completion_result,''')
patch('04-timeline-conditional-stage.patch',[(path,old,new)])
(OUT/'patch-inputs.json').write_text(json.dumps({'kind':'proposal-only-Root-single-writer-review','inputs':inputs,'applied':False,'gitUsed':False,'sqlExecuted':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'patches':4,'applied':False,'inputs':len(inputs)}))
