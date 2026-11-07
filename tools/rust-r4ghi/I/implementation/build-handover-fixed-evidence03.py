"""Exact Root-source proposal only. Never writes product files or connects PG."""
from pathlib import Path
import hashlib,json,difflib,subprocess
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
WORK=Path.cwd().resolve()
assert WORK.as_posix().lower()=='e:/projects/worktrees/poms-r4i-lifecycle/poms'
OUT=WORK/'tools/rust-r4ghi/I/implementation/support-patches'
changes=[]
inputs=[]
def read(path):
    raw=(ROOT/path).read_bytes()
    inputs.append({'path':path,'root':ROOT.as_posix(),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
    return raw.decode('utf-8-sig').replace('\r\n','\n')
def once(text,old,new):
    assert text.count(old)==1,old[:120]
    return text.replace(old,new,1)

path='apps/poms-api-rust/src/project_handover/sources.rs'
old=read(path)
new=old
start=new.index('pub(super) async fn collect(')
body=new.index('    if lock {',start)
header=new[start:body]
inner=once(header,'pub(super) async fn collect(','async fn collect_scoped(')
inner=once(inner,'    inherited: Option<&Value>,','    inherited: Option<&Value>,\n    fixed_materials: Option<&[Value]>,')
wrapper=header+'    collect_scoped(session,project,lock,inherited,None).await\n}\n'+inner
new=new[:start]+wrapper+new[body:]
mstart=new.index('    let inherited_ids: Vec<Uuid>')
mend=new.index('    let hash = canonical_hash(',mstart)
material_body=new[mstart:mend]
fixed='''    let materials=if let Some(captured)=fixed_materials {
        captured.to_vec()
    }else{
'''+''.join('    '+line if line.strip() else line for line in material_body.splitlines(keepends=True))+'''        materials
    };
'''
new=new[:mstart]+fixed+new[mend:]
fresh_start=new.index('pub(super) async fn fresh(')
fresh_end=new.index('/// Historical facts for F;',fresh_start)
helpers=(OUT/'handover-fixed-evidence03.rs.txt').read_text(encoding='utf-8').replace('\r\n','\n')
new=new[:fresh_start]+helpers+'\n'+new[fresh_end:]
changes.append((path,old,new))

path='apps/poms-api-rust/src/project_handover/mod.rs'
old=read(path)
new=once(old,'''    use crate::contract_support::Error;
    use serde_json::Value;
    let handovers:''','''    use crate::contract_support::Error;
    use serde_json::Value;
    crate::contract_support::lock_project(session.connection,project_id).await?;
    let handovers:''')
new=once(new,'    sources::fresh(session, handover).await?;','''    if handover["status"]=="confirmed" {
        sources::intrinsic_frozen_duties(session,handover).await?;
    }else{
        sources::fresh(session,handover).await?;
    }''')
new=once(new,'    sources::fresh(session, &h).await?;','    sources::confirmed_sources(session, &h).await?;')
changes.append((path,old,new))

path='apps/poms-api-rust/src/project_handover/view.rs'
old=read(path)
new=once(old,'    let mut source_changed = false;','    let mut source_changed = false;\n    let mut current_source_hash=s.hash.clone();')
new=once(new,'            source_changed = h["source_payload_hash"] != s.hash || materials.is_null();','''            if h["status"]=="confirmed" {
                current_source_hash=sources::confirmed_source_hash(&s.project,&s.members,&b["source_payload"])?;
                source_changed=h["source_payload_hash"]!=current_source_hash||materials.is_null()||!s.blockers.is_empty()
                    ||!sources::fixed_included_materials_current(session,&b["source_payload"]).await?;
            }else{
                source_changed = h["source_payload_hash"] != s.hash || materials.is_null();
            }''')
new=once(new,'"currentSourcePayloadHash":s.hash,','"currentSourcePayloadHash":current_source_hash,')
changes.append((path,old,new))

diff=[]
for path,before,after in changes:
    # Proposals may be inspected/formatted, never copied into ROOT by this script.
    candidate=OUT/('handover-fixed-evidence03-'+Path(path).name+'.txt')
    candidate.write_text(after,encoding='utf-8',newline='\n')
    subprocess.run(['E:/.cargo/bin/rustfmt.exe','--edition','2024','--config','skip_children=true',str(candidate)],check=True)
    after=candidate.read_text(encoding='utf-8')
    diff.extend(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/'+path,tofile='b/'+path))
(OUT/'handover-fixed-evidence03.patch').write_text(''.join(diff),encoding='utf-8',newline='\n')
(OUT/'handover-fixed-evidence03-inputs.json').write_text(json.dumps({'kind':'Root-current-source-proposal','inputs':inputs,'productApplied':False,'sqlExecuted':False,'gitUsed':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'patchFiles':len(changes),'productApplied':False,'inputs':inputs}))
