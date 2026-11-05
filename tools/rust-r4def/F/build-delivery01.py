import hashlib
import json
import pathlib
import re
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parents[3]
out = root / 'tools/rust-r4def/F/delivery01.json'
receipt_path = root / 'tools/rust-r4def/F/build/author-checks03/receipt.json'
receipt = json.loads(receipt_path.read_text('utf-8-sig'))
assert not receipt['changedDuringRun']
assert all(check['exitCode'] == 0 for check in receipt['checks'])

def pin(path):
    data = path.read_bytes()
    try:
        name = str(path.relative_to(root)).replace('\\', '/')
    except ValueError:
        name = str(path)
    return {'file': name, 'bytes': len(data), 'rawBytesSha256': hashlib.sha256(data).hexdigest()}

product = sorted((root / 'apps/poms-api-rust/src/project_cost_governance').glob('*.rs'))
product_pins = [pin(p) for p in product]
assert len(product_pins) == 6
after = {p['path'].replace('\\', '/').lower(): p['rawBytesSha256'] for p in receipt['inputsAfter']}
for path in product:
    assert after[str(path).replace('\\', '/').lower()] == pin(path)['rawBytesSha256']
operation_file = root / 'docs/design/rust-r4def/joint-g1-06/operation-map06.json'
operations = [op for op in json.loads(operation_file.read_text('utf-8'))['operations'] if op['group'] == 'F']
handlers = set(re.findall(r'"([A-Za-z][A-Za-z0-9]+)"\s*=>', (product[0].parent / 'mod.rs').read_text('utf-8')))
assert handlers == {op['operationId'].split('_', 1)[1] for op in operations}
log_pins = [pin(pathlib.Path(check['log'])) for check in receipt['checks']]
test_log = pathlib.Path(next(c['log'] for c in receipt['checks'] if c['name'] == 'test')).read_text('utf-8-sig')
assert '22 passed; 0 failed; 0 ignored' in test_log
clippy_log = pathlib.Path(next(c['log'] for c in receipt['checks'] if c['name'] == 'clippy')).read_text('utf-8-sig')
assert 'warning:' not in clippy_log
support = [p for p in sorted((root / 'tools/rust-r4def/F').iterdir()) if p.is_file() and p != out]
report = {
    'kind': 'R4F-author-production-delivery', 'capturedAt': datetime.now(timezone.utc).isoformat(),
    'baseCommit': '756d813c9578090fcf8e56821acce01b46b40420',
    'worktree': str(root), 'branch': 'codex/poms-r4f-cost-governance',
    'issue': 109, 'parentIssue': 106, 'ancestorIssuesRemainOpen': [101,57],
    'authorComplete': True, 'committed': False, 'pushed': False,
    'productWhitelist': 'apps/poms-api-rust/src/project_cost_governance/**',
    'supportWhitelist': 'tools/rust-r4def/F/**',
    'productFiles': product_pins, 'supportFiles': [pin(p) for p in support],
    'operationAuthority': pin(operation_file), 'operations': operations,
    'gateAuthority': pin(root / 'docs/design/rust-r4def/g1-gate-authority07.json'),
    'compiledRealESources': [p for p in receipt['inputsAfter'] if '/project_actual_cost/' in p['path'].replace('\\','/')],
    'rootCompilerScaffoldingNotDelivered': receipt['rootOwnedCompilerScaffolding'],
    'checks': {'rustfmt': 'passed', 'actualLibCompileAndPureTests': {'passed': 22, 'failed': 0, 'ignored': 0}, 'clippyMinusDWarnings': 'passed-zero-warnings', 'inputsStableDuringRun': True, 'ownedMarkdownFormatter': 'passed', 'ownedSourceAndSupportWhitespace': 'passed', 'gitDiffCheckTrackedRootScaffolding': 'passed'},
    'receipt': pin(receipt_path), 'actualToolLogs': log_pins,
    'olderAttemptsPreserved': ['tools/rust-r4def/F/build/author-checks01/runner-failure.json', 'tools/rust-r4def/F/build/author-checks02/receipt.json'],
    'notRun': ['shared PostgreSQL', 'migration execution', 'HTTP/auth/CSRF integration', 'browser', 'business fault injection', 'concurrency', 'real end-to-end producer acceptance', 'independent G3', 'G4'],
    'sourceProtocol': {
        'provider': 'real crate::project_actual_cost',
        'functions': ['source_facts(connection,cost,lock)', 'lock_source_families(connection,all_real_costs)', 'compare_source_transition(cost,prior_payload,current_payload)'],
        'camelKeys': ['sourceRowVersion','currency','amountExcludingTax','taxCostAmount','amountIncludingTax','occurredOn','sourceStatus','sourceType','sourceId','contractId','payableRecordId','sourcePayload','sourceVersionTransition'],
        'FPrivateEnrichment': 'governanceVersionProof; persisted sourceVersionTransitions retains original captured and latest certified/current source versions and payload hashes',
        'comparisonReasons': ['payable-payment-progress-only','rate-superseded-covered-period'],
        'clientCAS': 'strict; immutable E source_basis is not changed',
    },
    'rootIntegrationRequirements': ['normal F/E module registration instead of temporary external E compiler path', 'final frozen Shared/DTO/spec/client/validator and schema06 migration', 'central F business-unique conflict mapping', 'real producer/permission/mixed-LABOR/source-version/rollback/concurrency/cleanup acceptance'],
    'deliberateBoundaries': ['no automatic INCLUDED, operating maturity, economic-event dedup or payment-priority decision', 'no fake execution interval or handover prerequisite for all presigning costs', 'no unverifiable frozen-snapshot cost membership; future restatement dependency', 'active allocation sources cannot be changed by ordinary E replacement or F stage reclassification'],
    'unresolvedBusinessQuestions': [], 'independentG3': 'pending-Root', 'G4Certified': False,
}
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'report': str(out), 'rawBytesSha256': pin(out)['rawBytesSha256'], 'productFiles': len(product), 'operations': len(operations), 'pureTestsPassed': 22, 'clippyWarnings': 0}, ensure_ascii=False))
