// Fixed R2M profile; no environment-selectable legacy namespace. No runtime access on import.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ownershipIdentities, handoverSourceOnlyTables } from './fixture-policy.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const equal=(a,b)=>assert.deepEqual(a,b); const copy=value=>structuredClone(value);
const uuid=value=>{assert(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));return value.toLowerCase();};
function freezeTree(value){if(value&&typeof value==='object'){for(const x of Object.values(value))freezeTree(x);Object.freeze(value);}return value;}
export const profileSourceFiles = ["tools/rust-r2m/fixture-ui-package-intent.mjs","tools/rust-r2m/fixture-package-intent.mjs","tools/rust-r2m/audit-attachment-source.mjs","tools/rust-r2m/fixture-external-audit-identity.mjs","tools/rust-r2m/acceptance-api-external-audit-source.mjs","tools/rust-r2m/fixture-audit-identity.mjs","tools/rust-r2m/acceptance-api-request-identity.mjs","tools/rust-r2m/acceptance-api-audit-source.mjs","tools/rust-r2m/fixture-handover-prepared.mjs","tools/rust-r2k/r4-prepared-source.mjs","tools/rust-r2m/fixture-example.mjs","tools/rust-r2m/fixture-setting-baseline.mjs","tools/rust-r2m/fixture-objects.mjs","tools/rust-r2m/fixture-keyed.mjs","tools/rust-r2m/fixture-prepared-source.mjs","tools/rust-r2m/audit-private.mjs","tools/rust-r2m/audit-error.mjs","tools/rust-r2m/audit-schema-source.json","tools/rust-r2m/catalog-complete.mjs","tools/rust-r2m/database-client.mjs","tools/rust-r2m/fixture-cleanup.mjs","tools/rust-r2m/fixture-core.mjs","tools/rust-r2m/fixture-credentials.mjs","tools/rust-r2m/fixture-guard.mjs","tools/rust-r2m/fixture-journal.mjs","tools/rust-r2m/fixture-policy.mjs","tools/rust-r2m/fixture-prepared.mjs","tools/rust-r2m/fixture-profile.mjs","tools/rust-r2m/fixture-references.mjs","tools/rust-r2m/fixture-users.mjs","tools/rust-r2m/fixture.mjs","tools/rust-r2m/managed-environment.cjs","tools/rust-r2m/reference-authority.json"];
export function collectProfileSources(){return profileSourceFiles.map(file=>{const before=fs.lstatSync(path.join(root,file),{bigint:true});assert(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n);const bytes=fs.readFileSync(path.join(root,file));const after=fs.lstatSync(path.join(root,file),{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(before[key],after[key]);return {file,bytes:bytes.length,rawBytesSha256:sha(bytes)};});}
export function profileFromEnvironment(env,readSources=collectProfileSources){assert(!Object.hasOwn(env,'POMS_R2L_FIXTURE_PROFILE')&&!Object.hasOwn(env,'POMS_R2M_FIXTURE_PROFILE'),'No selectable legacy fixture profile');const sources=readSources();equal(sources.map(x=>x.file),profileSourceFiles);return freezeTree({name:'r2m-stage',namespace:'poms-r2m',supportedTableCount:Object.keys(ownershipIdentities).length,journalTag:{name:'r2m-stage',revision:1,sourceSetSha256:sha(JSON.stringify(sources)),sources}});}
export function stampProfileJournal(journal,profile){assert.equal(journal.namespace,'poms-r2m');assert(!Object.hasOwn(journal,'fixtureProfile'));return {...journal,fixtureProfile:copy(profile.journalTag)};}
export function assertProfileJournal(journal,profile){assert.equal(journal.namespace,'poms-r2m');equal(journal.fixtureProfile,profile.journalTag);}
export function assertProfileCertificateEnvelope(receipt,profile){assert(receipt&&typeof receipt==='object');equal(receipt.fixtureProfile,profile.journalTag);}
export function creationEnvelope(receipt,profile){assert(receipt&&!Object.hasOwn(receipt,'fixtureProfile'));return {...receipt,fixtureProfile:copy(profile.journalTag)};}
export function assertPreparedSalesOnly(table,row,profile){assert.equal(profile.name,'r2m-stage');assert(!['lead','sales_follow_up_record',...handoverSourceOnlyTables].includes(table)&&!(table==='todo_item'&&row.source_type==='sales-follow-up-record'),'Selected sales/handover facts are prepared-source direct INSERT only');}
export function salesAnchorOptions({ ownedCustomerIds=[],ownedLeadIds=[] }={}) {
    const result={};
    for(const [key,values] of Object.entries({ownedCustomerIds,ownedLeadIds})) {
        assert(Array.isArray(values)); const normalized=values.map(uuid); assert.equal(new Set(normalized).size,normalized.length,'Duplicate explicit sales anchor'); result[key]=normalized.sort();
    }
    return result;
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
    assert.equal(journal.namespace, 'poms-r2m');
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
    
    const salesTodo = table === 'todo_item' && row.source_type === 'sales-follow-up-record';
    if (!['lead', 'sales_follow_up_record'].includes(table) && !salesTodo) return false;
    assert.equal(profile.name, 'r2m-stage'); assertProfileJournal(journal, profile); validateSalesAnchorScope(journal, scope);
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
    if(rows.size===0) return;
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
    
    const proposed=new Map(rows);proposed.set(table+':'+uuid(candidate.id),candidate);assertTodo42CurrentSalesClosure(journal,proposed,profile);
}

