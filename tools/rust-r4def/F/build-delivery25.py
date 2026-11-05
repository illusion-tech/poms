import difflib
import hashlib
import json
import pathlib
import re
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parents[3]
folder = root / 'tools/rust-r4def/F'
out = folder / 'delivery25.json'
assert not out.exists(), 'Preserve an existing delivery25 report'
archive = folder / 'source-originals25'
originals = json.loads((archive / 'manifest.json').read_text('utf-8-sig'))
original_report = json.loads((folder / 'delivery01.json').read_text('utf-8-sig'))
receipt_path = folder / 'build/author-checks25/receipt.json'
receipt = json.loads(receipt_path.read_text('utf-8-sig'))
assert not receipt['changedDuringRun']
assert all(check['exitCode'] == 0 for check in receipt['checks'])
static_path = folder / 'build/static-checks25/receipt.json'
static = json.loads(static_path.read_text('utf-8-sig'))
assert all(check['exitCode'] == 0 for check in static['checks'])


def pin(path):
    data = path.read_bytes()
    try:
        name = path.relative_to(root).as_posix()
    except ValueError:
        name = str(path)
    return {'file': name, 'bytes': len(data), 'rawBytesSha256': hashlib.sha256(data).hexdigest()}


preserved = originals['preservedArtifacts'] + original_report['actualToolLogs']
for item in preserved:
    path = pathlib.Path(item['file'])
    if not path.is_absolute():
        path = root / path
    assert pin(path)['rawBytesSha256'] == item['rawBytesSha256'], path

products, delta, patch = [], [], []
after = {p['path'].replace('\\', '/').lower(): p['rawBytesSha256'] for p in receipt['inputsAfter']}
for old in originals['productFiles']:
    path = root / old['file']
    prior = archive / old['archiveFile']
    assert pin(prior)['rawBytesSha256'] == old['rawBytesSha256']
    current = pin(path)
    assert after[str(path).replace('\\', '/').lower()] == current['rawBytesSha256']
    products.append(current)
    changed = current['rawBytesSha256'] != old['rawBytesSha256']
    delta.append({'file': old['file'], 'changed': changed, 'previousRawBytesSha256': old['rawBytesSha256'], 'rawBytesSha256': current['rawBytesSha256']})
    if changed:
        patch.extend(difflib.unified_diff(prior.read_text('utf-8').splitlines(True), path.read_text('utf-8').splitlines(True), fromfile='delivery01/' + path.name, tofile='delivery25/' + path.name))
assert {pathlib.Path(p['file']).name for p in delta if p['changed']} == {'evidence.rs', 'service.rs'}
patch_path = folder / 'delta25.patch'
assert not patch_path.exists(), 'Preserve an existing delta25 patch'
patch_path.write_text(''.join(patch), encoding='utf-8', newline='\n')

