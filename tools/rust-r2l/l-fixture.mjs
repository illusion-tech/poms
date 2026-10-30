// SOURCE-only until C reviews this module and Root explicitly invokes it.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseFor, marker, validateSource } from './fixture-guard.mjs';
import { ident } from './catalog-complete.mjs';
import { assertCreationProof, caseIdentity, digest, identities, insertParameters, normalize, rowIdentity, sameIdentity, supportedTables, unsupportedTables, uuid, SEED_ACTORS } from './fixture-core.mjs';
import { plannedJournal, journalStore, validateJournal } from './fixture-journal.mjs';
import { assertCaseScope, assertNotBorrowed, assertRowReferences, resolveOwnedProjectIds, scanReferences, selectId, whereIdentity } from './fixture-references.mjs';
import { plannedBase, baseRows, viewerPermissionPlan, readCanonicalDefinitions, readSeedPrincipals, assertSeedUnchanged } from './fixture-users.mjs';
import { validateCommissionPreparedPlan, verifyPreparedPhysicalDefaults } from './fixture-prepared.mjs';
import { cleanup } from './fixture-cleanup.mjs';
import { fixtureProfile } from './fixture-core.mjs';
import { creationEnvelope, salesAnchorOptions, bindSalesProjectCustomers, validateSalesAnchorScope, assertProfileCertificateEnvelope, assertTodo42SalesScope, assertTodo42CandidateSalesClosure, assertPreparedSalesOnly } from './l-todo-profile-candidate.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const copy = (value) => structuredClone(value);

