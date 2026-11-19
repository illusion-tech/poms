import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'tools/rust-r4ghi/business/lifecycle.mjs', before = fs.readFileSync(file);
const out = 'tools/rust-r4ghi/root-proposals/tool-correction49';
assert(!fs.existsSync(out));
assert(!fs.existsSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business10/main01/driver.lock'));
let text = before.toString();
const anchor = ", updatedAnchors: [{ table: 'project', id: f.project.id, requestBinding: 'path:projectId' }]";
for (const table of ['acceptance_record', 'project_archive_record']) {
  const from = `{ responseBirths: [{ table: '${table}', pointer: '/id' }] }`;
  assert.equal(text.split(from).length, 2);
  text = text.replace(from, from.slice(0, -2) + ", mutableTables: ['project']" + anchor + ' }');
}
const from = "{ responseBirths: [{ table: 'project_completion_record', pointer: '/id' }], mutableTables: ['project'] }";
assert.equal(text.split(from).length, 2);
text = text.replace(from, from.slice(0, -2) + anchor + ' }');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/lifecycle.before.bin`, before, { flag: 'wx' });
const after = Buffer.from(text); fs.writeFileSync(file, after);
fs.writeFileSync('docs/design/rust-r4ghi/lifecycle-binding-tool-correction49.json', JSON.stringify({
  kind: 'Root-source-reviewed-lifecycle-actual-project-CAS-binding-correction', file, before: sha(before), after: sha(after),
  original: `${out}/lifecycle.before.bin`, bindings: ['ProjectController_createAcceptanceRecord', 'ProjectController_createProjectCompletionRecord', 'ProjectController_createProjectArchiveRecord'],
  review: 'Implemented project row-version CAS is required by source and existing FI inventory; bind the actual projectId path only',
  actualFailure: 'g2-business10/main01/002032-http', genericOwnershipGuardChanged: false, productSourceChanged: false, G3Certified: false,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ toolCorrected: file, sourceAfter: sha(after), productSourceChanged: false, genericOwnershipGuardChanged: false }));
