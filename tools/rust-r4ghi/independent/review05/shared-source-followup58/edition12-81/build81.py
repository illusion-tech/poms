import hashlib
import json
import pathlib
import shutil

ROOT = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
BASE = ROOT / 'tools/rust-r4ghi/independent/review05/shared-source-followup58'
OLD = BASE / 'edition12-80'
OUT = BASE / 'edition12-81'
sha = lambda b: hashlib.sha256(b).hexdigest()
assert sha((OLD/'manifest80.json').read_bytes()) == 'bfb4038bb3e1ebbd26ffbe72728ff795065ec50e7e04512d89f8b487cf6674f0'
assert not (OUT/'candidate').exists()
for name in ['shared-source-race58.mjs','shared-race58.test.mjs','required-write-sources58.json']:
    logical='tools/rust-r4ghi/business/'+name
    target=OUT/'candidate'/logical;target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(OLD/'candidate'/logical,target)
    before=OUT/'before'/logical;before.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(OLD/'candidate'/logical,before)
shutil.copytree(OLD/'sandbox',OUT/'sandbox')
(OUT/'temp').mkdir()
print('Prepared new81 support-only copies; Root and immutable80 unchanged')
