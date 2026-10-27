import { createRequire } from 'node:module';
import { fail } from './fixture-guard.mjs';
import { membershipMatrix, sortTies } from './fixture-matrices.mjs';
const require = createRequire(import.meta.url);
const { orgFixtureSpec } = require('./org-fixture-spec.cjs');
const encoded = (value) => (value === null ? null : Buffer.from(value, 'utf8').toString('utf8'));
export function ownedOrgIds(journal) {
    return [...journal.accounts.map((a) => a.orgId), ...journal.orgs.filter((o) => o.orgId !== null).map((o) => o.orgId)];
}
export function ownedRoleIds(journal) {
    return journal.accounts.map((a) => a.roleId);
}
export async function adoptOrgs(client, journal, allowMissing = false) {
    for (const entry of journal.orgs) {
        // Once adopted, mutable code is never used as a lookup or ownership key.
        const result = entry.orgId === null ? await client.query('select * from poms.org_unit where code=$1 for update', [entry.initialCode]) : await client.query('select * from poms.org_unit where id=$1 for update', [entry.orgId]);
        if (!result.rows.length && (allowMissing || entry.orgId === null || entry.deleted)) continue;
        if (result.rows.length !== 1 || entry.deleted || (entry.orgId !== null && result.rows[0].id !== entry.orgId)) fail('org_fixture_ownership');
        if (entry.orgId === null) {
            const row = result.rows[0],
                spec = orgFixtureSpec(journal.runId, entry.slot);
            const parent = entry.parentSlot === null ? null : journal.orgs.find((o) => o.slot === entry.parentSlot)?.orgId;
            if (
                parent === undefined ||
                row.code !== entry.initialCode ||
                row.name !== encoded(spec.name) ||
                row.description !== encoded(spec.description) ||
                row.parent_id !== parent ||
                row.display_order !== spec.displayOrder ||
                row.is_active !== true ||
                row.created_by !== null ||
                row.updated_by !== null
            )
                fail('org_fixture_unexpected_create');
            const foreignAudit = await client.query("select count(*)::int as count from poms.audit_log where target_type='OrgUnit' and target_id=$1 and (operator_id is null or not(operator_id=any($2::uuid[])))", [
                row.id,
                journal.accounts.map((a) => a.userId)
            ]);
            if (foreignAudit.rows[0].count !== 0) fail('org_fixture_foreign_actor');
            entry.orgId = row.id;
        }
    }
}
export async function orgFixture(client, request, journal, store) {
    let entry = journal.orgs.find((o) => o.slot === request.orgSlot);
    if (request.action === 'org-plan') {
        if (entry) fail('org_fixture_already_planned');
        const spec = orgFixtureSpec(request.runId, request.orgSlot);
        const parentSlot = request.parentSlot ?? null;
        if (parentSlot !== null && !journal.orgs.some((o) => o.slot === parentSlot && o.orgId !== null && !o.deleted)) fail('org_fixture_parent_missing');
        const found = await client.query('select id from poms.org_unit where code=$1 for update', [spec.databaseCode]);
        if (found.rows.length) fail('org_fixture_preexisting');
        entry = { slot: request.orgSlot, orgId: null, initialCode: spec.databaseCode, parentSlot, deleted: false };
        journal.orgs.push(entry);
        await store.write(journal);
        return { matched: 0, changed: 0, state: 'org-planned', org: entry };
    }
    if (!entry) fail('org_fixture_not_planned');
    await adoptOrgs(client, journal);
    if (request.action === 'org-adopt') return { matched: entry.orgId && !entry.deleted ? 1 : 0, changed: 0, state: 'org-adopted', org: entry };
    if (!entry.orgId || entry.deleted) fail('org_fixture_missing');
    // Persist any newly adopted UUID before a fixture mutation changes the
    // original creation shape. Recovery must not depend on a post-COMMIT fsync.
    if (request.action !== 'org-snapshot') await store.write(journal);
    if (request.action === 'org-membership-matrix') return membershipMatrix(client, request, journal, store);
    if (request.action === 'org-sort-ties') return sortTies(client, request, journal);
    let result;
    if (request.action === 'org-bump-version') result = await client.query('update poms.org_unit set row_version=row_version+1 where id=$1', [entry.orgId]);
    else if (request.action === 'org-null-description') result = await client.query('update poms.org_unit set description=null,row_version=row_version+1 where id=$1 and description is not null', [entry.orgId]);
    else if (request.action === 'org-set-inactive' || request.action === 'org-set-active') result = await client.query('update poms.org_unit set is_active=$2,row_version=row_version+1 where id=$1', [entry.orgId, request.action === 'org-set-active']);
    else if (request.action === 'org-max-order' || request.action === 'org-negative-order')
        result = await client.query('update poms.org_unit set display_order=$2,row_version=row_version+1 where id=$1', [entry.orgId, request.action === 'org-max-order' ? 2147483647 : -2147483648]);
    else if (request.action === 'org-delete-owned-leaf') {
        // Even run-owned referencing rows make this narrow deletion inadmissible.
        const references = await client.query(
            `select (
   (select count(*) from poms.org_unit where parent_id=$1)+
   (select count(*) from poms.platform_user where primary_org_unit_id=$1)+
   (select count(*) from poms.user_org_membership where org_unit_id=$1)+
   (select count(*) from poms.customer where owner_org_id=$1)+
   (select count(*) from poms.sales_follow_up_record where owner_org_id=$1)+
   (select count(*) from poms.external_org_source where authoritative_org_unit_id=$1)+
   (select count(*) from poms.external_department_mapping where org_unit_id=$1)+
   (select count(*) from poms.org_sync_diff_item where org_unit_id=$1))::int as count`,
            [entry.orgId]
        );
        if (references.rows[0].count !== 0) fail('org_fixture_referenced_leaf');
        result = await client.query('delete from poms.org_unit where id=$1', [entry.orgId]);
        entry.deleted = true;
    } else if (request.action === 'org-snapshot') {
        const org = await client.query('select to_jsonb(o) as data from poms.org_unit o where id=$1', [entry.orgId]);
        const memberships = await client.query('select to_jsonb(m) as data from poms.user_org_membership m where org_unit_id=$1 order by assigned_at,created_at,id', [entry.orgId]);
        const children = await client.query('select to_jsonb(o) as data from poms.org_unit o where parent_id=$1 order by display_order,created_at,id', [entry.orgId]);
        return { matched: 1, changed: 0, state: 'org-snapshot', org: entry, orgSnapshot: { org: org.rows[0].data, memberships: memberships.rows.map((r) => r.data), children: children.rows.map((r) => r.data) } };
    } else fail('invalid_action');
    if (result.rowCount !== 1) fail('org_fixture_target_not_found');
    return { matched: 1, changed: 1, state: request.action };
}
