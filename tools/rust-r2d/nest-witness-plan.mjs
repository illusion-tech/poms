import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { barrierSpecs } = require('./user-query-match.cjs');
export const sourceHead = 'a22cba7360346242cb7709740b7eb954b92d1fd4';
export const g1BaselineSha256 = 'f638206dc317d6fac66cd0aed26d95255a89c94f60502558dee93cbca4b1e455';
export const planVersion = 1;

function freeze(value) {
    if (value && typeof value === 'object') { for (const entry of Object.values(value)) freeze(entry); Object.freeze(value); }
    return value;
}

const commonCapture = [
    'Full original HTTP request/status/body; never assume a desired success or repair the product.',
    'Complete SQL lifetimes and per-connection BEGIN/COMMIT/ROLLBACK, autocommit nativeDelete, query order and barrier hit/release sequence.',
    'Owned full user/role/org and all-status assignment/membership facts before/after, exact versions/timestamps and immutable audit/security history.',
    'Credential/token/session-secret state only by verified redacted digest/ownership facts; no raw secrets in reports.',
    'Source/binary/owner identities and real cleanup plus independent second0/0; observed is not Rust parity or G3 Pass.'
];

const families = [
    {
        group: 'W01', title: 'Create UUID allocation, relation shapes and no credential',
        http: ['POST /api/platform/users'],
        barriers: ['after-user-username-select', 'before-user-insert', 'before-role-assignments-insert', 'before-org-memberships-insert'],
        capture: ['Capture actual user UUID availability, insert/default order and every failure/rollback; raw entity keys/status. A missing pre-flush user UUID may prevent relation inserts; do not synthesize one.'],
        mutations: ['user-plan-adopt-snapshot', 'role-state', 'org-state'],
        variants: [
            ['create-none', 'primaryOrgUnitId:null and initialRoleIds:[]'],
            ['create-primary-only', 'one active primary org and no initial role'],
            ['create-roles-only', 'null primary and one active initial role'],
            ['create-primary-and-roles', 'one active primary and one active initial role'],
            ['create-inactive-role', 'inactive initial role; no service active-role assertion'],
            ['create-missing-role', 'missing initial role; observe original FK/UUID allocation failure'],
            ['create-duplicate-role', 'same initial role twice; observe original unique/UUID allocation failure']
        ]
    },
    {
        group: 'W02', title: 'Admin/self contact update and dirty/no-op',
        http: ['PATCH /api/platform/users/{targetUserId}', 'PATCH /api/auth/profile'],
        barriers: ['before-user-cas-update', 'before-managed-session-update', 'before-audit-insert', 'after-audit-insert'],
        capture: ['Admin versus self snapshots, changedFields insertion order, actual dirty columns and unchanged contacts retaining verification, nullable versus missing and no-op session flush.'],
        mutations: ['user-profile-state', 'session-due-state'],
        variants: [
            ['admin-empty', 'admin {}'], ['self-empty', 'self {}'],
            ['admin-unchanged', 'admin same display/contact values'], ['self-unchanged', 'self same post-trim values'],
            ['admin-verified-contacts', 'admin changes contacts initially verified=true'], ['self-verified-contacts', 'self changes contacts initially verified=true'],
            ['admin-unverified-contacts', 'admin changes contacts initially verified=false'], ['self-unverified-contacts', 'self changes contacts initially verified=false'],
            ['admin-clear-contacts', 'admin clears contacts with null'], ['self-clear-contacts', 'self clears contacts with null'],
            ['admin-avatar-overflow', 'DTO-valid URL longer than existing varchar512; observe DB boundary']
        ]
    },
    {
        group: 'W03', title: 'User enable/disable raw entity and ignored command fields',
        http: ['POST /api/platform/users/{targetUserId}:activate', 'POST /api/platform/users/{targetUserId}:deactivate'],
        barriers: ['before-user-cas-update', 'before-audit-insert'],
        capture: ['Raw entity key set/null/absence, dirty-only versions and timestamps, ignored reason/comment/expectedVersion, absence of direct bulk session writes.'],
        mutations: ['user-profile-state', 'session-due-state'],
        variants: [['activate', 'inactive to active'], ['deactivate', 'active to inactive'], ['already-active', 'activate already active'], ['already-inactive', 'deactivate already inactive'], ['self-deactivate', 'actor equals target; current request and following request distinct']]
    },
    {
        group: 'W04', title: 'Role replacement independent delete/persist/audit',
        http: ['PUT /api/platform/users/{targetUserId}/roles'],
        barriers: ['after-roles-by-ids-select', 'after-role-assignments-delete', 'before-role-assignments-insert', 'before-managed-session-update', 'before-audit-insert'],
        capture: ['All-status previous history deletion, unique/FK failure after committed nativeDelete, empty persist flush, inactive/missing precheck before deletion, response permissions=[].'],
        mutations: ['role-state', 'role-delete-owned', 'user-relation-history', 'session-due-state'],
        variants: [['roles-valid', 'valid requested roles'], ['roles-empty', '[]'], ['roles-duplicate', 'same active role twice'], ['roles-missing', 'missing role precheck'], ['roles-inactive', 'inactive role precheck'], ['roles-deleted-after-check', 'delete owned role after actual role lookup, before replacement persistence']]
    },
    {
        group: 'W05', title: 'Organization replacement and user CAS',
        http: ['PUT /api/platform/users/{targetUserId}/org-memberships'],
        barriers: ['after-orgs-list-select', 'after-org-memberships-delete', 'before-user-cas-update', 'before-org-memberships-insert', 'before-managed-session-update'],
        capture: ['Required nonnull primary, raw-string duplicate Set, all-status history delete, primary pointer/user CAS and relation insertion in later flush, committed deletion surviving rollback and permissions=[].'],
        mutations: ['org-state', 'org-delete-owned', 'user-bump-version', 'user-relation-history', 'session-due-state'],
        variants: [['org-same-primary', 'same primary with replacement secondaries'], ['org-new-primary', 'new primary plus secondaries'], ['org-duplicate', 'primary repeated as secondary'], ['org-missing', 'missing org precheck'], ['org-inactive', 'inactive org precheck'], ['org-deleted-after-check', 'delete a reference-free owned target org after active lookup'], ['org-version-after-delete', 'bump user version after nativeDelete and before later flush']]
    },
    {
        group: 'W06', title: 'Natural business/audit failure separation',
        http: ['PATCH /api/platform/users/{targetUserId}'],
        barriers: ['before-user-cas-update', 'before-audit-insert'],
        capture: ['Record whether a natural audit-only failure actually exists. Lone-surrogate and NUL are probes, not promised audit failures. Preserve business/encoding failure if earlier; no trigger/service monkey patch/forced-success adapter.'],
        mutations: ['user-profile-state'],
        variants: [['audit-lone-surrogate-probe', 'DTO-accepted lone surrogate text; witness business encoding and audit JSON separately'], ['audit-nul-control', 'DTO-accepted NUL text; witness where the actual first failure occurs']]
    },
    {
        group: 'W07', title: 'Early actor versus late target nullable hydration',
        http: ['PATCH /api/auth/profile', 'PATCH /api/platform/users/{targetUserId}'],
        barriers: ['after-user-by-id-select', 'after-roles-by-ids-select'],
        capture: ['Pause after exact bound actor auth read, mutate untouched nullable/verified/displayName/version fields, and prove whether later target lookup emits SQL. Compare first snapshot with actual later null hydration, not assumed Rust merge.'],
        mutations: ['user-profile-state', 'user-bump-version'],
        variants: [['self-null-to-value', 'self untouched contact null to nonnull between reads'], ['self-value-to-null', 'self untouched contact nonnull to null between reads'], ['other-target-control', 'actor differs from target; mutate target after actor read before target findOne']]
    },
    {
        group: 'W08', title: 'Read graph and aggregation snapshot refresh',
        http: ['GET /api/auth/profile', 'GET /api/platform/users', 'GET /api/platform/users/{targetUserId}', 'GET /api/platform/owner-reference'],
        barriers: ['after-user-by-id-select', 'after-roles-by-ids-select', 'after-users-list-select', 'after-roles-list-select', 'after-orgs-list-select', 'after-role-assignments-select', 'after-org-memberships-select', 'after-role-permissions-select'],
        capture: ['Actual SQL order/Promise.all request graph, caller/role first-read reuse, output null transitions and association refresh. All-table barriers are explicitly structural, not parameter-bound target proof.'],
        mutations: ['user-profile-state', 'role-state', 'org-state', 'user-relation-history'],
        variants: [['read-profile', 'profile after actor read, then nullable user mutation'], ['read-users', 'user list after actor read with target/caller mutation'], ['read-detail', 'detail target lookup before aggregation'], ['read-owner-reference', 'minimal owner projection after actor read'], ['read-early-role', 'mutate actor role after auth role lookup'], ['read-org-refresh', 'mutate org name/description after actual aggregation read']]
    },
    {
        group: 'W09', title: 'Native-delete and managed relation identity',
        http: ['PUT /api/platform/users/{targetUserId}/roles', 'PUT /api/platform/users/{targetUserId}/org-memberships'],
        barriers: ['after-role-assignments-delete', 'after-org-memberships-delete', 'after-role-assignments-select', 'after-org-memberships-select'],
        capture: ['New UUIDs/assignedAt/createdAt, all-status historical rows and post-delete queries, absence of resurrected managed relations, exact returned array order and permissions=[].'],
        mutations: ['user-relation-history'],
        variants: [['roles-self-history', 'self role replacement with preloaded active/inactive history'], ['roles-other-history', 'other target role replacement'], ['org-self-history', 'self org replacement with history'], ['org-other-history', 'other target org replacement']]
    },
    {
        group: 'W10', title: 'UUID path casts versus body strict string semantics',
        http: ['GET /api/platform/users/{targetUserId}', 'PATCH /api/platform/users/{targetUserId}', 'PUT /api/platform/users/{targetUserId}/roles', 'PUT /api/platform/users/{targetUserId}/org-memberships'],
        barriers: ['after-user-by-id-select', 'after-roles-by-ids-select', 'after-role-assignments-delete', 'after-org-memberships-delete'],
        capture: ['Raw request path/body spelling, DB cast versus JS equality/Map/Set, exact audit target string/previous arrays, original error priority, and no product normalization.'],
        mutations: ['user-relation-history'],
        variants: [['path-uppercase', 'uppercase canonical path UUID'], ['path-compact', 'compact path UUID'], ['path-invalid', 'invalid UUID path and competing invalid body'], ['body-role-uppercase', 'uppercase body role UUID'], ['body-org-uppercase', 'uppercase body org UUID']]
    },
    {
        group: 'W11', title: 'Lazy session disable/reactivate and next-request permissions',
        http: ['POST /api/platform/users/{targetUserId}:deactivate', 'POST /api/platform/users/{targetUserId}:activate', 'GET /api/auth/profile', 'PUT /api/platform/users/{targetUserId}/roles'],
        barriers: ['after-user-by-id-select', 'before-user-cas-update'],
        capture: ['Two independent target sessions: disable/use one/reactivate/use untouched one/reuse revoked one. No eager bulk revoke. Snapshot per-session reason/status/version and existing credential digest; current request authorization versus next-request permissions.'],
        mutations: ['independent-owned-sessions', 'user-relation-history'],
        variants: [['sessions-lazy-lifecycle', 'two-session disable/reactivate sequence plus existing password login'], ['permissions-next-request', 'self removes management role; current request completes then next management request denies']]
    },
    {
        group: 'W12', title: 'Late managed-session CAS after committed raw touch',
        http: ['PATCH /api/platform/users/{targetUserId}', 'PUT /api/platform/users/{targetUserId}/roles', 'PUT /api/platform/users/{targetUserId}/org-memberships'],
        barriers: ['after-raw-session-touch', 'before-managed-session-update'],
        capture: ['Exact targetSessionId and worker/SQL phase, raw touch completion, version mutation before managed CAS, full per-flush rollback and any earlier nativeDelete commit. Raw touch RETURNING row_version is never a managed-CAS predicate.'],
        mutations: ['session-due-state', 'session-bump-version'],
        variants: [['session-cas-dirty-user', 'dirty user flush'], ['session-cas-noop-user', 'no-op user saveAll'], ['session-cas-roles-empty', 'role delete then empty persist'], ['session-cas-org-replace', 'org delete then user/membership persist'], ['session-cas-audit-shape', 'source-witnessed first audit-only flush shape; record exact actual consumer']]
    },
    {
        group: 'W13', title: 'Uniqueness and independently committed replacement races',
        http: ['POST /api/platform/users', 'PUT /api/platform/users/{targetUserId}/roles', 'PUT /api/platform/users/{targetUserId}/org-memberships'],
        barriers: ['after-user-username-select', 'after-role-assignments-delete', 'after-org-memberships-delete', 'before-role-assignments-insert', 'before-org-memberships-insert'],
        capture: ['Both requests reach exact username precheck/deletion phase before release. Record all responses/constraints, SQL transaction outcomes and final relation sets; no assumption of serialized replace.'],
        mutations: ['user-plan-adopt-snapshot', 'user-relation-history'],
        variants: [['username-two-prechecks', 'two creates share one run-owned username'], ['roles-delete-insert-race', 'two role replacement requests after both deletes'], ['org-delete-insert-race', 'two org replacement requests after both deletes']]
    },
    {
        group: 'W14', title: 'User CAS across commands and no-op control',
        http: ['PATCH /api/platform/users/{targetUserId}', 'POST /api/platform/users/{targetUserId}:deactivate', 'PUT /api/platform/users/{targetUserId}/org-memberships'],
        barriers: ['after-user-by-id-select', 'before-user-cas-update'],
        capture: ['Prove both exact target reads/CAS statements held, response/version/audit distribution and rollback scope. A no-op may emit no user update; do not claim a reached barrier when SQL was absent.'],
        mutations: ['user-profile-state', 'user-bump-version'],
        variants: [['cas-profile-profile', 'two dirty profile updates'], ['cas-profile-toggle', 'dirty profile versus toggle'], ['cas-org-profile', 'same-primary replacement versus profile'], ['cas-noop-dirty', 'no-op versus dirty control']]
    },
    {
        group: 'W15', title: 'Ordering, status-only filters and primary fallback',
        http: ['GET /api/platform/users', 'GET /api/platform/users/{targetUserId}', 'GET /api/auth/profile', 'GET /api/platform/owner-reference'],
        barriers: ['after-users-list-select', 'after-roles-list-select', 'after-orgs-list-select', 'after-role-assignments-select', 'after-org-memberships-select'],
        capture: ['Full arrays without sorting: PG microsecond user createdAt DESC, inactive user/org inclusion, active-role filter, duplicate role names, insertion order, revokedAt on active rows, unknown membershipType and pointer fallback. Do not prove a total order for unordered queries.'],
        mutations: ['user-created-at', 'role-state', 'org-state', 'user-relation-history'],
        variants: [['order-created-ties', 'same-millisecond different-microsecond users plus exact ties'], ['filter-inactive-and-fallback', 'inactive users/roles/orgs and absent-primary pointer fallback'], ['order-relations-and-unknown', 'reordered histories, repeated role names, status-active revokedAt and unknown membershipType']]
    }
];

