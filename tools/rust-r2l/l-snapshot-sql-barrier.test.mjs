import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySnapshotStatement } from './l-snapshot-sql-barrier.mjs';
const table = 'commission_rule_explanation_snapshot';
test('Only actual target INSERT/UPDATE starts are admitted, including original quoted SQL', () => {
    assert(classifySnapshotStatement('insert into "poms"."' + table + '" (id) values ($1)', table, 'INSERT'));
    assert(classifySnapshotStatement(' UPDATE poms.' + table + ' set status=$1', table, 'UPDATE'));
    for (const sql of ['select * from poms.' + table, 'insert into poms.' + table + '_other (id) values ($1)',
        '/* insert into poms.' + table + ' */ select 1', 'insert into other.' + table + ' (id) values ($1)',
        'update poms.commission_final_settlement_snapshot set status=$1']) {
        assert(!classifySnapshotStatement(sql, table, 'INSERT'));
        assert(!classifySnapshotStatement(sql, table, 'UPDATE'));
    }
});
