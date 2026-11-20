// FS-only proposal output in H WT. Never calls prepare/collect/context or Root writers.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), sha = value => createHash('sha256').update(value).digest('hex');
const oldFile = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/dom14-source12-04-prepare-input16.json', bytes = fs.readFileSync(oldFile), original = JSON.parse(bytes), next = structuredClone(original);
assert.equal(original.kind, 'prepare-real-ui16-plan'); assert.equal(original.purpose, 'dom'); assert.equal(original.plan.uiRun, 'dom14-source12-04'); assert.equal(original.plan.cases.length, 6); assert.equal(original.plan.writeActions.length, 3);
const creator = original.plan.cases.filter(value => value.kind === 'creator'); assert.equal(creator.length, 1); const removed = original.plan.writeActions.filter(value => value.kind === 'creator'); assert.equal(removed.length, 1);
next.plan.cases = original.plan.cases.map(value => value.kind === 'creator' ? { ...value, kind: 'creator-assigned-readback' } : structuredClone(value)); next.plan.writeActions = original.plan.writeActions.filter(value => value.kind !== 'creator');
assert.deepEqual(next.plan.cases.filter(value => value.kind !== 'creator-assigned-readback'), original.plan.cases.filter(value => value.kind !== 'creator'));
assert.deepEqual(next.plan.writeActions.map(value => value.kind), ['execution-owner', 'own-condition']); assert.deepEqual(next.plan.writeActions, original.plan.writeActions.filter(value => value.kind !== 'creator'));
next.plan.uiRun = 'dom14-source12-05'; for (const [key, value] of Object.entries(next.plan.paths)) { assert(value.includes(original.plan.uiRun)); next.plan.paths[key] = value.replaceAll(original.plan.uiRun, next.plan.uiRun); }
for (const [key, value] of Object.entries(next.plan.relay24.paths)) { assert(value.includes(original.plan.uiRun)); next.plan.relay24.paths[key] = value.replaceAll(original.plan.uiRun, next.plan.uiRun); }
next.plan.sourceBases = []; delete next.plan.metadata16;
// Root must materialize the new20/corrective closure after29 promotion. The
// raw pin cannot be defaulted to the old04 corrective closure or origin109.
next.promotedToolClosure = { file: null, rawBytesSha256: null };
assert.deepEqual(next.plan.cookieScopeProof, original.plan.cookieScopeProof); assert(!Object.hasOwn(next.plan, 'actorProofKeys'));
const output = 'ui05-prepare-input30.unbound.json'; fs.writeFileSync(here + '/' + output, JSON.stringify(next, null, 2) + '\n', { flag: 'wx' });
const audit = { kind: 'H-FS-only-minimal04-to05-prepare-input-proposal', original: { file: oldFile.replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(bytes) }, proposed: { file: output, rawBytesSha256: sha(fs.readFileSync(here + '/' + output)) },
  retainedExactly: { fiveOtherCases: true, EOOwnTwoActions: true, sameActualBackendSourceAndProcessPinsAsReference: true, existingActualCookieScopeProofMetadata: true },
  changedOnly: ['creator case kind→creator-assigned-readback', 'remove Creator writeAction', 'uiRun/9runtime paths/3relay paths→new05', 'sourceBases cleared for actual post-promotion capture', 'metadata16 absent; new20 closure pin explicitly null'],
  actualCaptureStillRequired: ['Root29 exact promotion', 'new20 promotedToolClosure file/rawSHA', 'current helper/tool graph incl Native92/92-02 and29', 'all sourceBases + actual dist leaves/Node identities', 'current eth0/browser/runtime checks', 'fresh current-auth actor proofs and final binding', 'new05 approval/ready nonce/process/relay'],
  executableAsDelivered: false, original04Changed: false, old04ChangedToPassed: false, prepareCollectContextHTTPBrowserExecuted: false, RootWritten: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(here + '/audit30.json', JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ originalSHA256: sha(bytes), candidateSHA256: audit.proposed.rawBytesSha256, otherCasesPreserved: 5, writeActionsPreserved: 2, executable: false }));
