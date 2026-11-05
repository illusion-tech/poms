// Root-only READ ONLY inventory. Does not authorize or execute cleanup.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { connect, priv, win } from './db33.mjs';
const edition = process.argv[2] ?? '65'; assert(/^\d+[a-z]?$/.test(edition));
const out = win + '/tmp/rust-r4def/root/cleanup-plan' + edition;
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ident = s => { assert(/^[a-z_][a-z_0-9]*$/.test(s)); return '"' + s + '"'; };
try {
  const reports = [];
  for (const backend of ['native', 'rust']) {
    const c = await connect(backend);
    try {
      await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const baseline = JSON.parse(fs.readFileSync(priv + '/cleanup-before-' + backend + '-rows.json'));
      const catalog = JSON.parse(fs.readFileSync(win + '/tmp/rust-r4def/root/catalog25/' + backend + '-catalog.json'));
      for (const s of catalog.summary) assert.equal(hash(baseline[s.table]), s.sha256);
      const { rows: pks } = await c.query(`SELECT t.relname table_name, array_agg(a.attname::text ORDER BY u.ord) columns
        FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY u(attnum,ord)
        JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=u.attnum
        WHERE i.indisprimary AND n.nspname='poms' GROUP BY t.relname ORDER BY t.relname`);
      const { rows: fks } = await c.query(`SELECT t.relname child, r.relname parent, k.conname, k.condeferrable, k.condeferred,
        pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class t ON t.oid=k.conrelid
        JOIN pg_class r ON r.oid=k.confrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        WHERE n.nspname='poms' AND k.contype='f' ORDER BY t.relname,k.conname`);
      const { rows: triggers } = await c.query(`SELECT t.relname table_name,g.tgname,g.tgenabled,pg_get_triggerdef(g.oid) definition
        FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        WHERE n.nspname='poms' AND NOT g.tgisinternal ORDER BY t.relname,g.tgname`);
      const { rows: policies } = await c.query(`SELECT * FROM pg_policies WHERE schemaname='poms' ORDER BY tablename,policyname`);
      const { rows: acl } = await c.query(`SELECT t.relname,t.relacl::text,t.relrowsecurity,t.relforcerowsecurity
        FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='poms' AND t.relkind IN('r','p') ORDER BY t.relname`);
      const beforeByTable = {}, changes = [], summary = [];
      for (const table of Object.keys(baseline).sort()) {
        const pk = pks.find(r => r.table_name === table)?.columns; assert(pk?.length, 'Cleanup requires actual primary key: ' + table);
        const { rows } = await c.query(`SELECT to_jsonb(t) value FROM poms.${ident(table)} t ORDER BY to_jsonb(t)::text`);
        beforeByTable[table] = rows.map(r => r.value);
        const key = row => JSON.stringify(pk.map(k => row[k]));
        const old = new Map(baseline[table].map(r => [key(r), r])), now = new Map(rows.map(r => [key(r.value), r.value]));
        const added = [], modified = [], missing = [];
        for (const [k, v] of now) if (!old.has(k)) added.push(Object.fromEntries(pk.map(k => [k, v[k]])));
        else if (!isDeepStrictEqual(v, old.get(k))) modified.push({ primaryKey: Object.fromEntries(pk.map(k => [k,v[k]])), columns: [...new Set([...Object.keys(v),...Object.keys(old.get(k))])].filter(k => !isDeepStrictEqual(v[k],old.get(key(v))[k])) });
        for (const [k, v] of old) if (!now.has(k)) missing.push(Object.fromEntries(pk.map(k => [k,v[k]])));
        summary.push({ table, baselineRows: old.size, currentRows: now.size, added: added.length, modified: modified.length, missing: missing.length });
        if (added.length || modified.length || missing.length) changes.push({ table, primaryKey: pk, added, modified, missing });
      }
      await c.query('COMMIT');
      const privateFile = priv + '/cleanup-plan' + edition + '-' + backend + '.json';
      fs.writeFileSync(privateFile, JSON.stringify({ backend, currentRows: beforeByTable, baseline, changes, fks, triggers, policies, acl },null,2)+'\n',{flag:'wx',mode:0o600});
      const report = { backend, readOnly: true, cleanupExecuted: false, tables: summary.length, baselineRows: summary.reduce((n,s)=>n+s.baselineRows,0), currentRows: summary.reduce((n,s)=>n+s.currentRows,0), summary, modifiedBaseline: changes.filter(r=>r.modified.length).map(r=>({table:r.table,rows:r.modified})), missingBaseline: changes.filter(r=>r.missing.length), foreignKeys:fks, triggers, policies, aclHash:hash(acl), privateRawRetained:true };
      fs.writeFileSync(out+'/'+backend+'.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
      reports.push({backend,tables:report.tables,baselineRows:report.baselineRows,currentRows:report.currentRows,modifiedBaseline:report.modifiedBaseline,missingBaseline:report.missingBaseline.length,triggerCount:triggers.length,policyCount:policies.length});
    } finally { await c.end(); }
  }
  console.log(JSON.stringify({edition,readOnly:true,cleanupExecuted:false,reports}));
} catch (e) {
  fs.writeFileSync(priv+'/cleanup-plan'+edition+'-failure.log',e.stack??String(e),{flag:'wx',mode:0o600});
  console.error(JSON.stringify({edition,failed:true,error:e.name,privateErrorRetained:true})); process.exitCode=1;
}
