// Root owns the transaction, identity/owner-marker guard, durable store and
// post-COMMIT state. This module never connects, starts a service or cleans a
// row by an actor/prefix predicate. JSONB snapshots stay PostgreSQL text.
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fail } from './fixture-guard.mjs';

const SOURCE = '7a343c543fe0031d7d6b42c1f7e18a7e861c72b7';
const MARKER = 'a3580e72-e812-47b3-b41f-5066343f5c37';
const SETTING = 'attachment.max-upload-size-mb';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const E = JSON.parse(readFileSync(new URL('./e-authority.json', import.meta.url), 'utf8'));
const F = JSON.parse(readFileSync(new URL('./f-authority.json', import.meta.url), 'utf8'));
const LEAF_TABLES = ['attachment', 'sales_follow_up_record', 'expense_record', 'lead'];
const EXTRA_TABLES = ['dictionary_item', ...LEAF_TABLES, 'business_number_sequence', 'audit_log', 'security_event'];
const SNAPSHOT_COLUMNS = ['key', 'value_type', 'value_json', 'row_version', 'created_at', 'updated_at', 'updated_by'];
const PARENTS = Object.freeze({ customerId: '11000000-0000-4000-8000-000000000001', customerNo: 'CUST-2026-000001', projectId: '20000000-0000-4000-8000-000000000001', projectNo: 'PRJ-2026-001' });
const quote = value => { if (!/^[a-z_][a-z0-9_]*$/.test(value)) fail('extension_catalog_identifier'); return '"' + value + '"'; };
const identity = request => ({ requestId: 'r2ef:' + request.runId, userAgent: 'poms-r2ef-fixture/' + request.runId });
const parse = snapshot => { try { return JSON.parse(snapshot); } catch { fail('extension_invalid_snapshot'); } };
const unique = values => [...new Set(values)];
const actorIds = j => j.actors.map(row => row.userId);
const createdIntents = j => [j.createdDictionary, j.eCreatedDictionary];
const allDictionaryPlans = j => [...j.dictionaries, ...createdIntents(j)];
const allAuditPlans = j => [...j.auditSeeds, ...j.adoptedAudits];
const allSecurityPlans = j => [...j.securitySeeds, ...j.adoptedSecurity];
const planIds = j => [...j.dictionaries, ...j.usageLeaves, ...j.numbers, ...j.auditSeeds, ...j.securitySeeds].filter(row => row.id !== null).map(row => row.id);

