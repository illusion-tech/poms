import assert from 'node:assert/strict';
import { ident } from './catalog-complete.mjs';
import { digest, rowKey, sameIdentity } from './fixture-core.mjs';
import { deletionGraph, scanReferences, selectId, whereIdentity } from './fixture-references.mjs';
import { assertSeedUnchanged } from './fixture-users.mjs';

export async function zero(client, journal) {
    const scan = await scanReferences(client, journal);
    assert.equal(scan.found.size, 0, 'Owned row/reference remains after cleanup');
    return { objects: 0, logicalReferences: 0, tablesScanned: scan.tablesScanned, catalog: scan.catalog };
}
export async function cleanup(fixture) {
    const { client, j } = fixture;
    assert(['prepared', 'cleanup-committed', 'cleaned'].includes(j.state));
    assert(!j.intents.some((intent) => intent.state !== 'adopted' && intent.state !== 'absent'), 'Resolve pending creation evidence before cleanup');
    assert(!j.directCreates.some((intent) => !['promoted', 'absent', 'rolled-back'].includes(intent.state)), 'Resolve unknown direct COMMIT before cleanup');
    assert(!j.mutations.some((intent) => !['committed', 'recovered-committed', 'rolled-back'].includes(intent.state)), 'Resolve mutation COMMIT outcome before cleanup');
    await client.query('begin');
    const attempt = { state: 'preflight', deleted: [], cycleBreaks: [] }; j.cleanup.push(attempt); fixture.save();
    try {
        await assertSeedUnchanged(client, j);
        const scan = await scanReferences(client, j, { lock: true });
        attempt.catalog = scan.catalog;
        const remaining = new Map(scan.found);
        while (remaining.size) {
            const graph = deletionGraph(j, remaining);
            if (graph.leaves.length) {
                for (const node of graph.leaves) {
                    const condition = whereIdentity(node.table, node.identity);
                    attempt.state = 'deleting'; fixture.save();
                    const result = await client.query('delete from poms.' + ident(node.table) + ' where ' + condition.sql + ' returning id', condition.args);
                    assert.equal(result.rowCount, 1, 'Exact identity DELETE did not remove exactly one owned row');
                    attempt.deleted.push({ table: node.table, id: node.id }); remaining.delete(rowKey(node.table, node));
                }
            } else {
                const edge = graph.breakable[0]; assert(edge, 'No reviewed nullable non-identity cycle edge');
                const node = graph.nodes.find((entry) => rowKey(entry.table, entry) === edge.source);
                const column = edge.fk.source_columns[0], oldValue = node.row[column], condition = whereIdentity(node.table, node.identity);
                const result = await client.query('update poms.' + ident(node.table) + ' set ' + ident(column) + '=null where ' + condition.sql + ' and ' + ident(column) + ' is not distinct from $' + (condition.args.length + 1) + ' returning to_jsonb(' + ident(node.table) + ') as row', [...condition.args, oldValue]);
                assert.equal(result.rowCount, 1); assert(sameIdentity(node.table, result.rows[0].row, node.identity));
                remaining.set(edge.source, result.rows[0].row); attempt.cycleBreaks.push({ table: node.table, id: node.id, column, originalValue: oldValue }); fixture.save();
            }
        }
        attempt.firstZero = await zero(client, j); await assertSeedUnchanged(client, j);
        attempt.state = 'commit-attempted'; fixture.save(); await client.query('commit');
        attempt.state = 'committed'; j.state = 'cleanup-committed'; fixture.save();
    } catch (error) {
        try { await client.query('rollback'); } catch { attempt.rollbackUnconfirmed = true; }
        if (attempt.state === 'commit-attempted') attempt.state = 'outcome-unknown';
        else if (attempt.state !== 'committed') attempt.state = 'rolled-back';
        fixture.save(); throw error;
    }
    await client.query('begin read only');
    try {
        attempt.secondZero = await zero(client, j); await assertSeedUnchanged(client, j); await client.query('rollback');
    } catch (error) { await client.query('rollback'); throw error; }
    j.state = 'cleaned'; attempt.state = 'verified-zero'; fixture.save();
    return { state: j.state, deleted: attempt.deleted.length, cycleBreaks: attempt.cycleBreaks.length, firstZero: attempt.firstZero, secondZero: attempt.secondZero, journalDigest: digest(j) };
}
