import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const mode = process.argv[2], edition = process.argv[3] ?? '33';
const commands = {
 'admin-build': ['node_modules/nx/dist/bin/nx.js','build','poms-admin','--outputPath=tmp/rust-r4def/root/admin-build'+edition+'/output','--skip-nx-cache'],
 'handover-test': ['node_modules/nx/dist/bin/nx.js','test','poms-admin','--runInBand','--testPathPatterns=project-contract-handover.spec.ts','--skip-nx-cache'],
 'native-tsc': ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'apps/poms-api/tsconfig.app.json'],
 'native-lint': ['node_modules/nx/dist/bin/nx.js','lint','poms-api','--skip-nx-cache'],
 'native-build': ['node_modules/nx/dist/bin/nx.js','build','poms-api','--skip-nx-cache'],
 'native-test': ['node_modules/nx/dist/bin/nx.js','test','poms-api','--runInBand','--skip-nx-cache'],
 'admin-lint': ['node_modules/nx/dist/bin/nx.js','lint','poms-admin','--skip-nx-cache'],
 'admin-test': ['node_modules/nx/dist/bin/nx.js','test','poms-admin','--runInBand','--skip-nx-cache'],
 'data-lint': ['node_modules/nx/dist/bin/nx.js','lint','admin-data-access','--skip-nx-cache'],
 'data-test': ['node_modules/nx/dist/bin/nx.js','test','admin-data-access','--runInBand','--skip-nx-cache'],
 'contracts-test': ['node_modules/nx/dist/bin/nx.js','test','shared-contracts','--runInBand','--skip-nx-cache'],
};
assert(commands[mode]); assert(/^\d+[a-z]?$/.test(edition));
const out = `tmp/rust-r4def/root/${mode}${edition}`; assert(!fs.existsSync(out)); fs.mkdirSync(out,{recursive:true});
const fd = fs.openSync(out+'/console-original.bin','wx');
let r; const startedAt=new Date().toISOString();
try { r=spawnSync(process.execPath, commands[mode], {cwd:process.cwd(),env:{...process.env,NX_DAEMON:'false',NX_PARALLEL:'2',CI:'true',TZ:'UTC',NODE_OPTIONS:mode==='native-test'?'--experimental-vm-modules':'',npm_config_manage_package_manager_versions:'false',COREPACK_ENABLE_AUTO_PIN:'0'},windowsHide:true,stdio:['ignore',fd,fd],timeout:600000}); }
finally {fs.closeSync(fd);}
const receipt={mode,startedAt,completedAt:new Date().toISOString(),args:commands[mode],exitCode:r.status,errorName:r.error?.name??null};
fs.writeFileSync(out+'/receipt33.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'}); console.log(JSON.stringify(receipt));
if(r.status!==0){console.log(fs.readFileSync(out+'/console-original.bin','utf8').slice(-6000));process.exitCode=1;}
