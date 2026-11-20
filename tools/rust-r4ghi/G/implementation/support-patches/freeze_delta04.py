"""Freeze the parent-applied facade, preserve late changes as an explicit delta."""
from pathlib import Path
import difflib,hashlib,json,subprocess
OUT=Path(__file__).resolve().parent
BASE=Path('E:/projects/worktrees/poms-r3hijk-next28/poms/apps/poms-api-rust/src/project_cost_governance/correction.rs')
EXPECTED='341945833c0ad6cce49c594358f440cacfbe591d9c8a6c01ff0a87687c5d8add'
original=BASE.read_bytes()
if hashlib.sha256(original).hexdigest()!=EXPECTED:raise RuntimeError('Parent base changed; refuse to fabricate a delta against a different input')
candidate=OUT/'correction_facade_delta04.rs.txt'
if hashlib.sha256((OUT/'correction_facade.rs.txt').read_bytes()).hexdigest()==EXPECTED:
    if candidate.exists() and (OUT/'correction-facade-delta04.json').exists():
        print('Already frozen; preserved original and delta04 bytes')
        raise SystemExit(0)
    raise RuntimeError('No unfrozen candidate exists; do not fabricate an empty delta')
candidate.write_bytes((OUT/'correction_facade.rs.txt').read_bytes())
subprocess.run(['rustfmt','--edition','2024','--config','skip_children=true',str(candidate)],check=True)
before=original.decode('utf-8');after=candidate.read_text(encoding='utf-8')
patch=''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/apps/poms-api-rust/src/project_cost_governance/correction.rs',tofile='b/apps/poms-api-rust/src/project_cost_governance/correction.rs'))
(OUT/'correction-facade-delta04.patch').write_text(patch,encoding='utf-8',newline='')
(OUT/'correction_facade.rs.txt').write_bytes(original)
meta={'kind':'frozen-parent-base-and-explicit-delta04','frozenFacadeSha256':EXPECTED,'deltaCandidateSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'deltaPatchSha256':hashlib.sha256((OUT/'correction-facade-delta04.patch').read_bytes()).hexdigest(),'applied':False,'compiled':False,'realDatabaseValidated':False,'changes':['Complete typed Tax source assertions; persist selected real fiscal source references via F','Rebind real producer successor source ID/version/businessDate before later same-TX consumers','No synthetic IDs, money or context; no change to frozen delta02/03 originals'],'open':['Root actual integrated cargo check required','Shared Tax dependency discovery must match G prepare/write roots; facade fails closed if actual dependent project was omitted','Nonzero unposted F tax impact and shared pending-tax attribution require business acceptance; never automatically add taxImpactAmount to cost','Changed multi-day labor work interval without a genuine whole-period stage authority remains typed unsupported; no interval inference','Normal period close replacing live current remains an undecided user boundary']}
(OUT/'correction-facade-delta04.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(meta,ensure_ascii=False))
