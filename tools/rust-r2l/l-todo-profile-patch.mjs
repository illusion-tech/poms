// Exact, reversible SOURCE transformation of four frozen modules. It emits an
// inactive review patch; it never edits those modules or copies the fixture13.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const sha=value=>createHash('sha256').update(value).digest('hex');
const edit=(before,after)=>({before,after});
export const fixtureProfileEdits=Object.freeze({
    'tools/rust-r2l/fixture-core.mjs':{beforeSha256:'91869c552ee358221964654282316a361a9293027a5c23464d295254142ec7c2',edits:[
        edit("import { commissionIdentities } from './fixture-commission-policy.mjs';", "import { commissionIdentities } from './fixture-commission-policy.mjs';\nimport { profileFromEnvironment, assertProfileCertificateEnvelope } from './l-todo-profile-candidate.mjs';\nexport const fixtureProfile = profileFromEnvironment(process.env);"),
        edit('    ...commissionIdentities\n','    ...commissionIdentities, ...fixtureProfile.additionalIdentities\n'),
        edit('assert.equal(supportedTables.length, 40); assert.equal(unsupportedTables.length, 67);','assert.equal(supportedTables.length, fixtureProfile.supportedTableCount); assert.equal(unsupportedTables.length, 107 - fixtureProfile.supportedTableCount);'),
        edit('export function assertCreationProof(journal, item, intent) {','export function assertCreationProof(journal, item, intent) {\n    assertProfileCertificateEnvelope(item, fixtureProfile);'),
        edit("    assert(authority && authority.kind === proof.kind, 'Unregistered creation authority');","    assert(authority && authority.kind === proof.kind, 'Unregistered creation authority');\n    assertProfileCertificateEnvelope(authority, fixtureProfile);")
    ]},
    'tools/rust-r2l/fixture-journal.mjs':{beforeSha256:'22325bb00986506322cf0e8809e6c0337c3ef6b29ff67b4e4ba1665b9c44eac9',edits:[
        edit("import { canonicalDefinitions } from './fixture-commission-policy.mjs';","import { canonicalDefinitions } from './fixture-commission-policy.mjs';\nimport { fixtureProfile } from './fixture-core.mjs';\nimport { stampProfileJournal, assertProfileJournal, validateSalesAnchorScope } from './l-todo-profile-candidate.mjs';"),
        edit("    return { formatVersion: 1, fixtureSourceEpoch: 2, namespace: 'poms-r2l',", "    return stampProfileJournal({ formatVersion: 1, fixtureSourceEpoch: 2, namespace: 'poms-r2l',"),
        edit('preparedBatches: [], cleanup: [] };','preparedBatches: [], cleanup: [] }, fixtureProfile);'),
        edit("    assert(journal && journal.formatVersion === 1 && journal.namespace === 'poms-r2l');","    assert(journal && journal.formatVersion === 1); assertProfileJournal(journal, fixtureProfile);"),
        edit('    return journal;\n','    if (fixtureProfile.name === \'todo42\') for (const scope of journal.cases.filter(scope => scope.caseId !== \'base\')) validateSalesAnchorScope(journal, scope);\n    return journal;\n'),
        edit('    if (!previous) return;\n','    if (!previous) return;\n    assertProfileJournal(previous, fixtureProfile); assertProfileJournal(next, fixtureProfile);\n    if (fixtureProfile.name === \'todo42\') for (const scope of previous.cases.filter(scope => scope.caseId !== \'base\')) {\n        const current = next.cases.find(item => item.caseId === scope.caseId); assert(current);\n        for (const key of [\'ownedCustomerIds\',\'ownedLeadIds\',\'salesProjectCustomers\']) assert.equal(digest(current[key]), digest(scope[key]), \'Immutable explicit sales anchors changed\');\n    }\n')
    ]},
    'tools/rust-r2l/fixture-references.mjs':{beforeSha256:'cc89c7a04888875eff573e7b0a3cdc432b82f8b951642d80989bdf4ef62fc5b0',edits:[
        edit("import { canonicalDefinitions, projectParentEdges, summaryTargetTables } from './fixture-commission-policy.mjs';","import { canonicalDefinitions, projectParentEdges, summaryTargetTables } from './fixture-commission-policy.mjs';\nimport { fixtureProfile } from './fixture-core.mjs';\nimport { assertTodo42SalesScope, assertTodo42CurrentSalesClosure } from './l-todo-profile-candidate.mjs';"),
        edit("    if (actor !== null) assert(actors.has(uuid(actor)), 'Row actor is outside the real case');","    if (actor !== null) assert(actors.has(uuid(actor)), 'Row actor is outside the real case');\n    if (assertTodo42SalesScope({ profile: fixtureProfile, journal, table, row, scope, additional })) return;"),
        edit('    return { catalog, found, tablesScanned: frozenTables.length, scanDigest: digest(scanned) };','    assertTodo42CurrentSalesClosure(journal, found, fixtureProfile);\n    return { catalog, found, tablesScanned: frozenTables.length, scanDigest: digest(scanned) };')
    ]},
    'tools/rust-r2l/l-fixture.mjs':{beforeSha256:'589760bce836b02db3f1a7f64058cb915aa8b09d7ddf942d337f1245f16da3c6',edits:[
        edit("import { cleanup } from './fixture-cleanup.mjs';","import { cleanup } from './fixture-cleanup.mjs';\nimport { fixtureProfile } from './fixture-core.mjs';\nimport { creationEnvelope, salesAnchorOptions, bindSalesProjectCustomers, validateSalesAnchorScope, assertProfileCertificateEnvelope, assertTodo42SalesScope, assertTodo42CandidateSalesClosure, assertPreparedSalesOnly } from './l-todo-profile-candidate.mjs';"),
        edit('    get supportedTables() { return supportedTables; }','    get supportedTables() { return supportedTables; }\n    get fixtureProfile() { return fixtureProfile; }\n    creationEnvelope(value) { return creationEnvelope(value, fixtureProfile); }'),
        edit('    defineCase(caseId, { actors = [], projects = [], borrowedActors = [], borrowedDefinitions = [], anonymous = false } = {}) {','    defineCase(caseId, { actors = [], projects = [], borrowedActors = [], borrowedDefinitions = [], anonymous = false, ownedCustomerIds = [], ownedLeadIds = [] } = {}) {'),
        edit('anonymous: !!anonymous };\n','anonymous: !!anonymous };\n        if (fixtureProfile.name === \'todo42\') { Object.assign(scope, salesAnchorOptions({ ownedCustomerIds, ownedLeadIds })); scope.salesProjectCustomers = bindSalesProjectCustomers(this.j, scope); validateSalesAnchorScope(this.j, scope); }\n        else assert(ownedCustomerIds.length === 0 && ownedLeadIds.length === 0, \'Sales anchor options require explicit todo42 profile\');\n'),
        edit('    sourceAuthority(receipt) {','    sourceAuthority(receipt) {\n        assertProfileCertificateEnvelope(receipt, fixtureProfile);'),
        edit("        assert.equal(this.j.state, 'prepared'); const scope = this.scope(caseId); selector = normalize(table, selector);","        assert.equal(this.j.state, 'prepared'); const scope = this.scope(caseId); selector = normalize(table, selector);\n        assertPreparedSalesOnly(table, selector, fixtureProfile);"),
        edit('        const scope = this.scope(item.caseId); assertNotBorrowed(this.j, item.id);','        const scope = this.scope(item.caseId); assertNotBorrowed(this.j, item.id);\n        if (fixtureProfile.name === \'todo42\' && item.proof.kind !== \'direct-committed-insert\') assertPreparedSalesOnly(item.table, item.row, fixtureProfile);'),
        edit("        const projectIds = item.caseId === 'base' || ['auth_session', 'audit_log', 'security_event', 'customer', 'commission_rule_version'].includes(item.table) ? [] : resolveOwnedProjectIds(this.j, item.table, item.row, { additional });","        const nullableSalesRoot = fixtureProfile.name === 'todo42' && item.row.project_id == null && (item.table === 'sales_follow_up_record' || (item.table === 'todo_item' && item.row.source_type === 'sales-follow-up-record'));\n        const projectIds = item.caseId === 'base' || nullableSalesRoot || ['auth_session', 'audit_log', 'security_event', 'customer', 'commission_rule_version'].includes(item.table) ? [] : resolveOwnedProjectIds(this.j, item.table, item.row, { additional });"),
        edit("            await assertSeedUnchanged(this.client, this.j); await scanReferences(this.client, this.j, { lock: true });\n            const before = await selectId(this.client, table, id, true); assert(before && sameIdentity(table, before.row, object.identity));","            await assertSeedUnchanged(this.client, this.j); const mutationScan = await scanReferences(this.client, this.j, { lock: true });\n            const before = await selectId(this.client, table, id, true); assert(before && sameIdentity(table, before.row, object.identity));\n            const candidate = { ...before.row, ...values };\n            assertTodo42SalesScope({ profile: fixtureProfile, journal: this.j, table, row: candidate, scope: this.scope(object.caseId) });\n            assertTodo42CandidateSalesClosure(this.j, mutationScan.found, table, candidate, fixtureProfile);")
    ]}
});
function once(text,from,to) { assert.equal(text.split(from).length-1,1,'Patch context must occur exactly once'); return text.replace(from,to); }
export function integrationSources(read=file=>fs.readFileSync(file,'utf8')) {
    return Object.entries(fixtureProfileEdits).map(([file,{beforeSha256,edits}])=>{
        const actual=read(file).replace(/\r\n/g,'\n'); let original=actual;
        if(sha(original)!==beforeSha256) { for(const {before,after} of [...edits].reverse()) original=once(original,after,before); }
        assert.equal(sha(original),beforeSha256,'Not the frozen source or its exact reviewed patch: '+file);
        let proposed=original; for(const {before,after} of edits) proposed=once(proposed,before,after);
        assert(actual===original || actual===proposed,'Mixed source epochs rejected');
        return {file,original,proposed,beforeSha256,afterSha256:sha(proposed)};
    });
}
function unified(file,left,right) {
    const a=left.trimEnd().split('\n'),b=right.trimEnd().split('\n'),dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
    for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
    const ops=[];let i=0,j=0;while(i<a.length||j<b.length){const old=i+1,next=j+1;if(i<a.length&&j<b.length&&a[i]===b[j]){ops.push({tag:' ',text:a[i++],old,next});j++;}else if(j<b.length&&(i===a.length||dp[i][j+1]>=dp[i+1][j]))ops.push({tag:'+',text:b[j++],old,next});else ops.push({tag:'-',text:a[i++],old,next});}
    const ranges=[];for(let n=0;n<ops.length;n++)if(ops[n].tag!==' '){const start=Math.max(0,n-3),end=Math.min(ops.length,n+4),last=ranges.at(-1);if(last&&start<=last[1])last[1]=Math.max(last[1],end);else ranges.push([start,end]);}
    return ['--- a/'+file,'+++ b/'+file,...ranges.flatMap(([start,end])=>{const group=ops.slice(start,end),oldCount=group.filter(x=>x.tag!=='+').length,newCount=group.filter(x=>x.tag!=='-').length;return[`@@ -${group[0].old},${oldCount} +${group[0].next},${newCount} @@`,...group.map(x=>x.tag+x.text)]})].join('\n')+'\n';
}
export function integrationPatch(sources=integrationSources()) {return sources.map(x=>unified(x.file,x.original,x.proposed)).join('');}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)) {
    const sources=integrationSources(),patch=integrationPatch(sources);
    if(process.argv.includes('--write-inactive-patch')) fs.writeFileSync('tools/rust-r2l/l-todo-profile-integration.patch',patch);
    console.log(JSON.stringify({kind:'pure-inactive-exact-four-source-integration',files:sources.map(({file,beforeSha256,afterSha256})=>({file,beforeSha256,afterSha256})),patchBytes:Buffer.byteLength(patch),patchSha256:sha(patch),frozenSourcesWritten:false,SQLExecuted:false,HTTPExecuted:false}));
}
