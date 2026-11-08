// H proposal only: preserve old no-overlay branches; add restart proof propagation/checks.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',O=path.dirname(fileURLToPath(import.meta.url)),base='tools/rust-r4ghi/H/implementation/support-patches/ui-integration',sha=b=>createHash('sha256').update(b).digest('hex'),products=[];
const once=(s,a,b)=>{assert.equal(s.split(a).length-1,1,a.slice(0,90));return s.replace(a,b);};
function save(file,text){const old=fs.readFileSync(`${R}/${file}`),target=`${O}/proposed/${file}`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text,{flag:'wx'});products.push({file,beforeSHA256:sha(old),afterSHA256:sha(Buffer.from(text)),candidate:`proposed/${file}`});}
const bind=`${base}/runtime13/binding13.mjs`;let b=fs.readFileSync(`${R}/${bind}`,'utf8');
b=once(b,'  return binding;','  if (binding.processRestart1351 !== undefined) { const p=binding.processRestart1351; assert(p&&typeof p.file===\'string\'&&path.isAbsolute(p.file)&&digest(p.rawBytesSha256), \'Actual process-restart registry pin required\'); }\n  return binding;');
b=once(b,'  assert(Array.isArray(actors.actors) && actors.actors.length > 0);',`  assert(Array.isArray(actors.actors) && actors.actors.length > 0);
  if (ctx.state.processRestart1351) {
    const { assertRestartUIBinding1351 } = createRequire(import.meta.url)('../../../../../business/same-source-process1351.mjs');
    const proof = assertRestartUIBinding1351(ctx, binding, actors); assert(!(proof && typeof proof.then === 'function'), 'Process restart UI admission must finish synchronously before HTTP');
  }`);save(bind,b);
const collect=`${base}/handoff16/collect-actor-proof16.mjs`;let c=fs.readFileSync(`${R}/${collect}`,'utf8');c="import {currentRestartFields1351, assertReceiptProcess1351} from '../../../../../business/ui-process-proof1351.mjs';\n"+c;
c=once(c,'    const api = createApi(ctx);',"    const restart1351 = currentRestartFields1351(ctx.state, input.apiProcess, ctx.state.processRestart1351 ? readPin(ctx.state.processRestart1351.registry) : null);\n    const api = createApi(ctx);");
c=once(c,'      proofs.push({ actorKey, httpReceipt:',"      assertReceiptProcess1351(receipt, {file:result.receiptId,rawBytesSha256:sha(bytes)}, restart1351);\n      proofs.push({ actorKey, httpReceipt:");
c=once(c,'actualPlan: input.plan, fixtureProducerAdmissions54, proofs };',"actualPlan: input.plan, fixtureProducerAdmissions54, proofs, ...(restart1351 ? {processRestart1351:restart1351.processRestart1351,apiProcess:restart1351.apiProcess} : {}) };");save(collect,c);
const gen=`${base}/handoff16/generate-binding16.mjs`;let g=fs.readFileSync(`${R}/${gen}`,'utf8');g="import {createRequire} from 'node:module';\nimport {currentRestartFields1351, assertReceiptProcess1351, assertIndexProcess1351, actorRestartFields1351} from '../../../../../business/ui-process-proof1351.mjs';\n"+g;
g=once(g,'  assert.deepEqual(index.actualPlan, input.plan);',"  assert.deepEqual(index.actualPlan, input.plan);\n  const restart1351 = currentRestartFields1351(state, input.apiProcess, state.processRestart1351 ? original(state.processRestart1351.registry, roots) : null);\n  assertIndexProcess1351(index, restart1351);");
g=once(g,"    const response = original(http.originals.responseBody, [priv]),", "    assertReceiptProcess1351(http, proof.httpReceipt, restart1351);\n    const response = original(http.originals.responseBody, [priv]),");
const actorOld="  fs.writeFileSync(actorFile, JSON.stringify({ schemaVersion: 1, namespace: state.namespace, epoch: state.epoch, run: state.run, marker: state.marker, actorBindingsFinal: index.actorBindingsFinal, purpose: input.purpose, sourceActualProofIndex: input.actorProofIndex, actors }, null, 2) + '\\n', { flag: 'wx', mode: 0o600 });";
g=once(g,actorOld,"  const actorManifestValue = { schemaVersion: 1, namespace: state.namespace, epoch: state.epoch, run: state.run, marker: state.marker, actorBindingsFinal: index.actorBindingsFinal, purpose: input.purpose, sourceActualProofIndex: input.actorProofIndex, actors, ...actorRestartFields1351(restart1351, input.actorProofIndex) };\n  fs.writeFileSync(actorFile, JSON.stringify(actorManifestValue, null, 2) + '\\n', { flag: 'wx', mode: 0o600 });");
g=once(g,'fixtureProducerAdmissions54: index.fixtureProducerAdmissions54, compatibilityFixtures };',"fixtureProducerAdmissions54: index.fixtureProducerAdmissions54, compatibilityFixtures, ...(restart1351 ? {processRestart1351:restart1351.processRestart1351} : {}) };");
g=once(g,'  validateBindingShape(binding); fs.writeFileSync(locations.linuxBinding,',`  validateBindingShape(binding);
  if (restart1351) {
    const {assertRestartUIBinding1351} = createRequire(import.meta.url)('../../../../../business/same-source-process1351.mjs');
    const proof = assertRestartUIBinding1351(admittedContext, binding, actorManifestValue); assert(!(proof && typeof proof.then === 'function'), 'Restart binding must be verified synchronously before publication');
  }
  fs.writeFileSync(locations.linuxBinding,`);save(gen,g);
const helper='tools/rust-r4ghi/business/ui-process-proof1351.mjs';assert(!fs.existsSync(`${R}/${helper}`));products.push({file:helper,beforeSHA256:null,mustBeAbsent:true,afterSHA256:sha(fs.readFileSync(`${O}/proposed/${helper}`)),candidate:`proposed/${helper}`});fs.writeFileSync(`${O}/products39.json`,JSON.stringify(products,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({kind:'UI1351-minimal-process-seam39',products:4,RootWritten:false,actualProcessOrActorPinsCreated:false}));
