// Public-source-only static capture. Does not import Root runtime or read private.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CYCLE_POINTERS70, BORROWED_ORIGINALS70, normalizeCatalog70, analyzePotentialSchema70 } from './core70.mjs';
const own = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = value => createHash('sha256').update(value).digest('hex');
const pin = file => { const b = fs.readFileSync(path.join(root, file)); return { file, bytes: b.length, rawBytesSha256: sha(b) }; };
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalogs = Object.fromEntries(['native', 'rust'].map(side => [side, read(`tmp/rust-r4def/root/catalog25/${side}-catalog.json`)]));
const plans = Object.fromEntries(['native', 'rust'].map(side => [side, read(`tmp/rust-r4def/root/cleanup-plan65b/${side}.json`)]));
assert.equal(normalizeCatalog70(catalogs.native).structuralHash, normalizeCatalog70(catalogs.rust).structuralHash);
for (const side of ['native', 'rust']) { assert.equal(plans[side].tables, 120); assert.equal(plans[side].baselineRows, 532); assert.equal(plans[side].foreignKeys.length, 294); assert.equal(plans[side].triggers.length, 5); assert.deepEqual(plans[side].policies, []); }
assert.deepEqual(plans.native.triggers, plans.rust.triggers); assert.deepEqual(plans.native.modifiedBaseline, []); assert.deepEqual(plans.native.missingBaseline, []);
assert.deepEqual(plans.rust.modifiedBaseline.map(p => ({ table: p.table, id: p.rows[0].primaryKey.id, columns: [...p.rows[0].columns].sort() })), [
    { table: 'business_number_sequence', id: BORROWED_ORIGINALS70[0].primaryKey.id, columns: ['next_value', 'updated_at'] },
    { table: 'local_credential', id: BORROWED_ORIGINALS70[1].primaryKey.id, columns: ['password_hash', 'updated_at'] },
]);
assert.equal(plans.rust.missingBaseline.length, 1); assert.equal(plans.rust.missingBaseline[0].table, 'user_role_assignment'); assert.deepEqual(plans.rust.missingBaseline[0].missing, [BORROWED_ORIGINALS70[2].primaryKey]);
const sources = ['tools/rust-r4def/cleanup-plan65.mjs', 'tools/rust-r4def/catalog25.mjs', 'tmp/rust-r4def/root/cleanup-plan65b/native.json', 'tmp/rust-r4def/root/cleanup-plan65b/rust.json', 'tmp/rust-r4def/root/catalog25/native-catalog.json', 'tmp/rust-r4def/root/catalog25/rust-catalog.json', 'apps/poms-api/src/migrations/Migration20261104060000_rust_r4def_execution_cost.ts', 'tools/rust-r4abc/cleanup50.mjs'].map(pin);
const authority = { kind: 'cleanup70-public-catalog-and-borrowed-field-authority', createdAt: new Date().toISOString(), namespace: 'poms-r4def', base: '756d813c9578090fcf8e56821acce01b46b40420', structuralHash: normalizeCatalog70(catalogs.rust).structuralHash, immutableUpdateTriggers: plans.rust.triggers, borrowedOriginals: BORROWED_ORIGINALS70,
    cyclePolicies: CYCLE_POINTERS70.map(p => { const affectedChecks = catalogs.rust.constraints.filter(c => c.table_name === p.table && c.contype === 'c' && p.columns.some(name => new RegExp('\\b' + name + '\\b').test(c.definition))).map(c => ({ name: c.conname, definition: c.definition })); return { ...p, rule: p.table === 'contract_term_preparation' ? 'preparation-amendment-pair-null' : 'nullable-pointers-with-no-touched-CHECK', affectedChecks }; }),
    backend: Object.fromEntries(['native', 'rust'].map(side => [side, { baselineSummary: catalogs[side].summary, aclHash: plans[side].aclHash, public65bRowsOnlyHistorical: plans[side].currentRows }])), publicSourcePins: sources, actualBaselinePrivateRead: false, actualLatestRowGraphRead: false, cleanupExecuted: false };
const schema = analyzePotentialSchema70(catalogs.rust, authority); assert.equal(schema.beforeCrossTableSCCs.length, 3); assert.deepEqual(schema.afterWhitelistedPointerCutsCrossTableSCCs, []);
for (const source of sources) assert.equal(pin(source.file).rawBytesSha256, source.rawBytesSha256, 'Public source changed during static capture');
fs.writeFileSync(path.join(own, 'authority70.json'), JSON.stringify(authority, null, 2) + '\n', { flag: 'wx' }); fs.writeFileSync(path.join(own, 'static-schema70.json'), JSON.stringify(schema, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ authorityBytes: fs.statSync(path.join(own, 'authority70.json')).size, actualFKs: schema.foreignKeys, potentialCrossSCCs: schema.beforeCrossTableSCCs, afterReviewedPointerCuts: schema.afterWhitelistedPointerCutsCrossTableSCCs, actualRowsRead: false, DBExecuted: false }));