logs = [pin(pathlib.Path(check['log'])) for check in receipt['checks']]
test_log = pathlib.Path(next(c['log'] for c in receipt['checks'] if c['name'] == 'test')).read_text('utf-8-sig')
assert '24 passed; 0 failed; 0 ignored' in test_log
clippy_log = pathlib.Path(next(c['log'] for c in receipt['checks'] if c['name'] == 'clippy')).read_text('utf-8-sig')
assert 'warning:' not in clippy_log
e_sources = [p for p in receipt['inputsAfter'] if '/project_actual_cost/' in p['path'].replace('\\', '/')]
assert next(p for p in e_sources if p['path'].replace('\\', '/').endswith('/mod.rs'))['rawBytesSha256'] == 'aaaa5126be86c421255d699bcad582131943d7f500754f0db8e55ddfc437a407'
operation_path = root / 'docs/design/rust-r4def/joint-g1-06/operation-map06.json'
operations = [op for op in json.loads(operation_path.read_text('utf-8'))['operations'] if op['group'] == 'F']
handlers = set(re.findall(r'"([A-Za-z][A-Za-z0-9]+)"\s*=>', (root / 'apps/poms-api-rust/src/project_cost_governance/mod.rs').read_text('utf-8')))
assert handlers == {op['operationId'].split('_', 1)[1] for op in operations}
support = [p for p in sorted(folder.rglob('*')) if p.is_file() and 'build' not in p.relative_to(folder).parts and p != out]
report = {
    'kind': 'R4F-integration-correction25-delivery',
    'capturedAt': datetime.now(timezone.utc).isoformat(),
    'baseCommit': '756d813c9578090fcf8e56821acce01b46b40420',
    'worktree': str(root), 'branch': 'codex/poms-r4f-cost-governance',
    'issue': 109, 'parentIssue': 106, 'ancestorIssuesRemainOpen': [101, 57],
    'authorization': 'Root NEW_TASK correction25 after independent preflight22; no public surface/DDL change',
    'driftClassification': 'new-real-drift',
    'authorComplete': True, 'committed': False, 'pushed': False,
    'productWhitelist': 'apps/poms-api-rust/src/project_cost_governance/**',
    'supportWhitelist': 'tools/rust-r4def/F/**',
    'productFiles': products, 'productDeltaFromDelivery01': delta,
    'supportFiles': [pin(p) for p in support],
    'previousDelivery': pin(folder / 'delivery01.json'),
    'originalSourceArchive': pin(archive / 'manifest.json'),
    'preservedArtifactsVerified': preserved,
    'reviewablePatch': pin(patch_path),
    'corrections': [
        'contract stage source selects only typed identity/scope/status/version/date and same-contract preparation currency reference; no numeric amounts/rates/seeds',
        'payable direct source eligibility uses canonical completed, rejects paid alias',
        'real E04 transition helper requires actual confirmed net payment total and version increase, latest anchor proof and strict client CAS unchanged',
        'server-owned safeAuditSummary true; raw money/freeform stays only in immutable evidence',
    ],
    'numericBranchReview': {'record': 'tools/rust-r4def/F/HANDOFF25.md', 'mode': 'static source and frozen schema review', 'notDatabaseEvidence': True, 'globalDependencyFeaturesChanged': False},
    'operationAuthority': pin(operation_path), 'operations': operations,
    'compiledRealESources': e_sources,
    'rootCompilerScaffoldingNotDelivered': receipt['rootOwnedCompilerScaffolding'],
    'checks': {'rustfmt': 'passed', 'actualLibCompileAndPureTests': {'passed': 24, 'failed': 0, 'ignored': 0}, 'clippyMinusDWarnings': 'passed-zero-warnings', 'inputsStableDuringRun': True, 'ownedMarkdownFormatter': 'passed', 'ownedSourceSupportWhitespace': 'passed', 'trackedRootScaffoldingGitDiffCheck': 'passed'},
    'receipt': pin(receipt_path), 'actualToolLogs': logs,
    'staticReceipt': pin(static_path),
    'staticToolLogs': [pin(pathlib.Path(c['log'])) for c in static['checks'] if 'log' in c],
    'realPgReplayPlan': {'file': 'tools/rust-r4def/F/PG-REPLAY25.md', 'status': 'planned-not-executed'},
    'sourceProtocolDelta': {'topLevelCamelContractChanged': False, 'sourcePayloadNewTextKey': 'confirmed_payment_amount_excluding_tax_total', 'canonicalPayableTerminalStatus': 'completed', 'paidAliasAccepted': False, 'immutableESourceBasisChangedByF': False, 'clientCAS': 'strict'},
    'notRun': ['shared PostgreSQL', 'migration execution', 'HTTP/auth/CSRF integration', 'browser', 'business fault injection', 'concurrency', 'real end-to-end producer acceptance', 'real PG large-money hash replay', 'independent G3', 'G4'],
    'unresolvedBusinessQuestions': [], 'independentG3': 'pending-Root', 'G4Certified': False,
}
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'report': str(out), 'rawBytesSha256': pin(out)['rawBytesSha256'], 'changedProductFiles': 2, 'unchangedProductFiles': 4, 'pureTestsPassed': 24, 'clippyWarnings': 0}, ensure_ascii=False))
