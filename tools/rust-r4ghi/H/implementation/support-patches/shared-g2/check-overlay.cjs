// Standalone compiler overlay. Nothing is copied into the product checkout.
const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');
const installed=createRequire('E:/projects/poms/package.json');const ts=installed('typescript');
const own=__dirname;const plan=JSON.parse(fs.readFileSync(path.join(own,'shared-g2-plan.json'),'utf8'));const root=plan.productReadRoot;const proposed=path.join(own,'proposed');
const native=process.argv.includes('--native');const configFile=path.join(root,native?'apps/poms-api/tsconfig.app.json':'tsconfig.base.json');
const config=ts.readConfigFile(configFile,ts.sys.readFile);if(config.error)throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(configFile));
const options={...parsed.options,noEmit:true,types:native?['node']:[],typeRoots:['E:/projects/poms/node_modules/@types'],skipLibCheck:true};
const candidate=(file)=>{const relative=path.relative(root,file);const alternative=path.join(proposed,relative);return !relative.startsWith('..')&&fs.existsSync(alternative)?alternative:file;};
const host=ts.createCompilerHost(options);const getSource=host.getSourceFile.bind(host);host.readFile=(file)=>ts.sys.readFile(candidate(file));host.fileExists=(file)=>ts.sys.fileExists(candidate(file));host.getSourceFile=(file,version,...rest)=>candidate(file)!==file?ts.createSourceFile(file,host.readFile(file),version,true):getSource(file,version,...rest);
host.resolveModuleNames=(names,containing)=>names.map((name)=>ts.resolveModuleName(name,containing,options,host).resolvedModule);
const targets=native?JSON.parse(fs.readFileSync(path.join(own,'native-ast-plan.json'),'utf8')).files.map((entry)=>path.join(root,entry.path)):[path.join(root,'libs/shared/contracts/src/lib/shared-contracts.ts'),path.join(root,plan.generatedTarget)];
const program=ts.createProgram(targets,options,host);const diagnostics=ts.getPreEmitDiagnostics(program);
const evidence=diagnostics.map((diagnostic)=>{const position=diagnostic.file&&diagnostic.start!==undefined?diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start):undefined;return {file:diagnostic.file?path.relative(root,diagnostic.file.fileName).replaceAll('\\','/'):null,line:position?position.line+1:null,column:position?position.character+1:null,code:diagnostic.code,message:ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n')};});
fs.writeFileSync(path.join(own,native?'native-tsc-diagnostics.json':'canonical-tsc-diagnostics.json'),JSON.stringify({status:diagnostics.length?'failed':'passed',phase:native?'isolated-Native-with-proposals':'canonical-shared-and-local-helpers',errors:evidence},null,2)+'\n');
if(diagnostics.length){process.stdout.write(ts.formatDiagnosticsWithColorAndContext(diagnostics.slice(0,15),{getCurrentDirectory:()=>root,getCanonicalFileName:(name)=>name,getNewLine:()=> '\n'}));console.log(JSON.stringify({status:'failed',diagnosticCount:diagnostics.length,fullEvidence:native?'native-tsc-diagnostics.json':'canonical-tsc-diagnostics.json'}));process.exitCode=1;}
else console.log(JSON.stringify({status:'passed',phase:native?'isolated-Native-with-proposals':'canonical-shared-and-local-helpers',schemaCount:129,productMutation:false}));
