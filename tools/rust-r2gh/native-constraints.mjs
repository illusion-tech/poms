import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { OwnedFixture } from './owned-fixture.mjs';
assert.equal(process.platform, 'linux');
assert.equal(process.argv.length, 2);
const output = 'tmp/rust-r2gh/native-constraints01.json';
assert(!existsSync(output));
const report = { formatVersion: 1, kind: 'native-PG15-constraint-witness', result: 'pending', startedAt: new Date().toISOString(), sourceSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'), boundary: 'Direct low-privilege SQL on preplanned owned rows; database behavior only, separate from original/Rust HTTP acceptance', copies: [] };
try {
    for (const backend of ['nest', 'rust']) {
        const runId = randomUUID(), fixture = await OwnedFixture.connect(backend, runId);
        const copy = { backend, runId, result: 'pending', cases: [], cleanup: [] };
        report.copies.push(copy);
        try {
            const owned = await fixture.prepare(), db = fixture.client;
            const sourceIds = [randomUUID(), randomUUID()];
            for (const [i, id] of sourceIds.entries()) {
                const tenant = `${owned.tenant}-native-${i}`;
                await fixture.plan(`native-source-${i}`, 'external_org_source', { external_tenant_id: tenant, provider_config_id: owned.providerId }, 1);
                await db.query("insert into poms.external_org_source(id,provider,external_tenant_id,display_name,provider_config_id,authoritative_org_unit_id) values($1,'feishu',$2,$3,$4,$5)", [id, tenant, `GH native ${runId} ${i}`, owned.providerId, owned.rootId]);
                await fixture.adopt(`native-source-${i}`);
            }
            const sourceId = sourceIds[0], mappingId = randomUUID(), nativeRunId = randomUUID(), diffId = randomUUID();
            await fixture.plan('native-mappings', 'external_department_mapping', { source_id: sourceId }, 2);
            await db.query("insert into poms.external_department_mapping(id,source_id,external_department_id,external_department_name,org_unit_id,status) values($1,$2,$3,'GH native department',$4,'mapped')", [mappingId, sourceId, runId + '-a', owned.rootId]);
            await fixture.adopt('native-mappings');
            await fixture.plan('native-runs', 'org_sync_run', { source_id: sourceId }, 1);
            await db.query('insert into poms.org_sync_run(id,source_id) values($1,$2)', [nativeRunId, sourceId]);
            await fixture.adopt('native-runs');
            await fixture.plan('native-diffs', 'org_sync_diff_item', { run_id: nativeRunId }, 2);
            await db.query("insert into poms.org_sync_diff_item(id,run_id,external_department_id,action) values($1,$2,$3,'conflict')", [diffId, nativeRunId, runId + '-a']);
            await fixture.adopt('native-diffs');
            async function fails(name, expectedCode, expectedConstraint, action) {
                await db.query('BEGIN');
                let error;
                try { await action(); } catch (caught) { error = caught; }
                finally { await db.query('ROLLBACK'); }
                assert.equal(error?.code, expectedCode, name);
                if (expectedConstraint) assert.equal(error.constraint, expectedConstraint, name);
                copy.cases.push({ name, result: 'pass', code: error.code, constraint: error.constraint ?? null, rolledBack: true });
            }
            await fails('source-provider-tenant-unique', '23505', 'uq_external_org_source_provider_tenant', () => db.query("insert into poms.external_org_source(provider,external_tenant_id,display_name) values('feishu',$1,'GH duplicate')", [owned.tenant + '-native-0']));
            await fails('active-authority-global-unique', '23505', 'uq_external_org_source_active_authoritative_org', async () => {
                await db.query("update poms.external_org_source set status='active' where id=$1", [sourceId]);
                await db.query("update poms.external_org_source set status='active' where id=$1", [sourceIds[1]]);
            });
            await fails('mapping-source-department-unique', '23505', 'uq_external_department_mapping_source_department', () => db.query("insert into poms.external_department_mapping(source_id,external_department_id,external_department_name) values($1,$2,'GH duplicate')", [sourceId, runId + '-a']));
            await fails('mapped-org-conditional-unique', '23505', 'uq_external_department_mapping_mapped_org', () => db.query("insert into poms.external_department_mapping(source_id,external_department_id,external_department_name,org_unit_id,status) values($1,$2,'GH duplicate',$3,'mapped')", [sourceId, runId + '-b', owned.rootId]));
            await fails('mapping-missing-source-fk', '23503', 'external_department_mapping_source_id_foreign', () => db.query("insert into poms.external_department_mapping(source_id,external_department_id,external_department_name) values($1,$2,'GH absent source')", [randomUUID(), runId + '-absent']));
            await fails('diff-run-department-action-unique', '23505', 'uq_org_sync_diff_item_run_department_action', () => db.query("insert into poms.org_sync_diff_item(run_id,external_department_id,action) values($1,$2,'conflict')", [nativeRunId, runId + '-a']));
            await fails('run-count-int4-overflow', '22003', null, () => db.query('update poms.org_sync_run set total_item_count=$2 where id=$1', [nativeRunId, '2147483648']));
            await fails('org-display-order-int4-overflow', '22003', null, () => db.query('update poms.org_unit set display_order=$2 where id=$1', [owned.rootId, '2147483648']));
            await fails('source-provider-check', '23514', 'chk_external_org_source_provider', () => db.query("update poms.external_org_source set provider='gh-invalid' where id=$1", [sourceId]));
            await fails('authority-org-delete-restrict', '23503', 'external_org_source_authoritative_org_unit_id_foreign', () => db.query('delete from poms.org_unit where id=$1', [owned.rootId]));
            for (const name of ['provider-delete-set-null', 'source-delete-cascades']) {
                await db.query('BEGIN');
                try {
                    if (name === 'provider-delete-set-null') {
                        await db.query('delete from poms.identity_provider_config where id=$1', [owned.providerId]);
                        assert.equal((await db.query('select count(*)::int n from poms.external_org_source where id=any($1::uuid[]) and provider_config_id is null', [sourceIds])).rows[0].n, 2);
                    } else {
                        await db.query('delete from poms.external_org_source where id=$1', [sourceId]);
                        for (const [table, id] of [['external_department_mapping', mappingId], ['org_sync_run', nativeRunId], ['org_sync_diff_item', diffId]]) assert.equal((await db.query(`select count(*)::int n from poms.${table} where id=$1`, [id])).rows[0].n, 0);
                    }
                    copy.cases.push({ name, result: 'pass', rolledBack: true });
                } finally { await db.query('ROLLBACK'); }
            }
            copy.result = 'pass';
        } finally {
            for (let pass = 0; pass < 2; pass++) {
                const result = await fixture.cleanup();
                copy.cleanup.push({ pass, matched: result.matched, changed: result.changed, zero: result.zero });
                if (pass === 1) assert.deepEqual([result.matched, result.changed, result.zero], [0, 0, true]);
            }
            await fixture.close();
        }
    }
    report.result = 'pass';
} catch (error) { report.result = 'fail'; report.error = { name: error.name, code: error.code, message: error.name === 'AssertionError' ? error.message : undefined }; process.exitCode = 1; }
finally { report.finishedAt = new Date().toISOString(); writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify({ result: report.result, copies: report.copies.map(copy => ({ backend: copy.backend, result: copy.result, cases: copy.cases.length, cleanup: copy.cleanup })), output }));
