import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const require = createRequire('E:/projects/poms/package.json');
const { z } = require('zod');
const directory='tools/rust-r4ghi/I/implementation/support-patches/attachment-scope08/';
const file=directory+'candidate/libs/shared/contracts/src/lib/shared-contracts.ts';
const source=readFileSync(file,'utf8');
const begin=source.indexOf('export const CompletionConditionAttachmentContextSchema = ');
const end=source.indexOf('export type CompletionConditionAttachmentContext',begin);
const declaration=source.slice(begin,end);
const definition=declaration.slice(declaration.indexOf('=')+1).trim().replace(/;$/,'');
if(!definition) throw new Error('Exact candidate schema declaration missing');
const schema=vm.runInNewContext(definition,{z});
const parent='00000000-0000-4000-8000-000000000001';
const child='00000000-0000-4000-8000-000000000002';
const cases=[
 ['valid-real-shaped-UUID-pair',{completionRecordId:parent,conditionId:child},true],
 ['missing-parent',{conditionId:child},false],
 ['missing-child',{completionRecordId:parent},false],
 ['wrong-parent-UUID',{completionRecordId:'not-a-uuid',conditionId:child},false],
 ['unknown-project-field',{completionRecordId:parent,conditionId:child,projectId:parent},false],
 ['unknown-related-field',{completionRecordId:parent,conditionId:child,relatedField:parent},false],
 ['null',null,false],['array',[parent,child],false],['string',parent,false]
];
const results=cases.map(([name,input,expected])=>({name,expected,actual:schema.safeParse(input).success}));
const output={kind:'isolated exact candidate nested Zod schema runtime tests; not whole request/type/HTTP validation',sourceFile:file,sourceSHA256:createHash('sha256').update(source).digest('hex'),definitionSHA256:createHash('sha256').update(definition).digest('hex'),results,passed:results.every(r=>r.actual===r.expected)};
writeFileSync(directory+'context-schema-runtime09.json',JSON.stringify(output,null,2)+'\n');
process.stdout.write(JSON.stringify({cases:results.length,passed:output.passed}));
if(!output.passed)process.exitCode=1;
