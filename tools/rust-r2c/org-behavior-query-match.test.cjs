'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { describeSql } = require('./witness-query-core.cjs');
const { matchesBehaviorBarrier } = require('./org-behavior-query-match.cjs');

// Exact redacted statement shapes observed in original run 84f42606. No bind
// values, synthetic desired SQL or unredacted token hashes are part of tests.
const rawTouch = 'update "poms"."auth_session" set "last_seen_at" = ?text, "last_ip" = coalesce(?text, "last_ip"), "idle_expires_at" = least(?text, "absolute_expires_at"), "row_version" = "row_version" + ?number, "updated_at" = ?text where "id" = ?text and "status" = ?text and "last_seen_at" <= ?text and "idle_expires_at" > ?text and "absolute_expires_at" > ?text returning "last_seen_at" as "lastSeenAt", "last_ip" as "lastIp", "idle_expires_at" as "idleExpiresAt", "row_version" as "rowVersion", "updated_at" as "updatedAt";';
const managedSession = 'update "poms"."auth_session" set "idle_expires_at" = ?text, "last_seen_at" = ?text, "updated_at" = ?text, "row_version" = "row_version" + ?number where "id" = ?text and "row_version" = ?number returning "row_version"';
const precheck = 'select "o0"."id" from "poms"."org_unit" as "o0" where (("o0"."id" = ?text and "o0"."row_version" = ?number) or ("o0"."id" = ?text and "o0"."row_version" = ?number)) order by "o0"."id" asc';
const description = (sql) => ({ ...describeSql(sql), sqlShape: sql });

test('real raw-touch statement with RETURNING row_version never matches managed session CAS', () => {
    assert.equal(matchesBehaviorBarrier('before-managed-session-update', 'before', description(rawTouch)), false);
});
test('real managed optimistic WHERE and singleton RETURNING match before send only', () => {
    assert(matchesBehaviorBarrier('before-managed-session-update', 'before', description(managedSession)));
    assert(!matchesBehaviorBarrier('before-managed-session-update', 'after', description(managedSession)));
    assert(!matchesBehaviorBarrier('before-managed-session-update', 'before', description(managedSession.replace('and "row_version" = ?number', 'and "status" = ?text'))));
    assert(!matchesBehaviorBarrier('before-managed-session-update', 'before', description(managedSession.replace('returning "row_version"', 'returning "id", "row_version"'))));
});
test('only the original unlocked ID/version precheck matches the batch window', () => {
    assert(matchesBehaviorBarrier('after-org-version-precheck', 'after', description(precheck)));
    assert(!matchesBehaviorBarrier('after-org-version-precheck', 'before', description(precheck)));
    assert(!matchesBehaviorBarrier('after-org-version-precheck', 'after', description(`${precheck} for update`)));
    assert(!matchesBehaviorBarrier('after-org-version-precheck', 'after', description(precheck.replace('"o0"."id" from', '"o0".* from'))));
    assert(!matchesBehaviorBarrier('after-org-version-precheck', 'after', description('select "o0".* from "poms"."org_unit" as "o0" order by "o0"."display_order", "o0"."created_at"')));
});
test('prepared placeholders and inherited all-org matcher retain narrow behavior', () => {
    assert(matchesBehaviorBarrier('before-managed-session-update', 'before', describeSql('update poms.auth_session set row_version=row_version+1 where id=$1 and row_version=$2 returning row_version')));
    assert(matchesBehaviorBarrier('after-org-select', 'after', describeSql('select * from poms.org_unit order by display_order,created_at')));
});
