import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private';
const unc = '//wsl.localhost/Debian' + privateRoot;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const definitions = [
  ['noop73', '004533-noop73-complete.json', 'b8a4fae41a77bcde4c882bd52d1225029970ddf4f41a7084d76b48098c8fe5ca'],
  ['restatementRead78', '005237-restatement-readback78-complete.json', '370ae575df67316249ee00ac9820a9bdbc9f07f1c782e8928c3cff59d24a0da5'],
  ['crossParent57', '005238-a07-cross-parent-complete.json', '5c5c7ee9436032b80a2b5d07aa82e92d4b93be3f8061c9ce9bb9e84096447e12'],
  ['requiredSensitiveGET57', '005281-a07-sensitive-get-complete.json', '1c631388bb1a41becb3d6ae0932206253129b38954f3dc5858be26ed677abc6d'],
  ['twoTaskPreparation57', '005298-a07-prepare-two-task-complete.json', '43c02342909f9f300c229db6fc3c612d49bb12882a10859d7787a2f159bf7553'],
  ['differentTasks57', '005381-a07-different-tasks-complete.json', '06cdc2b02cb88c343cbb6b536129427876c5cf5af0ba131a69f3a01086a904ee'],
  ['receiptOriginalTerms66', '005501-c-terms66-proof.json', '9eb0b719d34beda8e63b17274726630ed513dbaf5c435e51cf7d3d11fd23948e'],
];
const receipts = {};
for (const [key, leaf, expected] of definitions) {
  const bytes = fs.readFileSync(unc + '/business/g2-business12/main01/' + leaf); assert.equal(sha(bytes), expected);
  const value = JSON.parse(bytes); assert.notEqual(value.G3Certified, true); assert.notEqual(value.G4Certified, true);
  receipts[key] = { file: privateRoot + '/business/g2-business12/main01/' + leaf, bytes: bytes.length, rawBytesSha256: expected, kind: value.kind };
}
const c = JSON.parse(fs.readFileSync(unc + '/business/g2-business12/main01/005501-c-terms66-proof.json'));
assert.equal(c.actualFailedControlSQLSTATE, '55P03'); assert.equal(c.originalTermXminUnchanged, true);
assert.equal(c.allUnrelatedRowsXminCatalogSequencesObjectsUnchanged, true);
const preflight = JSON.parse(fs.readFileSync(root + '/tmp/rust-r4ghi/root/ui-preflight81/receipt.json'));
assert.equal(preflight.status, 'passed'); assert.equal(preflight.HTTPExecuted, false);
const output = { kind: 'Root-actual-current-source12-acceptance-progress86', candidateAPI: 135,
  sourcePins: { count: 406, sha256: '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa' },
  binarySHA256: 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff', migrations: 97, tablesPerDatabase: 139,
  receipts, readbackBoundary: { producerAPI: 134, readAPI: 135, historicalListGETs: 2, historicalDetailGETs: 3, oldPOSTReplayed: false },
  A07: { crossParent404: true, foreignProjectEvidence409: true, wrongResponsibleOwner403: true,
    requiredMaskedGETAuditFailure500WithoutProtectedPayloadAndRollback: true,
    differentTasksConcurrent200And409ThenFreshParentRetry: true, originalConditionalConclusionPreserved: true,
    ownSpareTaskAStillRequiresRealUI: true, ownSpareTaskBRaceStillPending: true },
  C: { actualOriginalTermsWaitOnConfirmation: true, actualControlSQLSTATE: c.actualFailedControlSQLSTATE,
    originalTermsUnchanged: true, receiptBasisAuditSameBusinessXmin: c.actualSharedBusinessXmin,
    allUnrelatedRowsXminCatalogSequencesObjectsUnchanged: true, SQLTermsOrTaxFactsSubmitted: false },
  browser: { actualAcceptedCases: 0, firstPreflightFailedBeforeBrowserOrBusinessHTTP: true,
    secondRunFailedOnWindowsToWSLLocalhostBeforeFirstCase: true, correctedPowerShell7ACLPreflight: 'actual-passed',
    remaining: 'fresh exact-bound TCP-relay run; no global network configuration change' },
  unregisteredParentLockMigration: 'candidate only; no DDL applied and no M98 certification',
  toolPureTests: { node: 'v24.19.0', passed: 103, failed: 0 },
  formalDeliveredOperations: 240, newCertifiedDelivery: 0, G3Certified: false, G4Certified: false,
  periodAcceptance: { status: 'wait-for-natural-qualified-period', earliestHongKong: '2026-11-09T00:00:00+08:00', historicalOrClockFabrication: false },
  keepIssuesOpen: [57, 101, 110, 111, 112, 113, 114, 116, 117] };
const file = root + '/docs/design/rust-r4ghi/current-source12-acceptance86.json';
fs.writeFileSync(file, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file, rawBytesSha256: sha(fs.readFileSync(file)), actualReceipts: definitions.length, acceptedDOMCases: 0, newCertifiedDelivery: 0, G3Certified: false }));
