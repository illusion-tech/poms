import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { businessState, equal, fail, seedRoles, validateJournal, validateSnapshot, validateStepResult } from './system-lease-model.mjs';

const maximumBytes = 2 * 1024 * 1024;
function privateDirectory(path, create = false) {
    if (!existsSync(path) && create) mkdirSync(path, { mode: 0o700 });
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o077))) fail('system_lease_directory');
}
function readJson(path, limit = maximumBytes) {
    let stat;
    try { stat = lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit || (process.platform !== 'win32' && (stat.mode & 0o077))) fail('system_lease_file');
    try { return JSON.parse(readFileSync(path, 'utf8')); } catch { fail('system_lease_file'); }
}
function atomicWrite(path, value) {
    const bytes = Buffer.from(JSON.stringify(value) + '\n');
    if (bytes.length > maximumBytes) fail('system_lease_size');
    const temporary = path + '.' + randomUUID() + '.tmp';
    let fd;
    try {
        fd = openSync(temporary, 'wx', 0o600);
        writeFileSync(fd, bytes); fsyncSync(fd); closeSync(fd); fd = undefined;
        renameSync(temporary, path);
        if (process.platform !== 'win32') {
            const directoryFd = openSync(join(path, '..'), 'r');
            try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
        }
    } finally {
        if (fd !== undefined) closeSync(fd);
        if (existsSync(temporary)) unlinkSync(temporary);
    }
}
export function leaseStore(backend, privateRoot = '/r2b-private') {
    if (!['nest','rust'].includes(backend) || resolve(privateRoot) !== privateRoot) fail('system_lease_target');
    privateDirectory(privateRoot);
    const directory = join(privateRoot, 'system-leases');
    privateDirectory(directory, true);
    const pointer = join(directory, backend + '-active.json');
    function recordPath(leaseId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(leaseId)) fail('system_lease_journal');
        return join(directory, backend + '-' + leaseId + '.json');
    }
    function active() {
        const value = readJson(pointer, 256);
        if (!value) return undefined;
        if (Object.keys(value).sort().join(',') !== 'backend,formatVersion,leaseId' ||
            value.formatVersion !== 1 || value.backend !== backend) fail('system_lease_pointer');
        const record = readJson(recordPath(value.leaseId));
        if (!record) fail('system_lease_pointer');
        return validateJournal(record, backend);
    }
    function write(record) {
        validateJournal(record, backend);
        const path = recordPath(record.leaseId);
        const previous = readJson(path);
        if (previous) {
            validateJournal(previous, backend);
            for (const key of ['base','actorId','runId','leaseId','createdAt','deadlineAt','sourceHead']) {
                if (!equal(previous[key], record[key])) fail('system_lease_immutable_snapshot');
            }
            if (previous.state === 'restored' && !equal(previous, record)) fail('system_lease_restored_immutable');
        }
        atomicWrite(path, record);
    }
    function create(record) {
        const old = active();
        if (old && old.state !== 'restored') fail('system_lease_unrecovered');
        if (existsSync(recordPath(record.leaseId))) fail('system_lease_collision');
        write(record);
        atomicWrite(pointer, { formatVersion: 1, backend, leaseId: record.leaseId });
    }
    return { active, write, create, maximumBytes };
}

