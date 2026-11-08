import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { prepareOriginRecovery28 } from './business/recover-ui-creator-origin28.mjs';
assert.equal(process.platform, 'linux');
const lock = '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/driver.lock';
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'Root-prepare-exact-Origin28-metadata-recovery' }), { flag: 'wx', mode: 0o600 });
try {
  const ctx = createContext({ epoch: 'g2-business12', run: 'main01' });
  const plan = prepareOriginRecovery28(ctx); ctx.persist();
  console.log(JSON.stringify({ plan, HTTPExecuted: false, SQLExecuted: false, blockedObservationPreserved: true }));
} finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
