import assert from 'node:assert/strict';

// These are server-owned columns/DTO fields from the original G/H models.
// Arbitrary request, provider raw snapshot and business strings stay literal.
const dbTimes = {
    identity_provider_config: ['created_at', 'updated_at', 'secret_updated_at'],
    external_identity: ['created_at', 'updated_at', 'bound_at', 'revoked_at'],
    identity_provider_oauth_grant: ['created_at', 'updated_at', 'granted_at', 'expires_at', 'refresh_expires_at', 'revoked_at', 'last_used_at'],
    external_login_ticket: ['created_at', 'updated_at', 'expires_at', 'consumed_at'],
    external_org_source: ['created_at', 'updated_at'],
    external_department_mapping: ['created_at', 'updated_at', 'last_seen_at'],
    org_sync_run: ['created_at', 'updated_at', 'started_at', 'finished_at'],
    org_sync_diff_item: ['created_at', 'updated_at', 'applied_at'],
    org_unit: ['created_at', 'updated_at'],
    audit_log: ['occurred_at']
};
const viewTimes = new Set(['createdAt', 'updatedAt', 'boundAt', 'revokedAt', 'expiresAt', 'refreshExpiresAt', 'stateExpiresAt', 'grantedAt', 'lastUsedAt', 'checkedAt', 'searchedAt', 'startedAt', 'finishedAt', 'lastSeenAt', 'appliedAt']);
const auditTimes = new Set(['boundAt', 'consumedAt', 'expiresAt', 'grantedAt', 'refreshExpiresAt', 'revokedAt', 'stateExpiresAt', 'startedAt', 'finishedAt', 'lastSeenAt']);
export function isDynamicTimestampPath(parts) {
    if (!Array.isArray(parts)) return false;
    const p = parts.join('/');
    let m = /^cases\/\*\/(?:before|after|facts)\/([^/]+)\/\*\/([^/]+)$/.exec(p);
    if (m) return dbTimes[m[1]]?.includes(m[2]) === true;
    m = /^cases\/\*\/(?:before|after|facts)\/audit_log\/\*\/(?:before_snapshot|after_snapshot)\/([^/]+)$/.exec(p);
    if (m) return auditTimes.has(m[1]);
    if (/^cases\/\*\/(?:before|after|facts)\/audit_log\/\*\/(?:before_snapshot|after_snapshot)\/items\/\*\/lastSeenAt$/.test(p)) return true;
    if (/^cases\/\*\/(?:before|after|facts)\/org_sync_run\/\*\/result_summary_json\/(?:failedAt|diagnosticSummary\/generatedAt)$/.test(p)) return true;
    m = /^cases\/\*\/(?:response|responses\/\*)\/body\/(?:\*\/)?([^/]+)$/.exec(p);
    if (m) return viewTimes.has(m[1]);
    return /^cases\/\*\/(?:response|responses\/\*)\/body\/(?:resultSummary\/failedAt|(?:resultSummary\/)?diagnosticSummary\/generatedAt)$/.test(p);
}

export function validateIssuedLifetimes(row, sentAt, receivedAt) {
    assert(Number.isSafeInteger(sentAt) && Number.isSafeInteger(receivedAt) && sentAt <= receivedAt);
    const receipts = [];
    function within(kind, value, ttlMs, extra = {}) {
        const expiry = Date.parse(value);
        assert(Number.isSafeInteger(expiry) && sentAt + ttlMs <= expiry && expiry <= receivedAt + ttlMs, `Original ${kind} TTL must equal ${ttlMs}ms within the actual request interval`);
        receipts.push({ caseId: row.id, kind, expectedTtlMs: ttlMs, sentAt: new Date(sentAt).toISOString(), receivedAt: new Date(receivedAt).toISOString(), actualExpiresAt: value, verified: true, ...extra });
    }
    const body = row.response?.body;
    if (body && typeof body === 'object' && !Array.isArray(body) && typeof body.stateExpiresAt === 'string') {
        const state = new URL(body.authorizeUrl).searchParams.get('state');
        const payload = JSON.parse(Buffer.from(state.split('.')[0], 'base64url').toString('utf8'));
        assert.equal(payload.exp, Date.parse(body.stateExpiresAt), 'Signed state expiry and DTO expiry must be identical');
        within('OAuth state', body.stateExpiresAt, 600000, { signedPayloadExpiryMatched: true });
    }
    const priorIds = new Set((row.before?.external_login_ticket ?? []).map(item => item.id));
    for (const ticket of row.after?.external_login_ticket ?? []) if (!priorIds.has(ticket.id)) within('external login ticket', ticket.expires_at, 120000, { rowId: ticket.id });
    return receipts;
}
