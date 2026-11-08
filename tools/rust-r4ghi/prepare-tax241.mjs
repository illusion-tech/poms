// Actual private Tax bindings for the final new119/B2, without changing state.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {readAdmittedConsumerContext,readPin54} from './business/consumer-admission54.mjs';
import {assertRuntimeBinding119} from './business/resource-tool-admission119.mjs';
import {loadApprovedTax13Bindings,verifyTax13Sources} from './business/tax13-provenance.mjs';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01';
const sha=v=>createHash('sha256').update(v).digest('hex');assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(!fs.existsSync(D+'/driver.lock'));assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const pin=(file,expected)=>{const rawBytesSha256=sha(fs.readFileSync(file));if(expected)assert.equal(rawBytesSha256,expected);return{file,rawBytesSha256};};const json=p=>JSON.parse(readPin54(p));
const stateFile=D+'/state.json',stateRaw=fs.readFileSync(stateFile),ctx=readAdmittedConsumerContext({statePin:pin(stateFile)}),state=ctx.state;
const plan=json(state.toolAdmission119.approvedPlan);assert.equal(state.toolAdmission119.approvedPlan.rawBytesSha256,'171d9eaab71fd1c6f0e2e61c9fe9021496fb6c1788e80922a9dc108b11d5233d');
assert.equal(plan.H1.rawBytesSha256,'51b303a3fccbae5e7fd7b0cc6a042da5bfd12f43c4a7507dfb6479e1d0be579c');const helpers=json(plan.H1);ctx.helperPins=helpers;
const B2=pin(D+'/B2-Source13-tool119-admitted238.json'),registry=json(state.consumerAdmission54.registry);assertRuntimeBinding119(ctx,registry,{toolAdmission119:state.toolAdmission119.registry,candidate:B2});
const regression=json(pin(P+'/source13-H1-helper235/receipt235.json','b2504a43ef271b0706c7f10e8c066fe97bef4dd200406aeb1a2e0ba51e8172b5'));assert.equal(regression.fail,0);assert.equal(regression.pass,211);
const old=json(pin(D+'/tax-runtime201.json','a52cd05c08cb9af06a899099f8c3d715daf0929fdfa8c2375766ebd47cc1e55d')),binding=structuredClone(old);
Object.assign(binding.current,{sourcePins:ctx.pins,sourceCount:ctx.pins.length,sourcePinsSHA256:sha(JSON.stringify(ctx.pins)),binarySHA256:state.apiProcess.record.binarySha256,
 apiProcess:structuredClone(registry.consumer.apiProcess),candidate:B2,helperCount:helpers.length,helperSources:helpers,registry:structuredClone(state.consumerAdmission54.registry),
 retentionIndex:structuredClone(registry.retentionIndex),retainedProducerState:structuredClone(registry.producerState),producerProjectionSHA256:sha(JSON.stringify(state.fixtures.sharedSourceFollowup58)),
 migrations:98,toolAdmission119:structuredClone(state.toolAdmission119.registry)});
assert.equal(binding.current.sourcePinsSHA256,'5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e');assert.equal(binding.current.helperCount,198);
const file=D+'/tax-runtime241.json';fs.writeFileSync(file,JSON.stringify(binding,null,2)+'\n',{flag:'wx',mode:0o600});const bound=pin(file),loaded=loadApprovedTax13Bindings(bound,D);verifyTax13Sources(ctx,loaded.manifest);
assert.deepEqual(fs.readFileSync(stateFile),stateRaw);console.log(JSON.stringify({runtimeBindings:bound,helperCount:helpers.length,tool119:state.toolAdmission119.registry,candidate:B2,source416AndStateUnchanged:true,HTTPOrSQL:false}));
