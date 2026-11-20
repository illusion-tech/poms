import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';

const actors = process.argv.slice(2);
assert(actors.length > 0 && actors.length <= 7);
assert.equal(new Set(actors).size, actors.length);
assert(actors.every(actor => ['manager', 'execution', 'finance', 'person', 'condition', 'unrelated', 'bootstrap'].includes(actor)));
const ctx = createContext({ epoch: 'g2-business10', run: 'main01',
  'api-process-record': '/home/wangzishi/.local/share/poms-r4ghi/private/rust-api133-process.json' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'actual-business10-actor-login', actors }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const api = createApi(ctx);
  for (const actor of actors) {
    await api.login(actor);
    ctx.persist();
    console.log(JSON.stringify({ actor, epoch: ctx.epoch, realAuthenticationRefreshed: true, credentialsPublished: false, productG3: false }));
  }
} catch (error) {
  const record = ctx.artifact(`${ctx.next('actor-login-failed35')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist();
  console.error(JSON.stringify({ status: 'failed', privateOriginal: record, credentialsPublished: false }));
  process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid);
  fs.unlinkSync(lock);
}
