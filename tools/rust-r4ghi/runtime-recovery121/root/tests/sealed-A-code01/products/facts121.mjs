// Frozen G1-A facts/validation. Importing this module performs no task effect.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const C = Object.freeze({
  root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', winRoot: 'E:/projects/worktrees/poms-r3hijk-next28/poms',
  mirror: '/home/wangzishi/projects/poms-rust-r4ghi', private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  namespace: 'poms-r4ghi', marker: '0ca66699-053b-4f40-ad5c-82fed4cf1a6f', base: 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee',
  container: '513925616f4e1c1c988753e385be7f441dc98f6fb490101537498f60e8d5e00f',
  image: 'b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a',
  volume: 'poms-r4ghi-pg15-data', volumeRoot: '/home/wangzishi/.local/share/containers/storage/volumes/poms-r4ghi-pg15-data/_data',
  databases: ['poms_r4ghi_native', 'poms_r4ghi_rust'], oids: ['16385', '16387'],
  node: '/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',
  nodeSHA: 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12',
  nodeWin: 'C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',
  nodeWinSHA: '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237',
  pwsh: 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1104-2876-0_26.1104.2876.0_x64__3k8sg7r9htsxt/dependencies/native/powershell/pwsh.exe',
  pwshSHA: '2a6769a3330dc1084d0154bfde7d164ab750ca7f700f313f9d417c1be78b2233',
  G1: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/g1A/Root-G1A-121.json',
  G1SHA: 'c20283d9a4e30d96f23d7f3890882e58a6f22e394fa9c747baa4c3a07968a68b',
  loss: '/home/wangzishi/.local/share/poms-r4ghi/private/runtime-loss353-observation01/observation.json',
  lossSHA: '80151bd29512f869a4aee63fd5e0d020f3bc3a2c0d136a983d4452d81a1ef698',
  retention: '/home/wangzishi/.local/share/poms-r4ghi/private/failed15-retained353-01/retained-failed15-mapping.json',
  retentionSHA: '10ff9393ddaf17815cb92037950cc9d91ab193b8908319b15842d77d32ea8ac0',
  baseline: '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business15/main01/snapshot-000021-tax15-prepared-current-facts.json',
  baselineSHA: '183bb7b076940ddb33b2edf9d2dcf82b63d2f1e580b5cbebc8d6ec48a023db8c',
});
export const names = Object.freeze(['hold-runtime121.mjs', 'start-holder121.ps1', 'resume-original-pg121.mjs', 'observe-conservation121.mjs', 'prepare121.mjs', 'dispatch121.mjs', 'facts121.mjs']);
export const folder = C.root + '/tools/rust-r4ghi/runtime-recovery121/root';
export const modes = Object.freeze(['holder-start', 'pg-start', 'pg-observe']);
export const inputKeys = Object.freeze(['kind','schemaVersion','mode','namespace','nonce','G1','codeReview','executionSources','expectedStates','runtimeLossObservation','failedRetention','holder','pgStart','baseline','outputDirectory']);
export const stateFiles = Object.freeze({state13:C.private+'/business/g2-business13/main01/state.json',state14:C.private+'/business/g2-business14/main01/state.json',state15:C.private+'/business/g2-business15/main01/state.json',ownership15:C.private+'/business/g2-business15/main01/ownership.jsonl'});
export const stateSHAs = Object.freeze({state13:'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4',state14:'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97',state15:'4c354c9190cdae04135ddedd1da7e8652fe5aa6e0aa8f5c74805faef9bc903ea',ownership15:'b76bb9d8345b0364554f05fb0d719f5083278b332ff54303946d9df3f167a918'});
export const sha = b => createHash('sha256').update(b).digest('hex');
export function local(file) {
  if (process.platform !== 'win32') return file;
  if (file.startsWith('/mnt/e/')) return 'E:/' + file.slice(7);
  if (file.startsWith('/home/')) return '//wsl.localhost/Debian' + file;
  return file;
}
export function pinShape(p) {
  assert(p && typeof p === 'object' && !Array.isArray(p));
  assert.deepEqual(Object.keys(p).sort(), (p.bytes === undefined ? ['file','rawBytesSha256'] : ['bytes','file','rawBytesSha256']));
  assert(typeof p.file === 'string' && /^[A-Za-z0-9_./:-]+$/.test(p.file) && p.file.startsWith('/') && path.posix.resolve(p.file) === p.file);
  assert(/^[a-f0-9]{64}$/.test(p.rawBytesSha256));
  if(p.bytes !== undefined) assert(Number.isSafeInteger(p.bytes) && p.bytes >= 0);
  return p;
}
export function read(p) {
  pinShape(p); const file=local(p.file), st=fs.lstatSync(file);
  assert(st.isFile() && !st.isSymbolicLink() && st.nlink===1); assert.equal(fs.realpathSync(file),path.resolve(file));
  const b=fs.readFileSync(file); assert.equal(sha(b),p.rawBytesSha256,p.file); if(p.bytes!==undefined) assert.equal(b.length,p.bytes);
  return b;
}
export function pin(file) { const b=fs.readFileSync(local(file)); const p={file,bytes:b.length,rawBytesSha256:sha(b)};read(p);return p; }
export const json = p => JSON.parse(read(p));
export function samePin(a,b) { pinShape(a);pinShape(b);assert.equal(a.file,b.file);assert.equal(a.rawBytesSha256,b.rawBytesSha256);read(a);read(b); }
export function shape(p) {
  assert(p && typeof p==='object' && !Array.isArray(p));assert.deepEqual(Object.keys(p).sort(),[...inputKeys].sort());
  assert.equal(p.kind,'Root-runtime121-A-operation-input');assert.equal(p.schemaVersion,1);assert(modes.includes(p.mode));assert.equal(p.namespace,C.namespace);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.nonce));
  for(const k of ['G1','codeReview','runtimeLossObservation','failedRetention'])pinShape(p[k]);
  assert.equal(p.G1.file,C.G1);assert.equal(p.G1.rawBytesSha256,C.G1SHA);assert.equal(p.runtimeLossObservation.file,C.loss);assert.equal(p.runtimeLossObservation.rawBytesSha256,C.lossSHA);assert.equal(p.failedRetention.file,C.retention);assert.equal(p.failedRetention.rawBytesSha256,C.retentionSHA);
  assert.equal(p.outputDirectory,C.private+'/runtime121-A/'+p.mode+'/'+p.nonce);
  assert.deepEqual(Object.keys(p.expectedStates).sort(),Object.keys(stateFiles).sort());for(const k of Object.keys(stateFiles)){pinShape(p.expectedStates[k]);assert.equal(p.expectedStates[k].rawBytesSha256,stateSHAs[k]);}
  assert(Array.isArray(p.executionSources)&&p.executionSources.length===7);assert.deepEqual(p.executionSources.map(q=>{pinShape(q);assert.equal(q.file,folder+'/'+path.posix.basename(q.file));return path.posix.basename(q.file)}).sort(),[...names].sort());
  for(const k of ['holder','pgStart','baseline']){const required=p.mode==='pg-observe'||k==='holder'&&p.mode==='pg-start';if(required)pinShape(p[k]);else assert.equal(p[k],null,k);}
  if(p.baseline){assert.equal(p.baseline.file,C.baseline);assert.equal(p.baseline.rawBytesSha256,C.baselineSHA);}
  return p;
}
export function reviewBody(p,input) {return{kind:'Root-approved-exact-runtime121-A',approvedInput:input,G1:p.G1,codeReview:p.codeReview,mode:p.mode,nonce:p.nonce,actualG2Authorized:true,processControl:p.mode!=='pg-observe',readonlyPG:p.mode==='pg-observe',APIStart:false,businessDML:false,createReplaceRestoreMigrate:false};}
export function verifyStates(p) {
  for(const k of Object.keys(stateFiles)){const expected=read(p.expectedStates[k]);assert.deepEqual(fs.readFileSync(local(stateFiles[k])),expected,k);}
  for(const e of [13,14,15])assert(!fs.existsSync(local(C.private+'/business/g2-business'+e+'/main01/driver.lock')));
  const map=json(p.failedRetention);assert.equal(map.originalsUnmodified,true);assert(map.mappings.some(x=>x.original.rawBytesSha256===stateSHAs.state15&&x.privateRetainedCopy.file===p.expectedStates.state15.file));
}
export function verifySources(p) {
  const g=json(p.G1);assert.equal(g.kind,'Root-frozen-runtime-recovery121-G1A');assert.equal(g.actualG2Authorized,false);assert.equal(g.codeImplementationGranted,true);
  const r=json(p.codeReview);assert.equal(r.kind,'non-author-runtime121-A-code-review');assert.equal(r.verdict,'code-ready-for-exact-runtime121-A-input-review');assert.equal(r.reviewerIsAuthor,false);assert.deepEqual(r.executionSources,p.executionSources);
  for(const q of p.executionSources)read(q);json(p.runtimeLossObservation);
}
export function loadCLI(expectedMode,args=process.argv.slice(2)) {
  assert.equal(args.length,9);assert.deepEqual([args[0],args[2],args[4],args[6],args[8]],['--input','--input-sha','--review','--review-sha','--execute']);assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
  assertOperatorHost121();
  const ip=pin(args[1]);assert.equal(ip.rawBytesSha256,args[3]);const rp=pin(args[5]);assert.equal(rp.rawBytesSha256,args[7]);const p=shape(json(ip));if(expectedMode)assert.equal(p.mode,expectedMode);assert.deepEqual(json(rp),reviewBody(p,ip));verifySources(p);verifyStates(p);return{p,input:ip,review:rp};
}
export function assertOperatorHost121() {
  assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
  if(process.platform==='linux'){assert.equal(process.cwd(),C.root);assert.equal(sha(fs.readFileSync(process.execPath)),C.nodeSHA);assert.equal(process.getuid(),1000);}
  else{assert.equal(process.platform,'win32');assert.equal(process.cwd().replaceAll('\\','/'),C.winRoot);assert.equal(sha(fs.readFileSync(process.execPath)),C.nodeWinSHA);}
}
export function directory121(dir,{exclusive=false}={}) {
  assert(dir.startsWith(C.private+'/')&&path.posix.resolve(dir)===dir);const parts=dir.slice(C.private.length+1).split('/');
  let current=C.private;const validate=()=>{const f=local(current),s=fs.lstatSync(f);assert(s.isDirectory()&&!s.isSymbolicLink());assert.equal(fs.realpathSync(f),path.resolve(f));if(process.platform==='linux')assert.equal(s.uid,1000);};validate();
  for(const[at,part]of parts.entries()){assert(/^[A-Za-z0-9_.-]+$/.test(part)&&part!=='.'&&part!=='..');current+='/'+part;const exists=fs.existsSync(local(current));if(exclusive&&at===parts.length-1)assert(!exists,'Existing nonce output forbids retry');if(!exists)fs.mkdirSync(local(current),{mode:0o700});validate();}
  return dir;
}
export function writeWx(dir,name,value) {assert.equal(path.posix.basename(name),name);const f=dir+'/'+name,b=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(local(f),b,{flag:'wx',mode:0o600});return pin(f);}
export function opIntent(inv) {const {p}=inv;const dispatch=json(pin(p.outputDirectory+'/dispatch.json'));samePin(dispatch.input,inv.input);samePin(dispatch.RootReview,inv.review);return writeWx(p.outputDirectory,'intent.json',{kind:'actual-runtime121-A-operation-intent',mode:p.mode,nonce:p.nonce,pid:process.pid,input:inv.input,RootReview:inv.review,APIStart:false,businessDML:false});}
export function procStat(t) {const left=t.indexOf(' ('),right=t.lastIndexOf(') ');assert(left>0&&right>left);const x=t.slice(right+2).trim().split(/\s+/);assert(x.length>=20);return{pid:Number(t.slice(0,left)),startTime:x[19]};}
export function holderFacts(p) {
  const h=json(p.holder);assert.equal(h.kind,'actual-runtime121-A-holder-ready');assert.equal(h.namespace,C.namespace);assert.equal(h.source.file,folder+'/hold-runtime121.mjs');assert.equal(h.node.file,C.node);assert.equal(h.node.rawBytesSha256,C.nodeSHA);read(h.source);read(h.node);
  assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),h.bootId);const st=procStat(fs.readFileSync('/proc/'+h.pid+'/stat','utf8'));assert.equal(st.startTime,h.startTime);assert.equal(fs.realpathSync('/proc/'+h.pid+'/exe'),C.node);assert.equal(fs.realpathSync('/proc/'+h.pid+'/cwd'),C.root);
  const cmd=fs.readFileSync('/proc/'+h.pid+'/cmdline').toString().split('\0').filter(Boolean);assert.deepEqual(cmd,h.argv);assert.equal(cmd[0],C.node);assert.equal(cmd[1],h.source.file);assert.equal(json(h.input).nonce,h.nonce);samePin(json(h.review).approvedInput,h.input);assert.deepEqual(json(h.review),reviewBody(shape(json(h.input)),h.input));
  const holderInput=shape(json(h.input));verifySources(holderInput);assert.equal(holderInput.mode,'holder-start');return h;
}
export function mainGuard(url,main) {if(process.argv[1]&&url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(JSON.stringify({kind:'runtime121-A-stopped',message:e.message,preserveOriginals:true,blindRetryForbidden:true}));process.exitCode=1;});}

mainGuard(import.meta.url,async()=>{if(process.argv[2]==='--validate-holder'){const inv=loadCLI('holder-start',process.argv.slice(3));console.log(JSON.stringify({mode:inv.p.mode,nonce:inv.p.nonce,outputDirectory:local(inv.p.outputDirectory)}));}else if(process.argv[2]==='--help')console.log('Pure facts plus fixed --validate-holder preflight; no runtime authority or context.');else throw Error('No effect entry in facts121');});
