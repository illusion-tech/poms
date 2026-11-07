const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
(async()=>{
 const root=process.cwd(),base=path.join(root,'tools/rust-r4ghi/G/implementation/support-patches/shared-enum-exporter09'),out=path.join(root,'tools/rust-r4ghi/independent/review05'),sha=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replace(/\r\n/g,'\n');
 const handoff=JSON.parse(fs.readFileSync(path.join(base,'handoff09.json'),'utf8')),targets=JSON.parse(fs.readFileSync(path.join(base,'proposal-files09.json'),'utf8')),copied=[];
 for(const entry of handoff.frozenFiles){const source=path.join(base,entry.file),bytes=fs.readFileSync(source);assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.rawSHA256);const dest=path.join(out,'inputs07/G09',entry.file+'.bin');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);copied.push({file:entry.file,bytes:bytes.length,sha256:sha(bytes)});}
 const targetChecks=[];
 for(const entry of targets){const bytes=fs.readFileSync(path.join(base,'root-proposal',entry.path));assert.equal(sha(norm(bytes.toString('utf8'))),entry.candidateNormalizedSha256);const dest=path.join(out,'inputs07/G09/root-proposal',entry.path+'.bin');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);targetChecks.push({...entry,rawSHA256:sha(bytes)});}
 const handoffRaw=fs.readFileSync(path.join(base,'handoff09.json'));fs.writeFileSync(path.join(out,'inputs07/G09/handoff09.json.bin'),handoffRaw);
 const accessModule=await import(pathToFileURL(path.join(base,'source-access09.candidate.mjs')).href);
 const build=await import(pathToFileURL(path.join(base,'full-build09.candidate.mjs')).href);
 const entry=await import(pathToFileURL(path.join(base,'s5-entry09.candidate.mjs')).href);
 const graph=await import(pathToFileURL(path.join(base,'registered-module-graph09.candidate.mjs')).href);
 const registryText=fs.readFileSync(path.join(base,'s5-registry09.candidate.json'),'utf8'),identityText=fs.readFileSync(path.join(base,'s3-nominal-identity09.json'),'utf8'),registry=JSON.parse(registryText),identity=JSON.parse(identityText);
 const access=accessModule.createSnapshotSourceAccess(root,'3b9bea8727a4c89c1a8ad5c0a3891d0718d1435d4913c285dedebb4d524ec602');
 const prior=JSON.parse(fs.readFileSync(path.join(root,'tools/rust-r1b/shared-manifest.json'),'utf8'));
 const proposed=build.proposeS5(root,prior,access);
 assert.deepEqual(proposed.identity,identity);assert.deepEqual(proposed.registry,registry);
 const manifest=build.buildS5Manifest(root,registry,identity,{candidate:true,sourceAccess:access});
 const frozenManifest=JSON.parse(fs.readFileSync(path.join(base,'manifest09.candidate.json'),'utf8'));assert.deepEqual(manifest,frozenManifest);
 entry.assertS5SourceGuard(root,'883f88fdf4fd609bb8b0725b28bda011d408d6ee',access);
 const negatives=[];
 const reject=(name,fn,pattern)=>{assert.throws(fn,pattern);negatives.push(name);};
 reject('null review pins fail closed',()=>entry.assertPinnedReview(registryText,identityText),/not frozen/);
 reject('production builder rejects candidate registry',()=>build.buildS5Manifest(root,registry,identity,{sourceAccess:access}),/Root-reviewed/);
 reject('forged access object rejected',()=>build.buildS5Manifest(root,registry,identity,{candidate:true,sourceAccess:{...access}}),/sealed checkpoint/);
 reject('unknown logical source rejected',()=>access.readText('libs/shared/contracts/src/lib/foreign.ts'),/Unregistered S5 logical/);
 const shared=graph.CLOSED_MODULES[1],pin=registry.modules.closedModules.find(x=>x.path===shared),source=access.readText(shared);
 reject('unknown module rejected before hash refresh',()=>graph.assertModuleText(root,shared,source+'\nimport { foreign } from "./foreign";\n',pin),/Unregistered module edge/);
 reject('computed enum cannot hide',()=>graph.assertModuleText(root,shared,source+'\nconst HiddenSchema=z["enum"](["x"]);\n',pin),/computed Zod/);
 reject('hidden callback/helper enum cannot hide',()=>graph.assertModuleText(root,shared,source+'\nfunction hidden(){return z.enum(["x"])}\n',pin),/enum hidden in a function/);
 reject('unknown helper hash rejected',()=>graph.assertModuleText(root,shared,source+'\nfunction foreign(x){return x}\n',pin),/unreviewed module bytes/);
 const groups=new Map();for(const family of manifest.enums){const key=JSON.stringify(family.values);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(family.name);}
 const equalValueDistinctFamilies=[...groups.values()].filter(x=>x.length>1);
 assert(equalValueDistinctFamilies.length>0);
 const report={kind:'independent-review05-whole-exporter09-pure-rebuild-and-actual-A-source-guard',capturedAt:new Date().toISOString(),handoffSHA256:sha(handoffRaw),allFrozenAuthorFilesMatch:copied.length,allRootProposalTargetsMatch:targetChecks.length,targets:targetChecks,proposedIdentityExactlyReconstructedFromActualRootHistoricalManifest:true,proposedRegistryExactlyReconstructedFromCurrentPinnedAInputs:true,wholeManifestExactlyRebuilt:true,coverage:manifest.coverage,historicalConstantReplacements:registry.registrations.constants.filter(x=>x.disposition==='explicit-value-replacement').map(x=>({name:x.name,path:x.path,historicalValueSha256:x.historicalValueSha256,currentValueSha256:x.currentValueSha256})),historicalMigrations:registry.registrations.enumOccurrences.filter(x=>x.disposition!=='same-owner-property-source-retained').map(x=>({historicalIndex:x.historicalIndex,owner:x.owner,propertyPath:x.propertyPath,disposition:x.disposition,currentReplacements:x.currentReplacements.map(y=>({family:y.family,wireRelation:y.wireRelation,construction:y.construction}))})),equalValueDistinctFamilies,independentlyExecutedNegativeChecks:negatives,actualGitAPathAndBlobAndWorkingIndexUntrackedSourceGuardPassed:true,A:'883f88fdf4fd609bb8b0725b28bda011d408d6ee',CMetadataAppliedOrPinned:false,productionS5WriteOrCheck:false,G3Certified:false,G4Certified:false};
 fs.writeFileSync(path.join(out,'whole-exporter12-pure.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({handoffSHA256:report.handoffSHA256,frozenFiles:copied.length,targetFiles:targetChecks.length,manifestExact:true,actualASourceGuard:true,negativeChecks:negatives.length,coverage:manifest.coverage,historicalConstantReplacementNames:report.historicalConstantReplacements.map(x=>x.name),equalValueDistinctFamilyGroups:equalValueDistinctFamilies.length,productionWrite:false}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
