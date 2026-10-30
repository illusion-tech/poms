// Inactive opt-in SOURCE policy. Merely importing it selects nothing and opens
// no DB. Its reviewed integration selects one immutable startup profile in a
// separate Node process; the default remains legacy40. Root/C own activation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const equal = (left, right) => assert.deepEqual(left, right);
const uuid = value => { assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)); return value.toLowerCase(); };
const copy = value => structuredClone(value);
function freezeTree(value) { if (value && typeof value === 'object') { for (const item of Object.values(value)) freezeTree(item); Object.freeze(value); } return value; }
export const todoAdditionalIdentities = Object.freeze({
    lead: Object.freeze(['lead_no', 'customer_id', 'created_by']),
    sales_follow_up_record: Object.freeze(['customer_id', 'lead_id', 'project_id', 'created_by']),
});
export const profileSourceFiles = Object.freeze([
    'l-fixture.mjs', 'fixture-core.mjs', 'fixture-references.mjs', 'fixture-journal.mjs', 'fixture-users.mjs',
    'fixture-cleanup.mjs', 'http-client.mjs', 'fixture-safety.test.mjs', 'fixture-commission-candidate.mjs',
    'fixture-commission-candidate.test.mjs', 'fixture-commission-policy.mjs', 'fixture-prepared.mjs', 'fixture-commission-safety.test.mjs',
    'l-todo-facts-source.mjs', 'l-todo-profile-candidate.mjs', 'l-todo-consumption.mjs',
    'l-todo-profile-patch.mjs', 'l-todo-profile-integration.patch', 'l-todo-profile.test.mjs', 'l-todo-profile-virtual.mjs',
].map(file => 'tools/rust-r2l/' + file).sort());

