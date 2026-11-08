import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private';
const unc = '//wsl.localhost/Debian', sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = (file, expected) => { const bytes = fs.readFileSync(unc + file); assert.equal(sha(bytes), expected); return { value: JSON.parse(bytes), file, rawBytesSha256: expected, bytes: bytes.length }; };
const prefix = privateRoot + '/business/g2-business12/main01/';
const stage = pin(prefix + '006185-shared58-stage-complete.json', 'f7378ea915ddeca66809eb5f03e0db8fe9ab6be28b0f154439a8223d57a9ee08');
const race = pin(prefix + '006184-shared58-race-verified.json', 'b9ae6c5a143b1ae7015c40447d02d66827d37926f2f6abc70562b6c4e1fdfbb0');
const body = stage.value; assert.equal(body.branch, 'stage'); assert.equal(body.inventory.length, 87); assert.equal(body.failures.length, 87);
assert.equal(body.finalSuccess.status, 201); assert.equal(body.finalSuccess.postconditions, 'verified');
for (const failure of body.failures) { const bytes = fs.readFileSync(unc + failure.observation.file); assert.equal(sha(bytes), failure.observation.rawBytesSha256); const value = JSON.parse(bytes); assert.equal(value.failed.fault.hitCount, 1); assert.equal(value.failed.fault.fallbackHitCount, 0); assert.equal(value.rollback.allBusinessAuditSecurityRowsAndXminUnchanged, true); }
assert.equal(race.value.actualOrderedWaiterChain, true); assert.equal(race.value.captureStale409, true); assert.equal(race.value.oldCorrectionBodyUnchanged, true); assert.equal(race.value.loserRawTouch, null); assert.equal(race.value.loserRawTouchAttribution, null);
const transaction = body.finalSuccess.transaction;
const result = { kind: 'Root-actual-Source12-implicit-shared-stage-and-capture-race95', producer: { API: 135, productSources: 406,
  sourcePinsSHA256: '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa', binarySHA256: 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff', businessHelpersAtExecution: 152 },
  stage: { file: stage.file, bytes: stage.bytes, rawBytesSha256: stage.rawBytesSha256 }, race: { file: race.file, bytes: race.bytes, rawBytesSha256: race.rawBytesSha256 },
  actualMandatoryFailureFamilies: 87, eachPrimaryHits: 1, eachFallbackHits: 0, allFullRollbacksVerified: true,
  sameBodyCorrectionStatus: 201, concurrentCaptureStatus: 409, concurrentCaptureCode: 'operating_preparation_changed',
  actualSecondAffectedProjectWaiterVerified: body.secondaryProbeAttempt.phase === 'verified', actualOrderedHeadAndProjectWaiterChain: true,
  actualTargets: body.scope.sharedFacts.targets.length, actualProjects: body.scope.sharedFacts.projects.length,
  commonBusinessXmin: transaction.actualCommonOuterXmin, necessaryWriteMatches: transaction.writes.length,
  distinctMatchedRows: new Set(transaction.writes.map(row => row.table + ':' + JSON.stringify(row.key))).size,
  sourcePendingNotCopied: body.finalSuccess.semantics.sourcePendingNotCopied, actualCashCheckedAgainstEachRealWindow: true,
  taxBranch: 'partial-real-producer-and-one-successful-G; Main-G409-reconciled-without-replay; no Tax correction certified',
  laterUI157HelperGraphIsSeparate: true, old81ReadOnlyFailurePreserved: true, formalRust: 240, newCertifiedDelivery: 0, G3Certified: false, G4Certified: false };
const file = root + '/docs/design/rust-r4ghi/shared-stage95-actual.json'; fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file, rawBytesSha256: sha(fs.readFileSync(file)), actualFailureFamilies: 87, sameBody201AndCapture409: true,
  necessaryWriteMatches: result.necessaryWriteMatches, distinctMatchedRows: result.distinctMatchedRows, commonBusinessXmin: result.commonBusinessXmin, G3Certified: false }));
