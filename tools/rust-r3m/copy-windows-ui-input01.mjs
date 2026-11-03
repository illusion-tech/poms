import fs from 'node:fs';import assert from 'node:assert/strict';import{pin}from'./source-guard.mjs';
assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r3m');
const[label]=process.argv.slice(2);assert(/^windows-(native|rust)\d{2}$/.test(label));
const file='tmp/rust-r3m/ui-input-'+label+'.json',input=JSON.parse(fs.readFileSync(file));assert(input.completed&&input.label===label);
const source='/home/wangzishi/.local/share/poms-r3m/private/acceptance-'+input.backend+'-'+input.runId+'/ui-'+label+'-input.json';
const target='/mnt/c/Users/ynh2/AppData/Local/poms-r3m/private/ui-'+label+'-input.json';assert(!fs.existsSync(target));
fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({label,publicInput:pin(file),currentBatchPrivateInputCopied:true,credentialValuesPublished:false}));
