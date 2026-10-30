// SOURCE-only until C's first-DDL review and Root's explicit execution.
// Reference: old K observer SOURCE, not its namespace, private state or evidence.
// The AFTER INSERT function never changes NEW or a product table. It certifies
// only a case's pre-existing, unambiguous immutable intent and bounded subjects.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const SOURCE = 'tools/rust-r2l/l-pg-create-observer.mjs';
const MARKER = '04aadee8-4ec6-4a3b-9d27-ee8d51721029';
const APP = 'poms_r2l_app', OWNER = 'poms_r0e_owner', SCHEMA = 'r2l_control';
const PRIVATE_ROOTS = ['/home/wangzishi/.local/share/poms-r2l/private', '/r2l-private'];
// Explicit generated scope: the original five and L's two snapshot writers.
// The fixture's other supported tables are not an observer allowlist.
const SNAPSHOTS = Object.freeze(['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot']);
export const observedTables = Object.freeze(['auth_session', 'audit_log', 'security_event', 'approval_record', 'todo_item', ...SNAPSHOTS]);
const FIELDS = Object.freeze({
  auth_session: ['user_id', 'token_hash'],
  audit_log: ['event_type', 'target_type', 'target_id', 'operator_id', 'request_id'],
  security_event: ['event_type', 'actor_id', 'principal', 'request_id', 'path', 'method'],
  approval_record: ['approval_type', 'business_domain', 'target_object_type', 'target_object_id', 'project_id', 'initiator_user_id'],
  todo_item: ['source_type', 'source_id', 'todo_type', 'business_domain', 'target_object_type', 'target_object_id', 'project_id'],
  commission_final_settlement_snapshot: ['project_id', 'created_by'],
  commission_rule_explanation_snapshot: ['project_id', 'created_by'],
});
// Read from the actual two entity sources and SDK metadata, not inferred SQL
// names. These references are kept apart from the fixture's immutable identity.
const SNAPSHOT_PARENTS = Object.freeze({
  commission_final_settlement_snapshot: [
    ['freeze_version_id', 'commission_role_assignment', false],
    ['gate_review_record_id', 'commission_gate_review_record', false],
    ['summary_snapshot_id', 'approval_summary_snapshot', false],
    ['retention_receipt_record_id', 'receipt_record', true],
    ['departure_exception_decision_id', 'commission_departure_exception_decision', true],
    ['supersedes_id', 'commission_final_settlement_snapshot', true],
  ],
  commission_rule_explanation_snapshot: [
    ['final_settlement_snapshot_id', 'commission_final_settlement_snapshot', false],
    ['supersedes_id', 'commission_rule_explanation_snapshot', true],
  ],
});
const OWNED_PARENT_TABLES = Object.freeze([...new Set(Object.values(SNAPSHOT_PARENTS).flat().map(([, table]) => table))]);
const MOD = 4294967296n, WINDOW = MOD / 2n;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const copy = (value) => structuredClone(value);
const ident = (value) => { assert(/^[a-z_][a-z0-9_]{0,62}$/.test(value)); return '"' + value + '"'; };
const literal = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const uuid = (value) => { assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 'Exact scoped UUID required'); return value.toLowerCase(); };

export function reconstructEventXid8(top, eventXmin, observed) {
  top = BigInt(top); const xmin = BigInt(eventXmin); observed = BigInt(observed);
  assert(top >= 3n && xmin >= 3n && xmin < MOD);
  let event = top - top % MOD + xmin;
  if (event < top) event += MOD;
  assert(top <= event && event < observed, 'INSERT subtransaction is outside the observed full-XID epoch');
  assert(observed - top < WINDOW && observed - event < WINDOW, 'Full-XID reconstruction is ambiguous');
  assert.equal(event % MOD, xmin);
  return event.toString();
}

// Pure subject check only. The caller must separately observe the parent row
// and any new parent's INSERT/outer commit through the independent owner.
export function validateTodoApprovalParent(identity, parent, scope, committedParentIdentity = null) {
  assert.equal(identity.source_type, 'approval-record');
  const parentId = uuid(identity.source_id), project = uuid(identity.project_id), actor = uuid(parent.initiator_user_id);
  assert.equal(uuid(parent.id), parentId);
  assert.equal(uuid(parent.project_id), project);
  assert.equal(parent.target_object_type, identity.target_object_type);
  assert.equal(uuid(parent.target_object_id), uuid(identity.target_object_id));
  assert(scope.actors.includes(actor) && scope.projects.includes(project), 'Todo parent actor/project is outside this case');
  assert(scope.targets.some((target) => target.type === identity.target_object_type && target.id === uuid(identity.target_object_id) && target.projectId === project), 'Todo target is outside this case');
  assert(scope.approvalIds.includes(parentId) || committedParentIdentity !== null, 'Todo parent lacks owned-before-case or same-case committed INSERT evidence');
  if (committedParentIdentity !== null) {
    for (const field of ['id', ...FIELDS.approval_record]) assert.deepEqual(parent[field] ?? null, committedParentIdentity[field] ?? null, 'Committed approval parent identity differs');
  }
  return { parentId, actor, project };
}

export function validateSnapshotParentProjects(projectId, parentProjects) {
  // Fixture certificate admission only. This does not add a business/API
  // check to the original gate-review or approval implementation.
  assert.deepEqual(parentProjects.map(uuid).sort(), [uuid(projectId)], 'Snapshot parent must belong exactly to this fixture project');
}

function namesFor(observerId) {
  const token = uuid(observerId).replaceAll('-', '').slice(0, 20);
  return { context: 'l_ci_' + token + '_context', events: 'l_ci_' + token + '_events', fn: 'l_ci_' + token + '_capture', trigger: 'l_ci_' + token };
}

