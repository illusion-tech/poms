// Explicit M97->M98 comparison-baseline policy. No DB/HTTP/top-level I/O.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyFixedM98Commands136 } from './migration-command136.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const dbs = ['poms_r4ghi_native', 'poms_r4ghi_rust'];
const samePin = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
export function readSchemaPin108(pin) {
  assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const stat = fs.lstatSync(pin.file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file));
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return bytes;
}
function json(pin) { return JSON.parse(readSchemaPin108(pin)); }
function rowFiles(meta) { return readSchemaPin108({ file: meta.file, rawBytesSha256: meta.rawBytesSha256 }).toString().split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); return row; }); }
function oneReadPerPin108() { const rows = new Map(); return meta => { const key = JSON.stringify([meta.file, meta.rawBytesSha256]); if (!rows.has(key)) rows.set(key, rowFiles(meta)); return rows.get(key); }; }
const facts = rows => rows.map(row => [row.key, row.sha256, row.xmin]);
const rowKey = row => JSON.stringify(row.key);
const fnKey = row => JSON.stringify([row.schema, row.proname, row.arguments]);
const sequenceKey = row => JSON.stringify([row.schema, row.name, row.oid]);
export function plBody108(sql) {
  const match = /\bAS\s+(\$[A-Za-z0-9_]*\$)([\s\S]*)\1\s*;?\s*$/i.exec(sql.trim()); assert(match, 'Exactly one approved PL function body is required'); return match[2];
}
function plFrame108(sql) { const body = plBody108(sql); return sql.replace(body, '\u0000VERIFIED-PL-BODY108\u0000'); }
export function assertSnapshotEqual108(old, current, readRows = rowFiles) {
  assert.deepEqual(Object.keys(old.databases).sort(), dbs); assert.deepEqual(Object.keys(current.databases).sort(), dbs); assert.deepEqual(old.objects, current.objects);
  for (const database of dbs) { const a = old.databases[database], b = current.databases[database]; assert.deepEqual(a.meta, b.meta); assert.deepEqual(Object.keys(a.tables), Object.keys(b.tables)); assert.equal(Object.keys(a.tables).length, 139);
    for (const table of Object.keys(a.tables)) assert.deepEqual(facts(readRows(a.tables[table])), facts(readRows(b.tables[table])), 'Exact retained rows/xmin required: ' + database + '.' + table); }
}
function applyMeta108(before, after, evidence, approvedBodyHash) {
  const oldFunctions = before.normative.functions.map(raw => JSON.parse(raw)), nextFunctions = after.normative.functions.map(raw => JSON.parse(raw));
  assert.equal(oldFunctions.length, nextFunctions.length); const targetKey = JSON.stringify(['poms', 'jghi_assignment_participant_guard', '']);
  const seen = new Set(), wanted = structuredClone(before); let changed = 0;
  wanted.normative.functions = oldFunctions.map((old, index) => {
    const key = fnKey(old); assert(!seen.has(key)); seen.add(key); const next = nextFunctions.find(row => fnKey(row) === key); assert(next);
    if (key !== targetKey) { assert.deepEqual(next, old); return before.normative.functions[index]; }
    const { definition: beforeDefinition, ...oldAttrs } = old, { definition: afterDefinition, ...newAttrs } = next;
    assert.deepEqual(newAttrs, oldAttrs, 'Function OID/owner/ACL/security/config may not advance'); assert.equal(old.oid, evidence.functionOID);
    assert.equal(plFrame108(afterDefinition), plFrame108(beforeDefinition), 'Only the approved body changes; language/return type/function attributes and definition frame stay exact');
    assert.equal(sha(beforeDefinition), evidence.beforeDefinitionSHA256); assert.equal(sha(afterDefinition), evidence.afterDefinitionSHA256); assert.notEqual(beforeDefinition, afterDefinition);
    assert.equal(sha(plBody108(afterDefinition)), approvedBodyHash); assert.equal(sha(plBody108(afterDefinition)), evidence.afterBodySHA256); changed += 1;
    return after.normative.functions[nextFunctions.indexOf(next)];
  });
  assert.equal(changed, 1); assert(Array.isArray(evidence.actualSequenceDeltas));
  const oldSequence = new Map(before.sequences.map(row => [sequenceKey(row), row])), nextSequence = new Map(after.sequences.map(row => [sequenceKey(row), row]));
  assert.deepEqual([...oldSequence.keys()].sort(), [...nextSequence.keys()].sort()); const actualDeltas = [];
  wanted.sequences = before.sequences.map(old => {
    const next = nextSequence.get(sequenceKey(old)); if (JSON.stringify(next) === JSON.stringify(old)) return old;
    const proof = evidence.actualSequenceDeltas.find(item => sequenceKey(item.before) === sequenceKey(old)); assert(proof, 'Unregistered sequence drift');
    assert.deepEqual(proof.before, old); assert.deepEqual(proof.after, next); assert.equal(old.schema, 'poms');
    const { value: oldValue, is_called: oldCalled, ...oldAttrs } = old, { value: nextValue, is_called: nextCalled, ...newAttrs } = next;
    assert.deepEqual(oldAttrs, newAttrs); assert.equal(BigInt(nextValue) - BigInt(oldValue), 1n, 'This normal single forward registration admits one evidenced nextval only');
    assert.equal(nextCalled, true); assert.equal(typeof oldCalled, 'boolean'); actualDeltas.push(proof); return next;
  });
  assert.deepEqual(actualDeltas, evidence.actualSequenceDeltas, 'Only truly changed sequences may be listed');
  assert.deepEqual(wanted, after, 'All other catalog/OID/ACL/roles/constraints/triggers remain exact'); return wanted;
}