export function plannedExtension(request, baseJournal) {
    if (!UUID.test(request.runId) || !['nest', 'rust'].includes(request.backend) || baseJournal.runId !== request.runId || baseJournal.backend !== request.backend) fail('extension_identity');
    const actors = baseJournal.accounts.map(({ account, userId, username }) => ({ account, userId, username }));
    if (actors.length !== 2 || actors.some(row => !UUID.test(row.userId))) fail('extension_actors');
    const admin = actors.find(row => row.account === 'admin'); if (!admin) fail('extension_admin');
    const compact = request.runId.replaceAll('-', '').slice(0, 24);
    const code = suffix => 'e' + compact + suffix;
    const dictionaries = E.dictionaryDomains.map((domain, index) => ({ slot: 'usage-' + index, id: randomUUID(), domain, code: code(String(index)), name: 'E Usage ' + index, description: index === 0 ? null : 'E keyword description ' + index, status: 'active', sortOrder: 10 + index, isSystem: false, actorId: admin.userId, snapshot: null, observed: null }));
    for (const [slot, name, status, isSystem, suffix] of [['update', 'E Original', 'active', true, 'u'], ['noop', 'E Noop', 'active', false, 'n'], ['inactive', 'E Inactive', 'inactive', false, 'i']]) dictionaries.push({ slot, id: randomUUID(), domain: 'lead-source', code: code(suffix), name, description: slot === 'update' ? 'old' : null, status, sortOrder: 100, isSystem, actorId: admin.userId, snapshot: null, observed: null });
    const usageLeaves = dictionaries.slice(0, 4).flatMap((dictionary, index) => [0, 1].map(ordinal => ({ table: LEAF_TABLES[index], id: randomUUID(), domain: dictionary.domain, code: dictionary.code, ordinal, snapshot: null })));
    const year = 8000 + createHash('sha256').update(request.backend + ':' + request.runId).digest().readUInt16BE(0) % 1400;
    const numbers = [];
    const numberCases = Object.keys(E.businessNumbers).map((scope, index) => {
        const utcYear = year + index * 2;
        const initialNextValue = index === 0 ? null : index === 1 ? 1234567 : 401;
        const rowVersion = initialNextValue === null ? null : 7;
        numbers.push({ scope, period: String(utcYear), id: initialNextValue === null ? null : randomUUID(), seed: initialNextValue !== null, initialNextValue, rowVersion, baselineAbsent: null, snapshot: null, observed: null });
        numbers.push({ scope, period: String(utcYear + 1), id: null, seed: false, initialNextValue: null, rowVersion: null, baselineAbsent: null, snapshot: null, observed: null });
        return { scope, utcYear, initialNextValue, rowVersion };
    });
    const numberConcurrency = { scope: 'lead', utcYear: year + 20, initialNextValue: 1, rowVersion: 3, count: 12 };
    const numberStandalone = { scope: 'project', utcYear: year + 22, initialNextValue: 19, rowVersion: 5 };
    for (const row of [numberConcurrency, numberStandalone]) numbers.push({ scope: row.scope, period: String(row.utcYear), id: randomUUID(), seed: true, initialNextValue: row.initialNextValue, rowVersion: row.rowVersion, baselineAbsent: null, snapshot: null, observed: null });
    const targetId = 'r2ef-target-' + request.runId;
    const auditEventType = 'r2ef.audit.' + request.runId;
    const securityEventType = 'r2ef.security.' + request.runId;
    const createdDictionary = { domain: 'attachment-category', code: code('ui'), actorId: admin.userId, id: null, snapshot: null, observed: null };
    const eCreatedDictionary = { domain: 'lead-source', code: code('api'), actorId: admin.userId, id: null, snapshot: null, observed: null };
    const j = {
        formatVersion: 1, sourceHead: SOURCE, marker: MARKER, runId: request.runId, backend: request.backend, state: 'planned', actors,
        dictionaries, usageLeaves, numbers, missingId: randomUUID(),
        dictionaryUpdateId: dictionaries.find(row => row.slot === 'update').id,
        dictionaryNoopId: dictionaries.find(row => row.slot === 'noop').id,
        dictionaryInactiveId: dictionaries.find(row => row.slot === 'inactive').id,
        createdDictionary, eCreatedDictionary, createdCode: createdDictionary.code, eCreatedCode: eCreatedDictionary.code,
        usageCases: dictionaries.slice(0, 4).map(({ id, domain, code }) => ({ id, domain, code, usageCount: 2 })),
        setting: { key: SETTING, originalCaptured: false, original: null, observed: null, restored: false },
        parentSnapshots: null,
        auditSeeds: Array.from({ length: 110 }, (_, index) => ({ id: randomUUID(), index, snapshot: null })),
        securitySeeds: Array.from({ length: 110 }, (_, index) => ({ id: randomUUID(), index, snapshot: null })),
        adoptedAudits: [], adoptedSecurity: [], cleanupIntent: false,
        auditEventType, securityEventType, targetIds: Object.fromEntries(F.entityTargetTypes.map(type => [type, targetId])),
        ePgFixture: { formatVersion: 1, sourceHead: SOURCE, database: 'poms_r2ef_' + request.backend, marker: MARKER, actorId: admin.userId,
            dictionaryUpdateId: dictionaries.find(row => row.slot === 'update').id, dictionaryNoopId: dictionaries.find(row => row.slot === 'noop').id, dictionaryInactiveId: dictionaries.find(row => row.slot === 'inactive').id,
            usageCases: dictionaries.slice(0, 4).map(({ id, domain, code }) => ({ id, domain, code, usageCount: 2 })),
            setting: { key: SETTING, requestId: 'r2ef:' + request.runId + ':epg', snapshotId: request.backend + ':' + request.runId + ':setting' }, numberCases, numberConcurrency, numberStandalone },
        fFixture: { targetId, auditEventType, securityEventType, operatorId: admin.userId, actorId: admin.userId, inclusiveAt: '2026-01-01T00:00:00.000Z', routePath: '/r2ef/' + request.runId + '/protected' }
    };
    validate(j, request, baseJournal); return j;
}

