from pathlib import Path
import hashlib, json, re, sys, shutil, subprocess
from datetime import datetime, timezone
ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent / sys.argv[1]
OUT.mkdir(exist_ok=False)
def raw(p): return (ROOT / p).read_bytes()
def sha(b): return hashlib.sha256(b).hexdigest()
def doc(p): return json.loads(raw(p))
def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
core = {
 'tools/rust-r4ghi/joint-g1/blueprint.json':'a7a5037f97bb12453cd26210090f9c1fa1e8fb4ecfcc88bf33f66cd1eaeccac0',
 'tools/rust-r4ghi/joint-g1/migration.sql':'16204f79f6ffbb63ca25cb76c687d24e047a30133c83af82333f24b98d9d2512',
 'tools/rust-r4ghi/joint-g1/source-context.schema.json':'959e14c53e74e8001cd90a2afcb66b6009e98e549f6e3f8399586475943aeba8',
 'tools/rust-r4ghi/joint-g1/policy-definition.json':None,
 'tools/rust-r4ghi/joint-g1/integration.md':None,
 'tools/rust-r4ghi/joint-g1/sources.json':None,
 'tools/rust-r4ghi/joint-g1/native-reference.schemas.json':None,
 'tools/rust-r4ghi/joint-g1/capacity-delta02/capacity-audit.json':None,
 'tools/rust-r4ghi/joint-g1/capacity-delta02/capacity-delta.md':None,
 'docs/design/rust-r4ghi/user-decision-scope03.json':None,
 'docs/design/rust-r4ghi/user-decisions02.json':None,
}
manifest=[]
for i,(path,expected) in enumerate(core.items()):
    b=raw(path); target=f'inputs/{i:02d}-{Path(path).name}.bin'
    (OUT/'inputs').mkdir(exist_ok=True)
    (OUT/target).write_bytes(b)
    manifest.append({'path':path,'bytes':len(b),'sha256':sha(b),'expectedSha256':expected,'expectedMatches':expected is None or sha(b)==expected,'rawCopy':target})
b = doc('tools/rust-r4ghi/joint-g1/blueprint.json')
sql = raw('tools/rust-r4ghi/joint-g1/migration.sql').decode('utf-8-sig')
policy = doc('tools/rust-r4ghi/joint-g1/policy-definition.json')
canon = json.dumps(policy, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
source_manifest=doc('tools/rust-r4ghi/joint-g1/sources.json')
sources=[]
for e in source_manifest['entries']:
    p=ROOT/e['path']
    bs=p.read_bytes() if p.exists() else None
    sources.append({'path':e['path'],'expectedSha256':e['sha256'],'actualSha256':sha(bs) if bs is not None else None,'bytes':len(bs) if bs is not None else None,'matches':bs is not None and sha(bs)==e['sha256'] and len(bs)==e['bytes']})
save('candidate-inputs.json',{'capturedAt':datetime.now(timezone.utc).isoformat(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'algorithm':'SHA-256 raw bytes, no normalization','inputs':manifest,'policyCanonicalHash':sha(canon),'policyExpectedCanonicalHash':b['policyIdentity']['policyHash'],'policyHashMatches':sha(canon)==b['policyIdentity']['policyHash'],'sourcePins':sources})
checks=[]
def check(name,pass_,evidence): checks.append({'id':name,'result':'pass' if pass_ else 'fail','evidence':evidence})
ops=b['operationMap']
check('unique-32-target-operations',len(ops)==32 and len({o['operationId'] for o in ops})==32 and len({o['canonical'] for o in ops})==32,len(ops))
check('group-counts', {k:sum(o['group']==k for o in ops) for k in ('G','H','I','R5-min')}=={'G':9,'H':8,'I':11,'R5-min':4}, {k:sum(o['group']==k for o in ops) for k in ('G','H','I','R5-min')})
new=[o for o in ops if o['newPublicOperation']]
check('three-named-new-routes',len(new)==3 and {o['runtimePath'] for o in new}=={'/api/projects/{id}:startExecution','/api/projects/{id}:startAcceptance','/api/project-completion-records/{completionRecordId}/conditions/{id}:close'},[{k:o[k] for k in ('canonical','namedResourceKeys')} for o in new])
writes=[o for o in ops if o['method']=='POST']
check('16-modern-write-protocols',len(writes)==16 and all(o.get('requestProtocol',{}).get('requiredInputVersion')=='server-derived-v1' for o in writes),len(writes))
check('all-route-resource-keys',all(set(re.findall(r'\{(\w+)\}',o['runtimePath']))==set(o['namedResourceKeys']) for o in ops),'all 32 exact named route keys')
created=re.findall(r'^CREATE TABLE poms\.(\w+)\s*\(',sql,re.M)
check('19-tables-exact-closure',len(created)==19 and len(set(created))==19 and set(created)==set(b['migration']['newTables']),created)
check('all-observed-source-pins',all(e['matches'] for e in sources),{'total':len(sources),'mismatches':[e for e in sources if not e['matches']]})
check('frozen-draft-core-pins',all(e['expectedMatches'] for e in manifest),[e['path'] for e in manifest if not e['expectedMatches']])
check('policy-canonical-hash',sha(canon)==b['policyIdentity']['policyHash'],sha(canon))
check('11-policy-matrix-rows',[r['id'] for r in policy['ruleContract']['ruleRows']]==[f'H{i:02d}' for i in range(1,12)],policy['ruleContract']['ruleRows'])
native=doc('tools/rust-r4ghi/joint-g1/native-reference.schemas.json')
refs=[]
def walk(v,p=''):
    if isinstance(v,dict):
        if '$ref' in v: refs.append((p,v['$ref']))
        for k,x in v.items(): walk(x,p+'/'+k)
    elif isinstance(v,list):
        for i,x in enumerate(v): walk(x,p+'/'+str(i))
walk(native['components'])
missing=[]
for p,r in refs:
    target=native
    if not r.startswith('#/'): missing.append({'at':p,'ref':r});continue
    try:
        for k in r[2:].split('/'): target=target[k.replace('~1','/').replace('~0','~')]
    except (KeyError,TypeError): missing.append({'at':p,'ref':r})
check('native-reference-recursive-closure',not missing,{'schemas':len(native['components']['schemas']),'refs':len(refs),'missing':missing})
save('structural-checks.json',{'qualification':'independent static checks only; no SQL/HTTP/UI/product acceptance and no G1 Pass','checks':checks})
print(json.dumps({'output':str(OUT),'checks':len(checks),'failed':[x['id'] for x in checks if x['result']=='fail'],'sourcePinCount':len(sources),'sourceMismatches':[e['path'] for e in sources if not e['matches']],'policyCanonicalHash':sha(canon)},ensure_ascii=False))