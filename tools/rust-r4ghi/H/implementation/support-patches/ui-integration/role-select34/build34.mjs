// Only materializes one Role browser candidate, using actual stopped Role01 files.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
import{classifyFontBoundary32}from'file:///E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/business/ui-font-boundary32.mjs';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',U='//wsl.localhost/Debian/home/wangzishi',H='/home/wangzishi',O=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),checked=[];
function bytes(file,expected){const b=fs.readFileSync(file.startsWith(H+'/')?U+file.slice(H.length):file),rawBytesSha256=sha(b);if(expected)assert.equal(rawBytesSha256,expected);checked.push({file,rawBytesSha256,bytes:b.length});return b;}
const json=f=>JSON.parse(bytes(f)),pin=f=>{bytes(f);return checked.at(-1);};
const c=`${R}/tmp/rust-r4ghi/private/ui-runtime14/role18-source12-01/case-0`,html=bytes(`${c}/page.html`).toString(),requests=json(`${c}/requests.json`),errors=json(`${c}/errors.json`),failed=json(`${c}/result.json`);
assert.equal(failed.status,'failed');assert(requests.length>0&&requests.every(r=>r.method==='GET'));
const fieldsets=[...html.matchAll(/<fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/g)].map(m=>m[1]);assert.equal(fieldsets.length,1);const f=fieldsets[0];assert.equal(f.match(/<legend\b[^>]*>([\s\S]*?)<\/legend>/)?.[1],'角色 1');
const selects=[...f.matchAll(/<select\b[^>]*>/g)].map(m=>m[0]);assert.equal(selects.length,1);assert(!selects[0].includes(' name='));
const labels=[...f.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
assert(labels[0].startsWith('真实职责承担人 '));assert.notEqual(labels[0],'真实职责承担人');assert(labels[0].includes('请选择本次移交职责')&&labels[0].includes('R4GHI manager · 销售主责'));
assert.deepEqual(labels.slice(1),['责任说明','权重（0–1，最多六位有效小数）','零权重原因（权重为 0 时必填）']);
const d=`${H}/.local/share/poms-r4ghi/private/ui/runtime14/role18-source12-01/http`,wireNames=fs.readdirSync(U+d.slice(H.length)).filter(n=>/^http-\d+\.json$/.test(n)).sort(),wires=wireNames.map(n=>json(`${d}/${n}`));
assert(wires.length>0);assert(wires.every(w=>w.request.method==='GET'));assert(wires.every(w=>w.response.status===200&&w.response.complete===true&&w.failure===null));
const current=wires.filter(w=>w.request.path==='/api/projects/389793fb-0f5b-48ea-a5f1-8515ee572d7f/commission-role-assignment');assert.equal(current.length,1);assert.equal(JSON.parse(Buffer.from(current[0].response.bodyBase64,'base64')),null);
const font=json(`${c}/font-boundary32.json`);const fontPair=classifyFontBoundary32({failedRequests:font.failedRequests,consoleRecords:font.consoleRecords,consoleErrors:errors.consoleErrors,blocked:errors.blocked});assert.equal(errors.errors.length,0);
const file='tools/rust-r4ghi/business/ui-role18-browser.mjs',old=bytes(`${R}/${file}`,'b8088b351398a1169802f8a21857438d3586e001ea4a0cd2e2120a477b7a4cb7');
const from="await field.getByLabel('真实职责承担人',{exact:true}).selectOption(`${actor.id}:${row.roleType}`);",to="await expect(field).toHaveCount(1);const duty=field.getByRole('combobox');await expect(duty).toHaveCount(1);await duty.selectOption(`${actor.id}:${row.roleType}`);";
let text=old.toString();assert.equal(text.split(from).length-1,1);text=text.replace(from,to);assert.equal(text.replace(to,from),old.toString());
const target=`${O}/proposed/${file}`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text,{flag:'wx'});
const products=[{file,beforeSHA256:sha(old),afterSHA256:sha(Buffer.from(text)),candidate:`proposed/${file}`}];fs.writeFileSync(`${O}/products34.json`,JSON.stringify(products,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${O}/evidence34.json`,JSON.stringify({kind:'FS-only-Role01-real-DOM-and-wire-diagnosis',originalRole01Passed:false,oldRoleSpareNotCreatedOrFrozenByRole01:true,browserRequests:requests.length,LinuxWireRequests:wires.length,allMethodsGET:true,currentAssignmentLiteralNull:true,
 actualDOM:{fieldsets:1,legend:'角色 1',nativeSelectsInFieldset:1,selectHasNameAttribute:false,actualWrappedLabelText:labels[0],otherExactLabels:labels.slice(1)},
 actualFontPairFSClassification:fontPair,onlyChangedSelector:'fieldset-scoped single real combobox with both group/control count=1',retainedExactOptionValue:'actual actor.id:planned real roleType',otherLabelsUnchanged:true,
 actualBrowserRunByAuthor:false,RootWritten:false,SQL:false,HTTP:false,checked},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({kind:'Role34-only-combobox-candidate',products:1,browserRequests:requests.length,wireRequests:wires.length,businessPOST:0,originalRole01Passed:false}));
