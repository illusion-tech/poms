import hashlib
import json
import pathlib
from datetime import datetime, timezone

folder = pathlib.Path(__file__).resolve().parent
output = folder / 'delivery44.json'
assert not output.exists(), 'Preserve a sealed driver delivery'
checks = json.loads((folder / 'static-checks44-02.json').read_text('utf-8'))
assert checks['passed'] == 6 and checks['failed'] == 0
assert checks['actualHttpRequests'] == checks['actualDatabaseConnections'] == 0
driver = folder / 'request-suite44.mjs'
assert hashlib.sha256(driver.read_bytes()).hexdigest() == checks['driverRawSha256']
for pin in checks['manifest']['sourcePins']:
    assert hashlib.sha256(pathlib.Path(pin['file']).read_bytes()).hexdigest() == pin['rawBytesSha256']


def pin(file):
    value = file.read_bytes()
    return {'file': file.name, 'bytes': len(value), 'rawBytesSha256': hashlib.sha256(value).hexdigest()}


report = {
    'kind': 'F44-request-only-F12-acceptance-candidate', 'capturedAt': datetime.now(timezone.utc).isoformat(),
    'candidateOnly': True, 'sourceInputs': checks['manifest']['sourcePins'],
    'artifacts': [pin(file) for file in sorted(folder.iterdir()) if file.is_file() and file != output],
    'cases': checks['manifest']['cases'], 'F12': checks['manifest']['f12Operations'],
    'staticChecks': {'passed': 6, 'actualHttpRequests': 0, 'actualDatabaseConnections': 0, 'productionSuccessMocked': False},
    'sourcePolicy': {'expectedId': 'selected-measurement-first', 'expectedVersion': 2, 'authority': 'Root g2-allocation-freeze51', 'runtimeF46DeploymentBinding': 'Root-required', 'privatePolicyAndHashes': 'separate actual PG verification required'},
    'callback': 'request(operationId,idOrNull,bodyOrNull,actualActor,meta)->{status,body,receiptId,requestId?}',
    'sourceProducers': 'actual E expense/create+confirm+map and actual E publish+labor; MAX uses actual C payable -> E procurement -> F, no SQL producer',
    'runtimeStatus': 'all not-run', 'rootWritten': False, 'credentialsRead': False, 'environmentChanged': False,
    'committed': False, 'pushed': False, 'G3Certified': False, 'G4Certified': False,
}
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'delivery': str(output), 'rawBytesSha256': pin(output)['rawBytesSha256'], 'cases': len(report['cases']), 'F12': len(report['F12']), 'actualHttpRequests': 0}))
