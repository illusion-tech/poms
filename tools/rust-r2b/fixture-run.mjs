import { createHash } from 'node:crypto';
import { assertOwned, cleanup, mutate, prepare } from './fixture-core.mjs';
import { fail } from './fixture-guard.mjs';
import { journalStore, plannedJournal } from './fixture-journal.mjs';
import { roleFixture } from './fixture-roles.mjs';
import { snapshot } from './fixture-snapshot.mjs';

export async function executeFixture(client, request, permissions, store = journalStore(request)) {
    const lock = createHash('sha256').update(`${request.backend}:${request.runId}`).digest().readInt32BE(0);
    // Session lock deliberately spans COMMIT and the following journal fsync.
    // A transaction lock would release too early and allow a stale final state.
    const result = await client.query('select pg_try_advisory_lock(1380074050,$1) as locked', [lock]);
    if (result.rows[0]?.locked !== true) fail('fixture_busy');
    let transaction = false;
    try {
        await client.query('BEGIN');
        transaction = true;
        await client.query("set local statement_timeout='5s'");
        let journal = store.read();
        let outcome;
        if (request.action === 'prepare') {
            if (journal?.state === 'cleaned') fail('run_already_cleaned');
            if (!journal) {
                journal = plannedJournal(request);
                await store.write(journal);
            }
            outcome = await prepare(client, request, journal, permissions);
        } else if (request.action === 'cleanup') {
            if (!journal) fail('journal_not_found');
            outcome = await cleanup(client, request, journal);
        } else {
            if (!journal || journal.state !== 'prepared') fail('fixture_not_prepared');
            if (request.action.startsWith('role-')) {
                await assertOwned(client, journal);
                outcome = await roleFixture(client, request, journal, store);
            } else outcome = request.action === 'snapshot' ? await snapshot(client, request, journal) : await mutate(client, request, journal, permissions);
        }
        await client.query('COMMIT');
        transaction = false;
        if (request.action === 'prepare' || request.action === 'cleanup') journal.state = outcome.state;
        // Persist newly adopted HTTP-created IDs under the same session lock.
        await store.write(journal);
        return outcome;
    } finally {
        if (transaction) {
            try {
                await client.query('ROLLBACK');
            } catch {
                /* caller discards connection */
            }
        }
        // The CLI always closes this dedicated connection even if unlock fails.
        await client.query('select pg_advisory_unlock(1380074050,$1)', [lock]);
    }
}
