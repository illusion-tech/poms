// C-G3-01 increment. Root owns the fresh run, real HTTP, fault journal,
// exact cipher injection/restoration, evidence normalization and cleanup.
// This module opens no database/owner/service and runs nothing on import.
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

const REQUIRED_SCOPES = Object.freeze([
    'contact:user:search',
    'contact:contact.base:readonly',
    'contact:user.department:readonly',
    'contact:department.base:readonly',
    'contact:user.email:readonly',
    'contact:user.phone:readonly'
]);
const UNREADABLE = Object.freeze({ statusCode: 400, message: 'Identity provider secret is not readable.', error: 'Bad Request' });
const SEARCH_FAILURE = '飞书用户搜索或候选资料补全失败，请稍后重试或检查企业协同接入配置。';
const FAILURE_LOCATION = '/platform/users?identityProviderGrant=failed&reason=oauth_callback_failed';
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const objectBody = response => {
    assert(response?.body && typeof response.body === 'object' && !Array.isArray(response.body), 'G badcipher expected an actual object response');
    return response.body;
};
const rowById = (facts, table, id) => {
    assert(Array.isArray(facts[table]), 'G badcipher owned table facts are missing');
    const rows = facts[table].filter(row => row.id === id);
    assert(rows.length === 1, 'G badcipher expected exactly one admitted owned row');
    return rows[0];
};
function stateFrom(response, context, label, c) {
    const body = objectBody(response);
    assert(typeof body.authorizeUrl === 'string', 'G badcipher real authorize URL is missing');
    const url = new URL(body.authorizeUrl);
    assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '5900', 'G badcipher authorize URL escaped the controlled supplier');
    assert(url.searchParams.get('client_id') === context.clientId && url.searchParams.get('response_type') === 'code', 'G badcipher authorize URL used a different owned client or response type');
    const state = url.searchParams.get('state');
    assert(typeof state === 'string' && state.split('.').length === 2, 'G badcipher actual signed state is missing');
    assert(typeof body.stateExpiresAt === 'string' && Number.isFinite(Date.parse(body.stateExpiresAt)), 'G badcipher actual state expiry is invalid');
    c.alias(state, label);
    return state;
}
const callbackRoute = (path, state, code) => path + '?' + new URLSearchParams({ state, code });
const jsonAccept = () => ({ rawHeaders: ['Accept', 'application/json'] });
function assertUnreadable(response) {
    assert(response.status === 400 && isDeepStrictEqual(response.body, UNREADABLE), 'G badcipher must preserve the original standard 400 unreadable response');
}
function assertUnchanged(before, after) {
    // Boolean comparison avoids embedding raw cipher/state values in an
    // AssertionError message if an actual wire/PG regression is observed.
    assert(isDeepStrictEqual(after, before), 'G badcipher callback changed owned domain rows or audits');
}

