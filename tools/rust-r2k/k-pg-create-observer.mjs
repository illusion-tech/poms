// PostgreSQL AFTER INSERT observation only. No DDL/connection runs on import or --check.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '../..');
const PRIVATE = '/home/wangzishi/.local/share/poms-r2k/private';
const MARKER = '6790e07a-a012-4f1c-b597-fde1750fc135';
const APP = 'poms_r2k_app', OWNER = 'poms_r0e_owner', SCHEMA = 'r2k_control';
const TABLES = Object.freeze(['attachment_upload_session', 'attachment', 'attachment_link', 'project_handover_attachment_selection', 'attachment_download_package', 'attachment_download_package_item', 'audit_log']);
const MOD = 4294967296n;
const sha = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const ident = value => { assert(/^[a-z_][a-z0-9_]{0,62}$/.test(value)); return '"' + value + '"'; };
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
const uuid = value => { assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 'Exact UUID required'); return value.toLowerCase(); };

function auditAuthority() {
    const file = 'apps/poms-api/src/app/features/attachment/attachment.service.ts';
    const raw = fs.readFileSync(path.join(ROOT, file)), source = raw.toString('utf8');
    const frozen = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/rust-r2k/k-sources.json'), 'utf8')).sources.find(row => row.file === file);
    assert(frozen && (sha(raw) === frozen.rawBytesSha256 || sha(source.replace(/\r\n/g, '\n')) === frozen.normalizedLfSha256), 'Original AttachmentService authority changed');
    const events = [...new Set([...source.matchAll(/this\.recordAudit\(\s*'([^']+)'/g)].map(match => match[1]))];
    assert.equal(events.length, 19, 'Expected exactly nineteen original attachment audit literals');
    assert(events.every(value => /^(attachment|attachment_upload_session)\.[a-z_]+$/.test(value)));
    return { file, rawBytesSha256: sha(raw), normalizedLfSha256: sha(source.replace(/\r\n/g, '\n')), events };
}

function namesFor(id) {
    const token = uuid(id).replaceAll('-', '').slice(0, 20);
    return { context: 'k_ci_' + token + '_context', events: 'k_ci_' + token + '_events', fn: 'k_ci_' + token + '_capture', trigger: 'k_ci_' + token };
}

function statements({ id, database, runId, names, auditEvents }) {
    assert(['poms_r2k_nest', 'poms_r2k_rust'].includes(database)); uuid(id); uuid(runId);
    const context = `${ident(SCHEMA)}.${ident(names.context)}`, events = `${ident(SCHEMA)}.${ident(names.events)}`, fn = `${ident(SCHEMA)}.${ident(names.fn)}`;
    const functionSql = `CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $r2k_ci$
DECLARE c record; r jsonb; permitted boolean := false; actor text; target text; root_project text; root_handover text; xid xid8;
BEGIN
  IF TG_OP <> 'INSERT' OR TG_WHEN <> 'AFTER' OR TG_LEVEL <> 'ROW' OR TG_TABLE_SCHEMA <> 'poms'
     OR TG_NAME <> ${literal(names.trigger)} OR session_user::text <> ${literal(APP)}
     OR current_database() <> ${literal(database)} OR TG_TABLE_NAME <> ALL(ARRAY[${TABLES.map(literal).join(',')}]) THEN RETURN NEW; END IF;
  SELECT * INTO c FROM ${context} WHERE observer_id=${literal(id)}::uuid AND run_id=${literal(runId)}::uuid AND case_id IS NOT NULL;
  IF NOT FOUND THEN RETURN NEW; END IF;
  r := to_jsonb(NEW); xid := pg_current_xact_id();
  IF r->>'id' IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'attachment_upload_session' THEN
    actor := r->>'created_by';
    permitted := c.scope->'actors' ? actor AND (
      EXISTS (SELECT 1 FROM jsonb_array_elements(c.scope->'targets') t WHERE t->>'type'=r->>'target_type' AND t->>'id'=r->>'target_id')
      OR (r->>'operation_type'='create-version' AND c.scope->'attachments' ? (r->>'base_attachment_id')));
  ELSIF TG_TABLE_NAME = 'attachment' THEN
    actor := r->>'uploaded_by';
    permitted := c.scope->'actors' ? actor AND EXISTS (
      SELECT 1 FROM poms.attachment_upload_session s WHERE s.storage_key=r->>'storage_key'
       AND s.provider_type=r->>'storage_provider' AND s.storage_bucket IS NOT DISTINCT FROM r->>'storage_bucket'
       AND c.scope->'actors' ? s.created_by::text
       AND (c.scope->'sessions' ? s.id::text OR EXISTS (SELECT 1 FROM ${events} e WHERE e.observer_id=c.observer_id AND e.run_id=c.run_id AND e.case_id=c.case_id AND e.source_table='attachment_upload_session' AND e.source_id=s.id)));
  ELSIF TG_TABLE_NAME = 'attachment_link' THEN
    actor := r->>'linked_by';
    permitted := c.scope->'actors' ? actor
      AND (c.scope->'attachments' ? (r->>'attachment_id') OR EXISTS (SELECT 1 FROM ${events} e WHERE e.observer_id=c.observer_id AND e.run_id=c.run_id AND e.case_id=c.case_id AND e.source_table='attachment' AND e.source_id=(r->>'attachment_id')::uuid))
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.scope->'targets') t WHERE t->>'type'=r->>'target_type' AND t->>'id'=r->>'target_id');
  ELSIF TG_TABLE_NAME IN ('project_handover_attachment_selection','attachment_download_package') THEN
    actor := r->>'created_by'; root_project := r->>'project_id'; root_handover := r->>'handover_id';
    permitted := c.scope->'actors' ? actor
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.scope->'roots') t WHERE t->>'projectId'=root_project AND t->>'handoverId'=root_handover)
      AND (TG_TABLE_NAME='attachment_download_package' OR r->>'attachment_id' IS NULL OR c.scope->'attachments' ? (r->>'attachment_id'));
  ELSIF TG_TABLE_NAME = 'attachment_download_package_item' THEN
    SELECT p.created_by::text,p.project_id::text,p.handover_id::text INTO actor,root_project,root_handover
      FROM poms.attachment_download_package p WHERE p.id=(r->>'package_id')::uuid
       AND (c.scope->'packages' ? p.id::text OR EXISTS (SELECT 1 FROM ${events} e WHERE e.observer_id=c.observer_id AND e.run_id=c.run_id AND e.case_id=c.case_id AND e.source_table='attachment_download_package' AND e.source_id=p.id));
    permitted := FOUND AND c.scope->'actors' ? actor AND root_handover=r->>'handover_id'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.scope->'roots') t WHERE t->>'projectId'=root_project AND t->>'handoverId'=root_handover)
      AND (r->>'attachment_id' IS NULL OR c.scope->'attachments' ? (r->>'attachment_id'));
  ELSIF TG_TABLE_NAME = 'audit_log' THEN
    actor := r->>'operator_id'; target := r->>'target_id';
    IF target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN target := lower(target); END IF;
    permitted := c.scope->'actors' ? actor AND r->>'request_id'=c.request_id AND r->>'target_type'='attachment'
      AND r->>'event_type'=ANY(ARRAY[${auditEvents.map(literal).join(',')}])
      AND r->>'result'=ANY(ARRAY['success','failed','rejected'])
      AND (EXISTS (SELECT 1 FROM jsonb_array_elements(c.scope->'targets') t WHERE t->>'id'=target)
        OR c.scope->'sessions' ? target OR c.scope->'attachments' ? target OR c.scope->'packages' ? target
        OR EXISTS (SELECT 1 FROM ${events} e WHERE e.observer_id=c.observer_id AND e.run_id=c.run_id AND e.case_id=c.case_id
          AND e.source_table=ANY(ARRAY['attachment_upload_session','attachment','attachment_download_package']) AND e.source_id::text=target));
  END IF;
  IF permitted IS TRUE THEN
    INSERT INTO ${events}(observer_id,run_id,case_id,case_index,op,source_database,source_table,source_id,actor_id,root_project_id,root_handover_id,outer_xid,application_name,event_type)
      VALUES(c.observer_id,c.run_id,c.case_id,c.case_index,c.op,current_database(),TG_TABLE_NAME,(r->>'id')::uuid,actor::uuid,root_project::uuid,root_handover::uuid,xid,current_setting('application_name',true),CASE WHEN TG_TABLE_NAME='audit_log' THEN r->>'event_type' ELSE NULL END);
  END IF;
  RETURN NEW;
END;
$r2k_ci$`;
    return {
        create: [
            `CREATE TABLE ${context}(observer_id uuid NOT NULL,run_id uuid NOT NULL,request_id text NOT NULL,case_id text,case_index integer,op text,scope jsonb NOT NULL,used_cases text[] NOT NULL DEFAULT '{}')`,
            `CREATE TABLE ${events}(event_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),observer_id uuid NOT NULL,run_id uuid NOT NULL,case_id text NOT NULL,case_index integer NOT NULL,op text NOT NULL,source_database text NOT NULL,source_table text NOT NULL,source_id uuid NOT NULL,actor_id uuid NOT NULL,root_project_id uuid,root_handover_id uuid,outer_xid xid8 NOT NULL,application_name text,event_type text,observed_at timestamptz NOT NULL DEFAULT clock_timestamp())`,
            `REVOKE ALL ON TABLE ${context},${events} FROM PUBLIC,${ident(APP)}`,
            functionSql,
            `REVOKE ALL ON FUNCTION ${fn}() FROM PUBLIC,${ident(APP)}`,
            `GRANT EXECUTE ON FUNCTION ${fn}() TO ${ident(APP)}`,
            ...TABLES.map(table => `CREATE TRIGGER ${ident(names.trigger)} AFTER INSERT ON poms.${ident(table)} FOR EACH ROW EXECUTE FUNCTION ${fn}()`)
        ],
        drop: [...TABLES.map(table => `DROP TRIGGER ${ident(names.trigger)} ON poms.${ident(table)}`), `DROP FUNCTION ${fn}()`, `DROP TABLE ${events}`, `DROP TABLE ${context}`],
        context, events, fn, functionSql
    };
}

function writeJournal(file, value, first = false) {
    const temporary = first ? file : file + '.' + randomUUID() + '.tmp';
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if (!first) fs.renameSync(temporary, file);
    const parent = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); }
}

async function identity(client, database, owner) {
    const { rows } = await client.query(`SELECT current_database() AS database,session_user::text AS session_user,current_user::text AS current_user,current_setting('server_version_num') AS version,current_setting('port') AS port,current_setting('poms.r0e_isolated',true) AS isolated,pg_get_userbyid(d.datdba) AS database_owner FROM pg_database d WHERE d.datname=current_database()`);
    assert.deepEqual(rows, [{ database, session_user: owner ? OWNER : APP, current_user: owner ? OWNER : APP, version: '150012', port: '15432', isolated: 'on', database_owner: OWNER }], 'Wrong task database/role/cluster');
    if (owner) {
        const marker = await client.query('SELECT database_name,instance_id::text AS marker FROM r2k_control.marker');
        assert.deepEqual(marker.rows, [{ database_name: database, marker: MARKER }], 'New K marker mismatch');
    } else {
        const privileges = await client.query(`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,rolreplication,(SELECT count(*)::integer FROM pg_auth_members WHERE member=r.oid) AS memberships,has_schema_privilege(current_user,'r2k_control','USAGE') AS control_usage,has_schema_privilege(current_user,'r2k_control','CREATE') AS control_create,has_schema_privilege(current_user,'poms','CREATE') AS product_create,has_schema_privilege(current_user,'public','CREATE') AS public_create,has_database_privilege(current_user,current_database(),'CREATE') AS database_create FROM pg_roles r WHERE rolname=current_user`);
        assert.deepEqual(privileges.rows, [{ rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolbypassrls: false, rolreplication: false, memberships: 0, control_usage: false, control_create: false, product_create: false, public_create: false, database_create: false }], 'Runtime role privilege boundary changed');
    }
}

async function catalog(client) {
    const relations = await client.query(`SELECT n.nspname,c.relname,c.oid::text,c.relkind::text,pg_get_userbyid(c.relowner) AS owner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,
        indexed.oid::text AS index_of_oid,indexed.relname AS index_of_table,indexed_ns.nspname AS index_of_schema,
        i.indisprimary AS index_is_primary,i.indisunique AS index_is_unique,i.indisvalid AS index_is_valid,i.indisready AS index_is_ready,
        i.indexprs::text AS index_expressions,i.indpred::text AS index_predicate,
        CASE WHEN i.indexrelid IS NOT NULL THEN ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum,ordinal) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum ORDER BY k.ordinal) END AS index_columns,
        CASE WHEN i.indexrelid IS NOT NULL THEN pg_get_indexdef(c.oid) END AS index_definition
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        LEFT JOIN pg_index i ON i.indexrelid=c.oid LEFT JOIN pg_class indexed ON indexed.oid=i.indrelid LEFT JOIN pg_namespace indexed_ns ON indexed_ns.oid=indexed.relnamespace
        WHERE (n.nspname='poms' AND c.relname=ANY($1::text[])) OR n.nspname='r2k_control' ORDER BY n.nspname,c.relname`, [TABLES]);
    const schema = await client.query(`SELECT oid::text,nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text FROM pg_namespace WHERE nspname='r2k_control'`);
    const triggers = await client.query(`SELECT t.oid::text,t.tgname,c.relname,t.tgfoid::text,t.tgenabled,t.tgisinternal,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relname=ANY($1::text[]) ORDER BY c.relname,t.tgname`, [TABLES]);
    const functions = await client.query(`SELECT p.oid::text,p.proname,pg_get_userbyid(p.proowner) AS owner,p.proacl::text,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r2k_control' ORDER BY p.proname,p.oid`);
    return { schema: schema.rows, relations: relations.rows, triggers: triggers.rows, functions: functions.rows };
}

function assertInitialControlRelations(relations) {
    const control = relations.filter(row => row.nspname === SCHEMA);
    // database-environment.mjs:102 creates exactly this table and its PK index.
    // Keep every relkind in the inventory; do not hide unknown indexes/sequences.
    assert.deepEqual(control.map(row => [row.relname, row.relkind]), [['marker', 'r'], ['marker_pkey', 'i']], 'Unexpected control namespace objects; do not adopt previous observers');
    const [table, index] = control;
    assert.equal(table.owner, OWNER); assert.equal(index.owner, OWNER);
    assert.equal(index.index_of_oid, table.oid); assert.equal(index.index_of_schema, SCHEMA); assert.equal(index.index_of_table, 'marker');
    assert(index.index_is_primary === true && index.index_is_unique === true && index.index_is_valid === true && index.index_is_ready === true, 'Original marker primary-key index mismatch');
    assert.deepEqual(index.index_columns, ['database_name']);
    assert.equal(index.index_expressions, null); assert.equal(index.index_predicate, null);
    assert.equal(typeof index.index_definition, 'string'); assert(index.index_definition.length > 0);
}

function certified(object) {
    const proof = object.creationProof;
    return proof?.kind === 'direct-committed-insert' && proof.beforeAbsent === true && /^\d+$/.test(proof.transaction ?? '')
        || proof?.kind === 'observed-committed-insert' && ['mikro-orm-afterCreate-outer-commit', 'rust-insert-outer-commit', 'pg-after-insert-observed-outer-commit'].includes(proof.proof?.kind);
}

async function scopeFor(fixture, owner) {
    assert.equal(fixture.j.state, 'prepared'); assert.equal(fixture.j.backend, fixture.backend); assert.equal(fixture.j.runId, fixture.runId);
    assert.equal(fixture.base.runId, fixture.runId); assert(Array.isArray(fixture.j.logicalIds) && Array.isArray(fixture.j.objects));
    const logical = new Set(fixture.j.logicalIds.map(uuid)), actors = [];
    for (const account of [...fixture.base.accounts, ...(fixture.base.users ?? []).filter(account => account.userId)]) {
        const id = uuid(account.userId); assert.equal(typeof account.username, 'string');
        const result = await owner.query('SELECT id::text,username FROM poms.platform_user WHERE id=$1::uuid', [id]);
        assert.deepEqual(result.rows, [{ id, username: account.username }], 'Owned actor identity changed'); actors.push(id);
    }
    assert(actors.length >= 2 && new Set(actors).size === actors.length);
    const objects = fixture.j.objects;
    const readOwned = async object => {
        assert(certified(object), 'Uncertified/DTO row cannot enter observer scope');
        const id = uuid(object.id); assert(logical.has(id));
        const row = (await owner.query(`SELECT to_jsonb(t) AS row FROM poms.${ident(object.table)} t WHERE id=$1::uuid`, [id])).rows;
        assert.equal(row.length, 1, 'Observer scoped row missing');
        assert(Object.keys(object.identity).length > 0 && Object.entries(object.identity).every(([key, value]) => JSON.stringify(row[0].row[key] ?? null) === JSON.stringify(value)), 'Scoped logical identity changed');
        return row[0].row;
    };
    const projects = [], roots = [], targets = [];
    for (const object of objects.filter(object => object.table === 'project')) { const row = await readOwned(object); assert(actors.includes(row.owner_user_id), 'Project owner is outside this run'); projects.push(uuid(row.id)); targets.push({ type: 'project', id: uuid(row.id) }); }
    assert(projects.length > 0, 'At least one real owned project is required');
    for (const object of objects.filter(object => object.table === 'project_handover')) { const row = await readOwned(object); assert(projects.includes(row.project_id)); roots.push({ projectId: uuid(row.project_id), handoverId: uuid(row.id) }); targets.push({ type: 'project-handover', id: uuid(row.id) }); }
    assert(roots.length > 0, 'At least one real owned handover is required');
    const ownedSourceLeads = [];
    for (const object of objects.filter(object => object.table === 'lead')) {
        const row = await readOwned(object);
        const linked = await owner.query('SELECT 1 FROM poms.project WHERE id=ANY($1::uuid[]) AND source_lead_id=$2::uuid', [projects, row.id]);
        if (linked.rows.length) { ownedSourceLeads.push(uuid(row.id)); targets.push({ type: 'lead', id: uuid(row.id) }); }
    }
    for (const object of objects.filter(object => ['contract', 'sales_follow_up_record'].includes(object.table))) {
        const row = await readOwned(object);
        if (object.table === 'contract' && projects.includes(row.project_id)) targets.push({ type: 'contract', id: uuid(row.id) });
        if (object.table === 'sales_follow_up_record' && (projects.includes(row.project_id) || ownedSourceLeads.includes(row.lead_id))) targets.push({ type: 'sales-follow-up', id: uuid(row.id) });
    }
    const ids = { attachments: [], sessions: [], packages: [] };
    for (const [table, key, actorColumn] of [['attachment', 'attachments', 'uploaded_by'], ['attachment_upload_session', 'sessions', 'created_by'], ['attachment_download_package', 'packages', 'created_by']]) {
        for (const object of objects.filter(object => object.table === table)) {
            const row = await readOwned(object); assert(actors.includes(row[actorColumn]));
            if (table === 'attachment_download_package') assert(roots.some(root => root.handoverId === row.handover_id && root.projectId === row.project_id));
            ids[key].push(uuid(row.id));
        }
    }
    return { actors, projects, roots, targets, ...ids };
}

async function appQuiet(owner, database) {
    const pending = await owner.query('SELECT pid,application_name,state,backend_xid::text FROM pg_stat_activity WHERE datname=$1 AND usename=$2 AND xact_start IS NOT NULL ORDER BY pid', [database, APP]);
    if (pending.rows.length) { const error = new Error('Observer case has app transactions still in progress; no outer-commit proof is issued'); error.code = 'R2K_OBSERVER_PENDING'; error.pending = pending.rows; throw error; }
}

export async function installPgCreateObserver(fixture) {
    assert.equal(process.platform, 'linux', 'Actual observer is confined to the new Linux K environment');
    assert(['nest', 'rust'].includes(fixture.backend)); const runId = uuid(fixture.runId), database = `poms_r2k_${fixture.backend}`;
    assert(fixture.client && typeof fixture.client.query === 'function');
    assert.equal(path.resolve(fixture.file), `${PRIVATE}/k-runs/${fixture.backend}-${runId}.json`);
    for (const file of [PRIVATE, path.dirname(fixture.file), fixture.file]) { const stat = fs.lstatSync(file); assert(!stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'Private task journal boundary'); }
    await identity(fixture.client, database, false);
    const { regularPrivate } = await import('./database-client.mjs');
    const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const owner = new Client({ host: '127.0.0.1', port: 18432, database, user: OWNER, password: regularPrivate(PRIVATE + '/owner-password'), connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: 'poms-r2k-pg-create-observer-owner' });
    const id = randomUUID(), names = namesFor(id), authority = auditAuthority();
    const sql = statements({ id, names, database, runId, auditEvents: authority.events });
    const journalDirectory = PRIVATE + '/pg-create-observers';
    fs.mkdirSync(journalDirectory, { recursive: true, mode: 0o700 });
    const directoryStat = fs.lstatSync(journalDirectory); assert(directoryStat.isDirectory() && !directoryStat.isSymbolicLink() && (directoryStat.mode & 0o077) === 0);
    const journalFile = `${journalDirectory}/${fixture.backend}-${runId}-${id}.json`;
    const journal = { formatVersion: 1, kind: 'scoped-pg-after-insert-observer', id, runId, database, backend: fixture.backend, marker: MARKER, names, authority, catalogScope: { kind: 'observer-footprint-only', productTables: [...TABLES], controlNamespace: SCHEMA, full107TableCatalogVerified: false, fullCatalogVerificationOwner: 'Root before install and after restore' }, source: { file: fileURLToPath(import.meta.url), sha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) }, sqlSha256: sha(JSON.stringify(sql)), state: 'planned', cases: [], exports: [] };
    let active = null, installed = false, closed = false;
    const save = first => writeJournal(journalFile, journal, first);
    try {
        await owner.connect(); await identity(owner, database, true); await appQuiet(owner, database);
        const before = await catalog(owner);
        assert.deepEqual(before.schema.map(row => [row.nspname, row.owner]), [[SCHEMA, OWNER]]);
        assertInitialControlRelations(before.relations);
        assert.equal(before.relations.filter(row => row.nspname === 'poms').length, TABLES.length);
        assert(!before.triggers.some(row => row.tgname === names.trigger) && !before.functions.some(row => row.proname === names.fn));
        const scope = await scopeFor(fixture, owner);
        const { fixtureRequestIdentity } = require('./fixture-protocol.cjs'); const requestId = fixtureRequestIdentity(runId).requestId;
        journal.before = before; journal.scope = scope; journal.requestId = requestId; save(true);
        await owner.query('BEGIN');
        try {
            for (const statement of sql.create) await owner.query(statement);
            await owner.query(`INSERT INTO ${sql.context}(observer_id,run_id,request_id,scope) VALUES($1::uuid,$2::uuid,$3,$4::jsonb)`, [id, runId, requestId, JSON.stringify(scope)]);
            const after = await catalog(owner);
            journal.installedCatalog = after;
            assert.equal(after.triggers.filter(row => row.tgname === names.trigger).length, TABLES.length);
            const fn = after.functions.filter(row => row.proname === names.fn); assert.equal(fn.length, 1); assert(fn[0].prosecdef && fn[0].owner === OWNER); assert.deepEqual(fn[0].proconfig, ['search_path=pg_catalog']);
            // No default privilege may expose scope/events to an unrelated role.
            const acl = await owner.query(`SELECT c.relname,a.grantee::text,a.privilege_type FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) AND a.grantee<>c.relowner`, [SCHEMA, [names.context, names.events]]);
            assert.equal(acl.rows.length, 0, 'Control table privilege escaped owner');
            const functionAcl = await owner.query(`SELECT a.grantee::text,a.privilege_type FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname=$1 AND p.proname=$2 AND (a.grantee NOT IN (p.proowner,(SELECT oid FROM pg_roles WHERE rolname=$3)) OR a.privilege_type<>'EXECUTE')`, [SCHEMA, names.fn, APP]);
            assert.equal(functionAcl.rows.length, 0, 'Trigger function privilege escaped owner/app');
            journal.state = 'install-commit-attempted'; save(); await owner.query('COMMIT'); installed = true; journal.state = 'installed'; save();
        } catch (error) { await owner.query('ROLLBACK'); journal.state = journal.state === 'install-commit-attempted' ? 'install-outcome-unknown' : 'install-rolled-back'; save(); throw error; }
    } catch (error) { await owner.end(); throw error; }

    async function assertUnchanged() {
        await identity(owner, database, true);
        assert.deepEqual(await catalog(owner), journal.installedCatalog, 'Observer/product catalog or ACL changed; exact restore refused');
    }
    async function beginCase({ caseId, index, op }) {
        assert(!closed && installed && active === null, 'Exactly one active observer case');
        assert(typeof caseId === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(caseId));
        assert(Number.isSafeInteger(index) && index >= 0 && index <= 1000000); assert(typeof op === 'string' && /^(k\.http|observer\.[a-z0-9_.-]{1,64})$/.test(op));
        assert(!journal.cases.some(item => item.context.caseId === caseId), 'Case ID cannot be reused');
        await assertUnchanged(); await appQuiet(owner, database); const scope = await scopeFor(fixture, owner);
        const context = { runId, caseId, index, op }, entry = { context, scopeSha256: sha(JSON.stringify(scope)), state: 'begin-intended' }; journal.cases.push(entry); save();
        const update = await owner.query(`UPDATE ${sql.context} SET case_id=$3,case_index=$4,op=$5,scope=$6::jsonb,used_cases=array_append(used_cases,$3) WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id IS NULL AND NOT ($3=ANY(used_cases))`, [id, runId, caseId, index, op, JSON.stringify(scope)]);
        assert.equal(update.rowCount, 1, 'Active/context uniqueness failed'); active = entry; entry.state = 'active'; save(); return clone(context);
    }
    async function drainCase() {
        assert(!closed && installed && active, 'No active observer case'); await assertUnchanged(); await appQuiet(owner, database);
        const context = active.context;
        const result = await owner.query(`SELECT e.*,e.outer_xid::text AS transaction,e.xmin::text AS event_xmin,pg_xact_status(e.outer_xid) AS outer_status FROM ${sql.events} e WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id=$3 ORDER BY observed_at,event_id`, [id, runId, context.caseId]);
        const current = BigInt((await owner.query('SELECT pg_current_xact_id()::text AS transaction')).rows[0].transaction);
        const output = [], seen = new Set();
        for (const event of result.rows) {
            assert.equal(event.source_database, database); assert(TABLES.includes(event.source_table)); assert.equal(event.case_index, context.index); assert.equal(event.op, context.op); assert.equal(event.outer_status, 'committed', 'Unknown/aborted/in-progress transaction cannot certify INSERT');
            const top = BigInt(event.transaction), xmin = BigInt(event.event_xmin); let eventXid = top - top % MOD + xmin; if (eventXid < top) eventXid += MOD;
            assert(current >= eventXid && current - top < MOD / 2n, 'Event xmin epoch/transaction window is ambiguous');
            // Separate-connection MVCC visibility plus committed top xid proves
            // released savepoint rows only after their real outer COMMIT.
            const status = await owner.query('SELECT pg_xact_status($1::xid8) AS status', [eventXid.toString()]); assert.equal(status.rows[0].status, 'committed', 'Event xmin is not committed');
            const key = event.source_table + ':' + uuid(event.source_id); assert(!seen.has(key), 'Repeated INSERT for one ID is ambiguous'); seen.add(key);
            const sourceRow = await owner.query(`SELECT xmin::text AS xmin FROM poms.${ident(event.source_table)} WHERE id=$1::uuid`, [event.source_id]);
            output.push({ table: event.source_table, id: event.source_id, proof: { kind: 'pg-after-insert-observed-outer-commit', observerId: id, marker: MARKER, database, createContext: clone(context), eventId: event.event_id, transaction: event.transaction, eventXmin: event.event_xmin, eventXid8: eventXid.toString(), outerStatus: event.outer_status, eventXminStatus: status.rows[0].status, visibleFromIndependentOwnerConnection: true, sourceXminAtDrain: sourceRow.rows[0]?.xmin ?? null, applicationName: event.application_name, sourceAuthority: journal.source.sha256, functionOid: journal.installedCatalog.functions.find(row => row.proname === names.fn).oid } });
        }
        active.rows = output; active.rawEvents = result.rows; active.state = 'committed-events-exported'; active.exportSha256 = sha(JSON.stringify({ rows: output, events: result.rows })); save();
        const update = await owner.query(`UPDATE ${sql.context} SET case_id=NULL,case_index=NULL,op=NULL WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id=$3`, [id, runId, context.caseId]); assert.equal(update.rowCount, 1);
        active.state = 'drained'; save(); active = null; return clone(output);
    }
    async function restore() {
        assert(!closed && installed, 'Observer already restored or not installed');
        if (active) await drainCase();
        await assertUnchanged(); await appQuiet(owner, database);
        const all = await owner.query(`SELECT e.*,e.outer_xid::text AS transaction,e.xmin::text AS event_xmin,pg_xact_status(e.outer_xid) AS outer_status FROM ${sql.events} e ORDER BY observed_at,event_id`);
        assert(all.rows.every(row => row.observer_id === id && row.run_id === runId && row.source_database === database && row.outer_status === 'committed'));
        journal.exports.push({ at: new Date().toISOString(), events: all.rows, sha256: sha(JSON.stringify(all.rows)) }); journal.state = 'events-exported-before-restore'; save();
        await owner.query('BEGIN');
        try {
            await assertUnchanged();
            for (const statement of sql.drop) await owner.query(statement);
            assert.deepEqual(await catalog(owner), journal.before, 'Original catalog/OID/ACL/trigger definitions were not restored');
            journal.state = 'restore-commit-attempted'; save(); await owner.query('COMMIT'); installed = false; journal.state = 'restored'; save();
        } catch (error) { await owner.query('ROLLBACK'); journal.state = 'restore-failed'; save(); throw error; }
        assert.deepEqual(await catalog(owner), journal.before); closed = true; await owner.end();
        return { kind: journal.kind, result: 'observer-footprint-restored', observerId: id, database, journalFile, exportedEvents: all.rows.length, eventExportSha256: journal.exports.at(-1).sha256, observerFootprintCatalogSha256: sha(JSON.stringify(journal.before)), observerFootprintRestored: true, catalogScope: clone(journal.catalogScope), observerSqlModifiesBusinessRows: false };
    }
    return { beginCase, drainCase, restore, journalFile, receipt: () => clone(journal) };
}

