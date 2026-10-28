import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {validateSource,sourceHead} from './fixture-guard.mjs';
const require=createRequire(import.meta.url);
const runtime=require('../e2e/runtime.cjs');
const tag=process.argv[2];assert(/^[a-z0-9-]{1,35}$/.test(tag));assert.equal(process.argv.length,3);
const out=`tmp/rust-r2gh/nest-build-${tag}.json`,logPath=path.resolve(`tmp/rust-r2gh/nest-build-${tag}.log`);assert(!existsSync(out));
validateSource();
const pkgFile=require.resolve('nx/package.json');const pkg=JSON.parse(readFileSync(pkgFile));const nx=path.resolve(path.dirname(pkgFile),typeof pkg.bin==='string'?pkg.bin:pkg.bin.nx);
const env={...process.env,NX_DAEMON:'false',NX_TUI:'false',NX_SKIP_NX_CACHE:'true',DB_CONNECT:'false',NODE_ENV:'test',CI:'true'};
for(const k of Object.keys(env))if(/^(?:PG|DB_|MIKRO_)/i.test(k)||/^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/.test(k))delete env[k];
let result='fail';try{await runtime.runOwnedCommand({executable:process.execPath,args:[nx,'run','poms-api:build','--skip-nx-cache'],cwd:process.cwd(),env,logPath,timeoutMs:300000});result='pass';}
finally{validateSource();const binary='dist/apps/poms-api/main.js';const report={formatVersion:1,result,sourceHead,node:process.version,platform:process.platform,log:path.relative(process.cwd(),logPath),...(result==='pass'?{binary,sha256:createHash('sha256').update(readFileSync(binary)).digest('hex')}: {})};writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
