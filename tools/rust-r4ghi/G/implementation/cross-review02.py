"""Preserve non-author rechecks separately from the original open report."""
from pathlib import Path
import hashlib
import json

OWN = Path(__file__).resolve().parent
ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
IROOT = Path('E:/projects/worktrees/poms-r4i-lifecycle/poms')
OUT = OWN / 'cross-review' / 'I-D-scope02'
OUT.mkdir(parents=True, exist_ok=True)
sources = [
    (ROOT, 'apps/poms-api-rust/src/project_handover/service.rs', '2288ff8deb6d2a35855f588304e50a23ec087bfca94a38841a68af11124cb72f'),
    (ROOT, 'apps/poms-api-rust/src/project_lifecycle/service.rs', 'bbd61d489a88ab730ec61dd4b195cab33c85598e666738c17a035562822a5da3'),
    (ROOT, 'apps/poms-api-rust/src/project_lifecycle/mod.rs', '651e87f35be6b2c9cc9de77007c88ea20db013e232edc29349792b3c4ce313fc'),
    (IROOT, 'apps/poms-api-rust/src/lifecycle_evidence/mod.rs', 'b40ee3a8091d233e90737a693f4a27f060d9aa41df7b1f1a37fd3c332a83e5fb'),
]
inputs = []
for base, name, expected in sources:
    path = base / name
    data = path.read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    if actual != expected:
        raise RuntimeError(f'Rechecked source changed: {path}')
    copy = OUT / 'inputs' / base.parent.name / (name + '.bin')
    copy.parent.mkdir(parents=True, exist_ok=True)
    copy.write_bytes(data)
    inputs.append({'source': str(path), 'copy': str(copy.relative_to(OWN)), 'bytes': len(data), 'sha256': actual, 'unchangedDuringCopy': path.read_bytes() == data})
result = {
    'kind': 'non-author-static-recheck-D17-I-read07b',
    'reviewer': 'G; reviewed D/I/Root implementation only. G-authored workspace-scope05 and receipt-preparation05 are excluded.',
    'originalReport': '../I-D-scope01/review01.json; original bytes preserved',
    'inputs': inputs,
    'D17': {
        'finding': 'IDScope-P1-02',
        'staticResult': 'addressed on these exact input hashes',
        'checks': [
            'D prepare captures actual PrepareHandover or RebaselineHandover authority before closing old confirmation/current handover',
            'Guard before business effects rejects advanced/terminal lifecycle and any current frozen role assignment, including handover-before-execution frozen window',
            'Every anchor calls actual I verified authority helper rather than skipping rebaseline',
            'Helper validates actor/request session/physical TX, project, FullProject, permitted action and exact project version',
            'New actual draft handover and basis, source hashes and original current stage verified',
            'Actual facts::write_stage appends stage-requalified for handover-to-handover with true previous/new handover IDs, then project CAS and stage audit in the same borrowed session',
            'Valid confirmed BA uses old-chain Rebaseline authority; no requirement to acquire OwnerWrite after old duties were superseded',
            'No silent unfreeze, automatic execution admission, invented old stage history or new full R5 controlled-change semantics',
        ],
        'runtime': 'Root must validate owner/BA positives, true new self-confirmations/freeze/startExecution, frozen/advanced no-effect negatives and necessary ledger/CAS/audit failure rollback',
    },
    'IRead07b': {
        'finding': 'IDScope-P1-01',
        'staticResult': 'addressed on candidate b40ee3a8091d233e90737a693f4a27f060d9aa41df7b1f1a37fd3c332a83e5fb',
        'checks': ['Exact frozen attachment/link pair read and locked through current CommonSession', 'Real same-project active link/attachment, exact version/checksum, project permission, frozen/current classification AND', 'Existing K literal sensitive remains ordinarily readable; confidential/restricted require exact additional permission; unknown classification fails closed', 'Output remains original five-field frozen reference; no broad project listing or new connection'],
        'runtime': 'Root integrated pure tests and live PG/HTTP classification/withdrawal/version negatives pending',
    },
    'remainingOriginalFindings': ['IDScope-P1-03 workspace timeline/guidance: G proposal workspace-scope05 needs I/H non-author review and Root integrated acceptance', 'IDScope-P1-04 existing attachment list/by-ID target scope: Root-owned remediation/acceptance pending'],
    'notRunByReviewer': ['Git/GitHub', 'DB/old DB', 'HTTP/UI', 'service/process mutation', 'cargo tests'],
    'rootProductsModifiedByReviewer': False,
    'gate': 'Static recheck only. No all-batch G3 or G4 decision.',
}
path = OUT / 'review02.json'
path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'review': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'inputs': len(inputs), 'gate': result['gate']}))
