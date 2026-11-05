// Read-only TypeScript/client linkage check. Angular templates/build/browser remain Root-owned.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const root=path.resolve(import.meta.dirname,'../../..');
const dependencyRoot=process.env.POMS_D_DEPENDENCY_ROOT??'E:/projects/worktrees/poms-r3hijk-next28/poms';
const ts=require(path.join(dependencyRoot,'node_modules/typescript'));
const sourcePaths=[
  'apps/poms-admin/src/app/features/project/project-contract-handover.ts',
  'apps/poms-admin/src/app/features/project/project-handover-actions.ts',
  'apps/poms-admin/src/app/features/project/project-handover-flow.ts',
];
const config=ts.getParsedCommandLineOfConfigFile(path.join(root,'apps/poms-admin/tsconfig.app.json'),{noEmit:true}, {...ts.sys,onUnRecoverableConfigFileDiagnostic(diagnostic){throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n'));}});
if(!config)throw new Error('Cannot load app TypeScript configuration');
const host=ts.createCompilerHost(config.options);
host.resolveModuleNameLiterals=(literals,containingFile)=>literals.map((literal)=>{
  const local=ts.resolveModuleName(literal.text,containingFile,config.options,host);
  if(local.resolvedModule||literal.text.startsWith('.')||literal.text.startsWith('@poms/')||literal.text.startsWith('@/'))return local;
  // Only third-party dependencies are read from the existing dependency checkout.
  return ts.resolveModuleName(literal.text,path.join(dependencyRoot,'__read_only_D_typecheck.ts'),{...config.options,baseUrl:dependencyRoot,paths:{}},host);
});
const program=ts.createProgram(sourcePaths.map(relative=>path.join(root,relative)),config.options,host);
const diagnostics=ts.getPreEmitDiagnostics(program).map(diagnostic=>({code:diagnostic.code,category:ts.DiagnosticCategory[diagnostic.category],file:diagnostic.file?path.relative(root,diagnostic.file.fileName).replaceAll('\\','/'):null,line:diagnostic.file&&diagnostic.start!==undefined?diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line+1:null,message:ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n')}));
const errors=diagnostics.filter(diagnostic=>diagnostic.category==='Error');
const report={kind:'D-read-only-TypeScript-client-linkage',createdAt:new Date().toISOString(),typescript:ts.version,dependencyRoot,sourceCheckout:root,sourcePaths:sourcePaths.map(relative=>({path:relative,rawBytesSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex')})),sourceFileCount:program.getSourceFiles().length,errors:errors.length,diagnostics,typescriptChecked:true,angularTemplateChecked:false,angularBuilt:false,browserRun:false,result:errors.length===0?'pass':'fail',limitation:'Checks TypeScript with real generated client in D checkout and existing read-only third-party dependencies; does not run Angular compiler, build, tests, HTTP, DB or browser.'};
const destination=path.join(import.meta.dirname,`ui-typecheck-${report.createdAt.replaceAll(/[^0-9]/g,'')}.json`);
fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:destination,result:report.result,errors:report.errors,diagnostics:diagnostics.slice(0,25),angularTemplateChecked:false,angularBuilt:false},null,2));
if(errors.length)process.exitCode=1;
