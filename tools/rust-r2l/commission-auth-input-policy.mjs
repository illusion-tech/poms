// Explicit prepared input, never a fake service/request clock. Natural default
// performs no query/mutation. Only Root's opt-in controlled114 uses freshness.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const commissionAuthFreshnessPolicies = Object.freeze(['natural', 'fresh-except-named-due']);
export function createCommissionAuthInputPolicy({ policy = 'natural', getFixture, ownedRow, record, sample = () => new Date().toISOString() }) {
    assert(commissionAuthFreshnessPolicies.includes(policy), 'Unknown auth freshness policy');
    assert(typeof getFixture === 'function' && typeof ownedRow === 'function' && typeof record === 'function');
    const namedDue = new WeakMap();
    const assertOnlyLastSeen = (mutation) => {
        assert(mutation && mutation.table === 'auth_session' && mutation.state === 'committed');
        assert.deepEqual(Object.keys(mutation.values), ['last_seen_at']);
    };
    return {
        policy,
        markNamedDue(session) {
            if (policy === 'natural') return;
            assert(!namedDue.has(session), 'A named due input must be consumed by its next HTTP call');
            const mutation = getFixture().j.mutations.at(-1); assertOnlyLastSeen(mutation);
            assert.equal(mutation.reason, 'Only this run actual owned session made due to observe original raw-touch plus managed coflush');
            namedDue.set(session, mutation);
        },
        async beforeCall(session, requestName) {
            if (policy === 'natural' || session.userId === null) return null;
            const fixture = getFixture(); assert(fixture && fixture.j.state === 'prepared');
            const token = session.cookies.get('poms_session'); assert(/^[A-Za-z0-9_-]{43}$/.test(token ?? ''), 'Authenticated fixture session has no actual cookie');
            const tokenHash = createHash('sha256').update(token).digest('hex');
            const result = await fixture.client.query('SELECT id::text FROM poms.auth_session WHERE token_hash=$1', [tokenHash]); assert.equal(result.rows.length, 1);
            const id = result.rows[0].id, object = fixture.j.objects.find((item) => item.table === 'auth_session' && item.id === id); assert(object?.creationProof && object.postcondition?.independentlyVisible, 'Only this run actually owned session may be prepared');
            const before = await ownedRow('auth_session', id); assert.equal(before.user_id, session.userId); assert.equal(before.token_hash, tokenHash);
            if (namedDue.has(session)) {
                const mutation = namedDue.get(session); assertOnlyLastSeen(mutation); assert.equal(mutation.id, id);
                assert.equal(new Date(before.last_seen_at).toISOString(), mutation.values.last_seen_at);
                namedDue.delete(session);
                const entry = { policy, requestName, sessionId: id, userId: session.userId, action: 'preserve-next-named-due-input', prepared: false, lastSeenInput: before.last_seen_at, mutationTransaction: mutation.transaction, expectedXmin: mutation.expectedXmin, handlerOrClockChanged: false };
                await record({ ...entry, before, mutation }, entry); return entry;
            }
            const value = sample(); assert(typeof value === 'string' && new Date(value).toISOString() === value);
            const reason = 'Controlled114 owned session freshness before ' + requestName + '; explicit prepared last_seen_at input, no service/request clock change';
            const after = await fixture.updateOwned('auth_session', id, { last_seen_at: value }, reason);
            const mutation = fixture.j.mutations.at(-1); assertOnlyLastSeen(mutation); assert(mutation.id === id && mutation.reason === reason);
            assert.equal(new Date(after.last_seen_at).toISOString(), value);
            const omit = ({ last_seen_at, ...rest }) => rest; assert.deepEqual(omit(after), omit(before), 'Freshness preparation changed another field');
            assert.deepEqual(await ownedRow('auth_session', id), after, 'Freshness COMMIT result is not independently visible');
            const entry = { policy, requestName, sessionId: id, userId: session.userId, action: 'prepared-owned-last-seen-fresh', prepared: true, sampledAt: value, lastSeenBefore: before.last_seen_at, lastSeenAfter: after.last_seen_at, unchangedRowVersion: before.row_version === after.row_version, mutationTransaction: mutation.transaction, expectedXmin: mutation.expectedXmin, handlerOrClockChanged: false };
            assert(entry.unchangedRowVersion, 'Prepared freshness may not bump row_version');
            await record({ ...entry, before, after, mutation }, entry); return entry;
        }
    };
}
