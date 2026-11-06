import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=resolve('.'), own='tools/rust-r4ghi/independent/business-g1/round02', prefix=`${own}/final01`, out=resolve(prefix);
const candidate='9e010077e3010ff09447e9d77cb1bf1f7adbf68d', base='d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5';
const sourceManifest='docs/design/rust-r4ghi/g1-source-manifest01.json', expectedManifestSHA='89a2ebeba984320afe9b883910be742edb15e97ce19b409eab0c3b4372d27da9';
const sha=b=>createHash('sha256').update(b).digest('hex');
const checks=[],check=(id,passed,observed)=>checks.push({id,passed:Boolean(passed),observed});
function save(file,b){const p=resolve(out,file);if(!p.startsWith(out+(process.platform==='win32'?'\\':'/')))throw new Error('outside own path');mkdirSync(dirname(p),{recursive:true});if(existsSync(p)){if(!readFileSync(p).equals(b))throw new Error('refuse to overwrite prior bytes');}else writeFileSync(p,b,{flag:'wx'});return{file:`${prefix}/${file}`,bytes:b.length,rawBytesSha256:sha(b)};}
const raw=label=>readFileSync(`${prefix}/raw/${label}-stdout.bin`);
const rawJSON=label=>JSON.parse(raw(label));
const input=p=>readFileSync(`${prefix}/inputs/${p}.bin`);
const inputJSON=p=>JSON.parse(input(p));
const manifestBytes=input(sourceManifest),manifest=JSON.parse(manifestBytes);
check('exact-requested-source-manifest',sha(manifestBytes)===expectedManifestSHA&&readFileSync(sourceManifest).equals(manifestBytes),{expected:expectedManifestSHA,actual:sha(manifestBytes)});
const entries=manifest.entries.map(e=>{const b=input(e.path),current=readFileSync(e.path);return{...e,localBytes:b.length,localSHA256:sha(b),matches:b.length===e.bytes&&sha(b)===e.sha256,unchangedSinceCapture:b.equals(current),copy:{file:`${prefix}/inputs/${e.path}.bin`,bytes:b.length,rawBytesSha256:sha(b)}};});
check('223-unique-matching-stable-raw-pins',entries.length===223&&new Set(entries.map(e=>e.path)).size===223&&entries.every(e=>e.matches&&e.unchangedSinceCapture),{total:entries.length,bad:entries.filter(e=>!e.matches||!e.unchangedSinceCapture)});
const products=entries.filter(e=>e.role==='unchanged-product-source');
check('133-product-source-records',products.length===133,products.length);
const blobs=raw('candidate-and-base-blob-identities').toString().trim().split(/\r?\n/);
check('356-candidate-and-base-git-object-queries-resolve',blobs.length===entries.length+products.length&&blobs.every(s=>/^[0-9a-f]{40} blob [0-9]+$/.test(s)),{queries:entries.length+products.length,lines:blobs.length});
entries.forEach((e,i)=>e.candidateGitBlob=blobs[i].split(' ')[0]);
products.forEach((e,i)=>{e.baseGitBlob=blobs[entries.length+i].split(' ')[0];e.sameProductGitBlob=e.candidateGitBlob===e.baseGitBlob&&e.gitBlob===e.baseGitBlob&&e.gitBase===base;});
check('133-product-git-blobs-unchanged-from-product-base',products.every(e=>e.sameProductGitBlob),products.filter(e=>!e.sameProductGitBlob));
const bytes=raw('candidate-input-object-bytes');let offset=0;
for(const e of entries){const nl=bytes.indexOf(10,offset),[blob,type,sizeText]=bytes.subarray(offset,nl).toString().split(' '),size=Number(sizeText);if(blob!==e.candidateGitBlob||type!=='blob'||!Number.isSafeInteger(size))throw new Error('invalid batch framing');const b=bytes.subarray(nl+1,nl+1+size);offset=nl+1+size+1;e.candidateGitSHA256=sha(b);e.rawMatchesGit=e.localSHA256===e.candidateGitSHA256;if(!e.rawMatchesGit)e.lfEquivalent=input(e.path).toString().replace(/\r\n/g,'\n')===b.toString().replace(/\r\n/g,'\n');}
check('all-candidate-pins-git-byte-equivalent',entries.every(e=>e.rawMatchesGit||e.lfEquivalent===true),entries.filter(e=>!e.rawMatchesGit).map(({path,role,lfEquivalent})=>({path,role,lfEquivalent})));
check('all-effective-v2-files-exact-git-bytes',entries.filter(e=>e.path.startsWith('tools/rust-r4ghi/joint-g1/effective-v2/')).every(e=>e.rawMatchesGit),entries.filter(e=>e.path.startsWith('tools/rust-r4ghi/joint-g1/effective-v2/')&&!e.rawMatchesGit).map(e=>e.path));
check('captured-HEAD-is-approved-input-commit',raw('local-head').toString().trim()===candidate,raw('local-head').toString().trim());
const changed=raw('candidate-changed-paths').toString().trim().split(/\r?\n/).filter(Boolean);
check('candidate-changes-confined-to-docs-and-tools',changed.every(p=>p.startsWith('docs/')||p.startsWith('tools/')),changed.filter(p=>!p.startsWith('docs/')&&!p.startsWith('tools/')));
const main=rawJSON('remote-main'),feature=rawJSON('remote-feature');
check('main-still-product-base-and-feature-published-input',main.object.sha===base&&feature.object.sha===candidate,{main:main.object.sha,feature:feature.object.sha});
const issues=[57,101,110,111,112,113,114,116,117].map(n=>rawJSON(`issue-${n}`));
check('protected-g1-issues-all-open',issues.every(i=>i.state==='open'),issues.map(i=>({number:i.number,state:i.state,stateReason:i.state_reason})));
const getLabels=['remote-main','remote-feature',...[57,101,110,111,112,113,114,116,117].map(n=>`issue-${n}`)];
check('readonly-gh-payloads-complete-with-empty-stderr',getLabels.every(label=>readFileSync(`${prefix}/raw/${label}-stderr.txt`).length===0)&&issues.every(i=>i.id&&i.html_url&&i.state)&&main.object.sha&&feature.object.sha,{method:'GET',requests:getLabels.length,qualification:'Prior capture saved successful resource payloads before a later optional local path error; subprocess exit-code aggregation was not persisted in that interrupted helper.'});
const extraPaths=['tools/rust-r4ghi/.gitattributes','tools/rust-r4ghi/freeze-business-online01.mjs','tools/rust-r4ghi/freeze-business-input01.mjs'];
const extra=extraPaths.map(path=>({path,...save('inputs/'+path+'.bin',readFileSync(path))}));
const preflightRaw=[];
for(const d of ['tmp/rust-r4ghi/root/business-g1-preflight01','tmp/rust-r4ghi/root/business-g1-preflight02'])for(const name of readdirSync(d)){const path=`${d}/${name}`;preflightRaw.push({path,...save('inputs/'+path+'.bin',readFileSync(path))});}
const prior=inputJSON('tmp/rust-r4ghi/root/business-g1-preflight01/report.json'),retry=inputJSON('tmp/rust-r4ghi/root/business-g1-preflight02/report.json');
check('failed-preflight-is-preserved-and-narrowly-corrected',prior.passed===false&&retry.passed===true&&retry.prior.sha256===sha(input('tmp/rust-r4ghi/root/business-g1-preflight01/report.json'))&&retry.prior.classification==='tool-environment; WSL interpreter lacks jsonschema'&&retry.sourceManifestSHA256===expectedManifestSHA,{priorFailedLabels:prior.checks.filter(c=>!c.passed).map(c=>c.label),classification:retry.prior.classification});
const stdout=input('tmp/rust-r4ghi/root/business-g1-preflight02/stdout.bin'),stderr=input('tmp/rust-r4ghi/root/business-g1-preflight02/stderr.bin'),structure=JSON.parse(stdout);
check('41-actual-structural-checks-and-raw-hashes-verified',sha(stdout)===retry.retry.stdoutSHA256&&sha(stderr)===retry.retry.stderrSHA256&&structure.status==='PASS'&&structure.checks.length===41&&structure.checks.every(c=>c.passed)&&structure.G1Certified===false&&structure.G2Authorized===false,{checks:structure.checks.length,status:structure.status,stdoutSHA256:sha(stdout),stderrSHA256:sha(stderr)});
const failedPreflightEvidence=[];
for(const c of prior.checks.filter(c=>c.stdoutSHA256)){for(const stream of ['stdout','stderr']){const p=`tmp/rust-r4ghi/root/business-g1-preflight01/${c.label}-${stream}.bin`;const actual=sha(input(p));if(actual!==c[stream+'SHA256'])failedPreflightEvidence.push(p);}}
check('all-prior-preflight-raw-stream-hashes-match',!failedPreflightEvidence.length,failedPreflightEvidence);
const blue=inputJSON('tools/rust-r4ghi/joint-g1/effective-v2/blueprint.json'),ctx=inputJSON('tools/rust-r4ghi/joint-g1/effective-v2/source-context.schema.json'),op=inputJSON('docs/design/rust-r4ghi/operation-map01.json');
check('BG1-04-three-exact-whitelists-equal-with-full-impact-set',JSON.stringify(blue.inputPreEffectHash)===JSON.stringify(blue.ssot.sourceBeforeEffect)&&JSON.stringify(blue.inputPreEffectHash)===JSON.stringify(ctx['x-preEffectInputHashWhitelist'])&&typeof blue.inputPreEffectHash.fields.affectedProjects==='object',{fields:Object.keys(blue.inputPreEffectHash.fields),affectedProjects:blue.inputPreEffectHash.fields.affectedProjects});
check('operation-map-exact-blueprint-operations-and-hash',JSON.stringify(op.operations)===JSON.stringify(blue.operationMap)&&op.blueprintSHA256===sha(input('tools/rust-r4ghi/joint-g1/effective-v2/blueprint.json')),{operations:op.operations.length,blueprintSHA256:op.blueprintSHA256});
const finalGit=[];
for(const [label,args] of [['HEAD-final',['rev-parse','HEAD']],['manifest-git-object',['show',`${candidate}:${sourceManifest}`]],['attributes-git-object',['show',`${candidate}:tools/rust-r4ghi/.gitattributes`]]]){const r=spawnSync('git',args,{cwd:root,shell:false,windowsHide:true,maxBuffer:16*1024*1024});finalGit.push({label,exe:'git',args,exitCode:r.status,stdout:save(`raw/${label}-stdout.bin`,r.stdout),stderr:save(`raw/${label}-stderr.txt`,r.stderr)});check(label+'-valid',r.status===0&&(label==='HEAD-final'?r.stdout.toString().trim()===candidate:label==='manifest-git-object'?r.stdout.equals(manifestBytes):r.stdout.equals(input('tools/rust-r4ghi/.gitattributes'))),r.status);}
const comparison=[];
for(const label of ['preread01','preread02']){const old=JSON.parse(readFileSync(`${own}/${label}/candidate-inputs.json`));for(const e of entries){const p=old.records.find(p=>p.file===e.path&&p.exists);if(p)comparison.push({against:label,path:e.path,sameBytes:p.rawBytesSha256===e.localSHA256,beforeSHA256:p.rawBytesSha256,finalSHA256:e.localSHA256});}}
save('preread-final-comparison.json',Buffer.from(JSON.stringify(comparison,null,2)+'\n'));
save('candidate-inputs.json',Buffer.from(JSON.stringify({kind:'independent-final-fixed-input-capture',capturedAt:new Date().toISOString(),approvedInputCommit:candidate,productBase:base,sourceManifestSHA256:expectedManifestSHA,records:entries.map(e=>({file:e.path,bytes:e.localBytes,rawBytesSha256:e.localSHA256,copy:e.copy.file})),extra},null,2)+'\n'));
const rawCalls=readdirSync(`${prefix}/raw`).filter(n=>n.endsWith('-stdout.bin')).map(n=>({stdoutFile:`${prefix}/raw/${n}`,rawBytesSha256:sha(readFileSync(`${prefix}/raw/${n}`))}));
const report={kind:'independent-fixed-joint-g1-input-integrity-audit',capturedAt:new Date().toISOString(),inputCommit:candidate,productBase:base,sourceManifestSHA256:expectedManifestSHA,checks,entries,extra,preflightRaw,rawCalls,finalGit,remoteMain:main.object.sha,remoteFeature:feature.object.sha,issues:issues.map(({number,state,state_reason,html_url,updated_at})=>({number,state,stateReason:state_reason,url:html_url,updatedAt:updated_at})),G1Certified:false,G2Authorized:false};
save('integrity02.json',Buffer.from(JSON.stringify(report,null,2)+'\n'));
save('verifier-clarification02.json',Buffer.from(JSON.stringify({classification:'tool-noise',interruptedHelper:'capture-final01.mjs',cause:'Optional attributes path was supplied as tools/.gitattributes; actual file is tools/rust-r4ghi/.gitattributes. The interruption occurred after all223 source snapshots and Git/GitHub raw reads had completed.',resolution:'Retained every prior raw byte; complete-final02.mjs validates those reads, adds correct attributes/preflight evidence and checks immutable manifest/attributes Git bytes and final HEAD without rerunning product or SQL.',affectedProductEvidence:false,priorEvidenceOverwritten:false},null,2)+'\n'));
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),pins:entries.length,products:products.length,changedFromPreread02:comparison.filter(c=>c.against==='preread02'&&!c.sameBytes).map(c=>c.path),lineEndingDifferences:entries.filter(e=>!e.rawMatchesGit).map(e=>({path:e.path,lfEquivalent:e.lfEquivalent})),report:`${prefix}/integrity02.json`},null,2));
