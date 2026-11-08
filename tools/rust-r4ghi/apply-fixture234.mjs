// Exact test-input delta after the separately acknowledged metadata withdrawal.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01',O=D+'/helper-fixture234';
const sha=v=>createHash('sha256').update(v).digest('hex');assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert.deepEqual(process.argv.slice(2),['--execute']);assert(!fs.existsSync(O));
const read=file=>{const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);assert.equal(fs.realpathSync(file),path.resolve(file));return fs.readFileSync(file);};
const pin=(file,expected)=>{const rawBytesSha256=sha(read(file));if(expected)assert.equal(rawBytesSha256,expected);return{file,rawBytesSha256};};const json=p=>{pin(p.file,p.rawBytesSha256);return JSON.parse(read(p.file));};
const write=(file,value)=>{const raw=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});return pin(file);};
const nonce=randomUUID(),lock=D+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,nonce,mode:'exact-two-fixture-input-upgrade234'})+'\n',{flag:'wx',mode:0o600});const applied=[];
try{
 const withdrawalPin=pin(D+'/tool119-withdraw232/withdrawal232.json'),withdrawal=json(withdrawalPin);assert.equal(withdrawal.kind,'actual-counter-preserving-unconsumed-tool119-metadata-withdrawal232');assert.equal(withdrawal.counterRetained,38);
 const stateRaw=read(D+'/state.json');assert.equal(sha(stateRaw),withdrawal.actualNewEntry.rawBytesSha256);const state=JSON.parse(stateRaw);assert(!state.toolAdmission119);assert.equal(state.sequence,38);assert.equal(state.toolAdmissionHistory119.at(-1).registry.rawBytesSha256,'684acb155e2469e420ef27e2d9c633d501e647d81825d7395c162277d951d27e');
 const oldH1Pin=pin(D+'/tool119-tax225/H1-actual225.json','092483fc8fa018d425d765889f4389d8c136ec28aa8463acf92e8e5369781343'),oldH1=json(oldH1Pin);
 const graph=()=>fs.readdirSync(R+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n)).sort().map(n=>({file:'tools/rust-r4ghi/business/'+n,sha256:sha(read(R+'/tools/rust-r4ghi/business/'+n))}));assert.deepEqual(graph(),oldH1);
 const manifestPin=pin(R+'/tools/rust-r4ghi/helper-fixture231/manifest231.json','803166aa0ae9a7dd409f047b3a69ad0961f0dad13b394dec000ba7bf9e096daa'),manifest=json(manifestPin);
 const review=pin(R+'/tools/rust-r4ghi/independent/review05/helper-fixture-review129/review129.json','60f8334ce3c2efa3ae67062ede2549f2aae1ff16130ceab1fdf9991b1270325f');json(review);
 assert.deepEqual(manifest.products.map(p=>p.file).sort(),['tools/rust-r4ghi/business/schema-comparison108.test.mjs','tools/rust-r4ghi/business/tax13.test.mjs']);
 for(const p of manifest.products){pin(R+'/'+p.file,p.beforeSHA256);pin(path.dirname(manifestPin.file)+'/'+p.candidate,p.afterSHA256);}
 const sourcePin=pin(P+'/source13-preparation193/sourcePins.json','e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c'),sources=json(sourcePin);for(const p of sources)pin(R+'/'+p.file,p.sha256);
 fs.mkdirSync(O,{mode:0o700});const expected=oldH1.map(p=>{const change=manifest.products.find(x=>x.file===p.file);return change?{...p,sha256:change.afterSHA256}:p;});
 for(const p of manifest.products){fs.writeFileSync(R+'/'+p.file,read(path.dirname(manifestPin.file)+'/'+p.candidate));pin(R+'/'+p.file,p.afterSHA256);applied.push(p);}
 assert.deepEqual(graph(),expected);assert.equal(expected.length,198);for(const p of sources)pin(R+'/'+p.file,p.sha256);assert.deepEqual(read(D+'/state.json'),stateRaw);
 const H1=write(O+'/H1-actual234.json',Buffer.from(JSON.stringify(expected,null,2)+'\n'));
 const receipt=write(O+'/receipt234.json',{kind:'actual-reviewed-two-test-fixture-upgrade234-before-new119',withdrawal:withdrawalPin,fixtureManifest:manifestPin,independentReview:review,previousH1:oldH1Pin,actualH1:H1,helperCount:198,applied,
  source416Unchanged:true,runtimeHelperCodeUnchanged:true,currentStateAndCounterUnchanged:true,new119Published:false,original227And119Preserved:true,SQLOrHTTP:false,G3Certified:false,G4Certified:false});
 console.log(JSON.stringify({receipt,actualH1:H1,helperCount:198,source416AndRuntimeAndStateUnchanged:true,new119Published:false}));
}catch(error){fs.mkdirSync(O,{recursive:true,mode:0o700});const partial=write(O+'/partial234.json',{name:error.name,message:error.message,stack:error.stack,applied,noAutomaticRollbackOrRetry:true});console.error(JSON.stringify({completed:false,partial,noBlindRetry:true}));process.exitCode=1;}
finally{const owner=JSON.parse(read(lock));assert.equal(owner.pid,process.pid);assert.equal(owner.nonce,nonce);fs.unlinkSync(lock);}
