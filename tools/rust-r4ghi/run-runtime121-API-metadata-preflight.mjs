// Actual metadata-only entry with nonsecret structured failure locations.
import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
assert.equal(process.argv.length,6);assert.deepEqual([process.argv[2],process.argv[4]],['--input','--input-sha']);
Error.prepareStackTrace=(_error,sites)=>sites.map(s=>({file:s.getFileName(),function:s.getFunctionName(),line:s.getLineNumber(),column:s.getColumnNumber()}));
const {mainAPI121}=await import(pathToFileURL(R+'/tools/rust-r4ghi/runtime-recovery121/root/start-api121.mjs').href);
try{await mainAPI121(['--prepare-request','--input',process.argv[3],'--input-sha',process.argv[5]]);}
catch(error){console.error(JSON.stringify({kind:'actual-API-metadata-preflight-stopped',name:error.name,code:error.code??null,frames:error.stack,assertionValuesPublished:false,APIStarted:false,RootReviewSigned:false,noAutomaticRetry:true}));process.exitCode=1;}
