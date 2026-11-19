// FS-only enumeration of the already executed UI/helper import closure, then
// bind its external helper and execution-entry dependencies as Source13 leaves.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { inventoryClosure } from './H/implementation/support-patches/ui-integration/handoff16/source-closure16.mjs';
assert.equal(process.platform, 'linux');
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/', sha = value => createHash('sha256').update(value).digest('hex');
assert(!fs.existsSync(P + '/business/g2-business13/main01/state.json')); assert(!fs.existsSync(P + '/business/g2-business12/main01/driver.lock'));
const copyPlan = JSON.parse(fs.readFileSync(R + '/' + prefix + 'handoff16/exact-copy-plan16.json')), closureRaw = fs.readFileSync(P + '/ui-config/runtime14/gh18-source12-04-closure162.json'); assert.equal(sha(closureRaw), 'aee7b6eec70928bfc19795de4c2f596c1c412cf4fa34ff89a561aa29560baeca');
const closure = inventoryClosure(R, copyPlan, [], 'dom', JSON.parse(closureRaw)), external = closure.filter(item => !item.file.startsWith('tools/rust-r4ghi/business/') && !item.file.startsWith(prefix));
assert.deepEqual(external.map(item => item.file).sort(), ['tools/rust-r4abc/upstream-payloads01.mjs', 'tools/rust-r4ghi/run-tax-continuation13.mjs', 'tools/rust-r4ghi/userfix/pure.mjs', 'tools/rust-r4ghi/userfix/status.mjs']);
const file = R + '/tools/rust-r4ghi/business/context.mjs', before = fs.readFileSync(file); assert.equal(sha(before), '3904197cc67eea28d1bf288df60e3e460f731b07c34eeb190ebe072c9435462f');
const needle = "  'tools/rust-r4ghi/migrate-frozen-parent98-136.mjs',", text = before.toString(); assert.equal(text.split(needle).length, 2);
const after = Buffer.from(text.replace(needle, needle + external.map(item => "\n  '" + item.file + "',").join('')));
const backup = R + '/tools/rust-r4ghi/checkpoints/source-deps181/context.mjs.before.bin'; fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.writeFileSync(backup, before, { flag: 'wx' }); fs.writeFileSync(file, after);
const report = { kind: 'Root-Source13-external-helper-and-entry-provenance-correction181', classification: 'new-real-drift', scope: 'Only four explicit direct source leaves; no API/domain/schema change', externalLeaves: external,
  context: { file: 'tools/rust-r4ghi/business/context.mjs', beforeSHA256: sha(before), afterSHA256: sha(after) }, actualEnumerationMembers: closure.length, enumerationBasis: 'FS-only import inventory using preserved20 tool closure; no Source12 UI/actor/candidate reuse',
  sourceCountMustBeMeasuredAfterFinalG2: true, oldSource12SourcePinsWritten: false, Source13StateMinted: false, M98Executed: false, SQLOrHTTPExecuted: false, G3Certified: false, G4Certified: false };
const reportRaw = Buffer.from(JSON.stringify(report, null, 2) + '\n'), reportFile = R + '/docs/design/rust-r4ghi/source-dependencies181-corrective.json'; fs.writeFileSync(reportFile, reportRaw, { flag: 'wx' });
console.log(JSON.stringify({ externalLeaves: external, contextAfterSHA256: sha(after), report: { file: reportFile, rawBytesSha256: sha(reportRaw) }, SQLOrHTTPExecuted: false }));
