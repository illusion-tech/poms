import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [commit,tag,manifestFile]=process.argv.slice(2);assert(/^[0-9a-f]{40}$/.test(commit)&&/^[a-z0-9-]{1,35}$/.test(tag)&&manifestFile);
const out=`tmp/rust-r2ij/integration-${tag}.json`;assert(!existsSync(out));const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(args,options={})=>execFileSync('git',args,{maxBuffer:32*1024*1024,...options});
assert.equal(git(['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);const parent=git(['rev-parse',commit+'^'],{encoding:'utf8'}).trim();
const manifest=JSON.parse(readFileSync(manifestFile)),reviewed=new Map(manifest.files.map(row=>[row.file,row]));
const changed=git(['diff','--name-only','-z',parent,commit]).toString('utf8').split('\0').filter(Boolean),files=[];
for(const file of changed){const blob=git(['show',commit+':'+file]),working=readFileSync(file);assert.equal(sha(blob),sha(working),'Commit/worktree byte mismatch: '+file);const original=reviewed.get(file);if(original)assert.equal(sha(blob),original.rawBytesSha256,'Commit/reviewed snapshot mismatch: '+file);files.push({file,bytes:blob.length,commitBlobSha256:sha(blob),workingTreeSame:true,reviewedSnapshotSame:!!original,metadataOutsideFirstArchive:!original});}
const metadataOnly=files.filter(row=>!row.reviewedSnapshotSame);assert(metadataOnly.every(row=>/^docs\/design\/rust-r2ij-(?:review[0-9]*|preservation|source-manifest)\.json$/.test(row.file)),'Undeclared source outside reviewed snapshot');
const protectedScopes=['apps/poms-api/src','apps/poms-admin/src','libs/shared/contracts/src','libs/api/contracts/src','libs/shared/api-spec','libs/shared/api-client','package.json','pnpm-lock.yaml'];
assert.equal(git(['diff','61d6df1e971e7e785382dc85c75273e584ee2545',commit,'--',...protectedScopes],{encoding:'utf8'}),'');
const report={formatVersion:1,result:'pass',at:new Date().toISOString(),commit,parent,subject:git(['show','-s','--format=%s',commit],{encoding:'utf8'}).trim(),boundary:'Read-only exact implementation commit/blob-to-working-tree/reviewed-snapshot integrity. No new DB/HTTP/UI execution claimed.',reviewedManifest:{file:manifestFile,sha256:sha(readFileSync(manifestFile)),files:manifest.files.length},files,changedFiles:files.length,reviewedSnapshotMatches:files.length-metadataOnly.length,explicitAdditiveMetadata:metadataOnly,originalProductTreesUnchanged:true};
writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',commit,changedFiles:files.length,reviewedSnapshotMatches:report.reviewedSnapshotMatches,additiveMetadata:metadataOnly.map(row=>row.file)}));
