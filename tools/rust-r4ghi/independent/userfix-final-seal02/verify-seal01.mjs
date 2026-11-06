import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const root = resolve('.');
const out = 'tools/rust-r4ghi/independent/userfix-final-seal02';
const seal = 'd5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5';
const certPath = 'tools/rust-r4ghi/independent/userfix-final/g4-actual-review01.json';
const expectedHash = 'a3656dd231f41419be680bc5b8f163993ae70fc9c48025a78912c15767b1cd6f';
const protectedOpen = [57, 101, 110, 111, 112, 113, 114, 116, 117];
const repo = 'repos/illusion-tech/poms';
const sha256 = b => createHash('sha256').update(b).digest('hex');
const checks = [];
const calls = [];
const expect = (label, passed, observed) => checks.push({ label, passed: Boolean(passed), observed });
function save(rel, bytes) {
  const p = resolve(root, out, rel);
  if (!p.startsWith(resolve(root, out) + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'))) throw new Error('write outside owned directory');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, bytes, { flag: 'wx' });
  return { file: `${out}/${rel}`, bytes: bytes.length, rawBytesSha256: sha256(bytes) };
}
async function run(label, exe, args) {
  const capturedAt = new Date().toISOString();
  const result = await new Promise((ok, fail) => {
    const p = spawn(exe, args, { cwd: root, shell: false, windowsHide: true });
    const stdout = [], stderr = [];
    p.stdout.on('data', b => stdout.push(b));
    p.stderr.on('data', b => stderr.push(b));
    p.on('error', fail);
    p.on('close', exitCode => ok({ exitCode, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }));
  });
  const call = {
    label, capturedAt, exe, args, exitCode: result.exitCode,
    stdout: save(`raw/${label}-stdout${exe === 'gh' ? '.json' : '.bin'}`, result.stdout),
    stderr: save(`raw/${label}-stderr.txt`, result.stderr),
  };
  calls.push(call);
  expect(`${label}:exit`, result.exitCode === 0, result.exitCode);
  return result;
}
const json = r => JSON.parse(r.stdout.toString('utf8'));
const gh = async (label, endpoint) => json(await run(label, 'gh', ['api', '--method', 'GET', endpoint]));
const sealPublicationPath = 'tmp/rust-r4ghi/root/userfix-seal-main01.json';
const finalLinksPath = 'tmp/rust-r4ghi/root/userfix-final-links01/receipt.json';
const sealPublicationBytes = readFileSync(sealPublicationPath);
const finalLinksBytes = readFileSync(finalLinksPath);
const publication = JSON.parse(sealPublicationBytes);
const finalLinks = JSON.parse(finalLinksBytes);
const inputs = [
  save('inputs/userfix-seal-main01.json.bin', sealPublicationBytes),
  save('inputs/userfix-final-links01-receipt.json.bin', finalLinksBytes),
];
expect('publication exact Seal', publication.commit === seal && publication.remoteMain === seal && publication.remoteFeature === seal && publication.G4Certified === true, publication);
expect('final receipt exact Seal/certificate/scope', finalLinks.seal === seal && finalLinks.certificateSHA256 === expectedHash && JSON.stringify(finalLinks.closed) === '[115]' && JSON.stringify(finalLinks.protectedOpen) === JSON.stringify(protectedOpen), { seal: finalLinks.seal, certificateSHA256: finalLinks.certificateSHA256, closed: finalLinks.closed, protectedOpen: finalLinks.protectedOpen });
const rootReceiptOriginals = finalLinks.calls.map(c => {
  const b = readFileSync(c.file);
  const actual = sha256(b);
  expect(`root receipt original ${c.label}`, c.exitCode === 0 && actual === c.rawBytesSha256, { expected: c.rawBytesSha256, actual });
  return { file: c.file, bytes: b.length, rawBytesSha256: actual };
});
const [headRun, branchRun, gitCertRun, main, feature, commit, remoteCert, ...issuePayloads] = await Promise.all([
  run('local-head', 'git', ['rev-parse', 'HEAD']),
  run('local-branch', 'git', ['branch', '--show-current']),
  run('git-seal-certificate', 'git', ['show', `${seal}:${certPath}`]),
  gh('main', `${repo}/git/ref/heads/main`),
  gh('feature', `${repo}/git/ref/heads/codex/poms-r4ghi-next25`),
  gh('seal-commit', `${repo}/commits/${seal}`),
  gh('seal-certificate-content', `${repo}/contents/${certPath}?ref=${seal}`),
  ...[115, ...protectedOpen].map(n => gh(`issue-${n}`, `${repo}/issues/${n}`)),
]);
const localHead = headRun.stdout.toString('utf8').trim();
const localBranch = branchRun.stdout.toString('utf8').trim();
expect('local HEAD at requested Seal', localHead === seal, localHead);
expect('main HEAD at requested Seal', main.object.sha === seal, main.object.sha);
expect('feature HEAD at requested Seal', feature.object.sha === seal, feature.object.sha);
expect('Seal commit permalink resolves', commit.sha === seal && commit.html_url === `https://github.com/illusion-tech/poms/commit/${seal}`, { sha: commit.sha, html_url: commit.html_url });
const localCertBytes = readFileSync(certPath);
const remoteCertBytes = Buffer.from(remoteCert.content.replace(/\s/g, ''), 'base64');
const localCert = save('inputs/certificate-local.json.bin', localCertBytes);
const remoteCertInput = save('inputs/certificate-remote-decoded.json.bin', remoteCertBytes);
expect('local certificate SHA256', localCert.rawBytesSha256 === expectedHash, localCert);
expect('Seal git object certificate same bytes', gitCertRun.stdout.equals(localCertBytes), { gitHash: sha256(gitCertRun.stdout), expectedHash });
expect('remote immutable certificate same bytes', remoteCertBytes.equals(localCertBytes) && remoteCertInput.rawBytesSha256 === expectedHash, { sha: remoteCert.sha, contentHtmlURL: remoteCert.html_url, decoded: remoteCertInput });
const actualCertificate = JSON.parse(localCertBytes);
expect('actual certificate identifies #115 G4 Pass', actualCertificate.issue === 115 && actualCertificate.gate === 'G4' && actualCertificate.decision === 'Pass' && actualCertificate.actualOnlineG4Certified === true, { issue: actualCertificate.issue, gate: actualCertificate.gate, decision: actualCertificate.decision, actualOnlineG4Certified: actualCertificate.actualOnlineG4Certified });
const issues = issuePayloads.map(i => ({ number: i.number, state: i.state, stateReason: i.state_reason, htmlURL: i.html_url, updatedAt: i.updated_at }));
expect('only requested child #115 Closed/completed', issues[0].number === 115 && issues[0].state === 'closed' && issues[0].stateReason === 'completed', issues[0]);
for (const n of protectedOpen) {
  const i = issues.find(v => v.number === n);
  expect(`protected issue #${n} remains Open`, i?.state === 'open', i);
}
const commitURL = `https://github.com/illusion-tech/poms/commit/${seal}`;
const certURL = `https://github.com/illusion-tech/poms/blob/${seal}/${certPath}`;
const comments = await Promise.all(finalLinks.comments.map(async c => {
  const live = await gh(`seal-comment-${c.number}`, `${repo}/issues/comments/${c.id}`);
  const label = `comment-readback-${c.number}`;
  const localRecord = finalLinks.calls.find(v => v.label === label);
  const local = JSON.parse(readFileSync(localRecord.file));
  expect(`final #${c.number} comment exact location/body/Seal links`, live.html_url === c.url && live.issue_url.endsWith(`/issues/${c.number}`) && live.body === local.body && live.body.includes(commitURL) && live.body.includes(certURL) && live.body.includes(expectedHash), { id: live.id, htmlURL: live.html_url, unchangedBody: live.body === local.body, hasCommitURL: live.body.includes(commitURL), hasCertificateURL: live.body.includes(certURL), hasCertificateSHA256: live.body.includes(expectedHash) });
  const issue = issuePayloads.find(i => i.number === c.number);
  expect(`final #${c.number} issue body includes accessible immutable Seal/certificate links`, issue.body.includes(commitURL) && issue.body.includes(certURL), { number: c.number, hasCommitURL: issue.body.includes(commitURL), hasCertificateURL: issue.body.includes(certURL) });
  return { number: c.number, id: live.id, htmlURL: live.html_url, bodySHA256: sha256(Buffer.from(live.body, 'utf8')), updatedAt: live.updated_at };
}));
const pass = checks.every(c => c.passed);
const report = {
  kind: 'independent-issue115-final-seal-publication-addendum', gate: 'G4-publication-addendum',
  decision: pass ? 'Pass' : 'Needs-correction', capturedAt: new Date().toISOString(),
  reviewedSeal: seal, certificateSHA256: expectedHash,
  localHead, localBranch, remoteMain: main.object.sha, remoteFeature: feature.object.sha,
  inputs, rootReceiptOriginals, certificate: { local: localCert, remote: remoteCertInput, gitBlobSHA: remoteCert.sha },
  issues, comments, checks, calls,
  boundary: {
    supplementsExistingActualG4Certificate: true, productTestsRerun: false, databaseConnections: 0,
    githubWrites: 0, gitMutations: 0, productEdits: false, officialNewOperations: 0,
    GHIAndMinimumR5G1Certified: false, writableBoundary: `${out}/**`,
    Fast: 'unverified', requestedSubagentModel: 'gpt-6.1-sol', requestedReasoningEffort: 'max',
    runtimeModelIndependentlyVerified: false,
  },
};
save('review01.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
const summary = `# #115 最终 Seal 发布独立补充审查\n\n结论：**${report.decision}**。本次只核验既有 G4 证书的最终发布与补链，不重新签产品验收或联合 G1。\n\n- 本地、main 与 feature HEAD 均为 ${seal}。\n- 证书本地文件、Seal Git 对象和 GitHub 不可变 blob 解码后同字节，SHA-256 ${expectedHash}。\n- Root Seal 发布收据、最终补链收据及其 ${rootReceiptOriginals.length} 份引用原件哈希均已核对。\n- #115 Closed/completed；#${protectedOpen.join('/#')} 保持 Open。\n- #115/#57 最终补链评论按精确 ID 直接 GET 成功，正文与原收据一致；评论和 Issue 正文的不可变 commit/blob 链接均已验证。\n- 全部 ${checks.length} 项检查 ${pass ? '通过' : '存在失败，详见 review01.json'}；未重跑产品/DB，未进行 Git/GitHub 写操作。只追加本目录证据，旧原件不改。\n\n本批 G9/H8/I11/R5min4 的 32 项仍待正式联合 G1；Fast 未核实。\n`;
save('review01.md', Buffer.from(summary));
console.log(JSON.stringify({ decision: report.decision, checks: checks.length, failed: checks.filter(c => !c.passed), report: `${out}/review01.json`, summary: `${out}/review01.md`, remoteMain: report.remoteMain, remoteFeature: report.remoteFeature }, null, 2));
if (!pass) process.exitCode = 1;
