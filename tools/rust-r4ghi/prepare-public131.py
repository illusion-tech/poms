"""Generate the complete strict 131-schema proposal from immutable G1 plus deltas."""
from pathlib import Path
import hashlib,json,runpy,difflib

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'tools/rust-r4ghi/public131'
assert not OUT.exists()
helper=ROOT/'tools/rust-r4ghi/H/implementation/support-patches/prepare-shared-native.py'
helpers=runpy.run_path(str(helper),run_name='readonly_registered_schema_emitter')
emit,refs,js,validator=(helpers[n] for n in ['emit','refs','js','VALIDATOR'])
preflight=runpy.run_path(str(ROOT/'tools/rust-r4ghi/H/implementation/support-patches/shared-g2-130/build-130.py'),run_name='readonly_preflight')['preflight']
files=['tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json']+[f'docs/design/rust-r4ghi/g2-public-delta0{i}.json' for i in [1,2,3]]
inputs={p:(ROOT/p).read_bytes() for p in files}
schemas=json.loads(inputs[files[0]])['components']['schemas']
assert len(schemas)==128
for file in files[1:]:
    delta=json.loads(inputs[file])
    for name,schema in delta['addSchemas'].items():
        assert name not in schemas
        schemas[name]=schema
    for name,change in delta['components'].items():
        assert not set(change)-{'appendOneOf','addRequired','addProperties'}
        target=schemas[name]
        if 'appendOneOf' in change:target['oneOf'].extend(change['appendOneOf'])
        for key in change.get('addRequired',[]):
            assert key not in target['required'];target['required'].append(key)
        for key,schema in change.get('addProperties',{}).items():
            assert key not in target['properties'];target['properties'][key]=schema
assert len(schemas)==131
assert schemas['CreateProjectRequest']['properties']['initialOwnership']=={'$ref':'#/components/schemas/ProjectInitialOwnership'}
assert 'initialOwnership' not in schemas['CreateProjectRequest']['required']
for name,schema in schemas.items():preflight(schema,name)
order=[];pending=set(schemas)
while pending:
    ready=sorted(n for n in pending if refs(schemas[n])<=set(order))
    assert ready,sorted(pending)
    order.extend(ready);pending.difference_update(ready)
lines=['// Effective-v2 + Root G2 deltas01/02/03. Sole modern131 public schema module.','import { z } from "zod";',f'const frozenSchemas: Readonly<Record<string, unknown>> = {js(schemas)};',validator]
for name in order:
    expression=emit(schemas[name])
    if name=='SensitiveStringFieldProjection':expression+='''.superRefine((value, context) => {
                if ((value.mode === "masked" || value.mode === "denied") && value.value !== null) context.addIssue({code:"custom",path:["value"],message:"Protected projection value must remain null"});
                if ((value.mode === "masked" || value.mode === "denied") && value.reasonCode === "allowed") context.addIssue({code:"custom",path:["reasonCode"],message:"Protected projection cannot claim allowed"});
            })'''
    lines.append(f'export const {name}Schema = {expression}.superRefine((value, context) => validateFrozen({js(name)}, value, context)).meta({{id:{js(name)}}});')
    lines.append(f'export type {name} = z.infer<typeof {name}Schema>;')
rel='libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts'
before=(ROOT/rel).read_bytes();after=('\n'.join(lines)+'\n').encode()
assert hashlib.sha256(before).hexdigest()=='c4b156574f4486b2f02eccc8b75f4cac7ef1ff1d6a85eb0de665ab9de797e7d9'
OUT.mkdir(parents=True)
(OUT/'before-generated.ts.bin').write_bytes(before)
target=OUT/'proposed'/rel;target.parent.mkdir(parents=True);target.write_bytes(after)
(OUT/'public-contracts.g2-131.schema.json').write_text(json.dumps({'components':{'schemas':schemas}},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(OUT/'generated131.patch').write_text(''.join(difflib.unified_diff(before.decode().splitlines(True),after.decode().splitlines(True),fromfile='a/'+rel,tofile='b/'+rel)),encoding='utf8')
manifest={'kind':'complete-public131-proposal','schemaCount':131,'newHTTP':0,'path':rel,'beforeSHA256':hashlib.sha256(before).hexdigest(),'candidateSHA256':hashlib.sha256(after).hexdigest(),
    'inputs':[{'file':p,'sha256':hashlib.sha256(b).hexdigest()} for p,b in inputs.items()], 'generatorHelpers':[{'file':str(helper.relative_to(ROOT)),'sha256':hashlib.sha256(helper.read_bytes()).hexdigest()}], 'G3Certified':False}
(OUT/'manifest131.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(manifest))