export const witnessCases = freeze(families.flatMap((family) => family.variants.map(([variant, scenario]) => ({
    id: `${family.group}-${variant}`, group: family.group, title: family.title, scenario,
    http: family.http, barrierKinds: family.barriers, capture: [...commonCapture, ...family.capture],
    fixtureMutations: family.mutations, expectedRuntimeResult: 'observe original behavior; no source-inferred HTTP success assertion'
}))));

export const fixtureMutationRequirements = freeze([
    { id: 'user-plan-adopt-snapshot', requirement: 'Persist unique username intent before HTTP; recover/adopt one exact UUID. Full owned-user and redacted credential/relations/session/audit snapshots; no prefix cleanup.' },
    { id: 'user-profile-state', requirement: 'Fixed allowlisted owned-user display/contact/avatar/isActive/verified/null changes only; each request states exact intended values and preserves unaffected fields. No arbitrary SQL.' },
    { id: 'user-bump-version', requirement: 'Bump exactly one owned user row_version without rewriting business fields or timestamp; snapshot actual delta.' },
    { id: 'user-created-at', requirement: 'Set exact owned-user created_at microsecond tie corpus; all target UUIDs journaled and immutable timestamps captured.' },
    { id: 'user-relation-history', requirement: 'Exact owned user/role/org IDs, all-status active/inactive/revoked rows, insertion-order corpus, primary pointer and unknown membership type. Refuse non-run dependencies.' },
    { id: 'role-state', requirement: 'Only owned role name/isActive and verified owned permission-profile switch; keep roles and permissions sources frozen.' },
    { id: 'role-delete-owned', requirement: 'Delete one journaled reference-free owned role only after incoming-FK/logical-reference guard. Do not delete a shared actor role or cascade external rows.' },
    { id: 'org-state', requirement: 'Only owned org name/description/isActive state; no product org or global tree repair.' },
    { id: 'org-delete-owned', requirement: 'Delete one reference-free owned leaf after full FK and logical-reference guard; fail closed if active use prevents safe natural FK race.' },
    { id: 'session-due-state', requirement: 'Set due/non-due on the exact owned session selected by journal user plus private token hash; never return token/hash. Respect request-local snapshot timing.' },
    { id: 'session-bump-version', requirement: 'Bump exactly the bound owned session row_version after the witnessed SQL phase, avoiding unrelated org/user locks held by paused product.' },
    { id: 'independent-owned-sessions', requirement: 'Create at least two actual login sessions for one pre-seeded owned credential-bearing target; record only redacted identity/digests and actual lifecycle facts.' }
]);