export function observerStatements({ observerId, runId, database, names = namesFor(observerId) }) {
  uuid(observerId); uuid(runId); assert(['poms_r2l_nest', 'poms_r2l_rust'].includes(database));
  const context = `${ident(SCHEMA)}.${ident(names.context)}`, events = `${ident(SCHEMA)}.${ident(names.events)}`, fn = `${ident(SCHEMA)}.${ident(names.fn)}`;
  const identityCases = Object.entries(FIELDS).map(([table, fields]) => `WHEN ${literal(table)} THEN jsonb_build_object(${fields.flatMap((field) => [literal(field), `r->${literal(field)}`]).join(',')})`).join('\n');
  const parentCases = Object.entries(SNAPSHOT_PARENTS).map(([table, fields]) => `WHEN ${literal(table)} THEN jsonb_build_object(${fields.flatMap(([field]) => [literal(field), `r->${literal(field)}`]).join(',')})`).join('\n');
  const body = `
DECLARE c record; i jsonb; r jsonb; snapshot jsonb; matches integer; permitted boolean := false; actor text; project text; target text; top_xid xid8; subject_state text := 'scoped-subject';
BEGIN
  IF TG_OP <> 'INSERT' OR TG_WHEN <> 'AFTER' OR TG_LEVEL <> 'ROW'
    OR TG_TABLE_SCHEMA <> 'poms' OR TG_NAME <> ${literal(names.trigger)}
    OR session_user::text <> ${literal(APP)} OR current_database() <> ${literal(database)}
    OR NOT (TG_TABLE_NAME = ANY(ARRAY[${observedTables.map(literal).join(',')}])) THEN RETURN NEW; END IF;
  SELECT * INTO c FROM ${context} WHERE observer_id=${literal(observerId)}::uuid AND run_id=${literal(runId)}::uuid AND case_id IS NOT NULL;
  IF NOT FOUND THEN RETURN NEW; END IF;
  r := to_jsonb(NEW);
  SELECT count(*) INTO matches FROM jsonb_array_elements(c.scope->'intents') v
    WHERE v->>'table'=TG_TABLE_NAME AND r @> (v->'selector') AND NOT ((v->'beforeIds') ? (r->>'id'));
  IF matches <> 1 THEN RETURN NEW; END IF;
  SELECT v INTO i FROM jsonb_array_elements(c.scope->'intents') v
    WHERE v->>'table'=TG_TABLE_NAME AND r @> (v->'selector') AND NOT ((v->'beforeIds') ? (r->>'id'));
  IF TG_TABLE_NAME='auth_session' THEN
    actor := r->>'user_id'; permitted := (c.scope->'actors') ? actor;
  ELSIF TG_TABLE_NAME='approval_record' THEN
    actor := r->>'initiator_user_id'; project := r->>'project_id'; target := r->>'target_object_id';
    permitted := (c.scope->'actors') ? actor AND (c.scope->'projects') ? project
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.scope->'targets') t WHERE t->>'type'=r->>'target_object_type' AND t->>'id'=target AND t->>'projectId'=project);
  ELSIF TG_TABLE_NAME='todo_item' THEN
    project := r->>'project_id'; target := r->>'target_object_id';
    -- Native L first04 inserts Todo before Approval. This private candidate is
    -- not an actor certificate: drain must prove the committed approval parent.
    subject_state := 'approval-parent-candidate';
    permitted := r->>'source_type'='approval-record' AND (c.scope->'projects') ? project
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.scope->'targets') t WHERE t->>'type'=r->>'target_object_type' AND t->>'id'=target AND t->>'projectId'=project);
  ELSIF TG_TABLE_NAME = ANY(ARRAY[${SNAPSHOTS.map(literal).join(',')}]) THEN
    actor := r->>'created_by'; project := r->>'project_id'; subject_state := 'snapshot-parent-candidate';
    permitted := (c.scope->'actors') ? actor AND (c.scope->'projects') ? project;
  ELSIF TG_TABLE_NAME='audit_log' THEN
    actor := r->>'operator_id'; target := r->>'target_id';
    IF target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN target := lower(target); END IF;
    permitted := (c.scope->'actors') ? actor AND r->>'request_id'=c.request_id
      AND ((c.scope->'knownIds') ? target OR EXISTS (SELECT 1 FROM ${events} e WHERE e.observer_id=c.observer_id AND e.run_id=c.run_id AND e.case_id=c.case_id AND e.source_id::text=target));
  ELSIF TG_TABLE_NAME='security_event' THEN
    actor := r->>'actor_id';
    permitted := r->>'request_id'=c.request_id AND (
      (actor IS NOT NULL AND (c.scope->'actors') ? actor)
      OR (actor IS NULL AND r->>'principal' IS NOT NULL AND (c.scope->'principals') ? (r->>'principal'))
      OR (actor IS NULL AND r->>'principal' IS NULL AND (c.scope->>'anonymous')::boolean));
  END IF;
  IF permitted IS TRUE THEN
    snapshot := jsonb_build_object('id',r->'id') || CASE TG_TABLE_NAME ${identityCases} END;
    top_xid := pg_current_xact_id();
    INSERT INTO ${events}(observer_id,run_id,intent_id,case_id,case_index,op,source_database,source_table,source_id,actor_id,project_id,top_xid8,identity_snapshot,parent_snapshot,subject_state,application_name)
      VALUES(c.observer_id,c.run_id,(i->>'id')::uuid,c.case_id,c.case_index,c.op,current_database(),TG_TABLE_NAME,(r->>'id')::uuid,actor::uuid,project::uuid,top_xid,snapshot,CASE TG_TABLE_NAME ${parentCases} ELSE '{}'::jsonb END,subject_state,current_setting('application_name',true));
  END IF;
  RETURN NEW;
END;
`;
  const functionSql = `CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $r2l_ci$${body}$r2l_ci$`;
  return {
    context, events, fn, names, body, functionSql,
    create: [
      `CREATE TABLE ${context}(observer_id uuid NOT NULL,run_id uuid NOT NULL,request_id text,case_id text,case_index integer,op text,scope jsonb NOT NULL,used_cases text[] NOT NULL DEFAULT '{}')`,
      `CREATE TABLE ${events}(event_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),observer_id uuid NOT NULL,run_id uuid NOT NULL,intent_id uuid NOT NULL,case_id text NOT NULL,case_index integer NOT NULL,op text NOT NULL,source_database text NOT NULL,source_table text NOT NULL,source_id uuid NOT NULL,actor_id uuid,project_id uuid,top_xid8 xid8 NOT NULL,identity_snapshot jsonb NOT NULL,parent_snapshot jsonb NOT NULL,subject_state text NOT NULL CHECK(subject_state IN ('scoped-subject','approval-parent-candidate','snapshot-parent-candidate')),application_name text,observed_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp())`,
      `REVOKE ALL ON TABLE ${context},${events} FROM PUBLIC,${ident(APP)}`,
      functionSql,
      `REVOKE ALL ON FUNCTION ${fn}() FROM PUBLIC,${ident(APP)}`,
      `GRANT EXECUTE ON FUNCTION ${fn}() TO ${ident(APP)}`,
      ...observedTables.map((table) => `CREATE TRIGGER ${ident(names.trigger)} AFTER INSERT ON poms.${ident(table)} FOR EACH ROW EXECUTE FUNCTION ${fn}()`),
    ],
    drop: [...observedTables.map((table) => `DROP TRIGGER ${ident(names.trigger)} ON poms.${ident(table)}`), `DROP FUNCTION ${fn}()`, `DROP TABLE ${events}`, `DROP TABLE ${context}`],
  };
}