export function collectTodoProfileSourceSet() {
    return profileSourceFiles.map(file => {
        const absolute=path.join(root,file),before = fs.lstatSync(absolute, { bigint: true }); assert(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n);
        const bytes = fs.readFileSync(absolute), after = fs.lstatSync(absolute, { bigint: true });
        assert.equal(BigInt(bytes.length),before.size);
        for (const field of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(after[field], before[field]);
        return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) };
    });
}
export function selectFixtureProfile(name = 'legacy40', readSourceSet = collectTodoProfileSourceSet) {
    // Validate the name before touching sources, an environment loader or DB.
    assert(['legacy40', 'todo42'].includes(name), 'Unknown L fixture profile');
    if (name === 'legacy40') return Object.freeze({ name, supportedTableCount: 40, namespace: 'poms-r2l', additionalIdentities: Object.freeze({}), journalTag: null });
    const sources = readSourceSet(); equal(sources.map(item => item.file), profileSourceFiles);
    for (const item of sources) assert(Number.isSafeInteger(item.bytes) && item.bytes > 0 && /^[0-9a-f]{64}$/.test(item.rawBytesSha256));
    const journalTag = { name, revision: 1, selectedBeforeDatabaseAccess: true, sourceSetSha256: sha(JSON.stringify(sources)), sources: copy(sources) };
    return freezeTree({ name, supportedTableCount: 42, namespace: 'poms-r2l-todo42', additionalIdentities: todoAdditionalIdentities, journalTag });
}
export function profileFromEnvironment(env, readSourceSet = collectTodoProfileSourceSet) {
    return selectFixtureProfile(Object.hasOwn(env, 'POMS_R2L_FIXTURE_PROFILE') ? env.POMS_R2L_FIXTURE_PROFILE : 'legacy40', readSourceSet);
}
export function stampProfileJournal(original, profile) {
    assert.equal(original.namespace, 'poms-r2l'); assert(!Object.hasOwn(original, 'fixtureProfile'));
    if (profile.name === 'legacy40') return original;
    return { ...original, namespace: profile.namespace, fixtureProfile: copy(profile.journalTag) };
}
export function assertProfileJournal(journal, profile) {
    assert.equal(journal.namespace, profile.namespace, 'Fixture profiles cannot read each other journals');
    if (profile.name === 'legacy40') assert(!Object.hasOwn(journal, 'fixtureProfile'));
    else equal(journal.fixtureProfile, profile.journalTag);
}
export function assertProfileCertificateEnvelope(envelope, profile) {
    assert(envelope && typeof envelope === 'object');
    if (profile.name === 'legacy40') assert(!Object.hasOwn(envelope, 'fixtureProfile'), 'A todo42 certificate cannot enter legacy40');
    else equal(envelope.fixtureProfile, profile.journalTag);
    // This is fixture provenance metadata, never an invented SDK/PG field.
    return true;
}
export function creationEnvelope(envelope, profile) {
    assert(envelope && typeof envelope==='object' && !Object.hasOwn(envelope,'fixtureProfile'));
    return profile.name==='legacy40' ? envelope : { ...envelope,fixtureProfile:copy(profile.journalTag) };
}
export function salesAnchorOptions({ ownedCustomerIds=[],ownedLeadIds=[] }={}) {
    const result={};
    for(const [key,values] of Object.entries({ownedCustomerIds,ownedLeadIds})) {
        assert(Array.isArray(values)); const normalized=values.map(uuid); assert.equal(new Set(normalized).size,normalized.length,'Duplicate explicit sales anchor'); result[key]=normalized.sort();
    }
    return result;
}
export function assertPreparedSalesOnly(table,row,profile) {
    if(profile.name==='todo42') assert(!['lead','sales_follow_up_record'].includes(table) && !(table==='todo_item' && row.source_type==='sales-follow-up-record'), 'Todo42 sales facts in this slice are source-prepared direct INSERTs only, never generated-ID adoption');
}
function owned(journal, table, id, additional = []) {
    id = uuid(id);
    const current = journal.objects.filter(item => item.table === table && uuid(item.id) === id);
    const cohort = additional.filter(item => item.table === table && uuid(item.id) === id && (item.creationProof || item.proof) && item.postcondition?.independentlyVisible === true);
    assert(current.length || cohort.length, 'Unproven explicit sales parent: ' + table);
    const item = current[0] ?? cohort[0]; assert((item.creationProof || item.proof) && item.postcondition?.independentlyVisible === true);
    if(journal.currentSalesRowsRequired) assert(item.row,'An explicit sales anchor has no actual current row');
    const identity=item.identity;
    for(const other of [...current,...cohort]) if(identity && other.identity) equal(other.identity,identity);
    if(item.row) return item.row;
    const captures=(journal.directCreates??[]).filter(batch=>batch.state==='promoted' && batch.transaction===item.creationProof?.transaction).flatMap(batch=>batch.captured).filter(row=>row.table===table && uuid(row.id)===id);
    if(captures.length) {
        const actual=captures[0].row; for(const [key,value] of Object.entries(identity)) equal(actual[key],value);
        return actual;
    }
    return item.identity;
}
export function validateSalesAnchorScope(journal, scope) {
    assert.equal(journal.namespace, 'poms-r2l-todo42');
    for (const [field, table] of [['ownedCustomerIds', 'customer'], ['ownedLeadIds', 'lead']]) {
        assert(Array.isArray(scope[field])); equal(scope[field], [...new Set(scope[field].map(uuid))].sort());
        for (const id of scope[field]) owned(journal, table, id);
    }
    for (const id of scope.ownedLeadIds) {
        const lead = owned(journal, 'lead', id); assert(scope.ownedCustomerIds.includes(uuid(lead.customer_id)), 'Lead must point to this explicit owned customer anchor');
    }
    const expected=scope.ownedCustomerIds.length||scope.ownedLeadIds.length ? [...scope.projects].sort() : [];
    equal(Object.keys(scope.salesProjectCustomers??{}).sort(),expected);
    for(const projectId of expected) {
        const project=owned(journal,'project',projectId);assert(project.customer_id!=null,'Sales project requires an actual captured/current customer relation');
        assert.equal(uuid(project.customer_id),scope.salesProjectCustomers[projectId],'Sales project/customer relation drifted from immutable captured customer');assert(scope.ownedCustomerIds.includes(scope.salesProjectCustomers[projectId]));
    }
}
export function bindSalesProjectCustomers(journal,scope) {
    const result={};if(!scope.ownedCustomerIds.length&&!scope.ownedLeadIds.length)return result;
    for(const projectId of [...scope.projects].sort()) {const project=owned(journal,'project',projectId);assert(project.customer_id!=null);const customerId=uuid(project.customer_id);assert(scope.ownedCustomerIds.includes(customerId));result[projectId]=customerId;}
    return result;
}

