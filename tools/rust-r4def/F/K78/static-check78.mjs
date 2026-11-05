// Offline candidate checks only. Never invoke Root factory/runAll or fake HTTP.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createK78,CASES78,OPS78,BYTES78,SHA78} from './request-driver78.mjs';
import {VERTICAL7} from './RootRunner78.mjs';
import './RootEntry78.mjs';
const root=new URL('../../../../',import.meta.url), sha=b=>createHash('sha256').update(b).digest('hex');
const checks=[];function check(name,fn){fn();checks.push({name,status:'passed',classification:'offline-static-only'});}
check('constant 64-byte independent SHA witness',()=>{assert.equal(BYTES78.length,64);assert.equal(sha(BYTES78),SHA78);});
check('16 mandatory + 2 explicit optional Root-hook cases',()=>{assert.equal(CASES78.length,18);assert.equal(CASES78.filter(n=>!n.startsWith('actual-read-')).length,16);assert.equal(new Set(CASES78).size,18);});
check('vertical7 is closed genuine subset',()=>{assert.equal(VERTICAL7.length,7);assert(VERTICAL7.every(n=>CASES78.includes(n)));});
const context={author:{id:'40000000-0000-4000-8000-000000000001',permissions:[]},projectId:'10000000-0000-4000-8000-000000000001',contractId:'20000000-0000-4000-8000-000000000001',tag:'k78',environment:{namespace:'poms-r4def'}};
check('constructor/manifest leaves every actual case not-run',()=>{const m=createK78(context).manifest();assert(m.stages.every(s=>s.status==='not-run'));assert.equal(m.authorExecutedHTTP,false);assert.equal(m.authorExecutedPG,false);assert.equal(m.authorExecutedObjectIO,false);});
check('vertical manifest exposes omitted cases as not-run',()=>{const m=createK78(context,{}, {cases:VERTICAL7}).manifest();assert.equal(m.stages.length,7);assert.equal(m.omittedCasesNotRun.length,11);});
check('canonical operation IDs/method/path from actual spec',()=>{const spec=JSON.parse(fs.readFileSync(new URL('libs/shared/api-spec/openapi.json',root)));for(const [id,[method,p]] of Object.entries(OPS78))assert.equal(spec.paths[p]?.[method.toLowerCase()]?.operationId,id);});
check('Root trigger is owned scoped, not unscoped core probe',()=>{const text=fs.readFileSync(new URL('./RootRunner78.mjs',import.meta.url),'utf8');assert(text.includes("actual @> COALESCE(spec->'match'"));assert(text.includes("spec->'parentAttachment'"));assert(text.includes('fault.snapshot('));assert(!text.includes('fault.probe('));assert(text.includes('post-eager'));});
check('product files remain exact sealed K98/K86/K56 bytes',()=>{for(const [file,pin] of Object.entries({'apps/poms-api-rust/src/attachments/store.rs':'525028f45ce39a5935f4a1565eee662b76a2976f07a212a580c23f862e899899','apps/poms-api-rust/src/attachments/service.rs':'0fbd8afc1c22fec87e3034b9e31d9c89a3cfea92d85cb8f0ef1866dd23bcceab','apps/poms-api-rust/src/attachment_storage/registry.rs':'617f734af15f7e75db2cc69de63343c04104abbd446f322809fb1f1bfc625765'}))assert.equal(sha(fs.readFileSync(new URL(file,root))),pin);});
console.log(JSON.stringify({kind:'K78-offline-static-candidate-checks',checks,initialPlan:createK78(context).manifest(),verticalPlan:createK78(context,{}, {cases:VERTICAL7}).manifest(),authorExecutedHTTP:false,authorExecutedPG:false,authorExecutedObjectIO:false,actualAcceptance:'not-run',S3Accepted:false,G3Certified:false,G4Certified:false},null,2));
