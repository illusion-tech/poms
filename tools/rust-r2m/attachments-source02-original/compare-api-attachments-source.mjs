// Execute only the named pinned public pure planners with caller supplied
// source bytes. The injected fs facade exposes one public source, never disk.
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>sha(JSON.stringify(canonical(value)));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const attachmentSourceFiles=Object.freeze(['tools/rust-r2k/r4-prepared-source.mjs','tools/rust-r2l/prepared-contract-source.mjs','apps/poms-api/src/seeders/database.seeder.ts','apps/poms-api/src/seeders/dev-seed-data.ts','tools/rust-r2m-continuation01/acceptance-api-prepared-source-check.mjs','tools/rust-r2m-continuation01/acceptance-api-bindings.mjs','apps/poms-api/src/app/features/customer/customer.entity.ts','apps/poms-api/src/app/features/project/project.entity.ts','apps/poms-api/src/app/features/contract/contract.entity.ts','apps/poms-api/src/app/features/attachment/local-attachment-object-storage.provider.ts','apps/poms-api/src/app/features/attachment/attachment.controller.ts','apps/poms-api/src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.ts','apps/poms-api/src/app/features/attachment/attachment-storage-provider-registry.service.ts','apps/poms-api/src/app/features/project-handover/project-handover-command.service.ts','apps/poms-api/src/app/features/attachment/attachment-storage-provider.service.ts']);
function tree(file,raw){return ts.createSourceFile(file,raw.toString('utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS)}
function declaration(file,raw,name){const ast=tree(file,raw),node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(node,'One named original pure function');return node.getText(ast).replace(/^export /,'')}
export function createAttachmentSourceEngine({sourceCap,sourceReader,journal}){
    assert.equal(ts.version,'6.0.3');assert(journal.marker==='abd093b8-c584-45b3-9c62-6357ad6dfa5d');const bytes=new Map();
    for(const file of attachmentSourceFiles){const pins=sourceCap.files.filter(pin=>pin.file===file);assert.equal(pins.length,1);const raw=sourceReader.read(file);assert(Buffer.isBuffer(raw)&&sha(raw)===pins[0].rawBytesSha256);bytes.set(file,raw)}
    const K=attachmentSourceFiles[0],k=bytes.get(K);assert.equal(sha(k),'70978ae60f59e1331964894d7ec50abf75060f2b0f1e639667aaac27380b1e36');const kTree=tree(K,k),kBody=kTree.statements.filter(n=>!ts.isImportDeclaration(n)&&!(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['require','ts','ROOT'].includes(d.name.getText(kTree))))).map(n=>n.getText(kTree).replace(/^export /,'')).join('\n');
    assert(!kBody.includes('import.meta'));
    const seeder='apps/poms-api/src/seeders/database.seeder.ts',virtual='/public-cap-source',fakeFs={lstatSync(file){assert.equal(file,virtual+'/'+seeder);return{isFile:()=>true,isSymbolicLink:()=>false}},realpathSync(file){assert([virtual,virtual+'/'+seeder].includes(file));return file},readFileSync(file){assert.equal(file,virtual+'/'+seeder);return bytes.get(seeder)}};
    const originalK=new Function('assert','createHash','fs','path','vm','ts','ROOT',kBody+'\nreturn {buildPreparedPlan,parseStatement};')(assert,createHash,fakeFs,path.posix,vm,ts,virtual);
    const metadataFile=attachmentSourceFiles[4],metadataBody=declaration(metadataFile,bytes.get(metadataFile),'originalDraftSourceMetadata'),draftEntitySources=[['customer',attachmentSourceFiles[6]],['project',attachmentSourceFiles[7]],['contract',attachmentSourceFiles[8]]].map(([table,file])=>({table,file}));
    const metadataReader={text(file){assert(bytes.has(file));return bytes.get(file).toString('utf8')}};
    const metadata=new Function('assert','ts','draftEntitySources',metadataBody+';return originalDraftSourceMetadata;')(assert,ts,draftEntitySources)(metadataReader).metadata;
    const D=attachmentSourceFiles[1],draft=declaration(D,bytes.get(D),'buildPreparedContractRows'),dev=attachmentSourceFiles[3];
    const buildDraft=new Function('assert','ts','fs','sourceFile','sha','uuid','vm',draft+';return buildPreparedContractRows;')(assert,ts,{readFileSync(file){assert.equal(file,dev);return bytes.get(dev)}},dev,sha,uuid,vm);
    const B=attachmentSourceFiles[5],bindingRaw=bytes.get(B),bindingDecls=['syntheticInputs','uploadInputs','handoverPreparedInput'].map(name=>declaration(B,bindingRaw,name)).join('\n');
    const builders=new Function('assert','Buffer','uuidPattern','hash','randomUUID',bindingDecls+';return {syntheticInputs,uploadInputs,handoverPreparedInput};')(assert,Buffer,uuid,sha,()=>{assert.fail('Actual comparison input must supply every original UUID')});
    const providerAst=tree(attachmentSourceFiles[14],bytes.get(attachmentSourceFiles[14])),snapshotMethods=[];function findSnapshot(node){if(ts.isMethodDeclaration(node)&&node.name.getText(providerAst)==='auditSnapshot')snapshotMethods.push(node);ts.forEachChild(node,findSnapshot)}findSnapshot(providerAst);assert.equal(snapshotMethods.length,1);const snapshotCode=ts.transpileModule('class SourceSnapshot {'+snapshotMethods[0].getText(providerAst)+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,snapshot=new Function(snapshotCode+';return new SourceSnapshot();')();
    let draftPlans=0,kPlans=0;
    return Object.freeze({
        sourceBytes:k,
        parseOriginal:originalK.parseStatement,
        async buildOriginal(input){kPlans++;return originalK.buildPreparedPlan(input)},
        uploadInputs:builders.uploadInputs,
        syntheticInputs:builders.syntheticInputs,
        handoverPreparedInput:builders.handoverPreparedInput,
        missingLocalObject(storageKey){assert(bytes.get(attachmentSourceFiles[9]).toString().includes('`Attachment file ${location.storageKey} not found`'));return'Attachment file '+storageKey+' not found'},
        providerAuditSnapshot(row){const config=Object.fromEntries(Object.entries(row).map(([column,value])=>[column.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase()),column==='credentials_updated_at'&&value!==null?new Date(value):value]));return snapshot.auditSnapshot(config)},
        verifyKBoundary(bridge){
            assert(bridge.kind==='M4-explicit-frozen-K-component-to-actual-c01-profile32-boundary-bridge'&&bridge.frozenHelperHistoricalPinsAreNotCurrentCapsulePins===true&&bridge.proofs.length===6);let verified=0;
            for(const file of['tools/rust-r2m-continuation01/fixture.mjs','tools/rust-r2m-continuation01/fixture-journal.mjs']){
                const raw=sourceReader.read(file),expected=sourceCap.files.filter(pin=>pin.file===file);assert.equal(expected.length,1);assert.equal(sha(raw),expected[0].rawBytesSha256);const ast=tree(file,raw),sites=new Map();function visit(node){if((ts.isMethodDeclaration(node)||ts.isFunctionDeclaration(node))&&['insertHandoverPreparedBatch','#insertBatch','#promoteDirect','recoverDirectCreates'].includes(node.name?.getText(ast)))sites.set(node.name.getText(ast),node.getText(ast));if(ts.isIfStatement(node)&&node.expression.getText(ast)==='journal.logicalReferences')sites.set('journal.logicalReferences-clause',node.getText(ast));if(ts.isForOfStatement(node)&&node.expression.getText(ast)==='journal.preparedBatches ?? []')sites.set('journal.preparedBatches-clause',node.getText(ast));ts.forEachChild(node,visit)}visit(ast);
                for(const proof of bridge.proofs.filter(proof=>proof.file===file)){assert(proof.allThreeCompleteBodiesEqual===true&&proof.historicalSha256===proof.currentOriginalSha256&&proof.currentOriginalSha256===proof.actualCapDerivedSha256);assert.equal(sites.get(proof.site),proof.body);assert.equal(sha(sites.get(proof.site)),proof.actualCapDerivedSha256);verified++}
            }assert.equal(verified,6);return{kind:'M4-frozen-component-current-c01-proof-boundary-revalidated',completeEqualSites:verified,historicalPinsPretendedCurrent:false,ownershipGranted:false};
        },
        verifyDraft(plan){
            assert(plan.kind==='prepared-original-draft-seed-records-not-native-generated');const all=[...plan.rows,...(plan.excludedPreparedRows??[])],ids={};for(const table of['customer','project','contract']){const rows=all.filter(item=>item.table===table);assert.equal(rows.length,1);ids[table+'Id']=rows[0].values.id}
            const accounts=journal.base.accounts.filter(account=>account.account==='admin');assert.equal(accounts.length,1);const actual=buildDraft({runId:journal.runId,actorId:accounts[0].userId,orgId:accounts[0].orgId,...ids,metadata,numbers:plan.numberValues});let expected=actual;
            if(plan.excludedPreparedRows){const selected=new Set(plan.rows.map(row=>row.table));expected={...actual,excludedPreparedRows:actual.rows.filter(row=>!selected.has(row.table)),rows:actual.rows.filter(row=>selected.has(row.table))}}
            assert.equal(digest(plan),digest(expected),'Complete exact original draft constructor replay');draftPlans++;return{kind:'M4-exact-source-draft-replay',sourcePlanSha256:digest(plan),ownershipGranted:false};
        },
        receipt(){sourceReader.assertUnchanged();return{kind:'M4-source-engine-original-planner-replay',sourceCapId:sourceCap.id,kPlans,draftPlans,sourceFiles:attachmentSourceFiles.length,sourceFilesystemFacade:'only-pinned-public-bytes',privateRead:false,actualSqlHttp:false,ownershipGranted:false}}
    });
}
