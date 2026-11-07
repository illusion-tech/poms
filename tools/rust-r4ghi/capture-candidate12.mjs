import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha } from './business/pure.mjs';
import { assertAdmittedContext54 } from './business/consumer-admission54.mjs';
const ctx=createContext({epoch:'g2-business12',run:'main01'}),registry=assertAdmittedContext54(ctx,{liveProcess:true,sourceFiles:true});
const lock=ctx.priv+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'capture-actual-admitted12-candidate'})+'\n',{flag:'wx',mode:0o600});
try{assert.equal(ctx.pins.length,406);assert.equal(ctx.state.apiProcess.record.binarySha256,registry.consumer.binarySHA256);assert.equal(ctx.state.consumerChecks72.noop.phase,'verified');
 const result={kind:'actual-new12-admitted-source-candidate-binding',epoch:ctx.epoch,run:ctx.run,marker:ctx.identity.marker,migrations:ctx.migrations,tables:ctx.tables,
  codegenSourceHead:'2cd1be6029cf1b14ebfb1fc4530af894507a4c5a',codegenToolingHead:'8c6e98db9cae598787da095084965c434ee1105a',implementationCheckpointParent:'c4192c4842f40ec1d4667d7189863f7093f37975',
  sourcePins:ctx.pins,sourcePinsSHA256:sha(JSON.stringify(ctx.pins)),process:ctx.state.apiProcess,baseline:ctx.state.baseline,consumerAdmission:ctx.state.consumerAdmission54,
  actualNoopHTTP:ctx.state.consumerChecks72.noopReceipt,actorKeys:Object.keys(ctx.state.actors),actorBindingsFinal:false,readiness:200,oldProducerEvidenceIsNotCurrentAcceptance:true,formalG3Certified:false};
 const pin=ctx.artifact(ctx.next('candidate-source-binding12')+'.json',result,{kind:result.kind,epoch:ctx.epoch,run:ctx.run,migrations:ctx.migrations,tables:ctx.tables,sourcePinsSHA256:result.sourcePinsSHA256,apiBinarySHA256:ctx.state.apiProcess.record.binarySha256,actorBindingsFinal:false,G3Certified:false});
 ctx.state.currentCandidate12=pin;ctx.persist();console.log(JSON.stringify({candidate:pin,sourcePinsSHA256:result.sourcePinsSHA256,sourceFiles:ctx.pins.length,pid:ctx.state.apiProcess.record.pid,actorBindingsFinal:false}));
}finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
