// Isolated code/real temporary-FS tests, never an actual application invocation.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { spawnSync } from 'node:child_process';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', D=R+'/tools/rust-r4ghi/tax15-invocation118';
const edition=process.argv[2]; assert(/^[a-z0-9-]+$/.test(edition)); const O=D+'/tests/evidence/'+edition; assert(!fs.existsSync(O));
const sha=b=>createHash('sha256').update(b).digest('hex'), names=fs.readdirSync(D).filter(n=>n.endsWith('.mjs')).sort(); assert.equal(names.length,8);
const tests=['root-union15.test.mjs','capability15.test.mjs','journal15.test.mjs','entry-failure02.test.mjs','run-code02-checks.mjs'];
const pins=files=>files.map(file=>({file,rawBytesSha256:sha(fs.readFileSync(file))})); const sourcePins=pins(names.map(n=>D+'/'+n)),testPins=pins(tests.map(n=>D+'/tests/'+n));
fs.mkdirSync(O,{recursive:true}); const env={...process.env}; delete env.NODE_OPTIONS;delete env.NODE_PATH;const results=[];
function run(name,args){const stdout=O+'/'+name+'-stdout.log',stderr=O+'/'+name+'-stderr.log',out=fs.openSync(stdout,'wx'),err=fs.openSync(stderr,'wx');let r;
  fs.writeFileSync(O+'/'+name+'-dispatch.json',JSON.stringify({argv:[process.execPath,...args],cwd:R,actualContext:false,DBHTTP:false})+'\n',{flag:'wx'});
  try{r=spawnSync(process.execPath,args,{cwd:R,env,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
  const result={name,args,exitCode:r.status,signal:r.signal,stdout:{file:stdout,rawBytesSha256:sha(fs.readFileSync(stdout))},stderr:{file:stderr,rawBytesSha256:sha(fs.readFileSync(stderr))}};results.push(result);
  fs.writeFileSync(O+'/'+name+'-result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});return r.status===0;}
let ok=true;for(const name of names)if(!run('syntax-'+name,['--check',D+'/'+name])){ok=false;break;}
if(ok)ok=run('help',[D+'/run-tax15-once.mjs','--help']);
if(ok)ok=run('unit',['--test',...tests.filter(n=>n.endsWith('.test.mjs')).map(n=>D+'/tests/'+n)]);
for(const p of [...sourcePins,...testPins])assert.equal(sha(fs.readFileSync(p.file)),p.rawBytesSha256);
const value={kind:'author-corrective-Tax15-code02-isolated-checks',sourcePins,testPins,results,allPassed:ok,expectedUniqueTests:70,sourceStable:true,
  modelNativeAndLoaderDoublesOnly:true,actualContext:false,DBHTTP:false,actualInvocation:false,G3:false,G4:false};
fs.writeFileSync(O+'/checks.json',JSON.stringify(value,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({allPassed:ok,commands:results.length,expectedUniqueTests:70,checks:O+'/checks.json'}));if(!ok)process.exitCode=1;
