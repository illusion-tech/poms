// Prepare exact metadata only. Actual auth collection and producers are separate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
assert.equal(process.platform,'linux');
const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',priv='/home/wangzishi/.local/share/poms-r4ghi/private',prefix=root+'/tools/rust-r4ghi/H/implementation/support-patches/ui-integration',sha=b=>createHash('sha256').update(b).digest('hex');
const pin=file=>({file,rawBytesSha256:sha(fs.readFileSync(file))}),uiRun='fixtures16-source11-01';
const old=fs.readFileSync(prefix+'/runtime14/plan14.template.json','utf8'),plan=JSON.parse(old.replaceAll('dom14-01',uiRun));
plan.epoch='g2-business11';plan.run='main01';plan.uiRun=uiRun;plan.linuxNodeExecutable=fs.realpathSync(process.execPath);
plan.cases=[{kind:'money-max',actorKey:'manager',projectIdPointer:'/fixtures/maxProject/id',forbiddenTextPointers:[]},
 {kind:'sensitive-mask',actorKey:'person',projectIdPointer:'/fixtures/maskProject/id',forbiddenTextPointers:['/fixtures/maskExpense/financialProjection/expenseDescription/value']}];
plan.writeActions=[];
for(const [field,file] of [['node',plan.windows.node.executablePath],['browser',plan.windows.browser.executablePath]])assert(/^[a-f0-9]{64}$/.test(plan.windows[field].rawBytesSha256)&&file);
const candidate=pin(priv+'/business/g2-business11/main01/002348-candidate-source-binding11.json');assert.equal(candidate.rawBytesSha256,'910ffeefb2d9b0322b53476034104fbc58aeb520e8de159790458eebbbc440fc');
const input={schemaVersion:1,kind:'prepare-real-ui16-plan',purpose:'fixtures',plan,sourceManifest:candidate,candidateReceipt:candidate,apiProcess:pin(priv+'/rust-api134-process.json'),
 promotedToolClosure:pin(priv+'/ui-config/runtime14/consumer11-promoted20-54-01.json')};
assert.equal(input.promotedToolClosure.rawBytesSha256,'662953aca396435d4f82387017b85a68d7deb3166a3a162a5653034e796bd4b5');
const file=priv+'/ui-config/runtime14/'+uiRun+'-prepare-input16.json';fs.writeFileSync(file,JSON.stringify(input,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({input:pin(file),actualWindowsInventoryRechecked:true,purpose:input.purpose,actorsFinal:false,HTTPExecuted:false}));
