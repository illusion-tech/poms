import hashlib,json,pathlib,shutil
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58';OUT=BASE/'edition12-82';sha=lambda b:hashlib.sha256(b).hexdigest()
p=OUT/'candidate/tools/rust-r4ghi/business/required-write-sources58.json';before=(OUT/'before/tools/rust-r4ghi/business/required-write-sources58.json').read_bytes();assert p.read_bytes()==before
m=json.loads(before);m['version']=82
for name in ['shared-source-preparation58.mjs','shared-source-inventory58.mjs','shared-source58.test.mjs']:
 logical='tools/rust-r4ghi/business/'+name;a=[x for x in m['helperSources'] if x['file']==logical];assert len(a)==1;a[0]['sha256']=sha((OUT/'candidate'/logical).read_bytes())
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
for q in (OUT/'candidate').rglob('*'):
 if q.is_file():shutil.copyfile(q,OUT/'sandbox'/q.relative_to(OUT/'candidate'))
for pin in m['helperSources']:
 q=OUT/'candidate'/pin['file']
 if not q.exists():q=ROOT/pin['file']
 assert sha(q.read_bytes())==pin['sha256'],pin['file']
print(json.dumps({'source58SHA256':sha(p.read_bytes()),'sourceCount':len(m['productSources']),'helperPins':len(m['helperSources']),'RootChanged':False}))
