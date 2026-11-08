import pathlib,json,hashlib
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');OUT=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58/foreign-fiscal-source-proposal84';sha=lambda b:hashlib.sha256(b).hexdigest();pins=json.loads((OUT/'evidence84.json').read_bytes())['sourcePins'];assert not (OUT/'candidate').exists()
for p in pins:
 b=(ROOT/p['file']).read_bytes();assert sha(b)==p['sha256']
 for folder in ['before','candidate']:
  q=OUT/folder/p['file'];q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
print('Prepared84 two current-source candidates without touching Root')