function validate(j, request, base) {
    if (j.formatVersion !== 1 || j.sourceHead !== SOURCE || j.marker !== MARKER || j.runId !== request.runId || j.backend !== request.backend || !['planned', 'prepared', 'cleaned'].includes(j.state)) fail('extension_journal');
    if (JSON.stringify(j.actors) !== JSON.stringify(base.accounts.map(({ account, userId, username }) => ({ account, userId, username })))) fail('extension_actor_ownership');
    if (j.dictionaries.length !== 7 || j.usageLeaves.length !== 8 || j.auditSeeds.length !== 110 || j.securitySeeds.length !== 110 || j.numbers.length !== 20) fail('extension_plan_count');
    const ids = [...planIds(j), j.missingId]; if (ids.some(id => !UUID.test(id)) || new Set(ids).size !== ids.length || ids.some(id => actorIds(j).includes(id))) fail('extension_uuid_plan');
    for (const row of allDictionaryPlans(j)) if (!E.dictionaryDomains.includes(row.domain) || !/^[a-z][a-z0-9-]{0,31}$/.test(row.code) || !actorIds(j).includes(row.actorId) || (row.id !== null && !UUID.test(row.id))) fail('extension_dictionary_plan');
    for (const row of j.numbers) if (!Object.hasOwn(E.businessNumbers, row.scope) || !/^\d{4}$/.test(row.period) || row.period === '2026') fail('extension_number_plan');
    if (new Set(j.numbers.map(row => row.scope + ':' + row.period)).size !== j.numbers.length || j.setting.key !== SETTING) fail('extension_logical_plan');
}
async function persist(store, j) { await store.write(j); }
async function utc(client) { await client.query("set local time zone 'UTC'"); }
async function rowsByIds(client, table, ids, lock = false) {
    if (!ids.length) return [];
    return (await client.query(`select t.id::text as id,to_jsonb(t)::text as snapshot from poms.${quote(table)} t where id=any($1::uuid[]) order by id${lock ? ' for update' : ''}`, [ids])).rows;
}
async function oneSetting(client, lock = false) { const rows = (await client.query(`select to_jsonb(t)::text as snapshot from poms.system_setting t where key=$1${lock ? ' for update' : ''}`, [SETTING])).rows; if (rows.length > 1) fail('extension_setting_cardinality'); return rows[0]?.snapshot ?? null; }
async function parentRows(client) {
    const customer = (await client.query('select to_jsonb(t)::text as snapshot from poms.customer t where id=$1 for share', [PARENTS.customerId])).rows;
    const project = (await client.query('select to_jsonb(t)::text as snapshot from poms.project t where id=$1 for share', [PARENTS.projectId])).rows;
    if (customer.length !== 1 || project.length !== 1) fail('extension_seed_parent_missing');
    const c = parse(customer[0].snapshot), p = parse(project[0].snapshot);
    if (c.customer_no !== PARENTS.customerNo || p.project_no !== PARENTS.projectNo || p.customer_id !== PARENTS.customerId) fail('extension_seed_parent_identity');
    return { customer: customer[0].snapshot, project: project[0].snapshot };
}
async function assertParents(client, j, capture = false) { const rows = await parentRows(client); if (j.parentSnapshots === null && capture) j.parentSnapshots = rows; else if (JSON.stringify(j.parentSnapshots) !== JSON.stringify(rows)) fail('extension_seed_parent_changed'); return rows; }
async function numberRow(client, plan, lock = false) { const rows = (await client.query(`select id::text,to_jsonb(t)::text as snapshot from poms.business_number_sequence t where scope=$1 and period=$2${lock ? ' for update' : ''}`, [plan.scope, plan.period])).rows; if (rows.length > 1) fail('extension_number_cardinality'); return rows[0] ?? null; }

function dictionaryOwned(row, plan, j) {
    if (row.id !== plan.id || row.domain !== plan.domain || row.code !== plan.code || row.created_by !== plan.actorId || !actorIds(j).includes(row.updated_by)) return false;
    if (plan.snapshot) { const original = parse(plan.snapshot); for (const key of ['id', 'domain', 'code', 'created_by', 'created_at', 'is_system']) if (row[key] !== original[key]) return false; if (!Number.isInteger(row.row_version) || row.row_version < original.row_version) return false; }
    return true;
}
function settingDecision(original, current, j) {
    if (original === current) return 'unchanged';
    if (current === null) { if(j.setting.absenceIntent?.kind==='exact-snapshot-absence-and-recreate-test')return 'restore-missing';fail('extension_setting_disappeared'); }
    const row = parse(current); if (row.key !== SETTING || !actorIds(j).includes(row.updated_by)) fail('extension_setting_foreign_change');
    if (original !== null && j.setting.absenceIntent?.kind!=='exact-snapshot-absence-and-recreate-test') { const prior = parse(original); if (row.created_at !== prior.created_at || row.row_version < prior.row_version) fail('extension_setting_identity_changed'); }
    return original === null ? 'delete-owned' : 'restore-owned';
}
function auditOwned(row, j) { return actorIds(j).includes(row.operator_id) && row.target_type === 'SystemSetting' && row.target_id === SETTING && row.event_type === 'platform.system_setting.updated' && row.result === 'success'; }
function securityOwned(row, j) {
    if (actorIds(j).includes(row.actor_id)) return true;
    const value = identity(j); return row.actor_id === null && (row.request_id === value.requestId || row.user_agent === value.userAgent);
}

