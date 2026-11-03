// Pure metadata mirror of the completed actual online G1 freeze.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const online = JSON.parse(fs.readFileSync('docs/design/rust-r4def/g1-online07.json', 'utf8'));
assert(online.G1Certified && online.G2Authorized);
const statusFile = 'docs/design/rust-r4def-delivery-status.json';
const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
Object.assign(status, { stage: 'G1Frozen', updatedAt: online.completedAt, scope: { D: 7, E: 11, F: 12, total: 30, existing: 28, new: 2 }, G1Certified: true, G2Authorized: true, G1InputCommit: online.inputCommit, G1InputManifest: online.manifest, independentG1: online.certificate, actualOnlineG1: 'rust-r4def/g1-online07.json', gateAuthority: 'rust-r4def/g1-gate-authority07.json' });
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
const baselineFile = 'docs/design/rust-r4def-next30-baseline.md';
let baseline = fs.readFileSync(baselineFile, 'utf8');
const before = '- Gate Status: `Pending`，G0 已完成，G1 输入准备中，尚未准入 G2。';
assert(baseline.includes(before));
baseline = baseline.replace(before, '- Gate Status: `Pass`，独立联合 G1 与实际线上冻结已完成；三线 G2 已准入，尚无产品实现或运行验收交付。');
baseline = baseline.replace('- G1 Reviewer / Date: 待非作者复核及线上冻结。', `- G1 Reviewer / Date: 独立 reviewer / ${online.completedAt}；输入提交 \`${online.inputCommit}\`。`);
baseline += '\n\n## 9. 当前 G1 冻结结论\n\n[独立终审原件](rust-r4def/g1-independent07/g1-final06.json.bin) Pass，P0–P2剩余0；[实际线上读回](rust-r4def/g1-online07.json)核四项正文/comment及原生父子关系，#101/#57保持Open。权威[manifest06](rust-r4def/joint-g1-06/manifest06.json)绑定435来源、5outputs、30入口/63schema差异及完整目标293/624；[ownership04](rust-r4def/ownership04.md)与[Root人力派生权限覆盖](rust-r4def/root-projection05.json)参与冻结。原候选、03/05 Block、失败原件保留各自时点。\n\nG1Certified=true、G2Authorized=true仅准入本批三线实现；Rust仍210操作，本批新增正式交付0。实现、实际验收、独立G3/G4、固定提交/main和收口仍待完成；作者从同一冻结metadata提交建立工作树，不重新询问已决业务。上方候选和原始输入的Pending文句保留原时点，以本节及线上Issue为当前准入。\n';
fs.writeFileSync(baselineFile, baseline);
const note = '\n\n### 2026-11-04 R4 第二批联合 G1 实际冻结\n\n[#106](https://github.com/illusion-tech/poms/issues/106#issuecomment-6615241191) / [D#107](https://github.com/illusion-tech/poms/issues/107#issuecomment-6615243857) / [E#108](https://github.com/illusion-tech/poms/issues/108#issuecomment-6615246436) / [F#109](https://github.com/illusion-tech/poms/issues/109#issuecomment-6615249125) 已获[非作者G1 Pass](rust-r4def/g1-independent07/g1-final06.json.bin)并完成[实际线上读回](rust-r4def/g1-online07.json)，30入口及必要内部机制/最小UI的435来源和5outputs已冻结，三线G2准入。输入57f64d6c；[当前基线](rust-r4def-next30-baseline.md)、[归属](rust-r4def/ownership04.md)、[状态](rust-r4def-delivery-status.json)一致。旧Block/失败与候选不改写。\n\n当前仅G1完成，Rust仍210、本批新增正式交付0；实现/SQL/HTTP/PG/UI/独立G3/G4与main集成均未认证。经营17、验收完工归档8及完整R4仍后续，#101/#57持续Open。\n';
for (const name of ['README.md', 'backend-rust-migration-plan.md', 'rust-migration-execution-tracker.md', 'phase2-development-execution-tracker.md']) {
    const file = 'docs/design/' + name; const text = fs.readFileSync(file, 'utf8');
    assert(!text.includes('### 2026-11-04 R4 第二批联合 G1 实际冻结'));
    fs.writeFileSync(file, text.trimEnd() + note);
}
const scopeFile = 'docs/design/rust-r4-scope-and-dependencies.md';
const scope = fs.readFileSync(scopeFile, 'utf8');
fs.writeFileSync(scopeFile, scope.trimEnd() + '\n\n## 第二批当前准入\n\n30项（D7/E11/F12，28既有+2新增）已经[独立G1](rust-r4def/g1-independent07/g1-final06.json.bin)和[实际线上冻结](rust-r4def/g1-online07.json)，从同一冻结基线三线进入G2。联合目标完整契约293操作/624schemas不等于运行交付；当前Rust210、本批交付0。前述G0/G1准备为历史时点，当前以[状态索引](rust-r4def-delivery-status.json)为准。本批最终仅可收口#107/#108/#109/#106，#101/#57保持Open。\n');
console.log(JSON.stringify({ stage: status.stage, G2Authorized: true, newDelivery: 0, productChanged: false }));
