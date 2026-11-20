import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', lr = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex');
const pin = relative => { const raw = fs.readFileSync(root + '/' + relative); return { file: relative, bytes: raw.length, rawBytesSha256: sha(raw) }; };
const goodRuns = [['dom14-source12-06a', 'receipt14.json'], ['dom14-source12-06b', 'receipt10.json'], ['role18-source12-03', 'receipt18-05.json'], ['expense18-source12-02', 'receipt18-04.json'], ['role18-source12-frozen01', 'receipt18-05.json'], ['lifecycle18-source12-02', 'receipt18-03.json'], ['gh18-source12-04', 'receipt18-06.json']];
const evidence = [];
for (const [run, proposedLeaf] of goodRuns) {
  const folder = root + '/tmp/rust-r4ghi/root/ui-runtime14/' + run, names = fs.readdirSync(folder).filter(name => /^receipt.*\.json$/.test(name)); assert.equal(names.length, 1); const leaf = names[0];
  const relative = 'tmp/rust-r4ghi/root/ui-runtime14/' + run + '/' + leaf, receipt = JSON.parse(fs.readFileSync(root + '/' + relative)); assert(receipt.cases.length && receipt.cases.every(test => test.status === 'passed'));
  const counts = {}; for (const exchange of receipt.exchanges) { const key = exchange.method + ':' + exchange.status; counts[key] = (counts[key] ?? 0) + 1; }
  evidence.push({ run, receipt: pin(relative), actualSourceBinding: receipt.actualSourceBinding, observedStatus: receipt.status, observedAllA08FormsPassed: receipt.allA08FormsPassed ?? null,
    cases: receipt.cases.map(test => ({ kind: test.kind, status: test.status, actualWriteObserver: test.actualWriteObserver ?? [], businessWritePerformed: test.businessWritePerformed ?? null,
      actualFormGroups: test.actualFormGroups ?? null, baselineCreatedInThisRun: test.baselineCreatedInThisRun ?? null, actualFrozenH08: test.actualFrozenH08 ?? null, role03RetroactivePostReadClaimed: test.role03RetroactivePostReadClaimed ?? null })), actualHTTPCounts: counts, observerCount: receipt.observerReceipts.length });
}
const failures = [['gh18-source12-02', 'receipt18-06.json'], ['gh18-source12-03', 'receipt18-06.json'], ['lifecycle18-source12-01', 'receipt18-03.json']].map(([run, leaf]) => {
  const relative = 'tmp/rust-r4ghi/root/ui-runtime14/' + run + '/' + leaf, receipt = JSON.parse(fs.readFileSync(root + '/' + relative)); assert.equal(receipt.status, 'failed'); return { run, original: pin(relative), stillFailed: true, acknowledgedBusinessWrites: receipt.cases.flatMap(test => test.actualWriteObserver ?? []) };
});
const indexFile = priv + '/retention/epoch12-before-source13-139/index.json', indexRaw = fs.readFileSync(indexFile); assert.equal(sha(indexRaw), 'fed889a2c467945656d7c317f006b5ba2bc9780435459460863b3735dacb17b7'); const index = JSON.parse(indexRaw);
const stateRaw = fs.readFileSync('//wsl.localhost/Debian' + index.frozenState.file); assert.equal(sha(stateRaw), index.frozenState.rawBytesSha256); const state = JSON.parse(stateRaw), eo = state.fixtures.uiFixtureViews23.eo.pause.result.projectId;
assert(state.fixtures.uiFixtureViews23.eo.UICommandObserved && state.fixtures.uiFixtureViews23.own.UICommandObserved && state.fixtures.uiFormFixtureViews18['role-create'].UICommandObserved && state.fixtures.uiFormFixtureViews18['gh-capture'].UICommandObserved);
assert(state.uiExpense18Receipts[eo] && state.uiLifecycle18Receipts[eo]);
const output = { kind: 'Root-actual-Source12-tail-UI-and-original-data-retention170', sourceEpoch: 'g2-business12', sourceCount: 406, sourcePinsSHA256: sha(JSON.stringify(state.sourcePins)),
  evidence, failedOriginalsPreserved: failures, continuationBoundaries: { roleOriginalCreate02NotReplayed: true, roleFreeze03PlusIndependentPeer409AndColdReadbackSeparated: true, roleBusinessVersion: 1, roleRowVersion: 2, GHBaseline03KeptAndThreeRemainingForms04ActuallyExecuted: true,
    EOOriginalStartExecutionNotReplayed: true, lifecycle02ActualEvidenceUploads: 3, finalAcceptanceOnlyCompletion: true }, source12TailUIDriverCompletionGuards: true, noAggregateRunRetroactivelyRelabelledAllA08Passed: true,
  retention: pin('docs/design/rust-r4ghi/retained-source12-before-source13-139.json'), sourcePacket: pin('docs/design/rust-r4ghi/retention/final12-source140/receipt.json'), privateIndex: { file: indexFile.replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(indexRaw) },
  migrationBeforeCandidate: index.retainedSnapshot, actualSource12FrozenState: index.frozenState, archiveCount: index.archives.length, objectCopies: index.objects.length, retainedHelperAndLauncherFiles: index.helperSources.length,
  retainedProcess: index.activeExecution, originalM97Baseline: index.baseline, originalDatabaseVolumeKept: true, databaseRestoreExecuted: false, archiveTOCOnlyNotRestoreOrPortableXminCertification: true,
  Source13OrM98Applied: false, periodPositiveAccepted: false, waitingNaturalHongKong: '2026-11-09T00:00:00+08:00', historicalBaselineAutomaticSelectionApproved: false, formalRustDelivered: 240, newlyCertified: 0, G3Certified: false, G4Certified: false, mainMergeOrDeploymentPerformed: false };
const file = 'docs/design/rust-r4ghi/source12-tail170-actual.json', raw = Buffer.from(JSON.stringify(output, null, 2) + '\n'); fs.writeFileSync(root + '/' + file, raw, { flag: 'wx' });
const statusFile = root + '/docs/design/rust-r4ghi-delivery-status.json', status = JSON.parse(fs.readFileSync(statusFile)); status.currentCorrective.currentAPI = 1351; status.currentCorrective.currentAPIStopped = true; status.currentCorrective.currentCandidate = { file: index.activeExecution.activeCandidate.file, rawBytesSha256: index.activeExecution.activeCandidate.rawBytesSha256 }; status.currentCorrective.sameSourceProcessRestart = 'rust-r4ghi/process1351-recovery161-actual.json';
status.currentUIValidation.source12TailEvidence = 'rust-r4ghi/source12-tail170-actual.json'; status.currentUIValidation.boundCaseResultsRecorded = true; status.currentUIValidation.realDOMPassed = false; status.currentUIValidation.certificationBoundary = 'Recorded separate Source12 runs; unified Source13 and natural-period acceptance still required';
status.currentCorrective.source12Retained139 = 'rust-r4ghi/retained-source12-before-source13-139.json'; fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
console.log(JSON.stringify({ evidence: { file: lr + '/' + file, rawBytesSha256: sha(raw) }, completedRuns: evidence.length, failedOriginalsPreserved: failures.length, archiveCount: index.archives.length, objectCopies: index.objects.length, actualSource13StillAbsent: true, G3Certified: false }));
