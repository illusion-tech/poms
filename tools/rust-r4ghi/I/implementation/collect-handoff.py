"""Read-only product inventory plus an explicitly uncertified author handoff."""
from pathlib import Path
import hashlib
import json
import re

root=Path.cwd().resolve()
assert root.as_posix().lower()=='e:/projects/worktrees/poms-r4i-lifecycle/poms'
out=root/'tools/rust-r4ghi/I/implementation'
files=sorted([*root.glob('apps/poms-api-rust/src/commission_assignment/**/*.rs'),*root.glob('apps/poms-api-rust/src/project_lifecycle/**/*.rs'),*root.glob('apps/poms-api-rust/src/lifecycle_evidence/**/*.rs'),
    root/'apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.ts',root/'apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.spec.ts',
    root/'apps/poms-admin/src/app/features/project/project-lifecycle-authoring.ts',root/'apps/poms-admin/src/app/features/project/project-lifecycle-authoring.spec.ts'])
def evidence(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(root).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
operation_map=json.loads((root/'docs/design/rust-r4ghi/operation-map01.json').read_text(encoding='utf-8-sig'))
targets=[o for o in operation_map['operations'] if o['businessOwner']=='I']
rust='\n'.join(p.read_text(encoding='utf-8') for p in files if p.suffix=='.rs')
source_manifest=root/'docs/design/rust-r4ghi/g1-source-manifest01.json'
actual_manifest_sha=hashlib.sha256(source_manifest.read_bytes()).hexdigest()
result={
    'kind':'I-and-minimum-R5-author-implementation-handoff',
    'status':'product code authored; Root integration/compile/PG/HTTP/UI/full checks and independent gates pending',
    'providedBranch':'codex/poms-r4i-lifecycle',
    'providedBase':'9e010077e3010ff09447e9d77cb1bf1f7adbf68d',
    'gitIndependentlyVerified':False,
    'gateAuthority':'Root explicitly admitted G2 after actual online G1 and non-author review; retained Pending fields in original inputs are historical captured bytes',
    'providedNonAuthorG1ReviewSha256':'8aa3860a0fe10daa6905b1d1ed14a23ee8d43644dc4227b854194e63322487a7',
    'expectedSourceManifestSha256':'89a2ebeba984320afe9b883910be742edb15e97ce19b409eab0c3b4372d27da9',
    'actualSourceManifestSha256':actual_manifest_sha,
    'sourceManifestMatched':actual_manifest_sha=='89a2ebeba984320afe9b883910be742edb15e97ce19b409eab0c3b4372d27da9',
    'productFiles':[evidence(p) for p in files],
    'operations':[{'operationId':o['operationId'],'successStatus':o['successStatus'],'typedDispatchSourcePresent':o['operationId'] in rust} for o in targets],
    'actualInsertWriteFamilies':sorted(set(re.findall(r'INSERT INTO poms\.([a-z_]+)',rust))),
    'checks':{'rustfmt':'passed on all seven owned Rust files; no shared formatting',
        'typescriptAndAngularTemplateSyntax':'passed four owned TS/spec files using installed primary dependency compiler only',
        'actualFrontendPureWeightFunction':'10 cases passed; not HTTP evidence',
        'angularCLI':'attempted dry runs; blocked by Nx worktree missing node_modules/.modules.yaml / Angular workspace discovery',
        'fullRustCompileAndUnitTests':'Root integration pending; owned modules import Root shared request/scope/D wrapper',
        'angularTestbedLintBuild':'Root dependency/shared/generated-client integration pending',
        'postgresMigrationHTTPBrowserFaultConcurrency':'not run by author; Root owns actual environment acceptance',
        'governance':'no author G3/G4 signature, no issue closeout'},
    'supportingProducerProposals':'support-patches/README.md and patch-inputs.json; not applied',
    'constraints':{'gitUsed':False,'githubUsed':False,'databaseConnected':False,'migrationExecuted':False,'serviceStarted':False,'sharedProductFilesWritten':False},
}
(out/'implementation-handoff.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(targets)==15 and all(o['typedDispatchSourcePresent'] for o in result['operations'])
print(json.dumps({'productFiles':len(files),'operations':len(targets),'dispatchPresent':True,'sourceManifestMatched':result['sourceManifestMatched'],'certified':False}))
