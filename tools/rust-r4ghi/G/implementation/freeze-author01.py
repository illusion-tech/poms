"""Read-only input hashing plus an explicit G2 author handoff, never a gate pass."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[4];OUT=Path(__file__).resolve().parent
paths=sorted((ROOT/'apps/poms-api-rust/src/project_operating').glob('*.rs'))
paths += [ROOT/'apps/poms-admin/src/app/features/project/project-operating-authoring.ts',ROOT/'apps/poms-admin/src/app/features/project/project-operating-authoring.spec.ts']
names=['correction_facade.rs.txt','correction_facade_delta04.rs.txt','correction-facade-delta04.patch','F-stage-tax-sealed01.patch','E-labor-sealed01.patch','F-allocation-sealed01.patch','F-first-append-delta02.patch','E-preflight-delta03.patch','F-reference-read-delta03.patch']
paths += [OUT/'support-patches'/name for name in names]
def record(path): return {'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
manifest=record(ROOT/'docs/design/rust-r4ghi/g1-source-manifest01.json')
if manifest['sha256']!='89a2ebeba984320afe9b883910be742edb15e97ce19b409eab0c3b4372d27da9':raise RuntimeError('Formal G1 source manifest changed')
result={'status':'G2-author-handoff-integration-pending','providedBaseHead':'9e010077e3010ff09447e9d77cb1bf1f7adbf68d','GitVerification':'Root only; child did not run Git','formalSourceManifest':manifest,'files':[record(path) for path in paths],
    'actualChecks':{'rustfmt':'passed on owned product Rust; no product compilation claim','typescriptFormatting':'Prettier passed on both component files; Root final lint/build/tests pending','angularTemplate':'real Angular 22 parser passed; ui-parser01.json; not typecheck/browser/build','pureArithmetic':'10 passed, 0 failed, exact actual common scalars + G facts; pure-tests/result01.json binds stable source bytes; test-only Error adapter'},
    'parentReportedChecks':{'firstJointCargoCheck':'sourceStable=true; 9 errors; G 3 concrete errors fixed by author; Root recheck required','sourceEffects':'Root applied original sealed patches and delta02/03; child did not apply Root-owned product changes'},
    'open':['Root actual joint cargo/clippy and TS/shared/OpenAPI/client/DDL/PG/HTTP/UI acceptance; no G3 or G4 from this author handoff',
        'Facade base is frozen at 341945833c0ad6cce49c594358f440cacfbe591d9c8a6c01ff0a87687c5d8add; late Tax source assertion/rebind helper is explicit delta04 and is not claimed compiled',
        'Shared Tax dependency roots must agree between G preparation/write discovery and real facade batch discovery; missing impacted project currently fails closed rather than omitting producer effects',
        'Unposted nonzero F tax impact and transitive shared pending-tax attribution need business acceptance/actual per-project evidence; no automatic taxImpactAmount cost addition or guessed ratio',
        'Changed multi-day labor interval needs genuine whole-period stage authority; I milestone provider is not an interval proof, unsupported inputs must remain explicit409',
        'Normal period-close replacing live current still awaits user decision; selectedHead=false is a candidate, not a business gate decision'],
    'interfaces':{'GDispatcher':'project_operating::execute_with_session(CommonSession,operation_id,&ResourceKeys,query,&TypedRequest,actor)','GPreparation':'prepare_with_session / prepare_query_with_session; correctionSourceRefs typed JSON; proposedAffectedTargets are real terminal refs','sourceReference':'project_operating::sources::source_reference_with_session; ProjectStageRecord logical version is sequence_no; Attachment hash is factual whitelist, content checksum separate','FCoordination':'Root project_cost_governance/correction.rs apply_corrections_with_session; reclassify_with_permit; replace_tax_with_permit; all use one borrowed session and sealed scope'},
    'ownership':'Only G-owned Rust/component/spec/tools written; no Git/GitHub/DB/service/legacy database actions; original G1 inputs unchanged'}
(OUT/'author-handoff01.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'manifest':str(OUT/'author-handoff01.json'),'files':len(paths),'manifestSha256':hashlib.sha256((OUT/'author-handoff01.json').read_bytes()).hexdigest(),'status':result['status']}))