function privateFile(file) {
  const stat = fs.lstatSync(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'Unsafe observer private file');
  return fs.readFileSync(file, 'utf8');
}
function saveJournal(file, journal, first = false) {
  const target = first ? file : `${file}.${randomUUID()}.tmp`;
  const fd = fs.openSync(target, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(journal) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (!first) fs.renameSync(target, file);
  const directory = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}

async function catalog(owner) {
  const relations = await owner.query(`WITH targets AS (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relname=ANY($1::text[])), scoped AS (
    SELECT oid FROM targets UNION SELECT indexrelid FROM pg_index WHERE indrelid IN (SELECT oid FROM targets)
    UNION SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r2l_control')
    SELECT n.nspname,c.relname,c.oid::text,c.relkind::text,pg_get_userbyid(c.relowner) AS owner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,c.relpersistence,c.relreplident,c.reloptions,c.reltoastrelid::text,
      i.indrelid::text AS index_of_oid,i.indisprimary,i.indisunique,i.indisvalid,i.indisready,i.indexprs::text,i.indpred::text,
      CASE WHEN i.indexrelid IS NOT NULL THEN ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ordinal) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum ORDER BY k.ordinal) END AS index_columns,
      CASE WHEN i.indexrelid IS NOT NULL THEN pg_get_indexdef(c.oid) END AS index_definition
    FROM scoped s JOIN pg_class c ON c.oid=s.oid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index i ON i.indexrelid=c.oid ORDER BY n.nspname,c.relname`, [observedTables]);
  const schema = await owner.query("SELECT oid::text,nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text FROM pg_namespace WHERE nspname='r2l_control'");
  const triggers = await owner.query("SELECT t.oid::text,t.tgname,c.relname,t.tgfoid::text,t.tgenabled,t.tgisinternal,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relname=ANY($1::text[]) ORDER BY c.relname,t.tgname", [observedTables]);
  const functions = await owner.query("SELECT p.oid::text,p.proname,pg_get_userbyid(p.proowner) AS owner,p.proacl::text,p.prosecdef,p.proconfig,p.prosrc,p.proargtypes::text,p.prorettype::regtype::text AS return_type,l.lanname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='r2l_control' ORDER BY p.proname,p.oid");
  const columns = await owner.query("SELECT n.nspname,c.relname,a.attnum,a.attname,a.atttypid::text,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='r2l_control' OR n.nspname='poms' AND c.relname=ANY($1::text[]) ORDER BY n.nspname,c.relname,a.attnum", [observedTables]);
  const constraints = await owner.query("SELECT con.oid::text,n.nspname,c.relname,con.conname,con.contype,con.convalidated,con.condeferrable,con.condeferred,pg_get_constraintdef(con.oid,true) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r2l_control' OR n.nspname='poms' AND c.relname=ANY($1::text[]) ORDER BY n.nspname,c.relname,con.conname", [observedTables]);
  return { schema: schema.rows, relations: relations.rows, triggers: triggers.rows, functions: functions.rows, columns: columns.rows, constraints: constraints.rows };
}
function assertInitialMarker(relations) {
  const control = relations.filter((row) => row.nspname === SCHEMA);
  assert.deepEqual(control.map((row) => [row.relname, row.relkind]), [['marker', 'r'], ['marker_pkey', 'i']], 'Unknown control objects; no previous observer adoption');
  const [table, index] = control;
  assert.equal(table.owner, OWNER); assert.equal(index.owner, OWNER); assert.equal(index.index_of_oid, table.oid);
  assert(index.indisprimary && index.indisunique && index.indisvalid && index.indisready);
  assert.deepEqual(index.index_columns, ['database_name']); assert.equal(index.indexprs, null); assert.equal(index.indpred, null);
  assert(typeof index.index_definition === 'string' && index.index_definition.length > 0);
}
async function appQuiet(owner, database) {
  const pending = await owner.query('SELECT pid,application_name,state,backend_xid::text FROM pg_stat_activity WHERE datname=$1 AND usename=$2 AND xact_start IS NOT NULL ORDER BY pid', [database, APP]);
  if (pending.rows.length) { const error = new Error('App transaction still active; no committed-create certificate'); error.code = 'R2L_OBSERVER_PENDING'; throw error; }
}

async function observerQuiet(owner, database) {
  await appQuiet(owner, database);
  const pending = await owner.query('SELECT pid,application_name,state,backend_xid::text FROM pg_stat_activity WHERE datname=$1 AND usename=$2 AND pid<>pg_backend_pid() AND xact_start IS NOT NULL ORDER BY pid', [database, OWNER]);
  if (pending.rows.length) { const error = new Error('Another owner transaction is still active; observer outcome is not yet reconcilable'); error.code = 'R2L_OBSERVER_PENDING'; throw error; }
}

export function classifyObserverCatalog(actual, journal) {
  assert(journal.before && typeof journal.before === 'object', 'Original complete catalog witness is required');
  const before = isDeepStrictEqual(actual, journal.before), installed = journal.installedCatalog !== undefined && isDeepStrictEqual(actual, journal.installedCatalog);
  assert(!(before && installed), 'Ambiguous before/installed observer footprints');
  if (before) return 'before';
  if (installed) return 'installed';
  assert.fail('Observer OID/definition/ACL/catalog footprint differs from both exact saved states; reconciliation refused');
}

function observerEnvironment(f) {
  assert.equal(process.platform, 'linux', 'Root-only new Linux L environment');
  const runId = uuid(f.runId), database = `poms_r2l_${f.backend}`; assert(['nest', 'rust'].includes(f.backend));
  assert(f.client?.query && f.store?.file && f.j?.namespace === 'poms-r2l');
  assert.equal(f.j.runId, runId); assert.equal(f.j.database, database); assert.equal(f.j.backend, f.backend); assert.equal(f.j.marker, MARKER);
  const privateRoot = PRIVATE_ROOTS.find((directory) => path.resolve(f.store.file) === `${directory}/l-runs/${f.backend}-${runId}.json`); assert(privateRoot, 'Wrong new private journal');
  for (const directory of [privateRoot, path.join(privateRoot, 'l-runs')]) { const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0); }
  privateFile(f.store.file);
  return { runId, database, privateRoot };
}

function ownerClient(privateRoot, database) {
  const require = createRequire(import.meta.url), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
  return new Client({ host: '127.0.0.1', port: 19432, database, user: OWNER, password: privateFile(path.join(privateRoot, 'owner-password')), connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: 'poms-r2l-pg-create-observer-owner' });
}

async function scopeFor(f, owner, caseId) {
  assert.equal(f.j.state, 'prepared');
  const scope = f.scope(caseId);
  const actors = [...scope.actors, ...scope.borrowedActors].map(uuid);
  assert(new Set(actors).size === actors.length);
  assert(scope.borrowedActors.length === 0 || f.j.borrowed.principalSnapshot, 'Readonly borrowed principal snapshot required');
  const projects = scope.projects.map(uuid);
  const byId = new Map(f.j.objects.map((item) => [item.table + ':' + uuid(item.id), item]));
  const { identities, rowIdentity, digest, SEED_ACTORS } = await import('./fixture-core.mjs');
  const readOwned = async (table, objectId, { allowAbsent = false } = {}) => {
    const item = byId.get(table + ':' + uuid(objectId)); assert(item?.creationProof && item.postcondition?.independentlyVisible === true, 'Unproven observer subject');
    const result = await owner.query(`SELECT to_jsonb(t) AS row FROM poms.${ident(table)} t WHERE id=$1::uuid`, [objectId]);
    // A historical owned row can have been legitimately deleted. Omitting it
    // narrows this case's subjects; it neither adopts a row nor removes its
    // historical ID from the fixture's complete logical-reference scan.
    if (allowAbsent && result.rows.length === 0) return null;
    assert.equal(result.rows.length, 1); assert.equal(digest(rowIdentity(table, result.rows[0].row)), digest(item.identity), 'Observer subject identity changed');
    return result.rows[0].row;
  };
  const principals = [];
  for (const actor of actors) {
    if (scope.borrowedActors.includes(actor)) {
      assert(SEED_ACTORS.includes(actor));
      const result = await owner.query('SELECT username FROM poms.platform_user WHERE id=$1::uuid', [actor]); assert.equal(result.rows.length, 1); principals.push(result.rows[0].username);
    } else principals.push((await readOwned('platform_user', actor)).username);
  }
  for (const project of projects) await readOwned('project', project);
  const targets = [], knownIds = [...actors, ...projects], approvalIds = [];
  for (const item of f.j.objects) {
    if (!['contract', 'customer', 'approval_record', 'todo_item', 'auth_session', 'commission_payout', 'commission_adjustment'].includes(item.table)) continue;
    const row = await readOwned(item.table, item.id, { allowAbsent: true });
    if (row === null) continue;
    if (item.table === 'contract' && projects.includes(row.project_id)) targets.push({ type: 'contract', id: uuid(row.id), projectId: uuid(row.project_id) });
    if (['commission_payout', 'commission_adjustment'].includes(item.table) && projects.includes(row.project_id)) targets.push({ type: item.table.replaceAll('_', '-'), id: uuid(row.id), projectId: uuid(row.project_id) });
    if (item.table === 'approval_record' && projects.includes(row.project_id)) approvalIds.push(uuid(row.id));
    if (item.caseId === caseId || projects.includes(row.project_id) || actors.includes(row.user_id)) knownIds.push(uuid(row.id));
  }
  const intents = f.j.intents.filter((intent) => intent.caseId === caseId && intent.state === 'planned' && observedTables.includes(intent.table)).map((intent) => {
    assert(intent.beforeObserved && intent.selector && Object.keys(intent.selector).length && Array.isArray(intent.beforeIds));
    assert(Object.keys(intent.selector).every((key) => FIELDS[intent.table].includes(key) && identities[intent.table].includes(key)), 'Unreviewed observer intent selector');
    if (['audit_log', 'security_event'].includes(intent.table)) assert.equal(intent.selector.request_id, scope.requestId, 'Exact request intent is required');
    return { id: uuid(intent.id), table: intent.table, selector: copy(intent.selector), beforeIds: intent.beforeIds.map(uuid) };
  });
  assert(intents.length <= 1024, 'Case observer intent bound');
  const ownedParents = [];
  if (intents.some((intent) => SNAPSHOTS.includes(intent.table))) {
    const { resolveOwnedProjectIds } = await import('./fixture-references.mjs');
    for (const item of f.j.objects) {
      if (!OWNED_PARENT_TABLES.includes(item.table)) continue;
      const row = await readOwned(item.table, item.id, { allowAbsent: true });
      if (row === null) continue;
      const parentProjects = resolveOwnedProjectIds(f.j, item.table, row);
      if (!parentProjects.length || !parentProjects.every((project) => projects.includes(uuid(project)))) continue;
      ownedParents.push({ table: item.table, id: uuid(item.id), identity: rowIdentity(item.table, row), projectIds: parentProjects.map(uuid) });
      knownIds.push(uuid(item.id));
    }
  }
  return { actors, projects, principals, targets, knownIds: [...new Set(knownIds)], approvalIds, ownedParents, intents, anonymous: !!scope.anonymous, requestId: scope.requestId };
}

