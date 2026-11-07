"""Append-only Shared130 proposal; all prior128/129 and product bytes are read-only."""
from pathlib import Path
import json,hashlib,sys

HERE=Path(__file__).resolve().parent
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
HELPER=HERE.parent/'prepare-shared-native.py'
sys.dont_write_bytecode=True
helpers={'__name__':'frozen128_readonly_helpers','__file__':str(HELPER)}
exec(compile(HELPER.read_text(encoding='utf8'),str(HELPER),'exec'),helpers)
emit,refs,js,validator=(helpers[n] for n in ['emit','refs','js','VALIDATOR'])
def sha(raw):return hashlib.sha256(raw).hexdigest()

def preflight(node,at):
    if not isinstance(node,dict):raise ValueError(f'Unsupported non-schema object at {at}')
    allowed={'$ref','additionalProperties','allOf','anyOf','const','default','deprecated','description','discriminator','else','enum','format','if','items','maxItems','maxLength','maximum','minItems','minLength','minimum','multipleOf','not','oneOf','pattern','properties','required','then','type','x-exact-decimal-scale','x-registered-rule-codes','x-reuse-registered-engine','x-runtime-validation','x-trim'}
    if set(node)-allowed:raise ValueError(f'Unsupported schema vocabulary at {at}: {sorted(set(node)-allowed)}')
    if isinstance(node.get('type'),list):raise ValueError(f'Unregistered type array at {at}')
    if '$ref' in node and set(node)-{'$ref','description','deprecated'}:raise ValueError(f'Reference siblings require a reviewed emitter at {at}')
    for key,child in node.get('properties',{}).items():preflight(child,f'{at}.properties.{key}')
    for union in ['allOf','anyOf','oneOf']:
        for i,child in enumerate(node.get(union,[])):preflight(child,f'{at}.{union}[{i}]')
    for key in ['if','then','else','not','items']:
        if key in node:preflight(node[key],f'{at}.{key}')
    if isinstance(node.get('additionalProperties'),dict):preflight(node['additionalProperties'],f'{at}.additionalProperties')

