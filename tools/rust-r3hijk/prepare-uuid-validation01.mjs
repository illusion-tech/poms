import fs from 'node:fs';
import assert from 'node:assert/strict';
const derive=(from,to,replacements)=>{assert(!fs.existsSync(to));let source=fs.readFileSync(from,'utf8');for(const [old,value]of replacements){assert(source.includes(old),old);source=source.replaceAll(old,value);}fs.writeFileSync(to,source,{flag:'wx'});};
derive('tools/rust-r3hijk/resume-pg15-02.mjs','tools/rust-r3hijk/resume-pg15-03.mjs',[['pg15-resume02.json','pg15-resume03.json']]);
derive('tools/rust-r3hijk/final-integrity02.mjs','tools/rust-r3hijk/final-integrity03.mjs',[['final-integrity02','final-integrity03'],['rust-check09','rust-check10'],['rust-candidate04.json','rust-candidate05.json']]);
derive('tools/rust-r3hijk/environment-terminal01.mjs','tools/rust-r3hijk/environment-terminal02.mjs',[['environment-terminal01.json','environment-terminal02.json'],['postgres-terminal-original-','postgres-terminal02-original-']]);
derive('tools/rust-r3hijk/cohort-terminal01.mjs','tools/rust-r3hijk/cohort-terminal02.mjs',[["const runId=backend==='nest'?'b5eae6cf-26ab-4f78-8010-aa6997f9ce8d':'6872abb5-12af-486f-ada6-02e484421d1f';","assert.equal(backend,'rust');const runId=JSON.parse(fs.readFileSync('tmp/rust-r3hijk/root/uuid-cohort01.json')).runId;"],['R3HIJK-exact-owned-cohort-','R3HIJK-UUID-correction-exact-owned-cohort-']]);
console.log(JSON.stringify({newDerivedExecutors:4,oldExecutorBytesUnchanged:true}));