export async function installPgCreateObserver(f) {
  const { runId, database, privateRoot } = observerEnvironment(f);
  const { verifyConnection } = await import('./fixture-guard.mjs'); await verifyConnection(f.client, database, false);
  const owner = ownerClient(privateRoot, database);
  const observerId = randomUUID(), sql = observerStatements({ observerId, runId, database });
  const directory = path.join(privateRoot, 'pg-create-observers');
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
  { const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0); }
  const journalFile = path.join(directory, `${f.backend}-${runId}-${observerId}.json`);
  const source = { file: SOURCE, sha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) };
  const journal = { formatVersion: 1, kind: 'scoped-pg-after-insert-observer', observerId, runId, backend: f.backend, database, marker: MARKER, source, sqlSha256: sha(JSON.stringify(sql)), state: 'planned', cases: [], exports: [], catalogScope: { kind: 'observer-footprint-only', productTables: [...observedTables], controlNamespace: SCHEMA, full107TableCatalogVerified: false, fullCatalogVerificationOwner: 'Root before install and after restore' } };
  let registration, commitAttempted = false;
  const save = (first = false) => saveJournal(journalFile, journal, first);
  try {
    await owner.connect(); await verifyConnection(owner, database, true); await observerQuiet(owner, database);
    const before = await catalog(owner);
    assert.deepEqual(before.schema.map((row) => [row.nspname, row.owner]), [[SCHEMA, OWNER]]);
    assertInitialMarker(before.relations);
    assert.equal(before.functions.length, 0, 'Unknown prior control function; no observer adoption');
    const schemaAcl = await owner.query("SELECT a.grantee::text,a.privilege_type FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname=$1 AND a.grantee<>n.nspowner", [SCHEMA]); assert.equal(schemaAcl.rows.length, 0, 'Unexpected control schema grant');
    assert.equal(before.relations.filter((row) => row.nspname === 'poms' && row.relkind === 'r').length, observedTables.length);
    journal.before = before; save(true);
    await owner.query('BEGIN');
    try {
      for (const statement of sql.create) await owner.query(statement);
      await owner.query(`INSERT INTO ${sql.context}(observer_id,run_id,scope) VALUES($1::uuid,$2::uuid,'{}'::jsonb)`, [observerId, runId]);
      const after = await catalog(owner); journal.installedCatalog = after;
      const fn = after.functions.filter((row) => row.proname === sql.names.fn); assert.equal(fn.length, 1);
      assert(fn[0].prosecdef && fn[0].owner === OWNER && fn[0].return_type === 'trigger' && fn[0].lanname === 'plpgsql' && fn[0].proargtypes === '');
      assert.deepEqual(fn[0].proconfig, ['search_path=pg_catalog']); assert.equal(fn[0].prosrc, sql.body, 'Installed function differs from reviewed SOURCE body');
      const triggers = after.triggers.filter((row) => row.tgname === sql.names.trigger);
      assert.equal(triggers.length, observedTables.length);
      assert.deepEqual(triggers.map((row) => row.relname).toSorted(), [...observedTables].sort());
      assert(triggers.every((row) => row.tgfoid === fn[0].oid && row.tgenabled === 'O' && row.tgisinternal === false));
      const tableAcl = await owner.query("SELECT c.relname,a.grantee::text,a.privilege_type FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) AND a.grantee<>c.relowner", [SCHEMA, [sql.names.context, sql.names.events]]); assert.equal(tableAcl.rows.length, 0);
      const fnAcl = await owner.query("SELECT a.grantee::text,a.privilege_type FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname=$1 AND p.proname=$2 AND (a.grantee NOT IN (p.proowner,(SELECT oid FROM pg_roles WHERE rolname=$3)) OR a.privilege_type<>'EXECUTE')", [SCHEMA, sql.names.fn, APP]); assert.equal(fnAcl.rows.length, 0);
      registration = { id: observerId, kind: 'pg-after-insert-observed-outer-commit', state: 'installed', runId, backend: f.backend, database, marker: MARKER, observerId, functionOid: fn[0].oid, source, approvedDefinitionSha256: sha(fn[0].definition), approvedBodySha256: sha(sql.body) };
      journal.registration = registration; journal.state = 'install-commit-attempted'; save(); commitAttempted = true; await owner.query('COMMIT'); journal.state = 'installed'; save();
    } catch (error) {
      let rollbackAcknowledged = false;
      try { await owner.query('ROLLBACK'); rollbackAcknowledged = true; } catch { /* Preserve an unknown COMMIT/rollback outcome. */ }
      journal.state = commitAttempted ? 'install-outcome-unknown' : rollbackAcknowledged ? 'install-rolled-back' : 'install-rollback-unknown';
      journal.rollbackAcknowledged = rollbackAcknowledged; save(); throw error;
    }
  } catch (error) { try { await owner.end(); } catch { /* Retain the original attempted boundary. */ } throw error; }
  return observerHandle({ f, owner, runId, database, observerId, sql, journal, journalFile, source, registration, verifyConnection });
}

