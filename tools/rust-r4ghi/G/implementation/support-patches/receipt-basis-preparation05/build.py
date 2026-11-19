"""Freeze G's exact receipt preparation delta against Root's last author copy."""
from pathlib import Path
import difflib
import hashlib
import json

OUT = Path(__file__).resolve().parent
OWN = Path(__file__).resolve().parents[6]
ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
BASE = {
    'context.rs': '8dbb5a1096936943f9bb6799da977483e444da848f5089de371d7d41851f3e41',
    'preparation.rs': '0aed6e307331f908c9c567064d91d9285e8bb3496681dbdc92992ced685c6090',
}
records = []
patches = []
for name, expected in BASE.items():
    relative = 'apps/poms-api-rust/src/project_operating/' + name
    base = (ROOT / relative).read_bytes()
    if hashlib.sha256(base).hexdigest() != expected:
        raise RuntimeError(f'Root base {name} changed; do not overwrite its changes')
    candidate = (OWN / relative).read_bytes()
    (OUT / (name + '.base.bin')).write_bytes(base)
    (OUT / (name + '.candidate.rs')).write_bytes(candidate)
    old = base.decode('utf-8-sig').replace('\r\n', '\n')
    new = candidate.decode('utf-8-sig').replace('\r\n', '\n')
    patch = ''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile='a/' + relative, tofile='b/' + relative, n=4))
    patch_path = OUT / (name + '.patch')
    patch_path.write_text(patch, encoding='utf-8', newline='\n')
    patches.append(patch)
    records.append({'path': relative, 'baseSha256': expected, 'candidateSha256': hashlib.sha256(candidate).hexdigest(), 'patch': patch_path.name, 'patchSha256': hashlib.sha256(patch_path.read_bytes()).hexdigest()})
combined = OUT / 'G-receipt-basis-preparation-delta05.patch'
combined.write_text(''.join(patches), encoding='utf-8', newline='\n')
manifest = {
    'kind': 'G-receipt-basis-preparation-delta05',
    'files': records,
    'patch': combined.name,
    'patchSha256': hashlib.sha256(combined.read_bytes()).hexdigest(),
    'rootProductModifiedByAuthor': False,
    'wire': {
        'newApi': False, 'newSchema': False,
        'ReceiptBasisReceiptRow': 'sourceMembers contains actual same-project receipt contract and actual approved activated term/currency references',
        'ReceiptBasisContractRow': 'sourceMembers contains same-contract activated ContractTermSnapshot and actual CommercialReleaseBaseline references',
        'ReceiptBasisTermRows': 'Existing SourceRow stage-evidence shape; one actual ContractTermSnapshot sourceRef, sourceMembers only its own real same-project effective/superseded CommercialReleaseBaseline; financial amounts unknown, never synthetic zero',
        'currency': 'Frozen term currency may use that same term as currencyBasisRef; historical unknown term currency may use its own actual commercial source. No later/current currency guess.',
    },
    'facts': ['Receipt expected ref/hash/version asserted by G sole source reference', 'Contract belongs to receipt/project', 'Term activated/superseded and exact activated preparation/approved binding/same amendment and target checked', 'Commercial exact source_baseline_id, project, status, rowVersion and evidenced currency checked', 'Existing generic source hash/whitelist unchanged; no receipt/cost write', 'Receipt intent no longer requires unrelated operating baseline/estimate/handover derivation', 'Frozen 1000 source-row capacity still enforced'],
    'actualValidation': {'rustfmt': 'passed on two owned product files', 'newPureTests': 'three meaningful catalog provenance cases authored; not run by this author', 'cargo': 'Root integrated check pending', 'httpUi': 'Root isolated acceptance pending'},
    'gate': 'G2 delta; original author-handoff01 remains its original frozen historical bytes; no G3/G4 claim',
}
manifest_path = OUT / 'manifest05.json'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'manifest': str(manifest_path), 'manifestSha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(), 'patchSha256': manifest['patchSha256'], 'files': records}))
