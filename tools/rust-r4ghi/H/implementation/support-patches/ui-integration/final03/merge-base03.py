from pathlib import Path
import hashlib,json
HERE=Path(__file__).resolve().parent
UI=HERE.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(UI/'manifest.json')=='a138b237faedac017910947cd140d652e5e941a767c82591c20e309dee949d45'
assert sha(UI/'append02/manifest02.json')=='c5a3db0431a977553ae1393129de56d4f0ba44b09b5efb3b4db565c4119e582e'
sources=[]
for p in sorted((UI/'proposed').rglob('*')):
    if not p.is_file():continue
    rel=p.relative_to(UI/'proposed')
    follow=UI/'append02/proposed'/rel
    source=follow if follow.is_file() else p
    target=HERE/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(source.read_bytes())
    sources.append({'path':rel.as_posix(),'source':str(source.relative_to(UI)),'SHA256':sha(source)})
(HERE/'base03.json').write_text(json.dumps({'status':'merged-sealed-candidates-not-product','files':sources},indent=2)+'\n',encoding='utf8')