function observerHandle({ f, owner, runId, database, observerId, sql, journal, journalFile, source, registration, verifyConnection, recoveredActive = null }) {
  let installed = true, closed = false, active = recoveredActive;
  const save = (first = false) => saveJournal(journalFile, journal, first);

  async function unchanged() { await verifyConnection(owner, database, true); assert.deepEqual(await catalog(owner), journal.installedCatalog, 'Observer/product OID/definition/ACL footprint changed; exact restore refused'); }
  async function beginCase({ caseId, index, op }) {
    assert(installed && !closed && active === null);
    assert(typeof caseId === 'string' && /^[a-z][a-z0-9_.-]{0,79}$/.test(caseId));
    assert(Number.isSafeInteger(index) && index >= 0 && index <= 1000000 && typeof op === 'string' && /^l\.[a-z0-9_.-]{1,100}$/.test(op));
    assert(!journal.cases.some((entry) => entry.context.caseId === caseId), 'Observer case ID cannot be reused');
    await unchanged(); await appQuiet(owner, database); await f.preflight();
    const scope = await scopeFor(f, owner, caseId), context = { runId, caseId, index, op };
    active = { context, scope, state: 'begin-intended' }; journal.cases.push(active); save();
    const result = await owner.query(`UPDATE ${sql.context} SET request_id=$3,case_id=$4,case_index=$5,op=$6,scope=$7::jsonb,used_cases=array_append(used_cases,$4) WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id IS NULL AND NOT ($4=ANY(used_cases))`, [observerId, runId, scope.requestId, caseId, index, op, JSON.stringify(scope)]);
    assert.equal(result.rowCount, 1); active.state = 'active'; save(); return copy(context);
  }
  async function drainCase() {
    assert(installed && !closed && active);
    let certificationStarted = false;
    try {
    await unchanged(); await appQuiet(owner, database);
    assert(f.j.authorities.some((authority) => authority.id === observerId && authority.functionOid === registration.functionOid), 'Register actual installed authority before certificate export');
    const context = active.context;
    const events = await owner.query(`SELECT e.*,e.top_xid8::text AS top_xid,e.xmin::text AS event_xmin,pg_xact_status(e.top_xid8) AS top_status FROM ${sql.events} e WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id=$3 ORDER BY observed_at,event_id`, [observerId, runId, context.caseId]);
    active.rawEvents = events.rows; active.state = 'draining'; save();
    certificationStarted = true;
    const observed = (await owner.query('SELECT pg_current_xact_id()::text AS xid')).rows[0].xid;
    const output = [], seen = new Set(), currentRows = new Map();
    for (const event of events.rows) {
      assert.equal(event.source_database, database); assert(observedTables.includes(event.source_table)); assert.equal(event.case_index, context.index); assert.equal(event.op, context.op); assert.equal(event.top_status, 'committed');
      const intent = active.scope.intents.find((item) => item.id === event.intent_id && item.table === event.source_table); assert(intent && !intent.beforeIds.includes(uuid(event.source_id)));
      const eventXid8 = reconstructEventXid8(event.top_xid, event.event_xmin, observed);
      const status = (await owner.query('SELECT pg_xact_status($1::xid8) AS status', [eventXid8])).rows[0].status; assert.equal(status, 'committed', 'Released subtransaction is not committed');
      const key = `${event.source_table}:${uuid(event.source_id)}`; assert(!seen.has(key), 'Ambiguous repeated INSERT of one ID'); seen.add(key);
      const current = await owner.query(`SELECT to_jsonb(t) AS row,xmin::text AS xmin FROM poms.${ident(event.source_table)} t WHERE id=$1::uuid`, [event.source_id]); assert.equal(current.rows.length, 1, 'Committed created row no longer visible');
      for (const [field, value] of Object.entries(event.identity_snapshot)) assert.deepEqual(current.rows[0].row[field] ?? null, value, 'Created immutable identity changed');
      for (const [field, value] of Object.entries(intent.selector)) assert.deepEqual(current.rows[0].row[field] ?? null, value, 'Created row no longer matches pre-intent');
      currentRows.set(key, current.rows[0]);
      output.push({ table: event.source_table, id: uuid(event.source_id), identity: copy(event.identity_snapshot), authorityId: observerId, intentId: intent.id, proof: {
        kind: 'pg-after-insert-observed-outer-commit', observerId, marker: MARKER, database, createContext: copy(context), eventId: event.event_id,
        transaction: event.top_xid, topXid8: event.top_xid, eventXmin: event.event_xmin, eventXid8, observedFullXid8: observed,
        topXidStatus: event.top_status, outerStatus: event.top_status, eventXminStatus: status, outerCommitObserved: true,
        visibleFromIndependentOwnerConnection: true, sourceXminAtDrain: current.rows[0].xmin, immutableIdentityAtInsert: event.identity_snapshot,
        applicationName: event.application_name, sourceAuthority: source.sha256, functionOid: registration.functionOid,
      } });
    }
    // Validate every committed INSERT first. Event order cannot authorize a
    // Todo: its approval can have been inserted later in the same transaction.
    const approvalEvents = new Map(output.filter((item) => item.table === 'approval_record').map((item) => [item.id, item]));
    for (const item of output) {
      const event = events.rows.find((row) => row.event_id === item.proof.eventId);
      if (SNAPSHOTS.includes(item.table)) continue;
      if (item.table !== 'todo_item') { assert.equal(event.subject_state, 'scoped-subject'); continue; }
      assert.equal(event.subject_state, 'approval-parent-candidate'); assert.equal(event.actor_id, null);
      const parentId = uuid(item.identity.source_id), parentEvent = approvalEvents.get(parentId);
      assert(active.scope.approvalIds.includes(parentId) || parentEvent, 'Unknown committed approval parent; private candidate is not certified');
      if (parentEvent) assert.equal(parentEvent.proof.topXid8, item.proof.topXid8, 'New approval parent belongs to another outer transaction');
      const parent = await owner.query('SELECT to_jsonb(a) AS row,a.xmin::text AS xmin FROM poms.approval_record a WHERE a.id=$1::uuid', [parentId]);
      assert.equal(parent.rows.length, 1, 'Committed approval parent is not independently visible');
      const checked = validateTodoApprovalParent(item.identity, parent.rows[0].row, active.scope, parentEvent?.identity ?? null);
      item.proof.deferredSubjectValidation = {
        kind: 'committed-approval-parent-at-drain', parentApprovalId: checked.parentId, actorId: checked.actor, projectId: checked.project,
        parentSource: parentEvent ? 'same-case-committed-insert' : 'owned-before-case', parentEventId: parentEvent?.proof.eventId ?? null,
        parentXminAtDrain: parent.rows[0].xmin, visibleFromIndependentOwnerConnection: true,
      };
    }
    const snapshotValidations = new Map();
    async function validateSnapshot(item, visiting = new Set()) {
      const key = `${item.table}:${item.id}`;
      if (snapshotValidations.has(key)) return snapshotValidations.get(key);
      assert(!visiting.has(key), 'Cyclic generated snapshot parent evidence'); visiting.add(key);
      const event = events.rows.find((row) => row.event_id === item.proof.eventId), actual = currentRows.get(key).row;
      assert.equal(event.subject_state, 'snapshot-parent-candidate');
      assert.equal(uuid(event.actor_id), uuid(item.identity.created_by)); assert.equal(uuid(event.project_id), uuid(item.identity.project_id));
      assert(active.scope.actors.includes(uuid(item.identity.created_by)) && active.scope.projects.includes(uuid(item.identity.project_id)), 'Snapshot actor/project is outside this case');
      assert.deepEqual(Object.keys(event.parent_snapshot).sort(), SNAPSHOT_PARENTS[item.table].map(([column]) => column).sort());
      const parents = [];
      for (const [column, table, nullable] of SNAPSHOT_PARENTS[item.table]) {
        const value = event.parent_snapshot[column]; assert.deepEqual(actual[column] ?? null, value, 'Original snapshot parent reference changed before drain');
        if (value === null) { assert(nullable, 'Required snapshot parent is absent'); continue; }
        const parentId = uuid(value), known = active.scope.ownedParents.find((parent) => parent.table === table && parent.id === parentId);
        const created = output.find((parent) => parent.table === table && parent.id === parentId);
        assert(known || created, 'Snapshot parent has no scoped ownership/committed INSERT evidence');
        const parent = await owner.query(`SELECT to_jsonb(t) AS row,xmin::text AS xmin FROM poms.${ident(table)} t WHERE id=$1::uuid`, [parentId]);
        assert.equal(parent.rows.length, 1, 'Snapshot parent is not independently visible');
        const { rowIdentity, digest } = await import('./fixture-core.mjs');
        assert.equal(digest(rowIdentity(table, parent.rows[0].row)), digest(known?.identity ?? created.identity), 'Snapshot parent immutable identity differs');
        let parentProjects;
        if (known) parentProjects = known.projectIds;
        else {
          assert(SNAPSHOTS.includes(table)); assert.equal(created.proof.topXid8, item.proof.topXid8, 'New snapshot parent belongs to another outer transaction');
          parentProjects = (await validateSnapshot(created, visiting)).projectIds;
        }
        assert(parentProjects.length && parentProjects.every((project) => active.scope.projects.includes(uuid(project))), 'Snapshot parent project is outside this case');
        validateSnapshotParentProjects(item.identity.project_id, parentProjects);
        parents.push({ column, table, id: parentId, source: known ? 'owned-before-case' : 'same-case-committed-insert', eventId: known ? null : created.proof.eventId, projectIds: copy(parentProjects), sourceXminAtDrain: parent.rows[0].xmin });
      }
      visiting.delete(key);
      const validation = { kind: 'committed-snapshot-parents-at-drain', actorId: uuid(item.identity.created_by), projectIds: [uuid(item.identity.project_id)], referencesAtInsert: copy(event.parent_snapshot), parents, visibleFromIndependentOwnerConnection: true };
      snapshotValidations.set(key, validation); item.proof.deferredSubjectValidation = validation; return validation;
    }
    for (const item of output) if (SNAPSHOTS.includes(item.table)) await validateSnapshot(item);
    active.rows = output; active.state = 'exported'; save();
    const result = await owner.query(`UPDATE ${sql.context} SET request_id=NULL,case_id=NULL,case_index=NULL,op=NULL,scope='{}'::jsonb WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id=$3`, [observerId, runId, context.caseId]); assert.equal(result.rowCount, 1);
    active.state = 'drained'; save(); active = null; return copy(output);
    } catch (error) {
      // An in-progress transaction or a connection error is not an observed
      // certificate rejection and cannot unlock rejected-case disposal.
      if (active && certificationStarted && error?.code === 'ERR_ASSERTION') {
        const failureId = randomUUID(), file = path.join(path.dirname(journalFile), `${observerId}.rejection-${failureId}.json`);
        const context = (await owner.query(`SELECT observer_id,run_id,request_id,case_id,case_index,op,scope,used_cases FROM ${sql.context}`)).rows;
        assert.equal(context.length, 1); assert.equal(context[0].case_id, active.context.caseId); assert.deepEqual(context[0].scope, active.scope);
        const footprint = await catalog(owner); assert.deepEqual(footprint, journal.installedCatalog);
        const failure = { kind: 'actual-drain-certificate-rejection', failureId, at: new Date().toISOString(), observerId, runId, database, source, context: context[0], events: copy(active.rawEvents), reason: { name: error.name, code: error.code, message: error.message }, catalog: footprint, creationCertificatesIssued: 0 };
        saveJournal(file, failure, true);
        active.rejections ??= []; active.rejections.push({ file, sha256: sha(privateFile(file)), failureId }); save();
      }
      throw error;
    }
  }
  async function discardRejectedCase() {
    assert(installed && !closed && active && active.rejections?.length, 'A real prior certificate rejection is required');
    const rejection = active.rejections.at(-1), failureBytes = privateFile(rejection.file); assert.equal(sha(failureBytes), rejection.sha256);
    const failure = JSON.parse(failureBytes);
    assert.equal(failure.kind, 'actual-drain-certificate-rejection'); assert.equal(failure.failureId, rejection.failureId);
    assert.equal(failure.observerId, observerId); assert.equal(failure.runId, runId); assert.equal(failure.database, database); assert.deepEqual(failure.source, source);
    assert.equal(failure.context.case_id, active.context.caseId); assert.deepEqual(failure.context.scope, active.scope);
    await unchanged(); await observerQuiet(owner, database);
    const readContext = async () => (await owner.query(`SELECT observer_id,run_id,request_id,case_id,case_index,op,scope,used_cases FROM ${sql.context}`)).rows;
    assert.deepEqual(await readContext(), [failure.context], 'Rejected active context changed');
    const raw = (await owner.query(`SELECT e.*,e.top_xid8::text AS top_xid,e.xmin::text AS event_xmin,pg_xact_status(e.top_xid8) AS top_status FROM ${sql.events} e WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id=$3 ORDER BY observed_at,event_id`, [observerId, runId, active.context.caseId])).rows;
    assert.deepEqual(JSON.parse(JSON.stringify(raw)), failure.events, 'Rejected raw event set changed');
    const absence = [];
    for (const event of raw) {
      assert(observedTables.includes(event.source_table)); assert.equal(event.observer_id, observerId); assert.equal(event.run_id, runId); assert.equal(event.case_id, active.context.caseId); assert.equal(event.source_database, database);
      const present = await owner.query(`SELECT id FROM poms.${ident(event.source_table)} WHERE id=$1::uuid`, [uuid(event.source_id)]);
      assert.equal(present.rows.length, 0, 'Rejected created row still exists; no query-match adoption or disposal is allowed');
      absence.push({ table: event.source_table, id: uuid(event.source_id), independentlyObservedRows: 0 });
    }
    await observerQuiet(owner, database); assert.deepEqual(await catalog(owner), failure.catalog); assert.deepEqual(await readContext(), [failure.context]);
    const discardId = randomUUID(), file = path.join(path.dirname(journalFile), `${observerId}.discard-${discardId}.json`);
    const evidence = { kind: 'rejected-case-no-surviving-created-rows', discardId, observerId, runId, database, source, at: new Date().toISOString(), rejection, context: failure.context, events: raw, absence, catalog: failure.catalog, creationCertificatesIssued: 0, PostgreSQLBusinessDMLExecuted: false };
    saveJournal(file, evidence, true);
    active.discard = { file, sha256: sha(privateFile(file)), discardId }; active.state = 'discard-intended'; save();
    const context = failure.context;
    const result = await owner.query(`UPDATE ${sql.context} SET request_id=NULL,case_id=NULL,case_index=NULL,op=NULL,scope='{}'::jsonb WHERE observer_id=$1::uuid AND run_id=$2::uuid AND case_id=$3 AND case_index=$4 AND op=$5 AND request_id IS NOT DISTINCT FROM $6 AND scope=$7::jsonb AND used_cases=$8::text[]`, [observerId, runId, context.case_id, context.case_index, context.op, context.request_id, JSON.stringify(context.scope), context.used_cases]);
    assert.equal(result.rowCount, 1, 'Rejected context compare-and-clear failed');
    active.state = 'discarded'; save(); active = null;
    return { kind: evidence.kind, result: 'private-rejected-case-discarded-without-certificates', events: raw.length, independentlyAbsentRows: absence.length, evidenceSha256: sha(privateFile(file)), creationCertificatesIssued: 0, PostgreSQLBusinessDMLExecuted: false };
  }
  async function restore() {
    assert(installed && !closed); if (active) await drainCase(); await unchanged(); await appQuiet(owner, database);
    const events = await owner.query(`SELECT e.*,e.top_xid8::text AS top_xid,e.xmin::text AS event_xmin,pg_xact_status(e.top_xid8) AS top_status FROM ${sql.events} e ORDER BY observed_at,event_id`);
    assert(events.rows.every((event) => event.observer_id === observerId && event.run_id === runId && event.source_database === database && event.top_status === 'committed'));
    journal.exports.push({ at: new Date().toISOString(), events: events.rows, sha256: sha(JSON.stringify(events.rows)) }); journal.state = 'exported-before-restore'; save();
    let commitAttempted = false;
    await owner.query('BEGIN');
    try {
      // No verifyConnection here: it owns a read-only transaction and must not
      // roll back the restoration transaction. Compare the exact footprint.
      assert.deepEqual(await catalog(owner), journal.installedCatalog);
      for (const statement of sql.drop) await owner.query(statement);
      assert.deepEqual(await catalog(owner), journal.before, 'Original observer footprint did not restore exactly');
      journal.state = 'restore-commit-attempted'; save(); commitAttempted = true; await owner.query('COMMIT'); installed = false; journal.state = 'restored'; save();
    } catch (error) {
      let rollbackAcknowledged = false;
      try { await owner.query('ROLLBACK'); rollbackAcknowledged = true; } catch { /* Preserve the exact uncertain boundary. */ }
      journal.state = commitAttempted ? 'restore-outcome-unknown' : rollbackAcknowledged ? 'restore-failed' : 'restore-rollback-unknown';
      journal.restoreRollbackAcknowledged = rollbackAcknowledged; save();
      // This handle is no longer an authority after an uncertain restoration.
      // A fresh connection must reconcile the exact saved catalog first.
      closed = true; try { await owner.end(); } catch { /* Keep the original boundary/error. */ }
      throw error;
    }
    assert.deepEqual(await catalog(owner), journal.before); closed = true; await owner.end();
    return { kind: journal.kind, result: 'observer-footprint-restored', observerId, database, journalFile, exportedEvents: events.rows.length, eventExportSha256: journal.exports.at(-1).sha256, observerFootprintCatalogSha256: sha(JSON.stringify(journal.before)), observerFootprintRestored: true, catalogScope: copy(journal.catalogScope), observerSqlModifiesBusinessRows: false };
  }
  return { beginCase, drainCase, discardRejectedCase, restore, journalFile, receipt: () => copy(registration) };
}

