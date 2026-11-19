const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const ts=createRequire('E:/projects/poms/package.json')('typescript');
const own=__dirname,plan=JSON.parse(fs.readFileSync(path.join(own,'plan130.json'),'utf8')),rel=plan.canonicalTarget;
const raw=fs.readFileSync(path.join(own,'inputs/05-shared-contracts.ts.bin')),source=raw.toString('utf8');
const ast=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true),edits=[];
const newType='ExecutionAdmissionContextView',newSchema=newType+'Schema';
for(const node of ast.statements){
 if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text==='./rust-r4ghi-contracts.generated'){
  const named=node.importClause?.namedBindings;if(!named||!ts.isNamedImports(named))throw new Error('Expected exact canonical named imports');
  if(named.elements.some(e=>[newType,newSchema].includes(e.name.text)))throw new Error('Execution context already imported; rebase candidate');
  edits.push({start:named.end-1,text:`, ${newSchema}, type ${newType}`});
 }
 if(ts.isExportDeclaration(node)&&!node.moduleSpecifier&&node.exportClause&&ts.isNamedExports(node.exportClause)){
  const named=node.exportClause,names=named.elements.map(e=>e.name.text);
  if(node.isTypeOnly&&names.includes('FullProjectDetailView'))edits.push({start:named.end-1,text:`, ${newType}`});
  if(!node.isTypeOnly&&names.includes('FullProjectDetailViewSchema'))edits.push({start:named.end-1,text:`, ${newSchema}`});
 }
}
if(edits.length!==3)throw new Error('Expected only three canonical header edits');
let output=source;for(const edit of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.text+output.slice(edit.start);
let restored=output;for(const edit of edits){if(restored.split(edit.text).length!==2)throw new Error('Cannot prove an exact additive header edit');restored=restored.replace(edit.text,'');}
if(restored!==source)throw new Error('Unrelated Root Shared bytes changed');
if(!output.includes('export const CompletionConditionAttachmentContextSchema = z.strictObject(')||!output.includes('completionConditionContext: CompletionConditionAttachmentContextSchema.optional()'))throw new Error('R2 context disappeared');
const target=path.join(own,'proposed',rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,output);
const sha=s=>createHash('sha256').update(s).digest('hex');
const result={status:'additive-header-only-candidate',originalSHA256:sha(raw),proposedSHA256:sha(output),restoredOriginalSHA256:sha(restored),edits,removedDeclarations:[],preservedCompletionConditionContext:true};
fs.writeFileSync(path.join(own,'main-shared-ast130.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({edits:edits.length,originalSHA256:result.originalSHA256,proposedSHA256:result.proposedSHA256}));
