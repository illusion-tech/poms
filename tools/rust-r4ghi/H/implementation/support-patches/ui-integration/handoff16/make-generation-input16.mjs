// Metadata-only. Copies actual collection inputs/index pins without making any final-actor assertion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInput, sha } from './binding-input16.mjs';
import { validatePlanIdentity } from '../runtime14/dom-common14.mjs';
function main() {
  assert.equal(process.platform, 'linux'); const a = process.argv.slice(2); assert(a.length === 9 && a[0] === '--collect-input' && a[2] === '--approved-collect-input-sha' && a[4] === '--actor-index' && a[6] === '--actor-index-sha' && a[8] === '--execute');
  const bytes = fs.readFileSync(a[1]), collected = validateInput(JSON.parse(bytes), bytes, a[3], 'collect-real-current-auth16');
  const planBytes = fs.readFileSync(collected.plan.file); assert.equal(sha(planBytes), collected.plan.rawBytesSha256); const plan = JSON.parse(planBytes), locations = validatePlanIdentity(plan);
  assert.equal(collected.plan.file, locations.linuxPlan); assert(a[5].startsWith(`/home/wangzishi/.local/share/poms-r4ghi/private/business/${plan.epoch}/${plan.run}/`));
  const indexBytes = fs.readFileSync(a[5]); assert.equal(sha(indexBytes), a[7]); const index = JSON.parse(indexBytes);
  assert.equal(index.kind, 'actual-recorded-current-auth-session-index16'); assert.equal(index.purpose, collected.purpose); assert.deepEqual(index.actualPlan, collected.plan);
  const value = { ...collected, kind: 'generate-real-recorded-binding16', actorProofIndex: { file: a[5], rawBytesSha256: a[7] } }, output = `${path.dirname(locations.linuxPlan)}/${plan.uiRun}-generate-input16.json`;
  const outputBytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(output, outputBytes, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ generationInput: { file: output, rawBytesSha256: sha(outputBytes) }, HTTPExecuted: false, DBExecuted: false, browserExecuted: false, actorFinalFlagInvented: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
