import assert from 'node:assert/strict';
import test from 'node:test';
import { isDynamicTimestampPath, validateIssuedLifetimes } from './timestamp-policy.mjs';
const path = text => text.split('/');
test('only original server-owned timestamp paths are projected', () => {
    for (const value of ['cases/*/response/body/createdAt', 'cases/*/responses/*/body/expiresAt', 'cases/*/before/external_login_ticket/*/expires_at', 'cases/*/after/audit_log/*/after_snapshot/stateExpiresAt', 'cases/*/facts/org_sync_run/*/result_summary_json/diagnosticSummary/generatedAt']) assert(isDynamicTimestampPath(path(value)), value);
    for (const value of ['cases/*/response/body/displayName', 'cases/*/response/body/requestSnapshot/createdAt', 'cases/*/after/org_sync_run/*/request_snapshot_json/createdAt', 'cases/*/after/external_department_mapping/*/external_snapshot_json/createdAt', 'notes/createdAt']) assert(!isDynamicTimestampPath(path(value)), value);
});
test('state lifetime is bound to the request interval and signed payload expiry', () => {
    const sent = 1800000000000, received = sent + 10, expires = sent + 600005;
    const state = Buffer.from(JSON.stringify({ exp: expires })).toString('base64url') + '.synthetic';
    const row = { id: 'state', response: { body: { authorizeUrl: 'http://127.0.0.1/authorize?state=' + state, stateExpiresAt: new Date(expires).toISOString() } } };
    assert.equal(validateIssuedLifetimes(row, sent, received).length, 1);
    assert.throws(() => validateIssuedLifetimes(row, sent + 1000, received + 1000));
    row.response.body.stateExpiresAt = new Date(expires + 1).toISOString();
    assert.throws(() => validateIssuedLifetimes(row, sent, received), /identical/);
});
test('new issued tickets have the original two-minute TTL; existing tickets are unchanged observations', () => {
    const sent = 1800000000000, received = sent + 10, ticket = { id: 'synthetic-ticket-row', expires_at: new Date(sent + 120005).toISOString() };
    const row = { id: 'ticket', before: { external_login_ticket: [] }, after: { external_login_ticket: [ticket] } };
    assert.equal(validateIssuedLifetimes(row, sent, received).length, 1);
    ticket.expires_at = new Date(sent + 600000).toISOString(); assert.throws(() => validateIssuedLifetimes(row, sent, received));
    row.before.external_login_ticket = [ticket]; assert.equal(validateIssuedLifetimes(row, sent, received).length, 0);
});
