import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',relative='tools/rust-r4ghi/H/implementation/support-patches/ui-integration',source='E:/projects/worktrees/poms-r4h-signals/poms/'+relative,sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(source+'/handoff19/manifest-handoff19.json');assert.equal(sha(raw),'8cc5908daabf96ecc08b5f7ac3beb9fb23e3ac3cbc816fd68ad7935d3a8689f4');
assert.equal(sha(fs.readFileSync(source+'/handoff19/copy-plan19.json')),'a2944481ca0f9a0fb9b7a2fd541d3a743ac37cae982330f41c93edbf2d778059');
for(const group of ['handoff19','lifecycle18-03','expense18-04','role18-05','role18-05b','role18-05c','gh18-06']){
 const dir=source+'/'+group,dest=root+'/'+relative+'/'+group;fs.mkdirSync(dest,{recursive:true});
 for(const entry of fs.readdirSync(dir,{withFileTypes:true}))if(entry.isFile()){
  const bytes=fs.readFileSync(dir+'/'+entry.name),target=dest+'/'+entry.name;if(fs.existsSync(target))assert.equal(sha(fs.readFileSync(target)),sha(bytes));else fs.writeFileSync(target,bytes,{flag:'wx'});
 }
}
const node='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe';
const r=spawnSync(node,[root+'/'+relative+'/handoff19/promote-tools19.mjs','--plan',root+'/'+relative+'/handoff19/copy-plan19.json','--approved-plan-sha','a2944481ca0f9a0fb9b7a2fd541d3a743ac37cae982330f41c93edbf2d778059','--execute'],{cwd:root,encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);
const result=JSON.parse(r.stdout);assert.equal(result.copied.length,25);assert.equal(result.alreadyExact.length,3);
const copy=JSON.parse(fs.readFileSync(source+'/handoff19/copy-plan19.json'));
for(const item of copy.files){const target=root+'/'+item.file;assert.equal(sha(fs.readFileSync(target)),item.rawBytesSha256);const check=spawnSync(node,['--check',target],{encoding:'utf8',windowsHide:true});assert.equal(check.status,0,check.stderr);}
fs.writeFileSync(root+'/docs/design/rust-r4ghi/ui-tools19-promotion.json',JSON.stringify({...result,kind:'Root-nonauthor-reviewed-exact-A08-tool-promotion19',manifestRawSHA256:sha(raw),
 review:['Actual DOM input/select/file/click drives generated client; proxy observes exact actor/project/CAS/source and canonical status','Full before/after Root ownership ledger, additional same-table PK guards and immutable producer records','No API substitute for role/lifecycle/cost/G/H UI actions; pending tax is explicit setup only','Optional I58 controlled rollback probe requires separate exact module+sources approval before role UI response forwards'],
 syntaxChecks:28,actualBrowserExecuted:false,allA08FormsPassed:false,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({copied:25,alreadyExact:3,syntaxChecks:28,actualBrowserExecuted:false,G3Certified:false}));
