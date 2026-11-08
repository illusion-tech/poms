import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url));
const privateRoot = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = (file, digest) => {
  const bytes = fs.readFileSync(file); assert.equal(sha(bytes), digest);
  return JSON.parse(bytes);
};
const statePin = { file: '/home/wangzishi/.local/share/poms-r4ghi/private/retention/epoch12-before-source13-139/state-at-retention139.json', rawBytesSha256: 'ee7371dc4fc5d388f6898fb1c6eb90bebb6404eca6c31d23599469445804a628' };
const state = read(privateRoot + 'retention/epoch12-before-source13-139/state-at-retention139.json', statePin.rawBytesSha256);
const registryPin = { file: '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/000002-consumer-admission54-registry.json', rawBytesSha256: '3ed7bd387b6f4f3b8e44201e7985043b18b71cefceba3194f83ab19300f7d29c' };
const registry = read(privateRoot + 'business/g2-business12/main01/000002-consumer-admission54-registry.json', registryPin.rawBytesSha256);
const digest = sha(JSON.stringify(state.sourcePins));
assert.equal(state.epoch, 'g2-business12'); assert.equal(state.sourcePins.length, 406);
assert.equal(digest, '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');
assert.deepEqual(state.baseline, registry.originalBaseline);
const count = values => values.reduce((out, key) => { out[key] = (out[key] ?? 0) + 1; return out; }, {});
const result = {
  kind: 'fixed-Source12-producer-provenance183',
  frozenState: statePin, producerEpoch: state.epoch, producerRun: state.run,
  actualSourceArrayCount: state.sourcePins.length, producerSourcePinsSHA256: digest,
  originalM97BusinessBaseline: state.baseline, baselineEqualsOriginalSchema2: true,
  priorRegistry: registryPin, registrySchemaVersion: registry.schemaVersion,
  registryDirectProducer: registry.producer, registryConsumerEpoch: registry.consumer.epoch,
  priorRegistrySourceHistoryEpochs: registry.sourceHistory.map(x => x.epoch),
  priorFixtureBirthEpochCounts: count(registry.fixtureAdmissions.map(x => x.birthSource.epoch)),
  currentConsumerCertificationGranted: false,
  retainHistoricalLabels: true,
  consumerEpoch: null, consumerSourcePinsSHA256: null, sourceComparisonReceipt: null,
  isFinalImpactApproval: false, G3Certified: false, G4Certified: false,
};
fs.writeFileSync(path.join(out, 'source12-provenance183.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ producerEpoch: result.producerEpoch, sourceCount: result.actualSourceArrayCount, sourceDigest: digest, oldBirthEpochs: result.priorFixtureBirthEpochCounts, originalBaselinePreserved: true, actualConsumerDigest: null }) + '\n');