// Returns false for ordinary legacy project rows. The caller must retain all
// original reference/actor/proof checks; a true result supplies only the new
// explicitly named sales-root case admission and never a creation certificate.
export function assertTodo42SalesScope({ profile, journal, table, row, scope, additional = [] }) {
    if (profile.name === 'legacy40') return false;
    const salesTodo = table === 'todo_item' && row.source_type === 'sales-follow-up-record';
    if (!['lead', 'sales_follow_up_record'].includes(table) && !salesTodo) return false;
    assert.equal(profile.name, 'todo42'); assertProfileJournal(journal, profile); validateSalesAnchorScope(journal, scope);
    const freshActors=scope.actors.map(uuid);
    const customerAnchor = id => {
        id = uuid(id); assert(scope.ownedCustomerIds.includes(id)); owned(journal, 'customer', id, additional); return id;
    };
    const followupAnchor = followup => {
        customerAnchor(followup.customer_id);
        if (followup.lead_id != null) {
            const leadId = uuid(followup.lead_id); assert(scope.ownedLeadIds.includes(leadId));
            const lead = owned(journal, 'lead', leadId, additional); equal(uuid(lead.customer_id), uuid(followup.customer_id));
        }
        if (followup.project_id != null) {
            const projectId = uuid(followup.project_id); assert(scope.projects.includes(projectId)); const project=owned(journal, 'project', projectId, additional);
            assert(project.customer_id!=null,'Sales project requires an actual captured/current customer relation, never an inferred project'); equal(uuid(project.customer_id),uuid(followup.customer_id));equal(uuid(followup.customer_id),scope.salesProjectCustomers[projectId]);
            return { type: 'project', id: projectId, projectId };
        }
        return followup.lead_id != null ? { type: 'lead', id: uuid(followup.lead_id), projectId: null }
            : { type: 'customer', id: uuid(followup.customer_id), projectId: null };
    };
    if (table === 'lead') {
        assert(scope.actors.includes(uuid(row.created_by)), 'Prepared Lead creator must be an owned case actor'); customerAnchor(row.customer_id);
        if(row.owner_user_id!=null) assert(freshActors.includes(uuid(row.owner_user_id)),'Lead owner must be an explicit fresh case actor');
        if(row.owner_org_id!=null) owned(journal,'org_unit',row.owner_org_id,additional);
        return true;
    }
    if (table === 'sales_follow_up_record') {
        assert(scope.actors.includes(uuid(row.created_by)), 'Prepared followup creator must be an owned case actor');
        if (row.owner_user_id != null) assert(freshActors.includes(uuid(row.owner_user_id)));
        if(row.owner_org_id!=null) owned(journal,'org_unit',row.owner_org_id,additional);
        assert(row.supersedes_record_id==null && row.replaced_by_record_id==null,'This prepared fresh-stream slice does not admit replacement chains');
        followupAnchor(row); return true;
    }
    const followup = owned(journal, 'sales_follow_up_record', row.source_id, additional), target = followupAnchor(followup);
    assert(freshActors.includes(uuid(row.assignee_user_id)), 'Reminder assignee must be a fresh owned actor in the exact case');
    equal(row.target_object_type, target.type); equal(uuid(row.target_object_id), target.id); equal(row.project_id == null ? null : uuid(row.project_id), target.projectId);
    equal(row.todo_type, 'sales-follow-up-reminder'); equal(row.business_domain, 'sales'); return true;
}
// Called only after the original full107 logical-reference scan and exact
// immutable identity checks. Existing rows are actual SELECT results, never
// adopted here. This closes mutable Project.customer_id against the snapshot.
export function assertTodo42CurrentSalesClosure(journal,rows,profile) {
    if(profile.name==='legacy40' || rows.size===0) return;
    assertProfileJournal(journal,profile);
    const current={...journal,currentSalesRowsRequired:true,objects:journal.objects.map(object=>({...object,row:rows.get(object.table+':'+object.id)}))};
    for(const scope of journal.cases.filter(scope=>scope.caseId!=='base' && ((scope.ownedCustomerIds?.length??0) || (scope.ownedLeadIds?.length??0)))) {
        validateSalesAnchorScope(current,scope);
        for(const id of scope.ownedCustomerIds) assert(rows.has('customer:'+id),'Explicit owned customer anchor no longer exists');
        for(const id of scope.ownedLeadIds) assert(rows.has('lead:'+id),'Explicit owned Lead anchor no longer exists');
        for(const id of scope.projects) {
            const project=rows.get('project:'+id); assert(project,'Explicit sales project anchor no longer exists');
            assert(project.customer_id!=null && uuid(project.customer_id)===scope.salesProjectCustomers[id],'Actual sales project/customer relation drifted from the immutable initial captured customer');
        }
    }
    for(const object of current.objects) {
        if(!object.row) continue;
        const scope=journal.cases.find(scope=>scope.caseId===object.caseId); assert(scope);
        assertTodo42SalesScope({profile,journal:current,table:object.table,row:object.row,scope});
    }
}
export function assertTodo42CandidateSalesClosure(journal,rows,table,candidate,profile) {
    if(profile.name==='legacy40')return;
    const proposed=new Map(rows);proposed.set(table+':'+uuid(candidate.id),candidate);assertTodo42CurrentSalesClosure(journal,proposed,profile);
}

