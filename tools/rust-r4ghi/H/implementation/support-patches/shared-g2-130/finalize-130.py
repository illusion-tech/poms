from pathlib import Path
import json,hashlib,difflib
HERE=Path(__file__).resolve().parent
plan=json.loads((HERE/'plan130.json').read_text(encoding='utf8'));root=Path(plan['productReadRoot'])
sha=lambda raw:hashlib.sha256(raw).hexdigest()
files=[];patch=''
for rel,index in [(plan['canonicalTarget'],4),(plan['generatedTarget'],5)]:
    old=(HERE/plan['inputClosure'][index]['snapshot']).read_bytes();current=(root/rel).read_bytes()
    assert old==current,('Root base changed; do not promote stale candidate',rel)
    new=(HERE/'proposed'/rel).read_bytes()
    files.append({'path':rel,'originalSHA256':sha(old),'proposedSHA256':sha(new),'bytes':len(new)})
    patch+=''.join(difflib.unified_diff(old.decode().splitlines(True),new.decode().splitlines(True),fromfile='a/'+rel,tofile='b/'+rel))
for entry in plan['inputClosure']:assert sha((HERE/entry['snapshot']).read_bytes())==entry['SHA256']
(HERE/'shared130.patch').write_bytes(patch.encode())
manifest={'status':'Root-promotion-candidate-not-applied','schemaCount':130,'productWrites':False,'newPublicHttp':0,'files':files,'inputClosure':plan['inputClosure'],'currentRootSharedContextPreserved':json.loads((HERE/'main-shared-ast130.json').read_text()),'validation':{'typescript':json.loads((HERE/'typecheck130.json').read_text()),'parserUnits':json.loads((HERE/'runtime130.json').read_text())}}
(HERE/'manifest130.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'files':len(files),'manifestSHA256':sha((HERE/'manifest130.json').read_bytes()),'patchSHA256':sha((HERE/'shared130.patch').read_bytes()),'productFiles':files}))
