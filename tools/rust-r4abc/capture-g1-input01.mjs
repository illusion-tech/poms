// Static current-source inventory. No service, database, browser, or GitHub execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url), ts = require('typescript');
const out = 'docs/design/rust-r4abc/inputs';
assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const pin = file => { const b = fs.readFileSync(file); return {file, bytes:b.length, rawBytesSha256:sha(b)}; };
const native = JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json', 'utf8'));
const canonicalFile = 'docs/design/api-route-canonical-inventory.md';
const canonical = fs.readFileSync(canonicalFile, 'utf8').split(/\r?\n/).flatMap((line,i) => {
  if (!line.startsWith('| `')) return [];
  const cells = line.split('|').slice(1,-1).map(s=>s.trim().replaceAll('`',''));
  return cells[2] && /^(GET|POST|PATCH|PUT|DELETE) \/\S+/.test(cells[2]) ? [{line:i+1, domain:cells[0], capability:cells[1], key:cells[2], status:cells.at(-1)}] : [];
});
const groups = [
  ['A',103,['contract-readiness/contract-readiness.controller.ts']],
  ['B',104,['contract/contract.controller.ts','contract/contract-term-snapshot.controller.ts']],
  ['C',105,['contract-finance/contract-finance.controller.ts']]
];
const ops=[];
const decorators = n => ts.canHaveDecorators(n) ? ts.getDecorators(n)??[] : [];
const call = d => ts.isCallExpression(d.expression) ? d.expression : undefined;
const callName = d => call(d)?.expression?.getText();
const argString = d => call(d)?.arguments?.[0] && ts.isStringLiteralLike(call(d).arguments[0]) ? call(d).arguments[0].text : '';
for (const [group,issue,files] of groups) for (const rel of files) {
  const file='apps/poms-api/src/app/features/'+rel;
  const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  for (const cl of ast.statements.filter(ts.isClassDeclaration)) {
    const control=decorators(cl).find(d=>callName(d)==='Controller'); if(!control) continue;
    const prefix=argString(control);
    for (const member of cl.members.filter(ts.isMethodDeclaration)) {
      const verb=decorators(member).find(d=>['Get','Post','Patch','Put','Delete'].includes(callName(d))); if(!verb) continue;
      const method=callName(verb).toUpperCase();
      const route=('/api/'+[prefix,argString(verb)].filter(Boolean).join('/')).replace(/(^|\/)\:([A-Za-z_][\w]*)/g,'$1{$2}').replaceAll('\\:',':');
      const spec=native.paths[route]?.[method.toLowerCase()]; assert(spec,`${method} ${route} absent from current spec`);
      const key=method+' '+route.slice(4);
      const rows=canonical.filter(r=>r.key===key); assert.equal(rows.length,1,`${key} canonical uniqueness`); assert.equal(rows[0].status,'aligned');
      const permission=decorators(member).find(d=>callName(d)==='HasPermissions');
      ops.push({group,issue,method,path:route,key,operationId:spec.operationId,controller:cl.name?.text,handler:member.name.getText(),controllerFile:file,controllerLine:ast.getLineAndCharacterOfPosition(member.getStart()).line+1,canonical:rows[0],permission:permission?argString(permission):null,parameters:spec.parameters??[],requestBody:spec.requestBody??null,responses:spec.responses,security:spec.security??native.security??[]});
    }
  }
}
assert.equal(ops.length,37); assert.equal(new Set(ops.map(o=>o.key)).size,37); assert.equal(new Set(ops.map(o=>o.operationId)).size,37);
for(const [g,n] of [['A',9],['B',9],['C',19]]) assert.equal(ops.filter(o=>o.group===g).length,n);
const oldRustFile='docs/design/archive/slices/rust-r3m/evidence/integrity01/rust-openapi-stdout-original.bin';
const rust=JSON.parse(fs.readFileSync(oldRustFile,'utf8'));
const rustOps=Object.entries(rust.paths).flatMap(([p,v])=>Object.keys(v).filter(m=>['get','post','patch','put','delete','options','head'].includes(m)).map(m=>m.toUpperCase()+' '+p));
assert.equal(rustOps.length,173); const overlap=ops.filter(o=>rustOps.includes(o.method+' '+o.path)); assert.equal(overlap.length,0);
const schemas=new Set();
function walk(v){if(Array.isArray(v))return v.forEach(walk);if(!v||typeof v!=='object')return;if(typeof v.$ref==='string'&&v.$ref.startsWith('#/components/schemas/')){const name=v.$ref.split('/').at(-1);if(!schemas.has(name)){schemas.add(name);assert(native.components.schemas[name]);walk(native.components.schemas[name]);}}for(const x of Object.values(v))walk(x);}
ops.forEach(walk);
const surface={kind:'R4-first37-current-AST-spec-canonical-join',evidenceClass:'static-input-only',base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),counts:{A:9,B:9,C:19,total:37,existingRust:173,overlap:0,newToRust:37,transitiveSchemas:schemas.size},sourcePins:[...groups.flatMap(g=>g[2].map(f=>pin('apps/poms-api/src/app/features/'+f))),pin('libs/shared/api-spec/openapi.json'),pin(canonicalFile),pin(oldRustFile)],operations:ops,schemas:Object.fromEntries([...schemas].sort().map(n=>[n,native.components.schemas[n]])),claims:{G1Certified:false,G2Authorized:false,runtimeExecuted:false,oldNativeSchemaPreserved:true,newDtoChangesRequireDeclaredFreeze:true}};
fs.writeFileSync(out+'/surface37-source01.json',JSON.stringify(surface,null,2)+'\n',{flag:'wx'});
const sourcePaths=new Set();
for(const file of ['tmp/rust-r4abc/input-a/source-manifest-a02.json','tmp/rust-r4abc/input-b/source-manifest.json','tmp/rust-r4abc/input-c/source-manifest01.json']) {
  const m=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const f of m.sourceFiles??m.files) {const p=f.path??f.file??f.sourcePath??f.relativePath;assert(typeof p==='string',JSON.stringify(f));sourcePaths.add(p.replaceAll('\\','/'));}
}
const sources=[];
for(const file of [...sourcePaths].sort()) {
  assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));assert(!/private|\.env/.test(file),'Static source only');
  const original=fs.readFileSync(file);const dest=out+'/source-originals/'+file+'.bin';fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,original,{flag:'wx'});sources.push({...pin(file),originalBytesFile:dest});
}
fs.writeFileSync(out+'/source-union01.json',JSON.stringify({kind:'deduplicated-current-static-originals',base:surface.base,count:sources.length,totalBytes:sources.reduce((a,b)=>a+b.bytes,0),sources},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({counts:surface.counts,sourceUnion:sources.length,surface:pin(out+'/surface37-source01.json')}));