const roleIds = seedRoles.map((role) => role.id);
export async function initializeSession(client) {
    // Catalog deparsers qualify referenced relations according to search_path.
    // Use the same checked settings for app snapshots and owner restoration.
    await client.query("SET TIME ZONE 'Etc/GMT-8'");
    await client.query('SET search_path TO poms, public');
    const settings = await client.query("SELECT current_setting('TimeZone') AS timezone,current_setting('search_path') AS search_path");
    if (settings.rows.length !== 1 || settings.rows[0].timezone !== 'Etc/GMT-8' || settings.rows[0].search_path !== 'poms, public') fail('system_lease_session');
}
async function rows(client, sql, args = []) { return (await client.query(sql, args)).rows.map((row) => row.data); }
export async function capture(client) {
    const roles = await rows(client, 'select to_jsonb(r) as data from poms.role r where id=any($1::uuid[]) order by role_key', [roleIds]);
    const permissions = await rows(client, 'select to_jsonb(r) as data from poms.role_permission_assignment r where role_id=any($1::uuid[]) order by role_id,id', [roleIds]);
    const userRoles = await rows(client, 'select to_jsonb(r) as data from poms.user_role_assignment r where role_id=any($1::uuid[]) order by role_id,id', [roleIds]);
    const audits = await rows(client, "select to_jsonb(r) as data from poms.audit_log r where target_type='PlatformRole' and target_id=any($1::text[]) order by occurred_at,id", [roleIds]);
    const tables = ['role','role_permission_assignment','user_role_assignment'];
    const columns = await rows(client, "select jsonb_build_object('kind','column','table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) as data from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='poms' and c.relname=any($1::text[]) and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum", [tables]);
    const constraints = await rows(client, "select jsonb_build_object('kind','constraint','table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid,true)) as data from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and c.relname=any($1::text[]) order by c.relname,k.conname", [tables]);
    const indexes = await rows(client, "select jsonb_build_object('kind','index','table',tablename,'name',indexname,'definition',indexdef) as data from pg_indexes where schemaname='poms' and tablename=any($1::text[]) order by tablename,indexname", [tables]);
    const triggers = await rows(client, "select jsonb_build_object('kind','trigger','table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid,true),'function',pg_get_functiondef(t.tgfoid)) as data from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and c.relname=any($1::text[]) and not t.tgisinternal order by c.relname,t.tgname", [tables]);
    return validateSnapshot({ roles, permissions, userRoles, audits, catalog: [...columns,...constraints,...indexes,...triggers] });
}
export async function snapshot(client) {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
        const value = await capture(client);
        await client.query('COMMIT');
        return value;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => { /* Preserve the original snapshot failure; caller closes the connection. */ });
        throw error;
    }
}
export async function restoreLease(owner, store, journal, authority, { backendStopped = false } = {}) {
    let stage = 'begin';
    try {
        await owner.query('BEGIN');
        // Parent FOR UPDATE also excludes new FK references while exact rows
        // are checked and restored. No row lock spans product HTTP requests.
        stage = 'lock_roles';
        await owner.query('select id from poms.role where id=any($1::uuid[]) for update', [roleIds]);
        stage = 'lock_permissions';
        await owner.query('select id from poms.role_permission_assignment where role_id=any($1::uuid[]) for update', [roleIds]);
        stage = 'validate_snapshot';
        const current = await capture(owner);
        if (!equal(current.userRoles, journal.base.userRoles)) fail('system_lease_relationship_changed');
        if (!equal(current.catalog, journal.base.catalog)) fail('system_lease_catalog_changed');
        if (journal.state === 'restoring' && equal(businessState(current), businessState(journal.base)) && equal(current.audits, journal.authorized.audits)) {
            stage = 'commit_recovered';
            await owner.query('COMMIT');
            stage = 'journal_restored';
            journal.state = 'restored'; store.write(journal);
            return;
        }
        stage = 'validate_current';
        if (journal.pending) {
            const auditId = validateStepResult(journal, current, authority, { permitUnstarted: backendStopped });
            if (auditId) journal.completed.push({ step: journal.pending.step, auditId });
            journal.pending = null;
            journal.authorized = current;
        } else if (!equal(current, journal.authorized)) {
            fail();
        }
        // An intent preceding restore COMMIT distinguishes a completed restore
        // from a crash after COMMIT but before the final fsync receipt.
        stage = 'journal_restoring';
        journal.state = 'restoring'; store.write(journal);
        const originalIds = new Set(journal.base.permissions.map((row) => row.id));
        if (journal.base.permissions.some((row) => !current.permissions.some((now) => now.id === row.id))) fail();
        const additions = current.permissions.filter((row) => !originalIds.has(row.id)).map((row) => row.id);
        if (additions.length) {
            stage = 'delete_additions';
            const deleted = await owner.query('delete from poms.role_permission_assignment where id=any($1::uuid[]) and role_id=any($2::uuid[])', [additions,roleIds]);
            if (deleted.rowCount !== additions.length) fail();
        }
        stage = 'restore_roles';
        const roles = await owner.query(
            'update poms.role r set name=s.name,description=s.description,is_active=s.is_active,is_system_role=s.is_system_role,display_order=s.display_order,row_version=s.row_version,created_at=s.created_at,created_by=s.created_by,updated_at=s.updated_at,updated_by=s.updated_by from jsonb_populate_recordset(NULL::poms.role,$1::jsonb) s where r.id=s.id and r.role_key=s.role_key',
            [JSON.stringify(journal.base.roles)]
        );
        if (roles.rowCount !== 2) fail();
        stage = 'restore_permissions';
        const permissions = await owner.query(
            'update poms.role_permission_assignment r set role_id=s.role_id,permission_key=s.permission_key,status=s.status,assigned_at=s.assigned_at,assigned_by=s.assigned_by,revoked_at=s.revoked_at,revoked_by=s.revoked_by,change_reason=s.change_reason,created_at=s.created_at,created_by=s.created_by from jsonb_populate_recordset(NULL::poms.role_permission_assignment,$1::jsonb) s where r.id=s.id and r.role_id=s.role_id',
            [JSON.stringify(journal.base.permissions)]
        );
        if (permissions.rowCount !== journal.base.permissions.length) fail();
        stage = 'verify_restored';
        const restored = await capture(owner);
        if (!equal(businessState(restored), businessState(journal.base)) || !equal(restored.audits, journal.authorized.audits)) fail();
        stage = 'commit';
        await owner.query('COMMIT');
        stage = 'journal_restored';
        journal.state = 'restored'; store.write(journal);
    } catch (error) {
        await owner.query('ROLLBACK').catch(() => { /* Preserve the restore failure and its durable recovery journal. */ });
        if (error && typeof error === 'object') error.systemLeaseStage = stage;
        throw error;
    }
}
