"""Freeze read-only, non-author I/D/scope review evidence, never a G3 gate."""
from pathlib import Path
import hashlib
import json

OWN = Path(__file__).resolve().parent
ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
IROOT = Path('E:/projects/worktrees/poms-r4i-lifecycle/poms')
OUT = OWN / 'cross-review' / 'I-D-scope01'
FILES = [
    'project_action_authorization/mod.rs',
    'project_action_authorization/ownership.rs',
    'project_handover/mod.rs',
    'project_handover/service.rs',
    'project_handover/sources.rs',
    'project_handover/model.rs',
    'project_handover/view.rs',
    'project_lifecycle/mod.rs',
    'project_lifecycle/service.rs',
    'project_lifecycle/facts.rs',
    'project_lifecycle/view.rs',
    'project_lifecycle/stage_fact.rs',
    'lifecycle_evidence/mod.rs',
    'contract_support/http.rs',
    'projects/service.rs',
    'projects/http.rs',
    'project_workspace/service.rs',
    'project_workspace/http.rs',
    'project_workspace/store.rs',
    'attachments/service.rs',
    'attachments/http.rs',
    'attachments/store.rs',
]

def freeze(base, relative, destination):
    source = base / relative
    data = source.read_bytes()
    target = OUT / 'inputs' / destination
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {
        'source': str(source),
        'copy': str(target.relative_to(OWN)),
        'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'sourceUnchangedDuringCopy': source.read_bytes() == data,
    }

