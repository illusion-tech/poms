// FS-only projection against actual immutable70/53 originals. This constructs
// an explicitly non-mintable inspection envelope, never a consumer state/plan.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fixtureAdmissions54 } from './candidate/tools/rust-r4ghi/business/retained-admission54.mjs';
import { makeChainedAdmissions62 } from './candidate/tools/rust-r4ghi/business/registry-lineage62.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private', folder = `${privateRoot}/retention/epoch11-before-noop70`;
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const statePin = pin(`${folder}/state-at-retention70.json`), indexPin = pin(`${folder}/index.json`);
assert.equal(statePin.rawBytesSha256, '26b2409cc6f73f8950b9fb787711670ece9358c6c66cee0de1636c6ec273e20b'); assert.equal(indexPin.rawBytesSha256, 'caded55777d77919f3df48ce7a034eec3d1a05c859fd82149f2f76fc3b81e1db');
const state = JSON.parse(fs.readFileSync(statePin.file)), index = JSON.parse(fs.readFileSync(indexPin.file)), snapshot = JSON.parse(fs.readFileSync(index.retainedSnapshot.file));
assert.equal(pin(index.retainedSnapshot.file).rawBytesSha256, '27ee9578080b9ccf3d2a9ca3ede1b2f5420273c0eed4f0e11100728a12d19617');
const prior = state.consumerAdmission54.registry, previous = JSON.parse(fs.readFileSync(prior.file)); assert.equal(pin(prior.file).rawBytesSha256, prior.rawBytesSha256);
const digest = sha(JSON.stringify(state.sourcePins)), impactFile = fileURLToPath(new URL('./synthetic-inspection-impact62.json', import.meta.url));
const comparisonFile = fileURLToPath(new URL('./synthetic-inspection-comparison62.json', import.meta.url)); fs.writeFileSync(comparisonFile, JSON.stringify({ syntheticInspectionOnly: true, sourceDigestUnchanged: true, noActualSource12OrApproval: true }) + '\n');
fs.writeFileSync(impactFile, JSON.stringify({ kind: 'approved-retained-evidence-impact-review62', purpose: 'synthetic-inspection-envelope-not-Root-approval', producerEpoch: state.epoch, consumerEpoch: 'inspection-only', producerSourcePinsSHA256: digest, consumerSourcePinsSHA256: digest, retainHistoricalLabels: true, currentConsumerCertificationGranted: false,
  reviewer: 'synthetic-inspection-only-not-Root-approval', sourceComparisonReceipt: pin(comparisonFile), evidenceGroups: [{ producerEpoch: state.epoch, use: 'historical-by-impact-review', certifiesCurrentConsumerExecution: false, receipt: indexPin }] }) + '\n');
const impactReview = pin(impactFile), envelope = { schemaVersion: 2, kind: 'verified-retained-data-consumer-registry54', namespace: state.namespace, marker: state.marker,
  producer: { epoch: state.epoch, run: state.run, sourcePinsSHA256: digest, sourceCount: state.sourcePins.length },
  consumer: { ...previous.consumer, epoch: 'inspection-only', impactReview }, impactReview, priorRegistry: prior, retentionIndex: indexPin, producerState: statePin, retainedSnapshot: index.retainedSnapshot };
const ctx = { private: privateRoot, win: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', database: 'poms_r4ghi_rust', namespace: state.namespace, state: { marker: state.marker } };
const result = makeChainedAdmissions62(ctx, envelope, fixtureAdmissions54(state, snapshot, ctx.database));
console.log(JSON.stringify({ kind: 'FS-only-actual70-fixture-lineage-projection', statePin, indexPin, priorRegistry: prior,
  entries: result.entries.map(entry => ({ registryPath: entry.registryPath, projectIds: entry.projectIds, birthSourceEpoch: entry.birthSource.epoch, birthSourcePinsSHA256: entry.birthSource.sourcePinsSHA256, retainedAt: entry.retainedAt.epoch, receipts: entry.receiptProvenance.map(value => ({ ...value.pin, producerEpoch: value.source.epoch })) })),
  nonMintableInspectionEnvelope: true, sourceDigestUnchangedFromProducer: true, newSource12BindingOrAdmissionMinted: false, DBOrHTTPExecuted: false, RootPrivateOrProductFileWritten: false, G3Certified: false, G4Certified: false }, null, 2));
