import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { proposeS5, buildS5Manifest } from './full-build08.candidate.mjs';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms';const out=dirname(fileURLToPath(import.meta.url));
const legacy=await import(pathToFileURL(resolve(root,'tools/rust-r1b/export-shared.mjs')).href);
const prior=JSON.parse(readFileSync(resolve(root,'tools/rust-r1b/shared-manifest.json'),'utf8'));
const proposed=proposeS5(root,prior);
const manifest=buildS5Manifest(root,proposed.registry,proposed.identity,{candidate:true});
for(const [name,value] of [['s3-nominal-identity08.json',proposed.identity],['s5-registry08.candidate.json',proposed.registry],['registrations08.json',proposed.registration],['manifest08.candidate.json',manifest]])writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n');
for(const [path,text] of legacy.artifacts(manifest)){const dest=resolve(out,'proposal-poms',path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,text);}
console.log(JSON.stringify({coverage:manifest.coverage,files:[...legacy.artifacts(manifest)].map(([path,text])=>({path,sha256:createHash('sha256').update(text).digest('hex')})),sourceHead:manifest.authority.sourceHead,status:manifest.authority.mode},null,2));
