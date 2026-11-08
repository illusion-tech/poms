import hashlib
import json
import pathlib
import shutil

ROOT = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT = ROOT / 'tools/rust-r4ghi/independent/review05/shared-source-followup58/edition12-80'
CANDIDATE = OUT / 'candidate'
SANDBOX = OUT / 'sandbox'
sha = lambda b: hashlib.sha256(b).hexdigest()
provenance = json.loads((OUT / 'input-provenance80.json').read_bytes())
source58 = CANDIDATE / 'tools/rust-r4ghi/business/required-write-sources58.json'
assert not source58.exists(), 'Do not replace a previously frozen graph'
base = provenance['baseHelperSources']
for pin in base + provenance['productSources']:
    assert sha((ROOT / pin['file']).read_bytes()) == pin['sha256'], pin['file']
helpers = {p['file']: p['sha256'] for p in base}
for path in CANDIDATE.rglob('*'):
    if path.is_file(): helpers[path.relative_to(CANDIDATE).as_posix()] = sha(path.read_bytes())
old_manifest = json.loads((OUT.parent / 'phaseA/candidate/tools/rust-r4ghi/business/required-write-sources58.json').read_bytes())
outside = [p for p in old_manifest['helperSources'] if not p['file'].startswith('tools/rust-r4ghi/business/')]
for p in outside:
    assert sha((ROOT / p['file']).read_bytes()) == p['sha256'], p['file']
    helpers[p['file']] = p['sha256']
manifest = {'kind':'exact-shared-source-implicit-batch-followup58','version':80,'sourceEdition':'g2-business12/API135',
            'sourceInputSHA256':provenance['sourceInputSHA256'],'binarySHA256':provenance['binarySHA256'],
            'actualSource12Candidate':provenance['actualCandidate'],'productSources':provenance['productSources'],
            'helperSources':[{'file':f,'sha256':h} for f,h in sorted(helpers.items())],
            'predecessorActualEF40':old_manifest['predecessorActualEF40'],
            'scope':'Stage-only same-stage shared source / Tax-only same-pending shared source implicit complete batch; optional actual Stage correction/capture race; live targets only; no allocationOverride',
            'authorSupportOnly':True,'G3Certified':False,'G4Certified':False}
source58.parent.mkdir(parents=True,exist_ok=True)
source58.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
assert not SANDBOX.exists()
for pin in base + outside:
    target = SANDBOX / pin['file']; target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT / pin['file'], target)
for path in CANDIDATE.rglob('*'):
    if path.is_file():
        target = SANDBOX / path.relative_to(CANDIDATE); target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(path, target)
(OUT / 'temp').mkdir(exist_ok=True)
summary = {'kind':'materialized-source12-overlay80-not-executed','productSources':len(manifest['productSources']),
           'baseBusinessHelpers':len(base),'finalBusinessHelpers':len([p for p in manifest['helperSources'] if p['file'].startswith('tools/rust-r4ghi/business/')])+1,
           'helperSourcesExcludingSelfIncludingOutside':len(manifest['helperSources']),'targetFiles':len(list(CANDIDATE.rglob('*.*'))),
           'source58SHA256':sha(source58.read_bytes()),'sourceInputSHA256':provenance['sourceInputSHA256'],'SQL':False,'HTTP':False}
(OUT / 'materialize80.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(summary))
