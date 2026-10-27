import { randomUUID } from 'node:crypto';
import { fail } from './fixture-guard.mjs';

function org(journal, slot) {
    const entry = journal.orgs.find((value) => value.slot === slot && !value.deleted && value.orgId !== null);
    if (!entry) fail('org_fixture_matrix_missing');
    return entry;
}

// Fixed data mutations only: every identifier is already owned by this run or
// durably journaled before the first SQL write. No caller-supplied data or SQL.
export async function membershipMatrix(client, request, journal, store) {
    if (request.orgSlot !== 'main') fail('org_fixture_matrix_slot');
    const main = org(journal, 'main'),
        child = org(journal, 'child');
    if (child.parentSlot !== 'main') fail('org_fixture_matrix_parent');
    const [admin, viewer] = journal.accounts;
    const primary = await client.query("select id from poms.user_org_membership where user_id=$1 and org_unit_id=$2 and status='active' and membership_type='primary' for update", [admin.userId, admin.orgId]);
    if (primary.rows.length !== 1) fail('org_fixture_primary_missing');
    if (journal.membershipMatrix && journal.membershipMatrix.primaryId !== primary.rows[0].id) fail('org_fixture_primary_mismatch');
    journal.membershipMatrix ??= { primaryId: primary.rows[0].id, secondaryId: randomUUID(), unknownId: randomUUID(), revokedId: randomUUID() };
    const matrix = journal.membershipMatrix;
    const existing = await client.query('select id from poms.user_org_membership where id=any($1::uuid[])', [Object.values(matrix).filter((id) => id !== matrix.primaryId)]);
    if (existing.rows.length !== 0) fail('org_fixture_matrix_preexisting');
    await store.write(journal);
    const moved = await client.query("update poms.user_org_membership set org_unit_id=$1 where id=$2 and user_id=$3 and org_unit_id=$4 and status='active' and membership_type='primary'", [main.orgId, matrix.primaryId, admin.userId, admin.orgId]);
    if (moved.rowCount !== 1) fail('org_fixture_primary_missing');
    await client.query(
        "insert into poms.user_org_membership(id,user_id,org_unit_id,membership_type,status,assigned_at,created_at,revoked_at) values ($1,$2,$3,'secondary','active','2026-01-01T00:00:00.000001Z','2026-01-01T00:00:00.000001Z','2026-01-02T00:00:00.000001Z'),($4,$5,$6,'historical-unknown','active','2026-01-01T00:00:00.000002Z','2026-01-01T00:00:00.000002Z',null),($7,$5,$3,'secondary','revoked','2026-01-01T00:00:00.000003Z','2026-01-01T00:00:00.000003Z','2026-01-02T00:00:00.000003Z')",
        [matrix.secondaryId, viewer.userId, main.orgId, matrix.unknownId, admin.userId, child.orgId, matrix.revokedId]
    );
    const disabled = await client.query('update poms.platform_user set is_active=false,row_version=row_version+1 where id=$1 and username=$2', [viewer.userId, viewer.username]);
    if (disabled.rowCount !== 1) fail('fixture_ownership');
    const memberships = await client.query('select to_jsonb(m) as data from poms.user_org_membership m where id=any($1::uuid[]) order by id', [Object.values(matrix)]);
    const users = await client.query('select to_jsonb(u) as data from poms.platform_user u where id=any($1::uuid[]) order by id', [[admin.userId, viewer.userId]]);
    return { matched: 2, changed: 5, state: 'org-membership-matrix', fixtureFacts: { memberships: memberships.rows.map((row) => row.data), users: users.rows.map((row) => row.data) } };
}

export const SORT_TIES = Object.freeze(
    [
        { slot: 'tie-a', name: '阿', createdAt: '2026-01-01T00:00:00.123900Z' },
        { slot: 'tie-b', name: '中', createdAt: '2026-01-01T00:00:00.123100Z' },
        { slot: 'tie-c', name: '国', createdAt: '2026-01-01T00:00:00.123500Z' },
        { slot: 'tie-d', name: '八', createdAt: '2026-01-01T00:00:00.123700Z' }
    ].map(Object.freeze)
);
export async function sortTies(client, request, journal) {
    if (request.orgSlot !== 'tie-a') fail('org_fixture_matrix_slot');
    const entries = SORT_TIES.map((spec) => ({ ...spec, entry: org(journal, spec.slot) }));
    if (entries.some(({ entry }) => entry.parentSlot !== null)) fail('org_fixture_matrix_parent');
    for (const { name, createdAt, entry } of entries) {
        const result = await client.query('update poms.org_unit set name=$1,display_order=77,created_at=$2::timestamptz,row_version=row_version+1 where id=$3 and parent_id is null', [name, createdAt, entry.orgId]);
        if (result.rowCount !== 1) fail('org_fixture_matrix_target');
    }
    const rows = await client.query('select to_jsonb(o) as data from poms.org_unit o where id=any($1::uuid[]) order by created_at,id', [entries.map(({ entry }) => entry.orgId)]);
    return { matched: 4, changed: 4, state: 'org-sort-ties', fixtureFacts: { organizations: rows.rows.map((row) => row.data) } };
}
