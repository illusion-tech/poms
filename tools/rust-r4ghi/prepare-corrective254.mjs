// Archive exact independent diagnosis and the unapplied Stage-only proposal.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',H='E:/projects/worktrees/poms-r4h-signals/poms',P='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const sha=v=>createHash('sha256').update(v).digest('hex'),git=a=>execFileSync('git',a,{cwd:R,windowsHide:true,maxBuffer:20000000});
assert.equal(git(['rev-parse','HEAD']).toString().trim(),'aade230d1c86efd4b885e51bd2b6226160bea6b1');assert.equal(git(['diff','--cached','--name-only']).toString().trim(),'');
const paths=new Set(['tools/rust-r4ghi/prepare-corrective254.mjs','tools/rust-r4ghi/update-g2-status12.mjs','docs/design/rust-r4ghi/stage-parent-corrective253.json','docs/design/rust-r4ghi-delivery-status.json']);
const fixed=(root,f,expected)=>{const raw=fs.readFileSync(root+'/'+f);assert.equal(sha(raw),expected,f);return raw;};
const d='tools/rust-r4ghi/H/implementation/support-patches/inferred-parent-current249',m='manifest249-code01.json';
const raw=fixed(H,d+'/'+m,'ca7c8413c537a709e23a1671bc063fe601d6a462d29cc37a19e239ffb6dd11fe'),manifest=JSON.parse(raw);
for(const e of [...manifest.files,...manifest.bases,{file:m,bytes:raw.length,rawBytesSha256:sha(raw)}]){
 assert(!path.isAbsolute(e.file)&&!e.file.split('/').includes('..'));const f=d+'/'+e.file,b=fixed(H,f,e.rawBytesSha256);assert.equal(b.length,e.bytes);fs.mkdirSync(path.dirname(R+'/'+f),{recursive:true});
 if(fs.existsSync(R+'/'+f))assert.deepEqual(fs.readFileSync(R+'/'+f),b);else fs.writeFileSync(R+'/'+f,b,{flag:'wx'});paths.add(f);
}
const final='tools/rust-r4ghi/independent/final-gates13/tax245-causal-review01';
const fraw=fixed(R,final+'/manifest245.json','508cf813b9168d525cae9abec93687d427c0db9fab788c98ecacf49076e59eff');
const fm=JSON.parse(fraw);assert(Array.isArray(fm.files));
for(const e of fm.files){const f=e.file.startsWith(R+'/')?e.file.slice(R.length+1):e.file;assert(f.startsWith(final+'/'));fixed(R,f,e.rawBytesSha256);paths.add(f);}paths.add(final+'/manifest245.json');
for(const [f,s]of [
 ['tools/rust-r4ghi/independent/review05/tax245-causal-review133/review133.json','c2df7545f342d4e2d29de1684b294ee649bd1481d0cc6de891e89ddfc4c5e879'],
 ['tools/rust-r4ghi/independent/review05/tax245-causal-review133/facts133.json','e9005c3aad58b222cdd3c649309040164cf233f9285b7dd238771e4eac9cc8e5'],
 ['tools/rust-r4ghi/independent/review05/inferred249-review134/review134.json','1cc53a33ec05004e83fb4925d3a540a420efb51577fc6177fda9832ac9b45a8b'],
 ['tools/rust-r4ghi/independent/review05/inferred249-review134/checks134.json','70aa1f50f50d5bd37dee58805022e4ae4b567f5ad5e66fb8ec8a8addea675378']]){fixed(R,f,s);paths.add(f);}
const reviewDir='tools/rust-r4ghi/independent/review05/inferred249-review134',checks=JSON.parse(fs.readFileSync(R+'/'+reviewDir+'/checks134.json'));
const linuxRoot='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/';
for(const key of ['harness','stdout','stderr','compileStdout','compileStderr']){const e=checks[key];assert(e.file.startsWith(linuxRoot));const f=e.file.slice(linuxRoot.length);assert(f.startsWith(reviewDir+'/'));fixed(R,f,e.rawBytesSha256);paths.add(f);}
const indexFile=R+'/docs/design/rust-r4ghi-delivery-status.json',index=JSON.parse(fs.readFileSync(indexFile));index.stageParentCorrective253='rust-r4ghi/stage-parent-corrective253.json';fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
const needles=['owner-password','jwt-secret','native-app-password','rust-app-password'].map(f=>fs.readFileSync(P+'/'+f,'utf8').trim());
for(const f of ['business/g2-business13/main01/state.json','business/g2-business13/main01/taxprepare-failure245/state-after-prepare-failure245.json','business/g2-business12/main01/state.json','native-reference92/source12-native01/state.json']){
 const s=JSON.parse(fs.readFileSync(P+'/'+f));for(const a of Object.values(s.actors??{})){if(typeof a.password==='string'&&a.password.length>=8)needles.push(a.password);for(const v of Object.values(a.cookies??{}))if(typeof v==='string'&&v.length>=8)needles.push(v,decodeURIComponent(v));}
}
const forbidden=needles.filter(v=>v.length>=8).map(v=>Buffer.from(v));
const files=[...paths].sort().map(f=>{const b=fs.readFileSync(R+'/'+f);assert(!forbidden.some(v=>b.includes(v)),'Actual secret in '+f);assert(!(b[0]===0x7f&&b.subarray(1,4).toString()==='ELF')&&b.subarray(0,2).toString()!=='MZ',f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)};});
for(const e of [...JSON.parse(fs.readFileSync(P+'/source13-preparation193/sourcePins.json')),...JSON.parse(fs.readFileSync(P+'/business/g2-business13/main01/helper-fixture234/H1-actual234.json'))])assert.equal(sha(fs.readFileSync(R+'/'+e.file)),e.sha256,e.file);
assert.equal(sha(fs.readFileSync(R+'/apps/poms-api-rust/src/project_operating/restatement.rs')),'b4a0e399ead4702c2bcfad83b22011f9c12b649233f706d011588f9889fa0fd6');
const out=R+'/tmp/rust-r4ghi/root/corrective-checkpoint254';fs.mkdirSync(out,{mode:0o700});fs.writeFileSync(out+'/stage-plan.json',JSON.stringify({kind:'Root-diagnostic-and-unapplied-candidate254',baseHead:'aade230d1c86efd4b885e51bd2b6226160bea6b1',files,product416AndHelper198Unchanged:true,actualSecrets:0,compiledArtifacts:false,G3:false,G4:false},null,2)+'\n',{flag:'wx'});fs.writeFileSync(out+'/stage-paths.nul',Buffer.from(files.map(e=>e.file).join('\0')+'\0'),{flag:'wx'});
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,e)=>n+e.bytes,0),runtimeUnchanged:true,proposalApplied:false,G3:false,G4:false}));