function savePrivateBytes(file, bytes) {
  const fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const directory = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}

async function reconcileCaseContext(owner, sql, journal) {
  const result = await owner.query(`SELECT observer_id,run_id,request_id,case_id,case_index,op,scope,used_cases FROM ${sql.context}`);
  assert.equal(result.rows.length, 1, 'Unknown observer control context rows');
  const actual = result.rows[0]; assert.equal(actual.observer_id, journal.observerId); assert.equal(actual.run_id, journal.runId);
  assert(Array.isArray(actual.used_cases) && new Set(actual.used_cases).size === actual.used_cases.length);
  assert(actual.used_cases.every((caseId) => journal.cases.some((entry) => entry.context.caseId === caseId)), 'Unknown control case cannot be recovered');
  let active = null;
  if (actual.case_id === null) {
    assert.equal(actual.request_id, null); assert.equal(actual.case_index, null); assert.equal(actual.op, null); assert.deepEqual(actual.scope, {});
    for (const entry of journal.cases) {
      if (['drained','discarded'].includes(entry.state)) assert(actual.used_cases.includes(entry.context.caseId));
      else if (entry.state === 'begin-intended' && !actual.used_cases.includes(entry.context.caseId)) continue;
      else if (entry.state === 'exported' && Array.isArray(entry.rows) && actual.used_cases.includes(entry.context.caseId)) entry.state = 'drained';
      else if (entry.state === 'discard-intended' && entry.discard && actual.used_cases.includes(entry.context.caseId)) {
        const bytes = privateFile(entry.discard.file); assert.equal(sha(bytes), entry.discard.sha256);
        const evidence = JSON.parse(bytes); assert.equal(evidence.kind, 'rejected-case-no-surviving-created-rows'); assert.equal(evidence.observerId, journal.observerId); assert.equal(evidence.runId, journal.runId); assert.equal(evidence.context.case_id, entry.context.caseId); assert.equal(evidence.creationCertificatesIssued, 0);
        for (const absent of evidence.absence) { assert(observedTables.includes(absent.table)); const row = await owner.query(`SELECT id FROM poms.${ident(absent.table)} WHERE id=$1::uuid`, [uuid(absent.id)]); assert.equal(row.rows.length, 0); }
        entry.state = 'discarded';
      }
      else assert.fail('Private active case disagrees with empty control context');
    }
  } else {
    active = journal.cases.find((entry) => entry.context.caseId === actual.case_id);
    assert(active && ['begin-intended','active','draining','exported','discard-intended'].includes(active.state), 'Unknown/non-active private case');
    assert.equal(actual.case_index, active.context.index); assert.equal(actual.op, active.context.op); assert.equal(actual.request_id, active.scope.requestId);
    assert.deepEqual(actual.scope, active.scope); assert(actual.used_cases.includes(actual.case_id));
    assert(journal.cases.every((entry) => entry === active || ['drained','discarded'].includes(entry.state)), 'More than one private active case');
    active.state = 'active';
  }
  return { active, actual };
}

