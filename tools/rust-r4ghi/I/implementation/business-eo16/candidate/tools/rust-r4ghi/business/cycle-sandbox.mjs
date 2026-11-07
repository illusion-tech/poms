// Pure-structure TEMP tables only. Root executes; the outer transaction always
// ROLLBACKs. This discovers real PG15 RESTRICT/CTE behavior, never assumes it.
import assert from 'node:assert/strict';
import { quote } from './pure.mjs';
import { capture, difference } from './snapshot.mjs';

export async function runCycleSandbox(ctx, label) {
  const before = await capture(ctx, `${label}-sandbox-before`), cases = [];
  const a = `${ctx.state.prefix}_sandbox_a`, b = `${ctx.state.prefix}_sandbox_b`, outsider = `${ctx.state.prefix}_sandbox_outside`, self = `${ctx.state.prefix}_sandbox_self`;
  const q = n => `pg_temp.${quote(n)}`;
  const setup = [
    `CREATE TEMP TABLE ${quote(a)}(id integer PRIMARY KEY,b_id integer, frozen boolean NOT NULL DEFAULT false, CHECK(NOT frozen OR b_id IS NOT NULL)) ON COMMIT DROP`,
    `CREATE TEMP TABLE ${quote(b)}(id integer PRIMARY KEY,a_id integer NOT NULL) ON COMMIT DROP`,
    `ALTER TABLE ${q(a)} ADD CONSTRAINT sandbox_a_b_restrict FOREIGN KEY(b_id) REFERENCES ${q(b)}(id) ON DELETE RESTRICT NOT DEFERRABLE`,
    `ALTER TABLE ${q(b)} ADD CONSTRAINT sandbox_b_a_restrict FOREIGN KEY(a_id) REFERENCES ${q(a)}(id) ON DELETE RESTRICT NOT DEFERRABLE`,
    `INSERT INTO ${q(a)}(id) VALUES(1)`, `INSERT INTO ${q(b)} VALUES(1,1)`, `UPDATE ${q(a)} SET b_id=1,frozen=true WHERE id=1`,
    `CREATE TEMP TABLE ${quote(outsider)}(id integer PRIMARY KEY,a_id integer NOT NULL REFERENCES ${q(a)}(id) ON DELETE RESTRICT) ON COMMIT DROP`,
    `CREATE TEMP TABLE ${quote(self)}(id integer PRIMARY KEY,parent_id integer REFERENCES ${q(self)}(id) ON DELETE RESTRICT) ON COMMIT DROP`,
    `INSERT INTO ${q(self)} VALUES(1,NULL),(2,1)`, `UPDATE ${q(self)} SET parent_id=2 WHERE id=1`,
  ];
  const statements = [
    { name: 'intertable-cycle-a-then-b-cte', outside: false, sql: `WITH da AS (DELETE FROM ${q(a)} WHERE id=1 RETURNING id), db AS (DELETE FROM ${q(b)} WHERE id=1 RETURNING id) SELECT (SELECT count(*) FROM da)::int a,(SELECT count(*) FROM db)::int b` },
    { name: 'intertable-cycle-b-then-a-cte', outside: false, sql: `WITH db AS (DELETE FROM ${q(b)} WHERE id=1 RETURNING id), da AS (DELETE FROM ${q(a)} WHERE id=1 RETURNING id) SELECT (SELECT count(*) FROM da)::int a,(SELECT count(*) FROM db)::int b` },
    { name: 'self-cycle-single-exact-delete', outside: false, self: true, sql: `DELETE FROM ${q(self)} WHERE id=ANY($1::integer[]) RETURNING id` },
    { name: 'foreign-row-protects-owned-cycle', outside: true, sql: `WITH db AS (DELETE FROM ${q(b)} WHERE id=1 RETURNING id), da AS (DELETE FROM ${q(a)} WHERE id=1 RETURNING id) SELECT (SELECT count(*) FROM da)::int a,(SELECT count(*) FROM db)::int b` },
  ];
  ctx.artifact(`${label}-sandbox-input.json`, { kind: 'prepared-TEMP-only-RESTRICT-cycle-structure', setup, statements, allRolledBack: 'to-be-observed', businessFactSQL: false });
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      for (const sql of setup) await c.query(sql);
      const beforeTables = (await c.query('SELECT n.nspname,c.relname,c.oid::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY($1::regclass[]) ORDER BY c.relname', [[q(a), q(b), q(outsider), q(self)]])).rows;
      assert.equal(beforeTables.length, 4); assert(beforeTables.every(r => r.nspname.startsWith('pg_temp_')));
      for (const [index, scenario] of statements.entries()) {
        const sp = `sandbox_case_${index}`; await c.query(`SAVEPOINT ${quote(sp)}`);
        let observed;
        try {
          if (scenario.outside) await c.query(`INSERT INTO ${q(outsider)} VALUES(9,1)`);
          const result = await c.query(scenario.sql, scenario.self ? [[1, 2]] : []);
          const remaining = (await c.query(`SELECT (SELECT count(*) FROM ${q(a)})::int a,(SELECT count(*) FROM ${q(b)})::int b,(SELECT count(*) FROM ${q(self)})::int self,(SELECT count(*) FROM ${q(outsider)})::int outsider`)).rows[0];
          observed = { name: scenario.name, sqlState: null, commandAcknowledged: true, returned: result.rows, remaining,
            exactOwnedCycleDeleted: scenario.self ? remaining.self === 0 : remaining.a === 0 && remaining.b === 0,
            foreignReferencePreserved: scenario.outside ? false : null };
        } catch (error) {
          observed = { name: scenario.name, sqlState: error.code ?? null, commandAcknowledged: false, exactOwnedCycleDeleted: false,
            foreignReferencePreserved: scenario.outside ? error.code === '23503' : null };
          ctx.artifact(`${label}-sandbox-${index}-failure.json`, { name: error.name, message: error.message, stack: error.stack, code: error.code, constraint: error.constraint });
        }
        await c.query(`ROLLBACK TO SAVEPOINT ${quote(sp)}`); await c.query(`RELEASE SAVEPOINT ${quote(sp)}`);
        const restored = (await c.query(`SELECT (SELECT count(*) FROM ${q(a)})::int a,(SELECT count(*) FROM ${q(b)})::int b,(SELECT count(*) FROM ${q(self)})::int self,(SELECT count(*) FROM ${q(outsider)})::int outsider`)).rows[0];
        assert.deepEqual(restored, { a: 1, b: 1, self: 2, outsider: 0 }); cases.push({ ...observed, originalTEMPStructureRestoredAfterCase: true });
      }
    } finally { await c.query('ROLLBACK'); }
    const remaining = (await c.query('SELECT to_regclass($1)::text a,to_regclass($2)::text b,to_regclass($3)::text outsider,to_regclass($4)::text self', [q(a), q(b), q(outsider), q(self)])).rows[0];
    assert.deepEqual(remaining, { a: null, b: null, outsider: null, self: null });
  });
  const after = await capture(ctx, `${label}-sandbox-after`); assert.equal(difference(before, after).length, 0);
  for (const database of ctx.databases) {
    assert.deepEqual(before.databases[database].meta, after.databases[database].meta); assert.deepEqual(before.objects[database], after.objects[database]);
  }
  const report = { kind: 'actual-PG15-TEMP-only-RESTRICT-cycle-sandbox', cases, allTEMPObjectsRolledBack: true, businessRowsChanged: false, catalogChanged: false,
    before: before.manifest, after: after.manifest, maintenanceStrategyAccepted: false, productAcceptance: false };
  const pin = ctx.artifact(`${label}-sandbox-result.json`, report, { kind: report.kind, cases: cases.map(({ name, sqlState, exactOwnedCycleDeleted, foreignReferencePreserved }) => ({ name, sqlState, exactOwnedCycleDeleted, foreignReferencePreserved })),
    allTEMPObjectsRolledBack: true, businessRowsChanged: false, maintenanceStrategyAccepted: false });
  ctx.state.cycleSandbox = pin; ctx.persist(); return { report: pin, cases: cases.map(({ name, sqlState, exactOwnedCycleDeleted, foreignReferencePreserved }) => ({ name, sqlState, exactOwnedCycleDeleted, foreignReferencePreserved })), maintenanceStrategyAccepted: false };
}
