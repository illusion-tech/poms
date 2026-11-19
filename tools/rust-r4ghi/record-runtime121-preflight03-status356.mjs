// Preserve a stopped metadata preflight and its as-of source facts. No runtime effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private';
assert.equal(process.cwd().replaceAll('\\','/'),R);
const sha=b=>createHash('sha256').update(b).digest('hex');
const local=f=>f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f;
const measure=file=>{const b=fs.readFileSync(local(file));return{file,bytes:b.length,rawBytesSha256:sha(b)};};
const read=p=>{const b=fs.readFileSync(local(p.file));assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256);return b;};
const previous=JSON.parse(fs.readFileSync(R+'/docs/design/rust-r4ghi/continuation-status355.json'));
for(const p of Object.values(previous.unchangedBookends))read(p);
const sourceComplete=measure(P+'/runtime121-native05-source-promotion/fc2b594f-e5a6-45af-b7bb-b9542c652cef/complete.json');
assert.equal(sourceComplete.rawBytesSha256,'2d20bbc2aa3487c6d3287cf5db533a6651f4740c7e8f6fcb0d75173cfa3b1269');
const actual=JSON.parse(read(sourceComplete));
const compositionComplete=measure(P+'/runtime121-compositions05/1d834981-6944-4c90-bba7-07f3d2d010df/complete.json');
assert.equal(compositionComplete.rawBytesSha256,'af8b8dd1677a3ed1760c2d3c3d5e9912fd64d2cc218177a7c5b8b21080bf4b49');
const preflight=R+'/tmp/rust-r4ghi/root/API121-preflight03';
const command=JSON.parse(fs.readFileSync(preflight+'/command-receipt.json'));assert.equal(command.exitCode,1);
const failure=JSON.parse(fs.readFileSync(preflight+'/stderr-original.log','utf8'));assert.equal(failure.kind,'actual-API-metadata-preflight-stopped');
assert.equal(failure.frames[0].function,'originalCode15_121');assert.equal(failure.frames[0].line,219);
const requestDir=P+'/runtime121-B-inputs/api-start/05447d43-a057-474b-bfb3-f47db807f764';
for(const f of [requestDir+'/request-exact-G2.json',requestDir+'/Root-review.json',P+'/rust-api121-process.json',P+'/rust-api121.env'])assert(!fs.existsSync(local(f)));
const O=R+'/tools/rust-r4ghi/runtime-recovery121/API-preflight03-actual';assert(!fs.existsSync(O));fs.mkdirSync(O);
const copied=[];
function copy(file,name){const p=measure(file),b=read(p),to=O+'/'+name;fs.writeFileSync(to,b,{flag:'wx'});assert(fs.readFileSync(to).equals(b));copied.push({original:p,copy:path.relative(R,to).replaceAll('\\','/')});}
for(const n of ['command-receipt.json','stdout-original.log','stderr-original.log'])copy(preflight+'/'+n,n);
for(const n of ['command-receipt.json','stdout-original.log','stderr-original.log'])copy(R+'/tmp/rust-r4ghi/root/API-input03-metadata01/'+n,'input-'+n);
for(const [dir,prefix] of [['independent-API-input03-121-review01','input-source-'],['independent-actual-composition05-121-review01','composition-']]){
  const src='E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/'+dir;
  for(const name of fs.readdirSync(src)){assert(fs.lstatSync(src+'/'+name).isFile());copy(src+'/'+name,prefix+name);}
}
const status={kind:'R4-runtime121-actual-source-metadata-preflight-stopped-status356',recordedAt:new Date().toISOString(),previousStatus:'rust-r4ghi/continuation-status355.json',issue121:{state:'OPEN',currentDependencyReady:false},actualA:previous.actualA,
  code:{Root8:'577ef5922ecfe58420b121fab19c0069938c497170e2ad11fd783e496110d8b1',I05:'86b676a2cb25325137b9229d6d2c0cfad6261cc5b96ec1bd88b5a2429c00199e',H03:previous.code.H03,sourceCommit:'fb6e6630a9b109cb9804643a62320447bb764228',stagedSource41RawVerified:true,wholeNamespacePositive:false},
  actualSource:{sourceComplete,helper229:actual.helperPins,external55:actual.externalPins,execution284:actual.executionSources,independentActualReadback:'db3574f7fb5bf36fbbbda4c0b4310399434907e3be5ce11848c0f57e91bebc7d',compositionComplete,independentCompositionReadback:'24ec0f6c4238a3a97600c3f1f5c901ff1f989c3afa8f5a59923a151d8c1d8204',sourceOriginalsAndFailuresRetained:true},
  current:{...previous.current,actualHelperDirectoryCount:229,actualCurrent229Graph:actual.helperPins,actualCurrent55External:actual.externalPins,sourcePromotionExecuted:true},
  stoppedPreflight:{input:measure(requestDir+'/input.json'),command:measure(preflight+'/command-receipt.json'),stderr:measure(preflight+'/stderr-original.log'),exitCode:1,firstFailure:{function:'originalCode15_121',line:219,comparison:'original Reg5 versus registryBody15 reconstruction',identifiedMissingFact:'already-verified original15 apiRecord was omitted from facts'},requestCreated:false,RootReviewSigned:false,APIStarted:false,automaticRetry:false,correctionPending:'single facts.apiRecord connection; code06 not yet promoted'},
  unchangedBookends:previous.unchangedBookends,retained:previous.retained,official:previous.official,businessG3:false,businessG4:false,parent57:'OPEN',fullR5_116:'OPEN',technical119HistoricalG4:'CLOSED',
  next:['Bounded original15 apiRecord reconstruction correction and nonauthor code review','New concrete one-Native source update, fresh graphs/composition/input and metadata preflight','Separate exact API-start G2 and actual process/readiness readback','FS admission/Ctor/fresh full prepare121 followed by original batch acceptance']};
const target=R+'/docs/design/rust-r4ghi/continuation-status356.json';fs.writeFileSync(target,JSON.stringify(status,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(O+'/copy-receipt.json',JSON.stringify({kind:'Root-preflight03-failure-and-metadata-review-retention',copied,status:measure(target),oldInputsUnmodified:true,APIStarted:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:measure(target),copies:copied.length,APIStarted:false}));