/** Read-only PG reconciliation; never reinstalls or guesses DROP statements.
 * The attempted journal and an exact byte snapshot remain immutable. A new
 * private generation records the recovery and owns any reopened handle.
 */
export async function reconcilePgCreateObserver(f, selection) {
  const { runId, database, privateRoot } = observerEnvironment(f);
  const options = typeof selection === 'string'
    ? (/^[0-9a-f-]{36}$/i.test(selection) ? { observerId: selection } : { journalFile: selection }) : selection;
  assert(options && (options.observerId || options.journalFile), 'Exact observer ID or private journal required');
  const directory = path.join(privateRoot, 'pg-create-observers');
  { const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0); }
  const selectedId = options.observerId ? uuid(options.observerId) : null;
  const attemptedFile = options.journalFile ? path.resolve(options.journalFile) : path.join(directory, `${f.backend}-${runId}-${selectedId}.json`);
  assert.equal(path.dirname(attemptedFile), directory, 'Recovery journal is outside the exact new private namespace');
  const bytes = privateFile(attemptedFile), attempted = JSON.parse(bytes), observerId = uuid(attempted.observerId);
  assert(selectedId === null || selectedId === observerId);
  const prefix = `${f.backend}-${runId}-${observerId}`;
  assert(path.basename(attemptedFile) === `${prefix}.json` || new RegExp(`^${prefix}\\.recovery-[0-9a-f-]{36}\\.json$`).test(path.basename(attemptedFile)), 'Unexpected private journal generation name');
  assert.equal(attempted.formatVersion, 1); assert.equal(attempted.kind, 'scoped-pg-after-insert-observer');
  assert.equal(attempted.runId, runId); assert.equal(attempted.backend, f.backend); assert.equal(attempted.database, database); assert.equal(attempted.marker, MARKER);
  const source = { file: SOURCE, sha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) };
  assert.deepEqual(attempted.source, source, 'Recovery requires the exact original observer SOURCE bytes');
  const sql = observerStatements({ observerId, runId, database }); assert.equal(sha(JSON.stringify(sql)), attempted.sqlSha256, 'Recovery SQL differs from the attempted reviewed definition');
  const { verifyConnection } = await import('./fixture-guard.mjs'); await verifyConnection(f.client, database, false);
  const owner = ownerClient(privateRoot, database); let transferred = false;
  try {
    await owner.connect(); await verifyConnection(owner, database, true); await observerQuiet(owner, database);
    const actual = await catalog(owner), classification = classifyObserverCatalog(actual, attempted);
    const recovered = copy(attempted), recoveredState = classification === 'installed' ? await reconcileCaseContext(owner, sql, recovered) : null;
    if (classification === 'installed') {
      assert(recovered.registration && recovered.registration.functionOid);
      const fn = actual.functions.filter((row) => row.oid === String(recovered.registration.functionOid)); assert.equal(fn.length, 1);
      assert.equal(fn[0].prosrc, sql.body); assert.equal(sha(fn[0].definition), recovered.registration.approvedDefinitionSha256);
      assert.equal(sha(sql.body), recovered.registration.approvedBodySha256);
    }
    assert.equal(sha(privateFile(attemptedFile)), sha(bytes), 'Attempted journal changed during reconciliation');
    const recoveryId = randomUUID(), priorSnapshot = path.join(directory, `${prefix}.prior-${recoveryId}.json`);
    savePrivateBytes(priorSnapshot, bytes);
    const journalFile = path.join(directory, `${prefix}.recovery-${recoveryId}.json`);
    const event = { kind: 'observer-catalog-reconciliation', recoveryId, at: new Date().toISOString(), attemptedJournal: attemptedFile, attemptedJournalSha256: sha(bytes), priorSnapshot, attemptedState: attempted.state, classification, observedCatalogSha256: sha(JSON.stringify(actual)), originalAttemptPreserved: true, PostgreSQLDDLExecuted: false, controlContextSha256: recoveredState ? sha(JSON.stringify(recoveredState.actual)) : null };
    recovered.recoveryEvents = [...(recovered.recoveryEvents ?? []), event];
    recovered.state = classification === 'installed' ? 'recovered-installed' : 'reconciled-before';
    saveJournal(journalFile, recovered, true);
    const result = { kind: 'scoped-pg-observer-reconciliation', result: classification === 'installed' ? 'exact-installed-handle-reopened' : 'exact-original-footprint-present', observerId, database, journalFile, event, observerFootprintRestored: classification === 'before', full107TableCatalogVerified: false };
    if (classification === 'before') return result;
    result.handle = observerHandle({ f, owner, runId, database, observerId, sql, journal: recovered, journalFile, source, registration: recovered.registration, verifyConnection, recoveredActive: recoveredState.active });
    transferred = true; return result;
  } finally { if (!transferred) await owner.end(); }
}

