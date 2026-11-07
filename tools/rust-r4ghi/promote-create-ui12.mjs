import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const mode=process.argv[2];assert(['--native','--ui'].includes(mode));
if(mode==='--ui'){
 const actual=JSON.parse(fs.readFileSync('tmp/rust-r4ghi/root/client-generation06/receipt.json'));
 assert.equal(actual.sourceHead,'2cd1be6029cf1b14ebfb1fc4530af894507a4c5a');assert.equal(actual.writeAndCheckPassed,true);
 const ts=createRequire(import.meta.url)('typescript'),generated=fs.readFileSync('libs/shared/api-client/model/project-initial-ownership.ts','utf8');
 const ast=ts.createSourceFile('project-initial-ownership.ts',generated,ts.ScriptTarget.Latest,true);
 const declaration=ast.statements.find(n=>ts.isEnumDeclaration(n)&&n.name.text==='ProjectInitialOwnership');assert(declaration);
 assert.deepEqual(declaration.members.map(n=>[n.name.getText(ast),n.initializer.text]),[['Creator','creator'],['Organization','organization']]);
 const request=ts.createSourceFile('create-project-request.ts',fs.readFileSync('libs/shared/api-client/model/create-project-request.ts','utf8'),ts.ScriptTarget.Latest,true);
 const input=request.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='CreateProjectRequest');assert(input);
 const field=input.members.find(n=>n.name?.getText(request)==='initialOwnership');assert(field?.questionToken);assert.equal(field.type.getText(request),'ProjectInitialOwnership');
}
const sha=b=>createHash('sha256').update(b).digest('hex'),rel='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/create-ui12',author='E:/projects/worktrees/poms-r4h-signals/poms/'+rel;
const raw=fs.readFileSync(author+'/manifest-ui12.json');assert.equal(sha(raw),'440e11946fda21de6f37b19015aa30541def8d123391ba2636b1bbb889e4d360');
const m=JSON.parse(raw);assert.equal(m.files.length,13);assert.equal(m.products.length,4);
for(const f of m.files){assert(!f.file.split('/').includes('..')&&!path.isAbsolute(f.file));const b=fs.readFileSync(author+'/'+f.file);assert.equal(sha(b),f.rawBytesSha256);assert.equal(b.length,f.bytes);}
for(const f of [...m.files,{file:'manifest-ui12.json',rawBytesSha256:sha(raw)}]){const to=rel+'/'+f.file,b=fs.readFileSync(author+'/'+f.file);if(fs.existsSync(to))assert.equal(sha(fs.readFileSync(to)),sha(b));else{fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,b,{flag:'wx'});}}
const changes=m.products.filter(f=>mode==='--native'?f.file.startsWith('apps/poms-api/'):!f.file.startsWith('apps/poms-api/')).map(f=>{const b=fs.readFileSync(rel+'/'+f.candidateFile);assert.equal(sha(fs.readFileSync(f.file)),f.originalSHA256);assert.equal(sha(b),f.candidateSHA256);return{f,b};});
assert.equal(changes.length,mode==='--native'?1:3);for(const{f,b}of changes)fs.writeFileSync(f.file,b);
const receipt='docs/design/rust-r4ghi/create-ui12-'+mode.slice(2)+'-promotion.json';
fs.writeFileSync(receipt,JSON.stringify({kind:'Root-non-author-reviewed-create-ownership-entry-promotion',capturedAt:new Date().toISOString(),manifest:rel+'/manifest-ui12.json',manifestSHA256:sha(raw),mode,files:changes.map(x=>x.f),
  defaultCreatorBehaviorPreserved:true,newHTTP:0,actualSDKVerified:mode==='--ui',actualBrowserAcceptance:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:changes.length,mode,NativeOrganization422:true,G3Certified:false}));
