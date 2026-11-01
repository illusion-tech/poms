// Reads only capsule-pinned public source. Never reads evidence/private or opens a runtime.
import assert from 'node:assert/strict';
import {SourceReader} from './acceptance-source.mjs';
import {originalDraftSourceMetadata,draftEntitySources} from './acceptance-api-prepared-source-check.mjs';
import {buildPreparedContractRows} from '../rust-r2l/prepared-contract-source.mjs';
import {domainClockDigest as digest} from './comparison-api-domain-clock.mjs';
export function createFiveDraftVerifier({root,sourceCap,journal}){
    const files=[...draftEntitySources.map(s=>s.file),'apps/poms-api/src/seeders/dev-seed-data.ts','tools/rust-r2l/prepared-contract-source.mjs'];
    const pins=files.map(file=>{const found=sourceCap.files.filter(p=>p.file===file);assert.equal(found.length,1);return found[0]});
    const reader=new SourceReader({root,pins,sourceEpoch:sourceCap.id});for(const file of files)reader.read(file);const {metadata}=originalDraftSourceMetadata(reader);let verifiedPlans=0;
    return Object.freeze({verify(plan){
        assert.equal(plan.kind,'prepared-original-draft-seed-records-not-native-generated');const all=[...plan.rows,...(plan.excludedPreparedRows??[])],ids={};for(const table of['customer','project','contract']){const found=all.filter(row=>row.table===table);assert.equal(found.length,1);ids[table+'Id']=found[0].values.id;}
        const admin=journal.base.accounts.filter(a=>a.account==='admin');assert.equal(admin.length,1);const expected=buildPreparedContractRows({runId:journal.runId,actorId:admin[0].userId,orgId:admin[0].orgId,...ids,metadata,numbers:plan.numberValues});
        let projected=expected;if(plan.excludedPreparedRows){const selected=new Set(plan.rows.map(row=>row.table));projected={...expected,excludedPreparedRows:expected.rows.filter(row=>!selected.has(row.table)),rows:expected.rows.filter(row=>selected.has(row.table))};}
        assert.equal(digest(projected),digest(plan),'Complete captured draft plan differs from the exact original constructor under its actual source/inputs');reader.assertUnchanged();verifiedPlans++;return{kind:'exact-public-original-draft-constructor-replay',sourcePlanSha256:digest(plan),ownershipGranted:false};
    },receipt(){const source=reader.assertUnchanged();return{kind:'R2M-five-exact-draft-source-replay',verifiedPlans,sourceEpoch:source.sourceEpoch,sourceFiles:source.files.length,NativeMetadataCertified:false,ownershipGranted:false,privateRead:false,actualDatabaseHttpExecuted:false}}});
}
