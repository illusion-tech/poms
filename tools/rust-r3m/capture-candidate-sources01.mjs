// Root preserves exact admitted compile inputs before any later correction.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { guardCandidate, pin } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3m', state = '/home/wangzishi/.local/share/poms-r3m';
assert.equal(process.cwd(), root);const capsule=guardCandidate(),destination=state+'/artifacts/sources-'+capsule.label;assert(!fs.existsSync(destination));fs.mkdirSync(destination);
const rows=[];
for(const p of capsule.productFiles){assert(!path.isAbsolute(p.file)&&!p.file.split('/').includes('..'));assert.deepEqual(pin(p.file),p);const target=path.resolve(destination,...p.file.split('/'));assert(target.startsWith(destination+'/'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(p.file,target,fs.constants.COPYFILE_EXCL);assert.equal(pin(target).rawBytesSha256,p.rawBytesSha256);assert.deepEqual(pin(p.file),p);rows.push({original:p,snapshot:pin(target)});}
const file='tmp/rust-r3m/root/source-capsule-'+capsule.label+'01.json';fs.writeFileSync(file,JSON.stringify({kind:'R3-exact-candidate-compile-source-preservation',candidate:pin('tmp/rust-r3m/root/candidate-'+capsule.label+'.json'),destination,rows,allOriginalBytesEqual:true,privateOrDependencyCachesCopied:false,sourceOnlyNotAdditionalAcceptance:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({candidate:capsule.label,preservedCompileInputs:rows.length,allOriginalBytesEqual:true}));
