import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', authorRoot = 'E:/projects/worktrees/poms-r4h-signals/poms';
const relative = 'tools/rust-r4ghi/H/implementation/support-patches/independent-native92-review', author = authorRoot + '/' + relative;
const sha = b => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(author + '/manifest92-review.json'); assert.equal(sha(raw), 'e45c19b8dcefa039811d2fb01ab82198a1fa9118233da79a91cade25cd7fd893'); const m = JSON.parse(raw);
for (const p of m.files) { const b = fs.readFileSync(author + '/' + p.file); assert.equal(sha(b), p.rawBytesSha256); const dest = root + '/' + relative + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, b, { flag: 'wx' }); }
fs.writeFileSync(root + '/' + relative + '/manifest92-review.json', raw, { flag: 'wx' });
const lp = '/home/wangzishi/.local/share/poms-r4ghi/private/native-reference92/source12-native01', unc = '//wsl.localhost/Debian';
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(unc + file)) });
const actual17 = pin(lp + '/000043-modern17-proof.json'), conserved = pin(lp + '/cleanup92-02/000050-cleanup-proof.json');
assert.equal(actual17.rawBytesSha256, 'fd95fd07f45984786a55bd9f50be1698e1df5fe93982d55169778211c89ab284'); assert.equal(conserved.rawBytesSha256, '18580667d292d56267dcec01992f99a3dedb8cd3c034a90fe4c5828566baa3e5');
const before = JSON.parse(fs.readFileSync(unc + actual17.file)), cleanup = JSON.parse(fs.readFileSync(unc + conserved.file));
assert.equal(before.actualNative422Operations.length, 17); assert.equal(cleanup.allOriginalRowsXminCatalogSequencesObjectsEqualS0, true); assert.equal(cleanup.RustStateWritten, false);
const staticDir = root + '/tmp/rust-r4ghi/root/composed118', staticCheck = JSON.parse(fs.readFileSync(staticDir + '/receipt.json'));
assert(staticCheck.results.length === 4 && staticCheck.results.every(r => r.exitCode === 0 && r.sourceStable));
const testText = fs.readFileSync(staticDir + '/test-stdout.log', 'utf8'), results = [...testText.matchAll(/test result:.*?(\d+) passed; (\d+) failed; (\d+) ignored/g)];
const counts = results.reduce((a, r) => ({ passed: a.passed + Number(r[1]), failed: a.failed + Number(r[2]), ignored: a.ignored + Number(r[3]), suites: a.suites + 1 }), { passed: 0, failed: 0, ignored: 0, suites: 0 }); assert.deepEqual(counts, { passed: 535, failed: 0, ignored: 54, suites: 26 });
const doc = { kind: 'Root-actual-Native17-isolated-reference-and-bounded-conservation122', sourceStage: 'Source12/API135/M97', actualNativeHTTP: { auth200: 3, dedicatedProtocol422: 17, businessProducer: false },
  native17: actual17, nativeProcess: pin(lp + '/process.json'), nativeProcessStopped: pin(lp + '/process-stopped.json'), cleanupOnlyPlan: pin(lp + '/cleanup-plan92-02.json'), conservation: conserved,
  originalLauncher: { readinessDeadlineSeconds: 20, initialDeadlineResult: 'failed', laterReadiness: 'same-owned-PID-verified-before-authentication', processRestarted: false },
  originalCleanup: { status: 'failed-before-delete-intent', existingSnapshot44Preserved: true, cookieDerivedAnchorWasReclassifiedByGenericLedger: true, JSONSessionIDClaimed: false },
  independentReview: { file: relative + '/manifest92-review.json', rawBytesSha256: sha(raw) },
  protocolAndCleanupGraphsKeptSeparate: { originalProtocolHelpers: 164, cleanupHelpers: 165 }, allOriginalNativeAndRustRowsAndXminConserved: true, onlyNewNativeSessionDeleted: true,
  originalNative17OrFailedCleanupRelabelled: false, RustDeliveryOperationsAdded: 0,
  isolatedUnappliedComposition106: { checkReceipt: 'tmp/rust-r4ghi/root/composed118/receipt.json', checkReceiptSHA256: sha(fs.readFileSync(staticDir + '/receipt.json')), checks: ['fmt', 'clippy', 'test', 'build'], tests: counts,
    productFilesApplied: false, M98Applied: false, Source13Certified: false }, G3Certified: false, G4Certified: false };
const file = root + '/docs/design/rust-r4ghi/native122-actual-and-conservation.json'; fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ document: file, rawBytesSha256: sha(fs.readFileSync(file)), actualNative422: 17, conserved: true, newRustDelivered: 0 }));
