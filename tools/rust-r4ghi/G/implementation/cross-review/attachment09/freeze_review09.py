"""Non-author attachment09 findings; never edit author/Root source inputs."""
from pathlib import Path
import json
import hashlib

OUT = Path(__file__).resolve().parent
PACKAGE = Path('E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/support-patches/attachment-scope08')
ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
manifest = json.loads((PACKAGE/'apply-manifest09.json').read_text(encoding='utf-8-sig'))
records = []
for rec in manifest['files']:
    data = (PACKAGE/'candidate'/rec['path']).read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    if actual != rec['candidateSHA256']:
        raise RuntimeError('Frozen author09 bytes changed: '+rec['path'])
    target = OUT/'inputs09'/(rec['path']+'.bin')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    records.append({'path':rec['path'],'sha256':actual,'bytes':len(data)})
for name in ['apply-manifest09.json','http-acceptance-plan09.json','attachment-scope09-rust.patch']:
    data=(PACKAGE/name).read_bytes();target=OUT/'inputs09'/name;target.write_bytes(data)
    records.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
relative='apps/poms-api-rust/src/attachments/handover.rs'
data=(ROOT/relative).read_bytes();target=OUT/'inputs09'/(relative+'.bin');target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
records.append({'path':'Root/'+relative,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
review={
    'kind':'G-non-author-review-I-attachment09',
    'status':'blocked-on-two-confirmed-P1-candidate10-requested',
    'inputs':records,
    'findings':[
        {'id':'Attachment09-P1-K5','file':'apps/poms-api-rust/src/attachments/handover.rs','line':284,'problem':'The nine-file candidate does not cover real K5 handover_context; it checks only ProjectRead/Write and resource existence. Checklist/package GET/download can bypass FullProject and expose the project bundle to an own-condition or unrelated ProjectRead actor.','exactPaths':['handover_checklist:480','refresh_handover_checklist:610','create_handover_download_package:632','accessible_package:847','get_download_package:853','download_package:857'],'commitGap':'K audit used its old flush path; no Target/Attachment intent exists for package-only reads, so prelocking alone cannot mint a real project responsibility proof.','ownerResponse':'I confirmed and is preserving09 plus a new10 K5 target/intent/guarded-persist/package-binding correction.'},
        {'id':'Attachment09-P1-LinkSource','file':'apps/poms-api-rust/src/attachments/service.rs','line':1592,'problem':'Ordinary link accepts readable with allow_own=true and only validates destination write. Non-project customer/lead destination does not invoke source global project/purpose boundary in commit recheck.','counterexample':'OwnCondition-only actor with CustomerWrite can relink the exact frozen project file to a customer; customer permission can then replace the narrow source grant and potentially follow later inherited version links.','minimumBoundary':'Source project/purpose sides need actual FullProject read for ordinary link; keep original source-read plus destination-write and independent non-project behavior. Sealed purpose completion creates its own single permitted project link.','ownerResponse':'I confirmed and is adding LinkSource intent with same-connection commit recheck, without inventing source ProjectWrite.'},
        {'id':'Attachment09-P2-ContextUUID','file':'apps/poms-api-rust/src/attachments/model.rs','line':131,'problem':'Nested context UUIDs deserialize directly through Uuid and are reserialized before legacy validation; exact shared/J UUID shape is not enforced by deny_unknown_fields alone.','evidenceClass':'Static contract discrepancy; no HTTP/Native comparative result claimed.','ownerResponse':'I accepted and will reuse the existing J valid_uuid guard then typed parse, including existing nil/all-ones/version/variant rules.'},
    ],
    'positiveStaticObservations':[
        'Purpose authority uses immutable dedicated upload-session version/real parent/child UUID fields, not arbitrary audit JSON or descriptions',
        'Actual Root Condition proof and exact actor/pending/parent/project relations checked per purpose phase',
        'Exact own evidence uses actual frozen evidence/closure refs plus current attachment/link/hash/version/classification AND',
        'Purpose completion is constrained to actual new actor-owned version1 attachment and one matching project link',
        'Ordinary update/final/void source guards recheck actual project/purpose relationships and retain old source/CAS protocol',
        'Guarded flush recomputes scope on its actual transaction before necessary business/audit/auth writes and retains unknown-commit semantics',
    ],
    'notCertified':['The14 HTTP scenarios are plans only; not executed by this reviewer','Root migration96 has not been executed by reviewer','No product/cargo/PG/HTTP/UI/G3/G4 pass','No Root/I product modification by reviewer'],
    'next':'Read exact candidate10 hashes, then Root actual compile/SQL/HTTP/permissions/concurrency/FI/Native validation; do not elevate09 to static Pass',
}
OUT.mkdir(parents=True,exist_ok=True)
p=OUT/'review09.json';p.write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'review':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'inputs':len(records),'status':review['status']}))
