import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

// Root owns environments, sessions, actual execution, comparison and cleanup.
// This file only describes operations over one already-owned complete subtree.
export async function runH(c) {
    const { fixture, context: owned, admin, viewer } = c;
    assert(['nest', 'rust'].includes(c.backend));
    const sourcePath = '/api/platform/external-org-sources';
    const mappingPath = '/api/platform/external-department-mappings';
    const runsPath = '/api/platform/org-sync-runs';
    const compact = owned.runId.replaceAll('-', '');
    const sourceName = `GH HTTP source ${compact}`;
    const defaultViewerPermissions = ['nav:dashboard:view'];
    let source;
    const req = (id, session, method, route, options, status) => c.request(`h-${id}`, session, method, route, options ?? {}, status);
    const body = (response) => response.body;
    const aliasSource = (row, label) => { c.alias(row.id, `source:${label}`); return row; };
    const sourceFacts = async () => (await fixture.facts()).external_org_source.find((row) => row.id === source.id);
    const due = async () => {
        const token = admin.cookies.get('poms_session');
        assert.equal(typeof token, 'string');
        await fixture.base('session-due', 'admin', { sessionHash: createHash('sha256').update(token).digest('hex') });
    };
    const mappingLabel = (external, stage) => `mapping:${stage}:${external === departments.A ? 'A' : external === departments.B ? 'B' : external === departments.C ? 'C' : external}`;
    let departments = {};
    const adoptMappings = async (stage) => {
        const rows = await fixture.adopt('h-mappings');
        for (const row of rows) c.alias(row.id, mappingLabel(row.data.external_department_id, stage));
        return rows;
    };
    const preview = async (key, expectedCount) => {
        await fixture.plan(`h-run-${key}`, 'org_sync_run', { source_id: source.id }, 1);
        await fixture.planDerived(`h-diffs-${key}`, 'org_sync_diff_item', `h-run-${key}`, 'run_id', 10);
        const run = body(await req(`preview-${key}`, admin, 'POST', `${sourcePath}/${source.id}/org-sync-runs`, { json: {} }, 201));
        c.alias(run.id, `run:${key}`);
        await fixture.adopt(`h-run-${key}`);
        assert.equal(run.status, 'previewed');
        if (expectedCount !== undefined) assert.equal(run.totalItemCount, expectedCount);
        const diffs = body(await req(`diffs-${key}`, admin, 'GET', `${runsPath}/${run.id}/diff-items`, {}, 200));
        for (const item of diffs) {
            const label = Object.entries(departments).find(([, external]) => external === item.externalDepartmentId)?.[0] ?? item.externalDepartmentId;
            c.alias(item.id, `diff:${key}:${label}:${item.action}`);
            if (item.candidateSnapshot.targetCode) c.alias(item.candidateSnapshot.targetCode, `code:${label}`);
        }
        await fixture.adopt(`h-diffs-${key}`);
        return { run, diffs };
    };

    try {
        const unauthenticated = await c.freshSession();
        await req('session-required', unauthenticated, 'GET', sourcePath, {}, 401);
        await req('viewer-default-denied', viewer, 'GET', sourcePath, {}, 403);
        await c.setPermissions('viewer', ['platform:org-units:manage']);
        await req('and-only-org-units-denied', viewer, 'GET', sourcePath, {}, 403);
        await c.setPermissions('viewer', ['platform:org-sync:manage']);
        await req('and-only-org-sync-denied', viewer, 'GET', sourcePath, {}, 403);
        await c.setPermissions('viewer', ['platform:org-units:manage', 'platform:org-sync:manage']);
        await req('and-both-allowed', viewer, 'GET', sourcePath, {}, 200);
        await c.setPermissions('viewer', defaultViewerPermissions);
        c.caseNote('h-and-permissions', { onlyOrgUnits: 403, onlyOrgSync: 403, both: 200, viewerRestored: true });
        await req('csrf-before-dto', admin, 'POST', sourcePath, { csrf: false, json: {} }, 403);
        await req('create-dto-invalid', admin, 'POST', sourcePath, { json: { provider: 'future', displayName: ' ' } }, 400);

        const unsupportedTenant = `${owned.tenant}-h-unsupported`;
        await fixture.plan('h-unsupported-source', 'external_org_source', { external_tenant_id: unsupportedTenant }, 1);
        const unsupported = aliasSource(body(await req('unsupported-draft-create', admin, 'POST', sourcePath, { json: { provider: 'wecom', externalTenantId: unsupportedTenant, displayName: 'GH unsupported draft' } }, 201)), 'unsupported');
        await fixture.adopt('h-unsupported-source');
        assert.equal(unsupported.status, 'draft');
        await req('unsupported-activation-rejected', admin, 'POST', `${sourcePath}/${unsupported.id}:activate`, { json: {} }, 400);

        await fixture.plan('h-main-source', 'external_org_source', { external_tenant_id: owned.tenant, provider_config_id: owned.providerId }, 1);
        source = aliasSource(body(await req('source-create', admin, 'POST', sourcePath, { json: { provider: 'feishu', externalTenantId: owned.tenant, displayName: sourceName, providerConfigId: owned.providerId, authoritativeOrgUnitId: owned.rootId, externalRootDepartmentId: 'gh-root', syncScopes: ['controlled-departments'] } }, 201)), 'main');
        await fixture.adopt('h-main-source');
        await req('source-list', admin, 'GET', `${sourcePath}?provider=feishu&status=draft`, {}, 200);
        await req('source-detail', admin, 'GET', `${sourcePath}/${source.id}`, {}, 200);
        source = body(await req('source-update', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { displayName: `${sourceName} updated`, expectedVersion: source.rowVersion } }, 200));
        await req('source-version-conflict', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { displayName: 'rejected stale update', expectedVersion: 999 } }, 409);
        await req('source-version-only-dto', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { expectedVersion: source.rowVersion } }, 400);
        source = body(await req('source-noop-update', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { displayName: source.displayName } }, 200));
        source = body(await req('source-activate', admin, 'POST', `${sourcePath}/${source.id}:activate`, { json: { expectedVersion: source.rowVersion } }, 200));
        await req('active-source-archive-rejected', admin, 'POST', `${sourcePath}/${source.id}:archive`, { json: {} }, 400);
        await req('preview-source-version-conflict', admin, 'POST', `${sourcePath}/${source.id}/org-sync-runs`, { json: { expectedSourceVersion: 999 } }, 409);

        await c.upstream({});
        await fixture.plan('h-mappings', 'external_department_mapping', { source_id: source.id }, 10);
        // Fixed synthetic directory is two root children, one of which has a child.
        departments = { A: `gh-a-${compact}`, B: `gh-b-${compact}`, C: `gh-c-${compact}` };
        const first = await preview('initial', 3);
        assert(first.diffs.every((item) => item.action === 'create_org_unit'));
        await adoptMappings('initial');
        await req('run-history', admin, 'GET', `${sourcePath}/${source.id}/org-sync-runs?status=previewed&limit=20`, {}, 200);
        await req('run-detail', admin, 'GET', `${runsPath}/${first.run.id}`, {}, 200);
        await req('apply-version-conflict', admin, 'POST', `${runsPath}/${first.run.id}:apply`, { json: { expectedVersion: 999 } }, 409);
        const generatedIntentKeys = new Map();
        for (const [label, external] of Object.entries(departments)) {
            const item = first.diffs.find((item) => item.externalDepartmentId === external);
            assert(item?.candidateSnapshot.targetCode);
            const key = `h-generated-org-${label.toLowerCase()}`;
            await fixture.plan(key, 'org_unit', { code: item.candidateSnapshot.targetCode }, 1);
            generatedIntentKeys.set(label, key);
        }
        const applied = body(await req('apply-initial', admin, 'POST', `${runsPath}/${first.run.id}:apply`, { json: { expectedVersion: first.run.rowVersion, approvedDiffItemIds: [], skippedDiffItemIds: [] } }, 200));
        assert.equal(applied.status, 'applied');
        assert.equal(applied.approvedItemCount, 3);
        const orgs = {};
        for (const [label, key] of generatedIntentKeys) {
            const rows = await fixture.adopt(key);
            assert.equal(rows.length, 1);
            orgs[label] = rows[0].data;
            c.alias(rows[0].id, `org:${label}`);
        }
        let facts = await fixture.facts();
        const initialMappings = facts.external_department_mapping.filter((row) => row.source_id === source.id);
        const initialDiffs = facts.org_sync_diff_item.filter((row) => row.run_id === first.run.id);
        assert(initialMappings.every((row) => row.org_unit_id === null));
        assert(initialDiffs.every((row) => row.org_unit_id === null && !Object.hasOwn(row.candidate_snapshot_json, 'appliedOrgUnitId')));
        assert.equal(orgs.A.parent_id, owned.rootId);
        assert.equal(orgs.B.parent_id, owned.rootId);
        assert.equal(orgs.C.parent_id, null);
        c.caseNote('h-generated-pk-original-boundary', { generatedOrgCount: 3, mappingAndDiffOrgIdsNull: true, candidateBackfillAbsent: true, childParentNull: true });
        await req('apply-again-rejected', admin, 'POST', `${runsPath}/${first.run.id}:apply`, { json: {} }, 400);

        let mappings = body(await req('mapping-list', admin, 'GET', `${sourcePath}/${source.id}/department-mappings`, {}, 200));
        let a = mappings.find((row) => row.externalDepartmentId === departments.A);
        const b = mappings.find((row) => row.externalDepartmentId === departments.B);
        assert(a && b);
        a = body(await req('mapping-map', admin, 'POST', `${mappingPath}/${a.id}:map`, { json: { orgUnitId: orgs.A.id, expectedVersion: a.rowVersion } }, 200));
        await req('mapping-version-conflict', admin, 'POST', `${mappingPath}/${a.id}:map`, { json: { orgUnitId: orgs.A.id, expectedVersion: 999 } }, 409);
        await req('mapped-org-duplicate-rejected', admin, 'POST', `${mappingPath}/${b.id}:map`, { json: { orgUnitId: orgs.A.id, expectedVersion: b.rowVersion } }, 409);
        a = body(await req('mapping-unmap', admin, 'POST', `${mappingPath}/${a.id}:unmap`, { json: { expectedVersion: a.rowVersion } }, 200));
        a = body(await req('mapping-ignore', admin, 'POST', `${mappingPath}/${a.id}:ignore`, { json: { expectedVersion: a.rowVersion } }, 200));
        await req('ignored-unmap-rejected', admin, 'POST', `${mappingPath}/${a.id}:unmap`, { json: { expectedVersion: a.rowVersion } }, 400);
        a = body(await req('mapping-restore', admin, 'POST', `${mappingPath}/${a.id}:restore`, { json: { expectedVersion: a.rowVersion } }, 200));
        await req('mapping-remap', admin, 'POST', `${mappingPath}/${a.id}:map`, { json: { orgUnitId: orgs.A.id, expectedVersion: a.rowVersion } }, 200);
        await req('replacement-duplicate-external-rejected', admin, 'PUT', `${sourcePath}/${source.id}/department-mappings`, { json: { items: [{ externalDepartmentId: departments.A, externalDepartmentName: 'A' }, { externalDepartmentId: departments.A, externalDepartmentName: 'duplicate' }] } }, 409);
        await req('replacement-mapped-without-org-rejected', admin, 'PUT', `${sourcePath}/${source.id}/department-mappings`, { json: { items: [{ externalDepartmentId: departments.A, externalDepartmentName: 'A', status: 'mapped' }] } }, 400);
        const replacement = Object.entries(departments).map(([label, external]) => ({ externalDepartmentId: external, externalParentDepartmentId: label === 'C' ? departments.A : 'gh-root', externalDepartmentName: first.diffs.find((item) => item.externalDepartmentId === external).candidateSnapshot.targetName, orgUnitId: orgs[label].id, status: 'mapped', externalSnapshot: { controlled: true } }));
        mappings = body(await req('replacement-overlap', admin, 'PUT', `${sourcePath}/${source.id}/department-mappings`, { json: { expectedSourceVersion: source.rowVersion, items: replacement } }, 200));
        await adoptMappings('replaced');
        assert.equal(mappings.length, 3);

        const nameA = `${replacement.find((item) => item.externalDepartmentId === departments.A).externalDepartmentName} renamed`;
        const nameB = replacement.find((item) => item.externalDepartmentId === departments.B).externalDepartmentName;
        const nameC = replacement.find((item) => item.externalDepartmentId === departments.C).externalDepartmentName;
        const rootItems = [{ open_department_id: departments.A, name: nameA, parent_department_id: 'gh-root', order: 1 }, { open_department_id: departments.B, name: nameB, parent_department_id: 'gh-root', order: 2 }];
        await c.upstream({ tree: { '0': rootItems, 'gh-root': rootItems, [departments.A]: [{ open_department_id: departments.C, name: nameC, parent_department_id: departments.A, order: 3 }], [departments.B]: [], [departments.C]: [] } });
        const second = await preview('rename-move', 2);
        assert(second.diffs.some((item) => item.action === 'update_org_unit'));
        assert(second.diffs.some((item) => item.action === 'move_org_unit'));
        const secondApplied = body(await req('apply-rename-move', admin, 'POST', `${runsPath}/${second.run.id}:apply`, { json: { expectedVersion: second.run.rowVersion } }, 200));
        assert.equal(secondApplied.status, 'applied');
        facts = await fixture.facts();
        assert.equal(facts.org_unit.find((row) => row.id === orgs.A.id).name, nameA);
        assert.equal(facts.org_unit.find((row) => row.id === orgs.C.id).parent_id, orgs.A.id);

        const inactiveRootItems = [{ ...rootItems[0], status: { is_deleted: true } }, rootItems[1]];
        await c.upstream({ tree: { '0': inactiveRootItems, 'gh-root': inactiveRootItems, [departments.A]: [], [departments.B]: [] } });
        const third = await preview('disable-subtree', 2);
        assert(third.diffs.every((item) => item.action === 'disable_org_unit'));
        const thirdApplied = body(await req('apply-disable-subtree', admin, 'POST', `${runsPath}/${third.run.id}:apply`, { json: { expectedVersion: third.run.rowVersion } }, 200));
        assert.equal(thirdApplied.status, 'applied');
        facts = await fixture.facts();
        assert.equal(facts.org_unit.find((row) => row.id === orgs.A.id).is_active, false);
        assert.equal(facts.org_unit.find((row) => row.id === orgs.C.id).is_active, false);
        assert.equal(facts.org_unit.find((row) => row.id === orgs.B.id).is_active, true);
        assert.equal(facts.org_unit.find((row) => row.id === owned.rootId).is_active, true);
        c.caseNote('h-owned-recursive-disable', { ownedParentAndDescendantDisabled: true, otherOwnedSiblingActive: true, ownedAuthorityRootActive: true, sharedOrSeedOrgMutation: false });

        // Retain the exact inactive-root tree. The original source can propose
        // disable again for an already inactive mapped/missing department.
        const concurrent = await preview('concurrent-apply-empty', 2);
        c.caseNote('h-double-apply-preview-observation', { observedDiffCount: concurrent.run.totalItemCount, originalEmptyAssumptionVerified: concurrent.run.totalItemCount === 0 });
        const raceResponses = await c.lockedRace('h-double-apply', 'org_sync_run', concurrent.run.id, [
            { session: admin, method: 'POST', route: `${runsPath}/${concurrent.run.id}:apply`, options: { json: {} } },
            { session: admin, method: 'POST', route: `${runsPath}/${concurrent.run.id}:apply`, options: { json: {} } }
        ], [200, 500]);
        assert.equal(raceResponses.length, 2);
        assert.deepEqual(raceResponses.map((response) => response.status).sort((left, right) => left - right), [200, 500]);
        const afterRace = await fixture.facts();
        const raceRun = afterRace.org_sync_run.find((row) => row.id === concurrent.run.id);
        assert(raceRun);
        assert.equal(raceRun.status, 'applied');
        assert.equal(raceRun.row_version, concurrent.run.rowVersion + 2);
        const raceAudits = afterRace.audit_log.filter((row) => row.target_id === concurrent.run.id && row.event_type === 'org-sync-run.applied');
        assert.equal(raceAudits.length, 1);
        c.caseNote('h-double-apply-pg-boundary', { statuses: [200, 500], finalRunApplied: true, versionAdvancedByTwo: true, independentAppliedAuditCount: raceAudits.length, observedPreviewDiffCount: concurrent.run.totalItemCount });

        const beforeJsonb = await sourceFacts();
        await due();
        await req('jsonb-lone-surrogate-rollback', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { syncScopes: [String.fromCharCode(0xd800)] } }, 500);
        const afterJsonb = await sourceFacts();
        assert.equal(afterJsonb.row_version, beforeJsonb.row_version);
        assert.deepEqual(afterJsonb.sync_scopes_json, beforeJsonb.sync_scopes_json);
        await due();
        await req('scalar-lone-surrogate-audit-fails', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { displayName: `GH HTTP lone ${String.fromCharCode(0xd800)}` } }, 500);
        const afterScalar = await sourceFacts();
        assert.equal(afterScalar.display_name, 'GH HTTP lone \ufffd');
        assert.equal(afterScalar.row_version, beforeJsonb.row_version + 1);
        c.caseNote('h-utf16-pg-boundaries', { jsonbRequestRollback: true, scalarTextReplacementCommittedBeforeAuditFailure: true });
        source = body(await req('source-recover-readable-name', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { displayName: `${sourceName} recovered` } }, 200));

        await fixture.plan('h-run-upstream-code', 'org_sync_run', { source_id: source.id }, 1);
        await fixture.planDerived('h-diffs-upstream-code', 'org_sync_diff_item', 'h-run-upstream-code', 'run_id', 10);
        try {
            await c.upstream({ mode: 'error-code' });
            const failedRun = body(await req('upstream-error-code-failed-run', admin, 'POST', `${sourcePath}/${source.id}/org-sync-runs`, { json: {} }, 201));
            c.alias(failedRun.id, 'run:upstream-code');
            assert.equal(failedRun.status, 'failed');
            assert(failedRun.rowVersion > 1);
            const adoptedRuns = await fixture.adopt('h-run-upstream-code');
            assert.equal(adoptedRuns.length, 1);
            assert.equal(adoptedRuns[0].id, failedRun.id);
            const adoptedDiffs = await fixture.adopt('h-diffs-upstream-code');
            assert.equal(adoptedDiffs.length, 0);
            const failedFacts = await fixture.facts();
            const persistedRun = failedFacts.org_sync_run.find((row) => row.id === failedRun.id);
            assert(persistedRun);
            assert.equal(persistedRun.status, 'failed');
            assert.equal(persistedRun.row_version, failedRun.rowVersion);
            assert(persistedRun.row_version > 1);
            assert.equal(failedFacts.org_sync_diff_item.filter((row) => row.run_id === failedRun.id).length, 0);
            c.caseNote('h-upstream-code-failed-run', { httpStatus: 201, runStatus: persistedRun.status, initialRunThenFailedVersionPersisted: persistedRun.row_version > 1, diffCount: 0 });
        } finally {
            await c.upstream({});
        }

        // Observe the real original catch/flush behavior for an upstream raw
        // JSON string. Reuse B; the preview cannot create an unplanned org/code.
        const beforeRaw = await fixture.facts();
        const beforeRawB = beforeRaw.external_department_mapping.find((row) => row.source_id === source.id && row.external_department_id === departments.B);
        assert(beforeRawB);
        await fixture.plan('h-run-raw-upstream', 'org_sync_run', { source_id: source.id }, 1);
        await fixture.planDerived('h-diffs-raw-upstream', 'org_sync_diff_item', 'h-run-raw-upstream', 'run_id', 10);
        const rawB = { open_department_id: departments.B, name: nameB, parent_department_id: 'gh-root', order: 2, controlledRawUtf16: String.fromCharCode(0xd800) };
        try {
            await c.upstream({ tree: { '0': [rawB], 'gh-root': [rawB], [departments.B]: [] } });
            const rawResponse = await req('raw-upstream-jsonb-observation', admin, 'POST', `${sourcePath}/${source.id}/org-sync-runs`, { json: {} }, 500);
            const runs = await fixture.adopt('h-run-raw-upstream');
            assert.equal(runs.length, 1);
            c.alias(runs[0].id, 'run:raw-upstream');
            const rawDiffs = await fixture.adopt('h-diffs-raw-upstream');
            for (const row of rawDiffs) {
                const label = Object.entries(departments).find(([, external]) => external === row.data.external_department_id)?.[0] ?? row.data.external_department_id;
                c.alias(row.id, `diff:raw-upstream:${label}:${row.data.action}`);
            }
            await fixture.adopt('h-mappings');
            const afterRaw = await fixture.facts();
            const rawRun = afterRaw.org_sync_run.find((row) => row.id === runs[0].id);
            const rawMappingB = afterRaw.external_department_mapping.find((row) => row.id === beforeRawB.id);
            assert(rawRun && rawMappingB);
            c.caseNote('h-raw-upstream-pg-observation', {
                responseStatus: rawResponse.status,
                runStatus: rawRun.status,
                initialRunPersisted: true,
                runPersistedDespiteHttpFailure: rawResponse.status >= 400,
                laterRunVersionPersisted: rawRun.row_version > 1,
                anyDiffPersisted: rawDiffs.length > 0,
                mappingSnapshotChanged: JSON.stringify(rawMappingB.external_snapshot_json) !== JSON.stringify(beforeRawB.external_snapshot_json),
                upstreamRawFieldPersisted: Object.hasOwn(rawMappingB.external_snapshot_json, 'controlledRawUtf16'),
                originalStatusFreezePending: false
            });
        } finally {
            await c.upstream({});
        }

        source = body(await req('source-pause', admin, 'POST', `${sourcePath}/${source.id}:pause`, { json: { expectedVersion: source.rowVersion } }, 200));
        await req('source-pause-again-rejected', admin, 'POST', `${sourcePath}/${source.id}:pause`, { json: {} }, 400);
        source = body(await req('source-reactivate', admin, 'POST', `${sourcePath}/${source.id}:activate`, { json: {} }, 200));
        source = body(await req('source-final-pause', admin, 'POST', `${sourcePath}/${source.id}:pause`, { json: {} }, 200));
        source = body(await req('source-archive', admin, 'POST', `${sourcePath}/${source.id}:archive`, { json: { expectedVersion: source.rowVersion } }, 200));
        await req('source-archive-idempotent', admin, 'POST', `${sourcePath}/${source.id}:archive`, { json: {} }, 200);
        await req('source-archived-update-rejected', admin, 'PATCH', `${sourcePath}/${source.id}`, { json: { displayName: 'rejected archived mutation' } }, 400);
        await req('source-archived-replacement-rejected', admin, 'PUT', `${sourcePath}/${source.id}/department-mappings`, { json: { items: [] } }, 400);

        await req('source-malformed-uuid-native-error', admin, 'GET', `${sourcePath}/not-a-uuid`, {}, 500);
        const missing = randomUUID();
        c.alias(missing, 'missing:h-source');
        await req('source-missing', admin, 'GET', `${sourcePath}/${missing}`, {}, 404);
        await req('matched-invalid-path-capture', admin, 'GET', `${sourcePath}/%ZZ`, {}, 400);
        // compat01 original Nest and Rust both returned the original 400 body
        // "Failed to decode param '%ZZ'" for this otherwise unknown subpath.
        await req('unmatched-invalid-capture-subpath', admin, 'GET', `${sourcePath}/%ZZ/unknown`, {}, 400);
        // The original compat03 double-slash observation is also 400.
        const doubleSlash = await req('unmatched-invalid-capture-double-slash', admin, 'GET', `${sourcePath}/%ZZ//`, {}, 400);
        c.caseNote('h-invalid-capture-double-slash-observation', { observedStatus: doubleSlash.status, originalStatusFreezePending: false });
    } finally {
        await c.setPermissions('viewer', defaultViewerPermissions);
        await c.upstream({});
    }
}
