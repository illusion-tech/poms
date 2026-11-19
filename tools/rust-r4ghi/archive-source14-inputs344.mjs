// Reversible file preservation only. No runtime imports, SQL, HTTP or state writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
assert.deepEqual(process.argv.slice(2),['--execute']);
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P='/home/wangzishi/.local/share/poms-r4ghi/private';
const D=P+'/business/g2-business14/main01',O=P+'/source14-retained-inputs344-01';
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(file,expected){const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1,file);assert.equal(fs.realpathSync(file),path.resolve(file));const b=fs.readFileSync(file);if(expected)assert.equal(sha(b),expected,file);return b;}
function pin(file,b){return {file,bytes:b.length,rawBytesSha256:sha(b)};}
const sourceFile=P+'/combined-build312/sourcePins420.json',compileFile=P+'/combined-build312/compileInputs528.json',helperFile=P+'/h2-promotion333/actual-helper-pins218.json';
const sb=read(sourceFile,'1e1847f7163cd3a530448d1c5d0297055ef09ef1033c596f59b827f7b58ac573'),cb=read(compileFile,'b793c7b37e638346373e78dfa42ff910a0f8dea4886ef1540ac5afadf2d6dc76'),hb=read(helperFile,'ad317f729c087788761b6a7eecc3a9db042f64d98231d5ab0e8fa1dd0dbea433');
const sources=JSON.parse(sb),compiles=JSON.parse(cb),helpers=JSON.parse(hb);
assert.equal(sources.length,420);assert.equal(compiles.length,528);assert.equal(helpers.length,218);
assert.equal(sha(JSON.stringify(sources)),'f99501c14e52968dbda47dde1243597e32b24e8433e90669d9aea8c5bdf3cf1d');
const expected=new Map();for(const list of [compiles,helpers])for(const item of list){assert(/^[a-zA-Z0-9_./-]+$/.test(item.file)&&!item.file.startsWith('/')&&!item.file.split('/').includes('..'));assert(/^[a-f0-9]{64}$/.test(item.sha256));assert(!expected.has(item.file),'Compile and helper sets must be disjoint');expected.set(item.file,item.sha256);}
assert.equal(expected.size,746);for(const s of sources)assert.equal(expected.get(s.file),s.sha256);
assert(!fs.existsSync(O),'Never overwrite an earlier preservation attempt');
const old13=P+'/business/g2-business13/main01/state.json',after14=P+'/tax341-command-logs/prepare-tax-e6f0b91f-f367-45f3-93e6-a516e78d272c/state-after.json';
const state13=read(old13,'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'),state14=read(D+'/state.json','bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97');
assert.deepEqual(state14,read(after14,'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97'));
const runtime=[
 ['registry4.json',D+'/R4-Source14-code-admission25203.json','13127ac7a71bdf2e90b92ef8160e9ccb9a19312e30ff24efb3436e9da3512a78'],
 ['B1.json',D+'/B1-Source14-admitted25203.json','13bc6f02ed1cdedf5ae266d8a6c3a7765fe6593333af3fa3b790c52790c37fad'],
 ['B0.json',D+'/B0-Source14-bootstrap25203.json','640ffe1525132a4e78260d1e3477b9cfe1a1c0384403e3ab70024ced8061132b'],
 ['tax14-runtime341.json',D+'/tax14-runtime341.json','439d3979be73150f0169e250e149e651f4394e21cbd7c564a22a01801f5803ea'],
 ['prepare341-receipt.json',P+'/tax341-command-logs/prepare-tax-e6f0b91f-f367-45f3-93e6-a516e78d272c/receipt.json','45863755804e97934c822682ce8f331b28e0d780a15f27a5da123d03e7d28b7d'],
 ['prepare341-partial.json',D+'/000001-tax14-prepare341-partial.json','a84f82ca83378a16c80b165563482a7ba02932b94d889a430674f43f4e64d820'],
 ['prepare341-server-targets.json',D+'/000024-tax14-complete-server-targets.json','0ee4109167a393ef7e376588db06603e26d947235347dc3661d708b632932a3d']
].map(([name,file,digest])=>({name,file,bytes:read(file,digest)}));
const records=[...expected].sort(([a],[b])=>a.localeCompare(b)).map(([file,digest])=>({relative:file,original:R+'/'+file,bytes:read(R+'/'+file,digest),sha256:digest}));
fs.mkdirSync(O,{mode:0o700});
function write(rel,b){const file=O+'/'+rel;fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,b,{flag:'wx',mode:0o600});assert.deepEqual(read(file),b);return pin(file,b);}
const copied=records.map(r=>({relative:r.relative,original:pin(r.original,r.bytes),archive:write('tree/'+r.relative,r.bytes)}));
const manifests={sources:write('sourcePins420.json',sb),compiles:write('compileInputs528.json',cb),helpers:write('helperPins218.json',hb)};
const state=write('state-at-preservation344.json',state14),ownedLogFile=D+'/ownership.jsonl';
const ownership=fs.existsSync(ownedLogFile)?write('ownership-at-preservation344.jsonl',read(ownedLogFile)):null;
const preservedRuntime=runtime.map(r=>({original:pin(r.file,r.bytes),archive:write('runtime/'+r.name,r.bytes)}));
for(const r of records)read(r.original,r.sha256);
assert.deepEqual(read(old13),state13);assert.deepEqual(read(D+'/state.json'),state14);
const receipt={kind:'actual-source14-input-preservation344',recordedAt:new Date().toISOString(),root:R,archiveRoot:O,sourceCount:420,compileCount:528,helperCount:218,treeFileCount:copied.length,sourcePinsSHA256:sha(JSON.stringify(sources)),manifests,state,ownership,preservedRuntime,files:copied,Source13StateUnchanged:true,Source14StateUnchanged:true,source14StateSequence:24,failedPreparationRetained:true,successfulPreparation:false,SQL:false,HTTP:false,APIProcessChanged:false,registryPublished:false,Source15Admitted:false,newBusinessCertified:0};
const result=write('receipt344.json',Buffer.from(JSON.stringify(receipt,null,2)+'\n'));
console.log(JSON.stringify({receipt:result,treeFiles:copied.length,noRuntimeMutation:true,newBusinessCertified:0}));
