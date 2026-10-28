import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { OwnedCipherFaults } from './cipher-faults.mjs';
test('unreadable projection requires exact row, table, column and registered value hash', () => {
    const faults = new OwnedCipherFaults({}, () => { throw new Error('synthetic unreadable'); });
    const value = 'synthetic-malformed-envelope';
    faults.entries.push({ table: 'identity_provider_config', id: 'owned-id', column: 'encrypted_client_secret', faultHash: createHash('sha256').update(value).digest('hex'), faultValue: value, faultKind: 'malformed-envelope' });
    assert.equal(faults.marker(value, 'encrypted_client_secret', { id: 'owned-id' }, 'identity_provider_config').unreadableVerified, true);
    assert.equal(faults.marker(value, 'encrypted_client_secret', { id: 'other-id' }, 'identity_provider_config'), undefined);
    assert.equal(faults.marker(value, 'encrypted_client_secret', { id: 'owned-id' }, 'other_table'), undefined);
    assert.equal(faults.marker(value, 'encrypted_access_token', { id: 'owned-id' }, 'identity_provider_config'), undefined);
    assert.equal(faults.marker(value + 'x', 'encrypted_client_secret', { id: 'owned-id' }, 'identity_provider_config'), undefined);
    faults.decrypt = () => Buffer.from('actually-readable');
    assert.throws(() => faults.marker(value, 'encrypted_client_secret', { id: 'owned-id' }, 'identity_provider_config'));
});
