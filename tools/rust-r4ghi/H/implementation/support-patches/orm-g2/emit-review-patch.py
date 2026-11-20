"""Emit a patch and byte manifest without changing any product source."""
import difflib
import hashlib
import json
import pathlib

here=pathlib.Path(__file__).resolve().parent
plan=json.loads((here/'existing-mapping-plan.json').read_text(encoding='utf-8'))
root=pathlib.Path(plan['productReadRoot'])
catalog=json.loads((here/'sql-target-catalog.json').read_text(encoding='utf-8'))
targets=[entry['path'] for entry in plan['files']]+[catalog['targetFile']]
patch=[]
manifest=[]
for relative in targets:
    original=root/relative
    proposed=here/'proposed'/relative
    before=original.read_text(encoding='utf-8') if original.is_file() else ''
    after=proposed.read_text(encoding='utf-8')
    patch.extend(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/'+relative if original.is_file() else '/dev/null',tofile='b/'+relative))
    raw=proposed.read_bytes()
    manifest.append({'path':relative,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'originalSha256':hashlib.sha256(original.read_bytes()).hexdigest() if original.is_file() else None})
(here/'orm-mapping.patch').write_text(''.join(patch),encoding='utf-8')
artifact={'status':'Root-review-candidate-not-applied-no-DB-no-DDL','newTables':19,'newPhysicalColumns':269,'existingAffectedTables':20,'proposedProductFiles':len(targets),'observedChecks':[{'kind':'actual MikroORM7 TypeScript types + real existing imported entity types','result':'passed-new-and-overlay'},{'kind':'actual MikroORM7 metadata discovery connect=false ensureDatabase=false metadataCache=false','result':'passed-overlay','newAndTargetedExistingColumns':362,'newAndTargetedExistingForeignKeys':125,'actualReferenceClosureTables':87},{'kind':'new19 metadata PK/FK/nullability/money precision assertions','result':'passed','newForeignKeys':90}], 'notRun':['Database connection or SQL execution','Migration execution or DDL/schema generation','Full Native/shared/admin build or tests','Migration-check against actual isolated candidate','Gate certification'], 'files':manifest,'unnamedConstraintNameAuthority':['https://github.com/postgres/postgres/blob/REL_15_STABLE/src/backend/catalog/heap.c','https://github.com/postgres/postgres/blob/REL_15_STABLE/src/backend/commands/indexcmds.c'],'limitations':['Originally unnamed constraint/index names are PG15 algorithm predictions until Root reads its actual migrated pg_catalog','NOT VALID and trigger/immutability enforcement remain SQL authority; ORM metadata cannot certify their operational state','This is a real87-table reference closure, not a claim that the complete139-table application has passed discovery']}
(here/'orm-candidate-manifest.json').write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':artifact['status'],'productFiles':len(targets),'patchBytes':(here/'orm-mapping.patch').stat().st_size,'manifestSHA256':hashlib.sha256((here/'orm-candidate-manifest.json').read_bytes()).hexdigest()}))
