from pathlib import Path
import json,hashlib,difflib
HERE=Path(__file__).resolve().parent
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
read=lambda name:json.loads((HERE/name).read_text(encoding='utf8'))
ng=read('ngc-full03.json');assert ng['status']=='passed' and ng['sourceStable'] and ng['templateDiagnostics']==0 and not ng['errors']
for rel,digest in ng['inputSHA256'].items():assert sha((ROOT/rel).read_bytes())==digest,('Product input changed after actual ngc; recheck required',rel)
files=[];patch=''
for candidate in sorted((HERE/'proposed').rglob('*')):
    if not candidate.is_file():continue
    rel=candidate.relative_to(HERE/'proposed').as_posix();target=ROOT/rel;exists=target.exists();old=target.read_bytes() if exists else b'';new=candidate.read_bytes()
    snapshot=HERE/'originals'/rel;snapshot.parent.mkdir(parents=True,exist_ok=True)
    if snapshot.exists():assert snapshot.read_bytes()==old,('Root base changed; do not reseal',rel)
    else:snapshot.write_bytes(old)
    files.append({'path':rel,'originalExists':exists,'originalSHA256':sha(old) if exists else None,'proposedSHA256':sha(new),'bytes':len(new)})
    patch+=''.join(difflib.unified_diff(old.decode('utf8').splitlines(True),new.decode('utf8').splitlines(True),fromfile='a/'+rel if exists else '/dev/null',tofile='b/'+rel))
assert len(files)==21
(HERE/'ui-final03.patch').write_bytes(patch.encode())
inputs=['libs/shared/contracts/src/lib/shared-contracts.ts','libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts','libs/shared/api-spec/openapi.json','tmp/rust-r4ghi/root/client-generation05/receipt.json']
closure=[]
for i,rel in enumerate(inputs):
    raw=(ROOT/rel).read_bytes();name=f'inputs/{i+1:02d}-{Path(rel).name}.bin';p=HERE/name;p.parent.mkdir(exist_ok=True);p.write_bytes(raw);closure.append({'source':rel,'snapshot':name,'SHA256':sha(raw)})
manifest={'status':'Root-exact-promotion-candidate-not-applied-or-certified','candidate01ManifestSHA256':sha((HERE.parent/'manifest.json').read_bytes()),'append02ManifestSHA256':sha((HERE.parent/'append02/manifest02.json').read_bytes()),'files':files,'extraInputClosure':closure,'validation':{'actualFullAppNgcOverlay':ng,'actualRequestEnumUnits':read('client-values-unit03.json'),'actualCanonicalContextUnits':read('facts-unit03.json'),'actualSdkNullTypeNegative':read('sdk-null-proof.json')},'newPublicHttp':0,'productWrites':False,'notRun':['Root applied-product ng build','real browser DOM','actual HTTP/upload/PG acceptance','business G3/G4 certification']}
(HERE/'manifest03.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'files':len(files),'manifestSHA256':sha((HERE/'manifest03.json').read_bytes()),'patchSHA256':sha((HERE/'ui-final03.patch').read_bytes()),'fullNgcDiagnostics':0,'productWrites':False}))