export async function prepareExtension(client, request, base, j, store) {
    validate(j, request, base); await utc(client);
    const columns = (await client.query("select column_name from information_schema.columns where table_schema='poms' and table_name='system_setting' order by ordinal_position")).rows.map(row => row.column_name);
    if (columns.toSorted().join(',') !== SNAPSHOT_COLUMNS.toSorted().join(',')) fail('extension_setting_columns_changed');
    await assertParents(client, j, true);
    if (!j.setting.originalCaptured) { j.setting.original = await oneSetting(client, true); j.setting.originalCaptured = true; j.setting.observed = j.setting.original; }
    for (const plan of j.numbers) {
        const found = await numberRow(client, plan, true);
        if (plan.baselineAbsent === null) { if (found !== null) fail('extension_number_period_collision'); plan.baselineAbsent = true; }
    }
    await persist(store, j); // Full intent + exact global-row/parent snapshots precede DML.
    const groups = [['dictionary_item', j.dictionaries], ...LEAF_TABLES.map(table => [table, j.usageLeaves.filter(row => row.table === table)]), ['audit_log', j.auditSeeds], ['security_event', j.securitySeeds], ['business_number_sequence', j.numbers.filter(row => row.seed)]];
    let existing = 0, expected = 0; for (const [table, plans] of groups) { existing += (await rowsByIds(client, table, plans.map(row => row.id), true)).length; expected += plans.length; }
    if (existing !== 0 && existing !== expected) fail('extension_partial_fixture');
    if (existing === expected) { await observe(client, request, base, j, store); return { matched: existing, changed: 0, state: 'prepared' }; }
    if ((await rowsByIds(client, 'dictionary_item', [j.missingId], true)).length) fail('extension_missing_id_collision');
    for (const row of allDictionaryPlans(j)) { const found = (await client.query('select id::text from poms.dictionary_item where domain=$1 and code=$2 for update', [row.domain, row.code])).rows; if (found.length) fail('extension_dictionary_code_collision'); }
    for (const row of j.dictionaries) await client.query("insert into poms.dictionary_item(id,domain,code,name,description,status,sort_order,is_system,row_version,created_by,updated_by,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$9,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')", [row.id, row.domain, row.code, row.name, row.description, row.status, row.sortOrder, row.isSystem, row.actorId]);
    const customerName = parse(j.parentSnapshots.customer).display_name;
    for (const row of j.usageLeaves) {
        if (row.table === 'attachment') await client.query("insert into poms.attachment(id,original_name,display_name,extension,mime_type,size_bytes,checksum_sha256,category,security_level,storage_provider,storage_key,version_group_id,status,is_latest,deleted_at) values($1,'r2ef-usage.txt','R2EF usage witness','txt','text/plain',1,$2,$3,'normal','local',$4,$1,$5,$6,$7::timestamptz)", [row.id, 'a'.repeat(64), row.code, 'r2ef/' + j.runId + '/' + row.id, row.ordinal ? 'deleted' : 'active', row.ordinal === 0, row.ordinal ? '2026-01-01T00:00:00Z' : null]);
        else if (row.table === 'sales_follow_up_record') await client.query("insert into poms.sales_follow_up_record(id,customer_id,follow_up_type,occurred_at,summary,outcome,status,voided_at,void_reason,created_by,updated_by) values($1,$2,$3,'2026-01-01T00:00:00Z',$4,'other',$5,$6::timestamptz,$7,$8,$8)", [row.id, PARENTS.customerId, row.code, 'R2EF ' + j.runId + ' usage', row.ordinal ? 'voided' : 'active', row.ordinal ? '2026-01-01T00:00:00Z' : null, row.ordinal ? 'R2EF owned historical witness' : null, j.actors[0].userId]);
        else if (row.table === 'expense_record') await client.query("insert into poms.expense_record(id,project_id,expense_category,expense_description,expense_date,amount_including_tax,status,voided_at,void_reason) values($1,$2,$3,$4,'2026-01-01',1.0000,$5,$6::timestamptz,$7)", [row.id, PARENTS.projectId, row.code, 'R2EF ' + j.runId + ' usage', row.ordinal ? 'voided' : 'draft', row.ordinal ? '2026-01-01T00:00:00Z' : null, row.ordinal ? 'R2EF owned historical witness' : null]);
        else await client.query("insert into poms.lead(id,lead_no,lead_name,customer_id,customer_name,source_code,status,closed_reason,closed_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10,$10)", [row.id, 'R2EF-' + j.runId.replaceAll('-', '').slice(0, 24) + '-' + row.ordinal, 'R2EF ' + j.runId + ' usage', PARENTS.customerId, customerName, row.code, row.ordinal ? 'closed' : 'registered', row.ordinal ? 'R2EF owned historical witness' : null, row.ordinal ? '2026-01-01T00:00:00Z' : null, j.actors[0].userId]);
    }
    for (const row of j.numbers.filter(row => row.seed)) { const spec = E.businessNumbers[row.scope]; await client.query('insert into poms.business_number_sequence(id,scope,period,next_value,prefix,padding,description,row_version) values($1,$2,$3,$4,$5,$6,$7,$8)', [row.id, row.scope, row.period, row.initialNextValue, spec.prefix, spec.padding, spec.description, row.rowVersion]); }
    const sentinel = '{"source":"r2ef-synthetic","nested":["sentinel",{"safe":"visible"}],"rounded":9007199254740993,"overflow":1e999}';
    const time = index => new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString().replace('.000Z', index === 109 ? '.000123Z' : '.000Z');
    for (const row of j.auditSeeds) { const target = row.index < 102 ? 'lead' : F.entityTargetTypes.filter(value => value !== 'lead')[row.index - 102]; await client.query("insert into poms.audit_log(id,event_type,target_type,target_id,operator_id,request_id,result,after_snapshot,metadata,occurred_at) values($1,$2,$3,$4,$5,$6,'success',$7::text::jsonb,$8::text::jsonb,$9::timestamptz)", [row.id, j.fFixture.auditEventType, target, j.fFixture.targetId, j.fFixture.operatorId, identity(j).requestId, row.index === 0 ? sentinel : '{"source":"r2ef-synthetic","index":' + row.index + '}', '{"fixture":"r2ef"}', time(row.index)]); }
    for (const row of j.securitySeeds) await client.query("insert into poms.security_event(id,event_type,severity,actor_id,principal,request_id,path,method,permission_key,result,details,occurred_at) values($1,$2,'warning',$3,$4,$5,$6,'GET',$7,'blocked',$8::text::jsonb,$9::timestamptz)", [row.id, j.fFixture.securityEventType, j.fFixture.actorId, j.actors[0].username, identity(j).requestId, j.fFixture.routePath, row.index === 0 ? 'not-an-enum-filter' : 'lead:read', row.index === 0 ? sentinel : '{"source":"r2ef-synthetic","index":' + row.index + '}', time(row.index)]);
    for (const [table, plans] of groups) { const rows = await rowsByIds(client, table, plans.map(row => row.id)); if (rows.length !== plans.length) fail('extension_prepare_missing'); for (const row of rows) { const plan = plans.find(plan => plan.id === row.id); plan.snapshot = row.snapshot; if (table === 'dictionary_item' || table === 'business_number_sequence') plan.observed = row.snapshot; } }
    await persist(store, j); return { matched: expected, changed: expected, state: 'prepared' };
}

