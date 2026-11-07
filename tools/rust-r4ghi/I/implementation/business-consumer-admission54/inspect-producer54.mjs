// Offline FS-only inspection of already captured53 material; never mint admission.
import fs from 'node:fs';
import { fixtureAdmissions54 } from './candidate/tools/rust-r4ghi/business/retained-admission54.mjs';
import { readPin54 } from './candidate/tools/rust-r4ghi/business/consumer-admission54.mjs';
const input = JSON.parse(fs.readFileSync(new URL('./admission-input54.template.json', import.meta.url)));
const state = JSON.parse(readPin54(input.producer.frozenState)), snapshot = JSON.parse(readPin54(input.producer.retainedSnapshot));
const entries = fixtureAdmissions54(state, snapshot, 'poms_r4ghi_rust');
fs.writeFileSync(new URL('./producer-resource-inventory54.json', import.meta.url), JSON.stringify({ kind: 'FS-only-exact-retained-producer-resource-inventory54',
  originalState: input.producer.frozenState, originalSnapshot: input.producer.retainedSnapshot, entries, consumerAdmissionMinted: false, SQLExecuted: false, HTTPExecuted: false }, null, 2) + '\n');
console.log(JSON.stringify({ producerEpoch: state.epoch, admittedResourceCandidates: entries.length, modes: entries.map(entry => entry.mode), actualConsumerAdmission: false, SQLOrHTTP: false }));
