// Independent code-only verification. Never invokes either actual CLI entry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const own=path.dirname(fileURLToPath(import.meta.url));
const candidate='E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/holder-aux358-code01';
const source=candidate+'/proposed/tools/rust-r4ghi/runtime-recovery121/aux358/dispatch-holder358.mjs';
const test=candidate+'/proposed/tools/rust-r4ghi/runtime-recovery121/aux358/dispatch-holder358.test.mjs';
const policy='E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json';
const expected=[
  [source,37171,'24a8fa73e2289086c83d747c0f97b192fb55003844854c7ff8cfd58de695d70e'],
  [test,31660,'e005a83b64d737ca25079019aaca734ab0d9b395f2da1de6bec2371051dac51c'],
  [candidate+'/manifest-holder-aux358-code01.json',11500,'9465272d65240e15be0eedf0c5172f171a69c814d3d2716466fc05ddbcbee0da'],
  [candidate+'/seal-holder-aux358-code01.json',1803,'b52145649fc6593539ed95116e9f4190e4657e70ee78e7cecd419b79492a8df0'],
  [candidate+'/evidence/interface-schema358.json',18076,'d7babc93e43eba1c8a1f8455a6c767f497542d9ee74cc193aacba9f1af709ae0'],
  [policy,12056,'3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6'],
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const pin=file=>{const bytes=fs.readFileSync(file);return{file,bytes:bytes.length,rawBytesSha256:hash(bytes)};};
const wx=(name,data)=>{const file=path.join(own,name);fs.writeFileSync(file,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});return pin(file);};
for(const [file,bytes,sha] of expected){const p=pin(file);assert.equal(p.bytes,bytes);assert.equal(p.rawBytesSha256,sha);}
assert.equal(process.version,'v24.19.0');
assert.equal(pin(process.execPath).rawBytesSha256,'3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237');
const scratch=path.join(own,'owned-test-scratch');fs.mkdirSync(scratch,{recursive:false});
const commands=[];
for(const [name,args] of [['syntax-source',['--check',source]],['syntax-test',['--check',test]],['candidate-code-only-tests',['--test',test]]]){
  const out=path.join(own,name+'.stdout.log'),err=path.join(own,name+'.stderr.log');
  let outFD=null,errFD=null,result;const began=new Date().toISOString();
  try{outFD=fs.openSync(out,'wx',0o600);errFD=fs.openSync(err,'wx',0o600);result=spawnSync(process.execPath,args,{cwd:'E:/projects/worktrees/poms-r4i-lifecycle/poms',env:{...process.env,NODE_OPTIONS:'',NODE_PATH:'',POMS_AUX358_TEST_TMP:scratch},windowsHide:true,stdio:['ignore',outFD,errFD]});}
  finally{if(outFD!==null)fs.closeSync(outFD);if(errFD!==null)fs.closeSync(errFD);}
  const receipt={name,executable:process.execPath,args,began,ended:new Date().toISOString(),exitCode:result.status,signal:result.signal,processError:result.error?{name:result.error.name,message:result.error.message}:null,stdout:pin(out),stderr:pin(err)};
  commands.push(receipt);wx(name+'.command.json',receipt);
  assert.equal(result.status,0);assert.equal(result.signal,null);assert.equal(result.error,undefined);
}
const tap=fs.readFileSync(commands[2].stdout.file,'utf8');
for(const line of ['# tests 102','# pass 102','# fail 0','# cancelled 0','# skipped 0'])assert(tap.includes(line),line);
assert.equal(fs.readFileSync(commands[2].stderr.file).length,0);
assert.equal(fs.readdirSync(scratch).length,0,'All own test temporary folders cleaned');

// Import has a different argv[1] and therefore cannot run an actual entry.
const api=await import(pathToFileURL(source).href);
const body=JSON.parse(fs.readFileSync(policy,'utf8'));
assert.deepEqual(api.CONTRACT358.G1Policy,{file:body.originalABI.originalG1.file.replace('/g1A/Root-G1A-121.json','/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json'),bytes:12056,rawBytesSha256:expected[5][2]});
assert.deepEqual(api.CONTRACT358.trustedPowerShell,body.immutableHostRules.trustedPowerShell);
assert.deepEqual(api.CONTRACT358.limits,body.limits);
const schema=JSON.parse(fs.readFileSync(candidate+'/evidence/interface-schema358.json','utf8'));
assert.deepEqual(Object.keys(api).sort(),[...schema.pureExports].sort());
const sourceText=fs.readFileSync(source,'utf8');
for(const [constant,definition] of [['ROUND14','currentRound14'],['SUPPORT6','transport358Support6'],['OBSERVATION_KEYS','ownedHolderObservation26']]){
  const match=sourceText.match(new RegExp('const '+constant+' = (\\[[^\\n]+\\]);'));assert(match,constant);
  const keys=JSON.parse(match[1].replaceAll("'",'"'));
  const actualDefinition=schema.schemas.$defs[definition];assert(actualDefinition,definition);
  assert.deepEqual([...keys].sort(),[...actualDefinition.required].sort());
}
const originalA7=[];
for(const original of body.originalABI.originalA7ExecutionSources){const p=pin('E:/'+original.file.slice(7));assert.equal(p.bytes,original.bytes);assert.equal(p.rawBytesSha256,original.rawBytesSha256);originalA7.push(original);}
for(const [file,bytes,sha] of expected){const p=pin(file);assert.equal(p.bytes,bytes);assert.equal(p.rawBytesSha256,sha);}
const report={kind:'independent-transport358-code-only-validation',recordedAt:new Date().toISOString(),candidateSource:pin(source),candidateTest:pin(test),node:pin(process.execPath),commands,summary:{tests:102,pass:102,fail:0,syntaxChecks:2,stablePolicyConstantsMatched:true,schemaClosedKeysAndPureExportsMatched:true,originalSevenRawPinsMatched:true,sourceTestPolicySealAndSchemaUnchangedDuringRun:true},originalA7,testClassification:['pure synthetic metadata validators','own temporary filesystem production-predicate projections','explicit source-tail synthetic ordering model'],limits:{actualMainInvoked:false,WSLPowerShellPGAPIOrNamespaceInvoked:false,RootOrPrivateWritten:false,currentHolderOrHostLivenessCertified:false,actualG2Authorized:false,RootInstallationGranted:false}};
const reportPin=wx('independent-validation358.json',report);console.log(JSON.stringify({report:reportPin,summary:report.summary}));
