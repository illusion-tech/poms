// Closed external binding/GET provenance. No top-level I/O or authority mint.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
import{C219,sha219,pinSame219,ref219,sameTargets219,targetKey219,taxSuccessor219}from'./facts219.mjs';
export const R219='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P219='/home/wangzishi/.local/share/poms-r4ghi/private',D219=P219+'/business/g2-business13/main01';
export const executableNames219=['driver219.mjs','runtime219.mjs','facts219.mjs','inventory219.mjs','fi219.mjs','semantics219.mjs','transport219.mjs'];
const approved=new WeakMap();
export function within219(root,file){const rel=path.relative(fs.realpathSync(root),fs.realpathSync(file));assert(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel));}
export function read219(pin){assert(pin&&path.isAbsolute(pin.file)&&/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));const st=fs.lstatSync(pin.file);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1);assert.equal(fs.realpathSync(pin.file),path.resolve(pin.file));const raw=fs.readFileSync(pin.file);assert.equal(sha219(raw),pin.rawBytesSha256);return raw;}
export const json219=pin=>JSON.parse(read219(pin));
export const pinFile219=file=>({file,rawBytesSha256:sha219(fs.readFileSync(file))});
export function identity219(p){return Object.fromEntries(['sourcePins','helperH1','helperSources','baseRegistry','toolAdmission119','candidate','apiProcess','taxCompletion','periodCompletion','executionTools','basisId','reason'].map(k=>[k,p[k]]));}
export function assertPlan219(p,mode){
 assert(['prepare','fi-only','commit','read-verification','disarm-fi'].includes(mode));
 const keys=['kind','actualInputsComplete','namespace','epoch','run','phase','sourcePins','helperH1','helperSources','baseRegistry','toolAdmission119','candidate','apiProcess','taxCompletion','periodCompletion','executionTools','basisId','reason','approvedPrepared','approvedFIMapping','approvedFIComplete','approvedNormalSuccess'];assert.deepEqual(Object.keys(p).sort(),keys.sort());
 assert.equal(p.kind,'Root-approved-external-mixed-period-allocation219');assert.equal(p.actualInputsComplete,true);for(const k of ['namespace','epoch','run'])assert.equal(p[k],C219[k]);assert(/^[A-Za-z0-9_-]{1,32}$/.test(p.phase));
 for(const k of ['sourcePins','helperH1','baseRegistry','toolAdmission119','candidate','apiProcess','taxCompletion','periodCompletion']){assert(p[k]&&path.isAbsolute(p[k].file)&&/^[a-f0-9]{64}$/.test(p[k].rawBytesSha256));}
 assert(/^[a-f0-9-]{36}$/.test(p.basisId));assert(typeof p.reason==='string'&&p.reason.trim().length>12);assert(Array.isArray(p.helperSources)&&p.helperSources.length>195);assert(Array.isArray(p.executionTools)&&p.executionTools.length===executableNames219.length);
 const required=mode==='prepare'?[]:mode==='fi-only'||mode==='disarm-fi'?['approvedPrepared']:mode==='commit'?['approvedPrepared','approvedFIComplete']:['approvedPrepared','approvedFIComplete','approvedNormalSuccess'];
 for(const k of ['approvedPrepared','approvedFIComplete','approvedNormalSuccess']){if(required.includes(k)){assert(p[k]&&path.isAbsolute(p[k].file)&&/^[a-f0-9]{64}$/.test(p[k].rawBytesSha256));}else assert.equal(p[k],null);}
 if(mode==='prepare')assert.equal(p.approvedFIMapping,null);else assert(p.approvedFIMapping&&path.isAbsolute(p.approvedFIMapping.file)&&/^[a-f0-9]{64}$/.test(p.approvedFIMapping.rawBytesSha256));return p;
}
export function load219(pin,mode){within219(D219,pin.file);const p=assertPlan219(json219(pin),mode);approved.set(p,{pin:Object.freeze({...pin}),mode});return p;}
export function approved219(p,mode=null){const a=approved.get(p);assert(a,'Only the exact private hash-approved input is executable');if(mode)assert.equal(a.mode,mode);assert.deepEqual(json219(a.pin),p);return a.pin;}
export async function helpers219(){const names=['context','http','pure','snapshot','ledger','consumer-admission54','resource-tool-admission119','required-write-inventory','fault-sweep','tax13-facts','tax13-semantics','shared-cash-proof58','ef-write-inventory40','ef-fault-sweep40','labor-mask47'];return Object.assign({},...await Promise.all(names.map(n=>import(pathToFileURL(R219+'/tools/rust-r4ghi/business/'+n+'.mjs').href))));}
export function verify219(ctx,p,h,{allowOwnFault=false}={}){
 approved219(p);assert.equal(ctx.namespace,C219.namespace);assert.equal(ctx.epoch,C219.epoch);assert.equal(ctx.run,C219.run);assert.equal(ctx.migrations,98);assert.equal(ctx.tables,139);
 assert(!ctx.state.cleaned&&!ctx.state.cleanupPlan&&!ctx.state.blockedObservation);assert(!ctx.state.activeFault||allowOwnFault&&ctx.state.activeFault.kind===C219.kind);
 assert.equal(ctx.pins.length,416);assert.equal(sha219(JSON.stringify(ctx.pins)),C219.sourceSHA);assert.deepEqual(json219(p.sourcePins),ctx.pins);assert.deepEqual(p.helperSources,ctx.helperPins);assert.deepEqual(json219(p.helperH1),ctx.helperPins);
 const base=h.assertAdmittedContext54(ctx,{liveProcess:true,sourceFiles:true});pinSame219(ctx.state.consumerAdmission54.registry,p.baseRegistry);pinSame219(ctx.state.toolAdmission119.registry,p.toolAdmission119);pinSame219(h.effectiveHelperPins119(ctx,base),p.helperH1);h.assertRuntimeBinding119(ctx,base,{toolAdmission119:p.toolAdmission119,candidate:p.candidate});
 pinSame219(ctx.state.apiProcess,p.apiProcess);assert.equal(ctx.state.apiProcess.record.binarySha256,C219.binarySHA);
 const tax=ctx.state.taxContinuation13;assert(tax?.complete&&tax.sweep?.finalSuccess?.postconditions==='verified');pinSame219(tax.complete,p.taxCompletion);assert.deepEqual(json219(p.taxCompletion),tax.sweep);assert.equal(tax.sweep.finalSuccess.status,201);assert(!tax.pendingMain&&!tax.pendingTaxTrial&&!tax.normalTaxPending);
 const selectedTax=selectedTaxBasis219(ctx,p,h);assert.equal(typeof h.historicalOwnedRowsTax13,'function','The reviewed narrow H125 HTTP-before bridge is required');
 const period=ctx.state.periodDriver206;assert(period?.complete&&period.postconditions==='verified');pinSame219(period.complete,p.periodCompletion);const proof=json219(p.periodCompletion);assert.equal(proof.kind,'actual-Source13-H1-real-period206-complete');assert.equal(proof.semantics.realtimeCurrentPreserved,true);assert.equal(proof.views.actualPeriodAndSnapshotGET,true);
 const directory=path.dirname(p.executionTools[0].file);assert.deepEqual(p.executionTools.map(x=>path.basename(x.file)).sort(),[...executableNames219].sort());for(const pin of p.executionTools){assert.equal(path.dirname(pin.file),directory);within219(R219+'/tools/rust-r4ghi',pin.file);read219(pin);}
 return {base,periodId:proof.semantics.periodId,periodSnapshotId:proof.semantics.pairedSnapshotId,selectedTax};
}
export function selectedTaxBasis219(ctx,p,h){
 const tax=ctx.state.taxContinuation13,s=tax.sweep,f=s.scope.sharedFacts;assert.equal(f.sourceCostId,tax.legacyReferences.costId);assert.equal(f.basisId,tax.legacyReferences.basisId);
 // Standard business/capture does not add a namespace property. Namespace,
 // process and full source/R3/H1 identity are verified by verify219 above;
 // this immutable standard snapshot binds its actual schema/marker/run/DBs.
 within219(ctx.priv,s.finalSuccess.after.file);const after=h.loadSnapshot(ctx,s.finalSuccess.after);assert.equal(after.schemaVersion,1);assert.equal(after.marker,ctx.state.marker);assert.equal(after.epoch,ctx.epoch);assert.equal(after.run,ctx.run);assert.deepEqual(Object.keys(after.databases).sort(),[...ctx.databases].sort());
 return taxSuccessor219({facts:f,transaction:s.finalSuccess.transaction,basisRows:h.readRows(after.databases[ctx.database].tables.shared_cost_allocation_basis),slotRows:h.readRows(after.databases[ctx.database].tables.shared_cost_allocation_source_snapshot),expectedBasisId:p.basisId,expectedCostId:tax.legacyReferences.costId});
}
export function readPreparation219(ctx,pin,target,roots){
 within219(ctx.out,pin.file);const http=json219(pin);assert.equal(http.kind,'actual-business-HTTP-attempt');assert.equal(http.operationId,'ProjectCostController_getProjectUnifiedAccounting');assert.equal(http.method,'GET');assert.equal(http.status,200);assert.equal(http.expectedStatus,200);assert.equal(http.responseComplete,true);assert.equal(http.transportFailure,false);
 for(const k of ['requestConfig','requestBody','responseBody'])within219(ctx.priv,http.originals[k].file);assert.equal(read219(http.originals.requestBody).length,0);
 const config=json219(http.originals.requestConfig),url=new URL(config.url);
 assert(typeof ctx.state.prefix==='string'&&/^bg[a-f0-9]{10}$/.test(ctx.state.prefix));assert(typeof http.requestId==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(http.requestId)&&http.requestId.startsWith(ctx.state.prefix+'-'));
 assert.equal(config.headers?.['X-Request-Id'],http.requestId,'The exact actual nonce must bind HTTP/config/header');assert.equal(config.requestId,http.requestId);assert.equal(config.operationId,http.operationId);assert.equal(config.method,'GET');assert.equal(url.origin,ctx.api);assert.equal(url.pathname,'/api/projects/'+target.projectId+'/unified-accounting');assert.equal(sha219(url.search),http.querySha256);
 assert.equal(url.searchParams.get('view'),'preparation');assert.equal(url.searchParams.get('intent'),'restatement');assert.equal(url.searchParams.get('restatesSnapshotId'),target.restatesSnapshotRef.id);assert.deepEqual(JSON.parse(url.searchParams.get('correctionSourceRefs')),roots);
 assert.equal(url.searchParams.get('periodEndSnapshotId'),target.periodEndSnapshotRef?.id??null);assert.deepEqual([...url.searchParams.keys()].sort(),['view','intent','restatesSnapshotId','correctionSourceRefs',...(target.periodEndSnapshotRef?['periodEndSnapshotId']:[])].sort());
 within219(ctx.priv,config.before.file);const before=json219(config.before);assert.equal(before.epoch,ctx.epoch);assert.equal(before.run,ctx.run);assert.equal(before.marker,ctx.state.marker);
 const value=json219(http.originals.responseBody),prep=(value.data??value).preparation;assert.equal(prep.kind,'preparation-only');assert.equal(prep.intent,'restatement');assert.equal(prep.projectId,target.projectId);assert.equal(prep.headVersion,target.expectedVersion);assert.equal(prep.formalEligibility.status,'eligible');assert.deepEqual(prep.formalEligibility.blockingReasonCodes,[]);assert.deepEqual(prep.blockingReasonCodes,[]);assert(prep.allowedCommandCodes.includes('restatement'));return prep;
}
export function verifyPackets219(ctx,prepared){
 assert.equal(prepared.body.allocationCorrections[0].basisRef.id,prepared.runtimeIdentity.basisId);
 const roots=[ref219(prepared.body.allocationCorrections[0].basisRef)];
 for(const packet of prepared.packets){assert.deepEqual(readPreparation219(ctx,packet.http,packet.target,roots),packet.preparation);sameTargets219(packet.preparation.proposedAffectedTargets,prepared.facts.targets);}
 const primary=prepared.packets.find(x=>targetKey219(x.target)===prepared.body.projectId+':'+prepared.body.restatesSnapshotRef.id);assert(primary);assert.equal(primary.preparation.projectVersion,prepared.body.expectedProjectVersion);assert.equal(primary.preparation.expectedInputHash,prepared.body.expectedInputHash);return roots;
}
export function verifyFIMapping219(p,state,prepared){
 const a=json219(p.approvedFIMapping);assert.equal(a.kind,'approved-allocation219-FI-branch-equivalence');assert(['/root/r4ghi_independent_review','/root/r4ghi_final_gates13'].includes(a.reviewer));
 pinSame219(a.prepared,state.prepared);assert.equal(a.normalInventorySHA256,sha219(JSON.stringify(prepared.inventory)));assert.equal(a.requiredFIInventorySHA256,sha219(JSON.stringify(prepared.fiInventory)));assert.equal(a.mappingSHA256,sha219(JSON.stringify(prepared.proposedFIMapping)));
 for(const k of ['approved','allUnselectedMapped','lastTargetIncluded','sameSQLAndGuardPathsChecked','differencesAcceptedOrRepresented'])assert.equal(a[k],true);
 assert.equal(a.G3Certified,false);assert.equal(a.G4Certified,false);assert(Array.isArray(a.analysisReceipts)&&a.analysisReceipts.length>0);for(const pin of a.analysisReceipts)read219(pin);return a;
}
