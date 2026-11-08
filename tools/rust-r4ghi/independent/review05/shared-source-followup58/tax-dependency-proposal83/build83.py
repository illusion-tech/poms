import pathlib,hashlib,json,shutil
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');OUT=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58/tax-dependency-proposal83';sha=lambda b:hashlib.sha256(b).hexdigest()
assert not (OUT/'candidate').exists()
pins=json.loads((OUT.parent/'edition12-80/input-provenance80.json').read_bytes())['productSources'];files=[]
for name in ['apps/poms-api-rust/src/project_operating/restatement.rs','apps/poms-api-rust/src/project_cost_governance/correction.rs','apps/poms-api-rust/src/project_cost_governance/mod.rs']:
 expected=next(p['sha256'] for p in pins if p['file']==name);b=(ROOT/name).read_bytes();assert sha(b)==expected
 for prefix in ['before','candidate']:
  q=OUT/prefix/name;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
 files.append({'file':name,'beforeSHA256':expected})
(OUT/'base-pins83.json').write_text(json.dumps(files,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'files':files,'RootWritten':False}))