export const integrationProposal = Object.freeze({
    enabled: false, defaultBehavior: 'legacy40; existing journal shape and table count stay unchanged',
    selection: 'fixture-core imports this pure module and calls profileFromEnvironment once, before LFixture.open can load managed/DB. Unknown name rejects before readSourceSet/DB.',
    core: 'Spread only selectedProfile.additionalIdentities; assert supportedTables length equals selectedProfile.supportedTableCount. legacy40 keeps its 40/67 assertion outcome.',
    journal: 'Stamp only todo42 planned journals with its namespace/profile/sourceSet; validate selected namespace and exact immutable tag before save/open/recovery. assertStablePlans freezes tag. Legacy journals keep no tag.',
    case: 'Only todo42 defineCase gains sorted ownedCustomerIds/ownedLeadIds; validate independently owned anchors before fixing case. Use a customer-only Lead preparation case, then a second immutable reminder case after the Lead COMMIT certificate exists.',
    references: 'Retain old UUID/actor/reference checks. Call assertTodo42SalesScope before project-only admission. For admitted nullable sales rows store projectIds=[]; never invent a project. Source_id still resolves to the exact owned followup.',
    certificate: 'todo42 authority/certificate envelope must carry the immutable selected fixtureProfile; reject old envelopes, and legacy40 rejects new envelopes. Do not add fabricated SDK/PG proof fields. Existing driver defaults remain legacy40; a separately reviewed Todo owner supplies new envelopes.',
    direct: 'Seven SOURCE rows insert sequentially through existing direct INSERT/RETURNING/outer-COMMIT admission. The two extra tables and sales-source Todos reject generated intents/certificates in this slice. No blanket batch/reference waiver or copied 13-file implementation.',
    observer: 'Keep PG7 unchanged; prepare sales rows with no active PG7 case. GET observer cases create no sales rows.',
    pending: 'Root/C must review a concrete integration delta and actual profile pure/runtime tests before activation.',
});

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url && process.argv.includes('--check')) {
    let reads = 0; const sourceSet = profileSourceFiles.map(file => ({ file, bytes: 1, rawBytesSha256: '0'.repeat(64) }));
    const read = () => { reads++; return sourceSet; };
    assert.throws(() => selectFixtureProfile('unknown', read)); assert.equal(reads, 0);
    const legacy = selectFixtureProfile('legacy40', read); assert.equal(reads, 0);
    const todo = selectFixtureProfile('todo42', read); assert.equal(reads, 1);
    const old = { namespace: 'poms-r2l' }, next = stampProfileJournal(old, todo);
    assert.equal(stampProfileJournal(old, legacy), old); assertProfileJournal(old, legacy); assertProfileJournal(next, todo);
    assert.throws(() => assertProfileJournal(old, todo)); assert.throws(() => assertProfileJournal(next, legacy));
    assertProfileCertificateEnvelope({}, legacy); assertProfileCertificateEnvelope({ fixtureProfile: todo.journalTag }, todo);
    assert.throws(() => assertProfileCertificateEnvelope({}, todo)); assert.throws(() => assertProfileCertificateEnvelope({ fixtureProfile: todo.journalTag }, legacy));
    console.log(JSON.stringify({ kind: 'pure-inactive-profile-isolation-check', profiles: 2, unknownBeforeSourceIO: true,
        journalCrossReadRejected: true, certificateCrossAdoptRejected: true, SQLExecuted: false, profileActivated: false }));
}
