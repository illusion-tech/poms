import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = 'tools/rust-r4ghi/independent/review05/ef-live-support40';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = [
  { file: 'tools/rust-r4ghi/business/ef-live-producer40.mjs', before: null, after: '1f57a3837767286c7fa2390e4815da6a76c48e397543eca54bca439cdfe461c6' },
  { file: 'tools/rust-r4ghi/business/upstream.mjs', before: 'e9591dc2f6e83d456ebaf8ad202dcba09da116ee64c351f3421c03d70c2c2083', after: 'd4539d7b1cee2aa92f3987aff466de1858ff0e10432c9f04bae48ee94a47fe56' },
];
const lock = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business10/main01/driver.lock';
assert(!fs.existsSync(lock), 'Never change business helpers during an active stage');
const changes = inputs.map(item => {
  const bytes = fs.readFileSync(`${root}/phase1-02/candidate/${item.file}`);
  assert.equal(sha(bytes), item.after);
  if (item.before) assert.equal(sha(fs.readFileSync(item.file)), item.before);
  else assert(!fs.existsSync(item.file));
  return { item, bytes };
});
for (const { item, bytes } of changes) fs.writeFileSync(item.file, bytes);
const proposalPins = ['phase1/manifest40A.json', 'phase1-02/amendment40A-02.json'].map(file => ({ file: `${root}/${file}`, rawBytesSha256: sha(fs.readFileSync(`${root}/${file}`)) }));
fs.writeFileSync('docs/design/rust-r4ghi/ef-live40-tool-promotion.json', JSON.stringify({
  kind: 'Root-non-author-reviewed-ordinary-EF-real-producer-tool-promotion', files: inputs, proposalPins,
  review: [
    'Persistent receiver fixture lens shares Root ownership ledger, actors and original persist; no SQL business facts',
    'Receiver follows real project, CommonService summary, contract approval, cash basis, handover, role freeze and baseline commands',
    'New sources use actual execution ledger date and real E/F HTTP producers; zero-tax labor allocation avoids unimplemented receiver tax propagation',
    'Every producer persists pending intent then actual response proof before semantic assertions; uncertain writes are never replayed',
    'Two-project complete server-target preparation has four nonempty correction families; no correction POST in this stage',
    'SQL business_date alias correction is explicit; original 40A proposal preserved',
  ],
  actualFixtureExecuted: false, actualCorrectionExecuted: false, requiredWriteFICertified: false,
  finalSourceEpoch: 'g2-business10', G3Certified: false, G4Certified: false,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promoted: inputs.length, ordinaryFixtureStillPending: true, requiredWriteFIStillPending40B: true }));
