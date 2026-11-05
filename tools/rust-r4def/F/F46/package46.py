import difflib
import hashlib
import json
import pathlib
from datetime import datetime, timezone

folder = pathlib.Path(__file__).resolve().parent
root = folder.parents[3]
output = folder.parent / 'delivery46.json'
assert not output.exists(), 'Preserve earlier F46 delivery'
archive = folder / 'source-before46'
old = json.loads((archive / 'manifest.json').read_text('utf-8'))
authority_path = folder / 'g2-allocation-freeze51.json.bin'
authority = json.loads(authority_path.read_text('utf-8'))
assert hashlib.sha256(authority_path.read_bytes()).hexdigest() == '76b159d40f528f9735041f286cbc5f8d22f1e686a3955ba94f635a8b5703817f'
receipt_path = folder.parent / 'build/author-checks46/receipt.json'
receipt = json.loads(receipt_path.read_text('utf-8-sig'))
assert not receipt['changedDuringRun'] and all(check['exitCode'] == 0 for check in receipt['checks'])
tested = {p['path'].replace('\\','/').lower(): p['rawBytesSha256'] for p in receipt['inputsAfter']}


def pin(path):
    data = path.read_bytes()
    try:
        name = path.relative_to(root).as_posix()
    except ValueError:
        name = str(path)
    return {'file': name, 'bytes': len(data), 'rawBytesSha256': hashlib.sha256(data).hexdigest()}


products, delta, patch = [], [], []
for item in old['files']:
    path = root / item['file']
    prior = archive / item['archiveFile']
    assert pin(prior)['rawBytesSha256'] == item['rawBytesSha256']
    current = pin(path)
    assert tested[str(path).replace('\\','/').lower()] == current['rawBytesSha256']
    products.append(current)
    changed = item['rawBytesSha256'] != current['rawBytesSha256']
    delta.append({'file': item['file'], 'changed': changed, 'sourceBeforeSha256': item['rawBytesSha256'], 'rawBytesSha256': current['rawBytesSha256']})
    if changed:
        patch.extend(difflib.unified_diff(prior.read_text('utf-8').splitlines(True), path.read_text('utf-8').splitlines(True), fromfile='F25/' + path.name, tofile='F46/' + path.name))
assert {d['file'] for d in delta if d['changed']} == set(authority['authorizedFiles'])
(folder / 'delta46.patch').write_text(''.join(patch), encoding='utf-8', newline='\n')
test_log = pathlib.Path(next(c['log'] for c in receipt['checks'] if c['name'] == 'test'))
assert '32 passed; 0 failed; 0 ignored' in test_log.read_text('utf-8-sig')
clippy_log = pathlib.Path(next(c['log'] for c in receipt['checks'] if c['name'] == 'clippy'))
assert 'warning:' not in clippy_log.read_text('utf-8-sig')
driver_path = folder.parent / 'acceptance44/delivery44.json'
driver = json.loads(driver_path.read_text('utf-8'))
assert driver['runtimeStatus'] == 'all not-run' and driver['staticChecks']['actualHttpRequests'] == 0
for item in driver['sourceInputs']:
    assert hashlib.sha256(pathlib.Path(item['file']).read_bytes()).hexdigest() == item['rawBytesSha256']
proposal_path = folder.parent / 'proposal-mainbasis45/proposal45-manifest.json'
assert pin(proposal_path)['rawBytesSha256'] == authority['proposal']['sha256']
for item in json.loads(proposal_path.read_text('utf-8'))['artifacts']:
    assert hashlib.sha256((proposal_path.parent / item['file']).read_bytes()).hexdigest() == item['rawBytesSha256']
report = {
    'kind': 'R4F46-selected-main-basis-corrective-author-delivery', 'capturedAt': datetime.now(timezone.utc).isoformat(),
    'baseCommit': '756d813c9578090fcf8e56821acce01b46b40420', 'branch': 'codex/poms-r4f-cost-governance',
    'G2Authority': pin(authority_path), 'independentlyFrozenProposal': pin(proposal_path),
    'productFiles': products, 'productDeltaFromF25': delta,
    'sourceBeforeArchive': pin(archive / 'manifest.json'),
    'supportFiles': [pin(p) for p in sorted(folder.rglob('*')) if p.is_file()],
    'checks': {'actualProductionLibAndPureTests': {'passed':32,'failed':0,'ignored':0}, 'rustfmt':'passed', 'clippyMinusDWarnings':'passed-zero-warnings', 'allInputsStableDuringRun':True},
    'receipt': pin(receipt_path), 'actualToolLogs': [pin(pathlib.Path(c['log'])) for c in receipt['checks']],
    'compiledRealESources': [item for item in receipt['inputsAfter'] if '/project_actual_cost/' in item['path'].replace('\\','/')],
    'RootOwnedCompilerScaffoldingNotDelivered': receipt['rootOwnedCompilerScaffolding'],
    'policy': {'id':'selected-measurement-first','version':2,'privateBasisAndEachResultEvidenceHashBound':True,'roundingFamilyColumn':'largest-remainder-cents-v1','publicDtoChanged':False,'ddlChanged':False,'oldF25Rewritten':False},
    'requestOnlyAcceptanceDriver': pin(driver_path),
    'actualPgExecutedByAuthor':False,'actualHttpExecutedByAuthor':False,'credentialsRead':False,'environmentChanged':False,
    'notRun':['unified Root build','actual F44 HTTP','private policy/source/hash PG readback','fault32 rollback and controlled races','independent G3','G4'],
    'committed':False,'pushed':False,'RootSharedWritten':False,'G3Certified':False,'G4Certified':False,
}
output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
print(json.dumps({'delivery':str(output),'rawBytesSha256':pin(output)['rawBytesSha256'],'changedProductFiles':2,'pureTestsPassed':32,'clippyWarnings':0,'F44RealRuns':0}))
