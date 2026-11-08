// New119 plan after a fully recorded withdrawal, real211 pass and fresh pair.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01';
const sha=v=>createHash('sha256').update(v).digest('hex');assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(!fs.existsSync(D+'/driver.lock'));
const pin=(file,expected)=>{const rawBytesSha256=sha(fs.readFileSync(file));if(expected)assert.equal(rawBytesSha256,expected);return{file,rawBytesSha256};};const json=p=>{pin(p.file,p.rawBytesSha256);return JSON.parse(fs.readFileSync(p.file));};
const oldPlanPin=pin(D+'/tool119-tax225/plan119-225.json','c0a11f8980817e17f244601769d01a44848b02d98a6b9915c58c62472bdd0cee'),old=json(oldPlanPin);
const withdrawalPin=pin(D+'/tool119-withdraw232/withdrawal232.json','efa024c6bc27cde5bb1686b2a25091e3556696f6a8b901ebdf905fd2cff8214f'),withdrawal=json(withdrawalPin);
const fixturePin=pin(D+'/helper-fixture234/receipt234.json','afc3bcbac5e13c171fe0c97414e3fe91f72b0e739361535322f92ee53042705d'),fixture=json(fixturePin);
const regressionPin=pin(P+'/source13-H1-helper235/receipt235.json','b2504a43ef271b0706c7f10e8c066fe97bef4dd200406aeb1a2e0ba51e8172b5'),regression=json(regressionPin);assert.deepEqual([regression.exitCode,regression.tests,regression.pass,regression.fail],[0,211,211,0]);
const freshPin=pin(D+'/tool119-refresh236/receipt236.json'),fresh=json(freshPin);assert.equal(fresh.kind,'actual-state-free-fresh-pair-after-withdrawal236');assert.deepEqual(fresh.withdrawal,withdrawalPin);
assert.equal(pin(D+'/state.json').rawBytesSha256,fresh.entryState.rawBytesSha256);const state=json(fresh.entryState);assert(!state.toolAdmission119);assert.equal(state.sequence,38);assert.equal(state.toolAdmissionHistory119.at(-1).registry.rawBytesSha256,'684acb155e2469e420ef27e2d9c633d501e647d81825d7395c162277d951d27e');
const review=pin(R+'/tools/rust-r4ghi/independent/review05/helper-fixture-review129/review129.json','60f8334ce3c2efa3ae67062ede2549f2aae1ff16130ceab1fdf9991b1270325f');
const manifest=pin(R+'/tools/rust-r4ghi/helper-fixture231/manifest231.json','803166aa0ae9a7dd409f047b3a69ad0961f0dad13b394dec000ba7bf9e096daa');
const plan={...old,entryState:fresh.entryState,beforeSnapshot:fresh.beforeSnapshot,afterSnapshot:fresh.afterSnapshot,H1:fixture.actualH1,deltaManifests:[...old.deltaManifests,{manifest,review}],independentReview:review};
assert.equal(plan.H1.rawBytesSha256,'51b303a3fccbae5e7fd7b0cc6a042da5bfd12f43c4a7507dfb6479e1d0be579c');assert.deepEqual(json(plan.H1),fs.readdirSync(R+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n)).sort().map(n=>({file:'tools/rust-r4ghi/business/'+n,sha256:pin(R+'/tools/rust-r4ghi/business/'+n).rawBytesSha256})));
for(const p of json(plan.sourcePins))assert.equal(pin(R+'/'+p.file).rawBytesSha256,p.sha256);
const out=D+'/tool119-republish237';fs.mkdirSync(out,{mode:0o700});const file=out+'/plan119-237.json';fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});const planPin=pin(file);
const report={kind:'Root-frozen-counter-preserving-tool119-republication237',G2Authorized:true,oldPlan:oldPlanPin,oldPublication:withdrawal.oldPublication,oldB2:withdrawal.oldB2,withdrawal:withdrawalPin,fixtureUpgrade:fixturePin,actualRepoRegression:regressionPin,actualFresh:freshPin,newPlan:planPin,newH1:plan.H1,deltaManifestCount:plan.deltaManifests.length,
 officialNewDelivered:0,source416AndAPI136M98Unchanged:true,counterBeforeNewPublication:38,new119ActuallyPublished:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(R+'/docs/design/rust-r4ghi/tool119-republish-g2-freeze237.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});fs.writeFileSync(out+'/preparation237.json',JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({newPlan:planPin,newH1:plan.H1,deltaManifests:plan.deltaManifests.length,repo211Passed:true,stateChanged:false,new119Published:false}));