export function verifyM98Transition108({ originalBaseline, retained, before, after, fresh, approvedSQL, migrationName, evidence }, readRows = oneReadPerPin108()) {
  assert.equal(evidence.kind, 'exact-owned-forward-schema-advance108'); assert.equal(evidence.fromMigrations, 97); assert.equal(evidence.toMigrations, 98); assert.equal(evidence.tablesPerDatabase, 139);
  assert(/^[A-Za-z0-9_]+$/.test(migrationName) && migrationName.startsWith('Migration')); const bodyHash = sha(plBody108(approvedSQL));
  for (const snapshot of [originalBaseline, retained, before, after, ...(fresh ? [fresh] : [])]) {
    assert.deepEqual(Object.keys(snapshot.databases).sort(), dbs); assert.deepEqual(Object.keys(snapshot.objects).sort(), dbs);
    assert.equal(snapshot.marker, originalBaseline.marker, 'Same original namespace marker required');
  }
  assertSnapshotEqual108(retained, before, readRows); if (fresh) assertSnapshotEqual108(after, fresh, readRows);
  const verified = {};
  for (const database of dbs) {
    const base = originalBaseline.databases[database], a = before.databases[database], b = after.databases[database], entry = evidence.databases[database]; assert(entry);
    assert.deepEqual(base.meta, a.meta, 'Original M97 normative identity must still be the migration-before identity'); assert.deepEqual(Object.keys(base.tables), Object.keys(a.tables)); assert.deepEqual(Object.keys(a.tables), Object.keys(b.tables)); assert.equal(Object.keys(a.tables).length, 139);
    assert.deepEqual(before.objects[database], after.objects[database]);
    const meta = applyMeta108(a.meta, b.meta, entry, bodyHash);
    for (const table of Object.keys(a.tables).filter(name => name !== 'poms_migrations')) assert.deepEqual(facts(readRows(a.tables[table])), facts(readRows(b.tables[table])), 'Migration cannot alter business/native row identity: ' + database + '.' + table);
    const initial = readRows(base.tables.poms_migrations), old = readRows(a.tables.poms_migrations), next = readRows(b.tables.poms_migrations);
    assert.equal(initial.length, 97); assert.deepEqual(facts(initial), facts(old)); assert.equal(next.length, 98);
    const previous = new Map(old.map(row => [rowKey(row), row])), added = next.filter(row => !previous.has(rowKey(row))); assert.equal(added.length, 1);
    for (const row of next.filter(row => previous.has(rowKey(row)))) assert.deepEqual(row, previous.get(rowKey(row)), 'Original migration row SHA/xmin/identity changed');
    const migration = added[0], value = JSON.parse(migration.raw); assert.deepEqual(migration.key, entry.migrationRow.key); assert.equal(migration.sha256, entry.migrationRow.rowSHA256); assert.equal(migration.xmin, entry.migrationRow.xmin);
    assert.equal(sha(migration.raw), migration.sha256); assert.equal(value.name, migrationName); assert.equal(value.name, entry.migrationRow.name); assert(value.executed_at && Number.isFinite(Date.parse(value.executed_at)), 'Actual forward execution timestamp required');
    assert.equal(entry.actualSequenceDeltas.length, 1, 'Normal one-row forward registration must prove its actual single ID nextval');
    for (const seq of entry.actualSequenceDeltas) {
      const column = a.meta.normative.columns.map(raw => JSON.parse(raw)).find(c => c.schema === 'poms' && c.table_name === 'poms_migrations' && c.attname === 'id');
      assert(column && typeof column.default_expr === 'string'); assert.equal(column.default_expr, "nextval('" + seq.after.schema + '.' + seq.after.name + "'::regclass)", 'Changed sequence must be the exact actual migration ID default'); assert.equal(String(value.id), seq.after.value);
    }
    verified[database] = { meta, migrationTable: b.tables.poms_migrations, migrationRow: entry.migrationRow, sequenceDeltas: entry.actualSequenceDeltas };
  }
  return { kind: 'verified-exact-M98-transition108', approvedBodyHash: bodyHash, databases: verified, businessRowsUnchanged: true, originalMigrationRowsUnchanged: true, tablesPerDatabase: 139 };
}
export function deriveComparisonBaseline108(original, verified) {
  assert.equal(verified.kind, 'verified-exact-M98-transition108'); const derived = structuredClone(original);
  derived.kind = 'derived-schema-comparison-baseline108'; derived.comparisonSchemaVersion = 1;
  derived.businessBaselineRebased = false;
  for (const database of dbs) { derived.databases[database].meta = verified.databases[database].meta; derived.databases[database].tables.poms_migrations = verified.databases[database].migrationTable;
    for (const table of Object.keys(original.databases[database].tables).filter(name => name !== 'poms_migrations')) assert.deepEqual(derived.databases[database].tables[table], original.databases[database].tables[table]); }
  assert.deepEqual(derived.objects, original.objects); return derived;
}

