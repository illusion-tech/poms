import hashlib
import json
import pathlib
from datetime import datetime, timezone

folder = pathlib.Path(__file__).resolve().parent
output = folder / 'delivery32.json'
assert not output.exists(), 'Preserve the previous sealed fault32 delivery'
matrix = json.loads((folder / 'matrix32.json').read_text('utf-8'))
checks = json.loads((folder / 'static-checks32.json').read_text('utf-8'))
assert checks['passed'] == 9 and checks['failed'] == 0
assert checks['realHttpRequests'] == checks['realPgConnections'] == 0
assert checks['productionSuccessMocked'] is False and checks['pgSyntaxPrepared'] is False
for before in checks['inputPinsBefore']:
    assert hashlib.sha256(pathlib.Path(before['file']).read_bytes()).hexdigest() == before['rawBytesSha256']
    assert next(after for after in checks['inputPinsAfter'] if after['file'] == before['file'])['rawBytesSha256'] == before['rawBytesSha256']
f_root = folder.parents[3]
for delivery in ['delivery25.json']:
    report = json.loads((folder.parent / delivery).read_text('utf-8'))
    for item in report['productFiles']:
        assert hashlib.sha256((f_root / item['file']).read_bytes()).hexdigest() == item['rawBytesSha256']


def pin(path):
    data = path.read_bytes()
    return {'file': path.relative_to(folder).as_posix(), 'bytes': len(data), 'rawBytesSha256': hashlib.sha256(data).hexdigest()}


artifacts = [pin(path) for path in sorted(folder.iterdir()) if path.is_file() and path != output]
report = {
    'kind': 'R4EF-fault-concurrency-tool-candidates32', 'capturedAt': datetime.now(timezone.utc).isoformat(),
    'candidateOnly': True, 'supportWhitelist': 'tools/rust-r4def/F/fault32/**',
    'faultScenarios': 35, 'controlledConcurrencyScenarios': 7,
    'runtimeLabels': 'all planned-not-run; static checks do not certify PG/HTTP/concurrency',
    'rootCallbackEntrypoints': ['runFault32', 'runContendedRace32', 'runSortedFamilyRace32'],
    'sourceInputs': matrix['inputs'], 'artifacts': artifacts,
    'staticEvidence': {'pureRenderingChecksPassed': 9, 'realHttpRequests': 0, 'realPgConnections': 0, 'pgSyntaxPrepared': False, 'productionSuccessMocked': False},
    'actualExecutionRequiredFromRoot': ['actual owned API producers and independent sessions', 'DDL review/install/cleanup on actual acceptance database', 'observable PG advisory/project/family barriers', 'real HTTP500 rollback and exactly one explicit retry', 'case-specific PG business/evidence/source/audit/security/auth/counter assertions', 'cleanup readback and immutable raw evidence', 'independent review'],
    'authBaseline': 'post-independently-committed-eager-touch at observed trigger gate, before pending coflush',
    'unknownCommitOutcome': 'blocks retry and certification',
    'frozenF25ProductionFilesVerifiedUnchanged': True,
    'credentialsRead': False, 'environmentChanged': False, 'rootFilesWritten': False,
    'businessStateSqlFabricated': False, 'committed': False, 'pushed': False, 'GitHubWritten': False,
}
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'delivery': str(output), 'rawBytesSha256': pin(output)['rawBytesSha256'], 'artifactPins': len(artifacts), 'realRuns': 0}, ensure_ascii=False))