export class LFixture {
    static async open(backend, runId) {
        const { databaseClient, privateRoot } = await import('./database-client.mjs');
        const client = await databaseClient(backend);
        return new LFixture(client, backend, runId, { store: journalStore(backend, runId, privateRoot) });
    }
    constructor(client, backend, runId, { store }) {
        assert(client && typeof client.query === 'function' && store);
        this.client = client; this.store = store; this.backend = backend; this.runId = uuid(runId);
        this.j = store.read() ?? plannedJournal(backend, runId);
        validateJournal(this.j, backend, runId); this.save();
    }
    save() { this.j.revision++; this.store.write(this.j); }
    get actors() { assert(this.j.base); return Object.fromEntries(this.j.base.accounts.map((entry) => [entry.account, entry.userId])); }
    get base() { assert(this.j.base); return copy({ accounts: this.j.base.accounts, roles: this.j.base.roles, orgs: this.j.base.orgs }); }
    get supportedTables() { return supportedTables; }
    get fixtureProfile() { return fixtureProfile; }
    creationEnvelope(value) { return creationEnvelope(value, fixtureProfile); }
    get unsupportedTables() { return unsupportedTables; }
    scope(caseId) { const scope = this.j.cases.find((entry) => entry.caseId === caseId); assert(scope, 'Unknown case'); return scope; }
    defineCase(caseId, { actors = [], projects = [], borrowedActors = [], borrowedDefinitions = [], anonymous = false, ownedCustomerIds = [], ownedLeadIds = [] } = {}) {
        assert.equal(this.j.state, 'prepared'); assert(caseId !== 'base');
        const identity = caseIdentity(this.runId, caseId);
        const has = (table, id) => this.j.objects.some((entry) => entry.table === table && entry.id === uuid(id));
        assert(actors.every((id) => has('platform_user', id)), 'Case actor must already be owned');
        assert(projects.every((id) => has('project', id)), 'Contract case project must already be owned');
        assert(borrowedActors.every((id) => SEED_ACTORS.includes(uuid(id))) && (!borrowedActors.length || this.j.borrowed.principalSnapshot));
        assert(borrowedDefinitions.every((id) => this.j.borrowed.definitions.some((entry) => entry.id === uuid(id) && entry.readOnly && entry.fullRowSha256 === digest(entry.row))), 'Definition must already have a complete readonly before snapshot');
        const scope = { ...identity, actors: actors.map(uuid), projects: projects.map(uuid), borrowedActors: borrowedActors.map(uuid), borrowedDefinitions: borrowedDefinitions.map(uuid), anonymous: !!anonymous };
        if (fixtureProfile.name === 'todo42') { Object.assign(scope, salesAnchorOptions({ ownedCustomerIds, ownedLeadIds })); scope.salesProjectCustomers = bindSalesProjectCustomers(this.j, scope); validateSalesAnchorScope(this.j, scope); }
        else assert(ownedCustomerIds.length === 0 && ownedLeadIds.length === 0, 'Sales anchor options require explicit todo42 profile');
        for (const key of ['actors', 'projects', 'borrowedActors', 'borrowedDefinitions']) assert.equal(new Set(scope[key]).size, scope[key].length);
        assert(scope.actors.length || scope.borrowedActors.length || scope.anonymous);
        const previous = this.j.cases.find((entry) => entry.caseId === caseId);
        if (previous) { assert.equal(digest(previous), digest(scope), 'Case scope cannot be overwritten'); return copy(previous); }
        assert(!this.j.cases.some((entry) => entry.requestId === scope.requestId));
        this.j.cases.push(scope); this.save(); return copy(scope);
    }
    async borrowSeedPrincipals() {
        const current = await readSeedPrincipals(this.client);
        if (this.j.borrowed.principalSnapshot) assert.equal(current.digest, this.j.borrowed.principalSnapshot.digest);
        else this.j.borrowed.principalSnapshot = current;
        assert(!this.j.objects.some((entry) => SEED_ACTORS.includes(entry.id)));
        this.save(); return { principals: [...SEED_ACTORS], fullSnapshotSha256: current.digest, readOnly: true };
    }
    async borrowCanonicalDefinitions() {
        assert(['planned', 'prepared'].includes(this.j.state));
        const current = await readCanonicalDefinitions(this.client);
        if (this.j.borrowed.definitions.length) assert.equal(digest(current), digest(this.j.borrowed.definitions), 'Readonly definition before snapshot changed');
        else this.j.borrowed.definitions = current;
        for (const entry of current) assert(!this.j.objects.some((object) => object.id === entry.id), 'Readonly definitions cannot be owned');
        this.save(); return { ids: current.map(({ id }) => id), fullSnapshotSha256: digest(current), rowSha256: current.map(({ id, fullRowSha256 }) => ({ id, fullRowSha256 })), readOnly: true, ownershipAdmitted: false };
    }
    async planProject(caseId, id = randomUUID()) {
        assert.equal(this.j.state, 'prepared'); this.scope(caseId); assertNotBorrowed(this.j, id);
        assert.equal(await selectId(this.client, 'project', id), null, 'Planned project already exists');
        this.j.plans ??= []; assert(!this.j.plans.some((entry) => entry.id === uuid(id)));
        const plan = { table: 'project', id: uuid(id), caseId, beforePkAbsent: true };
        this.j.plans.push(plan); this.save(); return plan.id;
    }
    async prepare(options = {}) {
        assert(options && typeof options === 'object' && !Array.isArray(options) && Object.keys(options).every((key) => key === 'viewerPermissions'));
        const permissions = validateSource();
        const config = viewerPermissionPlan(permissions, Object.hasOwn(options, 'viewerPermissions') ? options.viewerPermissions : this.j.basePreparationConfig?.viewerPermissions);
        if (this.j.basePreparationConfig) assert.equal(digest(config), digest(this.j.basePreparationConfig), 'Planned viewer permissions cannot change');
        else { this.j.basePreparationConfig = config; this.save(); }
        if (this.j.base?.rows) {
            const roleId = this.j.base.accounts.find(({ account }) => account === 'viewer').roleId;
            assert.deepEqual(this.j.base.rows.filter((entry) => entry.table === 'role_permission_assignment' && entry.values.role_id === roleId).map((entry) => entry.values.permission_key).sort(), config.viewerPermissions, 'Existing planned base rows do not match the immutable viewer config');
        }
        if (this.j.state === 'prepared') return { state: 'prepared', actors: this.actors, viewerPermissions: [...config.viewerPermissions], alreadyPrepared: true };
        assert.equal(this.j.state, 'planned');
        await this.recoverDirectCreates();
        if (!this.j.base) { this.j.base = plannedBase(this.runId); this.save(); }
        if (!this.j.base.rows) { this.j.base.rows = await baseRows(this.runId, this.j.base, permissions, config.viewerPermissions); this.save(); }
        if (!this.j.cases.some((entry) => entry.caseId === 'base')) this.j.cases.push({ ...caseIdentity(this.runId, 'base'), actors: [], projects: [], borrowedActors: [], borrowedDefinitions: [], anonymous: false });
        const rows = this.j.base.rows;
        const owned = rows.filter((entry) => this.j.objects.some((object) => object.table === entry.table && object.id === entry.values.id));
        assert(owned.length === 0 || owned.length === rows.length, 'Partial base preparation requires exact committed-batch recovery');
        if (!owned.length) await this.#insertBatch(rows, 'base');
        this.j.state = 'prepared'; this.save(); return { state: 'prepared', actors: this.actors, viewerPermissions: [...config.viewerPermissions], ownedBaseRows: rows.length };
    }
    async preflight() { await assertSeedUnchanged(this.client, this.j); const result = await scanReferences(this.client, this.j); return { catalog: result.catalog, tablesScanned: result.tablesScanned, scanDigest: result.scanDigest }; }
    sourceAuthority(receipt) {
        assertProfileCertificateEnvelope(receipt, fixtureProfile);
        assert.equal(receipt.runId, this.runId); assert.equal(receipt.backend, this.backend);
        assert.equal(receipt.database, databaseFor(this.backend)); assert.equal(receipt.marker, marker);
        assert.equal(receipt.id, uuid(receipt.id));
        assert(/^tools\/rust-r2l\/[a-z0-9-]+\.(?:mjs|cjs)$/.test(receipt.source?.file));
        const file = path.resolve(root, receipt.source.file);
        assert(file.startsWith(path.resolve(root, 'tools/rust-r2l') + path.sep));
        const actual = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        assert.equal(actual, receipt.source.sha256, 'Creation witness source changed');
        assert(!this.j.authorities.some((entry) => entry.id === receipt.id));
    }
    registerNativeAuthority(receipt) {
        this.sourceAuthority(receipt); assert.equal(receipt.kind, 'mikro-orm-afterCreate-outer-commit');
        assert(receipt.trace?.complete && receipt.trace.diagnostics.length === 0 && receipt.trace.openTransactions.length === 0 && receipt.trace.pendingStartCount === 0);
        assert(Array.isArray(receipt.trace.events) && receipt.trace.events.length <= 100000 && Array.isArray(receipt.trace.committed));
        const authority = { ...copy(receipt), sourceAuthority: receipt.source.sha256, traceSha256: digest(receipt.trace) };
        this.j.authorities.push(authority); this.save(); return authority.id;
    }
    async registerPgObserver(receipt) {
        this.sourceAuthority(receipt); assert.equal(receipt.kind, 'pg-after-insert-observed-outer-commit'); assert.equal(receipt.state, 'installed');
        assert.equal(receipt.observerId, uuid(receipt.observerId)); assert(/^[1-9][0-9]*$/.test(String(receipt.functionOid)));
        assert(/^[0-9a-f]{64}$/.test(receipt.approvedDefinitionSha256));
        const { rows } = await this.client.query("select n.nspname as schema,p.proname as name,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.oid=$1::oid", [receipt.functionOid]);
        assert.equal(rows.length, 1); assert.equal(rows[0].schema, 'r2l_control');
        assert.equal(createHash('sha256').update(rows[0].definition).digest('hex'), receipt.approvedDefinitionSha256);
        this.j.authorities.push({ ...copy(receipt), sourceAuthority: receipt.source.sha256 }); this.save(); return receipt.id;
    }
    async intent(table, selector, { caseId }) {
        assert.equal(this.j.state, 'prepared'); const scope = this.scope(caseId); selector = normalize(table, selector);
        assertPreparedSalesOnly(table, selector, fixtureProfile);
        assert(Object.keys(selector).length && Object.keys(selector).every((key) => identities[table].includes(key)), 'Intent selector must contain only immutable fields');
        if (['customer', 'project'].includes(table)) assert(scope.actors.includes(uuid(selector.created_by)));
        else if (table === 'auth_session') assert([...scope.actors, ...scope.borrowedActors].includes(uuid(selector.user_id)));
        else if (['audit_log', 'security_event'].includes(table)) assert.equal(selector.request_id, scope.requestId);
        else if (table === 'commission_rule_version') assertCaseScope(this.j, table, selector, scope);
        else {
            const projectIds = resolveOwnedProjectIds(this.j, table, { ...selector, id: randomUUID() });
            assert(projectIds.length && projectIds.every((id) => scope.projects.includes(id)), 'Intent requires an explicit proven case project/parent');
        }
        await this.preflight();
        const condition = whereIdentity(table, selector), result = await this.client.query('select to_jsonb(t) as row from poms.' + ident(table) + ' t where ' + condition.sql, condition.args);
        for (const { row } of result.rows) assert(this.j.objects.some((entry) => entry.table === table && entry.id === row.id && sameIdentity(table, row, entry.identity)), 'Intent already matches unowned rows');
        const intent = { id: randomUUID(), table, selector, caseId, beforeObserved: true, beforeIds: result.rows.map(({ row }) => uuid(row.id)), state: 'planned' };
        this.j.intents.push(intent); this.save(); return copy(intent);
    }
    recordCommittedCreates(rows) {
        assert.equal(this.j.state, 'prepared'); assert(Array.isArray(rows));
        const admitted = [];
        for (const item of rows) {
            const intent = this.j.intents.find((entry) => entry.id === item.intentId && entry.table === item.table);
            assert(intent, 'Create has no actual before-intent'); assertNotBorrowed(this.j, item.id);
            assertCreationProof(this.j, item, intent);
            if (item.proof.kind === 'pg-after-insert-observed-outer-commit') assert.equal(digest(rowIdentity(item.table, item.identity)), digest(item.identity), 'PG certificate must carry original immutable creation identity');
            assert(![...this.j.committedCreates, ...admitted].some((entry) => entry.table === item.table && entry.id === uuid(item.id)), 'Duplicate create certificate');
            admitted.push({ ...copy(item), id: uuid(item.id), caseId: intent.caseId });
        }
        this.j.committedCreates.push(...admitted);
        this.save();
    }
    async resolveNoCreates(caseOrIntent) {
        const byId = this.j.intents.find((entry) => entry.id === caseOrIntent);
        const candidates = byId ? [byId] : this.j.intents.filter((entry) => entry.caseId === caseOrIntent && entry.state === 'planned');
        assert(byId || this.j.cases.some((entry) => entry.caseId === caseOrIntent), 'Unknown case/intent');
        let resolved = 0;
        for (const intent of candidates) {
            const certified = this.j.committedCreates.some((entry) => entry.intentId === intent.id);
            if (certified) { assert(!byId, 'Certified create cannot be resolved as absent'); continue; }
            const condition = whereIdentity(intent.table, intent.selector);
            const result = await this.client.query('select to_jsonb(t) as row from poms.' + ident(intent.table) + ' t where ' + condition.sql, condition.args);
            const ids = result.rows.map(({ row }) => uuid(row.id)).sort();
            assert.deepEqual(ids, [...intent.beforeIds].sort(), 'Uncertified creation appeared; no query-match adoption');
            for (const { row } of result.rows) assert(this.j.objects.some((entry) => entry.table === intent.table && entry.id === row.id && sameIdentity(intent.table, row, entry.identity)));
            intent.state = 'absent'; intent.postcondition = { kind: 'zero-created-scope-check', independentlyVisible: true, beforeIds: [...intent.beforeIds], afterIds: ids };
            resolved++;
        }
        this.save(); return { resolvedWithoutAdoption: resolved };
    }
    async adoptIntents() {
        await assertSeedUnchanged(this.client, this.j);
        const allCaptured = [], completed = [];
        for (const intent of this.j.intents.filter((entry) => entry.state === 'planned')) {
            const certificates = this.j.committedCreates.filter((entry) => entry.intentId === intent.id);
            assert(certificates.length, 'No committed create evidence for intent; do not adopt by query match');
            const captured = [];
            for (const item of certificates) {
                assertCreationProof(this.j, item, intent); const current = await selectId(this.client, item.table, item.id);
                assert(current, 'Certified create is not visible after outer commit');
                assert(/^[0-9]+$/.test(current.xmin));
                if (item.proof.kind === 'pg-after-insert-observed-outer-commit') assert(sameIdentity(item.table, current.row, item.identity), 'PG created identity changed before adoption');
                for (const [key, value] of Object.entries(intent.selector)) assert.equal(digest(normalize(item.table, current.row)[key]), digest(value));
                captured.push({ ...item, row: current.row, identity: rowIdentity(item.table, current.row), postcondition: { independentlyVisible: true, kind: 'independent-fixture-post-commit-read', observedXmin: current.xmin,
                    ...(item.proof.kind === 'pg-after-insert-observed-outer-commit' ? { sourceInsertXmin: item.proof.eventXmin, sourceXminAtDrain: item.proof.sourceXminAtDrain ?? null, xminEqualityNotAssumedAfterUpdates: true } : {}) } });
            }
            allCaptured.push(...captured); completed.push(intent);
        }
        for (const item of allCaptured) this.#admit(item, allCaptured);
        for (const intent of completed) intent.state = 'adopted';
        this.save();
        return { ownedRows: this.j.objects.length };
    }
    #admit(item, additional = []) {
        const scope = this.scope(item.caseId); assertNotBorrowed(this.j, item.id);
        if (fixtureProfile.name === 'todo42' && item.proof.kind !== 'direct-committed-insert') assertPreparedSalesOnly(item.table, item.row, fixtureProfile);
        if (item.caseId === 'base') {
            const plan = this.j.base.rows.find((entry) => entry.table === item.table && entry.values.id === item.id);
            assert(plan && identities[item.table].every((field) => digest(item.row[field] ?? null) === digest(plan.values[field] ?? null)));
        } else { assertRowReferences(this.j, item.table, item.row, scope, additional); assertCaseScope(this.j, item.table, item.row, scope, additional); }
        const previous = this.j.objects.find((entry) => entry.table === item.table && entry.id === item.id);
        if (previous) { assert.equal(digest(previous.identity), digest(item.identity)); assert.equal(digest(previous.creationProof), digest(item.proof)); return; }
        const nullableSalesRoot = fixtureProfile.name === 'todo42' && item.row.project_id == null && (item.table === 'sales_follow_up_record' || (item.table === 'todo_item' && item.row.source_type === 'sales-follow-up-record'));
        const projectIds = item.caseId === 'base' || nullableSalesRoot || ['auth_session', 'audit_log', 'security_event', 'customer', 'commission_rule_version'].includes(item.table) ? [] : resolveOwnedProjectIds(this.j, item.table, item.row, { additional });
        const projectId = projectIds.length === 1 ? projectIds[0] : null;
        this.j.objects.push({ table: item.table, id: item.id, caseId: item.caseId, projectId, projectIds, identity: item.identity, creationProof: copy(item.proof), postcondition: item.postcondition });
        if (item.table === 'project' && !scope.projects.includes(item.id)) scope.projects.push(item.id);
        this.save();
    }
    async insert(table, values, { caseId }) {
        assert.equal(this.j.state, 'prepared'); assert(caseId !== 'base');
        return (await this.#insertBatch([{ table, values }], caseId))[0];
    }
    async insertPreparedBatch(plan, { caseId }) {
        assert.equal(this.j.state, 'prepared'); assert(caseId !== 'base');
        const validated = await validateCommissionPreparedPlan(plan), scope = this.scope(caseId);
        for (const id of Object.values(plan.readonlyBorrowedDefinitions)) assert(scope.borrowedDefinitions.includes(id) && this.j.borrowed.definitions.some((entry) => entry.id === id && entry.readOnly), 'Prepared batch requires all three explicitly borrowed readonly definitions');
        this.j.preparedBatches ??= [];
        assert(!this.j.preparedBatches.some((entry) => entry.sourcePlanSha256 === validated.sourcePlanSha256), 'Prepared plan already registered; recover its actual batch instead');
        const sourcePlan = { id: randomUUID(), caseId, sourcePlanSha256: validated.sourcePlanSha256, originalPlan: copy(plan), defaultSources: validated.defaultSources, sourceBoundary: validated.sourceBoundary, state: 'planned-not-executed' };
        this.j.preparedBatches.push(sourcePlan); this.save();
        return this.#insertBatch(validated.rows, caseId, sourcePlan);
    }
    async #insertBatch(rows, caseId, sourcePlan = null) {
        const scope = this.scope(caseId); rows = rows.map((entry) => ({ ...entry, table: entry.table, values: normalize(entry.table, entry.values) }));
        const additional = rows.map((entry) => ({ table: entry.table, id: uuid(entry.values.id), caseId, row: { ...entry.values, ...(entry.expectedIdentity ?? {}) } }));
        assert(new Set(additional.map((entry) => entry.id)).size === additional.length);
        for (const entry of rows) {
            assertNotBorrowed(this.j, entry.values.id);
            if (caseId !== 'base') {
                const expected = entry.expectedIdentity ?? rowIdentity(entry.table, entry.values);
                assert.equal(digest(rowIdentity(entry.table, { ...entry.values, ...expected })), digest(expected));
                assertRowReferences(this.j, entry.table, entry.values, scope, additional); assertCaseScope(this.j, entry.table, { ...entry.values, ...expected }, scope, additional);
            }
        }
        await this.client.query('begin'); let intent;
        try {
            await assertSeedUnchanged(this.client, this.j); await scanReferences(this.client, this.j, { lock: true });
            const defaultEvidence = sourcePlan ? await verifyPreparedPhysicalDefaults(this.client, rows) : [];
            for (const entry of rows) assert.equal(await selectId(this.client, entry.table, entry.values.id, true), null, 'direct_insert_preexisting_id');
            const transaction = (await this.client.query('select pg_current_xact_id()::text as xid')).rows[0].xid;
            intent = { id: randomUUID(), caseId, rows: additional.map(({ table, id }) => ({ table, id })), beforeAbsent: true, transaction, expectedXmin: String(BigInt(transaction) % 4294967296n), captured: [], state: 'executing', ...(sourcePlan ? { sourcePlanId: sourcePlan.id, provenance: 'prepared-original-seeder-source-not-Native-generated', defaultEvidence } : {}) };
            if (sourcePlan) { sourcePlan.directCreateIntentId = intent.id; sourcePlan.state = 'executing'; }
            this.j.directCreates.push(intent); this.save();
            for (const entry of rows) {
                const { names, params } = insertParameters(entry.table, entry.values);
                const result = await this.client.query('insert into poms.' + ident(entry.table) + ' (' + names.map(ident).join(',') + ') values (' + names.map((_, index) => '$' + (index + 1)).join(',') + ') returning to_jsonb(' + ident(entry.table) + ') as row,xmin::text as xmin', params);
                assert.equal(result.rows.length, 1); assert.equal(result.rows[0].xmin, intent.expectedXmin);
                if (entry.expectedIdentity) assert(sameIdentity(entry.table, result.rows[0].row, entry.expectedIdentity), 'Actual RETURNING identity does not match the reviewed prepared expectation');
                intent.captured.push({ table: entry.table, id: uuid(entry.values.id), row: result.rows[0].row, identity: rowIdentity(entry.table, result.rows[0].row) }); this.save();
            }
            await assertSeedUnchanged(this.client, this.j);
            intent.state = 'commit-attempted'; if (sourcePlan) sourcePlan.state = 'commit-attempted'; this.save(); await this.client.query('commit'); intent.state = 'committed'; if (sourcePlan) sourcePlan.state = 'committed'; this.save();
        } catch (error) {
            try { await this.client.query('rollback'); } catch { if (intent) intent.rollbackUnconfirmed = true; }
            if (intent) { intent.state = ['commit-attempted', 'committed'].includes(intent.state) || intent.rollbackUnconfirmed ? 'outcome-unknown' : 'rolled-back'; if (sourcePlan) sourcePlan.state = intent.state; this.save(); } throw error;
        }
        await this.#promoteDirect(intent, false); return copy(intent.captured.map((entry) => entry.row));
    }
    async #promoteDirect(intent, recovery) {
        assert(intent.beforeAbsent && ['committed', 'commit-attempted', 'outcome-unknown'].includes(intent.state));
        assert.equal(intent.rows.length, intent.captured.length, 'Incomplete direct create capture');
        if (recovery) { const result = await this.client.query('select pg_xact_status($1::xid8) as status', [String(intent.transaction)]); assert.equal(result.rows[0]?.status, 'committed', 'Unknown COMMIT not certified'); }
        const captured = [];
        for (const item of intent.captured) {
            const current = await selectId(this.client, item.table, item.id);
            assert(current && current.xmin === intent.expectedXmin && sameIdentity(item.table, current.row, item.identity), 'Direct create outcome ambiguous');
            captured.push({ ...item, caseId: intent.caseId, row: current.row, proof: { kind: 'direct-committed-insert', transaction: intent.transaction, xmin: current.xmin, beforeAbsent: true, commitAcknowledged: !recovery, recoveredByXminAndXactStatus: recovery, ...(intent.sourcePlanId ? { sourcePlanId: intent.sourcePlanId, provenance: intent.provenance } : {}) }, postcondition: { independentlyVisible: true, kind: 'new-transaction-post-commit-read', observedXmin: current.xmin } });
        }
        for (const item of captured) if (!this.j.objects.some((entry) => entry.table === item.table && entry.id === item.id)) this.#admit(item, captured);
        await assertSeedUnchanged(this.client, this.j);
        intent.state = 'promoted'; if (intent.sourcePlanId) this.j.preparedBatches.find((entry) => entry.id === intent.sourcePlanId).state = 'promoted'; this.save();
    }
    async recoverDirectCreates() {
        for (const intent of this.j.directCreates) {
            if (['promoted', 'absent', 'rolled-back'].includes(intent.state)) continue;
            const current = await Promise.all(intent.rows.map((row) => selectId(this.client, row.table, row.id)));
            if (current.every((entry) => entry === null)) {
                const result = await this.client.query('select pg_xact_status($1::xid8) as status', [String(intent.transaction)]);
                assert.equal(result.rows[0]?.status, 'aborted', 'Invisible PKs alone do not prove an unknown transaction aborted');
                intent.state = 'absent'; intent.absenceProof = { beforeAbsent: intent.beforeAbsent, observedAllPkAbsent: true, independentTransactionStatus: 'aborted', transaction: String(intent.transaction) };
                if (intent.sourcePlanId) this.j.preparedBatches.find((entry) => entry.id === intent.sourcePlanId).state = 'absent';
                this.save(); continue;
            }
            assert(current.every(Boolean), 'Partial direct commit outcome'); await this.#promoteDirect(intent, intent.state !== 'committed');
        }
    }
    async updateOwned(table, id, values, reason) {
        assert.equal(this.j.state, 'prepared'); assert(typeof reason === 'string' && reason.length > 0);
        const object = this.j.objects.find((entry) => entry.table === table && entry.id === uuid(id)); assert(object);
        values = normalize(table, values); const names = Object.keys(values);
        assert(names.length && names.every((name) => name !== 'id' && !identities[table].includes(name)), 'Cannot change immutable identity');
        assertRowReferences(this.j, table, values, this.scope(object.caseId));
        await this.client.query('begin'); let change;
        try {
            await assertSeedUnchanged(this.client, this.j); const mutationScan = await scanReferences(this.client, this.j, { lock: true });
            const before = await selectId(this.client, table, id, true); assert(before && sameIdentity(table, before.row, object.identity));
            const candidate = { ...before.row, ...values };
            assertTodo42SalesScope({ profile: fixtureProfile, journal: this.j, table, row: candidate, scope: this.scope(object.caseId) });
            assertTodo42CandidateSalesClosure(this.j, mutationScan.found, table, candidate, fixtureProfile);
            const transaction = (await this.client.query('select pg_current_xact_id()::text as xid')).rows[0].xid;
            change = { table, id: object.id, reason, values: copy(values), transaction, expectedXmin: String(BigInt(transaction) % 4294967296n), before: before.row, state: 'executing' };
            this.j.mutations.push(change); this.save();
            const condition = whereIdentity(table, object.identity), n = condition.args.length;
            const result = await this.client.query('update poms.' + ident(table) + ' set ' + names.map((name, index) => ident(name) + '=$' + (n + index + 1)).join(',') + ' where ' + condition.sql + ' returning to_jsonb(' + ident(table) + ') as row,xmin::text as xmin', [...condition.args, ...names.map((name) => values[name])]);
            assert.equal(result.rowCount, 1); assert(sameIdentity(table, result.rows[0].row, object.identity));
            assert.equal(result.rows[0].xmin, change.expectedXmin); change.after = result.rows[0].row; change.state = 'commit-attempted'; this.save();
            await assertSeedUnchanged(this.client, this.j);
            await this.client.query('commit'); change.state = 'committed'; this.save(); return result.rows[0].row;
        } catch (error) {
            try { await this.client.query('rollback'); } catch { if (change) change.rollbackUnconfirmed = true; }
            if (change) { change.state = ['commit-attempted', 'committed'].includes(change.state) || change.rollbackUnconfirmed ? 'outcome-unknown' : 'rolled-back'; this.save(); } throw error;
        }
    }
    async recoverMutations() {
        for (const change of this.j.mutations.filter((entry) => ['commit-attempted', 'outcome-unknown'].includes(entry.state))) {
            const current = await selectId(this.client, change.table, change.id);
            const result = await this.client.query('select pg_xact_status($1::xid8) as status', [String(change.transaction)]);
            if (result.rows[0]?.status === 'aborted') {
                assert(current && digest(current.row) === digest(change.before), 'Aborted mutation does not match its independently visible before row');
                change.state = 'rolled-back'; change.recoveredByIndependentAbortedStatus = true; this.save(); continue;
            }
            assert(current && result.rows[0]?.status === 'committed' && current.xmin === change.expectedXmin && digest(current.row) === digest(change.after), 'Mutation COMMIT outcome remains ambiguous');
            change.state = 'recovered-committed'; this.save();
        }
    }
    async cleanup() { return cleanup(this); }
    async close() { await this.client.end(); }
}
