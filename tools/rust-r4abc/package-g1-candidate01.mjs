// Root-only metadata and immutable raw source packaging. No product or runtime execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='docs/design/rust-r4abc';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pin=f=>{const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)}};
const write=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'})};
const originMap=[];
function walk(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(root+'/'+e.name):[root+'/'+e.name]);}
for(const key of ['a','b','c']) {
 const root='tmp/rust-r4abc/input-'+key;
 for(const file of walk(root).filter(f=>!f.includes('/sources/')&&!f.includes('/source-originals/'))) {
  const relative=file.slice(root.length+1),dest=dir+'/inputs/authors/'+key+'/'+relative+'.bin';const bytes=fs.readFileSync(file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});originMap.push({logicalOrigin:file,storedAt:dest,bytes:bytes.length,rawBytesSha256:sha(bytes),class:'author-static-input-or-pure-definition; not runtime certification'});
 }
}
for(const folder of ['g0-online01','g0-online02'])for(const file of walk('tmp/rust-r4abc/root/'+folder)){
 const dest=dir+'/g0/'+folder+'/'+path.basename(file)+'.bin'; const bytes=fs.readFileSync(file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});originMap.push({logicalOrigin:file,storedAt:dest,bytes:bytes.length,rawBytesSha256:sha(bytes),class:folder==='g0-online01'?'partial; C create TLS timeout; live recovery required':'actual G0 registration and parent relation readback'});
}
const g0=JSON.parse(fs.readFileSync('tmp/rust-r4abc/root/g0-issue-registration02.json','utf8')); assert.equal(g0.stage.number,101);assert.equal(g0.batch.number,102);assert.deepEqual(g0.children.map(c=>c.number),[103,104,105]);write(dir+'/g0/registration02.json',g0);
write(dir+'/inputs/origin-map01.json',{kind:'raw-static-input-logical-origin-map',entries:originMap,originalSourceResolver:'inputs/source-union01.json supplies deduplicated current source originals. Author raw manifests retain original logical paths. No byte rewriting.'});
write(dir+'/user-decisions01.json',{source:'four explicit user text answers in current chat',date:'2026-11-03',decisions:[{key:'lifecycle',answer:'合同级准备→激活生效→正式应收计划'},{key:'money',answer:'正数、最多两位、超范围拒绝'},{key:'payment-contract',answer:'按同项目Active合同、应付绑定继承/一致性规则约束，保留项目级无合同付款'},{key:'multiple-contract-amounts',answer:'合同金额独立，来源与差异必须可审计；无项目报价硬总额、无自动分摊、无强制合计'}],mandatoryAtomicity:'necessary business writes/snapshots/registered audit/session all commit or rollback',bugParity:false});
function rewrite(file,fn){const prior=fs.readFileSync(file,'utf8');const next=fn(prior);assert.notEqual(next,prior,file);fs.writeFileSync(file,next);}
const note='\n\n### 2026-11-03 R4 首批 G0 与联合 G1 候选\n\n用户已授权启动 [R4 #101](https://github.com/illusion-tech/poms/issues/101) 首批 [#102](https://github.com/illusion-tech/poms/issues/102)，原生 A#103/B#104/C#105 已建立并读回。当前37唯一公开入口为签约就绪9、合同9、财务19；313份当前静态来源与AST/spec/canonical清单已捕获，[联合基线](rust-r4abc-first37-baseline.md)及精确DTO/DDL/同事务协议进入非作者G1审查，尚未准入G2。四项用户裁决明确真实合同准备/审核激活/正式计划、正数两位金额、付款归属、每合同独立金额与来源差异审计。R0–R3交付不变；R4 Doing/G1待冻结、R5–R7 Todo，#101/#57保持Open，本批完成也不能关闭整个R4。\n';
rewrite('docs/design/rust-migration-execution-tracker.md',s=>s.replace('#57 Open，R4–R7 Todo','#57 Open；R4首批#101/#102进入G0/G1，R5–R7 Todo').replace('| R4   | Todo |','| R4   | Doing |')+note);
rewrite('docs/design/backend-rust-migration-plan.md',s=>s.replace('#57继续Open，R4–R7待推进','#57继续Open；R4首批G0/G1进行中，R5–R7待推进')+note);
rewrite('docs/design/phase2-development-execution-tracker.md',s=>s+note);
const supplements=[
 ['docs/design/contract-finance-design.md','本批Rust合同及资金实现以 [R4首批联合基线](rust-r4abc-first37-baseline.md) 的四项用户裁决、同合同差异范围、真实准备/绑定/快照/计划及原子审计为当前冻结候选；历史项目级随机初始化标记不构成真实产物。各合同独立金额无项目硬总额/自动分摊规则。'],
 ['docs/design/interface-command-design.md','R4首批37既有canonical入口的请求/响应/query增量、preparationId与真实snapshotId/planVersionId及strict结果，以 [联合基线](rust-r4abc-first37-baseline.md) 和 `rust-r4abc/dto-freeze01.json` 为当前G1候选；路由不增减，合同级来源及审核精确绑定不得回退为旧随机marker。'],
 ['docs/design/schema-ddl-design.md','R4首批新增prepared版本、exact review binding和真实receivable plan版本/节点/init记录，以及合同级package/diff/附件关联的精确DDL设计输入见 `rust-r4abc/schema-freeze01.sql` 与 [联合基线](rust-r4abc-first37-baseline.md)。G2以新forward migration/entity落地；当前未执行DDL。'],
 ['docs/design/table-structure-freeze-design.md','R4首批按 [联合基线](rust-r4abc-first37-baseline.md) 增真实contract_term_preparation、contract_review_binding、receivable_plan_version/node/init_record及商业复核附件关联；旧有效ContractTermSnapshot不扩prepared状态，source_preparation_id历史nullable、新生产严格绑定。精确字段以 `rust-r4abc/schema-freeze01.sql` 为G1候选输入。'],
 ['docs/design/api-route-canonical-inventory.md','R4首批迁移37个既有canonical入口，不新增/删除method/path。A03/A07的contractId query、合同准备/计划/审批绑定及金额语义改变已纳 [联合基线](rust-r4abc-first37-baseline.md) 和 `rust-r4abc/dto-freeze01.json`，G1冻结后才准入DTO/controller/client。authoritative行本身保持aligned。']
];
for(const [file,text]of supplements)rewrite(file,s=>{const line=s.indexOf('\n');return s.slice(0,line+1)+'\n> 2026-11-03：'+text+'\n'+s.slice(line+1)});
console.log(JSON.stringify({rawArtifacts:originMap.length,registration:{stage:101,batch:102,children:[103,104,105]},metadataOnly:true}));