if (process.argv.includes('--check') && path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    const authority = auditAuthority(), id = 'a0000000-0000-4000-8000-000000000001', runId = 'a0000000-0000-4000-8000-000000000002';
    const sql = statements({ id, runId, names: namesFor(id), database: 'poms_r2k_rust', auditEvents: authority.events });
    assert.equal(sql.create.filter(value => value.startsWith('CREATE TRIGGER')).length, 7);
    assert(sql.create.every(value => !/CREATE OR REPLACE|CASCADE|FOR UPDATE|ALTER TABLE/i.test(value)));
    assert(sql.functionSql.includes('SECURITY DEFINER SET search_path=pg_catalog'));
    assert(sql.drop.every(value => !value.includes('CASCADE')));
    assert.throws(() => ident('bad;drop')); assert.throws(() => namesFor('../old'));
    const markerRelations = [{ nspname: SCHEMA, relname: 'marker', relkind: 'r', oid: '100', owner: OWNER }, { nspname: SCHEMA, relname: 'marker_pkey', relkind: 'i', oid: '101', owner: OWNER, index_of_oid: '100', index_of_schema: SCHEMA, index_of_table: 'marker', index_is_primary: true, index_is_unique: true, index_is_valid: true, index_is_ready: true, index_columns: ['database_name'], index_expressions: null, index_predicate: null, index_definition: 'CREATE UNIQUE INDEX marker_pkey ON r2k_control.marker USING btree (database_name)' }];
    assertInitialControlRelations(markerRelations);
    assert.throws(() => assertInitialControlRelations([...markerRelations, { nspname: SCHEMA, relname: 'unowned_index', relkind: 'i' }]));
    for (const changes of [{ index_of_oid: 'foreign' }, { relkind: 'r' }, { index_is_primary: false }, { index_columns: ['instance_id'] }]) assert.throws(() => assertInitialControlRelations([markerRelations[0], { ...markerRelations[1], ...changes }]));
    console.log(JSON.stringify({ execution: 'pure SQL-template/source checks only; no PG/DDL/client/private journal access', tables: TABLES.length, auditLiteralEvents: authority.events.length, statements: sql.create.length, functionSha256: sha(sql.functionSql), runtime: 'Pending Root actual rollback/savepoint/SDK calibration and restore' }));
}
