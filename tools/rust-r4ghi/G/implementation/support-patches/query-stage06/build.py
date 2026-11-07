"""Root two-file consumer proposal; no generated enum or source guard edits."""
from pathlib import Path
import json,hashlib,difflib,subprocess
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT=Path(__file__).resolve().parent
BASE={'model.rs':'e33a1ef1c78b83b109fd72ae90a750167e2848aef968c5a8bae6bb2b800680e4','validation.rs':'d06dd792e89d449cdcf74f25730cb0dc6cf5c99b0fcf4f519fa750b8884b1ec8'}
records=[];patches=[]
for name,expected in BASE.items():
 path='apps/poms-api-rust/src/projects/'+name
 raw=(ROOT/path).read_bytes()
 if hashlib.sha256(raw).hexdigest()!=expected:raise RuntimeError('Root input changed: '+name)
 (OUT/(name+'.base.bin')).write_bytes(raw)
 old=raw.decode('utf-8-sig').replace('\r\n','\n');new=old
 if name=='model.rs':
  new=new.replace('    shared::generated::{ProjectStage, ProjectStatus},','    shared::generated::{ProjectStage, ProjectStatus},\n    project_operating_common::model::ProjectStage as QueryProjectStage,')
  start=new.index('pub struct ProjectListQuery {');end=new.index('\n}',start)
  piece=new[start:end].replace('pub current_stage: Option<ProjectStage>','pub current_stage: Option<QueryProjectStage>')
  new=new[:start]+piece+new[end:]
 else:
  new=new.replace('    shared::generated::{ProjectStage, ProjectStatus},','    shared::generated::{ProjectStage, ProjectStatus},\n    project_operating_common::model::ProjectStage as QueryProjectStage,')
  start=new.index('pub fn validate_query(')
  new=new[:start]+new[start:].replace('let current_stage = stage(&object, &mut errors);','let current_stage = query_stage(&object, &mut errors);',1)
  insertion=new.index('pub fn validate_query(')
  new=new[:insertion]+'''/// Query consumes the versioned public enum generated from the current TS
/// canonical contract; create independently remains assessment-only.
fn query_stage(object: &JsObject<'_>, errors: &mut Vec<Value>) -> Option<QueryProjectStage> {
    let raw = object.get("currentStage")?;
    if let Some(value) = decode_string(raw.get()).ok().map(|value| value.to_utf8_lossy())
        && let Ok(stage) = serde_json::from_value::<QueryProjectStage>(Value::String(value)) {
        return Some(stage);
    }
    // Error metadata comes from the same certified schema, never a parallel
    // handwritten list. A model/registry mismatch fails closed, never unfilters.
    let values = crate::project_operating_common::schema::public_registry()["components"]["schemas"]["ProjectStage"]["enum"]
        .as_array().cloned().unwrap_or_default();
    let allowed = values.iter().filter_map(Value::as_str).map(|value| format!("\\\"{value}\\\"")).collect::<Vec<_>>().join("|");
    errors.push(json!({"code":"invalid_value","values":values,"path":["currentStage"],"message":format!("Invalid option: expected one of {allowed}")}));
    None
}

'''+new[insertion:]
  tests=new.index('\n    #[test]',new.index('#[cfg(test)]'))
  new=new[:tests]+'''
    #[test]
    fn list_stage_uses_current_public_enum_without_expanding_create() {
        let registry = crate::project_operating_common::schema::public_registry();
        let values = registry["components"]["schemas"]["ProjectStage"]["enum"].as_array().expect("registered public project stage");
        for stage in values.iter().filter_map(Value::as_str) {
            let raw = json!({"currentStage":stage}).to_string();
            let parsed = validate_query(Some(&raw)).unwrap_or_else(|_| panic!("registered query stage {stage}"));
            assert_eq!(parsed.current_stage.map(|value| value.as_str()), Some(stage));
        }
        for value in [json!("unknown-stage"),json!("ConditionalCompleted"),json!(1),Value::Null] {
            assert!(validate_query(Some(&json!({"currentStage":value}).to_string())).is_err());
        }
        let create = json!({"projectName":"Project","customerId":CUSTOMER,"currentStage":"conditional-completed"}).to_string();
        assert!(validate_create(Some(&create)).is_err());
        let create = json!({"projectName":"Project","customerId":CUSTOMER,"currentStage":"assessment"}).to_string();
        assert!(validate_create(Some(&create)).is_ok());
    }
'''+new[tests:]
 target=OUT/(name+'.candidate.rs');target.write_text(new,encoding='utf-8',newline='\n')
 subprocess.run(['rustfmt','--edition','2024',str(target)],cwd=OUT,check=True)
 formatted=target.read_text(encoding='utf-8')
 patch=''.join(difflib.unified_diff(old.splitlines(True),formatted.splitlines(True),fromfile='a/'+path,tofile='b/'+path,n=4));patches.append(patch)
 records.append({'path':path,'baseSha256':expected,'candidateSha256':hashlib.sha256(target.read_bytes()).hexdigest()})
p=OUT/'query-stage-consumer06.patch';p.write_text(''.join(patches),encoding='utf-8',newline='\n')
manifest={'kind':'Root-query-stage-consumer06','files':records,'patchSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'rootProductModified':False,'semantics':'Only ProjectListQuery.current_stage switches to same-source versioned public Common ProjectStage (11), serde parse and as_str; core create still original Assessment enum and separate assessment-only gate. Store already binds as_str and needs no change.','sourceAuthority':'Current registered canonical ProjectStage in the shared generated TS closure/effective public schema, with Common model generated by Root. No handwritten Rust wire list; shared/generated.rs untouched.','validation':{'rustfmt':'both exact candidates passed','test':'meaningful complete query/create regression added; Root integration execution pending','cargoHttp':'Root check and actual GET conditional-completed/other valid stage filtering required'},'remaining':'Whole old R1B exporter still pinned single-module/S3 source and declaration checks; modular exporter upgrade is explicitly incomplete. This is a scoped current-public-enum consumer bridge, not a full shared-export pass.'}
m=OUT/'manifest06.json';m.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'manifest':str(m),'manifestSha256':hashlib.sha256(m.read_bytes()).hexdigest(),'patchSha256':manifest['patchSha256'],'files':records}))
