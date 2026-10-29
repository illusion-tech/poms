// Actual Node fetch rejection through the unchanged original provider. The
// forwarded fetch is counted, never mocked; diagnostics count low-level sends.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as crypto from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {Script} from 'node:vm';
import {channel} from 'node:diagnostics_channel';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(import.meta.dirname,'../..');
assert.equal(process.version,'v24.19.0');assert.equal(process.versions.undici,'7.29.0');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function execute(path,deps,extra={}){const exports={};const context={exports,module:{exports},require(name){assert(Object.hasOwn(deps,name));return deps[name];},Date,URL,URLSearchParams,Buffer,Error,...extra};new Script(ts.transpileModule(readFileSync(resolve(root,path),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText).runInNewContext(context,{timeout:5000});return context.module.exports;}
const shared=execute('libs/shared/contracts/src/lib/shared-contracts.ts',{zod:require('zod')});
let attempts=0,requests=0;const requestChannel=channel('undici:request:create'),listener=()=>requests++;requestChannel.subscribe(listener);
const source='apps/poms-api/src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.ts';
const original=execute(source,{'@nestjs/common':require('@nestjs/common'),'@poms/shared-contracts':shared,'node:crypto':crypto,'node:stream':require('node:stream'),'node:timers/promises':require('node:timers/promises')},{fetch:(...args)=>{attempts++;return globalThis.fetch(...args);}});
const config={id:null,providerType:'huawei-obs-s3',displayName:'Synthetic URL credential witness',enabled:true,status:'active',endpoint:'http://a:b@127.0.0.1:6900',region:'r2ij',bucket:'synthetic-userinfo',keyPrefix:null,forcePathStyle:true,accessKeyId:'SYNTHETIC_AK',secretAccessKey:'SYNTHETIC_SK'};
assert(shared.CreateAttachmentStorageProviderConfigRequestSchema.safeParse({...config,isDefault:false}).success,'Original DTO must admit this endpoint');
const start=performance.now();let observed;
try{await new original.HuaweiObsS3AttachmentObjectStorageProvider().testConnection(config);throw new Error('Expected rejection');}catch(error){assert.equal(error.getStatus?.(),502);observed={status:error.getStatus(),message:error.message.replace('a:b@','[redacted]@'),originalMessageUtf16LeSha256:hash(Buffer.from(error.message,'utf16le'))};}
requestChannel.unsubscribe(listener);
assert.equal(attempts,3);assert.equal(requests,0);assert(observed.message.includes('Request cannot be constructed from a URL that includes credentials:'));
const result={kind:'Actual unchanged original provider with counted passthrough native fetch, no response mock; not public API acceptance',node:process.version,undici:process.versions.undici,nodeBinaryRawSha256:hash(readFileSync(process.execPath)),providerRawSha256:hash(readFileSync(resolve(root,source))),originalDtoAccepts:true,attempts,lowLevelUndiciRequests:requests,elapsedMs:performance.now()-start,error:observed};
writeFileSync(resolve(root,'tmp/rust-r2ij/obs-userinfo-native-source01.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
