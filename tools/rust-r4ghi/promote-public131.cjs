const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),{createHash}=require('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex'),base='tools/rust-r4ghi/public131';
const m=JSON.parse(fs.readFileSync(base+'/manifest131.json'));
for(const p of m.inputs)assert.equal(sha(fs.readFileSync(p.file)),p.sha256);
const old=fs.readFileSync(m.path),next=fs.readFileSync(base+'/proposed/'+m.path);
assert.equal(sha(old),m.beforeSHA256);assert.equal(sha(next),m.candidateSHA256);
function statements(text){const ast=ts.createSourceFile(m.path,text,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0);const map=new Map();for(const s of ast.statements){let key;if(ts.isVariableStatement(s)){assert.equal(s.declarationList.declarations.length,1);key='var:'+s.declarationList.declarations[0].name.getText(ast);}else if(ts.isTypeAliasDeclaration(s)||ts.isFunctionDeclaration(s)){key=ts.SyntaxKind[s.kind]+':'+s.name.text;}else if(ts.isImportDeclaration(s)){key='import:'+s.moduleSpecifier.text;}else throw new Error('Unknown generated statement '+ts.SyntaxKind[s.kind]);assert(!map.has(key));map.set(key,s.getText(ast));}return map;}
const oldMap=statements(old.toString()),newMap=statements(next.toString());
for(const[k,v]of oldMap){assert(newMap.has(k));if(!['var:frozenSchemas','var:CreateProjectRequestSchema'].includes(k))assert.equal(newMap.get(k).replace(/\r\n/g,'\n'),v.replace(/\r\n/g,'\n'),k);}
assert.deepEqual([...newMap.keys()].filter(k=>!oldMap.has(k)).sort(),['TypeAliasDeclaration:ProjectInitialOwnership','var:ProjectInitialOwnershipSchema']);
const create=newMap.get('var:CreateProjectRequestSchema');
assert.equal(create.replace(',"initialOwnership":ProjectInitialOwnershipSchema.optional()',''),oldMap.get('var:CreateProjectRequestSchema'));
const literal=text=>JSON.parse(text.slice(text.indexOf(' = ')+3,-1));
const previousRegistry=literal(oldMap.get('var:frozenSchemas')),currentRegistry=literal(newMap.get('var:frozenSchemas'));
assert.equal(Object.keys(previousRegistry).length,130);assert.equal(Object.keys(currentRegistry).length,131);
assert.deepEqual(currentRegistry.ProjectInitialOwnership.enum,['creator','organization']);
assert.deepEqual(currentRegistry.CreateProjectRequest.properties.initialOwnership,{$ref:'#/components/schemas/ProjectInitialOwnership'});
delete currentRegistry.ProjectInitialOwnership;delete currentRegistry.CreateProjectRequest.properties.initialOwnership;assert.deepEqual(currentRegistry,previousRegistry);
const mainPath='libs/shared/contracts/src/lib/shared-contracts.ts',mainBefore=fs.readFileSync(mainPath);
assert.equal(sha(mainBefore),'e835ce085e0cfd19fa2d49030f1b286ed8f774164fbbddbafc98e04e2d13fdab');
const source=mainBefore.toString(),ast=ts.createSourceFile(mainPath,source,ts.ScriptTarget.Latest,true),edits=[];
for(const s of ast.statements){if(ts.isImportDeclaration(s)&&s.moduleSpecifier.text==='./rust-r4ghi-contracts.generated'){const named=s.importClause.namedBindings;assert(ts.isNamedImports(named));edits.push({at:named.end-1,text:', ProjectInitialOwnershipSchema, type ProjectInitialOwnership'});}if(ts.isExportDeclaration(s)&&!s.moduleSpecifier&&s.exportClause&&ts.isNamedExports(s.exportClause)){const n=s.exportClause,names=n.elements.map(e=>e.name.text);if(s.isTypeOnly&&names.includes('FullProjectDetailView'))edits.push({at:n.end-1,text:', ProjectInitialOwnership'});if(!s.isTypeOnly&&names.includes('FullProjectDetailViewSchema'))edits.push({at:n.end-1,text:', ProjectInitialOwnershipSchema'});}}
assert.equal(edits.length,3);let mainAfter=source;for(const e of [...edits].sort((a,b)=>b.at-a.at))mainAfter=mainAfter.slice(0,e.at)+e.text+mainAfter.slice(e.at);
let restored=mainAfter;for(const e of [...edits].sort((a,b)=>b.text.length-a.text.length)){assert.equal(restored.split(e.text).length,2);restored=restored.replace(e.text,'');}assert.equal(restored,source);
fs.writeFileSync(base+'/before-main-shared.ts.bin',mainBefore,{flag:'wx'});
fs.writeFileSync(m.path,next);fs.writeFileSync(mainPath,mainAfter);
fs.writeFileSync('docs/design/rust-r4ghi/shared-promotion131.json',JSON.stringify({kind:'Root-complete-canonical131-exact-declaration-review',capturedAt:new Date().toISOString(),manifest:base+'/manifest131.json',files:[{path:m.path,before:m.beforeSHA256,after:sha(next)},{path:mainPath,before:sha(mainBefore),after:sha(mainAfter)}],existingSchemasUnchangedExceptApprovedOptionalCreateField:true,allOtherDeclarationsEqualAfterCRLFToLFOnly:true,generatedNewlineChange:'CRLF to LF',mainHeaderOnlyEdits:3,newPublicSchema:'ProjectInitialOwnership',newHTTP:0,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({publicSchemas:131,productFiles:2,allOtherDeclarationsEqualAfterCRLFToLFOnly:true,initialOwnershipOptional:true}));
