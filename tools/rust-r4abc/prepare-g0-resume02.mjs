// Derive a new immutable executor; never overwrite the already-executed attempt.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const original = fs.readFileSync('tools/rust-r4abc/register-g0.mjs', 'utf8');
let next = original.replace("out='tmp/rust-r4abc/root/g0-online01'", "out='tmp/rust-r4abc/root/g0-online02'");
const oldCreate = "function create(key,title,body){assert(!prior.issues.nodes.some(x=>x.title===title),'Existing Issue: resume, never duplicate');return api('create-'+key,['repos/illusion-tech/poms/issues','--method','POST'],{title,body});}";
const newCreate = "function create(key,title,body){const found=prior.issues.nodes.filter(x=>x.title===title);assert(found.length<=1,'Duplicate issue title requires read-only investigation');if(found.length){const existing=api('reuse-'+key,['repos/illusion-tech/poms/issues/'+found[0].number]);assert.equal(existing.state,'open');return api('refresh-'+key,['repos/illusion-tech/poms/issues/'+existing.number,'--method','PATCH'],{body});}return api('create-'+key,['repos/illusion-tech/poms/issues','--method','POST'],{title,body});}";
assert(next.includes(oldCreate)); next = next.replace(oldCreate, newCreate);
next = next.replace('用户裁决待回，未完成依赖冻结不能G2。', '用户四项裁决已明确：合同级准备→审核激活生效→正式应收计划；合同/普通回款/发票金额正数、最多两位且超numeric(18,2)拒绝；付款遵守同项目Active合同及应付绑定规则，保留项目级无合同付款；每合同金额独立，报价来源及差异必须可审计，无硬总额或自动分摊。Root冻结独立preparationId与有效snapshotId，两者不能混用。联合G1独立Pass及线上冻结前不能G2。');
next = next.replace('与B合同绑定/生命周期及正式应收计划归属待用户裁决。', 'contractId绑定真实prepared条款版本，激活后从有效快照生成正式应收计划；各合同金额独立、报价来源及差异可审计。');
next = next.replace('37入口及初始化/金额/付款业务边界待冻结。', '37入口及四项用户业务裁决已纳入联合G1准备，独立审查与线上冻结尚未完成。');
next = next.replace("'tmp/rust-r4abc/root/g0-issue-registration.json'", "'tmp/rust-r4abc/root/g0-issue-registration02.json'");
next = next.replace('createdAt:new Date().toISOString(),overall57', "createdAt:new Date().toISOString(),previousAttempt:{directory:'tmp/rust-r4abc/root/g0-online01',status:'partial',reason:'C create TLS handshake timeout; fresh live title read before reuse/retry'},overall57");
next = next.replace('首次', '首次');
assert.notEqual(next, original);
fs.writeFileSync('tools/rust-r4abc/register-g0-resume02.mjs', next, { flag: 'wx' });
console.log('Prepared resume02; no GitHub mutation in this derivation.');
