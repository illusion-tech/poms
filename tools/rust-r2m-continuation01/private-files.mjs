// Fixed R2M private material only. No environment discovery; no raw error text.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const roots=['/r2m-c01-private','/home/wangzishi/.local/share/poms-r2m-continuation01/private'];
const names=new Set(['owner-password','app-password','jwt-secret','nest.env','rust.env','native-rust-port10070.env','seed-nest.json','seed-rust.json','seed-nest.log','seed-rust.log']);
export class PrivateFileError extends Error{constructor(code){super('R2M private-file admission failed');this.name='PrivateFileError';this.code=code;}}
export function createPrivateFiles(io=fs){
 const fail=code=>{throw new PrivateFileError(code);};
 function admit(file,write=false){
  if(typeof io.constants.O_NOFOLLOW!=='number')fail('private_nofollow_unavailable');
  if(typeof file!=='string'||path.posix.normalize(file)!==file)fail('private_path');
  const secret=['/run/secrets/r2m-owner-password','/run/secrets/r2m-app-password'].includes(file);
  if(secret){if(write)fail('secret_readonly');}
  else{const root=roots.find(root=>path.posix.dirname(file)===root);if(!root||!names.has(path.posix.basename(file)))fail('private_path');
   let prefix='';for(const part of root.split('/').filter(Boolean)){prefix+='/'+part;const s=io.lstatSync(prefix);if(s.isSymbolicLink()||!s.isDirectory())fail('private_parent');}
   const s=io.lstatSync(root);if((s.mode&0o077)!==0)fail('private_parent_mode');}
  let stat;try{stat=io.lstatSync(file);}catch(error){if(error.code==='ENOENT')return{secret,stat:null};throw new PrivateFileError('private_stat');}
  if(stat.isSymbolicLink()||!stat.isFile()||stat.nlink!==1)fail('private_file_type');
  if(secret?![0o400,0o600].includes(stat.mode&0o777):(stat.mode&0o777)!==0o600)fail('private_file_mode');return{secret,stat};
 }
 function same(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;}
 function open(file,access){const{stat}=admit(file,access!=='r');if(!stat)fail('private_missing');
  const flags={r:io.constants.O_RDONLY,'r+':io.constants.O_RDWR,a:io.constants.O_WRONLY|io.constants.O_APPEND}[access];if(flags===undefined)fail('private_mode');
  const fd=io.openSync(file,flags|io.constants.O_NOFOLLOW);try{if(!same(stat,io.fstatSync(fd)))fail('private_identity');return fd;}catch{io.closeSync(fd);throw new PrivateFileError('private_identity');}}
 function read(file){const fd=open(file,'r');try{const before=io.fstatSync(fd),value=io.readFileSync(fd,'utf8');if(!same(before,io.fstatSync(fd))||!same(before,io.lstatSync(file)))fail('private_changed');return value;}finally{io.closeSync(fd);}}
 function create(file,value){admit(file,true);let fd;try{fd=io.openSync(file,io.constants.O_WRONLY|io.constants.O_CREAT|io.constants.O_EXCL|io.constants.O_NOFOLLOW,0o600);}catch{fail('private_exclusive_create');}
  try{io.writeFileSync(fd,value);io.fsyncSync(fd);}finally{io.closeSync(fd);}admit(file,true);return file;}
 function exists(file){return admit(file).stat!==null;}
 return Object.freeze({read,create,exists,open});
}
export const privateFiles=createPrivateFiles();
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 try{if(process.argv[2]!=='ensure-secret'||process.argv.length!==4)throw new PrivateFileError('private_cli');const file=process.argv[3];
  if(!['/home/wangzishi/.local/share/poms-r2m-continuation01/private/owner-password','/home/wangzishi/.local/share/poms-r2m-continuation01/private/app-password'].includes(file))throw new PrivateFileError('private_path');
  if(!privateFiles.exists(file))privateFiles.create(file,randomBytes(32).toString('hex'));if(!/^[0-9a-f]{64}$/.test(privateFiles.read(file)))throw new PrivateFileError('private_format');
 }catch{process.exitCode=1;console.error('{"kind":"R2M-private-material-failure","detailsExported":false}');}
}