async function observe(client, request, base, j, store) {
    validate(j, request, base); if (!j.setting.originalCaptured) fail('extension_setting_not_snapshotted');
    const dictionaryRows = [];
    for (const plan of allDictionaryPlans(j)) {
        const rows = (await client.query('select id::text,to_jsonb(t)::text as snapshot from poms.dictionary_item t where (domain=$1 and code=$2) or id=$3::uuid for update', [plan.domain, plan.code, plan.id])).rows;
        if (rows.length > 1) fail('extension_dictionary_collision');
        if (!rows.length) { if (j.dictionaries.includes(plan) && j.state === 'prepared' && !j.cleanupIntent) fail('extension_owned_dictionary_missing'); continue; }
        const row = parse(rows[0].snapshot);
        if (plan.id === null) { if (row.domain !== plan.domain || row.code !== plan.code || row.created_by !== plan.actorId || !actorIds(j).includes(row.updated_by) || row.is_system !== false) fail('extension_created_dictionary_foreign'); plan.id = row.id; plan.snapshot = rows[0].snapshot; await persist(store, j); }
        if (!dictionaryOwned(row, plan, j)) fail('extension_dictionary_ownership'); plan.observed = rows[0].snapshot; dictionaryRows.push(row);
    }
    for (const table of LEAF_TABLES) { const plans = j.usageLeaves.filter(row => row.table === table); const rows = await rowsByIds(client, table, plans.map(row => row.id), true); for (const row of rows) { const plan = plans.find(plan => plan.id === row.id); if (plan.snapshot === null || row.snapshot !== plan.snapshot) fail('extension_usage_leaf_changed'); } if (j.state === 'prepared' && !j.cleanupIntent && rows.length !== plans.length) fail('extension_usage_leaf_missing'); }
    for (const plan of j.numbers) {
        const found = await numberRow(client, plan, true); if (!found) { if (plan.seed && j.state === 'prepared' && !j.cleanupIntent) fail('extension_number_missing'); continue; }
        const row = parse(found.snapshot), spec = E.businessNumbers[plan.scope];
        if (plan.id === null) { if (!plan.baselineAbsent || row.scope !== plan.scope || row.period !== plan.period || row.prefix !== spec.prefix || row.padding !== spec.padding || row.description !== spec.description) fail('extension_number_adoption'); plan.id = row.id; plan.snapshot = found.snapshot; await persist(store, j); }
        if (row.id !== plan.id || row.scope !== plan.scope || row.period !== plan.period) fail('extension_number_identity');
        if (plan.snapshot && row.created_at !== parse(plan.snapshot).created_at) fail('extension_number_created_at_changed'); plan.observed = found.snapshot;
    }
    const audits = (await client.query('select id::text,to_jsonb(t)::text as snapshot from poms.audit_log t where operator_id=any($1::uuid[]) order by id for update', [actorIds(j)])).rows;
    if (j.state === 'prepared' && !j.cleanupIntent && j.auditSeeds.some(plan => !audits.some(row => row.id === plan.id))) fail('extension_audit_seed_missing');
    for (const row of audits) {
        const seed = j.auditSeeds.find(plan => plan.id === row.id); if (seed) { if (seed.snapshot !== row.snapshot) fail('extension_audit_seed_changed'); continue; }
        const value = parse(row.snapshot); if (!auditOwned(value, j)) continue; // Original PlatformUser audit remains owned by base cleanup.
        const found = j.adoptedAudits.find(plan => plan.id === row.id); if (found && found.snapshot !== row.snapshot) fail('extension_audit_adopted_changed'); if (!found) { j.adoptedAudits.push({ id: row.id, snapshot: row.snapshot }); await persist(store, j); }
    }
    const who = identity(j);
    const events = (await client.query('select id::text,to_jsonb(t)::text as snapshot from poms.security_event t where actor_id=any($1::uuid[]) or request_id=$2 or user_agent=$3 order by id for update', [actorIds(j), who.requestId, who.userAgent])).rows;
    if (j.state === 'prepared' && !j.cleanupIntent && j.securitySeeds.some(plan => !events.some(row => row.id === plan.id))) fail('extension_security_seed_missing');
    for (const row of events) {
        const seed = j.securitySeeds.find(plan => plan.id === row.id); if (seed) { if (seed.snapshot !== row.snapshot) fail('extension_security_seed_changed'); continue; }
        if (!securityOwned(parse(row.snapshot), j)) fail('extension_security_foreign_actor');
        const found = j.adoptedSecurity.find(plan => plan.id === row.id); if (found && found.snapshot !== row.snapshot) fail('extension_security_adopted_changed'); if (!found) { j.adoptedSecurity.push({ id: row.id, snapshot: row.snapshot }); await persist(store, j); }
    }
    const setting = await oneSetting(client, true); settingDecision(j.setting.original, setting, j); j.setting.observed = setting;
    await persist(store, j);
    return { dictionaries: dictionaryRows, settings: setting === null ? null : parse(setting), audits: audits.filter(row => allAuditPlans(j).some(plan => plan.id === row.id)).map(row => parse(row.snapshot)), securityEvents: events.filter(row => allSecurityPlans(j).some(plan => plan.id === row.id)).map(row => parse(row.snapshot)) };
}