def main():
    paths=[
        'tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json',
        'docs/design/rust-r4ghi/g2-public-delta01.json',
        'docs/design/rust-r4ghi/g2-public-delta02.json',
        'tools/rust-r4ghi/I/implementation/support-patches/execution-admission11/public-schema11.json',
        'libs/shared/contracts/src/lib/shared-contracts.ts',
        'libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts'
    ]
    raw={p:(ROOT/p).read_bytes() for p in paths}
    if sha(raw[paths[1]])!='a1cdd25bac09dc5117736e76d9e214a4a881b7f4cfa3fddf8639aad210f757b9':raise ValueError('Sealed delta01 bytes changed')
    if sha(raw[paths[4]])!='ae2f43023d7b465bd362ea0945e2746b2169a69d94c838e8b19fd4e073c34c28':raise ValueError('Root Shared base changed; rebase required, do not overwrite contextual upload changes')
    full=json.loads(raw[paths[0]]);schemas=full['components']['schemas']
    if len(schemas)!=128:raise ValueError('Frozen source is not128')
    deltas=[json.loads(raw[p]) for p in paths[1:3]]
    if sha(raw[paths[3]])!=deltas[1]['sourceProposalSHA256']:raise ValueError('Delta02 source proposal bytes do not match')
    if deltas[1]['components']['FullProjectDetailView'].get('addRequired')!=['executionAdmissionContext']:
        raise ValueError('Root delta02 must explicitly require executionAdmissionContext; no silent optional fallback')
    proposal=json.loads(raw[paths[3]])
    if proposal['addSchemas']!=deltas[1]['addSchemas'] or proposal['components']!=deltas[1]['components']:raise ValueError('Delta02 differs from the exact reviewed I public proposal')
    for delta in deltas:
        for name,schema in delta['addSchemas'].items():
            if name in schemas:raise ValueError(f'Delta attempted replacement: {name}')
            schemas[name]=schema
        for name,change in delta['components'].items():
            target=schemas[name]
            if set(change)-{'appendOneOf','addRequired','addProperties'}:raise ValueError(f'Unknown delta construct for {name}')
            if 'appendOneOf'in change:target['oneOf'].extend(change['appendOneOf'])
            for key in change.get('addRequired',[]):
                if key in target['required']:raise ValueError(f'Duplicate required addition: {name}.{key}')
                target['required'].append(key)
            for key,schema in change.get('addProperties',{}).items():
                if key in target['properties']:raise ValueError(f'Delta attempted property replacement: {name}.{key}')
                target['properties'][key]=schema
    if len(schemas)!=130 or len(schemas['ProjectDetailView']['oneOf'])!=3:raise ValueError('Expected130 schemas and3 strict project branches')
    start=schemas['StartProjectExecutionRequest'];admission=schemas['ExecutionAdmissionContextView']
    omitted={'inputVersion','expectedProjectVersion','reason'}
    if admission['properties']!={k:v for k,v in start['properties'].items() if k not in omitted} or set(admission['required'])!=set(start['required'])-omitted:raise ValueError('Execution context must be the exact six Start DTO fields')
    for name,schema in schemas.items():preflight(schema,name)
    order=[];pending=set(schemas)
    while pending:
        ready=sorted(name for name in pending if refs(schemas[name])<=set(order))
        if not ready:raise ValueError(f'Unknown/cyclic registered refs: {sorted(pending)}')
        order.extend(ready);pending.difference_update(ready)
    inputs=HERE/'inputs';inputs.mkdir(exist_ok=True)
    entries=[]
    for i,p in enumerate(paths):
        name=f'{i+1:02d}-{Path(p).name}.bin';(inputs/name).write_bytes(raw[p]);entries.append({'source':p,'snapshot':'inputs/'+name,'SHA256':sha(raw[p]),'bytes':len(raw[p])})
    helper_raw=HELPER.read_bytes();(inputs/'07-frozen128-generator.py.bin').write_bytes(helper_raw);entries.append({'source':str(HELPER),'snapshot':'inputs/07-frozen128-generator.py.bin','SHA256':sha(helper_raw),'bytes':len(helper_raw)})
    (HERE/'public-contracts.g2-130.schema.json').write_text(json.dumps(full,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    lines=['// Effective-v2 + Root G2 delta01 + delta02. Sole modern130 public schema module.','import { z } from "zod";',f'const frozenSchemas: Readonly<Record<string, unknown>> = {js(schemas)};',validator]
    for name in order:
        expression=emit(schemas[name])
        if name=='SensitiveStringFieldProjection':expression+='''.superRefine((value, context) => {
                if ((value.mode === "masked" || value.mode === "denied") && value.value !== null) context.addIssue({code:"custom",path:["value"],message:"Protected projection value must remain null"});
                if ((value.mode === "masked" || value.mode === "denied") && value.reasonCode === "allowed") context.addIssue({code:"custom",path:["reasonCode"],message:"Protected projection cannot claim allowed"});
            })'''
        lines.append(f'export const {name}Schema = {expression}.superRefine((value, context) => validateFrozen({js(name)}, value, context)).meta({{id:{js(name)}}});')
        lines.append(f'export type {name} = z.infer<typeof {name}Schema>;')
    target=HERE/'proposed/libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts';target.parent.mkdir(parents=True,exist_ok=True);target.write_text('\n'.join(lines)+'\n',encoding='utf8')
    result={'status':'Root-Shared130-candidate-not-applied','schemaCount':130,'names':sorted(schemas),'productReadRoot':str(ROOT),'generatedTarget':'libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts','canonicalTarget':paths[4],'inputClosure':entries,'strictProjectBranches':3,'requiredNullableExecutionAdmissionContext':True,'exactStartDTOFieldCount':6,'unknownConstructs':'fail-closed','productWrites':False}
    (HERE/'plan130.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'status':result['status'],'schemas':130,'inputFiles':len(entries)}))

if __name__=='__main__':main()
