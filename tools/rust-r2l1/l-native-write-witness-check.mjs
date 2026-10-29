// Instrumentation-only event-sequence simulation. This does not evaluate the
// ORM SDK, initialize ORM, connect PG or certify any real INSERT/COMMIT.
import assert from 'node:assert/strict';
import { createNativeWriteWitness, sdkSourceReport } from './l-native-write-witness.mjs';

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const em = () => {
    let transaction;
    return { value: Object.freeze({ getTransactionContext: () => transaction }), set: (value) => { transaction = value; } };
};
async function start(subscriber, owner, transaction, parent) {
    await subscriber.beforeTransactionStart({ em: owner.value, ...(parent ? { transaction: parent } : {}) });
    await subscriber.afterTransactionStart({ em: owner.value, transaction });
    owner.set(transaction);
}
async function create(subscriber, owner, number) {
    await subscriber.afterCreate({ em: owner.value, entity: Object.freeze({ id: id(number) }),
        meta: Object.freeze({ schema: 'poms', tableName: 'approval_summary_snapshot', primaryKeys: ['id'] }),
        changeSet: Object.freeze({ type: 'create' }) });
}
async function commit(subscriber, owner, transaction) {
    await subscriber.beforeTransactionCommit({ em: owner.value, transaction });
    await subscriber.afterTransactionCommit({ em: owner.value, transaction });
}
async function rollback(subscriber, owner, transaction) {
    await subscriber.beforeTransactionRollback({ em: owner.value, transaction });
    await subscriber.afterTransactionRollback({ em: owner.value, transaction });
}

const delivered = [];
const witness = createNativeWriteWitness({ onCommitted: (rows) => delivered.push(rows), context: () => ({ caseId: 'instrumentation-only' }) });
const subscriber = witness.subscriber;
const outer = em(), child = em(), rolled = em();
const root = {}, savepoint = { savepointName: 'trx1' }, rolledPoint = { savepointName: 'trx2' };
await start(subscriber, outer, root);
await create(subscriber, outer, 1);
await start(subscriber, child, savepoint, root);
await create(subscriber, child, 2);
await commit(subscriber, child, savepoint);
assert.equal(delivered.length, 0, 'savepoint release is not a commit witness');
await start(subscriber, rolled, rolledPoint, root);
await create(subscriber, rolled, 3);
await rollback(subscriber, rolled, rolledPoint);
assert.equal(delivered.length, 0);
await commit(subscriber, outer, root);
assert.deepEqual(delivered.flat().map((row) => row.id), [id(1), id(2)]);
assert.equal(delivered[0][1].proof.releases.length, 1);
assert.equal((await witness.drain()).complete, true);
witness.assertComplete();

const canceled = [];
const rolledWitness = createNativeWriteWitness({ onCommitted: (rows) => canceled.push(rows) });
const rolledOuter = em(), releasedChild = em(), outerTx = {}, childTx = { savepointName: 'trx1' };
await start(rolledWitness.subscriber, rolledOuter, outerTx);
await start(rolledWitness.subscriber, releasedChild, childTx, outerTx);
await create(rolledWitness.subscriber, releasedChild, 4);
await commit(rolledWitness.subscriber, releasedChild, childTx);
await rollback(rolledWitness.subscriber, rolledOuter, outerTx);
assert.equal(canceled.length, 0, 'outer rollback discards released child creates');
rolledWitness.assertComplete();

const unknown = [];
const unknownWitness = createNativeWriteWitness({ onCommitted: (rows) => unknown.push(rows) });
const unknownEm = em(); unknownEm.set({});
await create(unknownWitness.subscriber, unknownEm, 5);
await unknownWitness.subscriber.afterTransactionCommit({ em: unknownEm.value, transaction: {} });
assert.equal(unknown.length, 0);
assert.equal(unknownWitness.snapshot().complete, false);
assert.throws(() => unknownWitness.assertComplete());

const journalFailure = createNativeWriteWitness({ onCommitted: () => { throw new Error('controlled journal failure'); } });
const journalEm = em(), journalTx = {};
await start(journalFailure.subscriber, journalEm, journalTx);
await create(journalFailure.subscriber, journalEm, 6);
await assert.doesNotReject(() => commit(journalFailure.subscriber, journalEm, journalTx));
const failed = await journalFailure.drain();
assert.equal(failed.committed.length, 1, 'actual-event evidence survives a journal callback failure');
assert.equal(failed.complete, false, 'journal failure cannot become a safe pass');
assert(failed.diagnostics.some((item) => item.code === 'root-commit-journal-callback-failed'));

const sdk = sdkSourceReport();
assert.equal(sdk.files.length, 9);
process.stdout.write(`${JSON.stringify({ kind: 'instrumentation-only-event-simulation', result: 'Pass', sdkFiles: sdk.files.length, sdkEvaluated: false, ormInitialized: false, pgConnected: false, realCreatesCertified: 0 })}\n`);
