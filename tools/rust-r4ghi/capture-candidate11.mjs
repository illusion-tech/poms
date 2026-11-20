import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha } from './business/pure.mjs';
import { assertAdmittedContext54 } from './business/consumer-admission54.mjs';
const ctx=createContext({epoch:'g2-business11',run:'main01'}),registry=assertAdmittedContext54(ctx,{liveProcess:true,sourceFiles:true});
const lock=ctx.priv+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'capture-actual-consumer11-candidate'})+'\n',{flag:'wx',mode:0o600});
try{
 assert(ctx.state.baseline&&ctx.state.actors.manager&&ctx.state.apiProcess);assert.equal(ctx.pins.length,405);
 const p=ctx.state.apiProcess;assert.equal(p.record.binarySha256,registry.consumer.binarySHA256);
 const result={kind:'actual-new11-admitted-source-candidate-binding',epoch:ctx.epoch,run:ctx.run,marker:ctx.identity.marker,migrations:97,tables:139,
 codegenSourceHead:'2cd1be6029cf1b14ebfb1fc4530af894507a4c5a',codegenToolingHead:'8c6e98db9cae598787da095084965c434ee1105a',
 sourcePins:ctx.pins,sourcePinsSHA256:sha(JSON.stringify(ctx.pins)),process:p,baseline:ctx.state.baseline,consumerAdmission:ctx.state.consumerAdmission54,
 actorKeys:Object.keys(ctx.state.actors),actorBindingsFinal:false,readiness:200,oldProducerEvidenceIsNotCurrentAcceptance:true,formalG3Certified:false};
 const pin=ctx.artifact(ctx.next('candidate-source-binding11')+'.json',result,{kind:result.kind,epoch:ctx.epoch,run:ctx.run,migrations:97,tables:139,sourcePinsSHA256:result.sourcePinsSHA256,apiBinarySHA256:p.record.binarySha256,actorBindingsFinal:false,G3Certified:false});
 ctx.state.currentCandidate11=pin;ctx.persist();console.log(JSON.stringify({candidate:pin,sourcePinsSHA256:result.sourcePinsSHA256,sourceFiles:ctx.pins.length,pid:p.record.pid,actorBindingsFinal:false}));
}finally{ctx.persist();assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