export const witnessProtocol = freeze({
    runEnvironment: 'POMS_R2D_WITNESS_RUN_ID',
    directory: 'tmp/rust-r2d/witness/<canonical-run-uuid>',
    privateMode: '0700 directory; 0600 files; no symlink at any controlled path segment',
    sqlFile: 'sql.jsonl', metadataFile: 'capture-metadata.json', activeBarrierFile: 'barrier.json',
    releaseFile: '<barrierId>.release.json',
    barrierRequiredKeys: ['formatVersion', 'runId', 'barrierId', 'caseId', 'planSha256', 'kind', 'parties', 'skipMatches'],
    targetKeys: ['targetUserId', 'targetRoleId', 'targetOrgId', 'targetSessionId', 'targetUsername', 'targetEventType'],
    targetUsername: 'Only r2d_admin_<runIdcompact>, r2d_viewer_<runIdcompact> or r2d_u000..u255_<runIdcompact>, matching root-owned fixture identities',
    partyRange: [1, 2], skipMatchRange: [0, 32], deadlineMilliseconds: 15000,
    targetlessReadBoundary: 'All-table reads have structural-full-read proof only; do not claim parameter-bound target identity. Pair with single-request control and complete owned-row snapshots.',
    outputBoundary: 'SQL shape/digest, parameter count, row counts/codes and worker PID/startTicks; no bind values or result rows. Bound targets are predeclared owned UUIDs/username only.',
    protocolSource: 'Inherited immutable R2C query-capture core plus R2D target matching and case-plan protocol; no product patch or extra SQL.'
});

