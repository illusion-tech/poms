import hashlib
import json
import pathlib
from datetime import datetime, timezone

folder = pathlib.Path(__file__).resolve().parent
out = folder / 'proposal45-manifest.json'
assert not out.exists(), 'Preserve the sealed proposal manifest'
checks = json.loads((folder / 'static-model-checks45.json').read_text('utf-8'))
assert checks['failed'] == 0
f_root = folder.parents[3]
old = json.loads((folder.parent / 'delivery25.json').read_text('utf-8'))
for item in old['productFiles']:
    assert hashlib.sha256((f_root / item['file']).read_bytes()).hexdigest() == item['rawBytesSha256']
pins = []
for file in sorted(folder.iterdir()):
    if file.is_file() and file != out:
        data = file.read_bytes()
        pins.append({'file': file.name, 'bytes': len(data), 'rawBytesSha256': hashlib.sha256(data).hexdigest()})
report = {
    'kind': 'independently-freezable-selected-main-basis-proposal45',
    'capturedAt': datetime.now(timezone.utc).isoformat(),
    'decisionAuthority': 'Root explicit current-task message: user selected measurementBasis priority; Root decision48/checkpoint and independent review remain Root-owned',
    'proposalOnly': True, 'productImplementationAuthorizedByThisArtifact': False,
    'publicDtoChanged': False, 'ddlChanged': False, 'environmentChanged': False,
    'newPolicy': {'id': 'selected-measurement-first', 'version': 2, 'storedOnlyIn': ['immutable basis evidence frozen_payload.allocationPolicy', 'immutable per-result evidence frozen_payload.allocationPolicy'], 'basisAndAllResultPolicyEqual': True, 'roundingFamilyColumnUnchanged': 'largest-remainder-cents-v1'},
    'grossPriorityProof': {'floorNetFitsEveryGrossCapacity': 'floor(N*w/W)<=floor(G*w/W)<=grossShare', 'residualLessThanProjectCount': True, 'completion': 'sum remaining capacities >= remaining target after every added cent, so an eligible project always exists', 'noPerMoneyCentLoop': 'at most project count residual corrections', 'noValidInput422Fallback': 'derived bounds are feasible by construction; exhaustion is an invariant failure, not routine business rejection'},
    'otherPrimaryLayers': 'net/tax each weighted; known full gross=sum; unknown layers stay null; known gross with unknown other component uses lower-bound allocation without publishing an invented component',
    'historicalPolicy': 'F25 bytes/old results/evidence unchanged, no relabel/recompute; only new confirm/full replace bind v2',
    'pureModelChecks': checks,
    'inputF25FilesVerifiedUnchanged': old['productFiles'], 'artifacts': pins,
    'actualF46CodeExecuted': False, 'actualPgExecuted': False, 'actualHttpExecuted': False,
    'independentReview': 'pending-Root', 'committed': False, 'pushed': False,
}
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'manifest': str(out), 'rawBytesSha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'artifactPins': len(pins)}))
