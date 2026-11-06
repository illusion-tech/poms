import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=resolve('.'), own='tools/rust-r4ghi/independent/business-g1/round02', out=resolve(own,'final01');
const candidate='9e010077e3010ff09447e9d77cb1bf1f7adbf68d', base='d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5';
const sourceManifest='docs/design/rust-r4ghi/g1-source-manifest01.json', expectedManifestSHA='89a2ebeba984320afe9b883910be742edb15e97ce19b409eab0c3b4372d27da9';
const sha=b=>createHash('sha256').update(b).digest('hex');
const checks=[],calls=[],check=(id,passed,observed)=>checks.push({id,passed:Boolean(passed),observed});
function save(file,b){const path=resolve(out,file);if(!path.startsWith(out+(process.platform==='win32'?'\\':'/')))throw new Error('outside owned output');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,b,{flag:'wx'});return{file:`${own}/final01/${file}`,bytes:b.length,rawBytesSha256:sha(b)};}
async function run(label,exe,args,input){const r=await new Promise((yes,no)=>{const p=spawn(exe,args,{cwd:root,shell:false,windowsHide:true});const so=[],se=[];p.stdout.on('data',b=>so.push(b));p.stderr.on('data',b=>se.push(b));p.on('error',no);p.on('close',exitCode=>yes({exitCode,stdout:Buffer.concat(so),stderr:Buffer.concat(se)}));p.stdin.end(input);});calls.push({label,exe,args,exitCode:r.exitCode,stdout:save(`raw/${label}-stdout.bin`,r.stdout),stderr:save(`raw/${label}-stderr.txt`,r.stderr)});check(label+'-exit',r.exitCode===0,r.exitCode);return r;}
const git=async(label,args,input)=>run(label,'git',args,input);
const gh=async(label,endpoint)=>JSON.parse((await run(label,'gh',['api','--method','GET',endpoint])).stdout);
const manifestBytes=readFileSync(sourceManifest), manifest=JSON.parse(manifestBytes);
const manifestInput=save('inputs/'+sourceManifest+'.bin',manifestBytes);
check('exact-requested-source-manifest',sha(manifestBytes)===expectedManifestSHA,{expected:expectedManifestSHA,actual:sha(manifestBytes)});
check('223-unique-manifest-records',manifest.entries.length===223&&new Set(manifest.entries.map(e=>e.path)).size===223,manifest.entries.length);
const entries=manifest.entries.map(e=>{if(/[\r\n]/.test(e.path)||resolve(e.path).startsWith(root+(process.platform==='win32'?'\\':'/'))===false)throw new Error('unsafe input path');const b=readFileSync(e.path),copy=save('inputs/'+e.path+'.bin',b);return{...e,localBytes:b.length,localSHA256:sha(b),matches:e.bytes===b.length&&e.sha256===sha(b),stableAcrossRead:sha(readFileSync(e.path))===sha(b),copy};});
check('223-current-raw-byte-pins',entries.every(e=>e.matches&&e.stableAcrossRead),entries.filter(e=>!e.matches||!e.stableAcrossRead));
const products=entries.filter(e=>e.role==='unchanged-product-source');
check('133-unchanged-product-pins',products.length===133,products.length);
const queries=[...entries.map(e=>`${candidate}:${e.path}`),...products.map(e=>`${base}:${e.path}`)];
const [head,branch,status,diffPaths,batchCheck,main,feature,...issues]=await Promise.all([
git('local-head',['rev-parse','HEAD']),git('local-branch',['branch','--show-current']),git('local-status',['status','--short']),git('candidate-changed-paths',['diff','--name-only',base,candidate]),
git('candidate-and-base-blob-identities',['cat-file','--batch-check'],Buffer.from(queries.join('\n')+'\n')),
gh('remote-main','repos/illusion-tech/poms/git/ref/heads/main'),gh('remote-feature','repos/illusion-tech/poms/git/ref/heads/codex/poms-r4ghi-next25'),
...[57,101,110,111,112,113,114,116,117].map(n=>gh('issue-'+n,`repos/illusion-tech/poms/issues/${n}`))
]);
check('HEAD-is-requested-candidate',head.stdout.toString().trim()===candidate,head.stdout.toString().trim());
const changed=diffPaths.stdout.toString().trim().split(/\r?\n/).filter(Boolean);
check('candidate-has-no-product-edits',changed.every(p=>p.startsWith('docs/')||p.startsWith('tools/')),changed.filter(p=>!p.startsWith('docs/')&&!p.startsWith('tools/')));
check('remote-main-remains-product-base',main.object.sha===base,main.object.sha);
check('remote-feature-publishes-candidate',feature.object.sha===candidate,feature.object.sha);
check('protected-g1-parent-and-child-issues-open',issues.every(i=>i.state==='open'),issues.map(i=>({number:i.number,state:i.state,stateReason:i.state_reason,updatedAt:i.updated_at})));
const blobLines=batchCheck.stdout.toString().trim().split(/\r?\n/);
check('all-blob-queries-resolve',blobLines.length===queries.length&&blobLines.every(s=>/^[0-9a-f]{40} blob [0-9]+$/.test(s)),{queries:queries.length,lines:blobLines.length,bad:blobLines.filter(s=>!/^[0-9a-f]{40} blob [0-9]+$/.test(s))});
entries.forEach((e,i)=>{e.candidateGitBlob=blobLines[i]?.split(' ')[0];});
products.forEach((e,i)=>{e.baseGitBlob=blobLines[entries.length+i]?.split(' ')[0];e.baseAndCandidateGitBlobSame=e.candidateGitBlob===e.baseGitBlob&&e.gitBlob===e.baseGitBlob&&e.gitBase===base;});
check('133-product-blobs-match-base-and-recorded-identities',products.every(e=>e.baseAndCandidateGitBlobSame),products.filter(e=>!e.baseAndCandidateGitBlobSame));
const candidateBlobs=await git('candidate-input-object-bytes',['cat-file','--batch'],Buffer.from(entries.map(e=>e.candidateGitBlob).join('\n')+'\n'));
let offset=0;
for(const e of entries){const nl=candidateBlobs.stdout.indexOf(10,offset);const header=candidateBlobs.stdout.subarray(offset,nl).toString();const [blob,type,sizeText]=header.split(' '),size=Number(sizeText);if(blob!==e.candidateGitBlob||type!=='blob'||!Number.isSafeInteger(size))throw new Error('invalid batch blob framing');const bytes=candidateBlobs.stdout.subarray(nl+1,nl+1+size);offset=nl+1+size+1;e.candidateGitBytes=size;e.candidateGitSHA256=sha(bytes);e.rawMatchesGit=e.localSHA256===e.candidateGitSHA256;if(!e.rawMatchesGit){const local=readFileSync(e.path);e.lfEquivalent=local.toString('utf8').replace(/\r\n/g,'\n')===bytes.toString('utf8').replace(/\r\n/g,'\n');save('git-inputs/'+e.path+'.bin',bytes);}}
check('223-candidate-objects-match-pinned-bytes-or-explicit-CRLF',entries.every(e=>e.rawMatchesGit||e.lfEquivalent===true),entries.filter(e=>!e.rawMatchesGit).map(({path,role,lfEquivalent,localSHA256,candidateGitSHA256})=>({path,role,lfEquivalent,localSHA256,candidateGitSHA256})));
check('all-effective-v2-inputs-exact-commit-bytes',entries.filter(e=>e.path.startsWith('tools/rust-r4ghi/joint-g1/effective-v2/')).every(e=>e.rawMatchesGit),entries.filter(e=>e.path.startsWith('tools/rust-r4ghi/joint-g1/effective-v2/')&&!e.rawMatchesGit).map(e=>e.path));
const extraPaths=['tools/.gitattributes','tools/rust-r4ghi/freeze-business-online01.mjs','tools/rust-r4ghi/freeze-business-input01.mjs','tmp/rust-r4ghi/root/business-g1-preflight01/report.json','tmp/rust-r4ghi/root/business-g1-preflight02/report.json'];
const extra=extraPaths.map(path=>{const b=readFileSync(path);return{path,...save('inputs/'+path+'.bin',b)};});
const prior=JSON.parse(readFileSync('tmp/rust-r4ghi/root/business-g1-preflight01/report.json'));
const retry=JSON.parse(readFileSync('tmp/rust-r4ghi/root/business-g1-preflight02/report.json'));
check('prior-preflight-preserved-and-correction-valid',prior.passed===false&&retry.passed===true&&retry.prior.sha256===extra.find(e=>e.path.endsWith('preflight01/report.json')).rawBytesSha256&&retry.sourceManifestSHA256===expectedManifestSHA&&retry.retry.status==='PASS'&&retry.retry.checks===41&&retry.G1Certified===false&&retry.G2Authorized===false,{priorFailedLabels:prior.checks.filter(c=>!c.passed).map(c=>c.label),retry:retry.retry,status:retry.prior.classification});
const receiptDir='tmp/rust-r4ghi/root/business-g1-preflight02';
const priorDir='tmp/rust-r4ghi/root/business-g1-preflight01';
const {readdirSync}=await import('node:fs');
const evidenceFiles=[...readdirSync(receiptDir).map(f=>`${receiptDir}/${f}`),...readdirSync(priorDir).map(f=>`${priorDir}/${f}`)].filter(p=>!extraPaths.includes(p));
const preflightRaw=evidenceFiles.map(path=>({path,...save('inputs/'+path+'.bin',readFileSync(path))}));
check('retry-stdout-stderr-raw-evidence-present',preflightRaw.some(e=>e.rawBytesSha256===retry.retry.stdoutSHA256)&&preflightRaw.some(e=>e.rawBytesSha256===retry.retry.stderrSHA256),preflightRaw.filter(e=>e.path.startsWith(receiptDir)).map(({path,rawBytesSha256})=>({path,rawBytesSha256})));
const comparison=[];
for(const label of ['preread01','preread02']){const previous=JSON.parse(readFileSync(`${own}/${label}/candidate-inputs.json`));for(const e of entries){const p=previous.records.find(p=>p.file===e.path&&p.exists);if(p)comparison.push({against:label,path:e.path,sameBytes:p.rawBytesSha256===e.localSHA256,beforeSHA256:p.rawBytesSha256,finalSHA256:e.localSHA256});}}
save('preread-final-comparison.json',Buffer.from(JSON.stringify(comparison,null,2)+'\n'));
const finalPins=entries.map(e=>({file:e.path,exists:true,bytes:e.localBytes,rawBytesSha256:e.localSHA256,copy:e.copy.file,stableAcrossRead:e.stableAcrossRead}));
save('candidate-inputs.json',Buffer.from(JSON.stringify({kind:'independent-final-fixed-input-capture',capturedAt:new Date().toISOString(),approvedInputCommit:candidate,productBase:base,sourceManifestSHA256:expectedManifestSHA,sourceManifest:manifestInput,records:finalPins,extra},null,2)+'\n'));
const report={kind:'independent-fixed-joint-g1-input-integrity-audit',capturedAt:new Date().toISOString(),inputCommit:candidate,productBase:base,sourceManifestSHA256:expectedManifestSHA,checks,entries,extra,preflightRaw,calls,remoteMain:main.object.sha,remoteFeature:feature.object.sha,issues:issues.map(({number,state,state_reason,html_url,updated_at})=>({number,state,stateReason:state_reason,url:html_url,updatedAt:updated_at})),G1Certified:false,G2Authorized:false};
save('integrity01.json',Buffer.from(JSON.stringify(report,null,2)+'\n'));
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),pins:entries.length,products:products.length,changedFromPreread02:comparison.filter(c=>c.against==='preread02'&&!c.sameBytes).map(c=>c.path),lineEndingDifferences:entries.filter(e=>!e.rawMatchesGit).map(e=>({path:e.path,lfEquivalent:e.lfEquivalent})),report:`${own}/final01/integrity01.json`},null,2));
