import hashlib
import json
import pathlib
import shutil

ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58'
OLD=BASE/'edition12-80';OUT=BASE/'edition12-81';sha=lambda b:hashlib.sha256(b).hexdigest()
provenance=json.loads((OLD/'input-provenance80.json').read_bytes())
for p in provenance['baseHelperSources']+provenance['productSources']:assert sha((ROOT/p['file']).read_bytes())==p['sha256'],p['file']
path=OUT/'candidate/tools/rust-r4ghi/business/required-write-sources58.json'
assert path.read_bytes()==(OLD/'candidate/tools/rust-r4ghi/business/required-write-sources58.json').read_bytes()
m=json.loads(path.read_bytes());m['version']=81
for name in ['shared-source-race58.mjs','shared-race58.test.mjs']:
 logical='tools/rust-r4ghi/business/'+name
 found=[p for p in m['helperSources'] if p['file']==logical];assert len(found)==1
 found[0]['sha256']=sha((OUT/'candidate'/logical).read_bytes())
path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
for p in (OUT/'candidate').rglob('*'):
 if p.is_file():shutil.copyfile(p,OUT/'sandbox'/p.relative_to(OUT/'candidate'))
print(json.dumps({'source58SHA256':sha(path.read_bytes()),'helperPins':len(m['helperSources']),'sourceCount':len(m['productSources']),'deltaTargets':3,'RootChanged':False}))
