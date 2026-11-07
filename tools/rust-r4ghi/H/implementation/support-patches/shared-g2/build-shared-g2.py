"""Append-only G2 proposal. Previous128 artifacts and product files are read-only."""
from __future__ import annotations
import hashlib
import json
import pathlib
import sys

HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parents[5]
ROOT_PRODUCT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
BASE='9e010077e3010ff09447e9d77cb1bf1f7adbf68d'
sys.dont_write_bytecode=True
old=HERE.parent/'prepare-shared-native.py'
helpers={'__file__':str(old),'__name__':'frozen128_readonly_helpers'}
exec(compile(old.read_text(encoding='utf-8'),str(old),'exec'),helpers)
emit,refs,js,validator=(helpers[name] for name in ['emit','refs','js','VALIDATOR'])


def main():
    frozen=ROOT/'tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json'
    delta_path=ROOT_PRODUCT/'docs/design/rust-r4ghi/g2-public-delta01.json'
    source=frozen.read_bytes();delta_bytes=delta_path.read_bytes()
    full=json.loads(source);schemas=full['components']['schemas'];delta=json.loads(delta_bytes)
    if len(schemas)!=128:raise ValueError('The sealed source must remain128')
    for name,schema in delta['addSchemas'].items():
        if name in schemas:raise ValueError('G2 cannot replace an existing sealed name')
        schemas[name]=schema
    for name,change in delta['components'].items():
        target=schemas[name]
        if 'appendOneOf'in change:target['oneOf'].extend(change['appendOneOf'])
        if 'addRequired'in change:target['required'].extend(change['addRequired'])
        if 'addProperties'in change:target['properties'].update(change['addProperties'])
    if len(schemas)!=129 or len(schemas['ProjectDetailView']['oneOf'])!=3:raise ValueError('Expected129 and3 strict project branches')
    (HERE/'inputs').mkdir(exist_ok=True)
    (HERE/'inputs/public-contracts.v2-128.json.bin').write_bytes(source)
    (HERE/'inputs/g2-public-delta01.json.bin').write_bytes(delta_bytes)
    (HERE/'public-contracts.g2-129.schema.json').write_text(json.dumps(full,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    order=[];pending=set(schemas)
    while pending:
        ready=sorted(name for name in pending if refs(schemas[name])<=set(order))
        if not ready:raise ValueError('Unresolved schema cycle')
        order.extend(ready);pending.difference_update(ready)
    lines=['// Effective-v2 + explicit Root G2 delta. Sole modern129 public schema module.','import { z } from "zod";',f'const frozenSchemas: Readonly<Record<string, unknown>> = {js(schemas)};',validator]
    for name in order:
        expression=emit(schemas[name])
        if name=='SensitiveStringFieldProjection':
            expression+='''.superRefine((value, context) => {
                if ((value.mode === "masked" || value.mode === "denied") && value.value !== null) context.addIssue({code:"custom",path:["value"],message:"Protected projection value must remain null"});
                if ((value.mode === "masked" || value.mode === "denied") && value.reasonCode === "allowed") context.addIssue({code:"custom",path:["reasonCode"],message:"Protected projection cannot claim allowed"});
            })'''
        lines.append(f'export const {name}Schema = {expression}.superRefine((value, context) => validateFrozen({js(name)}, value, context)).meta({{id:{js(name)}}});')
        lines.append(f'export type {name} = z.infer<typeof {name}Schema>;')
    target=HERE/'proposed/libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts'
    target.parent.mkdir(parents=True,exist_ok=True);target.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    original=(HERE.parent/'candidate9e-shared-contracts.ts').read_bytes()
    if hashlib.sha256(original).hexdigest()!='d962b8267030c8277f760b8bd6471e62491ee7fbd6353226f6291d3ff3a18db1':raise ValueError('Frozen raw Native reference has changed')
    native=HERE/'proposed/apps/poms-api/src/app/core/rust-r4ghi-frozen-native-reference.ts';native.parent.mkdir(parents=True,exist_ok=True);native.write_bytes(original)
    result={'status':'Root-shared-Native-G2-proposal-not-applied','base':BASE,'source129SHA256':hashlib.sha256((HERE/'public-contracts.g2-129.schema.json').read_bytes()).hexdigest(),'sealed128RawSHA256':hashlib.sha256(source).hexdigest(),'g2DeltaRawSHA256':hashlib.sha256(delta_bytes).hexdigest(),'legacyRawSHA256':hashlib.sha256(original).hexdigest(),'names':sorted(schemas),'schemaCount':129,'generatedTarget':target.relative_to(HERE/'proposed').as_posix(),'privateNativeTarget':native.relative_to(HERE/'proposed').as_posix(),'productReadRoot':str(ROOT_PRODUCT)}
    (HERE/'shared-g2-plan.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'schemas':129,'strictProjectBranches':3,'status':result['status']}))


if __name__=='__main__':main()
