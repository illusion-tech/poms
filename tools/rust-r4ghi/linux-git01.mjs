// Process-local transport using the existing GitHub credential, never its value in output.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const dir='/home/wangzishi/.local/share/poms-r4ghi-github/private';
const token=dir+'/one-use-token';
assert.equal(process.platform,'linux');
if(process.argv[2]==='--stage'){
 fs.mkdirSync(dir,{recursive:true,mode:0o700});assert(!fs.existsSync(token));
 let input='';for await(const part of process.stdin)input+=part.toString('utf8');
 const value=input.trim();assert(/^[A-Za-z0-9_]{20,1000}$/.test(value));
 fs.writeFileSync(token,value,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({oneUseCredentialStaged:true,credentialPublished:false}));
}else{
 assert.equal(process.argv[2],'--push');
 const commit=process.argv[3],edition=process.argv[4];
 assert(/^[0-9a-f]{40}$/.test(commit)&&/^\d{2}$/.test(edition));
 const stat=fs.lstatSync(token);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);
 const helper=dir+'/helper.sh';
 const script='#!/bin/sh\nif [ "$1" = get ]; then\n  printf "username=x-access-token\\npassword="\n  cat "'+token+'"\n  printf "\\n"\nfi\n';
 if(fs.existsSync(helper))assert.equal(fs.readFileSync(helper,'utf8'),script);else fs.writeFileSync(helper,script,{flag:'wx',mode:0o700});
 const out=root+'/tmp/rust-r4ghi/root/git'+edition;assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
 const stdout=fs.openSync(out+'/stdout.bin','wx'),stderr=fs.openSync(dir+'/stderr-'+edition+'.bin','wx',0o600);
 let result;
 try{result=spawnSync('/usr/bin/git',['--git-dir=/mnt/e/projects/poms/.git/worktrees/poms3','--work-tree='+root,'-c','credential.helper=','-c','credential.helper=!'+helper,'-c','credential.https://github.com.helper=','-c','credential.https://github.com.helper=!'+helper,'-c','http.proxy=http://172.22.192.1:7897','-c','http.version=HTTP/1.1','-c','http.extraHeader=Expect:','-c','http.postBuffer=268435456','-c','pack.useSparse=false','-c','pack.allowPackReuse=false','-c','gc.auto=0','push','--porcelain','origin',commit+':refs/heads/codex/poms-r4ghi-next25'],{env:{...process.env,GIT_TERMINAL_PROMPT:'0'},stdio:['ignore',stdout,stderr],timeout:120000});}
 finally{fs.closeSync(stdout);fs.closeSync(stderr);fs.unlinkSync(token);}
 const receipt={kind:'process-local-existing-credential-git-transport',capturedAt:new Date().toISOString(),commit,ref:'refs/heads/codex/poms-r4ghi-next25',exitCode:result.status,errorCode:result.error?.code??null,oneUseCredentialRemoved:true,credentialPublished:false,globalConfigChanged:false};
 fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
 if(result.status!==0)process.exitCode=1;
}