export const recoverPgCreateObserver = reconcilePgCreateObserver;
export const reopenPgCreateObserver = reconcilePgCreateObserver;

if (process.argv.includes('--check') && path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const sql = observerStatements({ observerId: 'a0000000-0000-4000-8000-000000000001', runId: 'a0000000-0000-4000-8000-000000000002', database: 'poms_r2l_rust' });
  assert.equal(sql.create.filter((statement) => statement.startsWith('CREATE TRIGGER')).length, 7);
  assert(sql.create.every((statement) => !/CREATE OR REPLACE|CASCADE|FOR UPDATE|ALTER TABLE/i.test(statement)));
  assert(sql.functionSql.includes('SECURITY DEFINER SET search_path=pg_catalog'));
  assert(!/NEW\.[a-z_]+\s*:?=|UPDATE poms\.|DELETE FROM poms\./i.test(sql.body));
  assert(!sql.body.includes('FROM poms.approval_record'), 'Todo AFTER trigger must not require a not-yet-inserted approval');
  assert(sql.body.includes("subject_state := 'approval-parent-candidate'"));
  assert.equal(reconstructEventXid8('4294967300', '7', '4294967310'), '4294967303');
  assert.equal(reconstructEventXid8('4294967294', '3', '4294967301'), '4294967299');
  assert.throws(() => reconstructEventXid8('100', '99', '110'));
  assert.throws(() => reconstructEventXid8('100', '100', String(100n + WINDOW)));
  const ids = ['a0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000013','a0000000-0000-4000-8000-000000000014'];
  const todo = { source_type: 'approval-record', source_id: ids[0], project_id: ids[1], target_object_type: 'contract', target_object_id: ids[2] };
  const parent = { id: ids[0], project_id: ids[1], target_object_type: 'contract', target_object_id: ids[2], initiator_user_id: ids[3] };
  const scope = { actors: [ids[3]], projects: [ids[1]], targets: [{ type: 'contract', id: ids[2], projectId: ids[1] }], approvalIds: [] };
  assert.throws(() => validateTodoApprovalParent(todo, parent, scope));
  assert.equal(validateTodoApprovalParent(todo, parent, scope, parent).actor, ids[3]);
  assert.equal(validateTodoApprovalParent(todo, parent, { ...scope, approvalIds: [ids[0]] }).parentId, ids[0]);
  assert.throws(() => validateTodoApprovalParent(todo, { ...parent, initiator_user_id: ids[0] }, scope, parent));
  assert.throws(() => validateTodoApprovalParent(todo, { ...parent, project_id: ids[2] }, scope, parent));
  validateSnapshotParentProjects(ids[1], [ids[1]]);
  assert.throws(() => validateSnapshotParentProjects(ids[1], [ids[2]]));
  assert.throws(() => validateSnapshotParentProjects(ids[1], [ids[1],ids[2]]));
  const before = { schema: ['marker'], relations: [{ oid: '11', acl: null }], functions: [], triggers: [], columns: ['id'], constraints: ['pk'], indexes: ['pk11'] };
  const installed = { ...copy(before), functions: [{ oid: '22', definition: 'approved function', acl: 'owner/app execute' }], triggers: [{ oid: '23', function: '22' }] };
  assert.equal(classifyObserverCatalog(copy(before), { before, installedCatalog: installed }), 'before');
  assert.equal(classifyObserverCatalog(copy(installed), { before, installedCatalog: installed }), 'installed');
  for (const [key, value] of [['functions', [{ oid: '99', definition: 'approved function', acl: 'owner/app execute' }]], ['columns', ['id','foreign']], ['constraints', []], ['indexes', ['changed']], ['relations', [{ oid: '11', acl: 'public-write' }]]]) {
    assert.throws(() => classifyObserverCatalog({ ...copy(installed), [key]: value }, { before, installedCatalog: installed }));
  }
  assert.throws(() => classifyObserverCatalog(before, { before, installedCatalog: before }));
  console.log(JSON.stringify({ kind: 'pure-observer-source-template-check', tables: observedTables.length, PostgreSQLExecuted: false, DDLExecuted: false, privateAccess: false, runtimeCalibration: 'Pending C and Root actual outer-commit/savepoint/rollback/foreign-intent tests' }));
}
