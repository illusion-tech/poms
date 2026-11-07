"""Freeze one Root-current support candidate. Never writes Root product files."""
from pathlib import Path
import hashlib,json,difflib,subprocess

ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
WORK=Path.cwd().resolve();assert WORK.as_posix().lower()=='e:/projects/worktrees/poms-r4i-lifecycle/poms'
SUPPORT=WORK/'tools/rust-r4ghi/I/implementation/support-patches'
OUT=SUPPORT/'support-integration06';OUT.mkdir(parents=True,exist_ok=True)
paths=[
 'apps/poms-api-rust/src/project_handover/service.rs',
 'apps/poms-api-rust/src/project_handover/sources.rs',
 'apps/poms-api-rust/src/project_handover/mod.rs',
 'apps/poms-api-rust/src/project_handover/view.rs',
 'apps/poms-api-rust/src/projects/service.rs',
 'apps/poms-api-rust/src/projects/http.rs',
 'apps/poms-api-rust/src/projects/validation.rs',
 'apps/poms-api-rust/src/leads/service.rs',
]
deps=[
 'apps/poms-api-rust/src/project_action_authorization/mod.rs',
 'apps/poms-api-rust/src/project_action_authorization/ownership.rs',
 'apps/poms-api-rust/src/project_operating_common/model.rs',
 'apps/poms-api-rust/src/project_operating_common/schema.rs',
 'docs/design/rust-r4ghi/g2-public-delta01.json',
]
raw={p:(ROOT/p).read_bytes() for p in paths+deps}
base={p:raw[p].decode('utf-8-sig').replace('\r\n','\n') for p in paths}
after=dict(base)
def once(s,a,b):
    assert s.count(a)==1,a[:180]
    return s.replace(a,b,1)
def replace_method(s,start_marker,end_marker,new):
    start=s.index(start_marker);end=s.index(end_marker,start)
    return s[:start]+new+'\n'+s[end:]

# D01 service hooks only; preserve every current Root bridge and unrelated body.
p=paths[0];s=after[p]
if 'ProjectAction::PrepareHandover' not in s[s.index('async fn prepare('):s.index('async fn insert_item(')]:
    s=once(s,'    lock_project(session.connection, project).await?;\n    let old = match old_override {','''    lock_project(session.connection, project).await?;
    if anchor.is_none() {
        crate::project_action_authorization::require(session,actor,
            crate::project_action_authorization::ProjectAction::PrepareHandover,
            crate::project_action_authorization::ProjectActionTarget::Project{id:project}).await?;
    }
    let old = match old_override {''')
if 'crate::project_lifecycle::enter_handover_with_session' not in s:
    s=once(s,'    let h = sources::row(session, handover, false).await?;\n    if anchor.is_none() {','''    let h = sources::row(session, handover, false).await?;
    if anchor.is_none() {
        crate::project_lifecycle::enter_handover_with_session(session,project,handover,rv(&s.project)?,actor).await?;
    }
    if anchor.is_none() {''')
after[p]=s

# D03 phased source verification built from the current collector, not an old
# full-file candidate. Existing Root contract/receipt source work is retained.
p=paths[1];s=after[p]
if 'async fn collect_scoped(' not in s:
    start=s.index('pub(super) async fn collect(');body=s.index('    if lock {',start);header=s[start:body]
    inner=once(header,'pub(super) async fn collect(','async fn collect_scoped(')
    inner=once(inner,'    inherited: Option<&Value>,','    inherited: Option<&Value>,\n    fixed_materials: Option<&[Value]>,')
    s=s[:start]+header+'    collect_scoped(session,project,lock,inherited,None).await\n}\n'+inner+s[body:]
    a=s.index('    let inherited_ids: Vec<Uuid>');b=s.index('    let hash = canonical_hash(',a);block=s[a:b]
    s=s[:a]+'''    let materials=if let Some(captured)=fixed_materials {captured.to_vec()}else{
'''+''.join('    '+line if line.strip() else line for line in block.splitlines(keepends=True))+'''        materials
    };
'''+s[b:]
if 'async fn intrinsic_frozen_duties(' not in s:
    a=s.index('pub(super) async fn fresh(');b=s.index('/// Historical facts for F;',a)
    helpers=(SUPPORT/'handover-fixed-evidence03.rs.txt').read_text(encoding='utf-8')
    s=s[:a]+helpers+'\n'+s[b:]
