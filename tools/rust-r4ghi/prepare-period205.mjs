// FS-only proposal preparation. No business helper is changed by this script.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pack = root + '/tools/rust-r4ghi/period205';
const sha = value => createHash('sha256').update(value).digest('hex');
const privateRoot = process.platform === 'win32'
  ? '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private'
  : '/home/wangzishi/.local/share/poms-r4ghi/private';
const rawPins = fs.readFileSync(privateRoot + '/source13-preparation193/sourcePins.json');
assert.equal(sha(rawPins), 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c');
const pins = JSON.parse(rawPins);
assert.equal(pins.length, 416);
assert.equal(sha(JSON.stringify(pins)), '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e');
const h0 = JSON.parse(fs.readFileSync(privateRoot + '/source13-preparation183/helperH0.json'));
const write = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' }); return { file: path.relative(root, file).split(path.sep).join('/'), rawBytesSha256: sha(bytes) }; };
const replace = (text, before, after) => { assert.equal(text.split(before).length, 2, 'One exact before-image required'); return text.replace(before, after); };
const changes = [];
for (const name of ['fault-sweep.mjs', 'gh-write-facts.mjs']) {
  const file = 'tools/rust-r4ghi/business/' + name, before = fs.readFileSync(root + '/' + file);
  assert.equal(sha(before), h0.find(p => p.file === file).sha256);
  let text = before.toString();
  if (name === 'fault-sweep.mjs') {
    text = replace(text, "import { isMetadataWrite, deriveMetadataWriteFacts } from './metadata-write-inventory25.mjs';", "import { isMetadataWrite, deriveMetadataWriteFacts } from './metadata-write-inventory25.mjs';\nimport { assertAdmittedContext54 } from './consumer-admission54.mjs';");
    text = replace(text, 'function verifySources(ctx, operationId = null) {', `function verifySources(ctx, operationId = null) {
  if (ctx.epoch === 'g2-business13' && isGHWrite(operationId)) {
    // This new tool generation is separately admitted. Keep the old19 pins as
    // their original historical input; never silently refresh that old file.
    assert(ctx.state.toolAdmission119, 'Source13 GH effects require the explicit reviewed H1 tool admission');
    assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true });
    const current = JSON.parse(fs.readFileSync(new URL('./required-write-sources13.json', import.meta.url)));
    assert.deepEqual(current, ctx.pins, 'Bind the complete actual416, including period-baseline and correction dependencies');
    for (const pin of current) assert.equal(sha(fs.readFileSync(ctx.win + '/' + pin.file)), pin.sha256, 'Reviewed current FI input changed: ' + pin.file);
    return current;
  }`);
  } else {
    text = replace(text, "  if (!result.costUnits.length) result.costUnits = values('project_cost_inclusion_head').filter(r => r.project_id === projectId).map(r => r.unit_key);", `  if (!result.costUnits.length && result.snapshotMode === 'period-end') {
    // A preclassified period does not consume every historical inclusion head.
    // Use the actual selected live capture, and require every selected unit's
    // current source/version/decision to be unchanged. The external period
    // preflight also compares this whole set to the actual period preparation.
    assert(result.currentSnapshotId, 'This bounded positive period fixture requires a real selected live capture');
    const selected = owned('project_operating_snapshot', result.currentSnapshotId);
    assert.equal(selected.project_id, projectId); assert.equal(selected.status, 'active');
    assert.equal(selected.producer_version, 1); assert.equal(selected.period_end_snapshot_id, null);
    const members = rows('operating_snapshot_cost_member').filter(r => r.value.snapshot_id === selected.id);
    assert(members.length, 'An empty current capture cannot certify cost membership FI');
    assert.equal(new Set(members.map(r => r.value.unit_key)).size, members.length);
    for (const member of members) {
      assert(ctx.state.owned[keyOf(ctx.database, 'operating_snapshot_cost_member', member.row.key)]);
      const value = member.value; assert.equal(value.project_id, projectId);
      const match = /^(cost|allocation):([0-9a-f-]{36})$/.exec(value.unit_key); assert(match); uuid(match[2]);
      const source = owned(match[1] === 'cost' ? 'project_actual_cost_record' : 'shared_cost_allocation_result', match[2]);
      assert.equal(source.project_id, projectId); assert.equal(source.row_version, value.captured_source_version);
      const heads = rows('project_cost_inclusion_head').filter(r => r.value.project_id === projectId && r.value.unit_key === value.unit_key);
      assert.equal(heads.length, 1); assert(ctx.state.owned[keyOf(ctx.database, 'project_cost_inclusion_head', heads[0].row.key)]);
      assert.equal(heads[0].value.decision_id, value.decision_id, 'Current classification changed after the selected capture');
      const decision = owned('project_cost_inclusion_decision', value.decision_id); assert.equal(decision.project_id, projectId);
      result.costUnits.push(value.unit_key);
    }
  }
  if (!result.costUnits.length) result.costUnits = values('project_cost_inclusion_head').filter(r => r.project_id === projectId).map(r => r.unit_key);`);
  }
  const beforePin = write(pack + '/before/' + file, before), afterPin = write(pack + '/proposed/' + file, text);
  changes.push({ file, operation: 'replace-exact-H0-helper', before: beforePin, after: afterPin });
}
const added = 'tools/rust-r4ghi/business/required-write-sources13.json';
assert(!fs.existsSync(root + '/' + added));
changes.push({ file: added, operation: 'add-current416-source-list', before: null, after: write(pack + '/proposed/' + added, rawPins) });
const manifest = { kind: 'proposed-Source13-preclassified-period-FI-tool-correction205', sourcePinsSHA256: sha(JSON.stringify(pins)), sourceCount: pins.length,
  RootApplied: false, H1Admitted: false, databaseOrHTTPExecuted: false, oldH0AndSources19Preserved: true,
  boundedCase: 'already-classified real current capture; exact full period-preparation unit set required before any effects', changes,
  requiredExternalPreflight: ['actual completed HK period', 'real period preparation eligible', 'no classification decisions', 'all selected live cost units equal all period direct/share rows', 'actual full inventory reviewed before effects', 'Tax complete before any period creation', 'same-body FI rollback then one normal success', 'current live snapshot/gates/reviews remain unchanged except operating head CAS version'],
  formalG3Certified: false, G4Certified: false };
const output = write(pack + '/manifest205.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ proposal: output, helperChanges: changes.length, RootApplied: false, source416Changed: false, databaseOrHTTPExecuted: false }));
