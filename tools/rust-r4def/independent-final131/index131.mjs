// Small independent review index; never executes acceptance or cleanup runners.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
assert.equal(path.resolve(process.cwd()).toLowerCase(), path.resolve(root).toLowerCase());
const out = 'tools/rust-r4def/independent-final131';
const sha = b => createHash('sha256').update(b).digest('hex');
const read = f => { assert(!f.includes('/private/') && !f.includes('..') && !path.isAbsolute(f)); return fs.readFileSync(path.join(root, f)); };
const json = f => JSON.parse(read(f));
const pin = f => { const b = read(f); return { file: f, bytes: b.length, sha256: sha(b) }; };
const m89 = json('tmp/rust-r4def/independent/g3-stable-prep89-inputs01/manifest89.json');
const authority = m89.pins.filter(p => p.category === 'current-public-authority').map(p => {
  const current = pin(p.file); return { ...current, priorSha256: p.sha256, match: current.sha256 === p.sha256 };
});
assert(authority.every(p => p.match), 'unreviewed-authority-drift');
const deletionList = json('tmp/rust-r4def/root/linux-deletions67.json');
const deletionReceipt = json('tmp/rust-r4def/root/linux-deletions67-receipt.json');
assert.equal(sha(read('tmp/rust-r4def/root/linux-deletions67.json')), deletionReceipt.inputSha256);
assert.deepEqual(deletionList.files, deletionReceipt.finalDeletedFiles);
const absent = deletionList.files.map(file => {
  assert(file.startsWith('libs/shared/api-client/model/'));
  assert(!fs.existsSync(path.join(root, file)));
  const basename = path.basename(file, '.ts');
  assert(!read('libs/shared/api-client/.openapi-generator/FILES').toString().includes(path.basename(file)));
  assert(!read('libs/shared/api-client/model/models.ts').toString().includes(basename));
  assert(!json('tmp/rust-r4def/root/final-source126/manifest126.json').client.some(p => p.file === file));
  return { file, absentInCurrent616Client: true, absentInGeneratorFilesAndModelsIndex: true };
});
const deletion134File = 'tmp/rust-r4def/root/source-supplement134/receipt134.json';
assert.equal(pin(deletion134File).sha256, 'd80512b7cf3111285bf4fb567feaf034b45ad9e655bdf0b8e3f9543bb169c0a3');
const deletion134 = json(deletion134File);
assert.equal(deletion134.mainBase, '565661b9113372de4da6662a4a692fbfd2296dd6');
assert.equal(deletion134.literalHead, '287214fd95d7d954694002c6e95665ebf881929c');
assert.equal(deletion134.source126SHA256, '891a98bcaec490cf5ce9d65cf74064a449064e89593fdba2fe848a42d83ffaf0');
assert.deepEqual(deletion134.deleted.map(p => p.file), deletionList.files);
for (const p of deletion134.deleted) {
  assert(p.absent && !fs.existsSync(path.join(root, p.file)));
  assert.equal(pin(p.baseBlob.file).sha256, p.baseBlob.rawBytesSha256);
  assert.equal(pin(p.baseBlob.file).bytes, p.baseBlob.bytes);
}
const index = {
  kind: 'independent-R4DEF-final131-small-candidate-evidence-index', createdAtUtc: new Date().toISOString(),
  status: 'Candidate evidence verified; G3/G4 withheld pending actual terminal cleanup and closure',
  candidate: { literalHead: '287214fd95d7d954694002c6e95665ebf881929c', mainBase: '565661b9113372de4da6662a4a692fbfd2296dd6', commitState: 'Product working tree pending authorized Root commit after G3', literalHeadRequeryByReviewer: false },
  evidence: [
    ['stable-business-and-contract', 'tmp/rust-r4def/independent/g3-stable-preflight89.json'],
    ['K98-code-fix', 'tmp/rust-r4def/independent/k98-code-preflight100.json'],
    ['K98-runtime-single-autoLink-and-four-barriers', 'tmp/rust-r4def/independent/k98-runtime-preflight114.json'],
    ['late116-public-components', 'tmp/rust-r4def/independent/late116-review120.json'],
    ['K78-and-multi-autoLink-and-actual-reader', 'tmp/rust-r4def/independent/K-evidence-review124.json'],
    ['exact-source-freeze', 'tmp/rust-r4def/root/final-source126/manifest126.json'],
    ['fresh-independent-pin-revalidation', out + '/preflight131.json'],
    ['runtime-stopped', 'tmp/rust-r4def/root/stopped128.json'],
    ['Windows-ui-port-release', 'tmp/rust-r4def/root/windows-ui-port129.json'],
    ['historical-client-deletion-list', 'tmp/rust-r4def/root/linux-deletions67.json'],
    ['historical-client-deletion-receipt', 'tmp/rust-r4def/root/linux-deletions67-receipt.json'],
    ['final-deletion-inventory-relative-main565', deletion134File],
  ].map(([scope, file]) => ({ scope, ...pin(file) })),
  unchangedAuthorityFrom89: authority,
  deletionSupplement: { historicalBase: deletionList.base, finalMainBase: deletion134.mainBase, currentAbsence: absent, current616ClientExactMembershipVerified: true, relativeMain565FinalDeletedListVerified: true, baseBlobVerified: true },
  measuredCoverage: { positive: { D: 7, E: 11, F: 12, total: 30 }, rejected: 94, effectiveCostRaces: 10, originalUIRuns: [64, 66], finalRustPassed: 416, finalRustIgnoredNotDB: 54, Native: { suites: 74, tests: 863 }, Admin: { suites: 60, tests: 417 }, fullSpec: { paths: 239, operations: 293, schemas: 626 }, generatedClient: 616, permanentS4Guards: 6, K78CriticalLocalCases: 16, K78NecessaryFaults: 12, K78Retries: 12, K78ExactPayloadRetries: 11, actualBatchAutoLinks119: 14, actualReader121: [63, 65], actualReaderRestore64: true },
  retainedClassification: { originalORMCheckExit: 1, ORMFiniteClassification: 'Preserved exact SQL-only scopedFK/CHECK/introspection/comment categories; no blanket ignore', late115OrEarlyLate116Visibility: 'Superseded by separate readback117; originals retained', read120WrongExpectation400: 'Failed observer expectation retained; actualReader121 separately accepted', K78AbortRetry: 'Same operation/target with changed reason; only11 exact parsed bodies', deferredCommit: 'Actual application Unknown-retain; packet-lost ACK not exercised', optionalBrowserLateAttachmentFailure: 'Not run; helper/static evidence only' },
  excluded: ['S3/external presigned runtime', 'packet-lost COMMIT ACK', 'unexecuted pool/config/error variants', 'R5 effective commission role freeze/execution', 'broader R6', 'deployment/cutover'],
  requiredForG3: ['Exact cleanup plan+public producer perPK/fingerprint ledger and scope review', 'Actual single-transaction cleanup COMMIT receipt and exact affected counts', 'Two fresh post-cleanup no-op receipts with120table/532row/94migration and DDL/immutable-trigger baseline comparison', 'Exact three borrowed-original restore/CAS proof', 'Owned objects backup hash, exact key unlink and failure/Unknown residual handling', 'Owned PG final process/port/resource stop proof', 'Exact raw final source recheck after cleanup'],
  requiredForG4: ['Actual committed/main delivery identity and clean/check receipt for delivered boundary', 'Formal governance/archive/index/writeback artifacts', 'Live issue106/107/108/109 actual checklist+closeout receipts;101/57 remainOpen'],
  newProductFindingsP0P1P2: [], G3Pass: false, G4Pass: false, issueClosure: false,
  reviewer: { productOrOldEvidenceModified: false, privateRead: false, DBHTTPGitGHExecuted: false, writesOnly: out + '/**' },
};
fs.writeFileSync(path.join(root, out, 'candidate-index131.json'), JSON.stringify(index, null, 2) + '\n', { flag: 'wx' });
const text = `候选产品与既有独立证据可有界复用；最终 G3/G4 尚未签署。\n\n本次已重验2216个稳定snapshot、114的306 pins、124的504 pins；126的156产品、616客户端、1431正式输入、3运行输入、6保护源、13回执与当前文件一致。105/106/108各247输入匹配，exit0。旧稳定输入仅service/store两差异，由最终K链覆盖。当前公共authority15项无漂移。\n\n134已补齐相对main565的实际删除清单：唯一旧client模型404字节，base原blob SHA与67一致，当前文件确实不存在；616客户端完整成员及生成器FILES/models索引均不含它。\n\nG3等待实际terminal cleanup及精确终态；G4还需实际提交/主线、归档、索引与Issue收口回执。128/129是当时API/UI已停的历史证明，128明确ownedPG仍保留；Root已指出WSL随后重启，因此cleanup须重新核当前实例/容器、quiet全图与同事务准入。验收覆盖、失败/部分/未跑边界与待验文件详见同名JSON。\n`;
fs.writeFileSync(path.join(root, out, 'candidate-index131.md'), text, { flag: 'wx' });
const template = { kind: 'independent-R4DEF-final131-gate-template-only', templateOnly: true, status: 'Pending actual terminal and G4 evidence', G3Pass: false, G4Pass: false, issueClosure: false, candidateManifest: pin('tmp/rust-r4def/root/final-source126/manifest126.json'), candidateIndex: pin(out + '/candidate-index131.json'), terminalEvidence: [], finalDiffAndDeletionReceipt: null, actualProductCommit: null, actualMainIdentity: null, actualGovernanceWriteback: null, actualIssueReadback: null, findingsP0P1P2: [], boundaries: index.excluded, next: 'Create a separately named sealed conclusion only after observed actual evidence. Never mutate earlier evidence.' };
fs.writeFileSync(path.join(root, out, 'gate-template131.json'), JSON.stringify(template, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ index: pin(out + '/candidate-index131.json'), note: pin(out + '/candidate-index131.md'), template: pin(out + '/gate-template131.json'), authorityCurrent: authority.length, absent, G3Pass: false, G4Pass: false }) + '\n');