inputs = [freeze(ROOT, 'apps/poms-api-rust/src/' + name, 'Root/' + name + '.bin') for name in FILES]
inputs += [freeze(IROOT, 'apps/poms-api-rust/src/lifecycle_evidence/mod.rs', 'I-read07/mod.rs.bin')]
inputs += [freeze(IROOT, 'tools/rust-r4ghi/I/implementation/support-patches/lifecycle-evidence-read07.patch', 'I-read07/read07.patch.bin')]
result = {
    'kind': 'non-author-static-cross-domain-review',
    'reviewer': 'R4G author reviewing I/D/Root scope; no G/F self-review',
    'status': 'open-findings-with-read07-candidate-recheck',
    'gateDecision': 'not-issued; not an all-batch G3 approval',
    'rootCodeModifiedByReviewer': False,
    'sourceFreeze': 'Exact bytes copied after review. Root was still integrating; no claim the whole review interval was source-stable.',
    'inputs': inputs,
    'coverage': [
        'D seven-operation real action/target matrix, self-only actor, exact summary/basis/CAS, source freshness and outer transaction path',
        'I typed dispatcher, EO admission and true frozen chain, completion mapping, own-only condition SQL/output/double CAS, archive terminal guards',
        'Root fresh actor/membership/direct responsibility proofs, physical TX identity, immutable origin bootstrap and one-time owner reassignment',
        'Adjacent real workspace timeline/guidance and attachment target/list/by-ID consumers of I/D facts',
    ],
    'findings': [
        {
            'id': 'IDScope-P1-01', 'priority': 'P1',
            'file': 'lifecycle_evidence/mod.rs', 'line': 207,
            'problem': 'Frozen evidence read checked only captured classification and payload hash, permitting live restriction upgrade, unlink or deactivation to be bypassed.',
            'counterexample': 'Freeze a normal project attachment, then restrict or deactivate it; an actor without sensitive-read still receives frozen attachment identity, filename and checksum through acceptance/completion/own task views.',
            'candidateRecheck': {'candidateSha256': '89345b02746994dadc31ea44878e60705c150db4ac1600aef4772416187e6e91', 'patchSha256': '753fa855eef4801d82e1f09f6acbb0c506977ced95fd805ba7232154f536ccc9', 'staticResult': 'addresses this finding: exact dual-ID live lookup/lock, project/active/identity/version/checksum, current and frozen classification AND, original frozen projection only', 'actualSqlHttpResult': 'not run by reviewer; Root integration/validation required'},
        },
        {
            'id': 'IDScope-P1-02', 'priority': 'P1',
            'file': 'project_handover/service.rs', 'line': 532,
            'problem': 'Rebaseline calls prepare with anchor Some and skips real handover ledger requalification, leaving the old handover ID in current stage. New confirmed/frozen chain can never pass startExecution.',
            'counterexample': 'Real prepare, activated contract amendment, rebaseline, new handover self-confirm/finalize and role freeze, then startExecution: new source handover conflicts with old current stage source.',
            'requiredBoundary': 'Before effects, reject advanced lifecycle stage; reject already current frozen assignment even while stage handover. Unfrozen handover rebaseline may append a true requalified ledger using its previously verified RebaselineHandover proof, including valid BA. Never silently unfreeze or manufacture full R5 controlled execution change.',
            'status': 'Root accepted; precise delta and actual HTTP still pending',
        },
        {
            'id': 'IDScope-P1-03', 'priority': 'P1',
            'file': 'project_workspace/http.rs', 'line': 114,
            'problem': 'Timeline/guidance use only ProjectRead. Timeline has no actor parameter and returns real parent acceptance/completion evidence summaries and IDs to own-condition-only or unrelated actors.',
            'counterexample': 'Actor with project:read and only one own condition requests GET /api/projects/{projectId}/timeline; service/store load parent evidence_summary and timeline_events serializes evidenceLabel/sourceId outside the permitted own-task DTO.',
            'minimumFix': 'Real FullProject scope before these queries, in caller transaction; narrow own-task/creator roles do not expand into full workspace.',
            'status': 'reported to Root; no product edits by reviewer',
        },
        {
            'id': 'IDScope-P1-04', 'priority': 'P1',
            'file': 'attachments/service.rs', 'line': 451,
            'problem': 'Real attachment target_access checks only route permission and target existence, without project responsibility. Project-wide list and by-ID readable/download therefore bypass the new own-task evidence boundary.',
            'counterexample': 'Own-condition-only actor with project:read requests GET /api/attachments?targetType=project&targetId=P and receives all normal project attachments, then can retrieve unrelated attachment IDs via the same target guard.',
            'minimumFix': 'Apply real target project/contract/handover responsibility at existing consumers; own-task access stays exact frozen or own closure references, never broad attachment listing.',
            'status': 'reported to Root; distinct from lifecycle_evidence read07',
        },
    ],
    'formalBoundaryEvidence': {
        'authority': 'R4DEF joint-g1-06 manifest06 authorityOrder includes D final candidate01; checked raw-byte hash match',
        'DSourceSha256': '47a9171033673b70cbcbd1f0f7f7ec03acf3307530262e38efe2103cd67b0ec5',
        'DSource': 'docs/design/archive/slices/rust-r4def/D-g1-candidate01.md.bin:182-188',
        'supportingSources': ['docs/design/phase2-contract-to-handover-workspace.md:172', 'docs/design/phase2-commission-freeze-at-handover.md:174-178', 'docs/design/rust-r4ghi-next32-baseline.md:12'],
        'conclusion': 'Pre-handover rebaseline and new self-confirmations are promised. Execution-after reallocation/dispute/replacement freeze is full R5 controlled change, outside this batch. Fail-closed advanced/frozen boundary does not omit a promised R4 execution-change producer.',
    },
    'notRun': ['Git/GitHub', 'database or old database connection', 'HTTP/UI', 'service/process changes', 'reviewer cargo tests', 'whole-batch G3/G4 certification'],
    'necessaryRootAcceptance': [
        'Apply precise owner-reviewed deltas and compile exact stable sources',
        'HTTP scope matrix: unrelated, creator-only, own-condition-only, pending/confirmed participants, owner, BA, EO, finance; preserve 404/403/409 semantics',
        'Live evidence restriction upgrade, unlink, deactivate and version mismatch never project forbidden metadata',
        'Unfrozen handover rebaseline succeeds for owner and delegated confirmed BA through actual requalified stage chain',
        'Advanced-stage and current-frozen rebaseline/reprepare fail before any business effect',
        'Necessary domain/summary/audit/auth write failures roll back all same-TX effects',
    ],
}
OUT.mkdir(parents=True, exist_ok=True)
path = OUT / 'review01.json'
path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'review': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'inputs': len(inputs), 'findings': len(result['findings']), 'gateDecision': result['gateDecision']}))
