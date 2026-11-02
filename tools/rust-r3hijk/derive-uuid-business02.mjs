import fs from 'node:fs';import assert from 'node:assert/strict';
const source='tools/rust-r3hijk/uuid-business01.mjs',target='tools/rust-r3hijk/uuid-business02.mjs';assert(!fs.existsSync(target));
let code=fs.readFileSync(source,'utf8').replaceAll('uuid-business01.mjs','uuid-business02.mjs');
assert(code.includes('const created={},tables='));
code="import {pin} from './source-guard.mjs';\n"+code.replace('const created={},tables=',"const priorFile='tmp/rust-r3hijk/acceptance-rust-candidate05-49/report01.json',prior=JSON.parse(fs.readFileSync(priorFile)),created=Object.fromEntries(prior.cases.filter(c=>c.label.startsWith('uuid.same-identity.')).map(c=>[c.label.split('.').slice(2).join('.'),c.value.response.body])),tables=");
code=code.replace('async function snapshot(){',"assert.equal(prior.cases.length,14);ctx.addSource(priorFile);const priorLabels=new Set(prior.cases.map(c=>c.label)),actualCase=ctx.case;ctx.case=(label,work)=>priorLabels.has(label)?Promise.resolve(prior.cases.find(c=>c.label===label).value):actualCase(label,work);await ctx.observe('uuid-partial-resume-authority',{prior:pin(priorFile),completedBusinessCasesReused:14,unsupportedCreateAuditProbe:'Existing I CREATE has no registered required audit; observed 201 is normal success, not failure-after-commit',originalReportUnchanged:true});\nasync function snapshot(){");
assert(code.includes("for(const method of ['POST','PATCH'])"));code=code.replace("for(const method of ['POST','PATCH'])","for(const method of ['PATCH'])");
fs.writeFileSync(target,code,{flag:'wx'});
