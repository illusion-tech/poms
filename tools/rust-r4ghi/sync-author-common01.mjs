// Root is the only writer of these shared files in every author checkout.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const prefix = 'apps/poms-api-rust/src/';
const files = [
  ...fs.readdirSync(root + '/' + prefix + 'project_operating_common').filter(file => file.endsWith('.rs')).map(file => prefix + 'project_operating_common/' + file),
  prefix + 'contract_support/mod.rs',
  prefix + 'contract_support/http.rs',
  prefix + 'contract_support/validation.rs',
  prefix + 'project_handover/mod.rs',
];
if (fs.existsSync(root + '/' + prefix + 'project_action_authorization/mod.rs')) files.push(prefix + 'project_action_authorization/mod.rs');
if (fs.existsSync(root + '/' + prefix + 'project_action_authorization/ownership.rs')) files.push(prefix + 'project_action_authorization/ownership.rs');
const receipt = [];
for (const name of ['poms-r4g-operating', 'poms-r4h-signals', 'poms-r4i-lifecycle']) {
  const target = 'E:/projects/worktrees/' + name + '/poms';
  assert(fs.existsSync(target + '/.git'));
  for (const file of files) {
    const destination = path.resolve(target, file);
    assert(destination.toLowerCase().startsWith(path.resolve(target).toLowerCase() + path.sep));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const bytes = fs.readFileSync(root + '/' + file);
    fs.writeFileSync(destination, bytes);
    const sha = createHash('sha256').update(bytes).digest('hex');
    assert.equal(createHash('sha256').update(fs.readFileSync(destination)).digest('hex'), sha);
    receipt.push({ checkout: name, file, sha256: sha });
  }
}
fs.mkdirSync(root + '/tmp/rust-r4ghi/root/common-sync', { recursive: true });
const out = root + '/tmp/rust-r4ghi/root/common-sync/' + Date.now() + '.json';
fs.writeFileSync(out, JSON.stringify({ kind: 'actual-Root-owned-common-source-copy', capturedAt: new Date().toISOString(), entries: receipt, acceptancePassed: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ checkouts: 3, filesEach: files.length, allHashesEqual: true, acceptancePassed: false }));
