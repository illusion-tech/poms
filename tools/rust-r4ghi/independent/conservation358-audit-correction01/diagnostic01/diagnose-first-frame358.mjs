// One authorized files-only diagnosis. Mirror is not an acceptance source.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
Error.prepareStackTrace=(_error,sites)=>sites.map(s=>({file:s.getFileName(),function:s.getFunctionName(),line:s.getLineNumber(),column:s.getColumnNumber()}));
const sha=b=>createHash('sha256').update(b).digest('hex');
const SOURCE={"file":"/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/fresh-conservation358-audit-source01/audit-fresh-conservation358.mjs","bytes":34911,"rawBytesSha256":"bdfa9251cddb3e16b4d563a8b4bdde21e2e51f39b74486c6dc53fb10e82b8b73"};
const MIRROR={"file":"/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/fresh-conservation358-diagnostic01/audit-export-only.mjs","bytes":34935,"rawBytesSha256":"969a5075b55ccd304d782c9564459088fb65e726828fd4b32ffafd11654a927e"};
const SPEC={"file":"/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/round358-conservation-audit-spec01/spec.json","bytes":2397,"rawBytesSha256":"52be70cbc9206069d3bab63c96931e8971de6d5e1ba9493b192bcfdf2ab73974"};
function readPin(p){const s=fs.lstatSync(p.file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);assert.equal(fs.realpathSync(p.file),p.file);const b=fs.readFileSync(p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256);return b;}
try{
assert.equal(process.argv.length,3);assert.equal(process.argv[2],'--diagnose');assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms');assert.equal(process.getuid(),1000);assert.equal(process.version,'v24.19.0');assert.equal(process.execPath,'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node');assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const source=readPin(SOURCE),mirror=readPin(MIRROR),specBytes=readPin(SPEC),suffix=Buffer.from('export {auditFresh358};\n');assert(mirror.subarray(0,source.length).equals(source));assert(mirror.subarray(source.length).equals(suffix));
const module=await import(pathToFileURL(MIRROR.file).href);assert.equal(typeof module.auditFresh358,'function');module.auditFresh358(JSON.parse(specBytes.toString('utf8')),SPEC);console.log(JSON.stringify({diagnosticOnly:true,functionReturned:true,acceptanceEvidenceIssued:false}));
}catch(error){const frames=Array.isArray(error.stack)?error.stack:[];console.error(JSON.stringify({name:typeof error.name==='string'?error.name:'Error',code:typeof error.code==='string'?error.code:null,frames}));process.exitCode=1;}
