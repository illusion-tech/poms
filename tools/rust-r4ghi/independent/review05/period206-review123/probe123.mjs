import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private';
const OUT=R+'/tools/rust-r4ghi/independent/review05/period206-review123';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const pin=file=>{const b=fs.readFileSync(file);return {file,bytes:b.length,rawBytesSha256:hash(b)};};
const read=p=>{const b=fs.readFileSync(p.file);assert.equal(hash(b),p.rawBytesSha256);if(p.bytes!==undefined)assert.equal(b.length,p.bytes);return JSON.parse(b);};
const manifestPin=pin(R+'/tools/rust-r4ghi/I/implementation/period-driver206-02/manifest206-02.json');assert.equal(manifestPin.rawBytesSha256,'362f18133f57e82ccc057f946231a16459c32c1d335f25aa9a677be251f1e338');
const manifest=read(manifestPin);for(const p of manifest.files)assert.deepEqual(pin(R+'/'+p.file),{...p,file:R+'/'+p.file});
const factsPin=pin(R+'/tools/rust-r4ghi/I/implementation/period-driver206/facts206.mjs');assert.equal(factsPin.rawBytesSha256,'313c1450b61700e51505acb35cc15cb5bc7e49e71cc053a98c8a191c5e664660');
const f=await import(pathToFileURL(factsPin.file));
const actual204=pin(P+'/business/g2-business13/main01/000034-period204-preparation.json'),old=read(actual204);
const publicPin=pin(old.responseReceipt),pub=read(publicPin);assert.equal(pub.status,200);assert.equal(pub.responseComplete,true);assert.equal(pub.transportFailure,false);
const payload=read(pub.originals.responseBody),value=payload.data??payload;assert.deepEqual(value.preparation,old.preparation);
const calendar={...old.calendar,prior_start:'2026-11-02',prior_end:'2026-11-08'};
const body=f.periodBody206(old.preparation,calendar);assert.deepEqual(body.costDecisions,[]);assert.equal(body.expectedInputHash,old.preparation.expectedInputHash);assert.equal(body.expectedVersion,old.preparation.headVersion);assert.equal(body.expectedProjectVersion,old.preparation.projectVersion);
const negatives=[
 ['wrong-kind',p=>p.kind='command'],['wrong-intent',p=>p.intent='snapshot'],['wrong-project',p=>p.projectId='51d60c76-6de2-432a-8714-10e3ed3234f3'],
 ['wrong-week',p=>p.periodKey='2026-W44'],['wrong-cutoff',p=>p.businessCutoff='2026-11-09'],['ineligible',p=>p.formalEligibility.status='missing-evidence'],
 ['inner-block',p=>p.formalEligibility.blockingReasonCodes=['baseline-missing']],['outer-block',p=>p.blockingReasonCodes=['cost-classification-required']],
 ['missing-command',p=>p.allowedCommandCodes=[]],['zero-head',p=>p.headVersion=0],['fraction-head',p=>p.headVersion=1.1],['missing-head',p=>delete p.headVersion],
 ['zero-project-version',p=>p.projectVersion=0],['missing-project-version',p=>delete p.projectVersion],['bad-input-hash',p=>p.expectedInputHash='x'],['missing-input-hash',p=>delete p.expectedInputHash],
 ['no-baseline',p=>p.selectedBaselinePackageRef=null],['wrong-baseline-type',p=>p.selectedBaselinePackageRef.kind='ProjectOperatingSnapshot'],
 ['zero-baseline-version',p=>p.selectedBaselinePackageRef.rowVersion=0],['missing-baseline-version',p=>delete p.selectedBaselinePackageRef.rowVersion],
 ['bad-baseline-hash',p=>p.selectedBaselinePackageRef.payloadHash='x'],['missing-baseline-hash',p=>delete p.selectedBaselinePackageRef.payloadHash],
 ['empty-cost-scope',p=>p.sourceRows=p.sourceRows.filter(r=>!['direct-cost','allocation-share','supporting-source'].includes(r.rowKind))],
 ['unmapped-source',p=>p.sourceRows.find(r=>['direct-cost','allocation-share'].includes(r.rowKind)).rowKind='supporting-source'],
 ['future-source',p=>p.sourceRows.find(r=>['direct-cost','allocation-share'].includes(r.rowKind)).blockingReasonCodes.push('outside-business-cutoff')]
];
for(const[name,mutate]of negatives){const p=structuredClone(old.preparation);mutate(p);assert.throws(()=>f.periodBody206(p,calendar),name);}
for(const change of [{today:'2026-11-08'},{today:'2026-11-16'},{current_week:'2026-W45'},{prior_week:'2026-W44'},{prior_start:'2026-11-03'},{prior_end:'2026-11-07'}])assert.throws(()=>f.periodBody206(old.preparation,{...calendar,...change}));
for(const p of manifest.files)assert.deepEqual(pin(R+'/'+p.file),{...p,file:R+'/'+p.file});read(actual204);read(publicPin);
const report={kind:'independent-immutable-preTax-HTTP-compatibility-and-negative-tests',manifest:manifestPin,facts:factsPin,actual204,publicHTTP:publicPin,preparationResponse:pub.originals.responseBody,actual204Status:200,actual204ProjectId:old.preparation.projectId,sourceUnits:old.preparation.sourceRows.filter(r=>['direct-cost','allocation-share'].includes(r.rowKind)).map(r=>f.sourceUnit206(r.sourceRef)).sort(),serverCASCopied:true,costDecisionsEmpty:true,independentNegativeCases:negatives.map(([name])=>name),calendarNegatives:6,calendarBoundaryNote:'The actual204 GET records today/current/prior ISO week; prior-start/end here are the deterministic ISO dates for that recorded W45, not a new database/time observation.',limits:{SQL:0,HTTP:0,contextCreated:false,liveStateRead:false,actualPeriodPOST:false,postTaxFreshPreparation:false,effectAdmission:false,productG3:false,productG4:false}};
fs.writeFileSync(OUT+'/probe123.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'passed',negativeCases:negatives.length+6,output:pin(OUT+'/probe123.json')}));
