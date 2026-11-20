import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha, quote, diffRows, segment } from './pure.mjs';
import { captureObjects } from './objects.mjs';

export async function catalog(c, expectedTables = 139) {
  const tables = (await c.query(`SELECT c.relname name,c.oid::text oid,COALESCE((SELECT array_agg(a.attname::text ORDER BY k.n) FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum WHERE i.indrelid=c.oid AND i.indisprimary),'{}'::text[]) pk,
    (SELECT array_agg(a.attname::text ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) columns FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relkind='r' ORDER BY c.relname`)).rows;
  assert.equal(tables.length, expectedTables, 'Exact registered table inventory required');
  const foreignKeys = (await c.query(`SELECT x.conname name,child.relname child,parent.relname parent,
    (SELECT array_agg(a.attname::text ORDER BY k.n) FROM unnest(x.conkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=x.conrelid AND a.attnum=k.attnum) "childColumns",
    (SELECT array_agg(a.attname::text ORDER BY k.n) FROM unnest(x.confkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=x.confrelid AND a.attnum=k.attnum) "parentColumns",x.confdeltype "deleteRule"
    FROM pg_constraint x JOIN pg_class child ON child.oid=x.conrelid JOIN pg_class parent ON parent.oid=x.confrelid JOIN pg_namespace n ON n.oid=child.relnamespace JOIN pg_namespace pn ON pn.oid=parent.relnamespace WHERE x.contype='f' AND n.nspname='poms' AND pn.nspname='poms' ORDER BY child.relname,x.conname`)).rows;
  const externalForeignKeys = (await c.query(`SELECT x.oid::text oid,x.conname name,n.nspname "childSchema",child.relname child,parent.relname parent,pg_get_constraintdef(x.oid,true) definition
    FROM pg_constraint x JOIN pg_class child ON child.oid=x.conrelid JOIN pg_class parent ON parent.oid=x.confrelid JOIN pg_namespace n ON n.oid=child.relnamespace JOIN pg_namespace pn ON pn.oid=parent.relnamespace
    WHERE x.contype='f' AND pn.nspname='poms' AND n.nspname<>'poms' ORDER BY n.nspname,child.relname,x.conname`)).rows;
  const normative = {};
  const queries = {
    relations: "SELECT c.oid::text oid,n.nspname schema,c.relname name,c.relkind,pg_get_userbyid(c.relowner) owner,c.relacl::text acl,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind IN ('r','p','S','v','m') ORDER BY n.nspname,c.relname",
    schemas: "SELECT oid::text oid,nspname,pg_get_userbyid(nspowner) owner,nspacl::text acl FROM pg_namespace WHERE nspname IN ('poms','r4ghi_control') ORDER BY nspname",
    columns: "SELECT n.nspname schema,c.relname table_name,a.attnum,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text acl,pg_get_expr(d.adbin,d.adrelid) default_expr FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY n.nspname,c.relname,a.attnum",
    constraints: "SELECT x.oid::text oid,n.nspname schema,c.relname table_name,x.conname,pg_get_constraintdef(x.oid,true) definition FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') ORDER BY n.nspname,c.relname,x.conname",
    indexes: "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('poms','r4ghi_control') ORDER BY schemaname,tablename,indexname",
    triggers: "SELECT t.oid::text oid,n.nspname schema,c.relname table_name,t.tgname,pg_get_triggerdef(t.oid,true) definition,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND NOT t.tgisinternal ORDER BY n.nspname,c.relname,t.tgname",
    functions: "SELECT p.oid::text oid,n.nspname schema,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('poms','r4ghi_control') AND p.prokind='f' ORDER BY n.nspname,p.proname,arguments",
    roles: "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig FROM pg_roles WHERE rolname IN ('poms_r0e_owner','poms_r4ghi_native_app','poms_r4ghi_rust_app') ORDER BY rolname",
    memberships: "SELECT a.rolname member,b.rolname granted,r.admin_option FROM pg_auth_members r JOIN pg_roles a ON a.oid=r.member JOIN pg_roles b ON b.oid=r.roleid WHERE a.rolname IN ('poms_r0e_owner','poms_r4ghi_native_app','poms_r4ghi_rust_app') ORDER BY a.rolname,b.rolname",
  };
  for (const [key, sql] of Object.entries(queries)) normative[key] = (await c.query(`SELECT row_to_json(x)::text raw FROM (${sql}) x`)).rows.map(r => r.raw);
  const sequences = [];
  for (const sequence of (await c.query("SELECT n.nspname schema,c.relname name,c.oid::text oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind='S' ORDER BY n.nspname,c.relname")).rows) {
    sequences.push({ ...sequence, ...(await c.query(`SELECT last_value::text value,is_called FROM ${quote(sequence.schema)}.${quote(sequence.name)}`)).rows[0] });
  }
  return { tables, foreignKeys, externalForeignKeys, normative, sequences };
}
export async function capture(ctx, label) {
  segment(label); const folder = `${ctx.priv}/snapshot-${label}`; fs.mkdirSync(folder, { mode: 0o700 });
  const result = { schemaVersion: 1, label, marker: ctx.identity.marker, epoch: ctx.epoch, run: ctx.run, capturedAt: new Date().toISOString(), databases: {} };
  for (const database of ctx.databases) await ctx.db(async c => {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      const meta = await catalog(c, ctx.tables), tables = {};
      for (const table of meta.tables) {
        const pkSql = table.pk.length ? `json_build_array(${table.pk.map(k => `t.${quote(k)}::text`).join(',')})::text` : 'NULL::text';
        const needed = [...new Set([...table.pk, ...meta.foreignKeys.filter(f => f.child === table.name).flatMap(f => f.childColumns), ...meta.foreignKeys.filter(f => f.parent === table.name).flatMap(f => f.parentColumns)])];
        const cellsSql = needed.length ? `json_build_object(${needed.flatMap(k => [`'${k}'`, `t.${quote(k)}::text`]).join(',')})::text` : "'{}'::text";
        const rows = (await c.query(`SELECT row_to_json(t)::text raw,t.xmin::text xmin,${pkSql} key,${cellsSql} cells FROM poms.${quote(table.name)} t ORDER BY ${table.pk.length ? table.pk.map(k => `t.${quote(k)}`).join(',') : 'row_to_json(t)::text'}`)).rows;
        const values = rows.map(r => ({ key: r.key === null ? [`no-pk:${sha(r.raw)}`] : JSON.parse(r.key), cells: JSON.parse(r.cells), raw: r.raw, sha256: sha(r.raw), xmin: r.xmin }));
        const bytes = Buffer.from(values.map(r => JSON.stringify(r)).join('\n') + (values.length ? '\n' : ''));
        const file = `${folder}/${database}-${table.name}.jsonl`; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
        tables[table.name] = { file, count: rows.length, pk: table.pk, columns: table.columns, rawBytesSha256: sha(bytes), logicalRowsSha256: sha(values.map(r => r.raw).join('\n')) };
      }
      result.databases[database] = { meta, tables }; await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; }
  }, database);
  result.objects = Object.fromEntries(ctx.databases.map(database => [database, captureObjects(ctx, database)]));
  const manifest = ctx.artifact(`snapshot-${label}.json`, result, { kind: 'actual-private-full-baseline-observation', label, databaseCount: ctx.databases.length, tablesPerDatabase: ctx.tables,
    objectCounts: Object.fromEntries(ctx.databases.map(d => [d, result.objects[d].files.length])),
    counts: Object.fromEntries(ctx.databases.map(d => [d, Object.values(result.databases[d].tables).reduce((n, t) => n + t.count, 0)])), crossDatabaseAtomicity: false });
  return { ...result, manifest };
}
export function loadSnapshot(ctx, input = 'baseline') {
  const pin = input === 'baseline' ? ctx.state.baseline : input;
  assert(pin?.file && pin.rawBytesSha256, 'Immutable snapshot pin required'); const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes);
}
export function readRows(table) {
  const bytes = fs.readFileSync(table.file); assert.equal(sha(bytes), table.rawBytesSha256);
  return bytes.toString('utf8').split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); return row; });
}
export function difference(before, after) {
  const changes = [];
  assert.deepEqual(Object.keys(before.databases), Object.keys(after.databases));
  for (const [database, a] of Object.entries(after.databases)) {
    const b = before.databases[database]; assert.deepEqual(Object.keys(a.tables), Object.keys(b.tables));
    for (const table of Object.keys(a.tables)) { const diff = diffRows(readRows(b.tables[table]), readRows(a.tables[table])); if (diff.added.length || diff.changed.length || diff.missing.length) changes.push({ database, table, ...diff }); }
  }
  return changes;
}
