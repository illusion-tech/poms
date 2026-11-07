"""Freeze exact candidate10 non-author recheck without changing candidate09."""
from pathlib import Path
import hashlib
import json

OUT=Path(__file__).resolve().parent
PACKAGE=Path('E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/support-patches/attachment-scope08')
manifest=json.loads((PACKAGE/'apply-manifest10.json').read_text(encoding='utf-8-sig'))
records=[]
for row in manifest['files']:
    data=(PACKAGE/'candidate10'/row['path']).read_bytes()
    actual=hashlib.sha256(data).hexdigest()
    if actual!=row['candidateSHA256']:raise RuntimeError('Frozen10 candidate changed: '+row['path'])
    target=OUT/'inputs10'/(row['path']+'.bin');target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    records.append({'path':row['path'],'sha256':actual,'bytes':len(data)})
for name in ['apply-manifest10.json','attachment-scope09-to10.patch']:
    data=(PACKAGE/name).read_bytes();target=OUT/'inputs10'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    records.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
review={
    'kind':'non-author-I-attachment10-recheck',
    'reviewer':'G; no authored G/F/workspace05 certification included',
    'originalReport':'../attachment09/review09.json remains unchanged',
    'inputs':records,
    'status':'original-two-P1-and-context-shape-addressed-statically-on-exact10',
    'recheckedFindings':[
        {'id':'Attachment09-P1-K5','staticResult':'addressed','checks':['All K5 routes use handover_context actual project-handover target Scope and record Target intent','K audit uses guarded persist; request-local intents survive AUTO flush and mint fresh actual Scope at every real commit','Checklist source collection precedes its final necessary audit/source guard','Package exact current row is matched to handover/project under same-connection FullProject; included item IDs must equal actual declared IDs; real included files exist and satisfy current original K normal/internal policy','Package intent rechecks at download audit/auth commit; old ZIP wire and manifest renderer unchanged']},
        {'id':'Attachment09-P1-LinkSource','staticResult':'addressed','checks':['Ordinary service::link calls readable_source allow_own=false before destination check/effects','It records Attachment intent allow_own=false, so actual commit exact(false) cannot rely on own-condition read','Private complete active-link proof is preserved for old source guard while public links stay filtered','Original independent non-project source-read plus destination-write behavior retained; no invented source all-project write role','Sealed purpose completion still creates only its validated new version1 attachment/single matching project link']},
        {'id':'Attachment09-P2-ContextUUID','staticResult':'addressed statically','checks':['Both nested UUID fields deserialize through the existing J valid_uuid before typed Uuid parse','Existing nil/all-ones/version/variant spelling semantics reused; no alternate UUID parser','Tests add 32hex/URN/braces alias rejections; reviewer did not execute these module tests']}
    ],
    'reviewedUnchanged09Boundaries':['Immutable dedicated purpose session fields, not audit JSON authority','Real parent/condition/project/actor/pending proof per new upload phase','Exact frozen evidence/closure or real completed own-purpose producer; current/frozen classification AND','Actual store flush Scope/source/CAS/business/audit/auth coflush on one physical transaction','Known rollback checkpoint restore and unknown-commit poisoning/retention preserved'],
    'materialLimits':['Historical K PackageItem did not store frozen per-file rowVersion/checksum/security proof. This review certifies no such historical integrity; no fabricated proof or ZIP rewrite requested.','Current actual IDs, package/handover/project binding and original K current batch classification are checked; object storage and byte-level lineage require Root actual acceptance.','Original14 HTTP cases plus K5 and own-only-to-customer link negatives are plans until Root executes them.','Migration96, Native context422, integrated compilation/tests, PG/HTTP/FI/concurrency/UI were not executed by reviewer.'],
    'newConfirmedStaticBlockingFindings':[],
    'nextRuntimeNegatives':['OwnCondition/bare ProjectRead cannot checklist/get/download full K5 package','OwnCondition-only plus CustomerWrite cannot ordinary-link frozen task file into customer/lead scope','Revoked membership/closed condition/rebound source during flush returns error with zero necessary retained writes','Live restriction/unlink/void/version/checksum drift never projects own frozen metadata or streams forbidden bytes','Complete purpose upload to exact read to genuine condition closure positive; no project-wide list/history expansion','Required attachment/link/session/audit/auth/FK/CAS failures roll back; unknown commit remains unknown'],
    'rootOrAuthorProductsModifiedByReviewer':False,
    'gateDecision':'Static recheck only, no whole-batch G3/G4 approval',
}
p=OUT/'review10.json';p.write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'review':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'inputs':len(records),'status':review['status']}))
