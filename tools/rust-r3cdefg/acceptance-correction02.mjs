// Root sequential actual reacceptance after the isolated C error-wire correction.
import fs from'node:fs';import assert from'node:assert/strict';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r3cdefg');const tag=process.argv[2];assert(/^[a-z0-9-]+$/.test(tag));
const out='tmp/rust-r3cdefg/current-reacceptance-'+tag;assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const commands=[],sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)}};
function run(name,args){const log=out+'/'+name+'.log',fd=fs.openSync(log,'wx'),startedAt=new Date().toISOString();let r;try{r=spawnSync(process.execPath,['tools/rust-r3cdefg/'+name+'.mjs',...args],{env:process.env,stdio:['ignore',fd,fd],timeout:300000})}finally{fs.closeSync(fd)}commands.push({name,args,startedAt,completedAt:new Date().toISOString(),exitCode:r.status,signal:r.signal,errorName:r.error?.name??null,log:pin(log)});console.log(JSON.stringify({name,args,exitCode:r.status}));assert.equal(r.status,0,name+' failed; original log retained');}
let completed=false,error=null;try{
 for(const name of['semantics01','semantics-extra02','coverage'])run(name,['rust',tag]);
 for(const[name,attempt]of[['edge-run','01'],['boundaries','05'],['business-run','01'],['temporal','01'],['raw-errors','01'],['routing-probe','01'],['consume-targets','01'],['observe-actual','02']])run(name,['rust',tag,attempt]);
 for(const[kind,attempt]of[['edges','01'],['business','01'],['boundaries','05']])run('extract-additional-sql',[kind,tag,'rust',attempt]);
 run('compare-coverage',['parity01','07',tag]);
 for(const[kind,attempt]of[['edges','01'],['business','01'],['boundaries','05'],['temporal','01']])run('compare-events',[kind,'parity01',tag,attempt,'01']);
 run('compare-raw-errors',['raw-errors01',tag,'01','02','pass']);
 for(const file of[`tmp/rust-r3cdefg/coverage-compare-parity01-07.json`,...['edges','business','boundaries','temporal'].map(k=>`tmp/rust-r3cdefg/${k}-compare-parity01-${tag}-01.json`)])assert.equal(JSON.parse(fs.readFileSync(file)).differenceCount,0,file);
 completed=true;
}catch(e){error={name:e.name,message:e.message};process.exitCode=1;}
fs.writeFileSync(out+'/report01.json',JSON.stringify({kind:'R3CDEFG-Root-current-correction-reacceptance',createdAt:new Date().toISOString(),tag,completed,error,commands,source:pin('tools/rust-r3cdefg/acceptance-correction02.mjs'),oldUI:'898 original HTTP remain bound to ec988ff artifact; not rerun or relabelled',G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({tag,completed,error,commands:commands.length,report:out+'/report01.json'}));
