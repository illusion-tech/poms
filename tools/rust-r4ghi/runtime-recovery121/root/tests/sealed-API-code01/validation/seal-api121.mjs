// Validation only. Executes syntax/pure tests, never a starter mode or real ctx.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',D=R+'/tools/rust-r4ghi/runtime-recovery121/root';
const NODE='/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const sha=b=>createHash('sha256').update(b).digest('hex');
function pin(file){const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);assert.equal(fs.realpathSync(file),file);const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};}
function checked(file,hash){const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;}
function json(p){assert.deepEqual(pin(p.file),p);return JSON.parse(fs.readFileSync(p.file));}
assert.equal(process.platform,'linux');assert.equal(process.getuid(),1000);assert.equal(process.cwd(),R);assert.equal(process.execPath,NODE);assert.equal(process.version,'v24.19.0');assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
assert.equal(sha(fs.readFileSync(NODE)),'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
assert.deepEqual(process.argv.slice(2,3),['--label']);assert.equal(process.argv.length,4);const label=process.argv[3];assert(/^API-code[0-9]{2}$/.test(label));
const O=D+'/tests/sealed-'+label;assert(!fs.existsSync(O));fs.mkdirSync(O,{mode:0o700});
const write=(name,value)=>{const f=O+'/'+name;fs.writeFileSync(f,Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});return pin(f);};
const baseline=checked(R+'/tools/rust-r4ghi/runtime-recovery121/g1B-API-append02/Root-G1B-API-append02.json','ac9cb66a6501f6e42f26ffe5470f49726dda2b37709e375bd8e043ae13430aad');
const b=json(baseline);assert.equal(b.codeImplementationGranted,true);assert.equal(b.actualG2Authorized,false);assert.equal(b.currentKeys.length,12);
const files=[...b.protectedA7ExecutionSources.map(p=>p.file),D+'/start-api121.mjs'];assert.equal(new Set(files).size,8);
for(const p of b.protectedA7ExecutionSources)assert.deepEqual(pin(p.file),p);
const validationFiles=[D+'/tests/api121.test.mjs',D+'/tests/seal-api121.mjs'];
const before=[...files,...validationFiles].map(pin);write('source-bookend-before.json',before);
const commands=[];let number=0;
function command(argv){
  number++;const stdout=O+'/command-'+number+'-stdout.log',stderr=O+'/command-'+number+'-stderr.log',out=fs.openSync(stdout,'wx'),err=fs.openSync(stderr,'wx'),began=new Date().toISOString();let r;const start=performance.now();
  try{r=spawnSync(NODE,argv,{cwd:R,env:{...process.env},stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
  const record={executable:NODE,argv,began,ended:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,exitCode:r.status,signal:r.signal,processError:r.error?{name:r.error.name,code:r.error.code??null}:null,stdout:pin(stdout),stderr:pin(stderr)};
  commands.push(write('command-'+number+'.json',record));assert.equal(r.status,0,'Isolated validation command failed; preserve logs');assert.equal(r.signal,null);assert.equal(r.error,undefined);assert.deepEqual([...files,...validationFiles].map(pin),before,'Source changed during validation');return record;
}
try{
  for(const file of [D+'/start-api121.mjs',...validationFiles])command(['--check',file]);
  const unit=command(['--test','--test-reporter=tap',D+'/tests/api121.test.mjs']);
  const text=fs.readFileSync(unit.stdout.file,'utf8'),count=name=>{const match=text.match(new RegExp('^# '+name+' ([0-9]+)$','m'));assert(match,name+' count missing');return Number(match[1]);};
  const counts=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(k=>[k,count(k)]));assert.equal(counts.tests,counts.pass);assert(counts.pass>=55);for(const k of ['fail','cancelled','skipped','todo'])assert.equal(counts[k],0);
  const req=createRequire(R+'/package.json'),ts=req('typescript'),compiler=req.resolve('typescript'),nodePackage=req.resolve('@types/node/package.json');
  const options={allowJs:true,checkJs:true,noEmit:true,target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,skipLibCheck:true,types:['node'],typeRoots:[path.dirname(path.dirname(nodePackage))]};
  const program=ts.createProgram([D+'/start-api121.mjs'],options),diagnostics=ts.getPreEmitDiagnostics(program).map(d=>({code:d.code,category:ts.DiagnosticCategory[d.category],file:d.file?.fileName??null,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
  const finite=new Set([2304,2552,2300,2451,2448,2454,1117]);const relevant=diagnostics.filter(d=>d.file===D+'/start-api121.mjs'&&finite.has(d.code));
  const staticRecord=write('finite-static-diagnostics.json',{typescript:ts.version,source:D+'/start-api121.mjs',finiteClassCodes:[...finite],finiteFindings:relevant,allDiagnostics:diagnostics,fullTypecheckClaimed:false});
  assert.equal(relevant.length,0,'Unbound/declaration/property diagnostic; preserve compiler evidence');
  fs.mkdirSync(O+'/sources');const production=[];
  for(const file of files.sort()){const original=pin(file),candidate=O+'/sources/'+path.posix.basename(file);fs.writeFileSync(candidate,fs.readFileSync(file),{flag:'wx'});const copy=checked(candidate,original.rawBytesSha256);assert.equal(copy.bytes,original.bytes);production.push({file:file.slice(R.length+1),operation:'ADD',beforeSHA256:null,afterSHA256:original.rawBytesSha256,candidate:copy});}
  fs.mkdirSync(O+'/validation');const validation=[];for(const file of validationFiles){const original=pin(file),copy=O+'/validation/'+path.posix.basename(file);fs.writeFileSync(copy,fs.readFileSync(file),{flag:'wx'});validation.push({original,candidate:checked(copy,original.rawBytesSha256)});}
  const after=[...files,...validationFiles].map(pin).sort((a,b)=>a.file.localeCompare(b.file));assert.deepEqual(after,[...before].sort((a,b)=>a.file.localeCompare(b.file)));write('source-bookend-after.json',after);
  const dependency=file=>{const real=fs.realpathSync(file),bytes=fs.readFileSync(real);return{file:real,bytes:bytes.length,rawBytesSha256:sha(bytes)};};
  const manifest=write('manifest-Root8-API-code121.json',{kind:'Root-runtime121-API-code-candidate',recordedAt:new Date().toISOString(),technicalG1:baseline,production,validation,executionSources:files.map(pin),protectedA7CodeReview:b.protectedA7CodeReview,
    validationDependencies:[dependency(compiler),dependency(nodePackage)],commands,checks:{syntaxCommands:3,isolatedUnits:counts,finiteStatic:staticRecord,finiteStaticFindings:0,allOtherDiagnostics:diagnostics.length,fullTypecheckClaimed:false},
    scope:{Root8RelativeOriginalBaseADD:8,newStarterProductionADD:1,A7Changes:0,validationEntries:2,H3Planned229:true,externalPlanned55:true,actualCombinedGraph:null},
    modelBoundary:'Pure parser/readiness/environment/time predicates and isolated tempFS; private FS projection is explicitly not real namespace authority. No actual API start/ctx/native/SQL/HTTP.',
    authorCandidateForIndependentCodeReview:true,independentlyReviewed:false,RootPromotionGranted:false,codeReady:false,actualG2Authorized:false,APIStarted:false,nativeAuthorityGranted:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({manifest,isolatedPass:counts.pass,syntaxCommands:3,finiteStaticFindings:0,APIStarted:false}));
}catch(error){write('partial-validation.json',{kind:'Root-API-code-validation-failed-preserve',commands,error:{name:error.name,message:error.message},actualEffects:false});throw error;}
