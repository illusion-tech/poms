// Root-only online freeze after the non-author final06 Pass. No product execution.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
const base = '57f64d6c0aef99430acc3b4ed7d99d00074d59f4';
const manifestFile = 'docs/design/rust-r4def/joint-g1-06/manifest06.json';
const manifestSha = '8229d58c4319962de37ff9a153dc2c24a9b191f4a2101c3ce12558bdb0ef2147';
const certificateFile = 'docs/design/rust-r4def/g1-independent07/g1-final06.json.bin';
const hash = b => createHash('sha256').update(b).digest('hex');
assert.equal(hash(fs.readFileSync(manifestFile)), manifestSha);
const certificate = JSON.parse(fs.readFileSync(certificateFile, 'utf8'));
assert.equal(certificate.verdict, 'Pass'); assert(certificate.G1Certified); assert.equal(certificate.reviewedCommit, base);
assert.equal(hash(fs.readFileSync(certificateFile)), 'b157f230a59a5750fd8fa993d8f58fb517619fb898b3ba1f3757b7a54d0656f6');
execFileSync('git', ['merge-base', '--is-ancestor', base, 'HEAD']);
assert.equal(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), 'codex/poms-r4def-next28');
const metadataCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const published = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/codex/poms-r4def-next28'], { encoding: 'utf8' }).split(/\s+/)[0];
assert.equal(published, metadataCommit, 'Publish the reviewed inputs/certificate metadata before freezing online');
const out = 'tmp/rust-r4def/root/g1-online07'; assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
let ordinal = 0; const commands = [];
function api(name, route, payload) {
    const prefix = `${out}/${String(++ordinal).padStart(2, '0')}-${name}`; let args = ['api', route];
    if (payload !== undefined) { const file = prefix + '-input.json'; fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' }); args.push('--method', route.endsWith('/comments') ? 'POST' : 'PATCH', '--input', file); }
    const r = spawnSync('gh', args, { encoding: null, windowsHide: true, timeout: 55000, maxBuffer: 16000000 });
    fs.writeFileSync(prefix + '-stdout-original.json', r.stdout ?? Buffer.alloc(0), { flag: 'wx' }); fs.writeFileSync(prefix + '-stderr-original.bin', r.stderr ?? Buffer.alloc(0), { flag: 'wx' });
    commands.push({ name, args, exitCode: r.status, stdout: { file: prefix + '-stdout-original.json', sha256: hash(r.stdout ?? Buffer.alloc(0)) }, stderr: { file: prefix + '-stderr-original.bin', sha256: hash(r.stderr ?? Buffer.alloc(0)) } });
    assert.equal(r.status, 0, 'Inspect actual live state before resuming partial freeze'); return JSON.parse(r.stdout);
}
const immutable = p => `https://github.com/illusion-tech/poms/blob/${metadataCommit}/${p}`;
const input = `独立联合G1已Pass，输入提交 ${base}，manifest SHA256 ${manifestSha}。\n\n权威输入：[联合基线](${immutable('docs/design/rust-r4def-next30-baseline.md')})、[精确30入口/DTO/DDL/来源](${immutable(manifestFile)})、[独立G1证书](${immutable(certificateFile)})、[独占文件归属](${immutable('docs/design/rust-r4def/ownership04.md')})。Root权限覆盖 root-projection05、root-decisions02 和 protocol01；D final01/E corrected02/F01的原始候选、03/05 Block及失败原件均保留，按manifest authorityOrder解释。\n\n当前静态输入435份、完整目标293operations/624schemas；这是G1设计目标，当前Rust仍210，本批正式新增交付0。未执行新SQL/业务HTTP/PG/UI，不把G1当实现/验收。\n`;
const decisions = '用户已明确：补真实移交准备/本人确认/受控合同变更与最小UI；同人可兼任、只本人确认，execution仍需R5有效角色冻结；货币两位/费率四位/数量两位、人工精确HALF_UP、确定性尾差守恒、完整份额整批原子替代、历史多位不自动改写。必要业务/版本/快照/审计/会话写同一外层CommonSession，任一必要写失败整体回滚。F阶段确认真实推进registered→confirmed+锁+归属+审计；本批not included。人力及其可反推派生组按双敏感授权规则，不能由finance:manage推出敏感读取权。\n';
const boundaries = '三线从同一冻结metadata基线在隔离工作树实施，Root独占公共契约/生成物/DDL/路由/Git/GitHub和统一实际环境。F实际验收消费E及适用D真实事实。经营17、验收完工归档8、完整R5、部署切流未纳入；#101/#57保持Open。\n';
const checklist = '\n- [x] G0：父子Issue与canonical边界\n- [x] 联合G1：独立Pass、用户裁决、精确DTO/DDL/真实机制/事务/权限及文件归属\n- [ ] 三线实现与独占交付\n- [ ] 统一候选真实生产者/HTTP/PG/权限/故障/并发/原UI验收及精确清理\n- [ ] 独立G3、固定提交与main集成\n- [ ] 生命周期归档、独立G4关闭许可与实际线上读回\n';
const definitions = [
    [106, 'D7/E11/F12共30：28既有+2新公共入口。受控合同变更及必要发票币种扩展复用既有操作，不重复计数。'],
    [107, 'D7：承接/详情/最终确认/再基线化5既有，加准备和本人确认2新入口；真实职责/摘要/待办/冻结、受控变更与原子新计划、附件真实闭环和最小UI。'],
    [108, 'E11：费率、五来源实际成本登记/查询/人力替代、费用生命周期；真实来源/币种/阶段依据、费率边界、精度和全部敏感字段投影。'],
    [109, 'F12：共享分摊4、阶段归属4、税务4；完整批次不可变替代、显式金额层/币种/证据、真实成本确认/锁、双敏感LABOR派生规则。'],
];
const actual = [];
for (const [number, scope] of definitions) {
    const before = api('before-' + number, `repos/illusion-tech/poms/issues/${number}`); assert.equal(before.state, 'open');
    const body = `状态：Doing / G1已冻结；完成本批线上读回后准入G2，尚未实现交付。\n\n${number === 106 ? '父#101，总体#57；原生子项D#107/E#108/F#109。' : '父#106，上级#101，总体#57。'}\n\n${scope}\n\n${input}\n${decisions}\n${boundaries}${checklist}`;
    api('body-' + number, `repos/illusion-tech/poms/issues/${number}`, { body });
    const commentBody = `G1 已冻结。\n\n${scope}\n\n${input}\n${decisions}\n${boundaries}\n实际线上冻结以本批全部正文/评论/父子关系读回为准；其后Root发布G2准入authority，作者无需再次请求同一业务批准。`;
    const comment = api('comment-' + number, `repos/illusion-tech/poms/issues/${number}/comments`, { body: commentBody });
    const after = api('after-' + number, `repos/illusion-tech/poms/issues/${number}`); const readComment = api('read-comment-' + number, `repos/illusion-tech/poms/issues/comments/${comment.id}`);
    assert.equal(after.body, body); assert.equal(after.state, 'open'); assert.equal(readComment.body, commentBody);
    actual.push({ number, body, commentBody, commentId: comment.id, commentUrl: comment.html_url, state: after.state });
}
const children = api('batch-children', 'repos/illusion-tech/poms/issues/106/sub_issues?per_page=100'); assert.deepEqual(children.map(x => x.number).sort((a, b) => a - b), [107, 108, 109]); assert(children.every(x => x.state === 'open'));
const parent = api('parent', 'repos/illusion-tech/poms/issues/101'); const root = api('root', 'repos/illusion-tech/poms/issues/57'); assert.equal(parent.state, 'open'); assert.equal(root.state, 'open');
const progress = `#106 的30入口联合G1已通过独立复核并实际线上冻结，D#107/E#108/F#109从同一冻结基线进入G2。输入${base}，权威manifest ${manifestSha}，435来源/5outputs已核；这不是实现或运行验收。当前Rust210，本批新增正式交付0。\n\n${boundaries}`;
api('parent-progress', 'repos/illusion-tech/poms/issues/101/comments', { body: progress }); api('root-progress', 'repos/illusion-tech/poms/issues/57/comments', { body: progress });
const result = { kind: 'R4-DEF-actual-online-G1-freeze-readback', completedAt: new Date().toISOString(), inputCommit: base, metadataCommit, manifest: { file: manifestFile, rawBytesSha256: manifestSha }, certificate: { file: certificateFile, rawBytesSha256: hash(fs.readFileSync(certificateFile)) }, actual, nativeChildren: children.map(x => ({ number: x.number, state: x.state })), parentStates: { 101: 'OPEN', 57: 'OPEN' }, commands, G1Certified: true, G2Authorized: true, runtimeExecuted: false };
fs.writeFileSync('docs/design/rust-r4def/g1-online07.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync('docs/design/rust-r4def/g1-gate-authority07.json', JSON.stringify({ kind: 'R4-DEF-G2-admission', inputCommit: base, inputManifest: result.manifest, independentReview: result.certificate, onlineReadback: 'docs/design/rust-r4def/g1-online07.json', sameFrozenMetadataBaselineRequired: true, ownership: 'docs/design/rust-r4def/ownership04.md', G1Certified: true, G2Authorized: true, noRuntimeClaim: true, completedAt: result.completedAt }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ G1Certified: true, G2Authorized: true, issueComments: actual.map(({ number, commentUrl }) => ({ number, commentUrl })), parentsOpen: true }));
