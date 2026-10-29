import { createHash } from 'node:crypto';
import { fail } from './fixture-guard.mjs';
import { journalStore, plannedJournal } from './fixture-journal.mjs';
import { prepare, mutate } from './fixture-core.mjs';
import { cleanup } from './fixture-cleanup.mjs';
import { userFixture } from './fixture-users.mjs';
import { mutateReference } from './fixture-references.mjs';
import { facts, snapshot, userSnapshot } from './fixture-snapshot.mjs';
export async function executeFixture(client, request, permissions, store = journalStore(request)) {
    const key = createHash('sha256').update(`${request.backend}:${request.runId}`).digest().readInt32BE(0);
    const lock = await client.query('select pg_try_advisory_lock(1380074308,$1) as locked', [key]);
    if (lock.rows[0]?.locked !== true) fail('fixture_busy');
    let transaction = false;
    try {
        await client.query('BEGIN');
        transaction = true;
        await client.query("set local statement_timeout='10s'");
        let j = store.read(),
            result;
        if (request.action === 'prepare') {
            if (j?.state === 'cleaned') fail('run_already_cleaned');
            if (!j) {
                j = plannedJournal(request);
                await store.write(j);
            }
            result = await prepare(client, request, j, permissions);
        } else if (request.action === 'cleanup') {
            if (!j) fail('journal_not_found');
            result = await cleanup(client, request, j);
        } else {
            if (!j || j.state !== 'prepared') fail('fixture_not_prepared');
            // Adoption requires row locks, so only perform it in explicit adoption or
            // teardown. Snapshot/mutation while a request is paused must stay local.
            if (request.action === 'facts') result = { matched: 1, changed: 0, state: 'facts', facts: await facts(client, j), fixture: j };
            else if (request.action === 'snapshot') result = await snapshot(client, request, j);
            else if (request.action === 'user-snapshot') result = await userSnapshot(client, request, j);
            else if (request.action.startsWith('user-')) result = await userFixture(client, request, j, store);
            else if (request.action.startsWith('role-') || request.action.startsWith('org-')) result = await mutateReference(client, request, j);
            else result = await mutate(client, request, j, permissions);
        }
        await client.query('COMMIT');
        transaction = false;
        if (['prepare', 'cleanup'].includes(request.action)) j.state = result.state;
        await store.write(j);
        return result;
    } finally {
        if (transaction) {
            try {
                await client.query('ROLLBACK');
            } catch {
                /*connection is discarded*/
            }
        }
        await client.query('select pg_advisory_unlock(1380074308,$1)', [key]);
    }
}
