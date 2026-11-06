// Root-only: archive completed #115 lifecycle docs and public evidence, never private payloads.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=fs.realpathSync('.'),relative='docs/design/archive/slices/rust-r2-user-create-fix115';
const destination=path.resolve(root,relative);assert(destination.toLowerCase().startsWith(root.toLowerCase()+path.sep));assert(!fs.existsSync(destination));
const sha=b=>createHash('sha256').update(b).digest('hex');
const entries=[];fs.mkdirSync(destination,{recursive:true});
fs.writeFileSync(destination+'/.gitattributes','* -text\n* whitespace=cr-at-eol\n*.bin binary\n',{flag:'wx'});
function transfer(source,target,action){
 const from=path.resolve(root,source),to=path.resolve(destination,target);
 assert(from.toLowerCase().startsWith(root.toLowerCase()+path.sep));assert(to.toLowerCase().startsWith(destination.toLowerCase()+path.sep));
 const stat=fs.lstatSync(from);assert(stat.isFile()&&!stat.isSymbolicLink());assert(!fs.existsSync(to));
 const bytes=fs.readFileSync(from);fs.mkdirSync(path.dirname(to),{recursive:true});
 if(action==='move-completed-lifecycle')fs.renameSync(from,to);else fs.writeFileSync(to,bytes,{flag:'wx'});
 assert.equal(sha(fs.readFileSync(to)),sha(bytes));entries.push({action,source,archive:relative+'/'+target,bytes:bytes.length,rawBytesSha256:sha(bytes)});
}
const moves=[
 ['docs/design/rust-r4ghi-user-create-fix-baseline.md','baseline.md.bin'],
 ['docs/design/rust-r4ghi/user-fix-g1-sources01.json','g1-source-manifest.json.bin'],
 ['docs/design/rust-r4ghi/user-fix-online01.json','online-g1.json.bin'],
 ['docs/design/rust-r4ghi/user-fix/validation01.json','validation01.json.bin'],
 ['docs/design/rust-r4ghi/user-fix/validation01.md','validation01.md.bin'],
];
for(const [source,target] of moves)transfer(source,target,'move-completed-lifecycle');
const folders=['tmp/rust-r4ghi/userfix/userfix115/run01','tmp/rust-r4ghi/root/user-fix-g1-online01','tmp/rust-r4ghi/root/environment01','tmp/rust-r4ghi/root/rust-clippy01','tmp/rust-r4ghi/root/rust-clippy02','tmp/rust-r4ghi/root/rust-fmt01','tmp/rust-r4ghi/root/rust-test01','tmp/rust-r4ghi/root/rust-build01','tmp/rust-r4ghi/root/contract01'];
function walk(folder){for(const item of fs.readdirSync(path.resolve(root,folder),{withFileTypes:true})){assert(!item.isSymbolicLink());const file=folder+'/'+item.name;if(item.isDirectory())walk(file);else if(item.isFile())transfer(file,'evidence/'+file.replace(/^tmp\/rust-r4ghi\//,'')+(file.endsWith('.bin')?'':'.bin'),'copy-public-evidence');}}
for(const folder of folders)walk(folder);
for(const file of ['tmp/rust-r4ghi/root/userfix-stop01.json','tmp/rust-r4ghi/root/userfix-stop01-stdout.bin','tmp/rust-r4ghi/root/userfix-stop01-stderr.bin','tmp/rust-r4ghi/root/cleanup-plan-review01.json','tmp/rust-r4ghi/root/smoke01-helper-inputs.json','tmp/rust-r4ghi/root/smoke02-helper-inputs.json','tmp/rust-r4ghi/root/staged-boundary01.json','tmp/rust-r4ghi/root/git04/receipt.json'])transfer(file,'evidence/root/'+path.basename(file)+(file.endsWith('.bin')?'':'.bin'),'copy-public-evidence');
const manifest={kind:'actual-userfix-original-byte-archive-map',capturedAt:new Date().toISOString(),issue:115,implementationCommit:'874e35fc0af3b6cdf6f6461725eb1343152efbea',entries,files:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),privatePayloadFilesCopied:0,originalTemporaryEvidenceDeleted:false,GHIActiveLifecycleMoved:false};
fs.writeFileSync(destination+'/origin-map01.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(destination+'/README.md','# #115 用户创建关联修复归档\n\n实施 `874e35fc0af3b6cdf6f6461725eb1343152efbea`，独立 G3 已通过。固定提交、main 与线上 G4 的实际状态以独立证书和 Issue 读回为准；本归档不提前宣称 G4 完成。\n\n仅交付既有用户创建命令：真实 UUID 及角色/组织关联、必要写同事务、引用与并发保护。Rust 416 passed / 54 ignored；实际 19 场景、11 必要写故障及重试、4 引用锁竞态。UI 有依据 N/A。精确删除121新增PK，零原件改写，两库各120表/532行及目录元数据恢复，API/PG已停止，volume/private保留。\n\n原字节基线、输入、线上 G1 与验收位于本目录 `.bin` 文件；[原件映射](origin-map01.json)绑定原路径、字节数和 SHA256。公共运行证据保全在 evidence；private中的cookies/密码/业务行/数据库快照只以原件哈希引用，未复制进仓库。原失败、partial、ignored、既有OpenAPI200/实际201声明差异均保留原分类。\n\n原G1基线的不可变链接仍在 `21e9124160f92dce38a5029786273fdb893759f0`；未把历史引用改写成当前业务合同。当前G3证书在 `tools/rust-r4ghi/independent/userfix-final/g3-review01.json`。R4联批#110、R5父#116/最小#117与总体#57继续开放；本片新增HTTP为0，正式Rust仍240。\n',{flag:'wx'});
const statusFile=path.resolve(root,'docs/design/rust-r4ghi-delivery-status.json'),status=JSON.parse(fs.readFileSync(statusFile));
Object.assign(status.independentUserFix,{stage:'G4Ready',baseline:'archive/slices/rust-r2-user-create-fix115/baseline.md.bin',validation:'archive/slices/rust-r2-user-create-fix115/validation01.json.bin',archive:'archive/slices/rust-r2-user-create-fix115/origin-map01.json',implementationCommit:manifest.implementationCommit,G3Certified:true,G4Certified:false});
fs.writeFileSync(statusFile,JSON.stringify(status,null,2)+'\n');
const note='\n\n### 2026-11-06 用户创建初始关联独立补缺\n\n[#115](https://github.com/illusion-tech/poms/issues/115) 已修复用户UUID物化、初始角色/主组织及必要写整体事务，实际19场景/11故障重试/4引用锁竞态及Rust416通过、54历史ignored；UI明确N/A。精确121新增PK清理、双库原件恢复及自有API/PG停止均完成，独立G3通过，固定提交/main及线上G4按各自原件收口。见[归档](archive/slices/rust-r2-user-create-fix115/README.md)；本片无新增操作，不代表R4/R5完整阶段交付。\n';
for(const file of ['docs/design/backend-rust-migration-plan.md','docs/design/rust-migration-execution-tracker.md','docs/design/rust-r4-scope-and-dependencies.md','docs/design/phase2-development-execution-tracker.md'])fs.appendFileSync(path.resolve(root,file),note);
console.log(JSON.stringify({issue:115,files:manifest.files,bytes:manifest.bytes,privatePayloadFilesCopied:0,completedLifecycleMoves:moves.length,GHIActiveLifecycleMoved:false}));