export async function factsExtension(client, request, base, j, store) {
    await utc(client); const facts = await observe(client, request, base, j, store); await assertParents(client, j);
    return { ...facts, dictionaryUpdateId: j.dictionaryUpdateId, dictionaryNoopId: j.dictionaryNoopId, dictionaryInactiveId: j.dictionaryInactiveId, missingId: j.missingId, createdCode: j.createdCode, eCreatedCode: j.eCreatedCode, createdDictionary: j.createdDictionary, eCreatedDictionary: j.eCreatedDictionary, usageCases: j.usageCases, ePgFixture: j.ePgFixture, fFixture: j.fFixture, auditEventType: j.auditEventType ?? j.fFixture.auditEventType, securityEventType: j.securityEventType ?? j.fFixture.securityEventType, targetIds: j.targetIds ?? Object.fromEntries(F.entityTargetTypes.map(type => [type, j.fFixture.targetId])) };
}

const KNOWN_EDGES = new Set([
    'attachment_link.attachment_id>attachment', 'project_handover_attachment_selection.attachment_id>attachment', 'attachment_download_package_item.attachment_id>attachment',
    'attachment_upload_session.base_attachment_id>attachment', 'attachment_upload_session.completed_attachment_id>attachment',
    'sales_follow_up_record.supersedes_record_id>sales_follow_up_record', 'sales_follow_up_record.replaced_by_record_id>sales_follow_up_record', 'business_discussion_comment.related_follow_up_record_id>sales_follow_up_record',
    'project.source_lead_id>lead', 'sales_follow_up_record.lead_id>lead', 'lead_owner_assignment_record.lead_id>lead', 'opportunity_stakeholder.lead_id>lead', 'competitor_intelligence_record.lead_id>lead', 'sales_discovery_record.lead_id>lead', 'business_discussion_thread.lead_id>lead', 'lead_score_snapshot.lead_id>lead', 'lead_score_override.lead_id>lead'
]);
function rowOwnedByExactSnapshot(table, snapshot, j) {
    const row = parse(snapshot);
    const plans = table === 'dictionary_item' ? allDictionaryPlans(j) : table === 'business_number_sequence' ? j.numbers : table === 'audit_log' ? allAuditPlans(j) : table === 'security_event' ? allSecurityPlans(j) : j.usageLeaves.filter(plan => plan.table === table);
    const plan = plans.find(plan => plan.id === row.id); return Boolean(plan && snapshot === (plan.observed ?? plan.snapshot));
}
async function lockAndScan(client, j) {
    const tables = (await client.query("select table_name from information_schema.tables where table_schema='poms' and table_type='BASE TABLE' order by table_name")).rows.map(row => row.table_name);
    if (tables.length !== 107 || new Set(tables).size !== 107) fail('extension_table_catalog');
    await client.query('lock table ' + tables.map(table => 'poms.' + quote(table)).join(',') + ' in share row exclusive mode');
    const edges = (await client.query("select sn.nspname as source_schema,st.relname as source_table,tn.nspname as target_schema,tt.relname as target_table,array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,position) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.position) as columns,array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum,position) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum order by k.position) as target_columns from pg_constraint c join pg_class st on st.oid=c.conrelid join pg_namespace sn on sn.oid=st.relnamespace join pg_class tt on tt.oid=c.confrelid join pg_namespace tn on tn.oid=tt.relnamespace where c.contype='f' and tn.nspname='poms' and tt.relname=any($1::text[])", [[...EXTRA_TABLES, 'system_setting']])).rows;
    for (const edge of edges) if (edge.source_schema !== 'poms' || edge.target_schema !== 'poms' || edge.columns.length !== 1 || edge.target_columns.join(',') !== 'id' || !KNOWN_EDGES.has(edge.source_table + '.' + edge.columns[0] + '>' + edge.target_table)) fail('extension_unknown_incoming_fk');
    // Prefixes below are detection needles only. Deletion always uses exact
    // pre-journalled PKs and canonical row equality, never these predicates.
    const ids = unique([...allDictionaryPlans(j), ...j.usageLeaves, ...j.numbers, ...allAuditPlans(j), ...allSecurityPlans(j)].filter(row => row.id !== null).map(row => row.id));
    const needles = [...ids.map(id => '%' + id + '%'), ...allDictionaryPlans(j).map(row => '%' + row.code + '%'), ...j.numbers.map(row => '%' + E.businessNumbers[row.scope].prefix.toLowerCase() + '-' + row.period + '-%')];
    let admitted = 0;
    for (const table of tables) {
        const rows = (await client.query(`select to_jsonb(t)::text as snapshot from poms.${quote(table)} t where lower(to_jsonb(t)::text) like any($1::text[]) for update`, [needles])).rows;
        for (const row of rows) { if (!EXTRA_TABLES.includes(table) || !rowOwnedByExactSnapshot(table, row.snapshot, j)) fail('extension_foreign_reference'); admitted++; }
    }
    return { tablesScanned: tables.length, rowsAdmitted: admitted, foreignRows: 0, unknownForeignKeys: 0 };
}
async function deleteExact(client, table, plan, store, j) {
    if (plan.id === null) return 0;
    const snapshot = plan.observed ?? plan.snapshot;
    const rows = await rowsByIds(client, table, [plan.id], true); if (!rows.length) return 0;
    if (!snapshot || rows.length !== 1 || rows[0].snapshot !== snapshot) fail('extension_delete_ownership');
    await persist(store, j); const result = await client.query(`delete from poms.${quote(table)} t where id=$1 and to_jsonb(t)=$2::jsonb`, [plan.id, snapshot]); if (result.rowCount !== 1) fail('extension_delete_changed'); return 1;
}
async function zeroCheck(client, j) {
    let remaining = 0;
    for (const [table, plans] of [['dictionary_item', allDictionaryPlans(j)], ...LEAF_TABLES.map(table => [table, j.usageLeaves.filter(row => row.table === table)]), ['audit_log', allAuditPlans(j)], ['security_event', allSecurityPlans(j)]]) remaining += (await rowsByIds(client, table, plans.filter(row => row.id !== null).map(row => row.id))).length;
    for (const plan of j.numbers) if (await numberRow(client, plan)) remaining++;
    for (const plan of allDictionaryPlans(j)) remaining += (await client.query('select id::text from poms.dictionary_item where domain=$1 and code=$2', [plan.domain, plan.code])).rows.length;
    if (await oneSetting(client) !== j.setting.original) fail('extension_setting_restore_mismatch');
    await assertParents(client, j); if (remaining !== 0) fail('extension_cleanup_residual'); return { remaining: 0, zero: true };
}
export async function cleanupExtension(client, request, base, j, store) {
    validate(j, request, base); await utc(client);
    if (j.state === 'cleaned') return { changed: 0, ...(await zeroCheck(client, j)) };
    // Lock every source table before adopting dynamic HTTP rows, closing FK,
    // JSON/logical-reference and facts-to-delete races for the entire cleanup.
    const tables = (await client.query("select table_name from information_schema.tables where table_schema='poms' and table_type='BASE TABLE' order by table_name")).rows.map(row => row.table_name);
    if (tables.length !== 107) fail('extension_table_catalog'); await client.query('lock table ' + tables.map(table => 'poms.' + quote(table)).join(',') + ' in share row exclusive mode');
    if (!j.setting.originalCaptured) { // A prepare failure before any extension
        // snapshot/DML leaves no authority to touch the shared setting.
        for (const [table, plans] of [['dictionary_item', j.dictionaries], ...LEAF_TABLES.map(table => [table, j.usageLeaves.filter(row => row.table === table)]), ['audit_log', j.auditSeeds], ['security_event', j.securitySeeds], ['business_number_sequence', j.numbers.filter(row => row.id !== null)]]) if ((await rowsByIds(client, table, plans.map(row => row.id))).length) fail('extension_uncaptured_prepare');
        for (const plan of allDictionaryPlans(j)) if ((await client.query('select id::text from poms.dictionary_item where domain=$1 and code=$2', [plan.domain, plan.code])).rows.length) fail('extension_uncaptured_logical_collision');
        for (const plan of j.numbers) if (await numberRow(client, plan)) fail('extension_uncaptured_logical_collision');
        return { changed: 0, zero: true, remaining: 0, neverPrepared: true };
    }
    await observe(client, request, base, j, store); await assertParents(client, j); const guard = await lockAndScan(client, j);
    j.cleanupIntent = true; await persist(store, j);
    let changed = 0;
    for (const plan of allAuditPlans(j)) changed += await deleteExact(client, 'audit_log', plan, store, j);
    for (const plan of allSecurityPlans(j)) changed += await deleteExact(client, 'security_event', plan, store, j);
    for (const table of LEAF_TABLES) for (const plan of j.usageLeaves.filter(row => row.table === table)) changed += await deleteExact(client, table, plan, store, j);
    for (const plan of allDictionaryPlans(j)) changed += await deleteExact(client, 'dictionary_item', plan, store, j);
    for (const plan of j.numbers) changed += await deleteExact(client, 'business_number_sequence', plan, store, j);
    const current = await oneSetting(client, true), decision = settingDecision(j.setting.original, current, j);
    if (current !== j.setting.observed) fail('extension_setting_changed_after_adoption');
    if (decision !== 'unchanged') {
        await persist(store, j);
        if (decision === 'delete-owned') { const result = await client.query('delete from poms.system_setting t where key=$1 and to_jsonb(t)=$2::jsonb', [SETTING, current]); if (result.rowCount !== 1) fail('extension_setting_delete_changed'); }
        else if(decision==='restore-missing'){const result=await client.query("insert into poms.system_setting(key,value_type,value_json,row_version,created_at,updated_at,updated_by) select r.key,r.value_type,$1::jsonb->'value_json',r.row_version,r.created_at,r.updated_at,r.updated_by from jsonb_populate_record(null::poms.system_setting,$1::jsonb) r",[j.setting.original]);if(result.rowCount!==1)fail('extension_setting_restore_missing');}
        // jsonb_populate_record maps a JSON null to SQL NULL. value_json itself
        // must instead retain JSONB null (the physical column is NOT NULL).
        else { const result = await client.query("update poms.system_setting t set (key,value_type,value_json,row_version,created_at,updated_at,updated_by)=(select r.key,r.value_type,$1::jsonb->'value_json',r.row_version,r.created_at,r.updated_at,r.updated_by from jsonb_populate_record(null::poms.system_setting,$1::jsonb) r) where t.key=$2 and to_jsonb(t)=$3::jsonb", [j.setting.original, SETTING, current]); if (result.rowCount !== 1) fail('extension_setting_restore_changed'); }
        changed++;
    }
    j.setting.restored = true; await persist(store, j); const zero = await zeroCheck(client, j); return { changed, ...zero, guard };
}

export const extensionTestHelpers = Object.freeze({ validate, dictionaryOwned, settingDecision, auditOwned, securityOwned, rowOwnedByExactSnapshot });
