// Package already-built artifacts and the target's actual pending migrations.
// This performs no database write, service operation, or remote deployment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const directory=path.join(root,'apps/poms-api-rust/target/delivery-dependencies');
const smoke=JSON.parse(fs.readFileSync(path.join(directory,'bookworm-release-network-smoke-01.json')));
const revision=smoke.source;
if(!/^[0-9a-f]{40}$/.test(revision))throw new Error('Missing actual artifact source revision');
const name='poms-rust-candidate-'+revision.slice(0,8)+'-bookworm';
const stage=path.join(directory,name);
const archive=path.join(directory,name+'.tar.gz');
if(fs.existsSync(stage)||fs.existsSync(archive))throw new Error('Preserve the existing candidate; choose a new reviewed output');
const state=JSON.parse(fs.readFileSync(path.join(directory,'test-target-readonly-metadata-03.json')));
const target=JSON.parse(fs.readFileSync(path.join(directory,'bookworm-target-abi-smoke-01.json')));
if(!smoke.passed||!target.candidateRan||!state.metadataRead||!Array.isArray(state.pendingInCheckout))throw new Error('Actual release, target and migration results are required');
fs.mkdirSync(stage);
for(const dir of ['api','migrations','migrations-up'])fs.mkdirSync(path.join(stage,dir));
fs.copyFileSync(path.join(directory,'poms-api-rust-bookworm-'+revision.slice(0,8)),path.join(stage,'api/poms-api-rust'));
fs.copyFileSync(path.join(directory,'openapi-linux'+smoke.operations+'.json'),path.join(stage,'api/openapi.json'));
const frontend=path.resolve(process.argv[2]??path.join(directory,'commission-admin-build-05/dist'));
fs.cpSync(path.join(frontend,'browser'),path.join(stage,'admin/browser'),{recursive:true});
const license=path.join(frontend,'3rdpartylicenses.txt');
if(fs.existsSync(license))fs.copyFileSync(license,path.join(stage,'LICENSES.admin.txt'));
fs.copyFileSync(path.join(root,'docs/design/rust-linux-candidate-2026-11-18.md'),path.join(stage,'README.md'));
fs.copyFileSync(path.join(root,'deploy/pm2/poms-api-rust-test.ecosystem.config.cjs'),path.join(stage,'poms-api-rust-test.ecosystem.config.cjs'));
fs.writeFileSync(path.join(stage,'target-state.json'),JSON.stringify(state,null,2)+'\n');
for(const migration of state.pendingInCheckout){
 if(!/^Migration[0-9]+_[a-z0-9_]+$/.test(migration))throw new Error('Unexpected target migration name');
 const source=fs.readFileSync(path.join(root,'apps/poms-api/src/migrations',migration+'.ts'),'utf8');
 const generated=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(generated.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw new Error('Migration transpilation failed');
 fs.writeFileSync(path.join(stage,'migrations',migration+'.js'),generated.outputText);
 const sql=execFileSync(process.execPath,['tools/rust-commission/emit-test-schema.cjs','--only',migration+'.ts'],{cwd:root,encoding:'utf8',windowsHide:true});
 fs.writeFileSync(path.join(stage,'migrations-up',migration+'.sql'),sql);
}
const linuxPath=file=>'/mnt/'+file[0].toLowerCase()+file.slice(2).split(path.sep).join('/');
const python=`from pathlib import Path
import sys,tarfile
source=Path(sys.argv[1]); target=Path(sys.argv[2])
def permissions(info):
 info.uid=info.gid=0; info.uname=info.gname='root'
 info.mode=0o755 if info.isdir() or info.name=='api/poms-api-rust' else 0o644
 return info
with tarfile.open(target,'x:gz') as archive:
 for entry in sorted(source.iterdir()): archive.add(entry,arcname=entry.name,filter=permissions)
print(target.stat().st_size)
`;
const bytes=execFileSync('wsl.exe',['-d','Debian','--exec','/usr/bin/python3','-c',python,linuxPath(stage),linuxPath(archive)],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
console.log(JSON.stringify({archive,bytes:Number(bytes),source:revision,pendingMigrations:state.pendingInCheckout.length,deployed:false}));
