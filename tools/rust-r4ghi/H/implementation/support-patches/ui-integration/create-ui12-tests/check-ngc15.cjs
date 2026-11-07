const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const installed=createRequire('E:/projects/worktrees/poms-r3hijk-next28/poms/package.json'),ts=installed('typescript');
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',proposed=path.join(__dirname,'proposed');
const productDir='apps/poms-admin/src/app/features/project/';
function sourceFiles(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sourceFiles(path.join(directory,entry.name)):/\.(ts|html|json)$/.test(entry.name)?[path.join(directory,entry.name)]:[]);}
const inputFiles=['apps/poms-admin/src','libs/admin/data-access/src','libs/shared/contracts/src','libs/shared/api-client'].flatMap(directory=>sourceFiles(path.join(root,directory))).map(file=>path.relative(root,file).replaceAll('\\','/')).sort();
const inputHashes=()=>Object.fromEntries(inputFiles.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const before=inputHashes();
const full=true;
(async()=>{
 const ng=await import(pathToFileURL(installed.resolve('@angular/compiler-cli')).href);
 const config=ng.readConfiguration(path.join(root,'apps/poms-admin/tsconfig.app.json'));
 const options={...config.options,basePath:root,rootDir:'E:/',rootDirs:['E:/'],noEmit:true,skipLibCheck:true,strictTemplates:true,types:[],paths:full?config.options.paths:{...config.options.paths,'@poms/admin-data-access':[path.join(__dirname,'../admin-stores.ts')]}};
 const candidate=file=>{const rel=path.relative(root,file),p=path.join(proposed,rel);return !rel.startsWith('..')&&fs.existsSync(p)?p:file;};
 const host=ng.createCompilerHost({options}),get=host.getSourceFile.bind(host);
 host.readFile=file=>ts.sys.readFile(candidate(file));host.fileExists=file=>ts.sys.fileExists(candidate(file));
 host.getSourceFile=(file,version,...rest)=>candidate(file)!==file?ts.createSourceFile(file,host.readFile(file),version,true):get(file,version,...rest);
 host.resolveModuleNames=(names,from)=>names.map(name=>ts.resolveModuleName(name,from,options,host).resolvedModule);
 const targets=full?[path.join(root,'apps/poms-admin/src/main.ts')]:['project-governance.ts','project-own-condition-tasks.ts','project-receipt-basis-authoring.ts'].map(name=>path.join(root,productDir,name));
 const program=ng.createProgram({rootNames:targets,options,host});
 const templateDiagnostics=program.getNgSemanticDiagnostics();
 const diagnostics=[...program.getTsOptionDiagnostics(),...program.getNgOptionDiagnostics(),...program.getTsSyntacticDiagnostics(),...program.getTsSemanticDiagnostics(),...templateDiagnostics];
 const errors=diagnostics.map(d=>({file:d.file?.fileName,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
 const after=inputHashes();
 const result={status:errors.length?'failed':'passed',phase:full?'full-app-ngc-with-UI-proposal-overlay':'S6-real-client-UI-trees-ngc',targets,templateDiagnostics:templateDiagnostics.length,sourceStable:JSON.stringify(before)===JSON.stringify(after),inputSHA256:before,fullAppBuild:false,productMutation:false,errors};
 fs.writeFileSync(path.join(__dirname,full?'ngc-full15.json':'ngc-ui15.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,diagnostics:errors.length,errors:errors.slice(0,18).map(e=>({file:path.basename(e.file??''),line:e.line,code:e.code,message:e.message.slice(0,170)}))}));if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
