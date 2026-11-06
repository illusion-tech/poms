import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha, quote, diffRows } from './pure.mjs';

export async function catalog(c) {
  const { rows: tables } = await c.query(`SELECT c.relname name,COALESCE((SELECT array_agg(a.attname::text ORDER BY k.n) FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum WHERE i.indrelid=c.oid AND i.indisprimary),'{}'::text[]) pk,
    (SELECT array_agg(a.attname::text ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) columns
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relkind='r' ORDER BY c.relname`);
  assert.equal(tables.length, 120, 'Expected exact new-namespace poms table inventory');
  const { rows: foreignKeys } = await c.query(`SELECT x.conname name,child.relname child,parent.relname parent,
    (SELECT array_agg(a.attname::text ORDER BY k.n) FROM unnest(x.conkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=x.conrelid AND a.attnum=k.attnum) "childColumns",
    (SELECT array_agg(a.attname::text ORDER BY k.n) FROM unnest(x.confkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute a ON a.attrelid=x.confrelid AND a.attnum=k.attnum) "parentColumns",x.confdeltype "deleteRule"
    FROM pg_constraint x JOIN pg_class child ON child.oid=x.conrelid JOIN pg_class parent ON parent.oid=x.confrelid JOIN pg_namespace n ON n.oid=child.relnamespace JOIN pg_namespace pn ON pn.oid=parent.relnamespace
    WHERE x.contype='f' AND n.nspname='poms' AND pn.nspname='poms' ORDER BY child.relname,x.conname`);
  const normative = {};
  for (const [name, sql] of Object.entries({
    relations: "SELECT n.nspname schema,c.relname name,c.relkind,pg_get_userbyid(c.relowner) owner,c.relacl::text acl,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind IN ('r','p','S','v','m') ORDER BY n.nspname,c.relname",
    schemas: "SELECT nspname,pg_get_userbyid(nspowner) owner,nspacl::text acl FROM pg_namespace WHERE nspname IN ('poms','r4ghi_control') ORDER BY nspname",
    columns: "SELECT n.nspname schema,c.relname table_name,a.attnum,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text acl,pg_get_expr(d.adbin,d.adrelid) default_expr FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY n.nspname,c.relname,a.attnum",
    constraints: "SELECT n.nspname schema,c.relname table_name,x.conname,pg_get_constraintdef(x.oid,true) definition FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') ORDER BY n.nspname,c.relname,x.conname",
    indexes: "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('poms','r4ghi_control') ORDER BY schemaname,tablename,indexname",
    triggers: "SELECT n.nspname schema,c.relname table_name,t.tgname,pg_get_triggerdef(t.oid,true) definition,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND NOT t.tgisinternal ORDER BY n.nspname,c.relname,t.tgname",
    functions: "SELECT n.nspname schema,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('poms','r4ghi_control') AND p.prokind='f' ORDER BY n.nspname,p.proname,arguments",
  })) normative[name] = (await c.query(`SELECT row_to_json(x)::text raw FROM (${sql}) x`)).rows.map(r => r.raw);
  const sequences = [];
  const { rows: seqs } = await c.query("SELECT n.nspname schema,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('poms','r4ghi_control') AND c.relkind='S' ORDER BY n.nspname,c.relname");
  for (const seq of seqs) sequences.push({ ...seq, ...(await c.query(`SELECT last_value::text value,is_called FROM ${quote(seq.schema)}.${quote(seq.name)}`)).rows[0] });
  return { tables, foreignKeys, normative, sequences };
}
export async function capture(ctx, label) {
  assert(/^[A-Za-z0-9_-]+$/.test(label));
  const folder = `${ctx.priv}/snapshot-${label}`; fs.mkdirSync(folder, { mode: 0o700 });
  const result = { schemaVersion: 1, label, epoch: ctx.epoch, run: ctx.run, marker: ctx.identity.marker, capturedAt: new Date().toISOString(), databases: {} };
  for (const database of ctx.databases) await ctx.db(async c => {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      const meta = await catalog(c), tables = {};
      for (const table of meta.tables) {
        const keySql = table.pk.length ? `json_build_array(${table.pk.map(p => `t.${quote(p)}::text`).join(',')})::text` : 'NULL::text';
        const needed = [...new Set([...table.pk, ...meta.foreignKeys.filter(f => f.child === table.name).flatMap(f => f.childColumns), ...meta.foreignKeys.filter(f => f.parent === table.name).flatMap(f => f.parentColumns)])];
        const cellsSql = needed.length ? `json_build_object(${needed.flatMap(p => [`'${p}'`, `t.${quote(p)}::text`]).join(',')})::text` : "'{}'::text";
        const rows = (await c.query(`SELECT row_to_json(t)::text raw,${keySql} key,${cellsSql} cells FROM poms.${quote(table.name)} t ORDER BY ${table.pk.length ? table.pk.map(p => `t.${quote(p)}`).join(',') : 'row_to_json(t)::text'}`)).rows;
        const values = rows.map(r => ({ key: r.key === null ? [`no-pk:${sha(r.raw)}`] : JSON.parse(r.key), cells: JSON.parse(r.cells), raw: r.raw, sha256: sha(r.raw) }));
        const bytes = Buffer.from(values.map(r => JSON.stringify(r)).join('\n') + (values.length ? '\n' : ''));
        const file = `${folder}/${database}-${table.name}.jsonl`; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
        tables[table.name] = { file, count: rows.length, pk: table.pk, columns: table.columns, rawBytesSha256: sha(bytes) };
      }
      result.databases[database] = { meta, tables }; await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; }
  }, database);
  const manifest = ctx.artifact(`snapshot-${label}.json`, result, { kind: 'full-120-table-private-snapshot-per-database', label, databases: ctx.databases, counts: Object.fromEntries(ctx.databases.map(db => [db, Object.values(result.databases[db].tables).reduce((n, t) => n + t.count, 0)])) });
  return { ...result, manifest };
}
export function loadSnapshot(ctx, label) {
  if (label === 'baseline') label = ctx.state.baselineLabel ?? label;
  const file = `${ctx.priv}/snapshot-${label}.json`; return JSON.parse(fs.readFileSync(file));
}
export function readRows(table) {
  const bytes = fs.readFileSync(table.file); assert.equal(sha(bytes), table.rawBytesSha256);
  return bytes.toString('utf8').split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); return row; });
}
export function difference(before, after) {
  const changes = [];
  for (const [database, a] of Object.entries(after.databases)) {
    const b = before.databases[database]; assert(b);
    assert.deepEqual(Object.keys(a.tables), Object.keys(b.tables));
    for (const table of Object.keys(a.tables)) {
      const diff = diffRows(readRows(b.tables[table]), readRows(a.tables[table]));
      if (diff.added.length || diff.changed.length || diff.missing.length) changes.push({ database, table, ...diff });
    }
  }
  return changes;
}
export function snapshotPin(snapshot) { return { label: snapshot.label, rows: Object.values(snapshot.databases).reduce((n, db) => n + Object.values(db.tables).reduce((m, t) => m + t.count, 0), 0), capturedAt: snapshot.capturedAt }; }

