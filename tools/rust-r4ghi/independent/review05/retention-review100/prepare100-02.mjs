import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';import{fileURLToPath}from'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),old=fs.readFileSync(dir+'/verify100.mjs','utf8');
const needle="if(c.before)read(dir+'/'+c.before,c.beforeSHA256);";
assert.equal(old.split(needle).length,2);
const replacement="if(c.before){ const local=dir+'/'+c.before;if(fs.existsSync(local))read(local,c.beforeSHA256);else{const previous=JSON.parse(fs.readFileSync(base+'/manifest139-140.json')).candidates.find(v=>v.target===c.target);assert.equal(previous.before,c.before);assert.equal(previous.beforeSHA256,c.beforeSHA256);read(base+'/'+previous.before,c.beforeSHA256);}}";
fs.writeFileSync(dir+'/verify100-02.mjs',old.replace(needle,replacement),{flag:'wx'});
fs.writeFileSync(dir+'/attempt01-reviewer-predecessor-path-stop.json',JSON.stringify({kind:'reviewer-input-path-assumption-stop',stage:'before-sidecar-read',error:'ENOENT',reason:'02 references original before descriptors; original immutable33e stores those bytes. No candidate import or synthetic test had started.',correction:'Verify original33e manifest hash and exact same target/before/hash before resolving its original sidecar.',candidateChanged:false,RootWritten:false,SQL:0,HTTP:0,processActions:0},null,2)+'\n',{flag:'wx'});
