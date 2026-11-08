import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{spawnSync}from'node:child_process';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',D=R+'/tools/rust-r4ghi/helper-fixture231',OUT=R+'/tools/rust-r4ghi/independent/review05/helper-fixture-review129',BUS=R+'/tools/rust-r4ghi/business',sha=b=>createHash('sha256').update(b).digest('hex');
const pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};};
const manifestPin=pin(D+'/manifest231.json');assert.equal(manifestPin.rawBytesSha256,'803166aa0ae9a7dd409f047b3a69ad0961f0dad13b394dec000ba7bf9e096daa');const manifest=JSON.parse(fs.readFileSync(manifestPin.file));
const before=fs.readdirSync(BUS).filter(n=>/\.(mjs|json)$/.test(n)).sort().map(n=>({file:'tools/rust-r4ghi/business/'+n,sha256:sha(fs.readFileSync(BUS+'/'+n))}));assert.equal(before.length,198);
for(const p of manifest.products){assert.equal(sha(fs.readFileSync(R+'/'+p.file)),p.beforeSHA256);assert.equal(sha(fs.readFileSync(D+'/'+p.candidate)),p.afterSHA256);}
fs.mkdirSync(OUT+'/assembly/business',{recursive:true});fs.mkdirSync(OUT+'/test-tmp',{recursive:true});
const assembled=[];for(const p of before){const target=manifest.products.find(t=>t.file===p.file),content=fs.readFileSync(target?D+'/'+target.candidate:R+'/'+p.file);fs.writeFileSync(OUT+'/assembly/business/'+path.basename(p.file),content,{flag:'wx'});assembled.push({file:p.file,sha256:sha(content)});}
assert.equal(assembled.filter((p,i)=>p.sha256!==before[i].sha256).length,2);
const previous='/home/wangzishi/.local/share/poms-r4ghi/private/source13-H1-helper227/receipt227.json',old=JSON.parse(fs.readFileSync(previous));assert.equal(sha(fs.readFileSync(previous)),'907dce9e2cf7a29728d5e310cf4233461dead50d77f8270c9c95b538c03b80fa');
const testFiles=old.argv.filter(s=>s.endsWith('.test.mjs'));assert.equal(testFiles.length,26);
const argv=['--import',OUT+'/shadow-loader129.mjs','--test','--test-reporter=tap',...testFiles],start=new Date().toISOString();
const result=spawnSync(process.execPath,argv,{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,TMPDIR:OUT+'/test-tmp'}});
fs.writeFileSync(OUT+'/stdout129.tap',result.stdout??'',{flag:'wx'});fs.writeFileSync(OUT+'/stderr129.log',result.stderr??'',{flag:'wx'});
const current=fs.readdirSync(BUS).filter(n=>/\.(mjs|json)$/.test(n)).sort().map(n=>({file:'tools/rust-r4ghi/business/'+n,sha256:sha(fs.readFileSync(BUS+'/'+n))}));assert.deepEqual(current,before);
fs.writeFileSync(OUT+'/assembly129.json',JSON.stringify(assembled,null,2)+'\n',{flag:'wx'});
const number=key=>Number(result.stdout.match(new RegExp('^# '+key+' (\\d+)$','m'))?.[1]??-1);
const report={kind:'independent-candidate-shadow-full-helper-suite-not-a-Root-repository-pass',manifest:manifestPin,assembly:pin(OUT+'/assembly129.json'),sourceRootGraphUnchanged:true,helperCount:198,changedLeaves:manifest.products,loader:pin(OUT+'/shadow-loader129.mjs'),node:process.execPath,nodeVersion:process.version,argv,startedAt:start,finishedAt:new Date().toISOString(),exitCode:result.status,signal:result.signal,tests:number('tests'),pass:number('pass'),fail:number('fail'),skipped:number('skipped'),stdout:pin(OUT+'/stdout129.tap'),stderr:pin(OUT+'/stderr129.log'),limits:{RootFilesWritten:false,realPrivateStateWritten:false,SQL:0,HTTP:0,contextCreated:false,liveStateRead:false,actualRootRepository211Pass:false,current119Modified:false,G3:false,G4:false}};
fs.writeFileSync(OUT+'/receipt129.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({exitCode:result.status,tests:report.tests,pass:report.pass,fail:report.fail,receipt:pin(OUT+'/receipt129.json')}));process.exitCode=result.status??1;
