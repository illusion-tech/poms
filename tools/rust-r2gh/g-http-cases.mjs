// Finite G16 wire acceptance for Root's already-owned runtime and fixture.
// This module opens no database/owner/service and runs nothing on import.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const OPERATIONS = Object.freeze({
    configs: 'IdentityProviderController_listIdentityProviderConfigs',
    create: 'IdentityProviderController_createIdentityProviderConfig',
    detail: 'IdentityProviderController_getIdentityProviderConfig',
    update: 'IdentityProviderController_updateIdentityProviderConfig',
    test: 'IdentityProviderController_testIdentityProviderConnection',
    search: 'IdentityProviderController_searchExternalUsers',
    bindings: 'ExternalIdentityController_listUserExternalIdentities',
    bind: 'ExternalIdentityController_bindUserExternalIdentity',
    unbind: 'ExternalIdentityController_unbindExternalIdentity',
    grant: 'IdentityProviderOAuthGrantController_getCurrentAdminProviderGrant',
    grantAuthorize: 'IdentityProviderOAuthGrantController_authorizeCurrentAdminProviderGrant',
    grantCallback: 'IdentityProviderOAuthGrantController_handleCurrentAdminProviderGrantCallback',
    publicProviders: 'AuthController_listEnabledLoginProviders',
    loginAuthorize: 'AuthController_authorizeExternalLogin',
    loginCallback: 'AuthController_handleExternalLoginCallback',
    consume: 'AuthController_createExternalLoginSession'
});
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const sha = value => createHash('sha256').update(value).digest('hex');
function missingUuid(runId) {
    const bytes = Buffer.from(sha('RUST-R2G missing row ' + runId).slice(0, 32), 'hex');
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const value = bytes.toString('hex');
    return [value.slice(0, 8), value.slice(8, 12), value.slice(12, 16), value.slice(16, 20), value.slice(20)].join('-');
}
function bodyObject(response) {
    assert(response && response.body && typeof response.body === 'object' && !Array.isArray(response.body), 'G expected an actual object response');
    return response.body;
}
function authorizeState(response, context, purpose, c) {
    const body = bodyObject(response);
    assert(typeof body.authorizeUrl === 'string', 'G authorize response omitted its real URL');
    const url = new URL(body.authorizeUrl);
    assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '5900', 'G authorize URL escaped the admitted loopback supplier');
    assert(url.searchParams.get('client_id') === context.clientId, 'G authorize URL used a different admitted client');
    assert(url.searchParams.get('response_type') === 'code', 'G authorize response type changed');
    const state = url.searchParams.get('state');
    assert(typeof state === 'string' && state.split('.').length === 2, 'G signed state was not returned by the actual service');
    c.alias(state, `g.state.${purpose}`);
    assert(Number.isFinite(Date.parse(body.stateExpiresAt)), 'G authorize state expiry was not an ISO timestamp');
    return state;
}
function callbackRoute(path, state, code) { return path + '?' + new URLSearchParams({ code, state }).toString(); }

/**
 * Required Root hooks: request/alias/caseNote/upstream/setPermissions/freshSession/lockedRace.
 * `request` returns its original response to this function; only Root's collector
 * persists redacted projections. All aliases and opaque comparisons stay in memory.
 */
