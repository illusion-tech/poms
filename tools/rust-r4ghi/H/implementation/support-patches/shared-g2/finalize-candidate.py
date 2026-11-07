"""Record bytes and a review patch; never apply them to product files."""
import difflib
import hashlib
import json
import pathlib

here=pathlib.Path(__file__).resolve().parent
plan=json.loads((here/'shared-g2-plan.json').read_text(encoding='utf-8'))
root=pathlib.Path(plan['productReadRoot'])
files=[];patch=[]
native_plan=json.loads((here/'native-ast-plan.json').read_text(encoding='utf-8'))
expected={entry['path']:entry['sourceSHA256'] for entry in native_plan['files']}
expected['libs/shared/contracts/src/lib/shared-contracts.ts']=json.loads((here/'canonical-ast-plan.json').read_text(encoding='utf-8'))['sourceSHA256']
for proposed in sorted((here/'proposed').rglob('*.ts')):
    relative=proposed.relative_to(here/'proposed').as_posix();original=root/relative
    before=original.read_text(encoding='utf-8') if original.is_file() else ''
    if relative in expected:
        actual=hashlib.sha256(original.read_bytes()).hexdigest() if original.is_file() else None
        if actual!=expected[relative]:raise ValueError('Product source changed while preparing proposal: '+relative)
    after=proposed.read_text(encoding='utf-8')
    patch.extend(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/'+relative if original.is_file() else '/dev/null',tofile='b/'+relative))
    files.append({'path':relative,'bytes':proposed.stat().st_size,'sha256':hashlib.sha256(proposed.read_bytes()).hexdigest(),'originalSHA256':hashlib.sha256(original.read_bytes()).hexdigest() if original.is_file() else None})
(here/'shared-native-g2.patch').write_text(''.join(patch),encoding='utf-8')
checks={name:json.loads((here/name).read_text(encoding='utf-8')) for name in ['canonical-tsc-diagnostics.json','native-tsc-diagnostics.json','runtime-unit-result.json']}
if any(checks[name]['status']!='passed' for name in ['canonical-tsc-diagnostics.json','native-tsc-diagnostics.json']):raise ValueError('Compiler checks have not passed')
original128=here.parent/'rust-r4ghi-contracts.generated.ts'
old_manifest=json.loads((here.parent/'shared-native-candidate.json').read_text(encoding='utf-8'))
if hashlib.sha256(original128.read_bytes()).hexdigest()!=old_manifest['generatedSHA256']:raise ValueError('Previously tested128 artifact was changed')
raw_clone=here/'proposed'/plan['privateNativeTarget']
if hashlib.sha256(raw_clone.read_bytes()).hexdigest()!=plan['legacyRawSHA256']:raise ValueError('Private raw legacy clone was changed')
result={'status':'Root-reviewable-shared-Native-G2-proposal-not-applied','schemaCount':129,'strictProjectDetailBranches':3,'canonicalTypeOrSchemaDefinitionsDuplicated':0,'baseRawSharedSHA256':plan['legacyRawSHA256'],'sealed128GeneratedArtifactPreserved':True,'previous128GeneratedSHA256':old_manifest['generatedSHA256'],'g2DeltaRawSHA256':plan['g2DeltaRawSHA256'],'legacyImportSites':9,'legacyCheckedReadBoundaries':len([entry for entry in json.loads((here/'legacy-value-boundaries.json').read_text())['changes'] if entry['kind']=='checked-frozen-value-read']),'strictUnionConstructorValues':3,'checks':checks,'notCertified':['Full Native/shared/admin build/lint/tests','Real auth/CSRF/permission/422/status201 HTTP','Root OpenAPI exact129 dialect normalization and full client regeneration','G3/G4'],'publicSpecOverlay':'Raw approved2020-12 source supplied; optional helper explicitly supports only OAS3.1 and rejects current OAS3.0. Root existing3.0 serialization/normalization is still required; no spec/client edit or version change performed','pnpmLock':'19 added lines are @pnpm/exe12.3.4 package-manager bootstrap metadata only; not included/restored/cleaned; diff alone does not prove the writer','files':files}
(here/'shared-native-g2-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':result['status'],'productFiles':len(files),'manifestSHA256':hashlib.sha256((here/'shared-native-g2-manifest.json').read_bytes()).hexdigest(),'patchBytes':(here/'shared-native-g2.patch').stat().st_size}))
