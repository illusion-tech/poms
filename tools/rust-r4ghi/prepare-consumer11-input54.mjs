// Metadata-only input assembly, before any retained-data consumer exists.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sourcePins, FIXED } from './business/context.mjs';
import { sha } from './business/pure.mjs';
assert.equal(process.platform,'linux');
const edition=process.argv[2]??'01';assert(/^\d{2}$/.test(edition));
const root=FIXED.win, folder=FIXED.private+'/retention/consumer11-admission54'+(edition==='01'?'':'-'+edition);
assert(!fs.existsSync(folder));fs.mkdirSync(folder,{mode:0o700});
const pin=file=>({file,rawBytesSha256:sha(fs.readFileSync(file))});
const write=(name,value)=>{const file=folder+'/'+name;fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return pin(file);};
const pfile=FIXED.private+'/rust-api134-process.json',p=JSON.parse(fs.readFileSync(pfile));
assert.equal(p.pid,69377);assert.equal(p.namespace,FIXED.namespace);assert.equal(p.binarySha256,'c73fcaa6cc9063e9a6b7dc481a51f9f52d4ed3f9855c55201d1ab46f0695bee4');
assert.equal(sha(fs.readFileSync(p.binary)),p.binarySha256);assert.equal(fs.realpathSync(`/proc/${p.pid}/exe`),p.binary);
assert.equal(fs.readFileSync(`/proc/${p.pid}/stat`,'utf8').split(' ')[21],p.startTime);
const checks=['rust-fmt07','rust-clippy09','rust-test08','rust-build08'].map(name=>{
 const file=root+'/tmp/rust-r4ghi/root/'+name+'/receipt.json',receipt=JSON.parse(fs.readFileSync(file));
 assert.equal(receipt.exitCode,0);assert(receipt.sourceStable);
 for(const input of receipt.inputs)assert.equal(sha(fs.readFileSync(root+'/'+input.file)),input.rawBytesSha256);
 return{name,pin:pin(file)};
});
const summaryFile=root+'/tmp/rust-r4ghi/root/summary-build11/receipt.json',summary=JSON.parse(fs.readFileSync(summaryFile));assert.equal(summary.exitCode,0);assert(summary.sourceStable);
assert.equal(sha(fs.readFileSync(summary.binary.file)),summary.binary.sha256);
const runtimeFile=root+'/tmp/rust-r4ghi/root/runtime-openapi12/receipt.json',runtime=JSON.parse(fs.readFileSync(runtimeFile));assert.equal(runtime.exitCode,0);assert.equal(runtime.binary.sha256,p.binarySha256);assert.deepEqual(runtime.counts,{paths:222,operations:272,schemas:690});
assert.equal(runtime.stdout.sha256,'7312b4020c275a64067714fd2dc400a98ee34cd1155aa88ebe08acc922326b57');
const pins=sourcePins(),digest=sha(JSON.stringify(pins)),source=write('source11-pins.json',pins);
assert.equal(pins.length,405);assert.notEqual(digest,'a379d62b5b583446b01f4a6bb3891b4bf9bdaf0e5966fb7a39dd7b07b643c589');
const candidate=write('candidate11-pre-admission.json',{kind:'actual-new-consumer11-source-binary-candidate-before-admission',namespace:FIXED.namespace,epoch:'g2-business11',run:'main01',
 sourcePinsSHA256:digest,sourceCount:pins.length,sourcePins:source,binarySha256:p.binarySha256,apiProcess:pin(pfile),checks,summaryExampleBuild:pin(summaryFile),summaryExampleBinary:summary.binary,
 runtimeOpenAPI:pin(runtimeFile),consumerDataAdmitted:false,oldProducerSuccessesAreNotConsumerAcceptance:true,actorBindingsFinal:false,G3Certified:false,G4Certified:false});
const template='E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/business-consumer-admission54/admission-input54.template.json'.replace('E:','/mnt/e');
const plan=JSON.parse(fs.readFileSync(template));
Object.assign(plan.consumer,{sourcePins:source,sourcePinsSHA256:digest,sourceCount:pins.length,candidateReceipt:candidate,candidateSourceDigestPointer:'/sourcePinsSHA256',candidateBinaryHashPointer:'/binarySha256',apiProcess:pin(pfile),binarySHA256:p.binarySha256});
const actual=write('admission-plan54.json',plan);
fs.writeFileSync(root+'/docs/design/rust-r4ghi/consumer11-admission54-input'+(edition==='01'?'':'-'+edition)+'.json',JSON.stringify({kind:'Root-reviewed-actual-consumer11-admission-input54',plan:actual,producer:plan.producer,consumer:plan.consumer,
 oldProducerUnchanged:true,newConsumerAlreadyMinted:false,businessSQLWrites:0,businessHTTP:0,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({plan:actual,sourceFiles:pins.length,sourcePinsSHA256:digest,binarySHA256:p.binarySha256,consumerMintExecuted:false}));
