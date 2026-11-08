import pathlib,json,hashlib,shutil
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');OUT=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58/tax-continuation13-draft85';SANDBOX=OUT/'sandbox';sha=lambda b:hashlib.sha256(b).hexdigest();assert not SANDBOX.exists();pins=[]
for p in sorted((ROOT/'tools/rust-r4ghi/business').iterdir()):
 if p.is_file() and p.suffix in ['.mjs','.json']:
  logical=p.relative_to(ROOT);q=SANDBOX/logical;q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q);pins.append({'file':logical.as_posix(),'sha256':sha(p.read_bytes())})
outside=['apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts','tools/rust-r4abc/upstream-payloads01.mjs','tools/rust-r4ghi/userfix/pure.mjs','tools/rust-r4ghi/userfix/status.mjs']
for name in outside:
 q=SANDBOX/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,q)
for p in (OUT/'candidate').rglob('*'):
 if p.is_file():
  q=SANDBOX/p.relative_to(OUT/'candidate');q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q)
(OUT/'temp').mkdir(exist_ok=True);(OUT/'test-only-base85.json').write_text(json.dumps({'kind':'unbound-proposal-test-sandbox-only-not-Source13-freeze','observedBusinessHelperCount':len(pins),'observedBaseHelpers':pins,'Source13FinalCount':None,'Source13FinalGraph':None,'RootWritten':False,'SQL':False,'HTTP':False},indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'testOnlyBaseHelperCount':len(pins),'RootWritten':False,'Source13Frozen':False}))