after[p]=s
p=paths[2];s=after[p]
if 'sources::intrinsic_frozen_duties' not in s:
    marker='    use crate::contract_support::Error;\n    use serde_json::Value;\n'
    s=once(s,marker,marker+'    crate::contract_support::lock_project(session.connection,project_id).await?;\n')
    s=once(s,'    sources::fresh(session, handover).await?;','''    if handover["status"]=="confirmed"{sources::intrinsic_frozen_duties(session,handover).await?;}
    else{sources::fresh(session,handover).await?;}''')
    s=once(s,'    sources::fresh(session, &h).await?;','    sources::confirmed_sources(session,&h).await?;')
after[p]=s
p=paths[3];s=after[p]
if 'let mut current_source_hash' not in s:
    s=once(s,'    let mut source_changed = false;','    let mut source_changed = false;\n    let mut current_source_hash=s.hash.clone();')
    s=once(s,'            source_changed = h["source_payload_hash"] != s.hash || materials.is_null();','''            if h["status"]=="confirmed"{
                current_source_hash=sources::confirmed_source_hash(&s.project,&s.members,&b["source_payload"])?;
                source_changed=h["source_payload_hash"]!=current_source_hash||materials.is_null()||!s.blockers.is_empty()
                    ||!sources::fixed_included_materials_current(session,&b["source_payload"]).await?;
            }else{source_changed = h["source_payload_hash"] != s.hash || materials.is_null();}''')
    s=once(s,'"currentSourcePayloadHash":s.hash,','"currentSourcePayloadHash":current_source_hash,')
after[p]=s

# Actual current project implementation: keep creation number/session behavior,
# replace only get/reassign command bodies, append typed common-session helpers.
p=paths[4];s=after[p]
s=once(s,'    Database(DbError),\n    Internal,','    Database(DbError),\n    Business(crate::contract_support::Error),\n    Internal,')
s=once(s,'            Self::Customer(error) => error.into_api_error(),','            Self::Customer(error) => error.into_api_error(),\n            Self::Business(error) => error.into_api_error(),')
s=once(s,'        // Preserve source preflight before BEGIN;','''        if current_stage.is_some_and(|stage|stage!=ProjectStage::Assessment){
            return Err(ProjectsError::BadRequest("New projects must begin at assessment".into()));
        }
        // Preserve source preflight before BEGIN;''')
s=once(s,'''                                current_stage: current_stage
                                    .unwrap_or(ProjectStage::Assessment)
                                    .as_str()
                                    .to_owned(),''','''                                current_stage: ProjectStage::Assessment.as_str().to_owned(),''')
s=once(s,'''                        .await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(project)''','''                        .await?;
                        crate::project_action_authorization::ownership::record_new_origin_with_connection(
                            &mut transaction,project.id,operator.id,"direct-create",project.id,None).await
                            .map_err(|_|sqlx::Error::Protocol("New project ownership origin failed".into()))?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(project)''')
methods=(OUT/'project-methods.rs.txt').read_text(encoding='utf-8')
get=methods[:methods.index('    pub async fn reassign(')]
reassign=methods[methods.index('    pub async fn reassign('):]
s=replace_method(s,'    pub async fn get(','    pub async fn update(',get)
s=replace_method(s,'    pub async fn reassign(','    async fn flush_project(',reassign)
s+='\n'+(OUT/'project-helpers.rs.txt').read_text(encoding='utf-8')
after[p]=s
p=paths[5];s=after[p]
s=once(s,'''                validate!(validation::validate_reassign(parsed.raw())),
                &session,
            )''','''                validate!(validation::validate_reassign(parsed.raw())),
                &session,
                &metadata,
            )''')
s=once(s,'''    session: &crate::auth::model::ResolvedSession,
) -> Response {
    match service.reassign(id, input, session).await {''','''    session: &crate::auth::model::ResolvedSession,
    metadata: &crate::auth::guards::RequestMetadata,
) -> Response {
    match service.reassign(id, input, session, metadata).await {''')
after[p]=s
p=paths[6];s=after[p]
s=once(s,'''    let values = ProjectStage::ALL
        .iter()
        .map(|value| value.as_str())
        .collect::<Vec<_>>();
    enumeration(object, "currentStage", &values, errors).and_then(|value| value.parse().ok())''','''    enumeration(object,"currentStage",&["assessment"],errors).and_then(|value|value.parse().ok())''')