export const planSha256 = createHash('sha256').update(JSON.stringify({ formatVersion: planVersion, sourceHead, g1BaselineSha256, witnessCases, fixtureMutationRequirements, witnessProtocol })).digest('hex');

export function completeWitnessPlan() { return structuredClone(witnessCases); }
export function witnessPlanManifest() {
    return { formatVersion: planVersion, sourceHead, g1BaselineSha256, planSha256, groups: families.map((family) => family.group), expectedCaseIds: witnessCases.map((entry) => entry.id) };
}

// Completeness only. The coordinator must separately validate the owner,
// original binary/source epoch, raw SQL/facts, cleanup and any later parity.
export function assertCompleteWitnessPlan(report) {
    assert.equal(report.kind, 'original-nest-observation'); assert.equal(report.backend, 'nest');
    assert.deepEqual(report.witnessPlan, witnessPlanManifest(), 'Original Nest witness must bind the complete independent frozen plan');
    assert.deepEqual(report.observations.map(({ id, group }) => ({ id, group })), witnessCases.map(({ id, group }) => ({ id, group })), 'A matching prefix or reordered/missing witness case is incomplete');
    for (const row of report.observations) assert.equal(row.result, 'observed', 'Planned/synthetic/failed/unrun observations cannot establish completeness');
    return { result: 'complete-plan-observed-only', cases: witnessCases.length, boundary: 'No owner, SQL correctness, Rust parity or G3 Pass is established by this completeness check' };
}

for (const item of witnessCases) for (const kind of item.barrierKinds) assert(Object.hasOwn(barrierSpecs, kind), `Undefined barrier ${kind}`);
