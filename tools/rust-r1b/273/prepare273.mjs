// Candidate B metadata only. No generated artifact write and no auto-approval.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createSourceAccess273, strictBytes273, CHECKPOINT_MANIFEST273,assertSnapshotSourceAccess } from './source-access273.mjs';
import { assertSourceTreeGit273, CODE273, REGISTRY273, IDENTITY273 } from './guard273.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..'), args = process.argv.slice(2);
const sha = value => createHash('sha256').update(value).digest('hex');
if (args.length === 1 && args[0] === '--help') console.log('Candidate273 B metadata: --source-head <actualA40hex> --checkpoint-sha <actualRaw64hex>. Requires the fixed committed Source A; no formal approval or artifact write.');
else {
    assert(args.length === 4 && args[0] === '--source-head' && /^[0-9a-f]{40}$/.test(args[1]) && args[2] === '--checkpoint-sha' && /^[0-9a-f]{64}$/.test(args[3]), 'Explicit Source A and checkpoint raw pin are required');
    const raw = strictBytes273(root, CHECKPOINT_MANIFEST273); assert.equal(sha(raw), args[3]);
    const manifest = JSON.parse(raw), checkpoint = { file: CHECKPOINT_MANIFEST273, rawBytesSHA256: args[3], inputRecords: manifest.inputs.length, logicalSourcePaths: manifest.inputs.map(row => row.file).sort() };
    const access = createSourceAccess273(root, checkpoint); assertSourceTreeGit273(root, args[1], access);
    const engine = await import(pathToFileURL(resolve(root,'tools/rust-r1b/273/full-build273.mjs')));
    const identityRaw = strictBytes273(root, IDENTITY273), identity = JSON.parse(identityRaw), result = engine.propose273(root,identity,access);
    const registry = {...result.registry,sourceHead:args[1]};
    const oldFile='tools/openapi/shared-api-client-baseline.json',oldRaw=strictBytes273(root,oldFile),old=JSON.parse(oldRaw);
    assert.equal(old.sourceHead,'2cd1be6029cf1b14ebfb1fc4530af894507a4c5a');
    const entries=new Map(manifest.inputs.map(row=>[row.file,row]));
    const baseline={...old,sourceHead:args[1],spec:manifest.inventory,featureRegistration:'tools/rust-r4ghi/contracts273/registration.json',protectedSources:old.protectedSources.map(row=>({...row,sha256:entries.get(row.file).normalizedTextSHA256}))};
    const registryRaw=Buffer.from(JSON.stringify(registry,null,2)+'\n'),baselineRaw=Buffer.from(JSON.stringify(baseline,null,2)+'\n');
    const review={kind:'Root-independently-reviewed-273-exporter-binding',sourceHead:args[1],checkpoint,
        registration:{file:REGISTRY273,rawBytesSha256:sha(registryRaw),normalizedTextSha256:sha(registryRaw.toString('utf8').replace(/\r\n/g,'\n'))},
        identity:{file:IDENTITY273,rawBytesSha256:sha(identityRaw),normalizedTextSha256:sha(identityRaw.toString('utf8').replace(/\r\n/g,'\n'))},
        codePins:Object.fromEntries(CODE273.map(file=>[file,sha(strictBytes273(root,file))])),sdkBaseline:{file:'tools/rust-r1b/273/sdk-baseline.json',rawBytesSha256:sha(baselineRaw)},previousS6Baseline:{file:oldFile,rawBytesSha256:sha(oldRaw)},inventory:{paths:242,operations:296,schemas:691,publicCanonicalSchemas:132},formalAAndBReviewed:false,oldS5S6Retained:true};
    const output=resolve(root,'tools/rust-r1b/273/pending-'+args[3].slice(0,12));assert(!existsSync(output));
    // Verify all fixed A inputs once more before any candidate metadata publication.
    access.assertLiveMatchesSnapshots();assertSourceTreeGit273(root,args[1],access);
    assertSnapshotSourceAccess(access,root);mkdirSync(output);writeFileSync(resolve(output,'registration.candidate.json'),registryRaw,{flag:'wx'});writeFileSync(resolve(output,'sdk-baseline.candidate.json'),baselineRaw,{flag:'wx'});writeFileSync(resolve(output,'review.candidate.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
    writeFileSync(resolve(output,'README.txt'),'Pending B only. Independent review must approve the exact data and code. Root then deliberately sets registration reviewStatus=Root-reviewed-273-registration and formalAAndBReviewed=true, recomputes the registry raw/normalized hashes and review raw SHA, installs fixed metadata paths and commits clean B. No other semantic/source/identity change is implied.\n',{flag:'wx'});
    console.log(JSON.stringify({kind:'273-candidate-registration-not-approved',output,sourceHead:args[1],checkpoint:args[3],coverage:result.manifest.coverage,formalAAndBReviewed:false,wholeArtifactsWritten:false,SDKWritten:false,GitMutation:false,G3Certified:false}));
}