export async function runG(c) {
    assert(['nest', 'rust'].includes(c.backend), 'G backend admission');
    for (const name of ['request', 'alias', 'caseNote', 'upstream', 'setPermissions', 'freshSession', 'lockedRace']) assert(typeof c[name] === 'function', 'G requires Root hook ' + name);
    assert(c.fixture && c.context && c.admin && c.viewer && c.publicSession, 'G requires a prepared Root fixture and existing clients');
    const { fixture, context, admin, viewer, publicSession } = c;
    assert(uuid(context.providerId) && typeof context.runId === 'string', 'G fixture identity admission');
    const adminAccount = context.accounts.find(account => account.account === 'admin');
    const viewerAccount = context.accounts.find(account => account.account === 'viewer');
    assert(adminAccount && viewerAccount && uuid(adminAccount.userId) && uuid(viewerAccount.userId), 'G admitted accounts missing');
    assert(admin.userId === adminAccount.userId && viewer.userId === viewerAccount.userId, 'G clients do not belong to this fixture');
    const providerPath = '/api/platform/identity-providers/' + context.providerId;
    const grantPath = '/api/platform/identity-provider-oauth-grants/' + context.providerId;
    const userBindingsPath = '/api/platform/users/' + viewerAccount.userId + '/external-identities';
    const absent = missingUuid(context.runId); c.alias(absent, 'g.missing.id');
    const ids = new Set(), successful = new Set();
    let raceHttpRequests = 0;
    async function request(id, session, method, route, options, expectedStatus, operation) {
        const caseId = 'g:' + id; assert(!ids.has(caseId), 'G case ID was reused'); ids.add(caseId);
        const response = await c.request(caseId, session, method, route, options ?? {}, expectedStatus);
        if (operation && response.status >= 200 && response.status < 300) successful.add(OPERATIONS[operation]);
        return response;
    }
    const aliasOpaque = (value, label) => { assert(typeof value === 'string' && value.length > 0, 'G opaque protocol value was missing'); c.alias(value, label); };
    const grantIntent = 'g-http-grant-admin', bindingIntent = 'g-http-binding-viewer', ticketIntent = 'g-http-tickets-first-binding';
    let originalProvider, providerMayBeDisabled = false, viewerMayBeDisabled = false, permissionsChanged = false;
    const oauthCode = 'gh-synthetic-code'; // Root's unchanged controlled-upstream plan default.
    c.alias(oauthCode, 'g.oauth.controlled-code');

    async function adoptGrant() {
        const rows = await fixture.adopt(grantIntent);
        assert(rows.length === 1 && uuid(rows[0].id), 'G grant intent did not resolve exactly one owned row');
        const row = rows[0]; c.alias(row.id, 'g.grant.admin.id');
        for (const [field, label] of [['encrypted_access_token', 'g.grant.admin.access-cipher'], ['encrypted_refresh_token', 'g.grant.admin.refresh-cipher']]) if (typeof row.data[field] === 'string') c.alias(row.data[field], label);
        return row;
    }
    async function adoptTicket(ticket, label) {
        aliasOpaque(ticket, label + '.opaque'); const hash = sha(ticket); c.alias(hash, label + '.hash');
        const rows = await fixture.adopt(ticketIntent), matched = rows.filter(row => row.data.ticket_hash === hash);
        assert(matched.length === 1 && uuid(matched[0].id), 'G issued ticket did not resolve to its pre-admitted hash row');
        c.alias(matched[0].id, label + '.id');
        return matched[0];
    }
    async function aliasCreatedSession(session, label) {
        const token = session.cookies.get('poms_session'), csrf = session.cookies.get('poms_csrf');
        aliasOpaque(token, label + '.token'); aliasOpaque(csrf, label + '.csrf');
        c.alias(sha(token), label + '.token-hash'); c.alias(sha(csrf), label + '.csrf-hash');
        const snapshot = await fixture.base('snapshot', 'viewer', { sessionToken: token });
        assert(uuid(snapshot.snapshot?.session?.id), 'G new external session was not visible through the guarded fixture');
        c.alias(snapshot.snapshot.session.id, label + '.id');
    }
    try {
        await c.upstream({ mode: null });
        await request('public-csrf', publicSession, 'GET', '/api/auth/csrf-token', {}, 200);
        const initialCsrf = publicSession.cookies.get('poms_csrf'); aliasOpaque(initialCsrf, 'g.public.csrf.initial');
        originalProvider = bodyObject(await request('config-detail', admin, 'GET', providerPath, {}, 200, 'detail'));
        assert(originalProvider.enabled === true && originalProvider.status === 'active' && originalProvider.secretConfigured === true, 'G seed provider was not active with a synthetic secret');
        await request('config-list', admin, 'GET', '/api/platform/identity-providers', {}, 200, 'configs');
        const providers = await request('public-provider-list', publicSession, 'GET', '/api/auth/identity-providers', {}, 200, 'publicProviders');
        assert(Array.isArray(providers.body) && providers.body.some(provider => provider.id === context.providerId), 'G real public list omitted its enabled fixture provider');

        const createdTenant = context.tenant + '-http-created', createdClient = context.clientId + '-http-created';
        c.alias(createdTenant, 'g.config.created.tenant'); c.alias(createdClient, 'g.config.created.client');
        await fixture.plan('g-http-config-created', 'identity_provider_config', { tenant_id: createdTenant, client_id: createdClient }, 1);
        const createBody = { provider: 'feishu', tenantId: createdTenant, displayName: ' G HTTP created ', clientId: createdClient, unknown: 'strip-this' };
        const created = bodyObject(await request('config-create', admin, 'POST', '/api/platform/identity-providers', { json: createBody }, 201, 'create'));
        assert(uuid(created.id) && created.displayName === 'G HTTP created' && created.status === 'draft', 'G original create/trim/status behavior changed');
        c.alias(created.id, 'g.config.created.id'); await fixture.adopt('g-http-config-created');
        await request('config-create-duplicate', admin, 'POST', '/api/platform/identity-providers', { json: createBody }, 409);
        const changed = bodyObject(await request('config-update', admin, 'PATCH', '/api/platform/identity-providers/' + created.id, { json: { displayName: 'G HTTP updated', expectedVersion: created.rowVersion } }, 200, 'update'));
        assert(changed.rowVersion === created.rowVersion + 1, 'G dirty config did not advance its original version');
        await request('config-version-conflict', admin, 'PATCH', '/api/platform/identity-providers/' + created.id, { json: { displayName: 'not committed', expectedVersion: 2147483647 } }, 409);
        await request('config-only-version-dto', admin, 'PATCH', providerPath, { json: { expectedVersion: 2147483647 } }, 400);
        await request('config-not-found', admin, 'GET', '/api/platform/identity-providers/' + absent, {}, 404);
        await request('config-bare-invalid-uuid-native', admin, 'GET', '/api/platform/identity-providers/not-a-uuid', {}, 500);
        await request('session-before-protected-read', publicSession, 'GET', '/api/platform/identity-providers', {}, 401);
        await request('protected-csrf-before-dto', admin, 'PATCH', providerPath, { csrf: false, json: { displayName: 42 } }, 403);
        await request('parser-before-session', publicSession, 'POST', '/api/platform/identity-providers', { body: '{', contentType: 'application/json', csrf: false }, 400);
        await request('callback-duplicate-state-dto', publicSession, 'GET', '/api/auth/identity-providers:callback?state=x&state=y&code=synthetic', {}, 400);

        permissionsChanged = true; await c.setPermissions('viewer', []);
        await request('provider-permission', viewer, 'GET', '/api/platform/identity-providers', {}, 403);
        await request('grant-permission-before-uuid-pipe', viewer, 'GET', '/api/platform/identity-provider-oauth-grants/not-a-uuid', {}, 403);
        await c.setPermissions('viewer', ['platform:users:manage']);
        await request('users-permission-grant-read', viewer, 'GET', grantPath, {}, 200, 'grant');
        await request('grant-only-explicit-uuid-pipe', viewer, 'GET', '/api/platform/identity-provider-oauth-grants/not-a-uuid', {}, 400);
        await fixture.base('permissions-default', 'viewer'); permissionsChanged = false;

        const basic = bodyObject(await request('readiness-basic', admin, 'POST', providerPath + ':testConnection', { json: { capability: 'basic' } }, 200, 'test'));
        assert(basic.capability === 'basic' && basic.status === 'success', 'G basic readiness was not the real local check');
        const directory = bodyObject(await request('readiness-directory', admin, 'POST', providerPath + ':testConnection', { json: { capability: 'external-org-sync', externalRootDepartmentId: '0' } }, 200, 'test'));
        assert(directory.capability === 'external-org-sync' && directory.status === 'success', 'G directory readiness did not traverse the real adapter');

        await fixture.plan(bindingIntent, 'external_identity', { identity_provider_config_id: context.providerId, poms_user_id: viewerAccount.userId, subject_id: context.subject }, 2);
        // Third source-bound UTF-16 representative: native text INSERT commits,
        // then the independent binding audit JSONB rejects the original surrogate.
        await request('binding-scalar-lone-audit', admin, 'POST', userBindingsPath, { json: { identityProviderConfigId: context.providerId, subjectId: context.subject, subjectDisplayName: '\ud800' } }, 500);
        let bindingRows = await fixture.adopt(bindingIntent);
        assert(bindingRows.length === 1 && bindingRows[0].data.status === 'active' && bindingRows[0].data.subject_display_name === '\ufffd', 'G binding audit failure lost the already committed text row');
        const firstBinding = bindingRows[0]; c.alias(firstBinding.id, 'g.binding.first.id');
        c.caseNote('g:utf16-binding-partial-commit', { responseStatus: 500, committedActiveBinding: true, pgReplacementObserved: true });
        await request('binding-duplicate-active', admin, 'POST', userBindingsPath, { json: { identityProviderConfigId: context.providerId, subjectId: context.subject } }, 409);

        await fixture.plan(grantIntent, 'identity_provider_oauth_grant', { identity_provider_config_id: context.providerId, poms_user_id: adminAccount.userId }, 1);
        const missingGrant = bodyObject(await request('grant-admin-missing', admin, 'GET', grantPath, {}, 200, 'grant'));
        assert(missingGrant.status === 'missing', 'G untouched admin grant was not missing');
        const grantState = authorizeState(await request('grant-authorize', admin, 'GET', grantPath + ':authorize', {}, 200, 'grantAuthorize'), context, 'admin-grant', c);
        const granted = bodyObject(await request('grant-public-callback', publicSession, 'GET', callbackRoute('/api/platform/identity-provider-oauth-grants:callback', grantState, oauthCode), {}, 200, 'grantCallback'));
        assert(granted.status === 'active' && granted.pomsUserId === adminAccount.userId, 'G signed callback did not retain its original admin');
        await adoptGrant();
        const searched = bodyObject(await request('user-search', admin, 'GET', providerPath + '/external-users?' + new URLSearchParams({ q: 'GH a+b $:[],', limit: '20' }), {}, 200, 'search'));
        assert(Array.isArray(searched.items) && searched.items.some(item => item.subjectId === context.subject && item.departmentNames.includes('GH controlled department') && item.email === 'gh-user@example.test'), 'G real search/profile/department enrichment was incomplete');
        await c.upstream({ mode: 'error-code' });
        try {
            await request('upstream-search-error', admin, 'GET', providerPath + '/external-users?q=GH&limit=20', {}, 400);
            const failedGrant = bodyObject(await request('grant-after-search-failure', admin, 'GET', grantPath, {}, 200, 'grant'));
            assert(typeof failedGrant.lastError === 'string' && failedGrant.lastError.length > 0, 'G search failure did not persist its original safe grant diagnostic');
            const failedReadiness = bodyObject(await request('upstream-readiness-failed-result', admin, 'POST', providerPath + ':testConnection', { json: { capability: 'external-org-sync' } }, 200));
            assert(failedReadiness.status === 'failed', 'G readiness supplier failure changed its original 200 diagnostic result');
        } finally { await c.upstream({ mode: null }); }
        await request('login-provider-error-before-state', publicSession, 'GET', '/api/auth/identity-providers:callback?' + new URLSearchParams({ state: 'not-verified-for-provider-error', error: 'controlled_denied', error_description: 'controlled synthetic error' }), {}, 401);
        await request('admin-provider-error-json', publicSession, 'GET', '/api/platform/identity-provider-oauth-grants:callback?' + new URLSearchParams({ state: 'not-verified-for-provider-error', error: 'controlled_denied' }), {}, 400);

        await fixture.plan(ticketIntent, 'external_login_ticket', { identity_provider_config_id: context.providerId, external_identity_id: firstBinding.id, poms_user_id: viewerAccount.userId }, 10);
        const loginState = authorizeState(await request('login-authorize', publicSession, 'GET', '/api/auth/identity-providers/' + context.providerId + ':authorize', {}, 200, 'loginAuthorize'), context, 'external-login', c);
        const issued = bodyObject(await request('login-public-callback', publicSession, 'GET', callbackRoute('/api/auth/identity-providers:callback', loginState, oauthCode), {}, 200, 'loginCallback'));
        assert(issued.pomsUserId === viewerAccount.userId, 'G actual callback did not resolve the active owned binding');
        await adoptTicket(issued.ticket, 'g.ticket.first');
        await request('public-consume-csrf', publicSession, 'POST', '/api/auth/external-login-sessions', { json: { ticket: issued.ticket }, csrf: false }, 403);
        const consumed = bodyObject(await request('ticket-consume', publicSession, 'POST', '/api/auth/external-login-sessions', { json: { ticket: issued.ticket } }, 200, 'consume'));
        assert(consumed.authenticated === true && consumed.user?.id === viewerAccount.userId, 'G external ticket did not create the existing session/profile protocol');
        await aliasCreatedSession(publicSession, 'g.external-session.first');
        await request('ticket-reconsume', publicSession, 'POST', '/api/auth/external-login-sessions', { json: { ticket: issued.ticket } }, 401);

        // Reusing the signed state is allowed by the original local contract.
        // The controlled provider admits its fixed synthetic code; this is not
        // certification of a real provider authorization-code replay.
        const disabledTicket = bodyObject(await request('login-state-local-repeat', publicSession, 'GET', callbackRoute('/api/auth/identity-providers:callback', loginState, oauthCode), {}, 200, 'loginCallback'));
        await adoptTicket(disabledTicket.ticket, 'g.ticket.disabled-user');
        viewerMayBeDisabled = true; await fixture.base('user-set-inactive', 'viewer', { userSlot: 'viewer' });
        try { await request('ticket-user-disabled-after-issue', publicSession, 'POST', '/api/auth/external-login-sessions', { json: { ticket: disabledTicket.ticket } }, 401); }
        finally { await fixture.base('user-set-active', 'viewer', { userSlot: 'viewer' }); viewerMayBeDisabled = false; }
        const ticketFacts = await fixture.facts();
        const disabledPersisted = ticketFacts.external_login_ticket.find(row => row.ticket_hash === sha(disabledTicket.ticket));
        assert(disabledPersisted?.status === 'consumed', 'G later disabled-user failure rolled back the original ticket-consumption flush');
        c.caseNote('g:ticket-disabled-user-boundary', { issuedBeforeDisable: true, responseStatus: 401, ticketStillConsumed: true });

        const raceIssued = bodyObject(await request('login-for-locked-ticket-race', publicSession, 'GET', callbackRoute('/api/auth/identity-providers:callback', loginState, oauthCode), {}, 200, 'loginCallback'));
        const raceTicket = await adoptTicket(raceIssued.ticket, 'g.ticket.race');
        const ticketRaceClients = [await c.freshSession(), await c.freshSession()];
        for (let index = 0; index < ticketRaceClients.length; index++) {
            await request('ticket-race-csrf-' + index, ticketRaceClients[index], 'GET', '/api/auth/csrf-token', {}, 200);
            aliasOpaque(ticketRaceClients[index].cookies.get('poms_csrf'), 'g.ticket-race.csrf.' + index);
        }
        const beforeTicketRace = await fixture.base('snapshot', 'viewer', { sessionToken: publicSession.cookies.get('poms_session') });
        const sessionCountBefore = beforeTicketRace.facts.auth_session.filter(row => row.user_id === viewerAccount.userId).length;
        const ticketRace = await c.lockedRace('g:ticket-consume-locked-race', 'external_login_ticket', raceTicket.id, ticketRaceClients.map(session => ({ session, method: 'POST', route: '/api/auth/external-login-sessions', options: { json: { ticket: raceIssued.ticket } } })), [200, 500]);
        assert(Array.isArray(ticketRace) && ticketRace.length === 2, 'G ticket race did not settle both actual requests');
        raceHttpRequests += ticketRace.length;
        assert.deepEqual(ticketRace.map(response => response.status).sort((a, b) => a - b), [200, 500], 'G original locked ticket race statuses changed');
        const ticketWinnerIndex = ticketRace.findIndex(response => response.status === 200);
        const ticketWinner = bodyObject(ticketRace[ticketWinnerIndex]);
        assert(ticketWinner.authenticated === true && ticketWinner.user?.id === viewerAccount.userId, 'G locked ticket winner did not use the existing session protocol');
        assert(ticketRaceClients.filter(session => session.cookies.has('poms_session')).length === 1, 'G locked ticket loser received a successful session');
        await aliasCreatedSession(ticketRaceClients[ticketWinnerIndex], 'g.external-session.race-winner');
        const afterTicketRace = await fixture.base('snapshot', 'viewer', { sessionToken: publicSession.cookies.get('poms_session') });
        const sessionCountAfter = afterTicketRace.facts.auth_session.filter(row => row.user_id === viewerAccount.userId).length;
        assert(sessionCountAfter === sessionCountBefore + 1, 'G locked ticket race persisted more than one new session');
        const ticketRaceFacts = await fixture.facts();
        const racedTicket = ticketRaceFacts.external_login_ticket.find(row => row.id === raceTicket.id);
        assert(racedTicket?.status === 'consumed' && racedTicket.row_version === raceTicket.data.row_version + 1, 'G locked ticket race changed the original single consumption/version boundary');
        c.caseNote('g:ticket-locked-race', { sortedStatuses: [200, 500], ticketConsumed: true, ticketVersionDelta: 1, newSessionCount: 1 });

        await request('binding-unbind', admin, 'POST', '/api/platform/external-identities/' + firstBinding.id + ':unbind', { json: { expectedVersion: firstBinding.data.row_version } }, 200, 'unbind');
        const rebound = bodyObject(await request('binding-rebind-new-row', admin, 'POST', userBindingsPath, { json: { identityProviderConfigId: context.providerId, subjectId: context.subject, subjectDisplayName: 'GH normal rebound' } }, 201, 'bind'));
        assert(uuid(rebound.id) && rebound.id !== firstBinding.id && rebound.rowVersion === 1, 'G rebind revived a revoked row instead of creating a new identity');
        c.alias(rebound.id, 'g.binding.second.id'); bindingRows = await fixture.adopt(bindingIntent);
        assert(bindingRows.length === 2, 'G pre-admitted two-row binding lifecycle changed');
        const history = await request('binding-list-history', admin, 'GET', userBindingsPath, {}, 200, 'bindings');
        assert(Array.isArray(history.body) && history.body.some(row => row.id === firstBinding.id && row.status === 'revoked') && history.body.some(row => row.id === rebound.id && row.status === 'active'), 'G binding list removed the original revoked history');
        c.caseNote('g:binding-history', { rows: bindingRows.length, distinctRebindId: true, revokedHistoryRetained: true });

        providerMayBeDisabled = true;
        await request('provider-disable', admin, 'PATCH', providerPath, { json: { enabled: false } }, 200, 'update');
        await request('provider-disabled-login', publicSession, 'GET', '/api/auth/identity-providers/' + context.providerId + ':authorize', {}, 400);
        await request('provider-enable-restore', admin, 'PATCH', providerPath, { json: { enabled: true } }, 200, 'update'); providerMayBeDisabled = false;
        const beforeScalar = bodyObject(await request('utf16-config-before', admin, 'GET', providerPath, {}, 200, 'detail'));
        await request('utf16-config-scalar-audit', admin, 'PATCH', providerPath, { json: { displayName: '\ud800' } }, 500);
        const afterScalar = bodyObject(await request('utf16-config-scalar-committed', admin, 'GET', providerPath, {}, 200, 'detail'));
        assert(afterScalar.displayName === '\ufffd' && afterScalar.rowVersion === beforeScalar.rowVersion + 1, 'G scalar UTF-16 audit failure did not retain its original first commit');
        c.caseNote('g:utf16-config-partial-commit', { responseStatus: 500, pgReplacementObserved: true, businessVersionAdvanced: true });
        const restored = bodyObject(await request('utf16-config-recover', admin, 'PATCH', providerPath, { json: { displayName: originalProvider.displayName } }, 200, 'update'));
        await request('utf16-config-jsonb-rejected', admin, 'PATCH', providerPath, { json: { loginScopes: ['\ud800'] } }, 500);
        const afterJsonb = bodyObject(await request('utf16-config-jsonb-rollback', admin, 'GET', providerPath, {}, 200, 'detail'));
        assert(afterJsonb.rowVersion === restored.rowVersion && JSON.stringify(afterJsonb.loginScopes) === JSON.stringify(restored.loginScopes), 'G native JSONB rejection committed an original rollback boundary');
        c.caseNote('g:utf16-config-jsonb-rollback', { responseStatus: 500, versionPreserved: true, scopeSnapshotPreserved: true });
        // Keep guard throttling outside this race: Root must observe both exact
        // provider UPDATEs waiting on its owned row lock, rather than session I/O.
        await fixture.base('session-non-due', 'admin', { sessionToken: admin.cookies.get('poms_session') });
        const raceNames = ['GH locked A ' + context.runId.slice(0, 8), 'GH locked B ' + context.runId.slice(0, 8)];
        const providerRace = await c.lockedRace('g:provider-update-locked-race', 'identity_provider_config', context.providerId, raceNames.map(displayName => ({ session: admin, method: 'PATCH', route: providerPath, options: { json: { displayName } } })), [200, 500]);
        assert(Array.isArray(providerRace) && providerRace.length === 2, 'G provider race did not settle both actual requests');
        raceHttpRequests += providerRace.length;
        assert.deepEqual(providerRace.map(response => response.status).sort((a, b) => a - b), [200, 500], 'G original locked provider race statuses changed');
        const racedProvider = bodyObject(await request('provider-race-final-state', admin, 'GET', providerPath, {}, 200, 'detail'));
        assert(racedProvider.rowVersion === afterJsonb.rowVersion + 1 && raceNames.includes(racedProvider.displayName), 'G locked provider race did not commit exactly one input/version');
        c.caseNote('g:provider-locked-race', { sortedStatuses: [200, 500], versionDelta: 1, valueMatchesOneOfTwoInputs: true });
        await request('provider-race-name-restore', admin, 'PATCH', providerPath, { json: { displayName: originalProvider.displayName } }, 200, 'update');
        const anonymous = await c.freshSession();
        await request('capture-decode-before-method-and-auth', anonymous, 'DELETE', '/api/platform/identity-providers/%FF:testConnection', {}, 400);
        // compat03 original wire rejects this malformed param before fallback.
        await request('unknown-auth-suffix-not-capture', anonymous, 'GET', '/api/auth/identity-providers/%FF', {}, 400);
        assert(successful.size === Object.keys(OPERATIONS).length && Object.values(OPERATIONS).every(operation => successful.has(operation)), 'G did not execute all sixteen original success operations');
        c.caseNote('g:operation-coverage', { count: successful.size, operations: [...successful].sort(), actualHttpCases: ids.size + raceHttpRequests, lockedRaces: 2, realVendorAccountCertified: false });
        return { formatVersion: 1, kind: 'RUST-R2G-owned-real-http-sequence', actualHttpCases: ids.size + raceHttpRequests, lockedRaces: 2, successfulOperations: [...successful].sort(), opaqueValuesReturnedOnlyInMemory: true };
    } finally {
        if (viewerMayBeDisabled) await fixture.base('user-set-active', 'viewer', { userSlot: 'viewer' });
        if (permissionsChanged) await fixture.base('permissions-default', 'viewer');
        await c.upstream({ mode: null });
        if (providerMayBeDisabled) await request('provider-finally-restore', admin, 'PATCH', providerPath, { json: { enabled: true } }, 200, 'update');
    }
}
