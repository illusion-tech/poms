import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
const sha = value => createHash('sha256').update(value).digest('hex');
const columns = { identity_provider_config: 'encrypted_client_secret', identity_provider_oauth_grant: 'encrypted_access_token' };
const q = value => { assert(/^[a-z_]+$/.test(value)); return '"' + value + '"'; };

export class OwnedCipherFaults {
    constructor(fixture, decrypt) { this.fixture = fixture; this.decrypt = decrypt; this.entries = []; this.receipts = []; }
    assertIdentity(table, row) {
        const { j } = this.fixture;
        const owned = j.objects.find(item => item.table === table && item.id === row.id); assert(owned, 'Cipher fault requires an exact already-owned row');
        if (table === 'identity_provider_config') assert(row.id === j.providerId && row.provider === 'feishu' && row.tenant_id === j.tenant && row.client_id === j.clientId, 'Cipher fault must use the fresh dedicated run provider');
        else assert(row.identity_provider_config_id === j.providerId && j.baseUsers.includes(row.poms_user_id), 'Cipher fault grant must belong to the fresh provider and owned account');
        return owned;
    }
    marker(value, column, parent, table) {
        const entry = this.entries.find(item => item.table === table && item.id === parent?.id && item.column === column && item.faultHash === sha(value));
        if (!entry) return undefined;
        assert.equal(value, entry.faultValue); assert.throws(() => this.decrypt(value), 'A registered unreadable cipher must actually fail decryption');
        return { encrypted: true, unreadableVerified: true, faultKind: entry.faultKind, length: value.length, sha256: entry.faultHash };
    }
    async withFaults(descriptors, action) {
        assert(Array.isArray(descriptors) && descriptors.length === 2 && this.entries.length === 0);
        assert(new Set(descriptors.map(item => item.table)).size === 2);
        const fixture = this.fixture, db = fixture.client;
        for (const item of descriptors) {
            assert.equal(columns[item.table], item.column); assert(typeof item.faultValue === 'string' && item.faultValue.length > 0 && item.faultValue.length < 256);
            const rows = (await db.query(`select to_jsonb(t) as row from poms.${q(item.table)} t where id=$1`, [item.id])).rows; assert.equal(rows.length, 1);
            const row = rows[0].row, owned = this.assertIdentity(item.table, row), original = row[item.column];
            assert(typeof original === 'string'); const clear = this.decrypt(original); assert.throws(() => this.decrypt(item.faultValue));
            this.entries.push({ table: item.table, id: item.id, column: item.column, origin: owned.origin, originalCipher: original, originalHash: sha(original), originalPlaintextSha256: sha(clear), faultValue: item.faultValue, faultHash: sha(item.faultValue), faultKind: item.table === 'identity_provider_config' ? 'malformed-envelope' : 'invalid-authentication-tag', phase: 'planned', initialRowVersion: row.row_version });
        }
        fixture.j.cryptoFaults = this.entries; fixture.save(); // durable intent precedes every fault write
        try {
            await db.query('BEGIN');
            try {
                for (const entry of this.entries) {
                    const rows = (await db.query(`select to_jsonb(t) as row from poms.${q(entry.table)} t where id=$1 for update`, [entry.id])).rows; assert.equal(rows.length, 1);
                    const before = rows[0].row; this.assertIdentity(entry.table, before); assert.equal(sha(before[entry.column]), entry.originalHash);
                    const updated = await db.query(`update poms.${q(entry.table)} set ${q(entry.column)}=$2 where id=$1 returning to_jsonb(${q(entry.table)}) as row`, [entry.id, entry.faultValue]); assert.equal(updated.rowCount, 1);
                    assert(isDeepStrictEqual(updated.rows[0].row, { ...before, [entry.column]: entry.faultValue }), 'Fault setup must change only its exact cipher column');
                }
                await db.query('COMMIT');
            } catch (error) { await db.query('ROLLBACK'); throw error; }
            for (const entry of this.entries) entry.phase = 'injected'; fixture.save();
            this.receipts.push({ phase: 'injected', exactOwnedColumns: this.entries.map(({ table, id, column, origin, faultHash, faultKind, originalHash }) => ({ table, id, column, origin, faultHash, faultKind, originalHash })), durableIntentBeforeWrite: true, onlyCipherColumnsChanged: true });
            return await action();
        } finally { await this.restore(); }
    }
    async restore() {
        const fixture = this.fixture, db = fixture.client;
        await db.query('BEGIN');
        try {
            for (const entry of this.entries) {
                const rows = (await db.query(`select to_jsonb(t) as row from poms.${q(entry.table)} t where id=$1 for update`, [entry.id])).rows; assert.equal(rows.length, 1);
                const before = rows[0].row; this.assertIdentity(entry.table, before);
                assert([entry.faultHash, entry.originalHash].includes(sha(before[entry.column])), 'Unknown cipher value blocks restoration and cleanup');
                const updated = await db.query(`update poms.${q(entry.table)} set ${q(entry.column)}=$2 where id=$1 returning to_jsonb(${q(entry.table)}) as row`, [entry.id, entry.originalCipher]); assert.equal(updated.rowCount, 1);
                assert(isDeepStrictEqual(updated.rows[0].row, { ...before, [entry.column]: entry.originalCipher }), 'Restoration must retain real lastError/version/audit effects');
                assert.equal(sha(updated.rows[0].row[entry.column]), entry.originalHash); assert.equal(sha(this.decrypt(updated.rows[0].row[entry.column])), entry.originalPlaintextSha256);
            }
            await db.query('COMMIT');
        } catch (error) { await db.query('ROLLBACK'); throw error; }
        for (const entry of this.entries) entry.phase = 'restored'; fixture.save();
        this.receipts.push({ phase: 'restored', entries: this.entries.map(({ table, id, column, originalHash, originalPlaintextSha256 }) => ({ table, id, column, originalHash, originalPlaintextSha256 })), rawOriginalValuesPersistedOnlyInPrivateJournal: true, onlyCipherColumnsChanged: true, originalDecryptionVerified: true });
    }
}