s=once(s,'    let expected_version = integer(&object, "expectedVersion", Some(1), &mut errors);','''    let expected_version = integer(&object, "expectedVersion", Some(1), &mut errors);
    if object.get("expectedVersion").is_none(){errors.push(invalid_type("number","undefined",vec![json!("expectedVersion")]));}
    if expected_version.is_some_and(|version|version>i64::from(i32::MAX)){
        errors.push(json!({"origin":"number","code":"too_big","maximum":i32::MAX,"inclusive":true,"path":["expectedVersion"],"message":"expectedVersion must fit positive int4"}));
    }''')
s=once(s,'json!({"ownerUserId":CUSTOMER,"reason":" 调整 ","ownerOrgId":null})','json!({"ownerUserId":CUSTOMER,"reason":" 调整 ","ownerOrgId":null,"expectedVersion":1})')
after[p]=s
p=paths[7];s=after[p]
s=once(s,'            save_lead(connection,&before,&mut lead).await?;\n            let mut copied=0;','''            save_lead(connection,&before,&mut lead).await?;
            crate::project_action_authorization::ownership::record_new_origin_with_connection(
                connection,project.id,operator.id,"lead-conversion",before.id,None).await.map_err(|_|LeadsError::Internal)?;
            let mut copied=0;''')
after[p]=s

entries=[];diff=[]
for path in paths:
    target=OUT/'candidate'/path;target.parent.mkdir(parents=True,exist_ok=True)
    snapshot=OUT/'base-bytes'/(path+'.bin');snapshot.parent.mkdir(parents=True,exist_ok=True);snapshot.write_bytes(raw[path])
    target.write_text(after[path],encoding='utf-8',newline='\n')
    subprocess.run(['E:/.cargo/bin/rustfmt.exe','--edition','2024','--config','skip_children=true',str(target)],check=True)
    subprocess.run(['E:/.cargo/bin/rustfmt.exe','--edition','2024','--config','skip_children=true','--check',str(target)],check=True)
    desired=target.read_text(encoding='utf-8')
    diff.extend(difflib.unified_diff(base[path].splitlines(keepends=True),desired.splitlines(keepends=True),fromfile='a/'+path,tofile='b/'+path))
    entries.append({'path':path,'baseSha256':hashlib.sha256(raw[path]).hexdigest(),'baseBytes':len(raw[path]),'candidateSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'candidateBytes':target.stat().st_size})
changed=[path for path,original in raw.items() if (ROOT/path).read_bytes()!=original]
assert not changed,'Root changed during candidate preparation; rebase required: '+repr(changed)
patch=SUPPORT/'support-integration06.patch';patch.write_text(''.join(diff),encoding='utf-8',newline='\n')
manifest={'kind':'Root-current-single-support-integration-candidate','status':'author-proposal-Root-review-and-integration-pending','root':ROOT.as_posix(),'baseStable':True,'files':entries,
 'dependencies':[{'path':p,'sha256':hashlib.sha256(raw[p]).hexdigest(),'bytes':len(raw[p])} for p in deps],
 'patch':{'path':patch.relative_to(WORK).as_posix(),'sha256':hashlib.sha256(patch.read_bytes()).hexdigest(),'bytes':patch.stat().st_size},
 'scope':['D01 old-responsibility prepare gate and actual handover entry','D03 fixed-material/intrinsic-duty phases and GET phase hash','assessment-only new project and true direct/lead ownership origin','reassign common session inside its existing single outer transaction','ProjectDetail exact Full/Creator/Legacy union before finance reads'],
 'excluded':['Stage provider05 and project_lifecycle/mod.rs','scope and ownership helper implementation','receipt and other contract_finance changes','canonical inventory and all public/shared schemas','timeline source enum and timeline implementation','Git/DB/server/deployment'],
 'checks':{'rustfmt':'8 candidates parsed/formatted/check passed','compile':'not-run; Root integration required','SQL_HTTP_UI':'not-run','GitUsed':False,'productApplied':False}}
(SUPPORT/'support-integration06-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(entries),'baseStable':True,'patchSha256':manifest['patch']['sha256'],'patchBytes':manifest['patch']['bytes'],'productApplied':False}))
