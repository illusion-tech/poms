from pathlib import Path
import json,hashlib,difflib
here=Path(__file__).resolve().parent
root=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
out=here/'proposed'
files=[];patch=''
for proposed in sorted(out.rglob('*')):
    if not proposed.is_file():continue
    rel=proposed.relative_to(out).as_posix();target=root/rel
    old=target.read_bytes() if target.exists() else b'';new=proposed.read_bytes()
    snapshot=here/'originals'/rel;snapshot.parent.mkdir(parents=True,exist_ok=True)
    if snapshot.exists():assert snapshot.read_bytes()==old,('Root base changed; do not reseal',rel)
    else:snapshot.write_bytes(old)
    files.append({'path':rel,'originalExists':target.exists(),'originalSHA256':hashlib.sha256(old).hexdigest() if target.exists() else None,'proposedSHA256':hashlib.sha256(new).hexdigest(),'bytes':len(new)})
    patch+=''.join(difflib.unified_diff(old.decode('utf8').splitlines(True),new.decode('utf8').splitlines(True),fromfile='a/'+rel if target.exists() else '/dev/null',tofile='b/'+rel))
(here/'ui-integration.patch').write_bytes(patch.encode())
manifest={'status':'candidate-prepared-not-applied-or-certified','productReadRoot':str(root),'productWrites':False,'newPublicHTTP':0,'files':files,'dependencies':['Root actual modern generated client and exact enum adapter correction','G receipt-basis-preparation05','I Root corrective18 completionConditionContext Session FK implementation','Root full app/UI/HTTP acceptance'],'validation':{'pureUIRequestUnits':json.loads((here/'facts-unit-result.json').read_text()),'isolatedCompiler':{k:v for k,v in json.loads((here/'ngc-current-client-result.json').read_text()).items() if k!='errors'},'isolatedCompilerErrors':len(json.loads((here/'ngc-current-client-result.json').read_text())['errors']),'fullAppBuild':False,'databaseHTTP':False}}
(here/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'files':len(files),'manifestSHA256':hashlib.sha256((here/'manifest.json').read_bytes()).hexdigest(),'patchSHA256':hashlib.sha256((here/'ui-integration.patch').read_bytes()).hexdigest()}))
