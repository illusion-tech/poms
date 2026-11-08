import hashlib
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
BASE = ROOT / 'tools/rust-r4ghi/independent/review05/shared-source-followup58'
OUT = BASE / 'edition12-80'
assert not (OUT / 'candidate').exists(), 'Keep a prior edition immutable'
sha = lambda b: hashlib.sha256(b).hexdigest()
candidate_file = pathlib.Path(r'\\wsl.localhost\Debian\home\wangzishi\.local\share\poms-r4ghi\private\business\g2-business12\main01\004534-candidate-source-binding12.json')
candidate_bytes = candidate_file.read_bytes()
assert sha(candidate_bytes) == 'b5c86c8882657aac1e1affc153510a728bc304943265e51a230b6be19a0429b7'
actual = json.loads(candidate_bytes)
source_hash = '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa'
binary_hash = 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff'
assert actual['epoch'] == 'g2-business12' and actual['run'] == 'main01'
assert actual['sourcePinsSHA256'] == source_hash
assert len(actual['sourcePins']) == 406
assert sha(json.dumps(actual['sourcePins'], separators=(',', ':')).encode()) == source_hash
assert actual['process']['record']['binarySha256'] == binary_hash
assert actual['migrations'] == 97 and actual['tables'] == 139
for pin in actual['sourcePins']:
    assert sha((ROOT / pin['file']).read_bytes()) == pin['sha256'], pin['file']
context = (ROOT / 'tools/rust-r4ghi/business/context.mjs').read_text()
direct = re.search(r'const directFiles = \[(.*?)\];', context, re.S).group(1)
files = re.findall(r"'([^']+)'", direct)
for folder, suffix in [('apps/poms-api-rust/src', '.rs'), ('apps/poms-api/src/migrations', '.ts'), ('libs/shared/contracts/src', '.ts')]:
    files.extend(p.relative_to(ROOT).as_posix() for p in (ROOT / folder).rglob('*' + suffix))
assert sorted(set(files)) == sorted(p['file'] for p in actual['sourcePins']), 'Actual source closure changed'

business = ROOT / 'tools/rust-r4ghi/business'
base_helpers = [{'file': p.relative_to(ROOT).as_posix(), 'sha256': sha(p.read_bytes())} for p in sorted(business.iterdir()) if p.is_file() and p.suffix in ['.mjs', '.json']]
assert len(base_helpers) == 141
for name, expected in [('upstream.mjs', '6c40e9d368d62433b9541e13880f389e757428d01d96c617a542ce714f078889'), ('faults.mjs', '632f875dff88e7f08697529a2b78a5853b842956f49269d1ba7e7b95798b8118')]:
    assert sha((business / name).read_bytes()) == expected
    before = OUT / 'before/tools/rust-r4ghi/business' / name
    before.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(business / name, before)

source_root = 'candidate/tools/rust-r4ghi/business'
for edition, names in [('raceC', ['faults.mjs', 'shared-source-inventory58.mjs', 'shared-source-preparation58.mjs', 'shared-source-sweep58.mjs', 'shared-source58.test.mjs', 'shared-source-race58.mjs', 'shared-race58.test.mjs']), ('phaseB', ['shared-tax-producer58.mjs', 'shared-tax58.test.mjs'])]:
    for name in names:
        target = OUT / source_root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(BASE / edition / source_root / name, target)

upstream = (business / 'upstream.mjs').read_text()
needle = 'export async function runBusinessStage(ctx, api, stage) {\n'
assert upstream.count(needle) == 1
hooks = """  if (stage === 'shared-stage-race58') { await api.login('manager'); const { prepareSharedStage58 } = await import('./shared-source-preparation58.mjs'); await prepareSharedStage58(ctx, api); const { runSharedCorrectionSweep58 } = await import('./shared-source-sweep58.mjs'); return runSharedCorrectionSweep58(ctx, api, 'stage', { successMode: 'ordered-race' }); }
  if (stage === 'shared-stage-sweep58') { await api.login('manager'); const { prepareSharedStage58 } = await import('./shared-source-preparation58.mjs'); await prepareSharedStage58(ctx, api); const { runSharedCorrectionSweep58 } = await import('./shared-source-sweep58.mjs'); return runSharedCorrectionSweep58(ctx, api, 'stage'); }
  if (stage === 'shared-tax-fixture58') { await api.login('manager'); const { produceSharedTaxFixture58 } = await import('./shared-tax-producer58.mjs'); return produceSharedTaxFixture58(ctx, api); }
  if (stage === 'shared-tax-sweep58') { await api.login('manager'); const { runSharedCorrectionSweep58 } = await import('./shared-source-sweep58.mjs'); return runSharedCorrectionSweep58(ctx, api, 'tax'); }
"""
(OUT / source_root / 'upstream.mjs').write_text(upstream.replace(needle, needle + hooks), encoding='utf-8', newline='\n')
preparation = OUT / source_root / 'shared-source-preparation58.mjs'
text = preparation.read_text()
needle = " const bytes=fs.readFileSync(ctx.win+'/'+SHARED58_SOURCE),m=JSON.parse(bytes);assert.equal(m.kind,'exact-shared-source-implicit-batch-followup58');\n"
assert text.count(needle) == 1
replacement = needle + " assert.equal(ctx.epoch,'g2-business12');assert.equal(ctx.run,'main01');assert.equal(m.sourceEdition,'g2-business12/API135');assert.equal(m.sourceInputSHA256,'" + source_hash + "');assert.equal(sha(JSON.stringify(ctx.pins)),m.sourceInputSHA256);assert.equal(ctx.state.apiProcess?.record?.binarySha256,'" + binary_hash + "');assert.equal(m.binarySHA256,ctx.state.apiProcess.record.binarySha256);readPin54(m.actualSource12Candidate);\n"
text = text.replace(needle, replacement)
needle = 'preparationReceipts:[initial.receipt,primary.receipt,...all.map(x=>x.receipt)],producerReferenceSource:'
replacement = 'preparationReceipts:[initial.receipt,primary.receipt,...all.map(x=>x.receipt)],targetPreparations:all.map(x=>x.preparation),producerReferenceSource:'
assert text.count(needle) == 1
preparation.write_text(text.replace(needle, replacement), encoding='utf-8', newline='\n')

provenance = {'kind': 'new-source12-edition80-draft-build-not-executed', 'actualCandidate': {'file': actual['process']['file'].rsplit('/', 1)[0] + '/004534-candidate-source-binding12.json' if False else '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/004534-candidate-source-binding12.json', 'rawBytesSha256': sha(candidate_bytes)}, 'sourceInputSHA256': source_hash, 'binarySHA256': binary_hash, 'productSources': actual['sourcePins'], 'baseHelperSources': base_helpers, 'baseHelperCount': 141, 'sourceCount': 406, 'migrations': 97, 'tables': 139, 'RootWritten': False, 'SQL': False, 'HTTP': False}
(OUT / 'input-provenance80.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'candidate': str(OUT / source_root), 'sourceCount': 406, 'baseHelpers': len(base_helpers), 'sourceSHA256': source_hash, 'migrations': 97, 'currentRootToolsUnchanged': True}))