/** Same actual c.request/fixture protocol as runG, plus Root's withCipherFaults. */
export async function runGBadCipher(c) {
    assert(['nest', 'rust'].includes(c.backend), 'G badcipher backend admission');
    for (const name of ['request', 'alias', 'caseNote', 'upstream', 'freshSession', 'withCipherFaults']) assert(typeof c[name] === 'function', 'G badcipher requires Root hook ' + name);
    const { fixture, context, admin } = c;
    assert(fixture && context && admin && uuid(context.runId) && uuid(context.providerId), 'G badcipher requires a fresh dedicated owned fixture');
    for (const name of ['plan', 'adopt', 'base', 'facts', 'adoptAudits']) assert(typeof fixture[name] === 'function', 'G badcipher requires OwnedFixture.' + name);
    const adminAccount = context.accounts.find(account => account.account === 'admin');
    const viewerAccount = context.accounts.find(account => account.account === 'viewer');
    assert(adminAccount && viewerAccount && uuid(adminAccount.userId) && uuid(viewerAccount.userId) && admin.userId === adminAccount.userId, 'G badcipher clients/accounts escaped the dedicated run');
    const anonymous = await c.freshSession();
    assert(anonymous && !anonymous.cookies.has('poms_session'), 'G badcipher callbacks must use a fresh anonymous client');
    const providerPath = '/api/platform/identity-providers/' + context.providerId;
    const grantPath = '/api/platform/identity-provider-oauth-grants/' + context.providerId;
    const grantIntent = 'g-badcipher-grant', bindingIntent = 'g-badcipher-binding', ticketIntent = 'g-badcipher-ticket';
    const oauthCode = 'gh-synthetic-code';
    c.alias(oauthCode, 'g.badcipher.oauth-code');
    const ids = new Set();
    async function request(id, client, method, route, options, expectedStatus) {
        const key = 'g:badcipher-' + id;
        assert(!ids.has(key), 'G badcipher case id was reused');
        ids.add(key);
        return c.request(key, client, method, route, options, expectedStatus);
    }
    async function facts() {
        // Track unexpected tickets before checking their absence, so Root can
        // preserve and clean them through the same pre-admitted intent.
        await fixture.adopt(ticketIntent);
        await fixture.adoptAudits();
        return fixture.facts();
    }
    try {
        await c.upstream({ mode: null });
        await fixture.plan(grantIntent, 'identity_provider_oauth_grant', { identity_provider_config_id: context.providerId, poms_user_id: adminAccount.userId }, 1);
        const setupState = stateFrom(await request('setup-grant-authorize', admin, 'GET', grantPath + ':authorize', jsonAccept(), 200), context, 'g.badcipher.state.admin-setup', c);
        const granted = objectBody(await request('setup-grant-callback', anonymous, 'GET', callbackRoute('/api/platform/identity-provider-oauth-grants:callback', setupState, oauthCode), jsonAccept(), 200));
        assert(granted.status === 'active' && granted.pomsUserId === adminAccount.userId && granted.identityProviderConfigId === context.providerId, 'G badcipher setup did not use the actual owned admin grant');
        assert(Array.isArray(granted.scopes) && REQUIRED_SCOPES.every(scope => granted.scopes.includes(scope)), 'G badcipher actual grant omitted required scopes');
        assert(Array.isArray(granted.requiredScopes) && REQUIRED_SCOPES.every(scope => granted.requiredScopes.includes(scope)) && granted.requiredScopes.length === REQUIRED_SCOPES.length, 'G badcipher setup required-scope contract changed');
        assert(Array.isArray(granted.missingRequiredScopes) && granted.missingRequiredScopes.length === 0, 'G badcipher setup grant cannot pass the original scope guard');
        const grants = await fixture.adopt(grantIntent);
        assert(grants.length === 1 && uuid(grants[0].id), 'G badcipher actual grant did not resolve to one pre-admitted row');
        const grant = grants[0];
        assert(grant.data.identity_provider_config_id === context.providerId && grant.data.poms_user_id === adminAccount.userId && grant.data.status === 'active' && grant.data.last_error === null, 'G badcipher persisted setup grant escaped its exact ownership/status');
        assert(Array.isArray(grant.data.scopes_json) && REQUIRED_SCOPES.every(scope => grant.data.scopes_json.includes(scope)), 'G badcipher persisted grant omitted required scopes');
        c.alias(grant.id, 'g.badcipher.grant.id');

        await fixture.plan(bindingIntent, 'external_identity', { identity_provider_config_id: context.providerId, poms_user_id: viewerAccount.userId, subject_id: context.subject }, 1);
        const bound = objectBody(await request('setup-bind', admin, 'POST', '/api/platform/users/' + viewerAccount.userId + '/external-identities', { json: { identityProviderConfigId: context.providerId, subjectId: context.subject, subjectDisplayName: 'GH badcipher controlled viewer' } }, 201));
        const bindings = await fixture.adopt(bindingIntent);
        assert(bindings.length === 1 && bindings[0].id === bound.id && uuid(bound.id) && bound.pomsUserId === viewerAccount.userId && bound.subjectId === context.subject, 'G badcipher actual binding escaped its pre-admitted identity');
        const binding = bindings[0];
        c.alias(binding.id, 'g.badcipher.binding.id');
        await fixture.plan(ticketIntent, 'external_login_ticket', { identity_provider_config_id: context.providerId, external_identity_id: binding.id, poms_user_id: viewerAccount.userId }, 1);
        assert((await fixture.adopt(ticketIntent)).length === 0, 'G badcipher dedicated run already contains a login ticket');

        const loginState = stateFrom(await request('setup-login-authorize', anonymous, 'GET', '/api/auth/identity-providers/' + context.providerId + ':authorize', jsonAccept(), 200), context, 'g.badcipher.state.login', c);
        const adminState = stateFrom(await request('setup-admin-authorize', admin, 'GET', grantPath + ':authorize', jsonAccept(), 200), context, 'g.badcipher.state.admin-callback', c);
        const providerFault = 'gh-badcipher-' + context.runId.replaceAll('-', '');
        const accessFault = 'v1:AAAAAAAAAAAAAAAA:AA==:QQ=='; // Nonempty one-byte auth tag: original Node decrypt must reject it.
        await c.withCipherFaults([
            { table: 'identity_provider_config', id: context.providerId, column: 'encrypted_client_secret', faultValue: providerFault },
            { table: 'identity_provider_oauth_grant', id: grant.id, column: 'encrypted_access_token', faultValue: accessFault }
        ], async () => {
            const before = await facts();
            const providerBefore = rowById(before, 'identity_provider_config', context.providerId);
            const grantBefore = rowById(before, 'identity_provider_oauth_grant', grant.id);
            assert(providerBefore.encrypted_client_secret === providerFault && grantBefore.encrypted_access_token === accessFault, 'G badcipher Root hook did not inject exactly its two admitted cipher columns');
            assert(providerBefore.enabled === true && providerBefore.status === 'active' && grantBefore.last_error === null && grantBefore.status === 'active' && grantBefore.last_used_at === null, 'G badcipher preconditions would hit a different original guard');

            assertUnreadable(await request('login-json', anonymous, 'GET', callbackRoute('/api/auth/identity-providers:callback', loginState, oauthCode), jsonAccept(), 400));
            const afterLogin = await facts();
            assertUnchanged(before, afterLogin);
            c.caseNote('g:badcipher-login-json', { responseStatus: 400, originalUnreadableBody: true, ownedDomainAndAuditsUnchanged: true });

            assertUnreadable(await request('admin-json', anonymous, 'GET', callbackRoute('/api/platform/identity-provider-oauth-grants:callback', adminState, oauthCode), jsonAccept(), 400));
            const afterAdmin = await facts();
            assertUnchanged(afterLogin, afterAdmin);
            c.caseNote('g:badcipher-admin-json', { responseStatus: 400, originalUnreadableBody: true, ownedDomainAndAuditsUnchanged: true });

            const html = await request('admin-html', anonymous, 'GET', callbackRoute('/api/platform/identity-provider-oauth-grants:callback', adminState, oauthCode), { rawHeaders: ['Accept', 'text/html'] }, 302);
            assert(html.location === FAILURE_LOCATION && /^text\/html\b/i.test(html.contentType), 'G badcipher browser callback lost its original failed HTML redirect');
            const afterHtml = await facts();
            assertUnchanged(afterAdmin, afterHtml);
            c.caseNote('g:badcipher-admin-html', { responseStatus: 302, originalFailedLocation: true, ownedDomainAndAuditsUnchanged: true });

            // Isolate this one real grant flush from a due managed-session CAS.
            await fixture.base('session-non-due', 'admin', { sessionToken: admin.cookies.get('poms_session') });
            assertUnreadable(await request('search-json', admin, 'GET', providerPath + '/external-users?' + new URLSearchParams({ q: 'GH badcipher controlled', limit: '1' }), jsonAccept(), 400));
            const afterSearch = await facts();
            const searchedGrant = rowById(afterSearch, 'identity_provider_oauth_grant', grant.id);
            assert(searchedGrant.last_error === SEARCH_FAILURE && searchedGrant.updated_by === adminAccount.userId, 'G badcipher search did not commit the original generic failure summary/updater');
            assert(Number.isSafeInteger(grantBefore.row_version) && searchedGrant.row_version === grantBefore.row_version + 1, 'G badcipher search failed to commit exactly one grant version');
            assert(typeof searchedGrant.updated_at === 'string' && Number.isFinite(Date.parse(searchedGrant.updated_at)), 'G badcipher search did not retain a valid persisted update time');
            const allowed = new Set(['last_error', 'updated_by', 'updated_at', 'row_version']);
            const stable = row => Object.fromEntries(Object.entries(row).filter(([key]) => !allowed.has(key)));
            assert(isDeepStrictEqual(stable(searchedGrant), stable(grantBefore)), 'G badcipher search changed grant fields outside the original failure flush');
            const otherFacts = value => ({ ...value, identity_provider_oauth_grant: value.identity_provider_oauth_grant.filter(row => row.id !== grant.id) });
            assert(isDeepStrictEqual(otherFacts(afterSearch), otherFacts(afterHtml)), 'G badcipher search created an audit/ticket or changed another owned row');
            assert(afterSearch.external_login_ticket.length === 0, 'G badcipher callbacks unexpectedly issued a login ticket');
            c.caseNote('g:badcipher-search-json', { responseStatus: 400, originalUnreadableBody: true, originalGenericLastErrorCommittedDespite400: true, ownedAdminUpdater: true, grantVersionDelta: 1, lastUsedAtUnchanged: true, newAudits: 0, ticketsIssued: 0 });
        });
        c.caseNote('g:badcipher-coverage', { finding: 'C-G3-01', negativeHttpCases: 4, setupHttpCases: ids.size - 4, actualHttpCases: ids.size, originalG16CoverageRetainedSeparately: true, actualVendorAccountCertified: false });
        return { formatVersion: 1, kind: 'RUST-R2G-badcipher-real-http-increment', negativeHttpCases: 4, setupHttpCases: ids.size - 4, actualHttpCases: ids.size, opaqueValuesReturnedOnlyInMemory: true };
    } finally {
        await c.upstream({ mode: null });
    }
}
