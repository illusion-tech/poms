import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sourcePins, FIXED } from './business/context.mjs';
import { sha } from './business/pure.mjs';
assert.equal(process.platform,'linux');const root=FIXED.win,privateRoot=FIXED.private,relative='tools/rust-r4ghi/I/implementation/business-consumer-admission62';
const pin=file=>({file,rawBytesSha256:sha(fs.readFileSync(file))});
const template=JSON.parse(fs.readFileSync(root+'/'+relative+'/admission62-plan.template.json'));
const old=JSON.parse(fs.readFileSync(template.producer.frozenState.file));assert.equal(sha(fs.readFileSync(template.producer.frozenState.file)),template.producer.frozenState.rawBytesSha256);
const pins=sourcePins();assert.equal(pins.length,406);const digest=sha(JSON.stringify(pins));
const byOld=new Map(old.sourcePins.map(p=>[p.file,p.sha256])),byNew=new Map(pins.map(p=>[p.file,p.sha256]));
const changed=pins.filter(p=>byOld.has(p.file)&&byOld.get(p.file)!==p.sha256).map(p=>({file:p.file,beforeSHA256:byOld.get(p.file),afterSHA256:p.sha256}));
const added=pins.filter(p=>!byOld.has(p.file)),removed=old.sourcePins.filter(p=>!byNew.has(p.file));assert.equal(removed.length,0);
assert.deepEqual(changed.map(p=>p.file).sort(),['apps/poms-api-rust/src/projects/service.rs','apps/poms-api-rust/src/projects/store.rs','docs/design/rust-r4ghi/g2-corrective01.md'].sort());
assert.deepEqual(added.map(p=>p.file),['docs/design/rust-r4ghi/g2-project-metadata-noop61.md']);
const processFile=privateRoot+'/rust-api135-process.json',processRecord=JSON.parse(fs.readFileSync(processFile));assert.equal(pin(processFile).rawBytesSha256,'a42333c74b7afd8aa7359bb3cf915444cc7cbbfebff9049a467c2cdb33ccef06');
assert.equal(processRecord.binarySha256,'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff');assert.equal(processRecord.pid,108720);
assert.equal(sha(fs.readFileSync(processRecord.binary)),processRecord.binarySha256);assert.equal(fs.realpathSync(`/proc/${processRecord.pid}/exe`),processRecord.binary);
assert.equal(fs.readFileSync(`/proc/${processRecord.pid}/stat`,'utf8').split(' ')[21],processRecord.startTime);
const checks=['rust-fmt08','rust-clippy10','rust-test09','rust-build09'].map(name=>{const file=root+'/tmp/rust-r4ghi/root/'+name+'/receipt.json',r=JSON.parse(fs.readFileSync(file));assert.equal(r.exitCode,0);assert(r.sourceStable);for(const p of r.inputs)assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.rawBytesSha256);return{name,pin:pin(file)};});
const summaryFile=root+'/tmp/rust-r4ghi/root/summary-build12/receipt.json',summary=JSON.parse(fs.readFileSync(summaryFile));assert.equal(summary.exitCode,0);assert(summary.sourceStable);assert.equal(sha(fs.readFileSync(summary.binary.file)),summary.binary.sha256);
const runtimeFile=root+'/tmp/rust-r4ghi/root/runtime-openapi13/receipt.json',runtime=JSON.parse(fs.readFileSync(runtimeFile));assert.equal(runtime.exitCode,0);assert.equal(runtime.binary.sha256,processRecord.binarySha256);assert.equal(runtime.stdout.sha256,'7312b4020c275a64067714fd2dc400a98ee34cd1155aa88ebe08acc922326b57');
const oldDir=privateRoot+'/business/g2-business11/main01/',groupFiles=[['operating-EF-102','002356-ef-correction-sweep56-01-complete.json'],['lifecycle-45','003097-lifecycle-sweep61-01-complete.json'],['modern-34','003638-modern-protocol56-complete.json'],['A05-max-zero','003639-a05-max-zero64-01-complete.json'],['A05-cent-max','003936-a05-cent-max64-01-complete.json'],['A05-tax13','004179-a05-max-tax13-64-01-complete.json'],['A05-overflow-preparation422','004433-a05-overflow59-complete.json']];
const groups=groupFiles.map(([group,file])=>({group,producerAPI:'134',producerEpoch:'g2-business11',receipt:pin(oldDir+file),use:'historical-by-impact-review',certifiesCurrentConsumerExecution:false}));
const folder=privateRoot+'/retention/consumer12-admission74';assert(!fs.existsSync(folder));fs.mkdirSync(folder,{mode:0o700});const write=(name,value)=>{const file=folder+'/'+name;fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return pin(file);};
const source=write('source12-pins.json',pins);
const comparison=write('source11-to12-comparison.json',{kind:'exact-source11-to12-noop61-impact-comparison',producerSourcePinsSHA256:template.producer.sourcePinsSHA256,consumerSourcePinsSHA256:digest,
 beforeCount:405,afterCount:406,changed,added,removed,unchanged:old.sourcePins.length-changed.length,
 productionDiff:'Only updater stamping inside business dirty branch and excluding attribution-only dirty; two classifier regressions. Other service/store methods and all G/H/I paths unchanged.',
 RootNonauthorReview:'Full service/store before/after read; H nonauthor61 independent raw diff agrees. Existing same-actor metadata observation remains that exact historical case; different-actor no-op requires new135 HTTP.',
 API134SuccessesRemainHistorical:true,API135ExecutionNotGranted:true});
const impact=JSON.parse(fs.readFileSync(root+'/'+relative+'/impact-review62.template.json'));Object.assign(impact,{consumerSourcePinsSHA256:digest,reviewer:'Root nonauthor exact61 review; independent H61 review',sourceComparisonReceipt:comparison,evidenceGroups:groups});
const impactPin=write('impact-review62.json',impact);
const candidate=write('candidate12-pre-admission.json',{kind:'actual-new12-source-and-binary-before-data-admission',epoch:'g2-business12',run:'main01',sourcePinsSHA256:digest,sourceCount:pins.length,sourcePins:source,binarySha256:processRecord.binarySha256,
 apiProcess:pin(processFile),checks,summaryExampleBuild:pin(summaryFile),summaryBinary:summary.binary,runtimeOpenAPI:pin(runtimeFile),impactReview:impactPin,actorBindingsFinal:false,oldEvidenceNotAPI135Execution:true,G3Certified:false,G4Certified:false});
Object.assign(template.consumer,{sourcePins:source,sourcePinsSHA256:digest,sourceCount:pins.length,candidateReceipt:candidate,candidateSourceDigestPointer:'/sourcePinsSHA256',candidateBinaryHashPointer:'/binarySha256',apiProcess:pin(processFile),binarySHA256:processRecord.binarySha256,impactReview:impactPin});
const plan=write('admission-plan62.json',template);
fs.writeFileSync(root+'/docs/design/rust-r4ghi/consumer12-admission74-input.json',JSON.stringify({kind:'Root-reviewed-actual-source12-admission-input74',plan,consumer:template.consumer,producer:template.producer,sourceDelta:comparison,impactReview:impactPin,mintExecuted:false,businessSQLOrHTTPExecuted:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({plan,sourcePinsSHA256:digest,sourceFiles:pins.length,productionRustFilesChanged:2,oldEvidenceGroups:groups.length,consumerMintExecuted:false}));
