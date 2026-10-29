// Executes only original pure helpers. No repository, storage, HTTP or application is run.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {Script} from 'node:vm';
import {artifacts} from './j-export.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(import.meta.dirname,'../..');
require('reflect-metadata');
function execute(file,deps){const exports={};const text=ts.transpileModule(readFileSync(resolve(root,file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:false}}).outputText;new Script(text,{filename:file}).runInNewContext({exports,module:{exports},require:name=>{if(Object.hasOwn(deps,name))return deps[name];assert(name.startsWith('../')||name.startsWith('./'),'Unexpected helper dependency '+name);return new Proxy({},{get:()=>class PureToken{}});},Buffer});return exports;}
export function behavior(){artifacts();const shared=execute('libs/shared/contracts/src/lib/shared-contracts.ts',{zod:require('zod')});const preview=execute('apps/poms-api/src/app/features/attachment/attachment-preview.util.ts',{});const source=execute('apps/poms-api/src/app/features/attachment/attachment.service.ts',{'@nestjs/common':require('@nestjs/common'),'@poms/shared-contracts':shared,'node:crypto':require('node:crypto'),'node:path':require('node:path'),'./attachment-preview.util':preview});const service=new source.AttachmentService({}, {}, {}, {}, {});const cases=[];
    function add(method,name,args,fn){let expected;try{expected={success:true,resultRaw:JSON.stringify(fn())};}catch(error){expected={success:false,status:error.getStatus?.()??null,message:error.message};}cases.push({method,name,argsRaw:JSON.stringify(args),expected});}
    for(const name of ['', ' ', '/', '\\', 'a.pdf', 'C:\\folder\\资料.PDF', '../folder/ file.pdf ', '.pdf','..pdf','a.pdf/leaf','a.pdf\\leaf','a.ΣΟΣ','a.\ud800','a.','a..PDF','😀'.repeat(126)+'.pdf','😀'.repeat(127)+'.pdf','\ud800.pdf','a\u0000.pdf']){add('sanitizeOriginalName','filename-'+cases.length,[name],()=>service.sanitizeOriginalName(name));add('extractExtension','extension-'+cases.length,[name],()=>service.extractExtension(name));}
    for(const ext of ['pdf','PDF','png','jpeg','md','zip','','exe','tar.gz'])add('assertAllowedExtension','allowed-'+ext,[ext],()=>{service.assertAllowedExtension(ext);return null;});
    for(const category of ['quotation','contract','finance','internal-assessment','demand','internal_assessment','other'])add('defaultSecurityLevel',category,[category],()=>service.defaultSecurityLevel(category));
    for(const extension of ['png','jpg','jpeg','webp','pdf','docx'])for(const mimeType of ['image/png','IMAGE/JPEG','application/pdf','text/plain']){const row={extension,mimeType};add('previewKind',extension+':'+mimeType,[row],()=>preview.getAttachmentPreviewKind(row));}
    return {formatVersion:1,sourceHead:'61d6df1e971e7e785382dc85c75273e584ee2545',oracle:'Actual unchanged TS private pure helpers and preview util, synthetic values; no repository/storage/database/HTTP/application execution',cases};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){const output=JSON.stringify(behavior(),null,2)+'\n',file=resolve(root,'tools/rust-r2ij/j-behavior.json');if(process.argv.includes('--check'))assert.equal(readFileSync(file,'utf8'),output);else writeFileSync(file,output);console.log(JSON.stringify({mode:process.argv.includes('--check')?'check':'export',cases:JSON.parse(output).cases.length}));}
