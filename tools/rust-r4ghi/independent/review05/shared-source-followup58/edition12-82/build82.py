import hashlib
import json
import pathlib
import shutil

ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58';OUT=BASE/'edition12-82';OLD=BASE/'edition12-81';sha=lambda b:hashlib.sha256(b).hexdigest()
mb=(OLD/'manifest81.json').read_bytes();assert sha(mb)=='7982f478f7bf30cd66006981e2f5b1d5d0a15a9b89abd34b2e7af89e77e8dcbd';m=json.loads(mb)
assert not (OUT/'candidate').exists()
for f in m['effectiveFiles']:assert sha((ROOT/f['file']).read_bytes())==f['afterSHA256'],f['file']
for name in ['shared-source-preparation58.mjs','shared-source-inventory58.mjs','shared-source58.test.mjs','required-write-sources58.json']:
 logical='tools/rust-r4ghi/business/'+name
 for prefix in ['candidate','before']:
  p=OUT/prefix/logical;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/logical,p)
shutil.copytree(OLD/'sandbox',OUT/'sandbox');(OUT/'temp').mkdir()
print('Copied new82 candidate only; currentRoot152 graph and81 preserved')
