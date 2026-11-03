// Read-only binding of the actual Linux API process used by a browser cell.
import fs from'node:fs';import assert from'node:assert/strict';import{pin,sha,guardCandidate}from'./source-guard.mjs';
assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r3m');
const[backend]=process.argv.slice(2);assert(['nest','rust'].includes(backend));
const state='/home/wangzishi/.local/share/poms-r3m',r=JSON.parse(fs.readFileSync(state+'/private/'+backend+'-final02.json'));
const stat=fs.readFileSync('/proc/'+r.pid+'/stat','utf8').slice(fs.readFileSync('/proc/'+r.pid+'/stat','utf8').lastIndexOf(')')+2).split(' ');
assert.equal(String(stat[19]),String(r.startTime));assert.equal(sha(fs.readFileSync('/proc/'+r.pid+'/cmdline')),r.argvSha256);
assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),r.bootId);assert.equal(pin(r.entry).rawBytesSha256,r.artifactSha256);
guardCandidate();console.log(JSON.stringify({...r,liveIdentityVerifiedAt:new Date().toISOString(),actualServerPlatform:'linux',entryPin:pin(r.entry)}));
