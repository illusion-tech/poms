import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createCipheriv, createHash } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { databaseClient, privateRoot, managed } from './database-client.mjs';
import { executeFixture } from './fixture-run.mjs';
import { journalStore } from './fixture-journal.mjs';
import { snapshot as baseSnapshot } from './fixture-snapshot.mjs';
import { validateSource } from './fixture-guard.mjs';
import { assertCompleteReferences } from './fixture-complete-references.mjs';
const require = createRequire(import.meta.url);
const { fixtureRequestIdentity } = require('./fixture-protocol.cjs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const tables = ['identity_provider_config', 'external_identity', 'identity_provider_oauth_grant', 'external_login_ticket', 'external_org_source', 'external_department_mapping', 'org_sync_run', 'org_sync_diff_item', 'org_unit', 'audit_log'];
const selectors = {
    identity_provider_config: ['tenant_id', 'client_id', 'display_name'],
    external_identity: ['identity_provider_config_id', 'poms_user_id', 'subject_id'],
    identity_provider_oauth_grant: ['identity_provider_config_id', 'poms_user_id'],
    external_login_ticket: ['identity_provider_config_id', 'external_identity_id', 'poms_user_id', 'ticket_hash'],
    external_org_source: ['provider_config_id', 'external_tenant_id', 'display_name'],
    external_department_mapping: ['source_id', 'external_department_id'],
    org_sync_run: ['source_id'],
    org_sync_diff_item: ['run_id', 'external_department_id', 'action'],
    org_unit: ['code', 'parent_id', 'name'],
    audit_log: ['target_type', 'target_id', 'event_type', 'operator_id']
};
const order = ['external_login_ticket', 'identity_provider_oauth_grant', 'external_identity', 'org_sync_diff_item', 'org_sync_run', 'external_department_mapping', 'external_org_source', 'identity_provider_config', 'audit_log', 'org_unit'];
const auditTypes = ['IdentityProviderConfig', 'ExternalIdentity', 'IdentityProviderOAuthGrant', 'ExternalLoginTicket', 'ExternalOrgSource', 'ExternalDepartmentMapping', 'OrgSyncRun'];
const q = (name) => {
    assert(/^[a-z_][a-z0-9_]*$/.test(name));
    return '"' + name + '"';
};
const hash = (value) => createHash('sha256').update(value).digest('hex');
const encodeSecret = (plaintext, source) => {
    const iv = randomBytes(12),
        cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(source).digest(), iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${data.toString('base64')}`;
};
function writeDurable(file, value, fresh = false) {
    const temporary = file + '.' + randomUUID() + '.tmp';
    if (fresh) assert(!existsSync(file));
    const fd = openSync(temporary, 'wx', 0o600);
    try {
        writeFileSync(fd, JSON.stringify(value) + '\n');
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    renameSync(temporary, file);
    const parent = openSync(path.dirname(file), 'r');
    try {
        fsyncSync(parent);
    } finally {
        closeSync(parent);
    }
}
function assertPrivate(file) {
    const stat = lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 && stat.size < 16 * 1024 * 1024);
}

export class OwnedFixture {
    constructor(client, backend, runId) {
        assert(['nest', 'rust'].includes(backend) && UUID.test(runId));
        this.client = client;
        this.backend = backend;
        this.runId = runId;
        this.permissions = validateSource();
        this.baseStore = journalStore({ backend, runId }, privateRoot);
        const directory = path.join(privateRoot, 'runs');
        if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 });
        this.file = path.join(directory, `${backend}-${runId}-gh.json`);
        if (existsSync(this.file)) {
            assertPrivate(this.file);
            this.j = JSON.parse(readFileSync(this.file));
            assert.equal(this.j.runId, runId);
            assert.equal(this.j.backend, backend);
        }
    }
    static async connect(backend, runId) {
        return new OwnedFixture(await databaseClient(backend), backend, runId);
    }
    save(fresh = false) {
        writeDurable(this.file, this.j, fresh);
    }
    request(action, account = 'none', extra = {}) {
        return { formatVersion: 1, backend: this.backend, runId: this.runId, action, account, ...extra };
    }
    async base(action, account = 'none', extra = {}) {
        const normalized = { ...extra };
        if (normalized.sessionToken !== undefined) {
            assert(typeof normalized.sessionToken === 'string' && /^[A-Za-z0-9_-]{43}$/.test(normalized.sessionToken));
            const digest = hash(normalized.sessionToken);
            if (normalized.sessionHash !== undefined) assert.equal(normalized.sessionHash, digest);
            normalized.sessionHash = digest;
            delete normalized.sessionToken;
        }
        if (action === 'snapshot') {
            assert(this.j?.state === 'prepared');
            await this.adoptAudits();
            const base = this.baseStore.read();
            assert.equal(base?.state, 'prepared');
            return baseSnapshot(
                this.client,
                this.request(action, account, normalized),
                base,
                this.j.objects.filter((object) => object.table === 'audit_log')
            );
        }
        return executeFixture(this.client, this.request(action, account, normalized), this.permissions, this.baseStore);
    }
    async prepare() {
        const base = await this.base('prepare');
        this.lastPrepareCounts = { matched: base.matched, changed: base.changed };
        if (this.j) {
            assert.equal(this.j.state, 'prepared');
            return this.describe();
        }
        const rootId = randomUUID(),
            providerId = randomUUID(),
            compact = this.runId.replaceAll('-', '');
        this.j = {
            formatVersion: 1,
            backend: this.backend,
            runId: this.runId,
            state: 'planned',
            baseUsers: base.fixture.accounts.map((a) => a.userId),
            rootId,
            providerId,
            tenant: `gh-${compact}`,
            clientId: `gh-client-${compact}`,
            subject: `gh-subject-${compact}`,
            objects: [],
            intents: [],
            createdAt: new Date().toISOString()
        };
        this.save(true);
        const key = managed(this.backend).childEnv.IDENTITY_PROVIDER_SECRET_KEY;
        const encrypted = encodeSecret(`synthetic-gh-secret-${compact}`, key);
        await this.client.query('BEGIN');
        try {
            assert.equal((await this.client.query('select id from poms.org_unit where id=$1 or code=$2', [rootId, `gh-root-${compact}`])).rowCount, 0);
            assert.equal((await this.client.query('select id from poms.identity_provider_config where id=$1 or tenant_id=$2', [providerId, this.j.tenant])).rowCount, 0);
            await this.client.query('insert into poms.org_unit(id,name,code,is_active,display_order) values($1,$2,$3,true,0)', [rootId, `GH owned root ${compact}`, `gh-root-${compact}`]);
            await this.client.query(
                "insert into poms.identity_provider_config(id,provider,tenant_id,display_name,status,enabled,login_enabled,binding_enabled,search_enabled,client_id,encrypted_client_secret,secret_updated_at,redirect_uri,search_redirect_uri,login_scopes_json,search_scopes_json,tenant_allowlist_json,created_by,updated_by) values($1,'feishu',$2,$3,'active',true,true,true,true,$4,$5,now(),$6,$7,'[\"contact:user.base:readonly\"]'::jsonb,'[]'::jsonb,'[]'::jsonb,$8,$8)",
                [
                    providerId,
                    this.j.tenant,
                    `GH owned provider ${compact}`,
                    this.j.clientId,
                    encrypted,
                    `http://127.0.0.1:${this.backend === 'nest' ? 5700 : 5701}/api/auth/identity-providers:callback`,
                    `http://127.0.0.1:${this.backend === 'nest' ? 5700 : 5701}/api/platform/identity-provider-oauth-grants:callback`,
                    this.j.baseUsers[0]
                ]
            );
            this.j.objects.push(
                { table: 'org_unit', id: rootId, origin: 'prepare', identity: { code: `gh-root-${compact}` } },
                { table: 'identity_provider_config', id: providerId, origin: 'prepare', identity: { tenant_id: this.j.tenant, client_id: this.j.clientId } }
            );
            this.save();
            await this.client.query('COMMIT');
            this.j.state = 'prepared';
            this.save();
            this.lastPrepareCounts.changed += 2;
            return this.describe();
        } catch (error) {
            await this.client.query('ROLLBACK');
            throw error;
        }
    }
    describe() {
        return { runId: this.runId, backend: this.backend, rootId: this.j.rootId, providerId: this.j.providerId, tenant: this.j.tenant, clientId: this.j.clientId, subject: this.j.subject, accounts: this.baseStore.read().accounts };
    }
    predicate(table, selector) {
        assert(tables.includes(table) && selector && typeof selector === 'object' && !Array.isArray(selector));
        const entries = Object.entries(selector);
        assert(entries.length > 0 && entries.every(([key, value]) => selectors[table].includes(key) && (typeof value === 'string' || value === null)));
        return { sql: entries.map(([key], index) => `${q(key)} is not distinct from $${index + 1}`).join(' and '), args: entries.map(([, value]) => value) };
    }
    async rows(table, selector) {
        const where = this.predicate(table, selector);
        return (await this.client.query(`select id::text,to_jsonb(t)::text as snapshot from poms.${q(table)} t where ${where.sql} order by id`, where.args)).rows;
    }
    async plan(key, table, selector, max = 1) {
        assert(this.j && this.j.state === 'prepared' && /^[a-z0-9:-]{1,100}$/.test(key));
        assert(Number.isSafeInteger(max) && max > 0 && max <= 2000);
        assert(!this.j.intents.some((intent) => intent.key === key));
        const owned = (kind, id) => this.j.objects.some((object) => object.table === kind && object.id === id);
        const compact = this.runId.replaceAll('-', '');
        if (table === 'identity_provider_config') assert(typeof selector.tenant_id === 'string' && selector.tenant_id.includes(compact), 'Provider intent requires exact run tenant');
        else if (['external_identity', 'identity_provider_oauth_grant', 'external_login_ticket'].includes(table)) {
            assert(owned('identity_provider_config', selector.identity_provider_config_id) && this.j.baseUsers.includes(selector.poms_user_id), 'Identity intent requires owned provider and account');
            if (table === 'external_identity') assert(typeof selector.subject_id === 'string' && selector.subject_id.includes(compact));
            if (table === 'external_login_ticket') assert(owned('external_identity', selector.external_identity_id));
        } else if (table === 'external_org_source')
            assert(
                (selector.provider_config_id === undefined || selector.provider_config_id === null || owned('identity_provider_config', selector.provider_config_id)) &&
                    typeof selector.external_tenant_id === 'string' &&
                    selector.external_tenant_id.includes(compact)
            );
        else if (['external_department_mapping', 'org_sync_run'].includes(table)) assert(owned('external_org_source', selector.source_id));
        else if (table === 'org_sync_diff_item') assert(owned('org_sync_run', selector.run_id));
        else if (table === 'org_unit') {
            assert(typeof selector.code === 'string');
            if (!selector.code.toLowerCase().includes(compact)) {
                const runs = this.j.objects.filter((object) => object.table === 'org_sync_run').map((object) => object.id);
                const match = await this.client.query("select id from poms.org_sync_diff_item where run_id=any($1::uuid[]) and action='create_org_unit' and candidate_snapshot_json->>'targetCode'=$2", [runs, selector.code]);
                assert.equal(match.rowCount, 1, 'Generated org code must come from one owned pre-apply diff');
            }
            if (selector.parent_id !== undefined && selector.parent_id !== null) assert(owned('org_unit', selector.parent_id));
        } else assert.fail('Unsupported public intent table');
        const before = await this.rows(table, selector);
        const intent = { key, table, selector, max, beforeIds: before.map((row) => row.id), adoptedIds: [], plannedAt: new Date().toISOString() };
        this.j.intents.push(intent);
        this.save();
        return intent;
    }
    async adopt(key) {
        const intent = this.j.intents.find((row) => row.key === key);
        assert(intent);
        if (intent.derived && !intent.selector) {
            const parents = await this.adopt(intent.derived.parentKey);
            if (parents.length === 0) {
                intent.absentParentObservedAt = new Date().toISOString();
                this.save();
                return [];
            }
            assert.equal(parents.length, 1, 'Derived intent requires exactly one owned parent');
            intent.selector = { [intent.derived.column]: parents[0].id };
            this.save();
        }
        const rows = await this.rows(intent.table, intent.selector),
            added = rows.filter((row) => !intent.beforeIds.includes(row.id) && !this.j.objects.some((object) => object.table === intent.table && object.id === row.id && object.origin !== intent.key));
        assert(added.length <= intent.max, 'Intent maximum exceeded');
        for (const row of added) {
            assert(UUID.test(row.id));
            if (!this.j.objects.some((object) => object.table === intent.table && object.id === row.id)) this.j.objects.push({ table: intent.table, id: row.id, origin: key, identity: intent.selector });
        }
        intent.adoptedIds = added.map((row) => row.id);
        intent.observedAt = new Date().toISOString();
        this.save();
        return added.map((row) => ({ id: row.id, data: JSON.parse(row.snapshot) }));
    }
    async planDerived(key, table, parentKey, column, max = 500) {
        assert(/^[a-z0-9:-]{1,100}$/.test(key) && Number.isSafeInteger(max) && max > 0 && max <= 2000);
        const parent = this.j.intents.find((row) => row.key === parentKey);
        assert(parent && parent.table === 'org_sync_run' && table === 'org_sync_diff_item' && column === 'run_id');
        assert(!this.j.intents.some((row) => row.key === key));
        this.j.intents.push({ key, table, selector: null, derived: { parentKey, column }, max, beforeIds: [], adoptedIds: [], plannedAt: new Date().toISOString() });
        this.save();
    }
    async adoptChildren(sourceId) {
        assert(this.j.objects.some((row) => row.table === 'external_org_source' && row.id === sourceId));
        for (const intent of this.j.intents.filter((row) => row.selector?.source_id === sourceId)) await this.adopt(intent.key);
    }
    async facts() {
        const output = {};
        for (const table of tables) {
            const ids = this.j.objects.filter((row) => row.table === table).map((row) => row.id);
            output[table] = ids.length ? (await this.client.query(`select to_jsonb(t)::text as snapshot from poms.${q(table)} t where id=any($1::uuid[]) order by id`, [ids])).rows.map((row) => JSON.parse(row.snapshot)) : [];
        }
        return output;
    }
    async adoptAudits() {
        const ids = this.j.objects.filter((row) => row.table !== 'audit_log' && row.table !== 'org_unit').map((row) => row.id);
        if (!ids.length) return;
        const { rows } = await this.client.query('select id::text,target_type,target_id,operator_id::text,event_type from poms.audit_log where target_type=any($1::text[]) and target_id=any($2::text[])', [auditTypes, ids]);
        for (const row of rows) {
            assert(row.operator_id === null || this.j.baseUsers.includes(row.operator_id));
            assert(/^(?:identity-provider|external-identity|external-login|external-org-source|external-department-mapping|org-sync-run)\./.test(row.event_type), 'Unknown GH audit event');
            if (!this.j.objects.some((object) => object.table === 'audit_log' && object.id === row.id))
                this.j.objects.push({ table: 'audit_log', id: row.id, origin: 'exact-owned-target-audit', identity: { target_type: row.target_type, target_id: row.target_id, event_type: row.event_type, operator_id: row.operator_id } });
        }
        this.save();
    }
    async assertReferences() {
        const { rows: edges } = await this.client.query(
            "select ns.nspname as schema,cl.relname as table,a.attname as column,tn.nspname as target_schema,tc.relname as target_table from pg_constraint c join pg_class cl on cl.oid=c.conrelid join pg_namespace ns on ns.oid=cl.relnamespace join pg_class tc on tc.oid=c.confrelid join pg_namespace tn on tn.oid=tc.relnamespace join pg_attribute a on a.attrelid=cl.oid and a.attnum=c.conkey[1] where c.contype='f' and cardinality(c.conkey)=1 and cardinality(c.confkey)=1 and tn.nspname='poms' and tc.relname=any($1::text[])",
            [tables.filter((table) => table !== 'audit_log')]
        );
        for (const edge of edges) {
            const ids = this.j.objects.filter((row) => row.table === edge.target_table).map((row) => row.id);
            if (!ids.length) continue;
            const found = await this.client.query(`select to_jsonb(t) as row from ${q(edge.schema)}.${q(edge.table)} t where ${q(edge.column)}=any($1::uuid[])`, [ids]);
            for (const { row } of found.rows)
                assert(
                    edge.schema === 'poms' && this.j.objects.some((object) => object.table === edge.table && object.id === row.id),
                    `Unknown incoming GH reference: ${edge.schema}.${edge.table}.${edge.column} -> ${edge.target_table}; row=${typeof row.id === 'string' ? row.id : 'no-id'}`
                );
        }
        const ownedOrgs = this.j.objects.filter((row) => row.table === 'org_unit').map((row) => row.id);
        if (ownedOrgs.length) {
            const rows = (await this.client.query('select id::text,parent_id::text,code from poms.org_unit where id=any($1::uuid[])', [ownedOrgs])).rows;
            for (const row of rows) {
                assert(row.parent_id === null || ownedOrgs.includes(row.parent_id), 'Owned GH subtree escaped');
                const identity = this.j.objects.find((object) => object.table === 'org_unit' && object.id === row.id).identity;
                if (identity.code) assert.equal(row.code, identity.code);
            }
        }
    }
    async preflightReferences() {
        const baseJournal = this.baseStore.read();
        const result = await assertCompleteReferences(this.client, baseJournal, this.j);
        this.baseStore.write(baseJournal);
        return result;
    }
    async cleanup() {
        assert(this.j && ['prepared', 'planned', 'cleaned'].includes(this.j.state));
        assert((this.j.cryptoFaults ?? []).every(fault => fault.phase === 'restored'), 'Pending cipher faults must be restored before cleanup');
        if (this.j.state !== 'cleaned') for (const intent of this.j.intents.toReversed()) await this.adopt(intent.key);
        await this.adoptAudits();
        await this.client.query('BEGIN');
        let removed = 0;
        let completeReferenceGuard;
        try {
            await this.client.query("set local statement_timeout='20s'");
            completeReferenceGuard = await this.preflightReferences();
            await this.assertReferences();
            for (const table of order) {
                const ids = this.j.objects.filter((row) => row.table === table).map((row) => row.id);
                if (!ids.length) continue;
                if (table === 'org_unit') {
                    const remaining = new Set(ids);
                    while (remaining.size) {
                        const leaves = (await this.client.query('select id::text from poms.org_unit p where id=any($1::uuid[]) and not exists(select 1 from poms.org_unit c where c.parent_id=p.id)', [[...remaining]])).rows.map((row) => row.id);
                        const existing = (await this.client.query('select id::text from poms.org_unit where id=any($1::uuid[])', [[...remaining]])).rows.map((row) => row.id);
                        for (const id of [...remaining]) if (!existing.includes(id)) remaining.delete(id);
                        if (!remaining.size) break;
                        assert(leaves.length > 0, 'Owned GH org cycle');
                        removed += (await this.client.query('delete from poms.org_unit where id=any($1::uuid[])', [leaves])).rowCount;
                        for (const id of leaves) remaining.delete(id);
                    }
                } else removed += (await this.client.query(`delete from poms.${q(table)} where id=any($1::uuid[])`, [ids])).rowCount;
            }
            await this.client.query('COMMIT');
        } catch (error) {
            await this.client.query('ROLLBACK');
            throw error;
        }
        const base = await this.base('cleanup');
        // The extension transaction and the inherited base cleanup are separate.
        // Publish completion only after both have succeeded, so an interrupted
        // base cleanup remains visibly pending and can be resumed by its journal.
        this.j.state = 'cleaned';
        this.j.cleanedAt = new Date().toISOString();
        this.save();
        return { matched: removed + base.matched, changed: removed + base.changed, extensionRemoved: removed, base, completeReferenceGuard, zero: removed === 0 && base.matched === 0 && base.changed === 0 };
    }
    async close() {
        await this.client.end();
    }
    receipt() {
        return { runId: this.runId, backend: this.backend, journalHash: hash(readFileSync(this.file)), objects: this.j.objects.map(({ table, id, origin }) => ({ table, id, origin })), privateSnapshotsPersistedOnlyInJournal: true };
    }
    requestIdentity() {
        return fixtureRequestIdentity(this.runId);
    }
}