function within(root, file) {
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file));
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Schema evidence escaped its approved root');
}
function evidenceFile(ctx, pin) {
  readSchemaPin108(pin);
  const privateRelative = path.relative(fs.realpathSync(ctx.private), fs.realpathSync(pin.file));
  if (privateRelative && privateRelative !== '..' && !privateRelative.startsWith('..' + path.sep) && !path.isAbsolute(privateRelative)) return;
  within(ctx.win + '/tmp/rust-r4ghi', pin.file);
}
export function verifyMigrationReceipt108(ctx, advance) {
  for (const pin of [advance.actualMigrationReceipt, advance.migrationBefore, advance.migrationAfter]) evidenceFile(ctx, pin);
  for (const pin of [advance.approvedSQL, advance.approvedMigrationSource]) { readSchemaPin108(pin); within(ctx.win, pin.file); }
  assert(advance.approvedSQL.file.endsWith('.sql') && advance.approvedMigrationSource.file.endsWith('.ts'));
  assert.equal(path.basename(advance.approvedMigrationSource.file, '.ts'), advance.migrationName, 'Registered name must be the actual approved forward migration filename');
  const source = readSchemaPin108(advance.approvedMigrationSource).toString(), sql = readSchemaPin108(advance.approvedSQL).toString();
  const statements = [...source.matchAll(/this\.addSql\(("(?:[^"\\]|\\[\s\S])*")\);/g)];
  assert.equal(statements.length, 1, 'This narrow forward candidate has one literal addSql statement');
  assert.equal(sha(plBody108(JSON.parse(statements[0][1]))), sha(plBody108(sql)), 'Approved migration must contain the exact approved function body');
  const receipt = json(advance.actualMigrationReceipt);
  assert.equal(receipt.kind, 'actual-normal-forward-M98-migration-receipt108'); assert.equal(receipt.normalForward, true); assert.equal(receipt.fromMigrations, 97); assert.equal(receipt.toMigrations, 98);
  assert.equal(receipt.namespace, ctx.namespace); assert.equal(receipt.marker, ctx.state.marker);
  assert.equal(receipt.migrationName, advance.migrationName); assert.equal(receipt.tablesPerDatabase, 139);
  for (const key of ['approvedSQL', 'approvedMigrationSource']) assert(samePin(receipt[key], advance[key]));
  assert(samePin(receipt.before, advance.migrationBefore)); assert(samePin(receipt.after, advance.migrationAfter));
  assert.deepEqual(receipt.databases, advance.databases, 'Exact observed object/row/sequence deltas must come from the pinned actual migration receipt');
  verifyFixedM98Commands136(ctx, receipt, advance);
  return receipt;
}

export function verifySchemaBinding108(ctx, binding, registry = null) {
  assert.equal(binding?.kind, 'verified-schema-comparison-binding108'); assert.equal(binding.schemaVersion, 1); assert.equal(binding.fromMigrations, 97); assert.equal(binding.toMigrations, 98); assert.equal(ctx.migrations, 98);
  assert(samePin(binding.originalBaseline, ctx.state.baseline), 'Original data baseline cannot be rebound');
  const receipt = json(binding.verificationReceipt); assert.equal(receipt.kind, 'verified-M98-schema-comparison-receipt108');
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.canonicalMetadataAdvanceOnly, true); assert.equal(receipt.originalBusinessBaselineRebased, false); assert.equal(receipt.businessRowsAndXminChangedByMigration, false); assert.equal(receipt.migrationExecutedByThisTool, false);
  for (const key of ['originalBaseline', 'comparisonBaseline']) assert(samePin(receipt[key], binding[key]));
  if (registry) { assert.equal(registry.schemaVersion, 3); assert.deepEqual(registry.schemaComparison108, binding); assert(samePin(registry.originalBaseline, binding.originalBaseline)); }
  for (const pin of [binding.verificationReceipt, binding.comparisonBaseline]) within(ctx.private + '/business', pin.file);
  assert(/^[A-Za-z0-9_-]{1,48}$/.test(receipt.consumer.epoch) && /^[A-Za-z0-9_-]{1,48}$/.test(receipt.consumer.run));
  for (const pin of [binding.verificationReceipt, binding.comparisonBaseline, receipt.freshCurrent]) within(ctx.private + '/business/' + receipt.consumer.epoch + '/' + receipt.consumer.run, pin.file);
  const consumerPins = json(receipt.consumer.sourcePins); assert.equal(sha(JSON.stringify(consumerPins)), receipt.consumer.sourcePinsSHA256); assert.equal(consumerPins.length, receipt.consumer.sourceCount);
  for (const pin of [receipt.originalBaseline, receipt.retainedSnapshot, receipt.retentionIndex, receipt.producerState, receipt.priorRegistry, receipt.migrationBefore, receipt.migrationAfter, receipt.freshCurrent]) evidenceFile(ctx, pin);
  const producer = json(receipt.producerState), retention = json(receipt.retentionIndex), prior = json(receipt.priorRegistry);
  for (const value of [producer, retention, prior]) assert.equal(value.marker, ctx.state.marker);
  assert(samePin(producer.baseline, binding.originalBaseline), 'Keep the frozen producer original M97 business baseline, even if several new consumer metadata fields are edited together');
  assert(samePin(prior.originalBaseline, producer.baseline), 'The immutable original baseline must also be the direct prior registry baseline');
  assert(samePin(retention.frozenState, receipt.producerState)); assert(samePin(retention.retainedSnapshot, receipt.retainedSnapshot));
  assert.equal(retention.producerEpoch, producer.epoch); assert.equal(retention.run, producer.run);
  for (const key of ['epoch', 'run']) { assert.equal(receipt.producer[key], producer[key]); assert.equal(prior.consumer[key], producer[key]); }
  assert.equal(receipt.producer.sourcePinsSHA256, sha(JSON.stringify(producer.sourcePins))); assert.equal(prior.consumer.sourcePinsSHA256, receipt.producer.sourcePinsSHA256);
  const migration = verifyMigrationReceipt108(ctx, receipt.schemaAdvance);
  assert(samePin(receipt.schemaAdvance.actualMigrationReceipt, receipt.actualMigrationReceipt));
  assert(samePin(receipt.schemaAdvance.migrationBefore, receipt.migrationBefore)); assert(samePin(receipt.schemaAdvance.migrationAfter, receipt.migrationAfter));
  assert(samePin(receipt.schemaAdvance.approvedSQL, receipt.approvedSQL)); assert.equal(migration.migrationName, receipt.migrationName);
  assert.deepEqual(receipt.evidence, { kind: 'exact-owned-forward-schema-advance108', fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, databases: receipt.schemaAdvance.databases });
  if (registry) {
    for (const key of ['retentionIndex', 'producerState', 'retainedSnapshot', 'priorRegistry']) assert(samePin(receipt[key], registry[key]));
    assert(samePin(receipt.freshCurrent, registry.freshSchemaAdvancedSnapshot));
    assert.equal(registry.retainedSnapshotEquivalent, false); assert.equal(registry.schemaAdvanceOnly, true);
    assert.deepEqual(registry.consumer, receipt.consumer, 'This one forward schema admission binds its actual new consumer; a later code epoch needs its own explicit reviewed admission');
    for (const key of ['epoch', 'run', 'sourcePinsSHA256']) assert.equal(registry.producer[key], receipt.producer[key]);
  }
  const input = { originalBaseline: json(receipt.originalBaseline), retained: json(receipt.retainedSnapshot), before: json(receipt.migrationBefore), after: json(receipt.migrationAfter), fresh: json(receipt.freshCurrent),
    approvedSQL: readSchemaPin108(receipt.approvedSQL).toString(), migrationName: receipt.migrationName, evidence: receipt.evidence };
  const verified = verifyM98Transition108(input), derived = json(binding.comparisonBaseline); assert.deepEqual(derived, deriveComparisonBaseline108(input.originalBaseline, verified));
  return { binding, receipt, baseline: derived };
}
export function comparisonBaselinePin108(ctx) {
  if (!ctx.state.schemaComparison108) { assert.notEqual(ctx.migrations, 98, 'M98 requires explicit schema3 comparison admission'); return ctx.state.baseline; }
  verifySchemaBinding108(ctx, ctx.state.schemaComparison108); return ctx.state.schemaComparison108.comparisonBaseline;
}
