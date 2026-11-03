// Apply the three explicit business decisions; never rewrite G0's raw receipt.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const out = 'tmp/rust-r4def/root/g0-scope02';
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
let ordinal = 0;
const receipts = [];
function api(name, route, payload) {
    const prefix = `${out}/${++ordinal}-${name}`;
    let args = ['api', route];
    if (payload) {
        const file = prefix + '-input.json'; fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
        args.push('--method', route.endsWith('/comments') ? 'POST' : 'PATCH', '--input', file);
    }
    const r = spawnSync('gh', args, { encoding: null, windowsHide: true, timeout: 55000, maxBuffer: 16000000 });
    fs.writeFileSync(prefix + '-stdout-original.json', r.stdout ?? Buffer.alloc(0));
    fs.writeFileSync(prefix + '-stderr-original.bin', r.stderr ?? Buffer.alloc(0));
    assert.equal(r.status, 0, name);
    const value = JSON.parse(r.stdout); receipts.push({ name, route, exitCode: r.status, stdout: prefix + '-stdout-original.json', stderr: prefix + '-stderr-original.bin' }); return value;
}
const note = '用户已明确裁决：补齐必要公共入口和最小操作界面，重核本批范围；允许同人多职责，各登录参与人只确认本人职责，正式execution仍需R5有效角色冻结；费用/入账两位，费率四位/工时两位，人工精确HALF_UP至分，分摊确定性尾差且守恒，完整份额整批原子替代，历史多位金额不自动改写。\n\n当前候选D7/E11/F12共30，其中28既有+2新route（准备移交、本人职责确认）。受控合同变更复用既有准备→精确审核→激活链，新行为单列受审，不重复计已交付HTTP。canonical候选已登记，精确DTO/DDL/真实机制及独立G1待冻结，尚未准入G2。基线 docs/design/rust-r4def-next30-baseline.md；用户原文 docs/design/rust-r4def/user-decisions01.json。经营17与验收完工归档8仍后续，本批不关闭#101/#57。';
const readback = [];
for (const number of [106, 107, 108, 109]) {
    const old = api('before-' + number, `repos/illusion-tech/poms/issues/${number}`);
    assert.equal(old.state, 'open');
    let body = old.body.replaceAll('28入口', '30入口候选').replaceAll('D移交5/E成本基础11/F成本治理12，共28', 'D移交7/E成本基础11/F成本治理12，共30').replaceAll('三线并行28', '三线并行30候选');
    body += '\n\n2026-11-04 用户业务裁决与范围修订：\n\n' + note + '\n';
    const title = number === 106 ? '[RUST-R4-DEF] 移交与成本事实二批联合迁移30入口' : number === 107 ? '[RUST-R4D] 移交七入口与受控变更真实闭环' : old.title;
    api('update-' + number, `repos/illusion-tech/poms/issues/${number}`, { title, body });
    const after = api('after-' + number, `repos/illusion-tech/poms/issues/${number}`);
    assert.equal(after.body, body); assert.equal(after.title, title); assert.equal(after.state, 'open');
    readback.push({ number, title, state: after.state, url: after.html_url });
}
api('stage-comment', 'repos/illusion-tech/poms/issues/101/comments', { body: '#106 第二批用户裁决已明确，范围候选调整为30（D7/E11/F12）。\n\n' + note });
const result = { kind: 'R4-explicit-scope-decisions-actual-readback', createdAt: new Date().toISOString(), userDecisionFile: 'docs/design/rust-r4def/user-decisions01.json', receipts, readback, G1Certified: false, G2Authorized: false };
fs.writeFileSync('docs/design/rust-r4def/scope-update02.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ readback, G1Certified: false }));
